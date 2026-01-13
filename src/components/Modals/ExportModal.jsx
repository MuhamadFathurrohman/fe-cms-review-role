/**
 * @file ExportModal.jsx
 * @description Komponen modal untuk mengekspor data berdasarkan periode bulan/tahun.
 * Mendukung dua mode operasi:
 * - **analytics**: Mengekspor data analitik website
 * - **clients**: Mengekspor data inquiry klien dari company profile
 * 
 * Menyediakan antarmuka pengguna yang sederhana untuk:
 * - Memilih bulan dan tahun
 * - Memilih format ekspor (Excel/PDF)
 * - Validasi input periode
 * - Feedback loading dan error
 */

import React, { useState } from "react";
import { analyticsService } from "../../services/analyticsService";
import { clientService } from "../../services/clientService";
import PulseDots from "../Loaders/PulseDots";
import "../../sass/components/Modals/ExportModal/ExportModal.scss";
import AlertModal from "../Alerts/AlertModal";
import { useModalContext } from "../../contexts/ModalContext";

/**
 * Props untuk komponen ExportModal.
 * @typedef {Object} ExportModalProps
 * @property {'analytics'|'clients'} [mode='analytics'] - Mode ekspor yang digunakan
 * @property {function(): void} [onSuccess] - Callback saat ekspor berhasil
 * @property {function(): void} [onClose] - Callback saat modal ditutup
 */

/**
 * Komponen modal ekspor data berbasis periode.
 * Digunakan untuk memilih bulan, tahun, dan format ekspor sebelum memulai proses ekspor.
 *
 * @component
 * @param {ExportModalProps} props - Props komponen
 */
const ExportModal = ({ mode = "analytics", onSuccess, onClose }) => {
  const { openModal, closeModal } = useModalContext();
  const currentYear = new Date().getFullYear();

  /**
   * Bulan yang dipilih untuk ekspor (1-12).
   * @type {[string|number, React.Dispatch<React.SetStateAction<string|number>>]}
   */
  const [month, setMonth] = useState("");

  /**
   * Tahun yang dipilih untuk ekspor.
   * @type {[string|number, React.Dispatch<React.SetStateAction<string|number>>]}
   */
  const [year, setYear] = useState("");

  /**
   * Format ekspor yang dipilih.
   * @type {['excel'|'pdf', React.Dispatch<React.SetStateAction<'excel'|'pdf'>>]}
   */
  const [format, setFormat] = useState("excel");

  /**
   * Status loading saat proses ekspor berlangsung.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Pesan error validasi untuk field bulan.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [monthError, setMonthError] = useState("");

  /**
   * Pesan error validasi untuk field tahun.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [yearError, setYearError] = useState("");

  /**
   * Memvalidasi input bulan.
   * @param {string|number|null} value - Nilai input bulan
   * @returns {string} Pesan error atau string kosong jika valid
   */
  const validateMonth = (value) => {
    if (value === "" || value === null) return "Month is required";
    if (isNaN(value)) return "Month must be a number";
    const num = Number(value);
    if (num < 1 || num > 12) return "Month must be between 1-12";
    return "";
  };

  /**
   * Memvalidasi input tahun.
   * @param {string|number|null} value - Nilai input tahun
   * @returns {string} Pesan error atau string kosong jika valid
   */
  const validateYear = (value) => {
    if (value === "" || value === null) return "Year is required";
    if (isNaN(value)) return "Year must be a number";
    const num = Number(value);
    if (num < 1900 || num > currentYear + 10) return "Invalid year";
    return "";
  };

  // Helper: show error alert
  /**
   * Menampilkan modal error setelah menutup modal ekspor.
   * @param {string} message - Pesan error yang akan ditampilkan
   */
  const showErrorAlert = (message) => {
    // Close export modal first
    if (onClose) onClose();
    // Show alert after modal closed
    setTimeout(() => {
      openModal(
        "exportErrorAlert",
        <AlertModal
          type="error"
          message={message}
          onClose={() => closeModal("exportErrorAlert")}
        />,
        "small"
      );
    }, 300);
  };

  // Helper: show success alert
  /**
   * Menampilkan modal sukses setelah menutup modal ekspor.
   */
  const showSuccessAlert = () => {
    if (onSuccess) onSuccess();
    setTimeout(() => {
      openModal(
        "exportSuccessAlert",
        <AlertModal
          type="success"
          message="Data exported successfully!"
          onClose={() => closeModal("exportSuccessAlert")}
        />,
        "small"
      );
    }, 300);
  };

  /**
   * Handler utama untuk proses ekspor data.
   * Melakukan validasi input, memanggil service yang sesuai, dan menangani hasil.
   * @async
   */
  const handleExport = async () => {
    const mErr = validateMonth(month);
    const yErr = validateYear(year);
    setMonthError(mErr);
    setYearError(yErr);
    if (mErr || yErr) return;

    const numMonth = Number(month);
    const numYear = Number(year);

    setIsExporting(true);
    try {
      let result;
      if (mode === "clients") {
        result = await clientService.exportData(numMonth, numYear, format);
      } else {
        result = await analyticsService.exportData(numMonth, numYear, format);
      }

      if (result?.success) {
        showSuccessAlert();
      } else {
        showErrorAlert(result.error || "Failed to export data.");
      }
    } catch (error) {
      console.error("Unexpected export error:", error);
      showErrorAlert("An unexpected error occurred during export.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-modal-content">
      <div className="form-group">
        <label className="form-label">Month</label>
        <div className="input-wrapper">
          <input
            type="number"
            className={`form-input ${monthError ? "error" : ""}`}
            placeholder="Example: 5"
            value={month}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              setMonth(val);
              setMonthError(validateMonth(val));
            }}
            aria-label="Month for export"
            min="1"
            max="12"
          />
          {monthError && <div className="error-tooltip">{monthError}</div>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Year</label>
        <div className="input-wrapper">
          <input
            type="number"
            className={`form-input ${yearError ? "error" : ""}`}
            placeholder="Example: 2023"
            value={year}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              setYear(val);
              setYearError(validateYear(val));
            }}
            aria-label="Year for export"
            min="1900"
            max={currentYear + 10}
          />
          {yearError && <div className="error-tooltip">{yearError}</div>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Format</label>
        <div className="format-options">
          {[
            { value: "excel", label: "Excel (.xlsx)" },
            { value: "pdf", label: "PDF" },
          ].map((opt) => (
            <label key={opt.value} className="format-option">
              <input
                type="radio"
                name="format"
                value={opt.value}
                checked={format === opt.value}
                onChange={(e) => setFormat(e.target.value)}
                className="export-radio-input"
                aria-label={`Export as ${opt.label}`}
              />
              <span className="export-radio-label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="export-modal-footer">
        <button
          className="btn-secondary"
          onClick={onClose}
          disabled={isExporting}
          aria-label="Cancel export"
        >
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleExport}
          disabled={isExporting}
          aria-label="Export data"
        >
          {isExporting ? (
            <span className="btn-loading">
              <PulseDots size="sm" color="#ffffff" count={3} />
            </span>
          ) : (
            "Export"
          )}
        </button>
      </div>
    </div>
  );
};

export default ExportModal;