/**
 * @file Brands.jsx
 * @description Komponen halaman manajemen brand dan client.
 * Menyediakan antarmuka lengkap untuk:
 * - Melihat daftar brand dan client dalam satu tampilan
 * - Membuat, mengedit, dan menghapus brand/client
 * - Pencarian berdasarkan nama
 * - Ekspor data berdasarkan periode
 * - Pagination responsif
 * 
 * Mengimplementasikan kontrol akses berbasis izin:
 * - Super admin: Akses penuh ke semua fitur
 * - Pengguna dengan izin "manage brand": Akses CRUD
 * - Pengguna dengan izin "export brand": Akses ekspor
 */

import React, { useRef } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { brandService } from "../../services/brandService";
import { useModalContext } from "../../contexts/ModalContext";
import Modal from "../../components/Modals/Modal";
import BrandsForm from "../../components/Modals/Form/BrandsForm";
import AlertModal from "../../components/Alerts/AlertModal";
import { useAutoRefetch } from "../../hooks/useAutoRefetch";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { generatePageNumbers } from "../../utils/pagination";
import { canManage, canExport, isSuperAdmin } from "../../utils/permissions";
import ExportDropdown from "../../components/ExportDropdown";
import "../../sass/views/Brands/Brands.scss";

/**
 * Komponen halaman manajemen brand & client utama.
 * Menampilkan tabel brand/client dengan fitur pencarian, pagination, dan aksi CRUD.
 *
 * @component
 */
const Brands = () => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();

  /** @type {React.RefObject<HTMLInputElement>} Ref ke input pencarian */
  const searchInputRef = useRef(null);

  // UPDATE: Tambah parameter bypassCache
  /**
   * Hook pencarian dengan debouncing dan pagination untuk data brand.
   * Mendukung pencarian teks bebas berdasarkan nama brand/client.
   */
  const {
    searchTerm,
    setSearchTerm,
    data: brands,
    loading,
    error,
    currentPage,
    totalPages,
    goToPage,
    refresh,
  } = useDebouncedSearch(
    async (page, limit, search, bypassCache = false) => {
      return await brandService.getPaginated(
        page,
        limit,
        search,
        {}, // filters
        bypassCache
      );
    },
    1,
    8,
    800
  );

  // === Permission Logic ===
  /**
   * Status apakah pengguna saat ini adalah super admin.
   * @type {boolean}
   */
  const isSuper = isSuperAdmin(currentUser);

  /**
   * Status apakah pengguna memiliki izin mengelola brand.
   * @type {boolean}
   */
  const canManageBrands =
    isSuper || canManage(currentUser?.permissions, "brand");

  /**
   * Status apakah pengguna memiliki izin mengekspor data brand.
   * @type {boolean}
   */
  const canExportBrands =
    isSuper || canExport(currentUser?.permissions, "brand");

  // TAMBAH: refreshWithPageValidation
  /**
   * Memperbarui data brand dengan validasi halaman untuk mencegah out-of-bounds.
   * @async
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   */
  const refreshWithPageValidation = async (bypassCache = false) => {
    try {
      const result = await brandService.getPaginated(
        1,
        8,
        searchTerm,
        {},
        bypassCache
      );

      if (result.success) {
        const newTotalPages = result.pagination?.totalPages || 1;
        const targetPage = Math.min(currentPage, newTotalPages);

        if (targetPage === currentPage) {
          refresh(bypassCache);
        } else {
          goToPage(targetPage);
        }
      } else {
        refresh(bypassCache);
      }
    } catch (error) {
      console.error("Error in refreshWithPageValidation:", error);
      refresh(bypassCache);
    }
  };

  /**
   * Fungsi auto-refetch yang dipanggil setiap 30 detik.
   * Memperbarui data brand secara otomatis.
   * @async
   */
  const handleAutoRefetch = async () => {
    try {
      await refreshWithPageValidation(true);
    } catch (error) {
      console.error("❌ Brands.jsx: Auto-refetch failed:", error);
    }
  };

  useAutoRefetch(handleAutoRefetch);

  /**
   * Membuka modal tambah brand/client baru.
   */
  const handleAddBrand = () => {
    if (!canManageBrands) return;
    openModal(
      "add-brand",
      <Modal
        title="Add New Brand & Client"
        showHeader={true}
        showCloseButton={true}
        onClose={() => closeModal("add-brand")}
      >
        <BrandsForm
          onClose={() => closeModal("add-brand")}
          onSuccess={() => {
            closeModal("add-brand");
            refresh(); // Add tidak perlu bypass cache
          }}
        />
      </Modal>
    );
  };

  // UPDATE: handleEditBrand dengan refreshWithPageValidation
  /**
   * Membuka modal edit brand/client.
   * @param {Object} item - Data brand yang akan diedit
   */
  const handleEditBrand = async (item) => {
    if (!canManageBrands) return;

    try {
      const result = await brandService.getById(item.id);

      if (!result.success) {
        openModal(
          "fetchErrorAlert",
          <AlertModal
            type="error"
            title="Error"
            message={result.message || "Failed to fetch brand data"}
            onClose={() => closeModal("fetchErrorAlert")}
          />,
          "small"
        );
        return;
      }

      openModal(
        "edit-brand",
        <Modal
          title="Edit Brand & Client"
          showHeader={true}
          showCloseButton={true}
          onClose={() => closeModal("edit-brand")}
        >
          <BrandsForm
            item={result.data}
            onClose={() => closeModal("edit-brand")}
            onSuccess={() => {
              closeModal("edit-brand");
              refreshWithPageValidation(true);
            }}
          />
        </Modal>
      );
    } catch (error) {
      console.error("Error fetching brand:", error);
      openModal(
        "fetchErrorAlert",
        <AlertModal
          type="error"
          title="Error"
          message="An error occurred while fetching brand data"
          onClose={() => closeModal("fetchErrorAlert")}
        />,
        "small"
      );
    }
  };

  /**
   * Membuka modal konfirmasi hapus brand/client.
   * Menyesuaikan pesan berdasarkan tipe (brand vs client).
   * @param {Object} item - Data brand yang akan dihapus
   */
  const handleDeleteBrand = (item) => {
    if (!canManageBrands) return;

    // Tentukan label type
    const rawType = (item?.type || "brand").toString();
    const labelLower = rawType.toLowerCase(); // brand / client
    const labelCap = labelLower.charAt(0).toUpperCase() + labelLower.slice(1); // Brand / Client

    openModal(
      "deleteBrandConfirm",
      <AlertModal
        type="delete"
        title={`Delete ${labelCap}?`}
        message={
          <>
            Are you sure you want to delete {labelLower}{" "}
            <span className="highlighted-name">{item.name}</span>? This action
            cannot be undone.
          </>
        }
        showActions={true}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={async () => {
          closeModal("deleteBrandConfirm");

          try {
            const result = await brandService.softDelete(item.id);

            if (result.success) {
              openModal(
                "deleteSuccessAlert",
                <AlertModal
                  type="success"
                  title="Deleted!"
                  message={
                    <>
                      {labelCap}{" "}
                      <span className="highlighted-name">{item.name}</span> has
                      been successfully deleted.
                    </>
                  }
                  onClose={() => {
                    closeModal("deleteSuccessAlert");
                    refreshWithPageValidation(true);
                  }}
                />,
                "small"
              );
            } else {
              openModal(
                "deleteErrorAlert",
                <AlertModal
                  type="error"
                  title="Failed to Delete"
                  message={
                    result.message ||
                    `Failed to delete ${labelLower} ${item.name}. Please try again.`
                  }
                  onClose={() => closeModal("deleteErrorAlert")}
                />,
                "small"
              );
            }
          } catch (err) {
            console.error("Delete error:", err);
            openModal(
              "deleteErrorAlert",
              <AlertModal
                type="error"
                title="Error"
                message={`An error occurred while deleting ${labelLower} ${item.name}.`}
                onClose={() => closeModal("deleteErrorAlert")}
              />,
              "small"
            );
          }
        }}
        onCancel={() => closeModal("deleteBrandConfirm")}
      />,
      "small"
    );
  };

  /**
   * Memformat tipe brand untuk ditampilkan di UI.
   * Mengubah huruf pertama menjadi kapital dan sisanya lowercase.
   * @param {string} type - Tipe brand dari backend
   * @returns {string} Tipe yang telah diformat
   */
  const formatType = (type) => {
    if (!type) return "—";
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  /**
   * Merender pesan ketika tidak ada data brand/client.
   * Menyesuaikan pesan berdasarkan konteks pencarian.
   * @returns {JSX.Element} Pesan no data yang sesuai konteks
   */
  const renderNoDataMessage = () => {
    if (searchTerm.trim()) {
      // Jika sedang search
      return (
        <>
          No brand & client found matching "<strong>{searchTerm}</strong>".
          <br />
          <span style={{ fontSize: "0.9em", opacity: 0.8 }}>
            Try adjusting your search criteria.
          </span>
        </>
      );
    } else {
      // Jika tidak ada search
      return (
        <>
          No brands & clients available.
          {canManageBrands && (
            <>
              <br />
              <span style={{ fontSize: "0.9em", opacity: 0.8 }}>
                Click "Add New" to create your first brand or client.
              </span>
            </>
          )}
        </>
      );
    }
  };

  /** @type {(number|string)[]} Daftar nomor halaman untuk ditampilkan */
  const pageNumbers = generatePageNumbers(currentPage, totalPages);

  /** @type {number} Indeks awal untuk penomoran tabel */
  const startIndex = (currentPage - 1) * 8;

  return (
    <div className="page-brands">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <Briefcase size={28} /> Brand & Client Management
          </h1>
          <p>View and manage all brands & clients</p>
        </div>
        <div className="header-actions">
          {canExportBrands && (
            <div className="brand-export-dropdown-wrapper">
              <ExportDropdown entity="brand" />
            </div>
          )}
          {canManageBrands && (
            <button className="btn-primary" onClick={handleAddBrand}>
              <Plus size={18} /> Add New
            </button>
          )}
        </div>
      </div>

      <div className="brands-filters">
        <div className="search-wrapper">
          <Search
            size={19}
            stroke="currentColor"
            className="search-icon"
            onClick={() => searchInputRef.current?.focus()}
            aria-label="Focus search input"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search brands and clients"
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
        <table className="brands-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Created At</th>
              {canManageBrands && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canManageBrands ? 6 : 5} className="loading-cell">
                  <div className="loading-spinner"></div>
                  <p>Loading brands...</p>
                </td>
              </tr>
            ) : Array.isArray(brands) && brands.length > 0 ? (
              brands.map((item, index) => (
                <tr key={item.id}>
                  <td>{startIndex + index + 1}</td>
                  <td>{item.name || "—"}</td>
                  <td>
                    <span className={`badge type ${item.type || "PRODUCT"}`}>
                      {formatType(item.type || "PRODUCT")}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge status ${
                        item.isActive ? "ACTIVE" : "INACTIVE"
                      }`}
                      aria-label={`Status: ${item.isActive ? "Active" : "Inactive"}`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{item.createdAtFormatted}</td>
                  {canManageBrands && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          title="Edit brand"
                          onClick={() => handleEditBrand(item)}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="btn-delete"
                          title="Delete brand"
                          onClick={() => handleDeleteBrand(item)}
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={canManageBrands ? 6 : 5} className="no-data">
                  {renderNoDataMessage()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className={`pagination-btn pagination-arrow ${
              currentPage === 1 ? "disabled" : ""
            }`}
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
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
                  className={`pagination-page ${
                    currentPage === page ? "active" : ""
                  }`}
                  onClick={() => goToPage(page)}
                  aria-label={`Go to page ${page}`}
                >
                  {page}
                </button>
              )
            )}
          </div>

          <button
            className={`pagination-btn pagination-arrow ${
              currentPage === totalPages ? "disabled" : ""
            }`}
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Brands;