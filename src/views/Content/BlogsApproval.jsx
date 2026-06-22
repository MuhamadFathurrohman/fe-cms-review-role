/**
 * @file BlogsApproval.jsx
 * @description Komponen halaman approval blog khusus untuk reviewer.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  ArrowLeft,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { blogService, REVIEW_STATUS } from "../../services/blogService";
import { useModalContext } from "../../contexts/ModalContext";
import Modal from "../../components/Modals/Modal";
import AlertModal from "../../components/Alerts/AlertModal";
import BlogsApprovalView from "../../components/Modals/view/BlogsApprovalView";
import { useAutoRefetch } from "../../hooks/useAutoRefetch";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { generatePageNumbers } from "../../utils/pagination";
import SkeletonItem from "../../components/Loaders/SkeletonItem";
import { canReview, isSuperAdmin } from "../../utils/permissions";
import "../../sass/views/BlogsApproval/BlogsApproval.css";

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

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: REVIEW_STATUS.PENDING_REVIEW, label: "Pending Review" },
  { value: REVIEW_STATUS.APPROVED, label: "Approved" },
  { value: REVIEW_STATUS.REJECTED, label: "Rejected" },
  { value: REVIEW_STATUS.REVISION, label: "Revision" },
  { value: REVIEW_STATUS.DRAFT, label: "Draft" },
];

const BlogsApproval = () => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState(
    REVIEW_STATUS.PENDING_REVIEW,
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filterDropdownRef = useRef(null);
  const itemsPerPage = 10;

  const isSuper = isSuperAdmin(currentUser);
  const canReviewBlogs = isSuper || canReview(currentUser?.permissions, "blog");

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
      if (statusFilter !== "all") {
        filters.reviewStatus = statusFilter;
      }
      return await blogService.getPaginated(
        page,
        limit,
        search,
        filters,
        "EN",
        bypassCache,
      );
    },
    1,
    itemsPerPage,
    800,
    [statusFilter],
  );

  const refreshWithPageValidation = async (bypassCache = false) => {
    try {
      const filters = {};
      if (statusFilter !== "all") {
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
      console.error("❌ BlogsApproval.jsx: Auto-refetch failed:", error);
    }
  };

  useAutoRefetch(handleAutoRefetch);

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

  const activeFilterLabel = useMemo(() => {
    return (
      FILTER_OPTIONS.find((opt) => opt.value === statusFilter)?.label ||
      "Pending Review"
    );
  }, [statusFilter]);

  const pageNumbers = useMemo(() => {
    return generatePageNumbers(currentPage, totalPages);
  }, [currentPage, totalPages]);

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setIsFilterOpen(false);
    setTimeout(() => goToPage(1), 0);
  };

  const handleViewBlog = async (item) => {
    try {
      const result = await blogService.getById(item.id, "EN");

      if (!result.success || !result.data) {
        openModal(
          "approvalFetchError",
          <AlertModal
            type="error"
            title="Error"
            message={result.message || "Failed to load blog details."}
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("approvalFetchError")}
            onCancel={() => closeModal("approvalFetchError")}
          />,
          "small",
        );
        return;
      }

      openModal(
        `approvalView-${item.id}`,
        <Modal
          title={result.data.title || "Blog Review"}
          showHeader={true}
          showCloseButton={true}
          size="large"
          onClose={() => closeModal(`approvalView-${item.id}`)}
        >
          <BlogsApprovalView
            blog={result.data}
            onClose={() => closeModal(`approvalView-${item.id}`)}
            onSuccess={() => {
              closeModal(`approvalView-${item.id}`);
              refreshWithPageValidation(true);
            }}
          />
        </Modal>,
      );
    } catch (error) {
      openModal(
        "approvalFetchError",
        <AlertModal
          type="error"
          title="Error"
          message="An error occurred while loading blog details."
          onClose={() => closeModal("approvalFetchError")}
        />,
        "small",
      );
    }
  };

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

    if (statusFilter !== "all") {
      return (
        <>
          <FileText size={48} />
          <p>
            No blogs with <strong>{activeFilterLabel}</strong> status.
          </p>
          {statusFilter === REVIEW_STATUS.PENDING_REVIEW && (
            <p className="no-data-subtitle">
              All caught up! No blogs are waiting for review.
            </p>
          )}
        </>
      );
    }

    return (
      <>
        <FileText size={48} />
        <p>No blogs available.</p>
      </>
    );
  };

  return (
    <div className="page-blogs-approval">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <ClipboardCheck size={28} /> Blog Approval
          </h1>
          <p>Review and manage blog submissions</p>
          <div className="review-notice">
            <Eye size={14} />
            <span>
              Please <strong>view the blog content</strong> before approving,
              rejecting, or requesting revision.
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-back"
            onClick={() => navigate("/dashboard/content/blogs")}
          >
            <ArrowLeft size={18} /> Back to Blogs
          </button>
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
                  {FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={`filter-dropdown-item ${statusFilter === option.value ? "active" : ""}`}
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
                        <button
                          className="blog-action-btn view-btn"
                          title="View & Review"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewBlog(item);
                          }}
                          aria-label={`View and review blog ${item.title}`}
                        >
                          <Eye size={16} />
                        </button>
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
            className={`pagination-arrow ${currentPage === 1 ? "disabled" : ""}`}
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
                  className={`pagination-page ${currentPage === page ? "active" : ""}`}
                  onClick={() => goToPage(page)}
                  aria-label={`Go to page ${page}`}
                >
                  {page}
                </button>
              ),
            )}
          </div>

          <button
            className={`pagination-arrow ${currentPage === totalPages ? "disabled" : ""}`}
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

export default BlogsApproval;
