/**
 * @file AlertModal.jsx
 * @description Komponen modal alert generik untuk menampilkan pesan kepada pengguna.
 * Mendukung empat tipe notifikasi dengan ikon dan warna yang sesuai:
 * - `success`: Operasi berhasil
 * - `error`: Kesalahan sistem atau validasi
 * - `confirm`: Konfirmasi aksi yang memerlukan keputusan eksplisit dari user
 * - `delete`: Konfirmasi penghapusan data
 *
 * Menyediakan dua mode interaksi:
 * - **Simple mode**: Satu tombol (OK) untuk pesan informasi
 * - **Confirmation mode**: Dua tombol (Cancel/Confirm) untuk konfirmasi aksi
 */

import React from "react";
import Modal from "../Modals/Modal";
import { CheckCircle, XCircle, AlertTriangle, Trash2 } from "lucide-react";
import "../../sass/components/Alerts/AlertModal/AlertModal.css";

/**
 * Props untuk komponen AlertModal.
 * @typedef {Object} AlertModalProps
 * @property {string} title - Judul alert (opsional, akan menggunakan default berdasarkan tipe)
 * @property {string} message - Pesan utama yang ditampilkan
 * @property {function(): void} onClose - Handler saat modal ditutup
 * @property {function(): void} [onConfirm] - Handler saat tombol konfirmasi diklik
 * @property {function(): void} [onCancel] - Handler saat tombol cancel diklik
 * @property {'success'|'error'|'confirm'|'delete'} [type='success'] - Tipe alert yang menentukan ikon dan warna
 * @property {boolean} [showActions=false] - Jika true, tampilkan dua tombol (confirmation mode); jika false, satu tombol (simple mode)
 * @property {string} [confirmText] - Teks kustom untuk tombol konfirmasi
 * @property {string} [cancelText='Cancel'] - Teks kustom untuk tombol cancel
 */

/**
 * Komponen modal alert generik dengan dukungan multi-tipe dan mode interaksi.
 * Digunakan untuk menampilkan pesan, konfirmasi, atau peringatan kepada pengguna.
 *
 * @component
 * @param {AlertModalProps} props - Props komponen
 * @returns {JSX.Element} Modal alert dengan ikon, pesan, dan tombol aksi
 *
 * @example
 * // Simple success message
 * <AlertModal
 *   type="success"
 *   message="User created successfully!"
 *   onClose={handleClose}
 * />
 *
 * @example
 * // Delete confirmation
 * <AlertModal
 *   type="delete"
 *   title="Delete User"
 *   message="Are you sure you want to delete this user? This action cannot be undone."
 *   showActions={true}
 *   onConfirm={handleDelete}
 *   onCancel={handleClose}
 *   onClose={handleClose}
 * />
 *
 * @example
 * // Action confirmation
 * <AlertModal
 *   type="confirm"
 *   title="Submit for Review?"
 *   message="Once submitted, this cannot be edited until reviewer gives feedback."
 *   showActions={true}
 *   confirmText="Submit"
 *   onConfirm={handleSubmit}
 *   onCancel={handleClose}
 *   onClose={handleClose}
 * />
 */
const AlertModal = ({
  title,
  message,
  onClose,
  onConfirm,
  onCancel,
  type = "success",
  showActions = false,
  confirmText,
  cancelText = "Cancel",
}) => {
  /**
   * Merender ikon yang sesuai berdasarkan tipe alert.
   * @returns {JSX.Element} Ikon Lucide React yang sesuai
   */
  const renderIcon = () => {
    const iconProps = {
      size: 32,
      strokeWidth: 2,
    };

    switch (type) {
      case "success":
        return <CheckCircle {...iconProps} />;
      case "error":
        return <XCircle {...iconProps} />;
      case "confirm":
        return <AlertTriangle {...iconProps} />;
      case "delete":
        return <Trash2 {...iconProps} />;
      default:
        return <CheckCircle {...iconProps} />;
    }
  };

  /** @type {{[key: string]: string}} Default judul berdasarkan tipe alert */
  const defaultTitle = {
    success: "Success!",
    error: "Error",
    confirm: "Are you sure?",
    delete: "Delete?",
  };

  /** @type {{[key: string]: string}} Default teks tombol konfirmasi berdasarkan tipe alert */
  const defaultConfirmText = {
    success: "OK",
    error: "OK",
    confirm: "Confirm",
    delete: "Delete",
  };

  /**
   * Handler untuk tombol konfirmasi.
   * Memanggil `onConfirm` jika disediakan, atau `onClose` sebagai fallback.
   */
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else if (onClose) {
      onClose();
    }
  };

  /**
   * Handler untuk tombol cancel.
   * Memanggil `onCancel` jika disediakan, atau `onClose` sebagai fallback.
   */
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      title={title || defaultTitle[type]}
      showHeader={false}
      showCloseButton={!showActions}
      onClose={onClose}
      size="small"
      className={`alert-modal alert-${type}`}
    >
      <div className="alert-content">
        <div className="alert-icon-wrapper">
          <div className="alert-icon">{renderIcon()}</div>
        </div>
        <h3 className="alert-title">{title || defaultTitle[type]}</h3>
        <p className="alert-message">{message}</p>
      </div>

      <div className="alert-actions">
        {showActions ? (
          <>
            <button
              className="alert-btn alert-btn-cancel"
              onClick={handleCancel}
              type="button"
              aria-label={`Cancel ${title || defaultTitle[type]}`}
            >
              {cancelText}
            </button>
            <button
              className="alert-btn alert-btn-primary"
              onClick={handleConfirm}
              type="button"
              aria-label={`Confirm ${title || defaultTitle[type]}`}
            >
              {confirmText || defaultConfirmText[type]}
            </button>
          </>
        ) : (
          <button
            className="alert-btn alert-btn-primary alert-btn-single"
            onClick={handleConfirm}
            type="button"
            aria-label={title || defaultTitle[type]}
          >
            {confirmText || defaultConfirmText[type]}
          </button>
        )}
      </div>
    </Modal>
  );
};

export default AlertModal;
