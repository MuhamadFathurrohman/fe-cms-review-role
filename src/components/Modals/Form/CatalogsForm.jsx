/**
 * @file CatalogsForm.jsx
 * @description Komponen form modal untuk manajemen data katalog produk.
 * Mendukung dua mode operasi:
 * - **Create**: Membuat katalog baru dengan link Google Drive
 * - **Edit**: Mengedit katalog yang sudah ada
 * 
 * Menyediakan fitur khusus:
 * - Validasi ketat terhadap Google Drive link
 * - Preview embed file langsung di form
 * - Penanganan error untuk akses file yang tidak publik
 * - Validasi input real-time
 * 
 * Persyaratan Google Drive:
 * - Hanya menerima domain `drive.google.com`
 * - Harus mengarah ke file spesifik (`/file/d/{fileId}`)
 * - File harus diatur sebagai "Anyone with the link can view"
 */

import React, { useState, useEffect } from "react";
import PulseDots from "../../Loaders/PulseDots";
import catalogService from "../../../services/catalogService";
import { useModalContext } from "../../../contexts/ModalContext";
import AlertModal from "../../Alerts/AlertModal";
import "../../../sass/components/Modals/CatalogsForm/CatalogsForm.css";

/**
 * Props untuk komponen CatalogsForm.
 * @typedef {Object} CatalogsFormProps
 * @property {Object|null} [initialData=null] - Data awal untuk mode edit
 * @property {function(): void} onSuccess - Callback saat operasi berhasil
 * @property {function(): void} onCancel - Callback saat form dibatalkan
 */

/**
 * Komponen form modal untuk manajemen data katalog.
 * Digunakan dalam konteks modal untuk operasi CRUD katalog.
 *
 * @component
 * @param {CatalogsFormProps} props - Props komponen
 */
