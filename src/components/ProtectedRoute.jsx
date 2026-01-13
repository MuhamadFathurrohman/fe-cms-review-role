/**
 * @file ProtectedRoute.jsx
 * @description Komponen higher-order untuk melindungi rute yang memerlukan autentikasi.
 * Memastikan hanya pengguna terautentikasi yang dapat mengakses rute tertentu.
 * 
 * Mengizinkan akses selama proses inisialisasi sesi berlangsung (`!isInitialized`)
 * untuk mencegah redirect berlebihan saat memeriksa sesi awal.
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Props untuk komponen ProtectedRoute.
 * @typedef {Object} ProtectedRouteProps
 * @property {React.ReactNode} children - Komponen anak yang dilindungi
 */

/**
 * Komponen pelindung rute berbasis autentikasi.
 * Digunakan untuk melindungi halaman dashboard dan fitur internal.
 *
 * @component
 * @param {ProtectedRouteProps} props - Props komponen
 * @returns {JSX.Element} Anak jika diizinkan, atau redirect ke login
 *
 * @example
 * <Route element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();

  // Selama inisialisasi sesi, tampilkan children untuk menghindari flicker
  if (!isInitialized) {
    return children;
  }

  // Jika tidak terautentikasi, redirect ke login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;