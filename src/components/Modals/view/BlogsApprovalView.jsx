/**
 * @file BlogsApprovalView.jsx
 * @description Modal read-only untuk reviewer melihat konten blog dan melakukan aksi review.
 *
 * Fitur:
 * - Tampilan konten blog lengkap secara read-only (bilingual EN/ID)
 * - Language switcher EN/ID
 * - Tombol aksi kondisional berdasarkan reviewStatus:
 *   - PENDING_REVIEW → Approve, Reject, Request Revision
 *   - Status lain    → read-only, tidak ada tombol aksi
 * - Modal inline untuk input reviewNote (Reject & Request Revision)
 * - Tampilkan reviewNote jika status REJECTED atau REVISION
 *
 * Lokasi: components/Modals/view/BlogsApprovalView.jsx
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
  Eye,
  Tag,
} from "lucide-react";
import { blogService, REVIEW_STATUS } from "../../../services/blogService";
import { useModalContext } from "../../../contexts/ModalContext";
import AlertModal from "../../Alerts/AlertModal";
import PulseDots from "../../Loaders/PulseDots";
import "../../../sass/components/Modals/BlogsApprovalView/BlogsApprovalView.css";

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
 * Props untuk komponen BlogsApprovalView.
 * @typedef {Object} BlogsApprovalViewProps
 * @property {Object} blog - Data blog lengkap dari blogService.getById
 * @property {function(): void} onClose - Callback saat modal ditutup
 * @property {function(): void} onSuccess - Callback saat aksi review berhasil
 */

/**
 * Komponen modal read-only untuk reviewer.
 *
 * @component
 * @param {BlogsApprovalViewProps} props
 */
