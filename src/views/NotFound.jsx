/**
 * @file NotFound.jsx
 * @description Komponen halaman error untuk rute yang tidak ditemukan (404).
 * Menampilkan pesan kesalahan ketika pengguna mengakses URL yang tidak valid
 * atau halaman yang telah dipindahkan/dihapus.
 * 
 * Fitur utama:
 * - Kode error 404 yang menonjol
 * - Pesan error yang membantu dan ramah pengguna
 * - Dua opsi navigasi: kembali ke halaman sebelumnya atau ke homepage
 * - Desain responsif dengan animasi halus
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import "../sass/views/NotFound/NotFound.css";

/**
 * Komponen halaman tidak ditemukan (404).
 * Menyediakan opsi navigasi untuk membantu pengguna kembali ke jalur yang benar.
 *
 * @component
 */
const NotFound = () => {
  const navigate = useNavigate();

  /**
   * Handler untuk navigasi kembali ke halaman sebelumnya.
   * Menggunakan history API untuk kembali satu langkah.
   */
  const handleGoBack = () => {
    navigate(-1);
  };

  /**
   * Handler untuk navigasi ke halaman utama dashboard.
   * Mengarahkan pengguna ke route root aplikasi.
   */
  const handleGoHome = () => {
    navigate("/dashboard");
  };

  return (
    <div className="notfound-container">
      <div className="notfound-card">
        <div className="notfound-content">
          <div className="error-code" aria-label="Error code 404">404</div>
          <h2 className="error-title">
            Page <span className="highlight">Not Found</span>
          </h2>
          <p className="error-message">
            Oops! The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>

          <div className="button-group">
            <button className="notfound-button primary" onClick={handleGoHome}>
              Go to Homepage
            </button>
            <button
              className="notfound-button secondary"
              onClick={handleGoBack}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;