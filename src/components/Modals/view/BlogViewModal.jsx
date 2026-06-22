/**
 * @file BlogViewModal.jsx
 * @description Komponen modal untuk menampilkan preview lengkap blog dalam format yang ramah pengguna.
 * Menyediakan tampilan readonly dari konten blog dengan:
 * - Dukungan multi-bahasa (English/Indonesian)
 * - Render konten HTML yang aman
 * - Tampilan metadata (tanggal, views, featured status)
 * - Preview gambar featured
 * - Embed content eksternal
 * - Tag dan excerpt
 * - Badge reviewStatus dan banner reviewNote (REVISION / REJECTED)
 * - Toggle isPublished dan isFeatured khusus reviewer (post-approval control)
 *   dengan optimistic update dan rollback jika endpoint gagal
 *
 * Dirancang untuk memberikan pengalaman membaca yang optimal
 * sebelum atau setelah publikasi blog.
 */

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Tag,
  Star,
  Eye,
  Globe,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import { blogService, REVIEW_STATUS } from "../../../services/blogService";
import { useAuth } from "../../../contexts/AuthContext";
import { canReview, isSuperAdmin } from "../../../utils/permissions";
import AlertModal from "../../Alerts/AlertModal";
import { useModalContext } from "../../../contexts/ModalContext";
import "../../../sass/components/Modals/BlogViewModal/BlogViewModal.css";

/**
 * Mapping reviewStatus ke label, className, dan icon untuk badge.
 */
const REVIEW_STATUS_CONFIG = {
  [REVIEW_STATUS.DRAFT]: {
    label: "Draft",
    className: "draft",
    icon: Clock,
  },
  [REVIEW_STATUS.PENDING_REVIEW]: {
    label: "Pending Review",
    className: "pending-review",
    icon: Clock,
  },
  [REVIEW_STATUS.APPROVED]: {
    label: "Approved",
    className: "approved",
    icon: CheckCircle,
  },
  [REVIEW_STATUS.REJECTED]: {
    label: "Rejected",
    className: "rejected",
    icon: XCircle,
  },
  [REVIEW_STATUS.REVISION]: {
    label: "Revision",
    className: "revision",
    icon: RotateCcw,
  },
};

/**
 * Props untuk komponen BlogViewModal.
 * @typedef {Object} BlogViewModalProps
 * @property {Object} blog - Data blog yang akan ditampilkan
 * @property {'EN'|'ID'} [initialLanguage='EN'] - Bahasa awal untuk ditampilkan
 */

/**
 * Komponen modal preview blog.
 * Menampilkan konten blog dalam format yang siap baca dengan dukungan bilingual.
 *
 * @component
 * @param {BlogViewModalProps} props - Props komponen
 */
