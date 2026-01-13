/**
 * @file RoleProtectedRoute.jsx
 * @description Komponen higher-order untuk melindungi rute berdasarkan izin pengguna.
 * Memeriksa apakah pengguna memiliki izin yang diperlukan untuk mengakses rute tertentu.
 * 
 * Menggunakan sistem permission-based (bukan role-based) melalui utilitas `canRead()`.
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
 */

/**
 * Komponen pelindung rute berbasis izin (permission-based).
 * Melindungi rute berdasarkan kemampuan membaca sumber daya tertentu.
 *
 * @component
 * @param {RoleProtectedRouteProps} props - Props komponen
 * @returns {JSX.Element} Anak jika diizinkan, redirect ke login/unauthorized jika tidak
 *
 * @example
 * <Route
 *   element={
 *     <RoleProtectedRoute requiredPermission="user">
 *       <Users />
 *     </RoleProtectedRoute>
 *   }
 * />
 */
const RoleProtectedRoute = ({ children, requiredPermission }) => {
  const { user, isAuthenticated, isInitialized } = useAuth();

  // Selama inisialisasi sesi, tampilkan children
  if (!isInitialized) {
    return children;
  }

  // Jika tidak terautentikasi, redirect ke login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Jika izin diperlukan tapi tidak dimiliki, redirect ke unauthorized
  if (requiredPermission && !canRead(user.permissions, requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleProtectedRoute;