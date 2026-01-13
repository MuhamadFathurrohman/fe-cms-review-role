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
 * 
 * Dirancang untuk memberikan pengalaman membaca yang optimal
 * sebelum atau setelah publikasi blog.
 */

import React, { useState, useEffect } from "react";
import { Calendar, Tag, Star, Eye, Globe } from "lucide-react";
import "../../../sass/components/Modals/BlogViewModal/BlogViewModal.css";

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
  /**
   * Bahasa yang sedang aktif untuk ditampilkan.
   * @type {['EN'|'ID', React.Dispatch<React.SetStateAction<'EN'|'ID'>>]}
   */
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage);

  /**
   * Status apakah blog memiliki terjemahan dalam bahasa Indonesia.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [hasIndonesian, setHasIndonesian] = useState(false);

  /**
   * Data blog yang telah diproses untuk ditampilkan.
   * @type {Object|null}
   */
  const [displayBlog, setDisplayBlog] = useState(null);

  // Jika blog sudah diberikan, proses terjemahannya
  useEffect(() => {
    if (!blog) return;

    // Cek apakah ada terjemahan ID
    const hasId = Array.isArray(blog.translations)
      ? blog.translations.some((t) => t.language === "ID")
      : false;

    setHasIndonesian(hasId);

    // Gunakan terjemahan sesuai bahasa saat ini
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
   * @param {'EN'|'ID'} language - Bahasa yang dipilih
   */
  const handleLanguageChange = (language) => {
    if (language === currentLanguage) return;
    setCurrentLanguage(language);
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

  // Render loading (seharusnya tidak perlu karena blog sudah ada)
  if (!displayBlog) {
    return (
      <div className="blog-view-modal-content">
        <div className="blog-view-loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  /**
   * Merender konten utama blog.
   * Menggunakan dangerouslySetInnerHTML untuk konten HTML dari editor rich text.
   * @returns {JSX.Element} Konten blog atau pesan fallback
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

  return (
    <div className="blog-view-modal-content">
      {/* Language Switcher - Only show if Indonesian translation exists */}
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

          {displayBlog.isFeatured && (
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