const BlogViewModal = ({ blog, initialLanguage = "EN" }) => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();

  const isSuper = isSuperAdmin(currentUser);
  const canReviewBlogs = isSuper || canReview(currentUser?.permissions, "blog");

  /**
   * Bahasa yang sedang aktif untuk ditampilkan.
   */
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage);

  /**
   * Status apakah blog memiliki terjemahan dalam bahasa Indonesia.
   */
  const [hasIndonesian, setHasIndonesian] = useState(false);

  /**
   * Data blog yang telah diproses untuk ditampilkan.
   */
  const [displayBlog, setDisplayBlog] = useState(null);

  /**
   * State toggle isPublished — dikelola lokal untuk optimistic update.
   */
  const [isPublished, setIsPublished] = useState(false);

  /**
   * State toggle isFeatured — dikelola lokal untuk optimistic update.
   */
  const [isFeatured, setIsFeatured] = useState(false);

  /**
   * Loading state per toggle agar tidak saling memblokir.
   */
  const [loadingPublished, setLoadingPublished] = useState(false);
  const [loadingFeatured, setLoadingFeatured] = useState(false);

  // Proses data blog saat mount atau bahasa berubah
  useEffect(() => {
    if (!blog) return;

    const hasId = Array.isArray(blog.translations)
      ? blog.translations.some((t) => t.language === "ID")
      : false;

    setHasIndonesian(hasId);
    setIsPublished(blog.isPublished ?? false);
    setIsFeatured(blog.isFeatured ?? false);

    const trans = Array.isArray(blog.translations)
      ? blog.translations.find((t) => t.language === currentLanguage)
      : null;

    const processed = {
      ...blog,
      title: trans?.title || blog.title || "",
      excerpt: trans?.excerpt || blog.excerpt || "",
      content: trans?.content || blog.content || "",
      metaTitle: trans?.metaTitle || blog.metaTitle || "",
      metaDescription: trans?.metaDescription || blog.metaDescription || "",
      metaKeywords: trans?.metaKeywords || blog.metaKeywords || "",
      tags: Array.isArray(trans?.tags) ? trans.tags : blog.tags || [],
    };

    setDisplayBlog(processed);
  }, [blog, currentLanguage]);

  /**
   * Handler perubahan bahasa tampilan.
   */
  const handleLanguageChange = (language) => {
    if (language === currentLanguage) return;
    setCurrentLanguage(language);
  };

  /**
   * Membangun payload update dari data blog existing.
   * Hanya mengubah field yang di-toggle, sisanya dikirim kembali apa adanya.
   * Translations dikirim sebagai array langsung (bukan JSON string) karena
   * blogService.update menangani serialisasi jika diperlukan.
   */
  const buildUpdatePayload = (overrides = {}) => {
    return {
      image: blog.image,
      isFeatured: isFeatured,
      isPublished: isPublished,
      translations: blog.translations || [],
      ...overrides,
    };
  };

  /**
   * Handler toggle isPublished dengan optimistic update dan rollback.
   * Hanya tersedia untuk reviewer dan status APPROVED.
   */
  const handleTogglePublished = async () => {
    if (loadingPublished || loadingFeatured) return;

    const newValue = !isPublished;
    setIsPublished(newValue); // optimistic update
    setLoadingPublished(true);

    try {
      const payload = buildUpdatePayload({ isPublished: newValue });
      const result = await blogService.update(blog.id, payload);

      if (!result.success) {
        setIsPublished(!newValue); // rollback
        openModal(
          "toggleError",
          <AlertModal
            type="error"
            title="Error"
            message={result.message || "Failed to update publish status."}
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("toggleError")}
            onCancel={() => closeModal("toggleError")}
          />,
          "small",
        );
      }
    } catch (err) {
      setIsPublished(!newValue); // rollback
      openModal(
        "toggleError",
        <AlertModal
          type="error"
          title="Error"
          message="An error occurred while updating publish status."
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("toggleError")}
          onCancel={() => closeModal("toggleError")}
        />,
        "small",
      );
    } finally {
      setLoadingPublished(false);
    }
  };

  /**
   * Handler toggle isFeatured dengan optimistic update dan rollback.
   * Hanya tersedia untuk reviewer dan status APPROVED.
   */
  const handleToggleFeatured = async () => {
    if (loadingPublished || loadingFeatured) return;

    const newValue = !isFeatured;
    setIsFeatured(newValue); // optimistic update
    setLoadingFeatured(true);

    try {
      const payload = buildUpdatePayload({ isFeatured: newValue });
      const result = await blogService.update(blog.id, payload);

      if (!result.success) {
        setIsFeatured(!newValue); // rollback
        openModal(
          "toggleError",
          <AlertModal
            type="error"
            title="Error"
            message={result.message || "Failed to update featured status."}
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("toggleError")}
            onCancel={() => closeModal("toggleError")}
          />,
          "small",
        );
      }
    } catch (err) {
      setIsFeatured(!newValue); // rollback
      openModal(
        "toggleError",
        <AlertModal
          type="error"
          title="Error"
          message="An error occurred while updating featured status."
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("toggleError")}
          onCancel={() => closeModal("toggleError")}
        />,
        "small",
      );
    } finally {
      setLoadingFeatured(false);
    }
  };

  /**
   * Merender badge reviewStatus.
   */
  const renderReviewStatusBadge = () => {
    if (!blog?.reviewStatus) return null;

    const config =
      REVIEW_STATUS_CONFIG[blog.reviewStatus] ||
      REVIEW_STATUS_CONFIG[REVIEW_STATUS.DRAFT];

    const IconComponent = config.icon;

    return (
      <div className="blog-view-review-status">
        <span className="review-status-label">Review Status:</span>
        <span className={`review-status-badge ${config.className}`}>
          <IconComponent size={13} />
          {config.label}
        </span>
      </div>
    );
  };

  /**
   * Merender banner reviewNote jika status REJECTED atau REVISION.
   */
  const renderReviewNote = () => {
    if (
      !blog?.reviewNote ||
      (blog.reviewStatus !== REVIEW_STATUS.REJECTED &&
        blog.reviewStatus !== REVIEW_STATUS.REVISION)
    ) {
      return null;
    }

    const isRejected = blog.reviewStatus === REVIEW_STATUS.REJECTED;

    return (
      <div
        className={`blog-view-review-note ${isRejected ? "rejected" : "revision"}`}
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

  /**
   * Merender kontrol post-approval untuk reviewer.
   * Hanya tampil jika canReviewBlogs dan status APPROVED.
   */
  const renderReviewerControls = () => {
    if (!canReviewBlogs || blog?.reviewStatus !== REVIEW_STATUS.APPROVED) {
      return null;
    }

    return (
      <div className="blog-view-reviewer-controls">
        <h4 className="reviewer-controls-title">Post-Approval Controls</h4>
        <div className="reviewer-controls-row">
          {/* Toggle isPublished */}
          <div className="reviewer-control-item">
            <div className="reviewer-control-info">
              <span className="reviewer-control-label">Published</span>
              <span className="reviewer-control-desc">
                display this blog on the website
              </span>
            </div>
            <button
              className={`reviewer-toggle ${isPublished ? "active" : ""} ${loadingPublished ? "loading" : ""}`}
              onClick={handleTogglePublished}
              disabled={loadingPublished || loadingFeatured}
              aria-label={isPublished ? "Unpublish blog" : "Publish blog"}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          {/* Toggle isFeatured */}
          <div className="reviewer-control-item">
            <div className="reviewer-control-info">
              <span className="reviewer-control-label">Featured</span>
              <span className="reviewer-control-desc">
                display this blog as featured content
              </span>
            </div>
            <button
              className={`reviewer-toggle ${isFeatured ? "active" : ""} ${loadingFeatured ? "loading" : ""}`}
              onClick={handleToggleFeatured}
              disabled={loadingPublished || loadingFeatured}
              aria-label={isFeatured ? "Unfeature blog" : "Feature blog"}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Merender konten utama blog.
   */
  const renderContent = () => {
    if (!displayBlog.content) {
      return (
        <p style={{ color: "#64748b", fontStyle: "italic" }}>
          No content available
        </p>
      );
    }

    return (
      <div
        className="blog-view-content"
        dangerouslySetInnerHTML={{ __html: displayBlog.content }}
      />
    );
  };

  // Render error state
  if (!blog) {
    return (
      <div className="blog-view-modal-content">
        <div className="blog-view-empty">
          <p>Blog not found</p>
        </div>
      </div>
    );
  }

  // Render loading
  if (!displayBlog) {
    return (
      <div className="blog-view-modal-content">
        <div className="blog-view-loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-view-modal-content">
      {/* Review Status Badge */}
      {renderReviewStatusBadge()}

      {/* Review Note Banner — REJECTED atau REVISION */}
      {renderReviewNote()}

      {/* Post-Approval Controls — khusus reviewer, status APPROVED */}
      {renderReviewerControls()}

      {/* Language Switcher */}
      {hasIndonesian && (
        <div className="blog-language-switcher">
          <Globe size={16} aria-label="Language switcher" />
          <button
            className={`lang-btn ${currentLanguage === "EN" ? "active" : ""}`}
            onClick={() => handleLanguageChange("EN")}
            aria-label="Switch to English"
          >
            EN
          </button>
          <button
            className={`lang-btn ${currentLanguage === "ID" ? "active" : ""}`}
            onClick={() => handleLanguageChange("ID")}
            aria-label="Switch to Indonesian"
          >
            ID
          </button>
        </div>
      )}

      {/* Featured Image */}
      {displayBlog.image && (
        <div className="blog-view-image">
          <img
            src={displayBlog.imageUrl}
            alt={displayBlog.title || "Blog image"}
            loading="lazy"
            aria-label={`Featured image for ${displayBlog.title || "blog"}`}
          />
        </div>
      )}

      {/* Blog Content */}
      <div className="blog-view-content-container">
        {/* Meta Info */}
        <div className="blog-view-meta">
          <div className="meta-item">
            <Calendar size={16} aria-hidden="true" />
            <span>{displayBlog.createdAtFormatted || "N/A"}</span>
          </div>

          {displayBlog.viewCount !== undefined && displayBlog.viewCount > 0 && (
            <div className="meta-item">
              <Eye size={16} aria-hidden="true" />
              <span>{displayBlog.viewCount.toLocaleString()}</span>
            </div>
          )}

          {isFeatured && (
            <div className="meta-item featured">
              <Star size={14} fill="currentColor" aria-hidden="true" />
              <span>Featured</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="blog-view-title">{displayBlog.title || "Untitled"}</h1>

        {/* Excerpt */}
        {displayBlog.excerpt && (
          <p className="blog-view-excerpt">{displayBlog.excerpt}</p>
        )}

        {/* Main Content */}
        <div className="blog-view-main-content">{renderContent()}</div>

        {/* Tags */}
        {displayBlog.tags && displayBlog.tags.length > 0 && (
          <div className="blog-view-tags">
            <Tag size={16} aria-hidden="true" />
            <div className="tags-list">
              {displayBlog.tags.map((tag, index) => (
                <span key={index} className="tag-item">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Embed Content */}
        {displayBlog.embedUrl && (
          <div className="blog-view-embed">
            <div className="embed-container">
              <iframe
                src={displayBlog.embedUrl}
                title="Embedded Content"
                allowFullScreen
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                frameBorder="0"
                aria-label="Embedded content"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogViewModal;