const BlogsApprovalView = ({ blog, onClose, onSuccess }) => {
  const { openModal, closeModal } = useModalContext();

  /** Bahasa konten yang sedang ditampilkan */
  const [currentLanguage, setCurrentLanguage] = useState("EN");

  /** Loading state per aksi */
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

  const reviewStatus = blog.reviewStatus || REVIEW_STATUS.DRAFT;
  const isPendingReview = reviewStatus === REVIEW_STATUS.PENDING_REVIEW;
  const isAnyLoading = approveLoading || rejectLoading || revisionLoading;

  /**
   * Mendapatkan konten berdasarkan bahasa yang aktif.
   * Fallback ke EN jika konten ID kosong.
   */
  const getContent = (fieldEn, fieldId) => {
    if (currentLanguage === "ID" && fieldId) return fieldId;
    return fieldEn || "";
  };

  const title = getContent(blog.titleEn, blog.titleId);
  const excerpt = getContent(blog.excerptEn, blog.excerptId);
  const content = getContent(blog.contentEn, blog.contentId);
  const tags =
    currentLanguage === "ID" && blog.tagsId?.length
      ? blog.tagsId
      : blog.tagsEn || [];

  /**
   * Handler approve — langsung call tanpa konfirmasi.
   */
  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      const result = await blogService.approve(blog.id);

      if (result.success) {
        onClose();
        setTimeout(() => {
          openModal(
            "approveSuccess",
            <AlertModal
              type="success"
              title="Approved!"
              message="Blog has been approved and published successfully."
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
            message={result.message || "Failed to approve blog."}
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
          message={err.message || "An error occurred while approving blog."}
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
        const result = await blogService.reject(blog.id, note.trim());

        if (result.success) {
          onClose();
          setTimeout(() => {
            openModal(
              "rejectSuccess",
              <AlertModal
                type="success"
                title="Rejected"
                message="Blog has been rejected. The author will be notified."
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
              message={result.message || "Failed to reject blog."}
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
            message={err.message || "An error occurred while rejecting blog."}
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
        const result = await blogService.requestRevision(blog.id, note.trim());

        if (result.success) {
          onClose();
          setTimeout(() => {
            openModal(
              "revisionSuccess",
              <AlertModal
                type="success"
                title="Revision Requested"
                message="Blog has been returned to the author for revision."
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

  /**
   * Merender badge reviewStatus.
   */
  const renderStatusBadge = () => {
    if (reviewStatus === REVIEW_STATUS.APPROVED && blog.isPublished === true) {
      return <span className="review-status-badge published">Published</span>;
    }

    const config =
      REVIEW_STATUS_CONFIG[reviewStatus] ||
      REVIEW_STATUS_CONFIG[REVIEW_STATUS.DRAFT];

    return (
      <span className={`review-status-badge ${config.className}`}>
        {config.label}
      </span>
    );
  };

  /**
   * Merender banner reviewNote jika status REJECTED atau REVISION.
   */
  const renderReviewNoteBanner = () => {
    if (
      !blog.reviewNote ||
      (reviewStatus !== REVIEW_STATUS.REJECTED &&
        reviewStatus !== REVIEW_STATUS.REVISION)
    ) {
      return null;
    }

    const isRejected = reviewStatus === REVIEW_STATUS.REJECTED;

    return (
      <div
        className={`review-note-banner ${isRejected ? "rejected" : "revision"}`}
      >
        <AlertCircle size={16} />
        <div className="review-note-content">
          <span className="review-note-title">
            {isRejected ? "Rejection Reason:" : "Revision Notes:"}
          </span>
          <span className="review-note-text">{blog.reviewNote}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="blogs-approval-view">
      {/* ── Header Meta ── */}
      <div className="approval-view-header">
        <div className="header-meta">
          <div className="meta-row">
            <span className="meta-label">Status:</span>
            {renderStatusBadge()}
          </div>

          {blog.submittedAt && (
            <div className="meta-row">
              <Calendar size={14} />
              <span className="meta-label">Submitted:</span>
              <span className="meta-value">{blog.submittedAt}</span>
            </div>
          )}

          {blog.reviewedAt && (
            <div className="meta-row">
              <Calendar size={14} />
              <span className="meta-label">Reviewed:</span>
              <span className="meta-value">{blog.reviewedAt}</span>
            </div>
          )}

          <div className="meta-row">
            <Eye size={14} />
            <span className="meta-label">Views:</span>
            <span className="meta-value">{blog.viewCount ?? 0}</span>
          </div>
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
              !blog.titleId ? "unavailable" : ""
            }`}
            onClick={() => setCurrentLanguage("ID")}
            aria-label="Switch to Indonesian"
            title={!blog.titleId ? "Indonesian content not available" : ""}
          >
            ID {!blog.titleId && "—"}
          </button>
        </div>
      </div>

      {/* ── Review Note Banner ── */}
      {renderReviewNoteBanner()}

      {/* ── Featured Image ── */}
      {blog.imageUrl && (
        <div className="approval-view-image">
          <img src={blog.imageUrl} alt={title} />
        </div>
      )}

      {/* ── Title ── */}
      <div className="approval-view-section">
        <h2 className="blog-title">
          {title || <span className="empty-field">No title</span>}
        </h2>
      </div>

      {/* ── Excerpt ── */}
      {excerpt && (
        <div className="approval-view-section">
          <span className="section-label">Excerpt</span>
          <p className="blog-excerpt">{excerpt}</p>
        </div>
      )}

      {/* ── Content ── */}
      <div className="approval-view-section">
        <span className="section-label">Content</span>
        {content ? (
          <div
            className="blog-content ql-editor"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="empty-field">No content available.</p>
        )}
      </div>

      {/* ── Tags ── */}
      {tags.length > 0 && (
        <div className="approval-view-section">
          <span className="section-label">
            <Tag size={14} /> Tags
          </span>
          <div className="tags-list">
            {tags.map((tag, index) => (
              <span key={index} className="tag-item">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── SEO ── */}
      {(blog.metaTitle || blog.metaDescription || blog.metaKeywords) && (
        <div className="approval-view-section seo-section">
          <span className="section-label">
            <FileText size={14} /> SEO
          </span>
          <div className="seo-fields">
            {blog.metaTitle && (
              <div className="seo-field">
                <span className="seo-field-label">Meta Title:</span>
                <span className="seo-field-value">{blog.metaTitle}</span>
              </div>
            )}
            {blog.metaDescription && (
              <div className="seo-field">
                <span className="seo-field-label">Meta Description:</span>
                <span className="seo-field-value">{blog.metaDescription}</span>
              </div>
            )}
            {blog.metaKeywords && (
              <div className="seo-field">
                <span className="seo-field-label">Meta Keywords:</span>
                <span className="seo-field-value">{blog.metaKeywords}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Review Actions ── */}
      {isPendingReview && (
        <div className="approval-actions">
          <button
            type="button"
            className="btn-approve"
            onClick={handleApprove}
            disabled={isAnyLoading}
            aria-label="Approve blog"
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
            aria-label="Reject blog"
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
                  ? "Reject Blog"
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
                  ? "Please provide a reason for rejecting this blog. The author will be notified."
                  : "Please describe what needs to be revised. The author will use this as guidance."}
              </p>

              <div
                className={`review-note-field ${reviewNoteModal.error ? "has-error" : ""}`}
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
                      ? "Explain why this blog is being rejected..."
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

export default BlogsApprovalView;
