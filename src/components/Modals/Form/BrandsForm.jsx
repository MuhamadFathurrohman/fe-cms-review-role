/**
 * @file BrandsForm.jsx
 * @description Komponen form modal untuk manajemen data brand dan client.
 * Mendukung dua mode operasi:
 * - **Create**: Membuat brand/client baru
 * - **Edit**: Mengedit brand/client yang sudah ada
 * 
 * Menyediakan fitur lengkap:
 * - Input nama brand/client (wajib)
 * - Upload logo dengan preview dan validasi
 * - Toggle tipe (Product/Client)
 * - Toggle status aktif/non-aktif
 * - Pengaturan urutan tampilan (sort order)
 * - Penanganan logo existing vs baru
 */

import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { brandService } from "../../../services/brandService";
import { uploadService } from "../../../services/uploadService";
import { useModalContext } from "../../../contexts/ModalContext";
import AlertModal from "../../Alerts/AlertModal";
import PulseDots from "../../Loaders/PulseDots";
import "../../../sass/components/Modals/BrandsForm/BrandsForm.scss";

/**
 * Props untuk komponen BrandsForm.
 * @typedef {Object} BrandsFormProps
 * @property {Object|null} [item=null] - Data brand/client awal untuk mode edit
 * @property {function(): void} onClose - Callback saat form ditutup
 * @property {function(): void} onSuccess - Callback saat operasi berhasil
 */

/**
 * Komponen form modal untuk manajemen data brand dan client.
 * Digunakan dalam konteks modal untuk operasi CRUD brand/client.
 *
 * @component
 * @param {BrandsFormProps} props - Props komponen
 */
