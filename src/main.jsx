/**
 * @file main.jsx
 * @description Titik masuk utama aplikasi React.
 * Menginisialisasi:
 * - Root DOM container
 * - Context penyedia autentikasi (`AuthProvider`)
 * - Router aplikasi (`RouterProvider`)
 *
 * File ini menghubungkan seluruh lapisan aplikasi:
 * UI → Routing → Autentikasi → API
 */

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import router from "./router.jsx";

// Render aplikasi ke dalam elemen root di index.html
ReactDOM.createRoot(document.getElementById("root")).render(
  /**
   * Wrapper utama aplikasi:
   * - `AuthProvider`: Menyediakan state & fungsi autentikasi ke seluruh komponen
   * - `RouterProvider`: Mengelola navigasi berbasis rute
   */
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);