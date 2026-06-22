/**
 * @file ItemsApprovalView.jsx
 * @description Modal read-only untuk reviewer melihat konten produk/item dan melakukan aksi review.
 *
 * Fitur:
 * - Tampilan konten item lengkap secara read-only (bilingual EN/ID)
 * - Layout dua kolom: galeri gambar (kiri) + detail konten (kanan)
 * - Language switcher EN/ID
 * - Badge review status dan banner reviewNote
 * - Tombol aksi kondisional berdasarkan reviewStatus:
 *   - PENDING_REVIEW → Approve, Request Revision, Reject
 *   - Status lain    → read-only, tidak ada tombol aksi
 * - Modal inline untuk input reviewNote (Reject & Request Revision)
 *
 * Lokasi: components/Modals/view/ItemsApprovalView.jsx
 */

import React, { useState } from "react";
import {
  Globe,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  X,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
} from "lucide-react";
import { itemService } from "../../../services/itemService";
import { useModalContext } from "../../../contexts/ModalContext";
import AlertModal from "../../Alerts/AlertModal";
import PulseDots from "../../Loaders/PulseDots";
import "../../../sass/components/Modals/ItemsApprovalView/ItemsApprovalView.css";

/**
 * Mapping reviewStatus ke label dan className untuk badge.
 */
const REVIEW_STATUS_CONFIG = {
  DRAFT: { label: "Draft", className: "draft" },
  PENDING_REVIEW: { label: "Pending Review", className: "pending-review" },
  APPROVED: { label: "Approved", className: "approved" },
  REJECTED: { label: "Rejected", className: "rejected" },
  REVISION: { label: "Revision", className: "revision" },
};

/**
 * Komponen modal read-only untuk reviewer mereview item.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.item - Data item lengkap dari itemService.getById
 * @param {function(): void} props.onClose - Callback saat modal ditutup
 * @param {function(): void} props.onSuccess - Callback saat aksi review berhasil
 */