const CatalogsForm = ({ initialData = null, onSuccess, onCancel }) => {
  const { openModal, closeModal } = useModalContext();

  /**
   * State form data katalog.
   * @type {{
   *   name: string,
   *   description: string,
   *   file: string
   * }}
   */
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    file: "", // Google Drive URL (string)
  });

  /**
   * URL embed untuk preview file Google Drive.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [embedUrl, setEmbedUrl] = useState("");

  /**
   * Status error saat memuat preview embed.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [previewError, setPreviewError] = useState(false);

  /**
   * Pesan error validasi per field.
   * @type {{[fieldName: string]: string}}
   */
  const [errors, setErrors] = useState({});

  /**
   * Status loading saat proses penyimpanan berlangsung.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract FILE_ID from Google Drive share URL
  /**
   * Mengekstrak ID file dari URL Google Drive sharing.
   * Mendukung format: `https://drive.google.com/file/d/{FILE_ID}/view`
   * 
   * @param {string} url - URL Google Drive sharing
   * @returns {string|null} ID file atau null jika tidak valid
   */
  const extractFileIdFromDriveUrl = (url) => {
    const regex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Convert share URL to embed URL
  /**
   * Mengonversi URL sharing Google Drive ke URL embed untuk preview.
   * 
   * @param {string} shareUrl - URL sharing Google Drive
   * @returns {string|null} URL embed atau null jika tidak valid
   */
  const convertToEmbedUrl = (shareUrl) => {
    const fileId = extractFileIdFromDriveUrl(shareUrl);
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
  };

  // Validate: only Google Drive file URLs
  /**
   * Memvalidasi apakah URL adalah Google Drive file yang valid.
   * Memeriksa domain, path, dan format ID file.
   * 
   * @param {string} url - URL yang akan divalidasi
   * @returns {boolean} `true` jika valid, `false` jika tidak
   */
  const isValidGoogleDriveUrl = (url) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== "drive.google.com") return false;
      if (!parsed.pathname.startsWith("/file/d/")) return false;
      return extractFileIdFromDriveUrl(url) !== null;
    } catch {
      return false;
    }
  };

  // Update embed URL and reset preview error when file input changes
  useEffect(() => {
    setPreviewError(false);
    if (formData.file && isValidGoogleDriveUrl(formData.file)) {
      const embed = convertToEmbedUrl(formData.file);
      setEmbedUrl(embed);
      if (errors.file) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.file;
          return newErrors;
        });
      }
    } else {
      setEmbedUrl("");
    }
  }, [formData.file, errors.file]);

  // Initialize form for edit mode
  useEffect(() => {
    if (initialData) {
      const initialFileUrl = initialData.file || "";
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        file: initialFileUrl,
      });
      if (initialFileUrl && isValidGoogleDriveUrl(initialFileUrl)) {
        setEmbedUrl(convertToEmbedUrl(initialFileUrl));
      }
    }
  }, [initialData]);

  /**
   * Handler perubahan input form.
   * Membersihkan error field yang sedang diubah.
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>} e - Event input
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * Validasi form sebelum submit.
   * Memeriksa nama katalog dan URL Google Drive.
   * @returns {boolean} `true` jika valid, `false` jika tidak
   */
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Catalog name is required.";
    } else if (formData.name.length > 200) {
      newErrors.name = "Catalog name must not exceed 200 characters.";
    }

    if (!formData.file.trim()) {
      newErrors.file = "Google Drive link is required.";
    } else if (!isValidGoogleDriveUrl(formData.file)) {
      newErrors.file = "Please enter a valid Google Drive file sharing URL.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handler submit form utama.
   * Mengelola logika bisnis untuk create/update katalog.
   * @param {React.FormEvent<HTMLFormElement>} e - Event submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        file: formData.file.trim(),
      };

      let result;
      if (initialData) {
        result = await catalogService.update(initialData.id, payload);
      } else {
        result = await catalogService.create(payload);
      }


      if (result && (result.success === true || result.data)) {
        onCancel?.();
        openModal(
          "catalogSaveSuccess",
          <AlertModal
            type="success"
            title={initialData ? "Updated!" : "Created!"}
            message={`Catalog "${formData.name}" has been successfully ${
              initialData ? "updated" : "created"
            }.`}
            onClose={() => {
              closeModal("catalogSaveSuccess");
              onSuccess?.();
            }}
          />,
          "small"
        );
      } else {
        throw new Error(result?.message || "Failed to save catalog.");
      }
    } catch (err) {
      openModal(
        "catalogSaveError",
        <AlertModal
          type="error"
          title="Failed to Save"
          message={
            err.message || "An unknown error occurred. Please try again."
          }
          onClose={() => closeModal("catalogSaveError")}
        />,
        "small"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="catalog-form">
      {/* Name */}
      <div className="form-group">
        <label htmlFor="catalog-name">Catalog Name *</label>
        <input
          id="catalog-name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={errors.name ? "input-error" : ""}
          maxLength={200}
          aria-label="Catalog name"
          aria-required="true"
        />
        {errors.name && (
          <div className="error-message">
            <span>{errors.name}</span>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="catalog-description">Description</label>
        <textarea
          id="catalog-description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          aria-label="Catalog description"
        />
      </div>

      {/* Google Drive Link */}
      <div className="form-group">
        <label htmlFor="catalog-file">Google Drive Link *</label>
        <input
          id="catalog-file"
          type="text"
          name="file"
          placeholder="https://drive.google.com/file/d/FILE_ID/view"
          value={formData.file}
          onChange={handleInputChange}
          className={errors.file ? "input-error" : ""}
          aria-label="Google Drive file link"
          aria-required="true"
        />
        {errors.file && (
          <div className="error-message">
            <span>{errors.file}</span>
          </div>
        )}
        <small className="form-hint">
          Ensure the file is set to{" "}
          <strong>"Anyone with the link can view"</strong>.
        </small>

        {/* Preview */}
        {embedUrl && (
          <div className="embed-preview">
            <p className="preview-label">Preview:</p>
            <div className="preview-frame">
              <embed
                src={embedUrl}
                width="100%"
                height="300"
                title="Catalog Preview"
                onLoad={() => setPreviewError(false)}
                onError={() => setPreviewError(true)}
                aria-label="Catalog file preview"
              />
            </div>
            {previewError && (
              <div className="error-message preview-error">
                <span>
                  ❌ Preview failed. Ensure the Google Drive file is set to{" "}
                  <strong>"Anyone with the link can view"</strong>.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={isSubmitting}
          aria-label="Cancel form"
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <PulseDots size={6} spacing={4} />
          ) : initialData ? (
            "Update"
          ) : (
            "Create"
          )}
        </button>
      </div>
    </form>
  );
};

export default CatalogsForm;