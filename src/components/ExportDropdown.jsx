/**
 * @file ExportDropdown.jsx
 * @description Komponen dropdown untuk mengekspor data ke berbagai format file.
 * Mendukung dua format utama:
 * - **PDF**: Untuk dokumen cetak dan arsip
 * - **Excel**: Untuk analisis data dan manipulasi spreadsheet
 * 
 * Menyediakan UX yang lengkap dengan:
 * - Loading state per format
 * - Navigasi keyboard penuh
 * - Aksesibilitas screen reader
 * - Penanganan error melalui modal
 */

import React, { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import generalApiService from "../services/generalApiService";
import { useModalContext } from "../contexts/ModalContext";
import AlertModal from "../components/Alerts/AlertModal";
import PulseDots from "../components/Loaders/PulseDots";
import "../sass/components/ExportDropdown/ExportDropdown.css";

/**
 * Props untuk komponen ExportDropdown.
 * @typedef {Object} ExportDropdownProps
 * @property {string} entity - Entitas data yang akan diekspor (misal: "users", "products")
 * @property {string} [className=""] - Kelas CSS tambahan untuk styling
 * @property {function(string): void} [onSuccess] - Callback saat ekspor berhasil
 * @property {function(string): void} [onError] - Callback saat ekspor gagal
 */

/**
 * Komponen dropdown ekspor data dengan dukungan multi-format.
 * Dirancang untuk digunakan di header halaman daftar (Users, Products, dll.).
 *
 * @component
 * @param {ExportDropdownProps} props - Props komponen
 */
const ExportDropdown = ({ entity, className = "", onSuccess, onError }) => {
  /**
   * Status apakah dropdown sedang terbuka.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Status loading untuk format tertentu yang sedang diproses.
   * Nilai string kosong berarti tidak ada yang loading.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [loading, setLoading] = useState("");

  /**
   * Indeks opsi yang sedang difokuskan untuk navigasi keyboard.
   * @type {[number, React.Dispatch<React.SetStateAction<number>>]}
   */
  const [focusedIndex, setFocusedIndex] = useState(0);

  /** @type {React.RefObject<HTMLDivElement>} Ref ke container dropdown */
  const dropdownRef = useRef(null);

  /** @type {React.RefObject<HTMLButtonElement>} Ref ke tombol utama */
  const buttonRef = useRef(null);

  /** @type {React.MutableRefObject<Array<HTMLButtonElement>>} Ref ke opsi dropdown */
  const optionsRef = useRef([]);

  const { openModal, closeModal } = useModalContext();

  /** @type {Array<{key: string, label: string, icon: React.Component}>} Daftar format yang didukung */
  const formats = [
    { key: "pdf", label: "PDF", icon: FileText },
    { key: "excel", label: "Excel", icon: FileSpreadsheet },
  ];

  // ============================================
  // CLICK OUTSIDE HANDLER
  // ============================================
  /**
   * Menutup dropdown saat klik di luar area komponen.
   * @param {MouseEvent} event - Event mouse click
   */
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
      setFocusedIndex(0);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================
  /**
   * Menangani navigasi keyboard untuk aksesibilitas.
   * Mendukung: Enter/Space, Escape, Arrow keys, Tab.
   * @param {KeyboardEvent} e - Event keyboard
   */
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(0);
        buttonRef.current?.focus();
        break;

      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < formats.length - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;

      case "Enter":
      case " ":
        e.preventDefault();
        if (formats[focusedIndex] && loading === "") {
          handleExport(formats[focusedIndex].key);
        }
        break;

      case "Tab":
        setIsOpen(false);
        setFocusedIndex(0);
        break;

      default:
        break;
    }
  };

  useEffect(() => {
    if (isOpen && optionsRef.current[focusedIndex]) {
      optionsRef.current[focusedIndex].focus();
    }
  }, [focusedIndex, isOpen]);

  // ============================================
  // EXPORT HANDLER
  // ============================================
  /**
   * Menangani proses ekspor data ke format tertentu.
   * Menggunakan `generalApiService.exportData()` dengan mapping entitas.
   * @async
   * @param {string} format - Format ekspor ("pdf" atau "excel")
   */
  const handleExport = async (format) => {
    setLoading(format);

    try {
      // mapping entitas untuk sesuaikan dengan route backend
      const entityMap = {
        brand: "brands",
        product: "products",
        users: "users",
      };
      const exportEntity = entityMap[entity] || entity;

      const result = await generalApiService.exportData(exportEntity, format);

      if (result.success) {
        setIsOpen(false);
        setFocusedIndex(0);

        openModal(
          "exportSuccess",
          <AlertModal
            type="success"
            title="Export Successful!"
            message={`Your ${format.toUpperCase()} file has been downloaded successfully.`}
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("exportSuccess")}
            onCancel={() => closeModal("exportSuccess")}
          />,
          "small"
        );

        if (onSuccess) {
          onSuccess(format);
        }
      } else {
        setIsOpen(false);
        setFocusedIndex(0);

        openModal(
          "exportError",
          <AlertModal
            type="error"
            title="Export Failed"
            message={
              result.error ||
              `Failed to export ${format.toUpperCase()}. Please try again.`
            }
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("exportError")}
            onCancel={() => closeModal("exportError")}
          />,
          "small"
        );

        if (onError) {
          onError(result.error || "Export failed");
        }
      }
    } catch (err) {
      console.error("Export error:", err);
      setIsOpen(false);
      setFocusedIndex(0);

      openModal(
        "exportError",
        <AlertModal
          type="error"
          title="Error"
          message="An unexpected error occurred during export. Please try again."
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("exportError")}
          onCancel={() => closeModal("exportError")}
        />,
        "small"
      );

      if (onError) {
        onError(err.message || "Unexpected error");
      }
    } finally {
      setLoading("");
    }
  };

  // ============================================
  // TOGGLE DROPDOWN
  // ============================================
  /**
   * Toggle status buka/tutup dropdown.
   */
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setFocusedIndex(0);
    }
  };

  return (
    <div
      className={`export-dropdown ${className}`}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="menu"
    >
      <button
        ref={buttonRef}
        className="export-button"
        onClick={toggleDropdown}
        disabled={loading !== ""}
        aria-label="Export data"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download size={16} />
        <span>Export Data</span>
      </button>

      {isOpen && (
        <div className="export-dropdown-menu" role="menu">
          {formats.map((fmt, index) => {
            const Icon = fmt.icon;
            const isLoading = loading === fmt.key;
            const isFocused = focusedIndex === index;

            return (
              <button
                key={fmt.key}
                ref={(el) => (optionsRef.current[index] = el)}
                className={`export-option ${
                  isFocused ? "keyboard-focused" : ""
                }`}
                onClick={() => handleExport(fmt.key)}
                disabled={isLoading || loading !== ""}
                role="menuitem"
                tabIndex={isFocused ? 0 : -1}
                aria-label={`Export as ${fmt.label}`}
              >
                <Icon size={16} />
                <span className="option-label">
                  {isLoading ? (
                    <>
                      Exporting
                      <PulseDots size="xs" color="#f3994b" count={3} />
                    </>
                  ) : (
                    fmt.label
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;