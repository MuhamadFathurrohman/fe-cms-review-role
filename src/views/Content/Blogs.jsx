/**
 * @file Blogs.jsx
 * @description Komponen halaman manajemen blog dengan dukungan multi-bahasa.
 * Menyediakan antarmuka lengkap untuk:
 * - Melihat daftar blog dalam format grid
 * - Membuat, mengedit, dan menghapus blog
 * - Memfilter berdasarkan status review (custom dropdown)
 * - Filter "My Submissions" khusus untuk user yang sudah pernah membuat blog
 * - Pencarian berdasarkan judul, konten, atau excerpt
 * - Preview blog dalam modal detail
 * - Navigasi ke halaman Approval untuk reviewer
 *
 * Mendukung konten bilingual (English/Indonesian) dengan tampilan default dalam bahasa Inggris.
 * Mengimplementasikan kontrol akses berbasis izin:
 * - Super admin: Akses penuh ke semua fitur
 * - Pengguna dengan izin "manage blog": Akses CRUD kecuali Delete + filter My Submissions
 * - Pengguna dengan izin "review blog": Akses CRUD + Delete + tombol Blog Approval + filter My Submissions
 * - Pengguna tanpa izin: Hanya bisa melihat
 *
 * Badge status (Opsi B):
 * - APPROVED + isPublished = true → "Published"
 * - APPROVED + isPublished = false → "Approved"
 * - Status lain → tampilkan reviewStatus
 *
 * Kontrol aksi per role:
 * - Tombol Edit: hanya untuk staff (canManage, bukan canReview), status DRAFT atau REVISION
 * - Tombol Delete: hanya untuk reviewer (canReviewBlogs)
 * - Tombol View: selalu muncul untuk reviewer; untuk staff disembunyikan saat status REVISION
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  FileText,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { blogService, REVIEW_STATUS } from "../../services/blogService";
import { useModalContext } from "../../contexts/ModalContext";
import Modal from "../../components/Modals/Modal";
import AlertModal from "../../components/Alerts/AlertModal";
import BlogsForm from "../../components/Modals/Form/BlogsForm";
import BlogViewModal from "../../components/Modals/view/BlogViewModal";
import { useAutoRefetch } from "../../hooks/useAutoRefetch";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { generatePageNumbers } from "../../utils/pagination";
import SkeletonItem from "../../components/Loaders/SkeletonItem";
import {
  canManage,
  canReview,
  isSuperAdmin,
  canAccess,
} from "../../utils/permissions";
import "../../sass/views/Blogs/Blogs.css";

/**
 * Mapping reviewStatus ke label dan className untuk badge.
 * Opsi B: APPROVED + isPublished = true → Published
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
 * Opsi filter dropdown untuk semua user.
 */
const BASE_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: REVIEW_STATUS.DRAFT, label: "Draft" },
  { value: REVIEW_STATUS.PENDING_REVIEW, label: "Pending Review" },
  { value: REVIEW_STATUS.APPROVED, label: "Approved" },
  { value: REVIEW_STATUS.REJECTED, label: "Rejected" },
  { value: REVIEW_STATUS.REVISION, label: "Revision" },
];

/**
 * Komponen halaman manajemen blog utama.
 *
 * @component
 */
