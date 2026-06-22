/**
 * @file Categories.jsx
 * @description Komponen halaman manajemen kategori produk.
 * Menyediakan antarmuka lengkap untuk:
 * - Melihat daftar kategori produk
 * - Membuat, mengedit, dan menghapus kategori
 * - Pencarian berdasarkan nama kategori
 * - Pagination responsif
 * 
 * Mengimplementasikan kontrol akses berbasis izin:
 * - Super admin: Akses penuh ke semua fitur
 * - Pengguna dengan izin "manage category": Akses CRUD
 * - Pengguna tanpa izin: Hanya bisa melihat (jika diizinkan oleh rute)
 */

import React, { useRef } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Folder,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { categoriesService } from "../../services/categoriesService";
import { useModalContext } from "../../contexts/ModalContext";
import Modal from "../../components/Modals/Modal";
import AlertModal from "../../components/Alerts/AlertModal";
import CategoriesForm from "../../components/Modals/Form/CategoriesForm";
import { useAutoRefetch } from "../../hooks/useAutoRefetch";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { generatePageNumbers } from "../../utils/pagination";
import { canManage, isSuperAdmin } from "../../utils/permissions";
import "../../sass/views/Categories/Categories.scss";

/**
 * Komponen halaman manajemen kategori utama.
 * Menampilkan tabel kategori dengan fitur pencarian, pagination, dan aksi CRUD.
 *
 * @component
 */