const BrandsForm = ({ item = null, onClose, onSuccess }) => {
  const { openModal, closeModal } = useModalContext();

  /** @type {boolean} Status apakah ini mode edit */
  const isEditing = !!item;

  // useRef untuk cleanup blob URL
  /** @type {React.MutableRefObject<string|null>} Ref untuk URL preview logo */
  const logoPreviewUrlRef = useRef(null);

  // Original data dari backend
  /** @type {string|null} Path logo asli dari backend */
  const originalLogoPath = item?.logo || null;

  /** @type {string|null} URL logo asli dari backend */
  const originalLogoUrl = item?.logoUrl || null;

  /**
   * State form data brand/client.
   * @type {{
   *   name: string,
   *   logo: File|null,
   *   type: 'PRODUCT'|'CLIENT',
   *   isActive: boolean,
   *   sortOrder: number
   * }}
   */
  const [formData, setFormData] = useState({
    name: "",
    logo: null, // File object baru atau null
    type: "PRODUCT",
    isActive: true,
    sortOrder: 0,
  });

  /**
   * URL preview logo untuk ditampilkan di UI.
   * @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]}
   */
  const [logoPreview, setLogoPreview] = useState(null);

  /**
   * Status apakah logo telah dihapus (hanya berlaku di mode edit).
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);

  /**
   * Pesan error validasi untuk upload logo.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [logoError, setLogoError] = useState("");

  /**
   * Status loading saat proses submit berlangsung.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(false);

  // Inisialisasi form data berdasarkan mode
  useEffect(() => {
    if (isEditing && item) {
      setFormData({
        name: item.name || "",
        logo: null,
        type: item.type || "PRODUCT",
        isActive: item.isActive !== undefined ? item.isActive : true,
        sortOrder: item.sortOrder !== undefined ? item.sortOrder : 0,
      });

      // Set logo preview dari backend
      if (originalLogoUrl) {
        setLogoPreview(originalLogoUrl);
      } else {
        setLogoPreview(null);
      }
    } else {
      // Mode create
      setFormData({
        name: "",
        logo: null,
        type: "PRODUCT",
        isActive: true,
        sortOrder: 0,
      });
      setLogoPreview(null);
    }

    setIsLogoRemoved(false);
    setLogoError("");
  }, [item, isEditing, originalLogoUrl]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (
        logoPreviewUrlRef.current &&
        logoPreviewUrlRef.current.startsWith("blob:")
      ) {
        URL.revokeObjectURL(logoPreviewUrlRef.current);
      }
    };
  }, []);

  /**
   * Handler perubahan input form.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Event input
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handler perubahan file logo.
   * Melakukan validasi file sebelum memproses preview.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Event input file
   */
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setLogoError("");
      return;
    }

    // Validasi file
    const validation = uploadService.validateFile(file);
    if (!validation.isValid) {
      setLogoError(validation.error);
      setFormData((prev) => ({ ...prev, logo: null }));
      setLogoPreview(null);
      return;
    }

    // File valid
    setLogoError("");
    setIsLogoRemoved(false);
    setFormData((prev) => ({ ...prev, logo: file }));

    // Cleanup old blob URL
    if (
      logoPreviewUrlRef.current &&
      logoPreviewUrlRef.current.startsWith("blob:")
    ) {
      URL.revokeObjectURL(logoPreviewUrlRef.current);
    }

    // Create new preview
    const previewUrl = URL.createObjectURL(file);
    logoPreviewUrlRef.current = previewUrl;
    setLogoPreview(previewUrl);
  };

  /**
   * Handler penghapusan logo dari form.
   * Membersihkan state dan URL object.
   */
  const handleRemoveLogo = () => {
    setIsLogoRemoved(true);
    setFormData((prev) => ({ ...prev, logo: null }));
    setLogoPreview(null);
    setLogoError("");

    // Cleanup blob URL
    if (
      logoPreviewUrlRef.current &&
      logoPreviewUrlRef.current.startsWith("blob:")
    ) {
      URL.revokeObjectURL(logoPreviewUrlRef.current);
      logoPreviewUrlRef.current = null;
    }

    // Reset file input
    const fileInput = document.getElementById("brand-logo-upload");
    if (fileInput) fileInput.value = "";
  };

  /**
   * Handler perubahan tipe brand/client.
   * @param {'PRODUCT'|'CLIENT'} type - Tipe yang dipilih
   */
  const handleTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      type: type,
    }));
  };

  /**
   * Handler perubahan status aktif/non-aktif.
   * @param {boolean} status - Status baru
   */
  const handleStatusChange = (status) => {
    setFormData((prev) => ({
      ...prev,
      isActive: status,
    }));
  };

  /**
   * Handler submit form utama.
   * Mengelola logika bisnis untuk create/update brand/client dengan penanganan logo yang tepat.
   * @param {React.FormEvent<HTMLFormElement>} e - Event submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLogoError("");

    try {
      // Prepare payload dengan validasi tipe data
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        isActive: formData.isActive === true,
        sortOrder: Number(formData.sortOrder) || 0,
      };

      // Handle logo
      if (formData.logo instanceof File) {
        // New file upload
        payload.logo = formData.logo;
      } else if (isEditing && !isLogoRemoved && originalLogoPath) {
        // Keep existing logo (send path string)
        payload.logo = originalLogoPath;
      } else {
        // No logo or removed
        payload.logo = null;
      }

      
      let result;
      if (isEditing) {
        result = await brandService.update(item.id, payload);
      } else {
        result = await brandService.create(payload);
      }

      const label = formData.type === "CLIENT" ? "Client" : "Brand";

      if (result.success) {
        // Close form modal
        const formModalId = isEditing ? "edit-brand" : "add-brand";
        closeModal(formModalId);

        // Show success modal
        openModal(
          "brandSuccessAlert",
          <AlertModal
            type="success"
            title={isEditing ? "Updated!" : "Created!"}
            message={`${label} has been successfully ${
              isEditing ? "updated" : "created"
            }.`}
            showActions={true}
            confirmText="OK"
            onConfirm={() => {
              closeModal("brandSuccessAlert");
              if (onSuccess) onSuccess();
            }}
            onCancel={() => closeModal("brandSuccessAlert")}
          />,
          "small"
        );
      } else {
        // Show error modal
        openModal(
          "brandErrorAlert",
          <AlertModal
            type="error"
            title="Failed to Save"
            message={
              result.message ||
              `Failed to ${
                isEditing ? "update" : "create"
              } ${label.toLowerCase()}. Please try again.`
            }
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("brandErrorAlert")}
            onCancel={() => closeModal("brandErrorAlert")}
          />,
          "small"
        );
      }
    } catch (err) {
      console.error("Submit error:", err);

      // Show error modal
      openModal(
        "brandErrorAlert",
        <AlertModal
          type="error"
          title="Error"
          message={`An error occurred while saving ${label.toLowerCase()}. Please try again.`}
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("brandErrorAlert")}
          onCancel={() => closeModal("brandErrorAlert")}
        />,
        "small"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="brands-form">
      <form onSubmit={handleSubmit}>
        {/* Brand Name */}
        <div className="form-group">
          <label>
            Name <span className="required">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder="Enter brand or client name"
            className="form-input"
            aria-label="Brand or client name"
            aria-required="true"
          />
        </div>

        {/* Logo Upload */}
        <div className="form-group">
          <label>Logo</label>
          <div className="image-upload">
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleLogoChange}
              id="brand-logo-upload"
              className="image-input"
              aria-label="Upload brand or client logo"
            />
            <label htmlFor="brand-logo-upload" className="image-label">
              {logoPreview ? "Change Logo" : "Choose Logo"}
            </label>

            {/* Logo Preview */}
            {logoPreview && (
              <div className="image-preview">
                <img src={logoPreview} alt="Logo preview" aria-label="Logo preview" />
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={handleRemoveLogo}
                  aria-label="Remove logo"
                >
                  Remove Logo
                </button>
              </div>
            )}

            {/* Logo Error Tooltip */}
            {logoError && (
              <div className="upload-error-tooltip">
                <X size={14} />
                <span>{logoError}</span>
              </div>
            )}

            <small className="field-hint">Only PNG or JPG. Max 2MB.</small>
          </div>
        </div>

        {/* Type Toggle (Product / Client) */}
        <div className="form-group">
          <label>Type</label>
          <div className="type-toggle">
            <button
              type="button"
              className={formData.type === "PRODUCT" ? "active" : ""}
              onClick={() => handleTypeChange("PRODUCT")}
              aria-label="Set type to Product"
            >
              Product
            </button>
            <button
              type="button"
              className={formData.type === "CLIENT" ? "active" : ""}
              onClick={() => handleTypeChange("CLIENT")}
              aria-label="Set type to Client"
            >
              Client
            </button>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="form-group">
          <label>Status</label>
          <div className="status-toggle">
            <button
              type="button"
              className={formData.isActive === true ? "active" : ""}
              onClick={() => handleStatusChange(true)}
              aria-label="Set status to active"
            >
              Active
            </button>
            <button
              type="button"
              className={formData.isActive === false ? "active" : ""}
              onClick={() => handleStatusChange(false)}
              aria-label="Set status to inactive"
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Sort Order (Optional) */}
        <div className="form-group">
          <label>Sort Order</label>
          <input
            type="number"
            name="sortOrder"
            value={formData.sortOrder}
            onChange={handleInputChange}
            min="0"
            placeholder="0"
            className="form-input"
            aria-label="Sort order for display"
          />
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
              "Update"
            ) : (
              "Create"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BrandsForm;