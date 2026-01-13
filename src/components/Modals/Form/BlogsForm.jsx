/**
 * @file BlogsForm.jsx
 * @description Komponen form modal untuk manajemen data blog dengan dukungan multi-bahasa.
 * Mendukung dua mode operasi:
 * - **Create**: Membuat blog baru dengan konten bilingual
 * - **Edit**: Mengedit blog yang sudah ada
 * 
 * Menyediakan fitur lengkap:
 * - Dukungan terjemahan bilingual (English wajib, Indonesian opsional)
 * - Upload gambar featured dengan preview
 * - Editor rich text (Tiptap) untuk konten blog
 * - Manajemen tag per bahasa
 * - Pengaturan SEO bilingual
 * - Status publish/draft dan featured
 * - Validasi input bilingual yang ketat
 */

import React, { useState, useEffect, useRef } from "react";
import { Globe, AlertCircle, X, Upload, Trash2 } from "lucide-react";
import { blogService } from "../../../services/blogService";
import { uploadService } from "../../../services/uploadService";
import { useAuth } from "../../../contexts/AuthContext";
import { useModalContext } from "../../../contexts/ModalContext";
import AlertModal from "../../Alerts/AlertModal";
import PulseDots from "../../Loaders/PulseDots";
import TiptapEditor from "../../TiptapEditor";
import "../../../sass/components/Modals/BlogsForm/BlogsForm.scss";

/**
 * Props untuk komponen BlogsForm.
 * @typedef {Object} BlogsFormProps
 * @property {Object|null} [item=null] - Data blog awal untuk mode edit
 * @property {function(): void} onClose - Callback saat form ditutup
 * @property {function(): void} onSuccess - Callback saat operasi berhasil
 */

/**
 * Komponen form modal untuk manajemen data blog bilingual.
 * Digunakan dalam konteks modal untuk operasi CRUD blog.
 *
 * @component
 * @param {BlogsFormProps} props - Props komponen
 */
const BlogsForm = ({ item = null, onClose, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();

  /** @type {React.RefObject<HTMLFormElement>} Ref ke form utama */
  const formRef = useRef(null);

  /** @type {React.RefObject<HTMLInputElement>} Ref ke input file gambar */
  const fileInputRef = useRef(null);

  /** @type {boolean} Status apakah ini mode edit */
  const isEditing = !!item;

  /**
   * Bahasa yang sedang aktif untuk pengisian form.
   * @type {['EN'|'ID', React.Dispatch<React.SetStateAction<'EN'|'ID'>>]}
   */
  const [currentLanguage, setCurrentLanguage] = useState("EN");

  /**
   * Data terjemahan untuk kedua bahasa.
   * @type {{
   *   EN: { title: string, excerpt: string, content: string, metaTitle: string, metaDescription: string, metaKeywords: string, tags: string[] },
   *   ID: { title: string, excerpt: string, content: string, metaTitle: string, metaDescription: string, metaKeywords: string, tags: string[] }
   * }}
   */
  const [translations, setTranslations] = useState({
    EN: {
      title: "",
      excerpt: "",
      content: "",
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      tags: [],
    },
    ID: {
      title: "",
      excerpt: "",
      content: "",
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      tags: [],
    },
  });

  /**
   * Data master blog (non-terjemahan).
   * @type {{
   *   embedUrl: string,
   *   isPublished: boolean,
   *   isFeatured: boolean
   * }}
   */
  const [masterData, setMasterData] = useState({
    embedUrl: "",
    isPublished: false,
    isFeatured: false,
  });

  
  /**
   * State gambar featured blog.
   * Struktur: { id: string, file: File|null, preview: string, isExisting: boolean }
   * @type {{ id: string, file: File|null, preview: string, isExisting: boolean }|null}
   */
  const [image, setImage] = useState(null);

  /**
   * Pesan error validasi untuk upload gambar.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [imageError, setImageError] = useState("");

  /**
   * Input teks sementara untuk penambahan tag.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [tagInput, setTagInput] = useState("");

  /**
   * Status loading saat proses submit berlangsung.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(false);

  /**
   * Pesan error umum untuk form.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [error, setError] = useState("");

  /**
   * Pesan error validasi per field.
   * @type {{[fieldName: string]: string}}
   */
  const [validationErrors, setValidationErrors] = useState({});

  // Load data on edit
  useEffect(() => {
    if (isEditing && item) {
      setMasterData({
        embedUrl: item.embedUrl || "",
        isPublished: item.isPublished ?? false,
        isFeatured: item.isFeatured ?? false,
      });

      // Load existing image
      if (item.image) {
        setImage({
          id: "existing-0",
          file: null,
          preview: item.imageUrl || item.image,
          isExisting: true,
        });
      }

      // Load English translations
      const enData = {
        title: item.titleEn || "",
        excerpt: item.excerptEn || "",
        content: item.contentEn || "",
        metaTitle: item.metaTitleEn || "",
        metaDescription: item.metaDescriptionEn || "",
        metaKeywords: item.metaKeywordsEn || "",
        tags: Array.isArray(item.tagsEn) ? item.tagsEn : [],
      };

      // Load Indonesian translations
      const idData = {
        title: item.titleId || "",
        excerpt: item.excerptId || "",
        content: item.contentId || "",
        metaTitle: item.metaTitleId || "",
        metaDescription: item.metaDescriptionId || "",
        metaKeywords: item.metaKeywordsId || "",
        tags: Array.isArray(item.tagsId) ? item.tagsId : [],
      };

      setTranslations({
        EN: enData,
        ID: idData,
      });

      // Clear errors
      setValidationErrors({});
      setError("");
      setImageError("");
    }
  }, [item, isEditing]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (image && image.preview && image.preview.startsWith("blob:")) {
        URL.revokeObjectURL(image.preview);
      }
    };
  }, [image]);

  /**
   * Memvalidasi form sebelum submit.
   * Menerapkan aturan bilingual yang ketat:
   * - English selalu wajib (title dan content)
   * - Indonesian opsional tapi harus lengkap jika disediakan
   * - Gambar wajib hanya saat create
   * 
   * @returns {boolean} `true` jika valid, `false` jika tidak
   */
  const validateForm = () => {
    const errors = {};

    // Image validation
    if (!isEditing && !image) {
      errors.image = "Blog image is required";
    }

    // English Translation - REQUIRED
    const en = translations.EN;
    if (!en.title?.trim()) {
      errors["EN.title"] = "English title is required";
    }
    if (!en.content?.trim()) {
      errors["EN.content"] = "English content is required";
    }

    // Indonesian Translation - OPTIONAL but must be COMPLETE
    const id = translations.ID;
    const hasIdTitle = id.title?.trim();
    const hasIdContent = id.content?.trim();

    if (hasIdTitle && !hasIdContent) {
      errors["ID.content"] =
        "Indonesian content is required when title is provided";
    }

    if (hasIdContent && !hasIdTitle) {
      errors["ID.title"] =
        "Indonesian title is required when content is provided";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handler perubahan bahasa aktif.
   * @param {'EN'|'ID'} lang - Bahasa yang dipilih
   */
  const handleLanguageChange = (lang) => {
    setCurrentLanguage(lang);
    setTagInput("");
    if (error) setError("");
  };

  /**
   * Handler perubahan field terjemahan.
   * @param {string} field - Nama field yang diubah
   * @param {string} value - Nilai baru
   */
  const handleTranslationChange = (field, value) => {
    setTranslations((prev) => ({
      ...prev,
      [currentLanguage]: {
        ...prev[currentLanguage],
        [field]: value,
      },
    }));

    setValidationErrors((prev) => {
      const key = `${currentLanguage}.${field}`;
      const { [key]: _, ...rest } = prev;
      return rest;
    });

    if (error) setError("");
  };

  /**
   * Handler perubahan field master data.
   * @param {string} field - Nama field yang diubah
   * @param {string|boolean} value - Nilai baru
   */
  const handleMasterChange = (field, value) => {
    setMasterData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  // Handle single image upload
  /**
   * Handler perubahan file gambar.
   * Melakukan validasi file sebelum memproses preview.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Event input file
   */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = uploadService.validateFile(file);
    if (!validation.isValid) {
      setImageError(validation.error);
      e.target.value = "";
      return;
    }

    setImageError("");
    setImage({
      id: `new-${Date.now()}`,
      file: file,
      preview: URL.createObjectURL(file),
      isExisting: false,
    });

    setValidationErrors((prev) => {
      const { image, ...rest } = prev;
      return rest;
    });

    if (error) setError("");
  };

  
  /**
   * Handler penghapusan gambar dari form.
   * Membersihkan state dan URL object.
   */
  const handleImageRemove = () => {
    if (image && image.preview.startsWith("blob:")) {
      URL.revokeObjectURL(image.preview);
    }
    setImage(null);
    setImageError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (error) setError("");
  };

 
  /**
   * Memicu klik pada input file untuk mengganti gambar.
   */
  const handleChangeImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * Handler penambahan tag dari input teks.
   */
  const handleAddTag = () => {
    if (
      tagInput.trim() &&
      !translations[currentLanguage].tags.includes(tagInput.trim())
    ) {
      setTranslations((prev) => ({
        ...prev,
        [currentLanguage]: {
          ...prev[currentLanguage],
          tags: [...prev[currentLanguage].tags, tagInput.trim()],
        },
      }));
      setTagInput("");
    }
  };

  /**
   * Handler penghapusan tag tertentu.
   * @param {string} tagToRemove - Tag yang akan dihapus
   */
  const handleRemoveTag = (tagToRemove) => {
    setTranslations((prev) => ({
      ...prev,
      [currentLanguage]: {
        ...prev[currentLanguage],
        tags: prev[currentLanguage].tags.filter((tag) => tag !== tagToRemove),
      },
    }));

    if (error) setError("");
  };

  /**
   * Handler submit form utama.
   * Mengelola logika bisnis untuk create/update blog dengan validasi bilingual.
   * @param {React.FormEvent<HTMLFormElement>} e - Event submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setImageError("");

    if (!currentUser || !currentUser.id) {
      openModal(
        "authError",
        <AlertModal
          type="error"
          title="Authentication Error"
          message="User session expired. Please log in again."
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("authError")}
          onCancel={() => closeModal("authError")}
        />,
        "small"
      );
      setLoading(false);
      return;
    }

    try {
      if (!validateForm()) {
        setError("Please complete all required fields.");
        setLoading(false);
        return;
      }

      const blogData = {
        embedUrl: masterData.embedUrl || undefined,
        isPublished: masterData.isPublished,
        isFeatured: masterData.isFeatured,
        translations: [],
      };

      // Handle image
      if (image) {
        if (image.file instanceof File) {
          // New file upload
          blogData.image = image.file;
        } else if (image.isExisting && item?.image) {
          // Keep existing image (send path string)
          blogData.image = item.image;
        }
      }

      // Build English Translation (REQUIRED)
      if (translations.EN.title?.trim() || translations.EN.content?.trim()) {
        blogData.translations.push({
          language: "EN",
          title: translations.EN.title || "",
          excerpt: translations.EN.excerpt || "",
          content: translations.EN.content || "",
          metaTitle: translations.EN.metaTitle || "",
          metaDescription: translations.EN.metaDescription || "",
          metaKeywords: translations.EN.metaKeywords || "",
          tags: Array.isArray(translations.EN.tags) ? translations.EN.tags : [],
        });
      }

      // Build Indonesian Translation (OPTIONAL, but COMPLETE)
      const hasCompleteIdTranslation =
        translations.ID.title?.trim() && translations.ID.content?.trim();

      if (hasCompleteIdTranslation) {
        blogData.translations.push({
          language: "ID",
          title: translations.ID.title.trim(),
          excerpt: translations.ID.excerpt || "",
          content: translations.ID.content.trim(),
          metaTitle: translations.ID.metaTitle || "",
          metaDescription: translations.ID.metaDescription || "",
          metaKeywords: translations.ID.metaKeywords || "",
          tags:
            Array.isArray(translations.ID.tags) &&
            translations.ID.tags.length > 0
              ? translations.ID.tags
              : [],
        });
      }

      let result;
      const modalId = isEditing ? `editBlog-${item.id}` : "addBlog";

      if (isEditing) {
        result = await blogService.update(item.id, blogData, currentUser.id);
      } else {
        result = await blogService.create(blogData, currentUser.id);
      }

      if (result.success) {
        if (modalId) {
          closeModal(modalId);
        }

        setTimeout(() => {
          openModal(
            "blogSaveSuccess",
            <AlertModal
              type="success"
              title={isEditing ? "Updated!" : "Created!"}
              message={`Blog has been successfully ${
                isEditing ? "updated" : "created"
              }.`}
              showActions={true}
              confirmText="OK"
              onConfirm={() => {
                closeModal("blogSaveSuccess");
                onSuccess();
              }}
              onCancel={() => closeModal("blogSaveSuccess")}
            />,
            "small"
          );
        }, 300);
      } else {
        openModal(
          "blogSaveError",
          <AlertModal
            type="error"
            title="Error"
            message={result.message || "Failed to save blog. Please try again."}
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("blogSaveError")}
            onCancel={() => closeModal("blogSaveError")}
          />,
          "small"
        );
      }
    } catch (err) {
      openModal(
        "blogSaveError",
        <AlertModal
          type="error"
          title="Error"
          message={
            err.message ||
            "An error occurred while saving blog. Please try again."
          }
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("blogSaveError")}
          onCancel={() => closeModal("blogSaveError")}
        />,
        "small"
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mendapatkan nilai field terjemahan untuk bahasa saat ini.
   * @param {string} field - Nama field
   * @returns {string} Nilai field
   */
  const getCurrentField = (field) => {
    return translations[currentLanguage][field];
  };

  /**
   * Mengatur nilai field terjemahan untuk bahasa saat ini.
   * @param {string} field - Nama field
   * @param {string} value - Nilai baru
   */
  const setCurrentField = (field, value) => {
    handleTranslationChange(field, value);
  };

  return (
    <div className="blogs-form">
      <form ref={formRef} onSubmit={handleSubmit}>
        {error && (
          <div className="form-error">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button
              type="button"
              className="error-close-btn"
              onClick={() => setError("")}
              aria-label="Close error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Language Switcher */}
        <div className="language-switcher">
          <Globe size={16} />
          <span className="lang-label">Language:</span>
          <button
            type="button"
            className={`lang-btn ${currentLanguage === "EN" ? "active" : ""}`}
            onClick={() => handleLanguageChange("EN")}
            aria-label="Switch to English"
          >
            EN {translations.EN.title && "✓"}
          </button>
          <button
            type="button"
            className={`lang-btn ${currentLanguage === "ID" ? "active" : ""}`}
            onClick={() => handleLanguageChange("ID")}
            aria-label="Switch to Indonesian"
          >
            ID {translations.ID.title && "✓"}
          </button>
          <small className="lang-hint">
            {currentLanguage === "EN"
              ? "English is required"
              : "Indonesian is optional"}
          </small>
        </div>

        {isEditing && (
          <div className="image-info-banner">
            <AlertCircle size={16} />
            <span>
              You can change the blog image. The existing image will be
              preserved unless you upload a new one.
            </span>
          </div>
        )}

        {/* Title */}
        <div
          className={`form-group ${
            validationErrors[`${currentLanguage}.title`] ? "has-error" : ""
          }`}
        >
          <label>
            Blog Title ({currentLanguage})
            {currentLanguage === "EN" && <span className="required">*</span>}
          </label>
          <input
            type="text"
            value={getCurrentField("title")}
            onChange={(e) => setCurrentField("title", e.target.value)}
            placeholder={
              currentLanguage === "EN"
                ? "Enter blog title in English (required)"
                : "Masukkan judul blog dalam Bahasa (opsional)"
            }
            aria-label={`Blog title in ${currentLanguage}`}
          />
          {validationErrors[`${currentLanguage}.title`] && (
            <span className="field-error">
              {validationErrors[`${currentLanguage}.title`]}
            </span>
          )}
        </div>

        {/* Excerpt */}
        <div className="form-group">
          <label>Excerpt ({currentLanguage})</label>
          <textarea
            value={getCurrentField("excerpt")}
            onChange={(e) => setCurrentField("excerpt", e.target.value)}
            placeholder={
              currentLanguage === "EN"
                ? "Short summary in English (optional)"
                : "Ringkasan singkat dalam Bahasa (opsional)"
            }
            rows={2}
            aria-label={`Blog excerpt in ${currentLanguage}`}
          />
        </div>

        {/* Content */}
        <div
          className={`form-group ${
            validationErrors[`${currentLanguage}.content`] ? "has-error" : ""
          }`}
        >
          <label>
            Content ({currentLanguage})
            {currentLanguage === "EN" && <span className="required">*</span>}
          </label>
          <TiptapEditor
            value={getCurrentField("content")}
            onChange={(value) => setCurrentField("content", value)}
            placeholder={
              currentLanguage === "EN"
                ? "Write your blog content in English (required)"
                : "Tulis konten blog dalam Bahasa (opsional)"
            }
            aria-label={`Blog content in ${currentLanguage}`}
          />
          {validationErrors[`${currentLanguage}.content`] && (
            <span className="field-error">
              {validationErrors[`${currentLanguage}.content`]}
            </span>
          )}
        </div>

        {/* Featured Image */}
        <div
          className={`form-group ${validationErrors.image ? "has-error" : ""}`}
        >
          <label>
            Featured Image {!isEditing && <span className="required">*</span>}
          </label>

          {image ? (
            <div className="image-preview-container">
              <div className="image-preview">
                <img src={image.preview} alt="Preview" aria-label="Image preview" />
                <div className="image-actions">
                  <button
                    type="button"
                    className="change-image-btn"
                    onClick={handleChangeImage}
                    title="Change image"
                    aria-label="Change image"
                  >
                    <Upload size={16} />
                  </button>
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={handleImageRemove}
                    title="Remove image"
                    aria-label="Remove image"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageChange}
                className="image-input"
                style={{ display: "none" }}
                aria-label="Upload featured image"
              />
            </div>
          ) : (
            <div className="image-upload-placeholder">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageChange}
                id="blog-image-upload"
                className="image-input"
                aria-label="Upload featured image"
              />
              <label htmlFor="blog-image-upload" className="image-upload-btn">
                <Upload size={20} />
                <span>Click to upload image</span>
              </label>
            </div>
          )}

          {imageError && <span className="field-error">{imageError}</span>}
          {validationErrors.image && !imageError && (
            <span className="field-error">{validationErrors.image}</span>
          )}

          <small className="field-hint">Only PNG or JPG. Max 2MB.</small>
        </div>

        {/* Embed URL */}
        <div className="form-group">
          <label>Embed URL (optional)</label>
          <input
            type="url"
            value={masterData.embedUrl}
            onChange={(e) => handleMasterChange("embedUrl", e.target.value)}
            placeholder="https://example.com/embed  "
            aria-label="Embed URL"
          />
        </div>

        {/* Tags */}
        <div className="form-group">
          <label>Tags ({currentLanguage})</label>
          <div className="tags-input">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder={
                currentLanguage === "EN"
                  ? "Add tag and press Enter"
                  : "Tambah tag dan tekan Enter"
              }
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleAddTag())
              }
              aria-label={`Add tags in ${currentLanguage}`}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="tag-add-btn"
              aria-label="Add tag"
            >
              +
            </button>
          </div>
          <div className="tags-list">
            {getCurrentField("tags").map((tag, index) => (
              <span key={index} className="tag-item">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="tag-remove"
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Status & Featured */}
        <div className="form-row">
          <div className="form-group half">
            <label>Status</label>
            <div className="status-toggle">
              <button
                type="button"
                className={masterData.isPublished ? "active" : ""}
                onClick={() => handleMasterChange("isPublished", true)}
                aria-label="Set status to published"
              >
                Published
              </button>
              <button
                type="button"
                className={!masterData.isPublished ? "active" : ""}
                onClick={() => handleMasterChange("isPublished", false)}
                aria-label="Set status to draft"
              >
                Draft
              </button>
            </div>
          </div>

          <div className="form-group half">
            <label>Featured</label>
            <div className="toggle-group">
              <button
                type="button"
                className={masterData.isFeatured ? "active" : ""}
                onClick={() => handleMasterChange("isFeatured", true)}
                aria-label="Mark as featured"
              >
                Yes
              </button>
              <button
                type="button"
                className={!masterData.isFeatured ? "active" : ""}
                onClick={() => handleMasterChange("isFeatured", false)}
                aria-label="Unmark as featured"
              >
                No
              </button>
            </div>
          </div>
        </div>

        {/* SEO Fields */}
        <div className="form-section">
          <h4 className="section-title">SEO Settings ({currentLanguage})</h4>

          <div className="form-group">
            <label>Meta Title</label>
            <input
              type="text"
              value={getCurrentField("metaTitle")}
              onChange={(e) => setCurrentField("metaTitle", e.target.value)}
              placeholder={
                currentLanguage === "EN"
                  ? "SEO title in English (optional)"
                  : "Judul SEO dalam Bahasa (opsional)"
              }
              aria-label={`Meta title in ${currentLanguage}`}
            />
          </div>

          <div className="form-group">
            <label>Meta Description</label>
            <textarea
              value={getCurrentField("metaDescription")}
              onChange={(e) =>
                setCurrentField("metaDescription", e.target.value)
              }
              placeholder={
                currentLanguage === "EN"
                  ? "SEO description in English (optional)"
                  : "Deskripsi SEO dalam Bahasa (opsional)"
              }
              rows={2}
              aria-label={`Meta description in ${currentLanguage}`}
            />
          </div>

          <div className="form-group">
            <label>Meta Keywords</label>
            <input
              type="text"
              value={getCurrentField("metaKeywords")}
              onChange={(e) => setCurrentField("metaKeywords", e.target.value)}
              placeholder={
                currentLanguage === "EN"
                  ? "Comma-separated keywords (optional)"
                  : "Kata kunci dipisah koma (opsional)"
              }
              aria-label={`Meta keywords in ${currentLanguage}`}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
            aria-label="Cancel form"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <PulseDots size="sm" color="#ffffff" count={6} />
              </span>
            ) : isEditing ? (
              "Update Blog"
            ) : (
              "Create Blog"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BlogsForm;