const Categories = () => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();

  /** @type {React.RefObject<HTMLInputElement>} Ref ke input pencarian */
  const searchInputRef = useRef(null);

  // parameter bypassCache
  /**
   * Hook pencarian dengan debouncing dan pagination untuk data kategori.
   * Mendukung pencarian teks bebas berdasarkan nama kategori.
   */
  const {
    searchTerm,
    setSearchTerm,
    data: categories,
    loading,
    error,
    currentPage,
    totalPages,
    goToPage,
    refresh,
  } = useDebouncedSearch(
    async (page, limit, search, bypassCache = false) => {
      return await categoriesService.getPaginated(
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
   * Status apakah pengguna memiliki izin mengelola kategori.
   * @type {boolean}
   */
  const canManageCategories =
    isSuper || canManage(currentUser?.permissions, "category");

  // refreshWithPageValidation
  /**
   * Memperbarui data kategori dengan validasi halaman untuk mencegah out-of-bounds.
   * @async
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   */
  const refreshWithPageValidation = async (bypassCache = false) => {
    try {
      const result = await categoriesService.getPaginated(
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
   * Memperbarui data kategori secara otomatis.
   * @async
   */
  const handleAutoRefetch = async () => {
    try {
      await refreshWithPageValidation(true);
    } catch (error) {
      console.error("❌ Catgories.jsx: Auto-refetch failed:", error);
    }
  };

  useAutoRefetch(handleAutoRefetch);

  /**
   * Handler untuk input pencarian.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Event input
   */
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Membuka modal tambah kategori baru.
   */
  const handleAddCategory = () => {
    if (!canManageCategories) return;
    openModal(
      "add-category",
      <Modal
        title="Add New Category"
        showHeader={true}
        showCloseButton={true}
        onClose={() => closeModal("add-category")}
      >
        <CategoriesForm
          onClose={() => closeModal("add-category")}
          onSuccess={() => {
            closeModal("add-category");
            refresh(); // Add tidak perlu bypass cache
          }}
        />
      </Modal>
    );
  };

  // handleEditCategory dengan refreshWithPageValidation
  /**
   * Membuka modal edit kategori.
   * @param {Object} item - Data kategori yang akan diedit
   */
  const handleEditCategory = (item) => {
    if (!canManageCategories) return;
    openModal(
      "edit-category",
      <Modal
        title="Edit Category"
        showHeader={true}
        showCloseButton={true}
        onClose={() => closeModal("edit-category")}
      >
        <CategoriesForm
          item={item}
          onClose={() => closeModal("edit-category")}
          onSuccess={() => {
            closeModal("edit-category");
            refreshWithPageValidation(true);
          }}
        />
      </Modal>
    );
  };

  // handleDeleteCategory dengan refreshWithPageValidation
  /**
   * Membuka modal konfirmasi hapus kategori.
   * @param {Object} item - Data kategori yang akan dihapus
   */
  const handleDeleteCategory = (item) => {
    if (!canManageCategories) return;
    openModal(
      "deleteCategoryConfirm",
      <AlertModal
        type="delete"
        title="Delete Category?"
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="highlighted-name">{item.name}</span>? This action
            cannot be undone.
          </>
        }
        showActions={true}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={async () => {
          closeModal("deleteCategoryConfirm");
          try {
            const result = await categoriesService.hardDelete(
              item.id,
              currentUser.id
            );
            if (result.success) {
              openModal(
                "deleteSuccessAlert",
                <AlertModal
                  type="success"
                  title="Deleted!"
                  message={
                    <>
                      Category{" "}
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
                  title="Error"
                  message={result.message || "Failed to delete category."}
                  onClose={() => closeModal("deleteErrorAlert")}
                />,
                "small"
              );
            }
          } catch (err) {
            openModal(
              "deleteErrorAlert",
              <AlertModal
                type="error"
                title="Error"
                message="An error occurred while deleting category."
                onClose={() => closeModal("deleteErrorAlert")}
              />,
              "small"
            );
          }
        }}
        onCancel={() => closeModal("deleteCategoryConfirm")}
      />,
      "small"
    );
  };

  /**
   * Merender pesan ketika tidak ada data kategori.
   * Menyesuaikan pesan berdasarkan konteks pencarian.
   * @returns {JSX.Element} Pesan no data yang sesuai konteks
   */
  const renderNoDataMessage = () => {
    if (searchTerm.trim()) {
      // Jika sedang search
      return (
        <>
          No category found matching "<strong>{searchTerm}</strong>".
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
          No categories available.
          {canManageCategories && (
            <>
              <br />
              <span style={{ fontSize: "0.9em", opacity: 0.8 }}>
                Click "Add New Category" to create your first category.
              </span>
            </>
          )}
        </>
      );
    }
  };

  // Generate page numbers
  /** @type {(number|string)[]} Daftar nomor halaman untuk ditampilkan */
  const pageNumbers = generatePageNumbers(currentPage, totalPages);

  return (
    <div className="page-categories">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <Folder size={28} /> Category Management
          </h1>
          <p>View and manage all categories</p>
        </div>
        {canManageCategories && (
          <button className="btn-primary" onClick={handleAddCategory}>
            <Plus size={18} /> Add New Category
          </button>
        )}
      </div>

      <div className="categories-filters">
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
            onChange={handleSearch}
            className="search-input"
            aria-label="Search categories"
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
        <table className="categories-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>Status</th>
              <th>Created At</th>
              {canManageCategories && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={canManageCategories ? 5 : 4}
                  className="loading-cell"
                >
                  <div className="loading-spinner"></div>
                  <p>Loading categories...</p>
                </td>
              </tr>
            ) : Array.isArray(categories) && categories.length > 0 ? (
              categories.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1 + (currentPage - 1) * 8}</td>
                  <td>{item.name || "—"}</td>
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
                  <td>{item.createdAtFormatted || "N/A"}</td>
                  {canManageCategories && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          title="Edit category"
                          onClick={() => handleEditCategory(item)}
                          aria-label={`Edit category ${item.name}`}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="btn-delete"
                          title="Delete category"
                          onClick={() => handleDeleteCategory(item)}
                          aria-label={`Delete category ${item.name}`}
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
                <td colSpan={canManageCategories ? 5 : 4} className="no-data">
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
            className={`pagination-arrow ${
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
            className={`pagination-arrow ${
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

export default Categories;