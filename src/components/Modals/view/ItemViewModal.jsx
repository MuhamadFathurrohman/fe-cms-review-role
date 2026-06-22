/**
 * @file ItemViewModal.jsx
 * @description Komponen modal untuk menampilkan preview lengkap produk/item dalam format yang ramah pengguna.
 * Menyediakan tampilan readonly dari konten produk dengan:
 * - Dukungan multi-bahasa (English/Indonesian)
 * - Galeri gambar interaktif dengan navigasi dan thumbnail
 * - Tampilan metadata (status, tanggal, sort order)
 * - Konten terstruktur (overview, deskripsi, fitur, spesifikasi)
 * - Badge reviewStatus dan banner reviewNote (REVISION / REJECTED)
 * - Toggle isFeatured khusus reviewer (post-approval control)
 *   dengan optimistic update dan rollback jika endpoint gagal
 *
 * Dirancang untuk memberikan pengalaman melihat detail produk yang optimal
 * sebelum atau setelah publikasi.
 */

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Package,
  CheckCircle,
  XCircle,
  Globe,
  AlertCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import { itemService, REVIEW_STATUS } from "../../../services/itemService";
import { useAuth } from "../../../contexts/AuthContext";
import { useModalContext } from "../../../contexts/ModalContext";
import { canReview, isSuperAdmin } from "../../../utils/permissions";
import AlertModal from "../../Alerts/AlertModal";
import SkeletonItem from "../../Loaders/SkeletonItem";
import "../../../sass/components/Modals/ItemViewModal/ItemViewModal.css";

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
 * Props untuk komponen ItemViewModal.
 * @typedef {Object} ItemViewModalProps
 * @property {string|number} itemId - ID produk yang akan ditampilkan
 */

/**
 * Komponen modal preview produk.
 * Menampilkan konten produk dalam format yang siap baca dengan dukungan bilingual.
 *
 * @component
 * @param {ItemViewModalProps} props - Props komponen
 */
