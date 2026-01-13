/**
 * @file AuditLog.jsx
 * @description Komponen halaman audit log sistem yang komprehensif.
 * Menyediakan antarmuka untuk melihat semua aktivitas sistem yang terekam secara otomatis,
 * termasuk:
 * - Tindakan CRUD pada berbagai entitas (user, role, product, dll.)
 * - Aktivitas login/logout pengguna
 * - Operasi sistem seperti export, import, upload
 * 
 * Fitur utama:
 * - Pencarian teks bebas berdasarkan user, tabel, atau deskripsi
 * - Pagination untuk navigasi koleksi besar
 * - Modal detail untuk melihat perubahan spesifik
 * - Klasifikasi visual tindakan dengan badge warna
 * - Humanisasi konten untuk keterbacaan yang lebih baik
 */

import React, { useRef } from "react";
import {
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
} from "lucide-react";
import { auditLogService } from "../services/auditLogService";
import { useModalContext } from "../contexts/ModalContext";
import { useAutoRefetch } from "../hooks/useAutoRefetch";
import Modal from "../components/Modals/Modal";
import AuditLogDetailModal from "../components/Modals/view/AuditLogDetailModal";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch";
import { generatePageNumbers } from "../utils/pagination";
import { getActionBadgeClass, formatActionName } from "../utils/actionHelper";
import "../sass/views/AuditLog/AuditLog.scss";

/**
 * Komponen halaman audit log utama.
 * Menampilkan tabel aktivitas sistem dengan fitur pencarian dan pagination.
 *
 * @component
 */
const AuditLog = () => {
  /** @type {React.RefObject<HTMLInputElement>} Ref ke input pencarian */
  const searchInputRef = useRef(null);

  const { openModal, closeModal } = useModalContext();

  // Fetch audit logs tanpa filter action
  /**
   * Hook pencarian dengan debouncing dan pagination untuk data audit log.
   * Mendukung pencarian teks bebas berdasarkan konten log.
   */
  const {
    searchTerm,
    setSearchTerm,
    data: logs,
    loading,
    error,
    currentPage,
    totalPages,
    goToPage,
    refresh,
  } = useDebouncedSearch(
    (page, limit, search) => {
      return auditLogService.getPaginated(page, limit, search);
    },
    1,
    8,
    800
  );

  /**
   * Fungsi auto-refetch yang dipanggil setiap 30 detik.
   * Memperbarui data audit log secara otomatis.
   */
  useAutoRefetch(() => {
    refresh(); // useDebouncedSearch sudah punya refresh function
  });

  /**
   * Handler untuk input pencarian.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Event input
   */
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Membuka modal detail audit log.
   * @param {Object} log - Data log yang akan dilihat detailnya
   */
  const handleViewDetails = (log) => {
    openModal(
      `audit-log-detail-${log.id}`,
      <Modal
        title="Audit Log Details"
        showHeader={true}
        showCloseButton={true}
        size="large"
        onClose={() => closeModal(`audit-log-detail-${log.id}`)}
      >
        <AuditLogDetailModal log={log} />
      </Modal>
    );
  };

  /**
   * Merender pesan ketika tidak ada data audit log.
   * Menyesuaikan pesan berdasarkan konteks pencarian.
   * @returns {JSX.Element} Pesan no data yang sesuai konteks
   */
  const renderNoDataMessage = () => {
    if (searchTerm.trim()) {
      // Jika sedang search
      return (
        <>
          No log activity found matching "<strong>{searchTerm}</strong>".
          <br />
          <span style={{ fontSize: "0.9em", opacity: 0.8 }}>
            Try adjusting your search criteria.
          </span>
        </>
      );
    } else {
      // Jika tidak ada search
      return <>No log activities available.</>;
    }
  };

  /**
   * Navigasi ke halaman berikutnya.
   */
  const goToNextPage = () => {
    if (currentPage < totalPages) goToPage(currentPage + 1);
  };

  /**
   * Navigasi ke halaman sebelumnya.
   */
  const goToPrevPage = () => {
    if (currentPage > 1) goToPage(currentPage - 1);
  };

  /** @type {(number|string)[]} Daftar nomor halaman untuk ditampilkan */
  const pageNumbers = generatePageNumbers(currentPage, totalPages);

  return (
    <div className="page-audit-log">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <FileText size={28} /> Audit Log
          </h1>
          <p>View all system activities recorded automatically</p>
        </div>
      </div>

      {/* Filter Container - Hanya Search */}
      <div className="filter-container">
        <div className="search-wrapper">
          <SearchIcon
            size={19}
            stroke="currentColor"
            className="search-icon"
            onClick={() => searchInputRef.current?.focus()}
            aria-label="Focus search input"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by user, table, description..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
            aria-label="Search audit logs"
          />
          {loading && searchTerm && (
            <div className="search-input-spinner"></div>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={refresh} className="retry-btn" aria-label="Retry">
            Retry
          </button>
        </div>
      )}

      <div className="table-container">
        <table className="audit-table">
          <thead>
            <tr>
              <th>
                <div className="th-content">Date & Time</div>
              </th>
              <th>
                <div className="th-content">User</div>
              </th>
              <th>Action</th>
              <th>
                <div className="th-content">Table</div>
              </th>
              <th>Description</th>
              <th className="text-center">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="loading-cell">
                  <div className="loading-spinner"></div>
                  <p>Loading audit logs...</p>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">
                  {renderNoDataMessage()}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.createdAtFormatted}</td>
                  <td>{log.userName || "System"}</td>
                  <td>
                    <span
                      className={`badge action ${getActionBadgeClass(
                        log.action
                      )}`}
                      aria-label={`Action: ${formatActionName(log.action) || "Unknown"}`}
                    >
                      {formatActionName(log.action) || "—"}
                    </span>
                  </td>
                  <td>{log.tableName || "—"}</td>
                  <td>{log.description || "No description"}</td>
                  <td className="text-center">
                    <button
                      className="btn-view"
                      onClick={() => handleViewDetails(log)}
                      title="View Details"
                      aria-label="View log details"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            className={`pagination-arrow ${
              currentPage === 1 ? "disabled" : ""
            }`}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} /> <span>Prev</span>
          </button>

          <div className="pagination-pages">
            {pageNumbers.map((page, index) =>
              page === "..." ? (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`pagination-page ${
                    currentPage === page ? "active" : ""
                  }`}
                  aria-label={`Go to page ${page}`}
                >
                  {page}
                </button>
              )
            )}
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className={`pagination-arrow ${
              currentPage === totalPages ? "disabled" : ""
            }`}
            aria-label="Next page"
          >
            <span>Next</span> <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLog;