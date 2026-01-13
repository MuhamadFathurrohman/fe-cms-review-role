/**
 * @file Unauthorized.jsx
 * @description Komponen halaman error untuk akses yang tidak diizinkan.
 * Menampilkan pesan kesalahan ketika pengguna mencoba mengakses halaman
 * yang memerlukan izin yang tidak dimilikinya.
 * 
 * Fitur utama:
 * - Ikon visual yang jelas tentang pembatasan akses
 * - Pesan error yang informatif dan user-friendly
 * - Tombol navigasi kembali ke dashboard
 * - Desain responsif yang konsisten dengan tema aplikasi
 */

import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import "../sass/views/Unauthorized/Unauthorized.css";

/**
 * Komponen halaman akses ditolak.
 * Menampilkan pesan error standar untuk kasus unauthorized access.
 *
 * @component
 */
const Unauthorized = () => {
  return (
    <div className="unauthorized-page">
      <div className="unauthorized-container">
        <div className="unauthorized-icon" aria-hidden="true">
          <ShieldAlert size={48} />
        </div>
        <h1 className="unauthorized-title">Access Denied</h1>
        <p className="unauthorized-message">
          You don't have permission to access this page.
        </p>
        <Link to="/dashboard/home" className="unauthorized-btn">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;