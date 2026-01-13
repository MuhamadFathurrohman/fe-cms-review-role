/**
 * @file ItemViewModal.jsx
 * @description Komponen modal untuk menampilkan preview lengkap produk/item dalam format yang ramah pengguna.
 * Menyediakan tampilan readonly dari konten produk dengan:
 * - Dukungan multi-bahasa (English/Indonesian)
 * - Galeri gambar interaktif dengan navigasi dan thumbnail
 * - Tampilan metadata (status, tanggal, sort order)
 * - Konten terstruktur (overview, deskripsi, fitur, spesifikasi)
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
} from "lucide-react";
import { itemService } from "../../../services/itemService";
import SkeletonItem from "../../Loaders/SkeletonItem";
import "../../../sass/components/Modals/ItemViewModal/ItemViewModal.css";

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
  /**
   * Data produk yang sedang ditampilkan.
   * @type {Object|null}
   */
  const [item, setItem] = useState(null);

  /**
   * Status loading saat mengambil data produk.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(true);

  /**
   * Pesan error jika gagal mengambil data.
   * @type {string|null}
   */
  const [error, setError] = useState(null);

  /**
   * Indeks gambar yang sedang aktif di galeri.
   * @type {[number, React.Dispatch<React.SetStateAction<number>>]}
   */
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  /**
   * Bahasa yang sedang aktif untuk ditampilkan.
   * @type {['EN'|'ID', React.Dispatch<React.SetStateAction<'EN'|'ID'>>]}
   */
  const [currentLanguage, setCurrentLanguage] = useState("EN");

  // Fetch item data
  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        setError(null);

        // Pass language parameter
        const result = await itemService.getById(itemId, currentLanguage);

        if (result.success) {
          setItem(result.data);
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

  /**
   * Navigasi ke gambar berikutnya di galeri.
   */
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  /**
   * Navigasi ke gambar sebelumnya di galeri.
   */
  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Handle language change
  /**
   * Handler perubahan bahasa tampilan.
   * @param {'EN'|'ID'} lang - Bahasa yang dipilih
   */
  const handleLanguageChange = (lang) => {
    setCurrentLanguage(lang);
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
                    <button className="gallery-nav prev" onClick={prevImage} aria-label="Previous image">
                      <ChevronLeft size={24} />
                    </button>
                    <button className="gallery-nav next" onClick={nextImage} aria-label="Next image">
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
                      className={`thumbnail ${
                        index === currentImageIndex ? "active" : ""
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                      aria-label={`Go to image ${index + 1}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setCurrentImageIndex(index);
                        }
                      }}
                    >
                      <img src={img} alt={`Thumbnail ${index + 1}`} loading="lazy" />
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
        {/* Language Switcher with Icon */}
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
            <span
              className={`status-badge ${
                item.isActive ? "active" : "inactive"
              }`}
              aria-label={`Status: ${item.isActive ? "Active" : "Inactive"}`}
            >
              {item.isActive ? (
                <>
                  <CheckCircle size={14} aria-hidden="true" /> Active
                </>
              ) : (
                <>
                  <XCircle size={14} aria-hidden="true" /> Inactive
                </>
              )}
            </span>
            <span className="date-info">
              <Calendar size={14} aria-hidden="true" />
              {item.createdAtFormatted}
            </span>
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
              <div className="long-description">
                {item.longDescription.split("\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="no-data-text">
                No detailed description available for{" "}
                {currentLanguage === "EN" ? "English" : "Indonesian"}
              </p>
            )}
          </div>

          {/* Features */}
          {item.features && item.features.length > 0 ? (
            <div className="detail-section">
              <h3 className="section-title">Key Features</h3>
              <ul className="features-list">
                {item.features.map((feature, index) => (
                  <li key={index}>
                    <CheckCircle size={16} className="feature-icon" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="detail-section">
              <h3 className="section-title">Key Features</h3>
              <p className="no-data-text">
                No features available for{" "}
                {currentLanguage === "EN" ? "English" : "Indonesian"}
              </p>
            </div>
          )}

          {/* Specifications */}
          {item.specifications &&
          Object.keys(item.specifications).length > 0 ? (
            <div className="detail-section">
              <h3 className="section-title">Specifications</h3>
              <div className="specifications-grid">
                {Object.entries(item.specifications).map(([key, value]) => (
                  <div key={key} className="spec-item">
                    <span className="spec-label">{key}:</span>
                    <span className="spec-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="detail-section">
              <h3 className="section-title">Specifications</h3>
              <p className="no-data-text">
                No specifications available for{" "}
                {currentLanguage === "EN" ? "English" : "Indonesian"}
              </p>
            </div>
          )}

          {/* Additional Info */}
          <div className="detail-section additional-info">
            <div className="info-row">
              <span className="info-label">Sort Order:</span>
              <span className="info-value">{item.sortOrder}</span>
            </div>
            {item.updatedAtFormatted && (
              <div className="info-row">
                <span className="info-label">Last Updated:</span>
                <span className="info-value">{item.updatedAtFormatted}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemViewModal;