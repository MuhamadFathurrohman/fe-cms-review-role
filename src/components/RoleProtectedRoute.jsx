/**
 * @file RoleProtectedRoute.jsx
 * @description Komponen higher-order untuk melindungi rute berdasarkan izin pengguna.
 * Memeriksa apakah pengguna memiliki izin yang diperlukan untuk mengakses rute tertentu.
 *
 * Menggunakan sistem permission-based (bukan role-based) melalui utilitas `canRead()` secara default,
 * atau custom checker yang diberikan via prop `permissionChecker`.
 * Mengizinkan akses selama proses inisialisasi sesi berlangsung.
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { canRead } from "../utils/permissions";

/**
 * Props untuk komponen RoleProtectedRoute.
 * @typedef {Object} RoleProtectedRouteProps
 * @property {React.ReactNode} children - Komponen anak yang dilindungi
 * @property {string} requiredPermission - Izin yang dibutuhkan untuk mengakses rute
 * @property {Function} [permissionChecker] - Fungsi checker custom (default: canRead).
 *   Signature: (userPermissions, resource) => boolean
 *   Contoh: canReview untuk rute yang membutuhkan akses review
 */

/**
 * Komponen pelindung rute berbasis izin (permission-based).
 * Melindungi rute berdasarkan kemampuan membaca sumber daya tertentu,
 * atau berdasarkan level akses custom yang ditentukan via `permissionChecker`.
 *
 * @component
 * @param {RoleProtectedRouteProps} props - Props komponen
 * @returns {JSX.Element} Anak jika diizinkan, redirect ke login/unauthorized jika tidak
 *
 * @example
 * // Default — cek canRead (read / manage)
 * <RoleProtectedRoute requiredPermission="user">
 *   <Users />
 * </RoleProtectedRoute>
 *
 * @example
 * // Custom checker — cek canReview (review)
 * <RoleProtectedRoute
 *   requiredPermission="blog"
 *   permissionChecker={canReview}
 * >
 *   <BlogsApproval />
 * </RoleProtectedRoute>
 */
const RoleProtectedRoute = ({
  children,
  requiredPermission,
  permissionChecker,
}) => {
  const { user, isAuthenticated, isInitialized } = useAuth();

  // Selama inisialisasi sesi, tampilkan children
  if (!isInitialized) {
    return children;
  }

  // Jika tidak terautentikasi, redirect ke login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Gunakan permissionChecker custom jika diberikan, default ke canRead
  const checker = permissionChecker || canRead;

  // Jika izin diperlukan tapi tidak dimiliki, redirect ke unauthorized
  if (requiredPermission && !checker(user.permissions, requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleProtectedRoute;
