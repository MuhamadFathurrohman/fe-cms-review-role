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
 * - Validasi input bilingual yang ketat
 *
 * Review & Approval:
 * - Badge reviewStatus read-only di mode edit
 * - Banner reviewNote jika status REJECTED atau REVISION
 * - Form di-disable jika status PENDING_REVIEW atau APPROVED
 * - Tombol Save (simpan sebagai DRAFT) dan Submit (create → submitReview) saat create
 * - Tombol Save dan Submit Review saat edit status DRAFT
 * - Tombol Save dan Submit Review saat edit status REVISION (update → submitReview)
 *
 * Catatan:
 * - isPublished dikontrol eksklusif oleh backend melalui alur review, tidak dikirim dari form
 * - isFeatured tidak ditampilkan di form (dipindahkan ke BlogViewModal sebagai post-approval control),
 *   namun tetap dikirim di payload agar tidak ter-reset saat author menyimpan draft
 */

import React, { useState, useEffect, useRef } from "react";
import { Globe, AlertCircle, X, Upload, Trash2, Send } from "lucide-react";
import { blogService, REVIEW_STATUS } from "../../../services/blogService";
import { uploadService } from "../../../services/uploadService";
import { useAuth } from "../../../contexts/AuthContext";
import { useModalContext } from "../../../contexts/ModalContext";
import AlertModal from "../../Alerts/AlertModal";
import PulseDots from "../../Loaders/PulseDots";
import TiptapEditor from "../../TiptapEditor";
import "../../../sass/components/Modals/BlogsForm/BlogsForm.scss";

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
   * Status review dari item yang sedang diedit.
   * Null jika mode create.
   */
  const reviewStatus = isEditing
    ? item.reviewStatus || REVIEW_STATUS.DRAFT
    : null;

  /**
   * Apakah form harus di-disable karena status tidak mengizinkan edit.
   * PENDING_REVIEW dan APPROVED tidak bisa diedit.
   */
  const isFormDisabled =
    isEditing &&
    (reviewStatus === REVIEW_STATUS.PENDING_REVIEW ||
      reviewStatus === REVIEW_STATUS.APPROVED);

  /**
   * Bahasa yang sedang aktif untuk pengisian form.
   * @type {['EN'|'ID', React.Dispatch<React.SetStateAction<'EN'|'ID'>>]}
   */
  const [currentLanguage, setCurrentLanguage] = useState("EN");

  /**
   * Data terjemahan untuk kedua bahasa.
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
   * isPublished tidak disimpan di sini — dikontrol eksklusif oleh backend.
   * isFeatured disimpan untuk dikirim kembali ke backend saat update,
   * mencegah nilai ter-reset tanpa sengaja saat author menyimpan draft.
   */
  const [masterData, setMasterData] = useState({
    embedUrl: "",
    isFeatured: false,
  });

  /**
   * State gambar featured blog.
   */
  const [image, setImage] = useState(null);

  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [imageError, setImageError] = useState("");

  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [tagInput, setTagInput] = useState("");

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [loadingSave, setLoadingSave] = useState(false);

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [error, setError] = useState("");

  /** @type {[Object, React.Dispatch<React.SetStateAction<Object>>]} */
  const [validationErrors, setValidationErrors] = useState({});

  // Load data on edit
  useEffect(() => {
    if (isEditing && item) {
      setMasterData({
        embedUrl: item.embedUrl || "",
        isFeatured: item.isFeatured ?? false,
      });

      if (item.image) {
        setImage({
          id: "existing-0",
          file: null,
          preview: item.imageUrl || item.image,
          isExisting: true,
        });
      }

      const enData = {
        title: item.titleEn || "",
        excerpt: item.excerptEn || "",
        content: item.contentEn || "",
        metaTitle: item.metaTitleEn || "",
        metaDescription: item.metaDescriptionEn || "",
        metaKeywords: item.metaKeywordsEn || "",
        tags: Array.isArray(item.tagsEn) ? item.tagsEn : [],
      };

      const idData = {
        title: item.titleId || "",
        excerpt: item.excerptId || "",
        content: item.contentId || "",
        metaTitle: item.metaTitleId || "",
        metaDescription: item.metaDescriptionId || "",
        metaKeywords: item.metaKeywordsId || "",
        tags: Array.isArray(item.tagsId) ? item.tagsId : [],
      };

      setTranslations({ EN: enData, ID: idData });
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
   * @returns {boolean} `true` jika valid, `false` jika tidak
   */
  const validateForm = () => {
    const errors = {};

    if (!isEditing && !image) {
      errors.image = "Blog image is required";
    }

    const en = translations.EN;
    if (!en.title?.trim()) {
      errors["EN.title"] = "English title is required";
    }
    if (!en.content?.trim()) {
      errors["EN.content"] = "English content is required";
    }

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
   */
  const handleLanguageChange = (lang) => {
    setCurrentLanguage(lang);
    setTagInput("");
    if (error) setError("");
  };

  /**
   * Handler perubahan field terjemahan.
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
   */
  const handleMasterChange = (field, value) => {
    setMasterData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  /**
   * Handler perubahan file gambar.
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
   * Membangun payload blog dari state saat ini.
   * isPublished tidak disertakan — dikontrol eksklusif oleh backend.
   * isFeatured tetap disertakan untuk mencegah nilai ter-reset saat update.
   */
  const buildBlogData = () => {
    const blogData = {
      embedUrl: masterData.embedUrl || undefined,
      isFeatured: masterData.isFeatured,
      translations: [],
    };

    if (image) {
      if (image.file instanceof File) {
        blogData.image = image.file;
      } else if (image.isExisting && item?.image) {
        blogData.image = item.image;
      }
    }

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
          Array.isArray(translations.ID.tags) && translations.ID.tags.length > 0
            ? translations.ID.tags
            : [],
      });
    }

    return blogData;
  };

  /**
   * Handler tombol Save.
   * Saat create: call blogService.create (status DRAFT).
   * Saat edit (DRAFT / REVISION): call blogService.update.
   */
  const handleSave = async (e) => {
    e.preventDefault();
    setLoadingSave(true);
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
        "small",
      );
      setLoadingSave(false);
      return;
    }

    try {
      if (!validateForm()) {
        setError("Please complete all required fields.");
        setLoadingSave(false);
        return;
      }

      const blogData = buildBlogData();
      const modalId = isEditing ? `editBlog-${item.id}` : "addBlog";

      let result;
      if (isEditing) {
        result = await blogService.update(item.id, blogData, currentUser.id);
      } else {
        result = await blogService.create(blogData, currentUser.id);
      }

      if (result.success) {
        if (modalId) closeModal(modalId);

        setTimeout(() => {
          openModal(
            "blogSaveSuccess",
            <AlertModal
              type="success"
              title={isEditing ? "Updated!" : "Saved!"}
              message={`Blog has been successfully ${isEditing ? "updated" : "saved as draft"}.`}
              showActions={true}
              confirmText="OK"
              onConfirm={() => {
                closeModal("blogSaveSuccess");
                onSuccess();
              }}
              onCancel={() => closeModal("blogSaveSuccess")}
            />,
            "small",
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
          "small",
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
        "small",
      );
    } finally {
      setLoadingSave(false);
    }
  };

  /**
   * Handler tombol Submit — create blog lalu langsung submitReview.
   * Hanya tersedia saat mode create.
   */
  const handleSubmitNew = async () => {
    setLoadingSubmit(true);
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
        "small",
      );
      setLoadingSubmit(false);
      return;
    }

    if (!validateForm()) {
      setError("Please complete all required fields.");
      setLoadingSubmit(false);
      return;
    }

    try {
      const blogData = buildBlogData();

      // Step 1: Create blog (status DRAFT)
      const createResult = await blogService.create(blogData, currentUser.id);

      if (!createResult.success) {
        openModal(
          "blogSaveError",
          <AlertModal
            type="error"
            title="Error"
            message={createResult.message || "Failed to create blog."}
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("blogSaveError")}
            onCancel={() => closeModal("blogSaveError")}
          />,
          "small",
        );
        return;
      }

      const newBlogId = createResult.data?.id;

      if (!newBlogId) {
        openModal(
          "blogSaveError",
          <AlertModal
            type="error"
            title="Error"
            message="Blog was created but could not be submitted. Please submit manually from the blog list."
            showActions={true}
            confirmText="OK"
            onConfirm={() => {
              closeModal("blogSaveError");
              closeModal("addBlog");
              onSuccess();
            }}
            onCancel={() => closeModal("blogSaveError")}
          />,
          "small",
        );
        return;
      }

      // Step 2: Submit review
      const submitResult = await blogService.submitReview(newBlogId);

      if (submitResult.success) {
        closeModal("addBlog");

        setTimeout(() => {
          openModal(
            "blogSubmitSuccess",
            <AlertModal
              type="success"
              title="Submitted!"
              message="Blog has been successfully submitted for review."
              showActions={true}
              confirmText="OK"
              onConfirm={() => {
                closeModal("blogSubmitSuccess");
                onSuccess();
              }}
              onCancel={() => closeModal("blogSubmitSuccess")}
            />,
            "small",
          );
        }, 300);
      } else {
        closeModal("addBlog");

        setTimeout(() => {
          openModal(
            "blogSubmitPartial",
            <AlertModal
              type="warning"
              title="Saved but Not Submitted"
              message="Blog was saved as draft but could not be submitted for review. Please submit manually from the blog list."
              showActions={true}
              confirmText="OK"
              onConfirm={() => {
                closeModal("blogSubmitPartial");
                onSuccess();
              }}
              onCancel={() => closeModal("blogSubmitPartial")}
            />,
            "small",
          );
        }, 300);
      }
    } catch (err) {
      openModal(
        "blogSaveError",
        <AlertModal
          type="error"
          title="Error"
          message={
            err.message ||
            "An error occurred while submitting blog. Please try again."
          }
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("blogSaveError")}
          onCancel={() => closeModal("blogSaveError")}
        />,
        "small",
      );
    } finally {
      setLoadingSubmit(false);
    }
  };

  /**
   * Handler tombol Submit Review — untuk blog status DRAFT di mode edit.
   * Langsung call submitReview tanpa update karena tidak ada perubahan
   * yang perlu disimpan, atau staff sudah Save sebelumnya.
   */
  const handleSubmitReview = () => {
    openModal(
      "submitReviewConfirm",
      <AlertModal
        type="confirm"
        title="Submit for Review?"
        message="Once submitted, this blog cannot be edited until the reviewer gives feedback. Are you sure you want to submit?"
        showActions={true}
        confirmText="Submit"
        cancelText="Cancel"
        onConfirm={async () => {
          closeModal("submitReviewConfirm");
          setLoadingSubmit(true);

          try {
            const result = await blogService.submitReview(item.id);

            if (result.success) {
              closeModal(`editBlog-${item.id}`);

              setTimeout(() => {
                openModal(
                  "blogSubmitSuccess",
                  <AlertModal
                    type="success"
                    title="Submitted!"
                    message="Blog has been successfully submitted for review."
                    showActions={true}
                    confirmText="OK"
                    onConfirm={() => {
                      closeModal("blogSubmitSuccess");
                      onSuccess();
                    }}
                    onCancel={() => closeModal("blogSubmitSuccess")}
                  />,
                  "small",
                );
              }, 300);
            } else {
              openModal(
                "blogSubmitError",
                <AlertModal
                  type="error"
                  title="Error"
                  message={
                    result.message || "Failed to submit blog for review."
                  }
                  showActions={true}
                  confirmText="OK"
                  onConfirm={() => closeModal("blogSubmitError")}
                  onCancel={() => closeModal("blogSubmitError")}
                />,
                "small",
              );
            }
          } catch (err) {
            openModal(
              "blogSubmitError",
              <AlertModal
                type="error"
                title="Error"
                message={
                  err.message ||
                  "An error occurred while submitting blog. Please try again."
                }
                showActions={true}
                confirmText="OK"
                onConfirm={() => closeModal("blogSubmitError")}
                onCancel={() => closeModal("blogSubmitError")}
              />,
              "small",
            );
          } finally {
            setLoadingSubmit(false);
          }
        }}
        onCancel={() => closeModal("submitReviewConfirm")}
      />,
      "small",
    );
  };

  /**
   * Handler tombol Submit Review — khusus untuk blog status REVISION.
   * Selalu call update dulu baru submitReview untuk memastikan semua
   * perubahan tersimpan sebelum diajukan kembali, termasuk foto baru
   * yang mungkin belum di-Save oleh staff.
   */
  const handleSubmitRevision = () => {
    openModal(
      "submitRevisionConfirm",
      <AlertModal
        type="confirm"
        title="Submit Revision for Review?"
        message="Your changes will be saved and submitted for review. Once submitted, this blog cannot be edited until the reviewer gives feedback. Are you sure?"
        showActions={true}
        confirmText="Submit"
        cancelText="Cancel"
        onConfirm={async () => {
          closeModal("submitRevisionConfirm");
          setLoadingSubmit(true);

          try {
            if (!validateForm()) {
              setError("Please complete all required fields.");
              return;
            }

            // Step 1: Simpan semua perubahan termasuk foto baru
            const blogData = buildBlogData();
            const updateResult = await blogService.update(
              item.id,
              blogData,
              currentUser.id,
            );

            if (!updateResult.success) {
              openModal(
                "blogSubmitError",
                <AlertModal
                  type="error"
                  title="Error"
                  message={
                    updateResult.message ||
                    "Failed to save changes. Please try again."
                  }
                  showActions={true}
                  confirmText="OK"
                  onConfirm={() => closeModal("blogSubmitError")}
                  onCancel={() => closeModal("blogSubmitError")}
                />,
                "small",
              );
              return;
            }

            // Step 2: Submit review
            const submitResult = await blogService.submitReview(item.id);

            if (submitResult.success) {
              closeModal(`editBlog-${item.id}`);

              setTimeout(() => {
                openModal(
                  "blogSubmitSuccess",
                  <AlertModal
                    type="success"
                    title="Submitted!"
                    message="Blog revision has been successfully submitted for review."
                    showActions={true}
                    confirmText="OK"
                    onConfirm={() => {
                      closeModal("blogSubmitSuccess");
                      onSuccess();
                    }}
                    onCancel={() => closeModal("blogSubmitSuccess")}
                  />,
                  "small",
                );
              }, 300);
            } else {
              // Update berhasil tapi submit gagal
              closeModal(`editBlog-${item.id}`);

              setTimeout(() => {
                openModal(
                  "blogSubmitPartial",
                  <AlertModal
                    type="warning"
                    title="Saved but Not Submitted"
                    message="Changes were saved but could not be submitted for review. Please submit manually from the blog list."
                    showActions={true}
                    confirmText="OK"
                    onConfirm={() => {
                      closeModal("blogSubmitPartial");
                      onSuccess();
                    }}
                    onCancel={() => closeModal("blogSubmitPartial")}
                  />,
                  "small",
                );
              }, 300);
            }
          } catch (err) {
            openModal(
              "blogSubmitError",
              <AlertModal
                type="error"
                title="Error"
                message={
                  err.message ||
                  "An error occurred while submitting revision. Please try again."
                }
                showActions={true}
                confirmText="OK"
                onConfirm={() => closeModal("blogSubmitError")}
                onCancel={() => closeModal("blogSubmitError")}
              />,
              "small",
            );
          } finally {
            setLoadingSubmit(false);
          }
        }}
        onCancel={() => closeModal("submitRevisionConfirm")}
      />,
      "small",
    );
  };

  /**
   * Mendapatkan nilai field terjemahan untuk bahasa saat ini.
   */
  const getCurrentField = (field) => {
    return translations[currentLanguage][field];
  };

  /**
   * Mengatur nilai field terjemahan untuk bahasa saat ini.
   */
  const setCurrentField = (field, value) => {
    handleTranslationChange(field, value);
  };

  /**
   * Merender badge reviewStatus untuk mode edit.
   */
  const renderReviewStatusBadge = () => {
    if (!isEditing || !reviewStatus) return null;

    const config =
      REVIEW_STATUS_CONFIG[reviewStatus] ||
      REVIEW_STATUS_CONFIG[REVIEW_STATUS.DRAFT];

    return (
      <div className="review-status-banner">
        <span className="review-status-label">Review Status:</span>
        <span className={`review-status-badge ${config.className}`}>
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
      !isEditing ||
      !item?.reviewNote ||
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
          <span className="review-note-text">{item.reviewNote}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`blogs-form ${isFormDisabled ? "form-disabled" : ""}`}>
      <form ref={formRef} onSubmit={handleSave}>
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

        {/* Review Status Badge — hanya di mode edit */}
        {renderReviewStatusBadge()}

        {/* Review Note Banner — hanya jika REJECTED atau REVISION */}
        {renderReviewNote()}

        {/* Disabled notice — hanya jika form tidak bisa diedit */}
        {isFormDisabled && (
          <div className="form-disabled-notice">
            <AlertCircle size={16} />
            <span>
              {reviewStatus === REVIEW_STATUS.PENDING_REVIEW
                ? "This blog is currently under review and cannot be edited."
                : "This blog has been approved and cannot be edited."}
            </span>
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
            disabled={isFormDisabled}
          >
            EN {translations.EN.title && "✓"}
          </button>
          <button
            type="button"
            className={`lang-btn ${currentLanguage === "ID" ? "active" : ""}`}
            onClick={() => handleLanguageChange("ID")}
            aria-label="Switch to Indonesian"
            disabled={isFormDisabled}
          >
            ID {translations.ID.title && "✓"}
          </button>
          <small className="lang-hint">
            {currentLanguage === "EN"
              ? "English is required"
              : "Indonesian is optional"}
          </small>
        </div>

        {isEditing && !isFormDisabled && (
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
            disabled={isFormDisabled}
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
            disabled={isFormDisabled}
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
            editable={!isFormDisabled}
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
                <img
                  src={image.preview}
                  alt="Preview"
                  aria-label="Image preview"
                />
                {!isFormDisabled && (
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
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageChange}
                className="image-input"
                style={{ display: "none" }}
                aria-label="Upload featured image"
                disabled={isFormDisabled}
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
                disabled={isFormDisabled}
              />
              <label
                htmlFor="blog-image-upload"
                className={`image-upload-btn ${isFormDisabled ? "disabled" : ""}`}
              >
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
            placeholder="https://example.com/embed"
            aria-label="Embed URL"
            disabled={isFormDisabled}
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
              disabled={isFormDisabled}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="tag-add-btn"
              aria-label="Add tag"
              disabled={isFormDisabled}
            >
              +
            </button>
          </div>
          <div className="tags-list">
            {getCurrentField("tags").map((tag, index) => (
              <span key={index} className="tag-item">
                {tag}
                {!isFormDisabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="tag-remove"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
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
              disabled={isFormDisabled}
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
              disabled={isFormDisabled}
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
              disabled={isFormDisabled}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loadingSave || loadingSubmit}
            aria-label="Cancel form"
          >
            Cancel
          </button>

          {/* Mode: Create — Save (draft) dan Submit (create → submitReview) */}
          {!isEditing && (
            <>
              <button
                type="submit"
                className="btn-outline"
                disabled={loadingSave || loadingSubmit}
                aria-label="Save blog as draft"
              >
                {loadingSave ? (
                  <span className="btn-loading">
                    <PulseDots size="sm" color="currentColor" count={6} />
                  </span>
                ) : (
                  "Save"
                )}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmitNew}
                disabled={loadingSave || loadingSubmit}
                aria-label="Submit blog for review"
              >
                {loadingSubmit ? (
                  <span className="btn-loading">
                    <PulseDots size="sm" color="#ffffff" count={6} />
                  </span>
                ) : (
                  <>
                    <Send size={15} /> Submit
                  </>
                )}
              </button>
            </>
          )}

          {/* Mode: Edit status DRAFT — Save dan Submit Review (submitReview saja) */}
          {isEditing &&
            !isFormDisabled &&
            reviewStatus === REVIEW_STATUS.DRAFT && (
              <>
                <button
                  type="submit"
                  className="btn-outline"
                  disabled={loadingSave || loadingSubmit}
                  aria-label="Save blog changes"
                >
                  {loadingSave ? (
                    <span className="btn-loading">
                      <PulseDots size="sm" color="currentColor" count={6} />
                    </span>
                  ) : (
                    "Save"
                  )}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSubmitReview}
                  disabled={loadingSave || loadingSubmit}
                  aria-label="Submit blog for review"
                >
                  {loadingSubmit ? (
                    <span className="btn-loading">
                      <PulseDots size="sm" color="#ffffff" count={6} />
                    </span>
                  ) : (
                    <>
                      <Send size={15} /> Submit Review
                    </>
                  )}
                </button>
              </>
            )}

          {/* Mode: Edit status REVISION — Save dan Submit Review (update → submitReview) */}
          {isEditing &&
            !isFormDisabled &&
            reviewStatus === REVIEW_STATUS.REVISION && (
              <>
                <button
                  type="submit"
                  className="btn-outline"
                  disabled={loadingSave || loadingSubmit}
                  aria-label="Save blog changes"
                >
                  {loadingSave ? (
                    <span className="btn-loading">
                      <PulseDots size="sm" color="currentColor" count={6} />
                    </span>
                  ) : (
                    "Save"
                  )}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSubmitRevision}
                  disabled={loadingSave || loadingSubmit}
                  aria-label="Submit blog revision for review"
                >
                  {loadingSubmit ? (
                    <span className="btn-loading">
                      <PulseDots size="sm" color="#ffffff" count={6} />
                    </span>
                  ) : (
                    <>
                      <Send size={15} /> Submit Review
                    </>
                  )}
                </button>
              </>
            )}

          {/* Mode: Edit form di-disable (PENDING_REVIEW / APPROVED) — hanya Cancel */}
          {/* Cancel button sudah selalu ada di atas */}
        </div>
      </form>
    </div>
  );
};

export default BlogsForm;
