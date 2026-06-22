/**
 * @file ItemsApproval.jsx
 * @description Komponen halaman approval produk/item khusus untuk reviewer.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  ArrowLeft,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { itemService } from "../../services/itemService";
import { useModalContext } from "../../contexts/ModalContext";
import Modal from "../../components/Modals/Modal";
import AlertModal from "../../components/Alerts/AlertModal";
import ItemsApprovalView from "../../components/Modals/view/ItemsApprovalView";
import { useAutoRefetch } from "../../hooks/useAutoRefetch";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { generatePageNumbers } from "../../utils/pagination";
import SkeletonItem from "../../components/Loaders/SkeletonItem";
import { canReview, isSuperAdmin } from "../../utils/permissions";
import "../../sass/views/ItemsApproval/ItemsApproval.css";

const REVIEW_STATUS_CONFIG = {
  DRAFT: { label: "Draft", className: "draft" },
  PENDING_REVIEW: { label: "Pending Review", className: "pending-review" },
  APPROVED: { label: "Approved", className: "approved" },
  REJECTED: { label: "Rejected", className: "rejected" },
  REVISION: { label: "Revision", className: "revision" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "REVISION", label: "Revision" },
  { value: "DRAFT", label: "Draft" },
];

const ItemsApproval = () => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filterDropdownRef = useRef(null);
  const itemsPerPage = 10;

  const isSuper = isSuperAdmin(currentUser);
  const canReviewItems =
    isSuper || canReview(currentUser?.permissions, "product");

  const {
    searchTerm,
    setSearchTerm,
    data: itemList,
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
      return await itemService.getPaginated(
        page,
        limit,
        search,
        filters,
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

      const result = await itemService.getPaginated(
        1,
        itemsPerPage,
        searchTerm,
        filters,
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
      console.error("❌ ItemsApproval.jsx: Auto-refetch failed:", error);
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

  /**
   * Handler view item — fetch detail lalu buka ItemsApprovalView.
   * @param {Object} item - Data item dari list
   */
  const handleViewItem = async (item) => {
    try {
      const result = await itemService.getById(item.id);

      if (!result.success || !result.data) {
        openModal(
          "approvalFetchError",
          <AlertModal
            type="error"
            title="Error"
            message={result.message || "Failed to load item details."}
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
          title={result.data.name || "Item Review"}
          showHeader={true}
          showCloseButton={true}
          size="large"
          onClose={() => closeModal(`approvalView-${item.id}`)}
        >
          <ItemsApprovalView
            item={result.data}
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
          message="An error occurred while loading item details."
          onClose={() => closeModal("approvalFetchError")}
        />,
        "small",
      );
    }
  };

  const renderStatusBadge = (item) => {
    const config =
      REVIEW_STATUS_CONFIG[item.reviewStatus] || REVIEW_STATUS_CONFIG.DRAFT;
    return (
      <span className={`item-status ${config.className}`}>{config.label}</span>
    );
  };

  const renderNoDataMessage = () => {
    if (searchTerm.trim()) {
      return (
        <>
          <Package size={48} />
          <p>
            No items found matching "<strong>{searchTerm}</strong>"
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
          <Package size={48} />
          <p>
            No items with <strong>{activeFilterLabel}</strong> status.
          </p>
          {statusFilter === "PENDING_REVIEW" && (
            <p className="no-data-subtitle">
              All caught up! No items are waiting for review.
            </p>
          )}
        </>
      );
    }

    return (
      <>
        <Package size={48} />
        <p>No items available.</p>
      </>
    );
  };

  return (
    <div className="page-items-approval">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <ClipboardCheck size={28} /> Item Approval
          </h1>
          <p>Review and manage item submissions</p>
          <div className="review-notice">
            <Eye size={14} />
            <span>
              Please <strong>view the item content</strong> before approving,
              rejecting, or requesting revision.
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-back"
            onClick={() => navigate("/dashboard/products/items")}
          >
            <ArrowLeft size={18} /> Back to Items
          </button>
        </div>
      </div>

      <div className="items-filters">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" aria-label="Search icon" />
          <input
            type="text"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search items"
          />
          {loading && searchTerm && <div className="search-input-spinner" />}
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
                      className={`filter-dropdown-item ${
                        statusFilter === option.value ? "active" : ""
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

      <div className="items-scrollable">
        <div className="items-container">
          {loading ? (
            <div className="items-grid">
              {[...Array(itemsPerPage)].map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="item-card skeleton-loading"
                >
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
                    <h3 className="item-title">
                      <SkeletonItem
                        type="default"
                        style={{
                          width: "100%",
                          height: "20px",
                          borderRadius: "4px",
                        }}
                      />
                    </h3>
                    <div className="item-meta">
                      <span className="item-date">
                        <SkeletonItem
                          type="default"
                          style={{
                            width: "100px",
                            height: "14px",
                            borderRadius: "4px",
                          }}
                        />
                      </span>
                      <span>
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
          ) : Array.isArray(itemList) && itemList.length > 0 ? (
            <div className="items-grid">
              {itemList.map((item) => (
                <div key={item.id} className="item-card">
                  <div className="item-image-wrapper">
                    {item.primaryPhoto ? (
                      <img
                        src={item.primaryPhoto}
                        alt={item.name}
                        className="item-image"
                        loading="lazy"
                        aria-label={`Item image for ${item.name}`}
                      />
                    ) : (
                      <div className="item-placeholder">
                        <Package size={40} />
                        <span>No Image</span>
                      </div>
                    )}

                    <div className="item-overlay">
                      <div className="item-actions">
                        <button
                          className="item-action-btn view-btn"
                          title="View & Review"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewItem(item);
                          }}
                          aria-label={`View and review item ${item.name}`}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="item-info">
                    <h3 className="item-title">{item.name}</h3>
                    <div className="item-meta">
                      <span className="item-date">
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

export default ItemsApproval;
