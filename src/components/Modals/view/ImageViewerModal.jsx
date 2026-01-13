/**
 * @file ImageViewerModal.jsx
 * @description Komponen modal fullscreen untuk melihat gambar galeri dalam ukuran penuh.
 * Menyediakan pengalaman menonton yang imersif dengan:
 * - Loading state saat gambar sedang dimuat
 * - Penanganan error jika gambar gagal dimuat
 * - Informasi metadata (tanggal upload)
 * - Navigasi keyboard (ESC untuk tutup)
 * - Klik di luar gambar untuk menutup modal
 * 
 * Dirancang khusus untuk galeri dokumentasi dengan fokus pada kualitas gambar
 * dan informasi kontekstual.
 */

import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import "../../../sass/components/Modals/ImageViewerModal/ImageViewerModal.css";

/**
 * Props untuk komponen ImageViewerModal.
 * @typedef {Object} ImageViewerModalProps
 * @property {string} imageUrl - URL lengkap gambar yang akan ditampilkan
 * @property {string} [alt="Gallery Image"] - Teks alternatif untuk aksesibilitas
 * @property {string} [date] - Tanggal upload gambar (opsional)
 * @property {function(): void} onClose - Handler saat modal ditutup
 */

/**
 * Komponen modal viewer gambar fullscreen.
 * Menampilkan gambar dalam ukuran penuh dengan informasi metadata dan kontrol navigasi.
 *
 * @component
 * @param {ImageViewerModalProps} props - Props komponen
 */
const ImageViewerModal = ({ imageUrl, alt, date, onClose }) => {
  /**
   * Status loading saat gambar sedang dimuat.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(true);

  /**
   * Status error jika gambar gagal dimuat.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [error, setError] = useState(false);

  /**
   * Handler saat gambar berhasil dimuat.
   * Mengatur status loading ke false dan error ke false.
   */
  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  /**
   * Handler saat gambar gagal dimuat.
   * Mengatur status loading ke false dan error ke true.
   */
  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  /**
   * Handler klik pada backdrop modal.
   * Menutup modal hanya jika klik tepat di backdrop (bukan di konten).
   * @param {React.MouseEvent<HTMLDivElement>} e - Event klik
   */
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  /**
   * Handler tekan tombol ESC.
   * Menutup modal saat pengguna menekan tombol Escape.
   * @param {KeyboardEvent} e - Event keyboard
   */
  const handleEsc = useCallback(
    (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Event listener untuk tombol ESC
  useEffect(() => {
    const handleEscKey = (e) => handleEsc(e);
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [handleEsc]);

  // Mencegah scroll body saat modal terbuka
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div
      className="image-viewer-modal"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <div className="image-viewer-backdrop" />

      <button
        className="image-viewer-close"
        onClick={onClose}
        aria-label="Close image viewer"
      >
        <X size={24} />
      </button>

      <div className="image-viewer-content">
        {loading && (
          <div className="image-viewer-loading">
            <div className="image-viewer-spinner"></div>
            <p>Loading image...</p>
          </div>
        )}

        {error ? (
          <div className="image-viewer-error">
            <p>Failed to load image</p>
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={alt && typeof alt === "string" ? alt : "Gallery Image"}
            className="image-viewer-img"
            onLoad={handleImageLoad}
            onError={handleImageError}
            aria-describedby={date ? "image-date-info" : undefined}
          />
        )}

        {!loading && !error && date && (
          <div className="image-viewer-info" id="image-date-info">
            <span className="image-viewer-date">{date}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageViewerModal;