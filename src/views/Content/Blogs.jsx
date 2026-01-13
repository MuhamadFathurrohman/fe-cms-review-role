/**
 * @file Blogs.jsx
 * @description Komponen halaman manajemen blog dengan dukungan multi-bahasa.
 * Menyediakan antarmuka lengkap untuk:
 * - Melihat daftar blog dalam format grid
 * - Membuat, mengedit, dan menghapus blog
 * - Memfilter berdasarkan status (Published/Draft/All)
 * - Pencarian berdasarkan judul, konten, atau excerpt
 * - Preview blog dalam modal detail
 * 
 * Mendukung konten bilingual (English/Indonesian) dengan tampilan default dalam bahasa Inggris.
 * Mengimplementasikan kontrol akses berbasis izin:
 * - Super admin: Akses penuh ke semua fitur
 * - Pengguna dengan izin "manage blog": Akses CRUD
 * - Pengguna tanpa izin: Hanya bisa melihat (jika diizinkan oleh rute)
 */

import React, { useState, useMemo } from "react";
import {
  Eye,
  FileText,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { blogService } from "../../services/blogService";
import { useModalContext } from "../../contexts/ModalContext";
import Modal from "../../components/Modals/Modal";
import AlertModal from "../../components/Alerts/AlertModal";
import BlogsForm from "../../components/Modals/Form/BlogsForm";
import BlogViewModal from "../../components/Modals/view/BlogViewModal";
import { useAutoRefetch } from "../../hooks/useAutoRefetch";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { generatePageNumbers } from "../../utils/pagination";
import SkeletonItem from "../../components/Loaders/SkeletonItem";
import { canManage, isSuperAdmin } from "../../utils/permissions";
import "../../sass/views/Blogs/Blogs.css";

/**
 * Komponen halaman manajemen blog utama.
 * Menampilkan grid blog dengan fitur pencarian, filter, dan aksi CRUD.
 *
 * @component
 */
const Blogs = () => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();

  /**
   * Filter status blog yang aktif.
   * @type {['all'|'published'|'draft', React.Dispatch<React.SetStateAction<...>>]}
   */
  const [statusFilter, setStatusFilter] = useState("all");

  /** @type {number} Jumlah item blog per halaman */
  const itemsPerPage = 10;

  // fetchData: (page, limit, search, bypassCache)
  /**
   * Hook pencarian dengan debouncing dan pagination untuk data blog.
   * Mendukung filter status dan pencarian teks bebas.
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
      if (statusFilter === "published") filters.isPublished = true;
      if (statusFilter === "draft") filters.isPublished = false;

      const result = await blogService.getPaginated(
        page,
        limit,
        search,
        filters,
        "EN",
        bypassCache
      );

      return result;
    },
    1,
    itemsPerPage,
    800,
    [statusFilter]
  );

  // refreshWithPageValidation
  /**
   * Memperbarui data blog dengan validasi halaman untuk mencegah out-of-bounds.
   * @async
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   */
  const refreshWithPageValidation = async (bypassCache = false) => {
    try {
      const filters = {};
      if (statusFilter === "published") filters.isPublished = true;
      if (statusFilter === "draft") filters.isPublished = false;

      const result = await blogService.getPaginated(
        1,
        itemsPerPage,
        searchTerm,
        filters,
        "EN",
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
   * Memperbarui data blog secara otomatis.
   * @async
   */
  const handleAutoRefetch = async () => {
    try {
      await refreshWithPageValidation(true);
    } catch (error) {
      console.error("❌ Blogs.jsx: Auto-refetch failed:", error);
    }
  };

  useAutoRefetch(handleAutoRefetch);

  // === Permission Logic ===
  /**
   * Status apakah pengguna saat ini adalah super admin.
   * @type {boolean}
   */
  const isSuper = isSuperAdmin(currentUser);

  /**
   * Status apakah pengguna memiliki izin mengelola blog.
   * @type {boolean}
   */
  const canManageBlogs = isSuper || canManage(currentUser?.permissions, "blog");

  // Generate page numbers
  /** @type {(number|string)[]} Daftar nomor halaman untuk ditampilkan */
  const pageNumbers = useMemo(() => {
    return generatePageNumbers(currentPage, totalPages);
  }, [currentPage, totalPages]);

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
      </Modal>
    );
  };

  /**
   * Membuka modal edit blog.
   * @param {Object} item - Data blog yang akan diedit
   */
  const handleEditBlog = async (item) => {
    if (!canManageBlogs) return;

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
          "small"
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
        </Modal>
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
        "small"
      );
    }
  };

  /**
   * Membuka modal preview blog.
   * @param {Object} item - Data blog yang akan dilihat
   */
  const handleViewBlog = async (item) => {
    try {
      const result = await blogService.getById(item.id, "EN");
      if (result.success) {
        openModal(
          "view-blog",
          <Modal
            title={result.data.title || "Blog Details"}
            showHeader={true}
            showCloseButton={true}
            size="large"
            onClose={() => closeModal("view-blog")}
          >
            <BlogViewModal blog={result.data} />
          </Modal>
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
          "small"
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
        "small"
      );
    }
  };

  /**
   * Membuka modal konfirmasi hapus blog.
   * @param {Object} item - Data blog yang akan dihapus
   */
  const handleDeleteBlog = (item) => {
    if (!canManageBlogs) return;
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
            const result = await blogService.softDelete(
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
                "small"
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
                "small"
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
              "small"
            );
          }
        }}
        onCancel={() => closeModal("deleteBlogConfirm")}
      />,
      "small"
    );
  };

  // Handle Status Filter
  /**
   * Handler perubahan filter status blog.
   * @param {'all'|'published'|'draft'} status - Status filter yang dipilih
   */
  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    // Force refresh after state update
    setTimeout(() => {
      goToPage(1);
    }, 0);
  };

  /**
   * Merender pesan ketika tidak ada data blog.
   * Menyesuaikan pesan berdasarkan konteks pencarian dan filter.
   * @returns {JSX.Element} Pesan no data yang sesuai konteks
   */
  const renderNoDataMessage = () => {
    // Jika ada search term
    if (searchTerm.trim()) {
      return (
        <>
          <FileText size={48} />
          <p>
            No blogs found matching "<strong>{searchTerm}</strong>"
            {statusFilter !== "all" && (
              <>
                {" "}
                in <strong>{statusFilter}</strong> status
              </>
            )}
          </p>
          <p className="no-data-subtitle">
            Try adjusting your search criteria or filter.
          </p>
        </>
      );
    }

    // Jika filter Published aktif
    if (statusFilter === "published") {
      return (
        <>
          <FileText size={48} />
          <p>No published blogs available.</p>
          {canManageBlogs && (
            <>
              <br />
              <p className="no-data-subtitle">
                Publish a draft or create a new blog to see it here.
              </p>
            </>
          )}
        </>
      );
    }

    // Jika filter Draft aktif
    if (statusFilter === "draft") {
      return (
        <>
          <FileText size={48} />
          <p>No draft blogs available.</p>
          {canManageBlogs && (
            <>
              <br />
              <p className="no-data-subtitle">
                Create a new blog as draft to see it here.
              </p>
            </>
          )}
        </>
      );
    }

    // Jika filter All dan tidak ada data sama sekali
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
        {canManageBlogs && (
          <button className="btn-primary" onClick={handleAddBlog}>
            <Plus size={18} /> Add New Blog
          </button>
        )}
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
            <div className="status-toggle">
              <button
                className={statusFilter === "all" ? "active" : ""}
                onClick={() => handleStatusFilter("all")}
                aria-label="Show all blogs"
              >
                All
              </button>
              <button
                className={statusFilter === "published" ? "active" : ""}
                onClick={() => handleStatusFilter("published")}
                aria-label="Show published blogs only"
              >
                Published
              </button>
              <button
                className={statusFilter === "draft" ? "active" : ""}
                onClick={() => handleStatusFilter("draft")}
                aria-label="Show draft blogs only"
              >
                Draft
              </button>
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

                        {canManageBlogs && (
                          <>
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
                          </>
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
                      <span
                        className={`blog-status ${
                          item.isPublished ? "published" : "draft"
                        }`}
                      >
                        {item.isPublished ? "Published" : "Draft"}
                      </span>
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

export default Blogs;