const ItemViewModal = ({ itemId }) => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();

  const isSuper = isSuperAdmin(currentUser);
  const canReviewItems =
    isSuper || canReview(currentUser?.permissions, "product");

  /**
   * Data produk yang sedang ditampilkan.
   */
  const [item, setItem] = useState(null);

  /**
   * Status loading saat mengambil data produk.
   */
  const [loading, setLoading] = useState(true);

  /**
   * Pesan error jika gagal mengambil data.
   */
  const [error, setError] = useState(null);

  /**
   * Indeks gambar yang sedang aktif di galeri.
   */
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  /**
   * Bahasa yang sedang aktif untuk ditampilkan.
   */
  const [currentLanguage, setCurrentLanguage] = useState("EN");

  /**
   * State toggle isFeatured — dikelola lokal untuk optimistic update.
   */
  const [isFeatured, setIsFeatured] = useState(false);

  /**
   * Loading state untuk toggle isFeatured.
   */
  const [loadingFeatured, setLoadingFeatured] = useState(false);

  // Fetch item data
  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await itemService.getById(itemId, currentLanguage);

        if (result.success) {
          setItem(result.data);
          setIsFeatured(result.data.isFeatured ?? false);
        } else {
          setError(result.message || "Failed to load item details.");
        }
      } catch (err) {
        console.error("Error fetching item:", err);
        setError("An error occurred while loading item details.");
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [itemId, currentLanguage]);

  /** @type {string[]} Daftar URL gambar produk */
  const images = item?.images || [];

  /** @type {boolean} Status apakah produk memiliki multiple gambar */
  const hasMultipleImages = images.length > 1;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleLanguageChange = (lang) => {
    setCurrentLanguage(lang);
  };

  /**
   * Membangun payload update dari data item existing.
   * Hanya mengubah field yang di-toggle, sisanya dikirim kembali apa adanya.
   *
   * Images di state lokal berisi full URL hasil _getFullImageUrl
   * (misalnya https://api.example.com/uploads/products/image.jpg).
   * Backend menyimpan dan membandingkan path relatif (/uploads/products/image.jpg).
   * Jika full URL dikirim langsung, backend menganggap gambar berubah dan
   * menghapus file lama, lalu menyimpan full URL yang tidak valid sebagai path baru.
   *
   * Solusi: strip VITE_PHOTO_URL dari setiap URL sebelum dikirim ke backend,
   * agar yang dikirim adalah path relatif yang konsisten dengan database.
   */
  const buildUpdatePayload = (overrides = {}) => {
    const apiBaseUrl = import.meta.env.VITE_PHOTO_URL || "";

    const imagePaths = images.map((url) => {
      if (apiBaseUrl && url.startsWith(apiBaseUrl)) {
        return url.slice(apiBaseUrl.length);
      }
      return url;
    });

    return {
      name: item.name,
      categoryId: item.categoryId,
      brandId: item.brandId,
      sortOrder: item.sortOrder ?? 0,
      isFeatured: isFeatured,
      images: imagePaths,
      translations: item.translations || [],
      ...overrides,
    };
  };

  /**
   * Handler toggle isFeatured dengan optimistic update dan rollback.
   * Hanya tersedia untuk reviewer dan status APPROVED.
   */
  const handleToggleFeatured = async () => {
    if (loadingFeatured) return;

    const newValue = !isFeatured;
    setIsFeatured(newValue); // optimistic update
    setLoadingFeatured(true);

    try {
      const payload = buildUpdatePayload({ isFeatured: newValue });
      const result = await itemService.update(item.id, payload);

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
    if (!item?.reviewStatus) return null;

    const config =
      REVIEW_STATUS_CONFIG[item.reviewStatus] ||
      REVIEW_STATUS_CONFIG[REVIEW_STATUS.DRAFT];

    const IconComponent = config.icon;

    return (
      <div className="item-view-review-status">
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
      !item?.reviewNote ||
      (item.reviewStatus !== REVIEW_STATUS.REJECTED &&
        item.reviewStatus !== REVIEW_STATUS.REVISION)
    ) {
      return null;
    }

    const isRejected = item.reviewStatus === REVIEW_STATUS.REJECTED;

    return (
      <div
        className={`item-view-review-note ${isRejected ? "rejected" : "revision"}`}
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

  /**
   * Merender kontrol post-approval untuk reviewer.
   * Hanya tampil jika canReviewItems dan status APPROVED.
   */
  const renderReviewerControls = () => {
    if (!canReviewItems || item?.reviewStatus !== REVIEW_STATUS.APPROVED) {
      return null;
    }

    return (
      <div className="item-view-reviewer-controls">
        <h4 className="reviewer-controls-title">Post-Approval Controls</h4>
        <div className="reviewer-controls-row">
          {/* Toggle isFeatured */}
          <div className="reviewer-control-item">
            <div className="reviewer-control-info">
              <span className="reviewer-control-label">Featured</span>
              <span className="reviewer-control-desc">
                Tampilkan item ini sebagai produk unggulan
              </span>
            </div>
            <button
              className={`reviewer-toggle ${isFeatured ? "active" : ""} ${loadingFeatured ? "loading" : ""}`}
              onClick={handleToggleFeatured}
              disabled={loadingFeatured}
              aria-label={isFeatured ? "Unfeature item" : "Feature item"}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="item-view-content">
        <div className="view-left">
          <SkeletonItem
            style={{ width: "100%", height: "100%", borderRadius: "16px" }}
          />
        </div>
        <div className="view-right">
          <div className="product-header">
            <SkeletonItem
              style={{
                width: "70%",
                height: "32px",
                marginBottom: "16px",
                borderRadius: "8px",
              }}
            />
            <div style={{ display: "flex", gap: "12px" }}>
              <SkeletonItem
                style={{ width: "100px", height: "32px", borderRadius: "16px" }}
              />
              <SkeletonItem
                style={{ width: "140px", height: "32px", borderRadius: "16px" }}
              />
            </div>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <div>
              <SkeletonItem
                style={{
                  width: "30%",
                  height: "20px",
                  marginBottom: "12px",
                  borderRadius: "6px",
                }}
              />
              <SkeletonItem
                style={{ width: "100%", height: "60px", borderRadius: "8px" }}
              />
            </div>
            <div>
              <SkeletonItem
                style={{
                  width: "40%",
                  height: "20px",
                  marginBottom: "12px",
                  borderRadius: "6px",
                }}
              />
              <SkeletonItem
                style={{ width: "100%", height: "100px", borderRadius: "8px" }}
              />
            </div>
            <div>
              <SkeletonItem
                style={{
                  width: "35%",
                  height: "20px",
                  marginBottom: "12px",
                  borderRadius: "6px",
                }}
              />
              <SkeletonItem
                style={{ width: "100%", height: "80px", borderRadius: "8px" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="item-view-content">
        <div className="view-error">
          <XCircle size={64} aria-hidden="true" />
          <h3>Failed to Load Item</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Success State
  return (
    <div className="item-view-content">
      {/* Header meta — review status, review note, reviewer controls */}
      <div className="item-view-header-meta">
        {renderReviewStatusBadge()}
        {renderReviewNote()}
        {renderReviewerControls()}
      </div>

      {/* Left Side - Image Gallery */}
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
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      className="gallery-nav next"
                      onClick={nextImage}
                      aria-label="Next image"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                {hasMultipleImages && (
                  <div className="image-counter" aria-live="polite">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}
              </div>

              {hasMultipleImages && (
                <div className="thumbnail-strip">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className={`thumbnail ${index === currentImageIndex ? "active" : ""}`}
                      onClick={() => setCurrentImageIndex(index)}
                      aria-label={`Go to image ${index + 1}`}
                      role="button"
                      tabIndex={0}
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
              <Package size={64} aria-hidden="true" />
              <p>No Image Available</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Product Details */}
      <div className="view-right">
        {/* Language Switcher */}
        <div className="view-language-switcher">
          <Globe size={16} aria-hidden="true" />
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

        <div className="product-header">
          <h2 className="product-title">{item.name}</h2>
          <div className="product-meta">
            <span className="date-info">
              <Calendar size={14} aria-hidden="true" />
              {item.createdAtFormatted}
            </span>
            {item.updatedAtFormatted && (
              <span className="date-info">
                <Calendar size={14} aria-hidden="true" />
                Last updated: {item.updatedAtFormatted}
              </span>
            )}
          </div>
        </div>

        <div className="product-details">
          {/* Short Description */}
          <div className="detail-section">
            <h3 className="section-title">Overview</h3>
            {item.shortDescription ? (
              <p className="short-description">{item.shortDescription}</p>
            ) : (
              <p className="no-data-text">
                No overview available for{" "}
                {currentLanguage === "EN" ? "English" : "Indonesian"}
              </p>
            )}
          </div>

          {/* Long Description */}
          <div className="detail-section">
            <h3 className="section-title">Description</h3>
            {item.longDescription ? (
              <div
                className="long-description"
                dangerouslySetInnerHTML={{ __html: item.longDescription }}
              />
            ) : (
              <p className="no-data-text">
                No detailed description available for{" "}
                {currentLanguage === "EN" ? "English" : "Indonesian"}
              </p>
            )}
          </div>

          {/* Features */}
          <div className="detail-section">
            <h3 className="section-title">Key Features</h3>
            {item.features && item.features.length > 0 ? (
              <ul className="features-list">
                {item.features.map((feature, index) => (
                  <li key={index}>
                    <CheckCircle
                      size={16}
                      className="feature-icon"
                      aria-hidden="true"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-data-text">
                No features available for{" "}
                {currentLanguage === "EN" ? "English" : "Indonesian"}
              </p>
            )}
          </div>

          {/* Specifications */}
          <div className="detail-section">
            <h3 className="section-title">Specifications</h3>
            {item.specifications &&
            Object.keys(item.specifications).length > 0 ? (
              <div className="specifications-grid">
                {Object.entries(item.specifications).map(([key, value]) => (
                  <div key={key} className="spec-item">
                    <span className="spec-label">{key}:</span>
                    <span className="spec-value">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data-text">
                No specifications available for{" "}
                {currentLanguage === "EN" ? "English" : "Indonesian"}
              </p>
            )}
          </div>

          {/* Additional Info */}
          <div className="detail-section additional-info">
            <div className="info-row">
              <span className="info-label">Sort Order:</span>
              <span className="info-value">{item.sortOrder}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemViewModal;
