/**
 * @file Items.jsx
 * @description Komponen halaman manajemen produk/item dengan dukungan multi-bahasa
 * dan alur Review & Approval.
 * Menyediakan antarmuka lengkap untuk:
 * - Melihat daftar produk dalam format grid
 * - Membuat, mengedit, dan menghapus produk (dengan batasan berdasarkan reviewStatus)
 * - Pencarian berdasarkan nama atau deskripsi
 * - Filter berdasarkan review status
 * - Ekspor data berdasarkan periode
 * - Preview detail produk dalam modal
 * - Navigasi ke halaman Item Approval untuk reviewer
 *
 * Mendukung konten bilingual (English/Indonesian) dengan tampilan default dalam bahasa Inggris.
 * Mengimplementasikan kontrol akses berbasis izin:
 * - Super admin: Akses penuh ke semua fitur
 * - Pengguna dengan izin "manage product": Akses CRUD kecuali Delete
 * - Pengguna dengan izin "review product": Akses Delete + halaman approval
 * - Pengguna dengan izin "export product": Akses ekspor
 *
 * Kontrol aksi per role:
 * - Tombol Edit: hanya staff (canManage, bukan canReview), status DRAFT atau REVISION
 * - Tombol Delete: hanya reviewer (canReviewItems)
 * - Tombol View: selalu muncul untuk reviewer; untuk staff disembunyikan saat status REVISION
 */

