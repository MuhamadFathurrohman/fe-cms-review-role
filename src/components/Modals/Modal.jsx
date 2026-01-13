/**
 * @file Modal.jsx
 * @description Sistem modal komponen React yang terdiri dari tiga bagian:
 * 1. `Modal`: Komponen wrapper untuk konten modal dengan header/footer konsisten
 * 2. `ModalShell`: Shell UI dasar dengan overlay, penanganan klik luar, dan dukungan keyboard
 * 3. `ModalRenderer`: Renderer untuk menampilkan semua modal aktif dari stack
 * 
 * Dirancang untuk digunakan bersama dengan `ModalContext` untuk manajemen state global.
 */

import React from "react";
import "../../sass/components/Modals/Modal/Modal.css";

/**
 * Props untuk komponen Modal wrapper.
 * @typedef {Object} ModalProps
 * @property {React.ReactNode} children - Konten utama modal
 * @property {string|React.ReactNode} title - Judul modal
 * @property {boolean} [showHeader=true] - Apakah header modal ditampilkan
 * @property {boolean} [showCloseButton=true] - Apakah tombol tutup ditampilkan di header
 * @property {function(): void} onClose - Handler saat modal ditutup
 * @property {string} [className=""] - Kelas CSS tambahan
 */

/**
 * Komponen wrapper modal generik dengan struktur header-body konsisten.
 * Digunakan sebagai pembungkus konten modal untuk memastikan tampilan yang seragam.
 *
 * @component
 * @param {ModalProps} props - Props komponen
 * @returns {JSX.Element} Struktur modal dengan header opsional dan body
 *
 * @example
 * <Modal title="Edit User" onClose={handleClose}>
 *   <UserForm />
 * </Modal>
 */
const Modal = ({
  children,
  title,
  showHeader = true,
  showCloseButton = true,
  onClose,
  className = "",
}) => {
  return (
    <div className={className}>
      {showHeader && (
        <div className="modal-header">
          <h2>{title}</h2>
          {showCloseButton && (
            <button 
              className="modal-close-btn" 
              onClick={onClose}
              aria-label="Close modal"
            >
              &times;
            </button>
          )}
        </div>
      )}
      <div className="modal-body">{children}</div>
    </div>
  );
};

/**
 * Props untuk komponen ModalShell.
 * @typedef {Object} ModalShellProps
 * @property {React.ReactNode} children - Konten modal (biasanya komponen Modal)
 * @property {function(): void} onClose - Handler penutupan modal
 * @property {'small'|'medium'|'large'} [size='medium'] - Ukuran modal
 * @property {string} [className=""] - Kelas CSS tambahan
 */

/**
 * Shell UI dasar untuk satu instance modal.
 * Menyediakan:
 * - Overlay backdrop gelap
 * - Penanganan klik di luar modal (menutup modal)
 * - Dukungan keyboard (ESC untuk menutup)
 * - Ukuran responsif (small, medium, large)
 *
 * @component
 * @param {ModalShellProps} props - Props komponen
 * @returns {JSX.Element} Shell modal dengan overlay dan konten
 */
const ModalShell = ({ children, onClose, size = "medium", className = "" }) => {
  // Close on ESC key
  /**
   * Menutup modal saat pengguna menekan tombol ESC.
   */
  React.useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const contentClass = `modal-content modal-size-${size} ${className}`.trim();

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className={contentClass} 
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Props untuk komponen ModalRenderer.
 * @typedef {Object} ModalRendererProps
 * @property {Array<{ key: string, content: React.ReactNode, size: string, className: string }>} modals - Stack modal aktif
 * @property {function(string): void} closeModal - Fungsi untuk menutup modal berdasarkan key
 */

/**
 * Renderer untuk semua modal yang sedang aktif.
 * Memetakan setiap modal dalam stack ke instance `ModalShell`.
 * Digunakan oleh `ModalProvider` untuk menampilkan modal di seluruh aplikasi.
 *
 * @component
 * @param {ModalRendererProps} props - Props komponen
 * @returns {JSX.Element|null} Kumpulan modal aktif atau null jika tidak ada
 */
export const ModalRenderer = ({ modals, closeModal }) => {
  if (modals.length === 0) return null;

  return modals.map(({ key, content, size, className }) => (
    <ModalShell
      key={key}
      onClose={() => closeModal(key)}
      size={size}
      className={className || ""}
    >
      {content}
    </ModalShell>
  ));
};

export default Modal;