const Blogs = () => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();
  const navigate = useNavigate();

  /** @type {string} Filter status yang aktif */
  const [statusFilter, setStatusFilter] = useState("all");

  /** @type {boolean} State untuk buka/tutup dropdown filter */
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  /** @type {boolean} Apakah user sudah pernah membuat blog */
  const [hasOwnBlogs, setHasOwnBlogs] = useState(false);

  const filterDropdownRef = useRef(null);

  /** @type {number} Jumlah item blog per halaman */
  const itemsPerPage = 10;

  // === Permission Logic ===
  const isSuper = isSuperAdmin(currentUser);
  const canManageBlogs = isSuper || canAccess(currentUser?.permissions, "blog");
  const canReviewBlogs = isSuper || canReview(currentUser?.permissions, "blog");

  /**
   * Staff adalah user yang bisa manage tapi bukan reviewer.
   * Digunakan untuk membatasi aksi Edit dan View.
   */
  const isStaff = canManageBlogs && !canReviewBlogs;

  /**
   * Hook pencarian dengan debouncing dan pagination untuk data blog.
   */
  const {
    searchTerm,
    setSearchTerm,
    data: blogItems,
    loading,
    error,
    currentPage,
    totalPages,
    goToPage,
    refresh,
  } = useDebouncedSearch(
    async (page, limit, search, bypassCache = false) => {
      const filters = {};

      if (statusFilter === "published") {
        filters.isPublished = true;
      } else if (statusFilter === "my-submissions") {
        filters.submittedBy = currentUser?.id;
      } else if (statusFilter !== "all") {
        filters.reviewStatus = statusFilter;
      }

      const result = await blogService.getPaginated(
        page,
        limit,
        search,
        filters,
        "EN",
        bypassCache,
      );

      // Cek apakah user pernah membuat blog dari response
      if (result.success && canManageBlogs) {
        const owned = result.data?.some(
          (blog) => blog.authorId === currentUser?.id,
        );
        if (owned) setHasOwnBlogs(true);
      }

      return result;
    },
    1,
    itemsPerPage,
    800,
    [statusFilter],
  );

  /**
   * Memperbarui data blog dengan validasi halaman.
   */
  const refreshWithPageValidation = async (bypassCache = false) => {
    try {
      const filters = {};

      if (statusFilter === "published") {
        filters.isPublished = true;
      } else if (statusFilter === "my-submissions") {
        filters.submittedBy = currentUser?.id;
      } else if (statusFilter !== "all") {
        filters.reviewStatus = statusFilter;
      }

      const result = await blogService.getPaginated(
        1,
        itemsPerPage,
        searchTerm,
        filters,
        "EN",
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
      console.error("❌ Blogs.jsx: Auto-refetch failed:", error);
    }
  };

  useAutoRefetch(handleAutoRefetch);

  // Close dropdown saat klik di luar
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
   * Opsi filter dropdown — tambah My Submissions jika user manage blog
   * dan sudah pernah membuat blog.
   */
  const filterOptions = useMemo(() => {
    if (canManageBlogs && hasOwnBlogs) {
      return [
        ...BASE_FILTER_OPTIONS,
        { value: "my-submissions", label: "My Submissions" },
      ];
    }
    return BASE_FILTER_OPTIONS;
  }, [canManageBlogs, hasOwnBlogs]);

  /** Label filter yang sedang aktif */
  const activeFilterLabel = useMemo(() => {
    return (
      filterOptions.find((opt) => opt.value === statusFilter)?.label || "All"
    );
  }, [filterOptions, statusFilter]);

  /** Daftar nomor halaman */
  const pageNumbers = useMemo(() => {
    return generatePageNumbers(currentPage, totalPages);
  }, [currentPage, totalPages]);

  /**
   * Handler perubahan filter status.
   */
  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setIsFilterOpen(false);
    setTimeout(() => goToPage(1), 0);
  };

  /**
   * Membuka modal tambah blog baru.
   */
  const handleAddBlog = () => {
    if (!canManageBlogs) return;
    openModal(
      "addBlog",
      <Modal
        title="Add New Blog"
        showHeader={true}
        showCloseButton={true}
        onClose={() => closeModal("addBlog")}
      >
        <BlogsForm
          onClose={() => closeModal("addBlog")}
          onSuccess={() => {
            closeModal("addBlog");
            refresh();
          }}
        />
      </Modal>,
    );
  };

  /**
   * Membuka modal edit blog.
   * Hanya bisa diakses oleh staff (canManage, bukan canReview).
   * Status harus DRAFT atau REVISION.
   */
  const handleEditBlog = async (item) => {
    if (!canManageBlogs || canReviewBlogs) return;

    try {
      const result = await blogService.getById(item.id);

      if (!result.success || !result.data) {
        openModal(
          "fetchError",
          <AlertModal
            type="error"
            title="Error"
            message={result.message || "Failed to load blog details."}
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
        `editBlog-${item.id}`,
        <Modal
          title="Edit Blog"
          showHeader={true}
          showCloseButton={true}
          onClose={() => closeModal(`editBlog-${item.id}`)}
        >
          <BlogsForm
            item={result.data}
            onClose={() => closeModal(`editBlog-${item.id}`)}
            onSuccess={() => {
              closeModal(`editBlog-${item.id}`);
              refresh();
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
          message="Failed to load blog details."
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
   * Membuka modal preview blog.
   */
  const handleViewBlog = async (item) => {
    try {
      const result = await blogService.getById(item.id, "EN");
      if (result.success) {
        openModal(
          "view-blog",
          <Modal
            title="Blog Details"
            showHeader={true}
            showCloseButton={true}
            size="large"
            onClose={() => closeModal("view-blog")}
          >
            <BlogViewModal blog={result.data} />
          </Modal>,
        );
      } else {
        openModal(
          "blogErrorAlert",
          <AlertModal
            type="error"
            title="Error"
            message="Failed to load blog details"
            onClose={() => closeModal("blogErrorAlert")}
          />,
          "small",
        );
      }
    } catch (error) {
      openModal(
        "blogErrorAlert",
        <AlertModal
          type="error"
          title="Error"
          message="An error occurred while loading blog details"
          onClose={() => closeModal("blogErrorAlert")}
        />,
        "small",
      );
    }
  };

  /**
   * Membuka modal konfirmasi hapus blog.
   * Hanya bisa diakses oleh reviewer (canReviewBlogs).
   */
  const handleDeleteBlog = (item) => {
    if (!canReviewBlogs) return;
    openModal(
      "deleteBlogConfirm",
      <AlertModal
        type="delete"
        title="Delete Blog?"
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="highlighted-name">{item.title}</span>? This action
            cannot be undone.
          </>
        }
        showActions={true}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={async () => {
          closeModal("deleteBlogConfirm");
          try {
            const result = await blogService.hardDelete(
              item.id,
              currentUser.id,
            );
            if (result.success) {
              openModal(
                "deleteSuccessAlert",
                <AlertModal
                  type="success"
                  title="Deleted!"
                  message={
                    <>
                      Blog{" "}
                      <span className="highlighted-name">{item.title}</span> has
                      been successfully deleted.
                    </>
                  }
                  onClose={() => {
                    closeModal("deleteSuccessAlert");
                    refreshWithPageValidation(true);
                  }}
                />,
                "small",
              );
            } else {
              openModal(
                "deleteErrorAlert",
                <AlertModal
                  type="error"
                  title="Error"
                  message={result.message || "Failed to delete blog."}
                  onClose={() => closeModal("deleteErrorAlert")}
                />,
                "small",
              );
            }
          } catch (err) {
            openModal(
              "deleteErrorAlert",
              <AlertModal
                type="error"
                title="Error"
                message="An error occurred while deleting blog."
                onClose={() => closeModal("deleteErrorAlert")}
              />,
              "small",
            );
          }
        }}
        onCancel={() => closeModal("deleteBlogConfirm")}
      />,
      "small",
    );
  };

  /**
   * Merender badge status blog.
   * Opsi B:
   * - APPROVED + isPublished = true  → "Published"
   * - APPROVED + isPublished = false → "Approved"
   * - Status lain                    → reviewStatus label
   *
   * @param {Object} item - Data blog
   */
  const renderStatusBadge = (item) => {
    if (
      item.reviewStatus === REVIEW_STATUS.APPROVED &&
      item.isPublished === true
    ) {
      return <span className="blog-status published">Published</span>;
    }

    const config =
      REVIEW_STATUS_CONFIG[item.reviewStatus] ||
      REVIEW_STATUS_CONFIG[REVIEW_STATUS.DRAFT];

    return (
      <span className={`blog-status ${config.className}`}>{config.label}</span>
    );
  };

  /**
   * Menentukan apakah tombol View ditampilkan untuk item tertentu.
   * - Reviewer: selalu tampil
   * - Staff: disembunyikan saat status REVISION
   */
  const canShowViewButton = (item) => {
    if (canReviewBlogs) return true;
    return item.reviewStatus !== REVIEW_STATUS.REVISION;
  };

  /**
   * Menentukan apakah tombol Edit ditampilkan untuk item tertentu.
   * - Hanya untuk staff (canManage, bukan canReview)
   * - Status harus DRAFT atau REVISION
   */
  const canShowEditButton = (item) => {
    if (!canManageBlogs || canReviewBlogs) return false;
    return (
      item.reviewStatus === REVIEW_STATUS.DRAFT ||
      item.reviewStatus === REVIEW_STATUS.REVISION
    );
  };

  /**
   * Merender pesan ketika tidak ada data blog.
   */
  const renderNoDataMessage = () => {
    if (searchTerm.trim()) {
      return (
        <>
          <FileText size={48} />
          <p>
            No blogs found matching "<strong>{searchTerm}</strong>"
            {statusFilter !== "all" && (
              <>
                {" "}
                in <strong>{activeFilterLabel}</strong> status
              </>
            )}
          </p>
          <p className="no-data-subtitle">
            Try adjusting your search criteria or filter.
          </p>
        </>
      );
    }

    if (statusFilter === "my-submissions") {
      return (
        <>
          <FileText size={48} />
          <p>You haven't submitted any blogs yet.</p>
          {canManageBlogs && (
            <>
              <br />
              <p className="no-data-subtitle">
                Create and submit a blog to see it here.
              </p>
            </>
          )}
        </>
      );
    }

    if (statusFilter !== "all") {
      return (
        <>
          <FileText size={48} />
          <p>
            No blogs with <strong>{activeFilterLabel}</strong> status.
          </p>
        </>
      );
    }

    return (
      <>
        <FileText size={48} />
        <p>No blogs available.</p>
        {canManageBlogs && (
          <>
            <br />
            <p className="no-data-subtitle">
              Click "Add New Blog" to create your first blog.
            </p>
          </>
        )}
      </>
    );
  };

  return (
    <div className="page-blogs">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <FileText size={28} /> Blog Management
          </h1>
          <p>View and manage all blog posts</p>
        </div>

        <div className="header-actions">
          {canReviewBlogs && (
            <button
              className="btn-secondary"
              onClick={() => navigate("/dashboard/content/blogs/approval")}
            >
              <ClipboardCheck size={18} /> Blog Approval
            </button>
          )}
          {canManageBlogs && (
            <button className="btn-primary" onClick={handleAddBlog}>
              <Plus size={18} /> Add New Blog
            </button>
          )}
        </div>
      </div>

      <div className="blogs-filters">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" aria-label="Search icon" />
          <input
            type="text"
            placeholder="Search by title, content, or excerpt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search blogs"
          />
          {loading && searchTerm && (
            <div className="search-input-spinner"></div>
          )}
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Status</label>
            <div className="filter-dropdown" ref={filterDropdownRef}>
              <button
                className={`filter-dropdown-trigger ${isFilterOpen ? "open" : ""}`}
                onClick={() => setIsFilterOpen((prev) => !prev)}
                aria-label="Filter by status"
              >
                <span>{activeFilterLabel}</span>
                <ChevronDown
                  size={16}
                  className={`chevron ${isFilterOpen ? "rotated" : ""}`}
                />
              </button>

              {isFilterOpen && (
                <div className="filter-dropdown-menu">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`filter-dropdown-item ${
                        statusFilter === option.value ? "active" : ""
                      } ${
                        option.value === "my-submissions"
                          ? "my-submissions-item"
                          : ""
                      }`}
                      onClick={() => handleStatusFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button
            className="error-banner-close"
            onClick={refresh}
            aria-label="Close error banner"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="blogs-scrollable">
        <div className="blogs-container">
          {loading ? (
            <div className="blogs-grid">
              {[...Array(itemsPerPage)].map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="blog-item skeleton-loading"
                >
                  <div className="blog-image-wrapper">
                    <SkeletonItem
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "12px 12px 0 0",
                      }}
                    />
                  </div>
                  <div className="blog-info">
                    <h3 className="blog-title">
                      <SkeletonItem
                        type="default"
                        style={{
                          width: "100%",
                          height: "20px",
                          borderRadius: "4px",
                        }}
                      />
                    </h3>
                    <div className="blog-meta">
                      <span className="blog-date">
                        <SkeletonItem
                          type="default"
                          style={{
                            width: "100px",
                            height: "14px",
                            borderRadius: "4px",
                          }}
                        />
                      </span>
                      <span className="blog-status">
                        <SkeletonItem
                          type="default"
                          style={{
                            width: "60px",
                            height: "14px",
                            borderRadius: "4px",
                          }}
                        />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : Array.isArray(blogItems) && blogItems.length > 0 ? (
            <div className="blogs-grid">
              {blogItems.map((item) => (
                <div key={item.id} className="blog-item">
                  <div className="blog-image-wrapper">
                    {item.image ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="blog-image"
                        loading="lazy"
                        aria-label={`Blog image for ${item.title}`}
                      />
                    ) : (
                      <div className="blog-placeholder">
                        <FileText size={48} />
                        <span>No Image</span>
                      </div>
                    )}

                    <div className="blog-overlay">
                      <div className="blog-actions">
                        {/* View — reviewer selalu tampil, staff disembunyikan saat REVISION */}
                        {canShowViewButton(item) && (
                          <button
                            className="blog-action-btn view-btn"
                            title="View details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewBlog(item);
                            }}
                            aria-label={`View blog ${item.title}`}
                          >
                            <Eye size={16} />
                          </button>
                        )}

                        {/* Edit — hanya staff, status DRAFT atau REVISION */}
                        {canShowEditButton(item) && (
                          <button
                            className="blog-action-btn edit-btn"
                            title="Edit blog"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditBlog(item);
                            }}
                            aria-label={`Edit blog ${item.title}`}
                          >
                            <Edit2 size={16} />
                          </button>
                        )}

                        {/* Delete — hanya reviewer */}
                        {canReviewBlogs && (
                          <button
                            className="blog-action-btn delete-btn"
                            title="Delete blog"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBlog(item);
                            }}
                            aria-label={`Delete blog ${item.title}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="blog-info">
                    <h3 className="blog-title">{item.title}</h3>
                    <div className="blog-meta">
                      <span className="blog-date">
                        {item.createdAtFormatted}
                      </span>
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
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Blogs;