const ItemsApprovalView = ({ item, onClose, onSuccess }) => {
  const { openModal, closeModal } = useModalContext();

  /** Bahasa konten yang sedang ditampilkan */
  const [currentLanguage, setCurrentLanguage] = useState("EN");

  /** Indeks gambar aktif di galeri */
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  /** Loading state per aksi — terpisah agar tidak saling memblokir */
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [revisionLoading, setRevisionLoading] = useState(false);

  /** State untuk modal reviewNote inline */
  const [reviewNoteModal, setReviewNoteModal] = useState({
    open: false,
    type: null, // 'reject' | 'revision'
    note: "",
    error: "",
  });

  const reviewStatus = item.reviewStatus || "DRAFT";
  const isPendingReview = reviewStatus === "PENDING_REVIEW";
  const isAnyLoading = approveLoading || rejectLoading || revisionLoading;

  const images = Array.isArray(item.images) ? item.images : [];
  const hasMultipleImages = images.length > 1;

  // ==================== LANGUAGE HELPERS ====================

  /**
   * Mendapatkan konten berdasarkan bahasa aktif.
   * Fallback ke EN jika konten ID kosong.
   */
  const getTranslation = (fieldEn, fieldId) => {
    if (currentLanguage === "ID" && fieldId) return fieldId;
    return fieldEn || "";
  };

  const shortDescription = getTranslation(
    item.shortDescription,
    item.shortDescriptionId,
  );
  const longDescription = getTranslation(
    item.longDescription,
    item.longDescriptionId,
  );
  const features =
    currentLanguage === "ID" && item.featuresId?.length
      ? item.featuresId
      : item.features || [];
  const specifications =
    currentLanguage === "ID" &&
    item.specificationsId &&
    Object.keys(item.specificationsId).length
      ? item.specificationsId
      : item.specifications || {};

  const hasIdTranslation = !!(
    item.shortDescriptionId || item.longDescriptionId
  );

  // ==================== GALLERY NAVIGATION ====================

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // ==================== REVIEW ACTION HANDLERS ====================

  /**
   * Handler approve — langsung call tanpa konfirmasi.
   */
  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      const result = await itemService.approve(item.id);

      if (result.success) {
        onClose();
        setTimeout(() => {
          openModal(
            "approveSuccess",
            <AlertModal
              type="success"
              title="Approved!"
              message="Item has been approved and published successfully."
              showActions={true}
              confirmText="OK"
              onConfirm={() => {
                closeModal("approveSuccess");
                onSuccess();
              }}
              onCancel={() => closeModal("approveSuccess")}
            />,
            "small",
          );
        }, 300);
      } else {
        openModal(
          "approveError",
          <AlertModal
            type="error"
            title="Error"
            message={result.message || "Failed to approve item."}
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("approveError")}
            onCancel={() => closeModal("approveError")}
          />,
          "small",
        );
      }
    } catch (err) {
      openModal(
        "approveError",
        <AlertModal
          type="error"
          title="Error"
          message={err.message || "An error occurred while approving item."}
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("approveError")}
          onCancel={() => closeModal("approveError")}
        />,
        "small",
      );
    } finally {
      setApproveLoading(false);
    }
  };

  /**
   * Membuka modal reviewNote untuk Reject atau Request Revision.
   * @param {'reject'|'revision'} type
   */
  const handleOpenReviewNoteModal = (type) => {
    setReviewNoteModal({ open: true, type, note: "", error: "" });
  };

  /**
   * Menutup modal reviewNote dan reset state.
   */
  const handleCloseReviewNoteModal = () => {
    setReviewNoteModal({ open: false, type: null, note: "", error: "" });
  };

  /**
   * Handler submit reviewNote — call reject atau requestRevision.
   */
  const handleSubmitReviewNote = async () => {
    const { type, note } = reviewNoteModal;

    if (!note.trim()) {
      setReviewNoteModal((prev) => ({
        ...prev,
        error: "Review note is required.",
      }));
      return;
    }

    handleCloseReviewNoteModal();

    if (type === "reject") {
      setRejectLoading(true);
      try {
        const result = await itemService.reject(item.id, note.trim());

        if (result.success) {
          onClose();
          setTimeout(() => {
            openModal(
              "rejectSuccess",
              <AlertModal
                type="success"
                title="Rejected"
                message="Item has been rejected. The author will be notified."
                showActions={true}
                confirmText="OK"
                onConfirm={() => {
                  closeModal("rejectSuccess");
                  onSuccess();
                }}
                onCancel={() => closeModal("rejectSuccess")}
              />,
              "small",
            );
          }, 300);
        } else {
          openModal(
            "rejectError",
            <AlertModal
              type="error"
              title="Error"
              message={result.message || "Failed to reject item."}
              showActions={true}
              confirmText="OK"
              onConfirm={() => closeModal("rejectError")}
              onCancel={() => closeModal("rejectError")}
            />,
            "small",
          );
        }
      } catch (err) {
        openModal(
          "rejectError",
          <AlertModal
            type="error"
            title="Error"
            message={err.message || "An error occurred while rejecting item."}
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("rejectError")}
            onCancel={() => closeModal("rejectError")}
          />,
          "small",
        );
      } finally {
        setRejectLoading(false);
      }
    } else if (type === "revision") {
      setRevisionLoading(true);
      try {
        const result = await itemService.requestRevision(item.id, note.trim());

        if (result.success) {
          onClose();
          setTimeout(() => {
            openModal(
              "revisionSuccess",
              <AlertModal
                type="success"
                title="Revision Requested"
                message="Item has been returned to the author for revision."
                showActions={true}
                confirmText="OK"
                onConfirm={() => {
                  closeModal("revisionSuccess");
                  onSuccess();
                }}
                onCancel={() => closeModal("revisionSuccess")}
              />,
              "small",
            );
          }, 300);
        } else {
          openModal(
            "revisionError",
            <AlertModal
              type="error"
              title="Error"
              message={result.message || "Failed to request revision."}
              showActions={true}
              confirmText="OK"
              onConfirm={() => closeModal("revisionError")}
              onCancel={() => closeModal("revisionError")}
            />,
            "small",
          );
        }
      } catch (err) {
        openModal(
          "revisionError",
          <AlertModal
            type="error"
            title="Error"
            message={
              err.message || "An error occurred while requesting revision."
            }
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("revisionError")}
            onCancel={() => closeModal("revisionError")}
          />,
          "small",
        );
      } finally {
        setRevisionLoading(false);
      }
    }
  };

  // ==================== RENDER HELPERS ====================

  const renderStatusBadge = () => {
    const config =
      REVIEW_STATUS_CONFIG[reviewStatus] || REVIEW_STATUS_CONFIG.DRAFT;
    return (
      <span className={`review-status-badge ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const renderReviewNoteBanner = () => {
    if (
      !item.reviewNote ||
      (reviewStatus !== "REJECTED" && reviewStatus !== "REVISION")
    ) {
      return null;
    }

    const isRejected = reviewStatus === "REJECTED";
    return (
      <div
        className={`review-note-banner ${isRejected ? "rejected" : "revision"}`}
      >
        <AlertCircle size={16} />
        <div className="review-note-content">
          <span className="review-note-title">
            {isRejected ? "Rejection Reason:" : "Revision Notes:"}
          </span>
          <span className="review-note-text">{item.reviewNote}</span>
        </div>
      </div>
    );
  };

  // ==================== RENDER ====================

  return (
    <div className="items-approval-view">
      {/* ── Header Meta ── */}
      <div className="approval-view-header">
        <div className="header-meta">
          <div className="meta-row">
            <span className="meta-label">Status:</span>
            {renderStatusBadge()}
          </div>
          {item.createdAtFormatted && (
            <div className="meta-row">
              <Calendar size={14} />
              <span className="meta-label">Created:</span>
              <span className="meta-value">{item.createdAtFormatted}</span>
            </div>
          )}
          {item.updatedAtFormatted && (
            <div className="meta-row">
              <Clock size={14} />
              <span className="meta-label">Last Updated:</span>
              <span className="meta-value">{item.updatedAtFormatted}</span>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <div className="language-switcher">
          <Globe size={15} />
          <span className="lang-label">Language:</span>
          <button
            type="button"
            className={`lang-btn ${currentLanguage === "EN" ? "active" : ""}`}
            onClick={() => setCurrentLanguage("EN")}
            aria-label="Switch to English"
          >
            EN
          </button>
          <button
            type="button"
            className={`lang-btn ${currentLanguage === "ID" ? "active" : ""} ${
              !hasIdTranslation ? "unavailable" : ""
            }`}
            onClick={() => setCurrentLanguage("ID")}
            aria-label="Switch to Indonesian"
            title={!hasIdTranslation ? "Indonesian content not available" : ""}
          >
            ID {!hasIdTranslation && "—"}
          </button>
        </div>
      </div>

      {/* ── Review Note Banner ── */}
      {renderReviewNoteBanner()}

      {/* ── Main Content: two-column layout ── */}
      <div className="approval-view-body">
        {/* Left: Image Gallery */}
        <div className="view-left">
          <div className="image-gallery">
            {images.length > 0 ? (
              <>
                <div className="main-image">
                  <img
                    src={images[currentImageIndex]}
                    alt={`${item.name} - ${currentImageIndex + 1}`}
                    className="gallery-image"
                    loading="lazy"
                    aria-label={`Product image ${currentImageIndex + 1} of ${images.length}`}
                  />
                  {hasMultipleImages && (
                    <>
                      <button
                        className="gallery-nav prev"
                        onClick={prevImage}
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={22} />
                      </button>
                      <button
                        className="gallery-nav next"
                        onClick={nextImage}
                        aria-label="Next image"
                      >
                        <ChevronRight size={22} />
                      </button>
                      <div className="image-counter" aria-live="polite">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>

                {hasMultipleImages && (
                  <div className="thumbnail-strip">
                    {images.map((img, index) => (
                      <div
                        key={index}
                        className={`thumbnail ${
                          index === currentImageIndex ? "active" : ""
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Go to image ${index + 1}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setCurrentImageIndex(index);
                          }
                        }}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${index + 1}`}
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="no-image-placeholder">
                <Package size={56} aria-hidden="true" />
                <p>No Image Available</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Item Details */}
        <div className="view-right">
          {/* Item Name */}
          <div className="approval-view-section">
            <h2 className="item-name">{item.name}</h2>
          </div>

          {/* Short Description */}
          <div className="approval-view-section">
            <span className="section-label">Overview</span>
            {shortDescription ? (
              <p className="item-short-desc">{shortDescription}</p>
            ) : (
              <p className="empty-field">
                No overview available for{" "}
                {currentLanguage === "EN" ? "English" : "Indonesian"}
              </p>
            )}
          </div>

          {/* Long Description */}
          <div className="approval-view-section">
            <span className="section-label">Description</span>
            {longDescription ? (
              <div
                className="item-long-desc ql-editor"
                dangerouslySetInnerHTML={{ __html: longDescription }}
              />
            ) : (
              <p className="empty-field">
                No description available for{" "}
                {currentLanguage === "EN" ? "English" : "Indonesian"}
              </p>
            )}
          </div>

          {/* Features */}
          <div className="approval-view-section">
            <span className="section-label">Key Features</span>
            {features.length > 0 ? (
              <ul className="features-list">
                {features.map((feature, index) => (
                  <li key={index}>
                    <CheckCircle size={14} aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-field">
                No features available for{" "}
                {currentLanguage === "EN" ? "English" : "Indonesian"}
              </p>
            )}
          </div>

          {/* Specifications */}
          <div className="approval-view-section">
            <span className="section-label">Specifications</span>
            {Object.keys(specifications).length > 0 ? (
              <div className="specifications-grid">
                {Object.entries(specifications).map(([key, value]) => (
                  <div key={key} className="spec-row">
                    <span className="spec-key">{key}</span>
                    <span className="spec-val">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-field">
                No specifications available for{" "}
                {currentLanguage === "EN" ? "English" : "Indonesian"}
              </p>
            )}
          </div>

          {/* SEO */}
          {(item.metaTitle || item.metaDescription || item.metaKeywords) && (
            <div className="approval-view-section seo-section">
              <span className="section-label">
                <FileText size={14} /> SEO
              </span>
              <div className="seo-fields">
                {item.metaTitle && (
                  <div className="seo-field">
                    <span className="seo-field-label">Meta Title:</span>
                    <span className="seo-field-value">{item.metaTitle}</span>
                  </div>
                )}
                {item.metaDescription && (
                  <div className="seo-field">
                    <span className="seo-field-label">Meta Description:</span>
                    <span className="seo-field-value">
                      {item.metaDescription}
                    </span>
                  </div>
                )}
                {item.metaKeywords && (
                  <div className="seo-field">
                    <span className="seo-field-label">Meta Keywords:</span>
                    <span className="seo-field-value">{item.metaKeywords}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Review Actions ── */}
      {isPendingReview && (
        <div className="approval-actions">
          <button
            type="button"
            className="btn-approve"
            onClick={handleApprove}
            disabled={isAnyLoading}
            aria-label="Approve item"
          >
            {approveLoading ? (
              <PulseDots size="sm" color="#ffffff" count={6} />
            ) : (
              <>
                <CheckCircle size={16} /> Approve
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-revision"
            onClick={() => handleOpenReviewNoteModal("revision")}
            disabled={isAnyLoading}
            aria-label="Request revision"
          >
            {revisionLoading ? (
              <PulseDots size="sm" color="#ffffff" count={6} />
            ) : (
              <>
                <RotateCcw size={16} /> Request Revision
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-reject"
            onClick={() => handleOpenReviewNoteModal("reject")}
            disabled={isAnyLoading}
            aria-label="Reject item"
          >
            {rejectLoading ? (
              <PulseDots size="sm" color="#ffffff" count={6} />
            ) : (
              <>
                <XCircle size={16} /> Reject
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Modal ReviewNote (inline) ── */}
      {reviewNoteModal.open && (
        <div
          className="review-note-overlay"
          onClick={handleCloseReviewNoteModal}
          aria-label="Close review note modal"
        >
          <div
            className="review-note-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-note-title"
          >
            <div className="review-note-modal-header">
              <h3 id="review-note-title">
                {reviewNoteModal.type === "reject"
                  ? "Reject Item"
                  : "Request Revision"}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseReviewNoteModal}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="review-note-modal-body">
              <p className="review-note-modal-desc">
                {reviewNoteModal.type === "reject"
                  ? "Please provide a reason for rejecting this item. The author will be notified."
                  : "Please describe what needs to be revised. The author will use this as guidance."}
              </p>

              <div
                className={`review-note-field ${
                  reviewNoteModal.error ? "has-error" : ""
                }`}
              >
                <label htmlFor="review-note-input">
                  {reviewNoteModal.type === "reject"
                    ? "Rejection Reason"
                    : "Revision Notes"}
                  <span className="required">*</span>
                </label>
                <textarea
                  id="review-note-input"
                  value={reviewNoteModal.note}
                  onChange={(e) =>
                    setReviewNoteModal((prev) => ({
                      ...prev,
                      note: e.target.value,
                      error: "",
                    }))
                  }
                  placeholder={
                    reviewNoteModal.type === "reject"
                      ? "Explain why this item is being rejected..."
                      : "Describe what needs to be revised or improved..."
                  }
                  rows={4}
                  aria-label="Review note"
                  autoFocus
                />
                {reviewNoteModal.error && (
                  <span className="field-error">
                    <AlertCircle size={13} />
                    {reviewNoteModal.error}
                  </span>
                )}
              </div>
            </div>

            <div className="review-note-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCloseReviewNoteModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn-confirm ${
                  reviewNoteModal.type === "reject" ? "reject" : "revision"
                }`}
                onClick={handleSubmitReviewNote}
              >
                {reviewNoteModal.type === "reject"
                  ? "Confirm Reject"
                  : "Confirm Revision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemsApprovalView;