import React, { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image,
  ClipboardCheck,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { itemService, REVIEW_STATUS } from "../../services/itemService";
import { useModalContext } from "../../contexts/ModalContext";
import Modal from "../../components/Modals/Modal";
import ItemsForm from "../../components/Modals/Form/ItemsForm";
import ItemViewModal from "../../components/Modals/view/ItemViewModal";
import { useAutoRefetch } from "../../hooks/useAutoRefetch";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { generatePageNumbers } from "../../utils/pagination";
import SkeletonItem from "../../components/Loaders/SkeletonItem";
import AlertModal from "../../components/Alerts/AlertModal";
import {
  canManage,
  canExport,
  canReview,
  canAccess,
  isSuperAdmin,
} from "../../utils/permissions";
import ExportDropdown from "../../components/ExportDropdown";
import "../../sass/views/Items/Items.css";

/**
 * Mapping reviewStatus ke label dan className untuk badge.
 */
const REVIEW_STATUS_CONFIG = {
  [REVIEW_STATUS.DRAFT]: { label: "Draft", className: "draft" },
  [REVIEW_STATUS.PENDING_REVIEW]: {
    label: "Pending Review",
    className: "pending-review",
  },
  [REVIEW_STATUS.APPROVED]: { label: "Approved", className: "approved" },
  [REVIEW_STATUS.REJECTED]: { label: "Rejected", className: "rejected" },
  [REVIEW_STATUS.REVISION]: { label: "Revision", className: "revision" },
};

/**
 * Opsi filter review status untuk dropdown.
 * @type {Array<{label: string, value: string}>}
 */
const REVIEW_STATUS_OPTIONS = [
  { label: "All Status", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending Review", value: "PENDING_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Revision", value: "REVISION" },
];

/**
 * Status yang mengizinkan tombol Edit ditampilkan.
 * @type {string[]}
 */
const EDITABLE_STATUSES = [REVIEW_STATUS.DRAFT, REVIEW_STATUS.REVISION];

/**
 * Komponen halaman manajemen produk utama.
 * Menampilkan grid produk dengan fitur pencarian, filter, pagination, dan aksi CRUD.
 *
 * @component
 */
const Items = () => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();
  const navigate = useNavigate();

  /** @type {[string, Function]} State filter review status yang aktif */
  const [reviewStatusFilter, setReviewStatusFilter] = useState("");

  /** @type {[boolean, Function]} State untuk toggle dropdown filter */
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  /** @type {React.RefObject} Ref untuk deteksi klik di luar dropdown */
  const filterDropdownRef = useRef(null);

  /**
   * Hook pencarian dengan debouncing dan pagination untuk data produk.
   */
  const {
    searchTerm,
    setSearchTerm,
    data: items,
    loading,
    error,
    currentPage,
    totalPages,
    goToPage,
    refresh,
  } = useDebouncedSearch(
    async (page, limit, search, bypassCache = false) => {
      return await itemService.getPaginated(
        page,
        limit,
        search,
        {
          reviewStatus: reviewStatusFilter || undefined,
        },
        bypassCache,
      );
    },
    1,
    10,
    800,
  );

  /**
   * Menutup dropdown filter saat klik di luar area dropdown.
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target)
      ) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Memperbarui data produk dengan validasi halaman.
   */
  const refreshWithPageValidation = async (bypassCache = false) => {
    try {
      const result = await itemService.getPaginated(
        1,
        10,
        searchTerm,
        { reviewStatus: reviewStatusFilter || undefined },
        bypassCache,
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

  const handleAutoRefetch = async () => {
    try {
      await refreshWithPageValidation(true);
    } catch (error) {
      console.error("❌ Items.jsx: Auto-refetch failed:", error);
    }
  };

  useAutoRefetch(handleAutoRefetch);

  // ==================== PERMISSION LOGIC ====================

  const isSuper = isSuperAdmin(currentUser);

  const canManageItems =
    isSuper || canAccess(currentUser?.permissions, "product");

  const canReviewItems =
    isSuper || canReview(currentUser?.permissions, "product");

  const canExportItems =
    isSuper ||
    canExport(currentUser?.permissions, "product") ||
    canReview(currentUser?.permissions, "product");

  /**
   * Staff adalah user yang bisa manage tapi bukan reviewer.
   * Digunakan untuk membatasi aksi Edit dan View.
   */
  const isStaff = canManageItems && !canReviewItems;

  /** @type {(number|string)[]} Daftar nomor halaman untuk ditampilkan */
  const pageNumbers = useMemo(() => {
    return generatePageNumbers(currentPage, totalPages);
  }, [currentPage, totalPages]);

  // ==================== FILTER HELPERS ====================

  const activeFilterLabel = useMemo(() => {
    const found = REVIEW_STATUS_OPTIONS.find(
      (opt) => opt.value === reviewStatusFilter,
    );
    return found ? found.label : "All Status";
  }, [reviewStatusFilter]);

  const handleFilterSelect = (value) => {
    setReviewStatusFilter(value);
    setIsFilterOpen(false);
    goToPage(1);
  };

  // ==================== ACCESS CONTROL HELPERS ====================

  /**
   * Menentukan apakah tombol View ditampilkan untuk item tertentu.
   * - Reviewer: selalu tampil
   * - Staff: disembunyikan saat status REVISION
   */
  const canShowViewButton = (item) => {
    if (canReviewItems) return true;
    return item.reviewStatus !== "REVISION";
  };

  /**
   * Menentukan apakah tombol Edit ditampilkan untuk item tertentu.
   * - Hanya untuk staff (canManage, bukan canReview)
   * - Status harus DRAFT atau REVISION
   */
  const canShowEditButton = (item) => {
    if (!canManageItems || canReviewItems) return false;
    return EDITABLE_STATUSES.includes(item.reviewStatus);
  };

  // ==================== EVENT HANDLERS ====================

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleGoToApproval = () => {
    navigate("/dashboard/products/items/approval");
  };

  /**
   * Membuka modal tambah produk baru.
   */
  const handleAddItem = () => {
    if (!canManageItems) return;
    openModal(
      "addItem",
      <Modal
        title="Add New Item"
        showHeader={true}
        showCloseButton={true}
        onClose={() => closeModal("addItem")}
      >
        <ItemsForm
          onClose={() => closeModal("addItem")}
          onSuccess={() => {
            closeModal("addItem");
            refresh();
          }}
        />
      </Modal>,
    );
  };

  /**
   * Membuka modal preview produk.
   */
  const handleViewItem = (item) => {
    openModal(
      "view-item",
      <Modal
        title="Item Details"
        showHeader={true}
        showCloseButton={true}
        onClose={() => closeModal("view-item")}
        size="large"
      >
        <ItemViewModal
          itemId={item.id}
          onClose={() => closeModal("view-item")}
        />
      </Modal>,
    );
  };

  /**
   * Membuka modal edit produk.
   * Hanya bisa diakses oleh staff (canManage, bukan canReview).
   * Status harus DRAFT atau REVISION.
   */
  const handleEditItem = async (item) => {
    if (!canManageItems || canReviewItems) return;

    try {
      const result = await itemService.getById(item.id);

      if (!result.success || !result.data) {
        openModal(
          "fetchError",
          <AlertModal
            type="error"
            title="Error"
            message={result.message || "Failed to load item details."}
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("fetchError")}
            onCancel={() => closeModal("fetchError")}
          />,
          "small",
        );
        return;
      }

      openModal(
        `editItem-${item.id}`,
        <Modal
          title="Edit Item"
          showHeader={true}
          showCloseButton={true}
          onClose={() => closeModal(`editItem-${item.id}`)}
        >
          <ItemsForm
            item={result.data}
            onClose={() => closeModal(`editItem-${item.id}`)}
            onSuccess={() => {
              closeModal(`editItem-${item.id}`);
              refreshWithPageValidation(true);
            }}
          />
        </Modal>,
      );
    } catch (err) {
      openModal(
        "fetchError",
        <AlertModal
          type="error"
          title="Error"
          message="Failed to load item details."
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("fetchError")}
          onCancel={() => closeModal("fetchError")}
        />,
        "small",
      );
    }
  };

  /**
   * Membuka modal konfirmasi hapus produk.
   * Hanya bisa diakses oleh reviewer (canReviewItems).
   */
  const handleDeleteItem = (item) => {
    if (!canReviewItems) return;
    openModal(
      "deleteItemConfirm",
      <AlertModal
        type="delete"
        title="Delete Item?"
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
          closeModal("deleteItemConfirm");
          try {
            const result = await itemService.hardDelete(
              item.id,
              currentUser.id,
            );
            if (result.success) {
              openModal(
                "deleteSuccess",
                <AlertModal
                  type="success"
                  title="Deleted!"
                  message={
                    <>
                      Item <span className="highlighted-name">{item.name}</span>{" "}
                      has been successfully deleted.
                    </>
                  }
                  onClose={() => {
                    closeModal("deleteSuccess");
                    refreshWithPageValidation(true);
                  }}
                />,
                "small",
              );
            } else {
              openModal(
                "deleteError",
                <AlertModal
                  type="error"
                  title="Error"
                  message={result.message || "Failed to delete item."}
                  onClose={() => closeModal("deleteError")}
                />,
                "small",
              );
            }
          } catch (err) {
            openModal(
              "deleteError",
              <AlertModal
                type="error"
                title="Error"
                message="An error occurred while deleting item."
                onClose={() => closeModal("deleteError")}
              />,
              "small",
            );
          }
        }}
        onCancel={() => closeModal("deleteItemConfirm")}
      />,
      "small",
    );
  };

  // ==================== RENDER HELPERS ====================

  /**
   * Merender badge reviewStatus untuk item.
   */
  const renderStatusBadge = (item) => {
    const config =
      REVIEW_STATUS_CONFIG[item.reviewStatus] || REVIEW_STATUS_CONFIG["DRAFT"];

    return (
      <span
        className={`item-review-status review-status--${config.className}`}
        aria-label={`Review status: ${config.label}`}
      >
        {config.label}
      </span>
    );
  };

  const renderNoDataMessage = () => {
    if (searchTerm.trim() || reviewStatusFilter) {
      return (
        <>
          <Package size={48} />
          <p>
            No items found
            {searchTerm.trim() && (
              <>
                {" "}
                matching "<strong>{searchTerm}</strong>"
              </>
            )}
            {reviewStatusFilter && (
              <>
                {" "}
                with status <strong>{activeFilterLabel}</strong>
              </>
            )}
          </p>
          <p className="no-data-subtitle">
            Try adjusting your search or filter criteria.
          </p>
        </>
      );
    }

    return (
      <>
        <Package size={48} />
        <p>No items product available.</p>
        {canManageItems && (
          <>
            <br />
            <p className="no-data-subtitle">
              Click "Add New Item" to create your first item.
            </p>
          </>
        )}
      </>
    );
  };

  const ItemSkeleton = () => (
    <div className="item skeleton-loading">
      <div className="item-image-wrapper">
        <SkeletonItem
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "12px 12px 0 0",
          }}
        />
      </div>
      <div className="item-info">
        <SkeletonItem
          style={{
            width: "70%",
            height: "18px",
            marginBottom: "12px",
            borderRadius: "6px",
          }}
        />
        <div
          className="item-meta"
          style={{ display: "flex", gap: "8px", alignItems: "center" }}
        >
          <SkeletonItem
            style={{ width: "45%", height: "13px", borderRadius: "4px" }}
          />
          <SkeletonItem
            style={{ width: "35%", height: "22px", borderRadius: "15px" }}
          />
        </div>
      </div>
    </div>
  );

  // ==================== RENDER ====================

  return (
    <div className="page-items">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <Package size={28} /> Item Management
          </h1>
          <p>Manage and organize item images for website display.</p>
        </div>
        <div className="header-actions">
          {canExportItems && (
            <div className="item-export-dropdown-wrapper">
              <ExportDropdown entity="product" />
            </div>
          )}
          {canReviewItems && (
            <button className="btn-secondary" onClick={handleGoToApproval}>
              <ClipboardCheck size={18} /> Item Approval
            </button>
          )}
          {canManageItems && (
            <button className="btn-primary" onClick={handleAddItem}>
              <Plus size={18} /> Add New Item
            </button>
          )}
        </div>
      </div>

      <div className="items-filters">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" aria-label="Search icon" />
          <input
            type="text"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
            aria-label="Search items"
          />
        </div>

        {/* Review Status Filter Dropdown */}
        <div className="filter-dropdown-wrapper" ref={filterDropdownRef}>
          <button
            className={`filter-dropdown-btn ${reviewStatusFilter ? "active" : ""}`}
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-label="Filter by review status"
          >
            <span>{activeFilterLabel}</span>
            <ChevronDown
              size={16}
              className={`dropdown-chevron ${isFilterOpen ? "open" : ""}`}
            />
          </button>

          {isFilterOpen && (
            <div className="filter-dropdown-menu">
              {REVIEW_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`filter-dropdown-item ${
                    reviewStatusFilter === opt.value ? "selected" : ""
                  }`}
                  onClick={() => handleFilterSelect(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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

      <div className="items-container">
        {loading ? (
          <div className="items-grid">
            {[...Array(8)].map((_, index) => (
              <ItemSkeleton key={index} />
            ))}
          </div>
        ) : Array.isArray(items) && items.length > 0 ? (
          <div className="items-grid">
            {items.map((item) => (
              <div key={item.id} className="item">
                <div className="item-image-wrapper">
                  {item.primaryPhoto ? (
                    <img
                      src={item.primaryPhoto}
                      alt={item.name}
                      className="item-image"
                      loading="lazy"
                      aria-label={`Product image for ${item.name}`}
                    />
                  ) : (
                    <div className="item-placeholder">
                      <Image size={48} />
                      <span>No Image</span>
                    </div>
                  )}

                  <div className="item-overlay">
                    <div className="item-actions">
                      {/* View — reviewer selalu tampil, staff disembunyikan saat REVISION */}
                      {canShowViewButton(item) && (
                        <button
                          className="item-action-btn view-btn"
                          title="View details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewItem(item);
                          }}
                          aria-label={`View details for ${item.name}`}
                        >
                          <Eye size={16} />
                        </button>
                      )}

                      {/* Edit — hanya staff, status DRAFT atau REVISION */}
                      {canShowEditButton(item) && (
                        <button
                          className="item-action-btn edit-btn"
                          title="Edit item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditItem(item);
                          }}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}

                      {/* Delete — hanya reviewer */}
                      {canReviewItems && (
                        <button
                          className="item-action-btn delete-btn"
                          title="Delete item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item);
                          }}
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="item-info">
                  <h3 className="item-title">{item.name}</h3>
                  <div className="item-meta">
                    <span className="item-date">{item.createdAtFormatted}</span>
                    {renderStatusBadge(item)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">{renderNoDataMessage()}</div>
        )}
      </div>

      {!loading &&
        Array.isArray(items) &&
        items.length > 0 &&
        totalPages > 1 && (
          <div className="pagination-controls">
            <button
              className={`pagination-arrow ${
                currentPage === 1 ? "disabled" : ""
              }`}
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
              <span>Prev</span>
            </button>

            <div className="pagination-pages">
              {pageNumbers.map((page, index) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="pagination-ellipsis"
                  >
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
                ),
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
              <ChevronRight size={18} />
            </button>
          </div>
        )}
    </div>
  );
};

export default Items;
