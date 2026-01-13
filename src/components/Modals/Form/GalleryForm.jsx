/**
 * @file GalleryForm.jsx
 * @description Komponen form modal untuk manajemen data galeri gambar.
 * Mendukung dua mode operasi:
 * - **Create**: Membuat entri galeri baru dengan gambar
 * - **Edit**: Mengganti gambar pada entri galeri yang sudah ada
 * 
 * Menyediakan fitur khusus:
 * - Preview gambar sebelum upload
 * - Validasi file gambar ketat
 * - Penanganan error yang informatif
 * - UX loading dan feedback
 * 
 * Setiap entri galeri hanya berisi satu gambar, sesuai dengan kebutuhan bisnis
 * untuk dokumentasi visual produk/katalog.
 */

import React, { useState, useRef, useEffect } from "react";
import { Pencil, X, Upload } from "lucide-react";
import { galleryService } from "../../../services/galleryService";
import { useAuth } from "../../../contexts/AuthContext";
import { uploadService } from "../../../services/uploadService";
import { useModalContext } from "../../../contexts/ModalContext";
import PulseDots from "../../Loaders/PulseDots";
import AlertModal from "../../Alerts/AlertModal";
import "../../../sass/components/Modals/GalleryForm/GalleryForm.css";

/**
 * Props untuk komponen GalleryForm.
 * @typedef {Object} GalleryFormProps
 * @property {Object|null} [item=null] - Data galeri awal untuk mode edit
 * @property {function(): void} onClose - Callback saat form ditutup
 * @property {function(): void} onSuccess - Callback saat operasi berhasil
 */

/**
 * Komponen form modal untuk manajemen data galeri gambar.
 * Digunakan dalam konteks modal untuk operasi CRUD galeri.
 *
 * @component
 * @param {GalleryFormProps} props - Props komponen
 */
const GalleryForm = ({ item, onClose, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();

  /** @type {React.RefObject<HTMLFormElement>} Ref ke form utama */
  const formRef = useRef(null);

  /** @type {React.RefObject<HTMLInputElement>} Ref ke input file */
  const fileInputRef = useRef(null);

  /**
   * File gambar yang dipilih pengguna.
   * @type {[File|null, React.Dispatch<React.SetStateAction<File|null>>]}
   */
  const [imageFile, setImageFile] = useState(null);

  /**
   * URL preview gambar untuk ditampilkan di UI.
   * @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]}
   */
  const [imagePreview, setImagePreview] = useState(null);

  /**
   * Status loading saat proses upload berlangsung.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(false);

  /**
   * Pesan error validasi untuk upload gambar.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [error, setError] = useState("");

  // Hapus error saat fokus ke form lain
  useEffect(() => {
    const handleFocus = (e) => {
      if (formRef.current && formRef.current.contains(e.target)) {
        if (!e.target.closest(".image-upload-area")) {
          setError("");
        }
      }
    };

    document.addEventListener("focusin", handleFocus);
    return () => {
      document.removeEventListener("focusin", handleFocus);
    };
  }, []);

  // ✅ Load data saat edit - menggunakan helper dari galleryService
  useEffect(() => {
    if (item) {
      const previewUrl =
        item.imageUrl || galleryService._getFullImageUrl(item.image);
      setImagePreview(previewUrl);
      setImageFile(null);
    } else {
      setImagePreview(null);
      setImageFile(null);
      setError("");
    }
  }, [item]);

  /**
   * Handler perubahan file gambar.
   * Melakukan validasi file sebelum memproses preview.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Event input file
   */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // ✅ Validasi file sebelum diproses
      const validation = uploadService.validateFile(file);
      if (!validation.isValid) {
        setError(validation.error);
        // Reset file input
        e.target.value = "";
        return;
      }

      // Jika validasi lolos, lanjutkan proses
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError(""); // Bersihkan error sebelumnya
    }
  };

  /**
   * Handler penghapusan gambar dari form.
   * Mengatur ulang state dan membersihkan input file.
   */
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ✅ Handler untuk ganti gambar saat edit
  /**
   * Memicu klik pada input file untuk mengganti gambar saat edit.
   */
  const handleChangeImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // GalleryForm.jsx → handleSubmit
  /**
   * Handler submit form utama.
   * Mengelola logika bisnis untuk create/update galeri dengan validasi ketat.
   * @param {React.FormEvent<HTMLFormElement>} e - Event submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi: harus ada image saat create
    if (!item && !imageFile) {
      setError("Image is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let result;
      if (item) {
        if (imageFile instanceof File) {
          result = await galleryService.update(
            item.id,
            { image: imageFile },
            currentUser.id
          );
        } else {
          result = { success: true };
        }
      } else {
        if (imageFile instanceof File) {
          result = await galleryService.create(
            { image: imageFile },
            currentUser.id
          );
        } else {
          throw new Error("Image must be a File object");
        }
      }

      if (result.success) {
        const modalId = item ? "edit-gallery" : "add-gallery";
        closeModal(modalId);

        setTimeout(() => {
          openModal(
            "gallerySuccessAlert",
            <AlertModal
              title={item ? "Updated!" : "Success!"}
              type="success"
              message={`Gallery item successfully ${
                item ? "updated" : "created"
              }!`}
              onClose={() => {
                closeModal("gallerySuccessAlert");
                if (onSuccess) onSuccess();
              }}
            />,
            "small"
          );
        }, 300);
      } else {
        throw new Error(
          result.message ||
            (item ? "Failed to update gallery" : "Failed to create gallery")
        );
      }
    } catch (err) {
      openModal(
        "galleryErrorAlert",
        <AlertModal
          title="Error"
          type="error"
          message={
            err.message ||
            (item
              ? "An error occurred while updating gallery"
              : "An error occurred while creating gallery")
          }
          onClose={() => closeModal("galleryErrorAlert")}
        />,
        "small"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gallery-form">
      <form ref={formRef} onSubmit={handleSubmit} className="form-content">
        <div className="form-group">
          <label>Image Upload *</label>
          <div className="image-upload-area">
            {imagePreview ? (
              <div className="image-preview-container">
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" aria-label="Image preview" />
                  <div className="image-actions">
                    <button
                      type="button"
                      className="change-image-btn"
                      onClick={handleChangeImage}
                      title="Change image"
                      aria-label="Change image"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={handleRemoveImage}
                      title="Remove image"
                      aria-label="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input"
                  style={{ display: "none" }}
                  aria-label="Upload image file"
                />
              </div>
            ) : (
              <label className="upload-placeholder">
                <Upload size={24} />
                <span>Click to upload image</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input"
                  required={!item}
                  aria-label="Upload image file"
                />
              </label>
            )}
            {error && <div className="upload-error-tooltip">{error}</div>}
          </div>
        </div>

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
                <PulseDots size="sm" color="#ffffff" count={3} />
              </span>
            ) : item ? (
              "Update Gallery"
            ) : (
              "Add Gallery"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GalleryForm;