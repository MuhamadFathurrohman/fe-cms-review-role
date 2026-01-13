/**
 * @file ClientForm.jsx
 * @description Komponen form modal untuk manajemen data klien dari company profile.
 * Mendukung dua mode operasi:
 * - **Create**: Membuat inquiry klien baru (biasanya dari form company profile)
 * - **Edit**: Mengedit inquiry klien yang sudah ada dan menandai sebagai "replied"
 * 
 * Menyediakan fitur khusus:
 * - Validasi input sesuai persyaratan backend
 * - Checkbox "Mark as Replied" dengan logika one-way (hanya bisa diubah dari false → true)
 * - Informasi readonly tambahan di mode edit (IP, timestamp, dll.)
 */

import React, { useState, useEffect, useRef } from "react";
import { clientService } from "../../../services/clientService";
import { useModalContext } from "../../../contexts/ModalContext";
import AlertModal from "../../Alerts/AlertModal";
import { Check, ChevronDown } from "lucide-react";
import PulseDots from "../../Loaders/PulseDots";
import "../../../sass/components/Modals/ClientForm/ClientForm.css";

/**
 * Props untuk komponen ClientForm.
 * @typedef {Object} ClientFormProps
 * @property {function(): void} onSuccess - Callback saat operasi berhasil
 * @property {Object|null} [initialData=null] - Data awal untuk mode edit
 */

/**
 * Komponen form modal untuk manajemen data klien.
 * Digunakan dalam konteks modal untuk operasi CRUD klien.
 *
 * @component
 * @param {ClientFormProps} props - Props komponen
 */
const ClientForm = ({ onSuccess, initialData = null }) => {
  const { closeModal, openModal } = useModalContext();

  /** @type {React.RefObject<HTMLDivElement>} Ref ke dropdown seleksi tipe form */
  const formTypeSelectRef = useRef(null);

  /**
   * State form data klien.
   * @type {{
   *   company: string,
   *   address: string,
   *   country: string,
   *   name: string,
   *   phone: string,
   *   email: string,
   *   fax: string,
   *   message: string,
   *   formType: 'CATALOG'|'CONTACT',
   *   isReplied: boolean
   * }}
   */
  const [formData, setFormData] = useState({
    company: "",
    address: "",
    country: "",
    name: "",
    phone: "",
    email: "",
    fax: "",
    message: "",
    formType: "CATALOG",
    isReplied: false,
  });

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} Status loading */
  const [loading, setLoading] = useState(false);

  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} Pesan error validasi */
  const [error, setError] = useState("");

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} Status dropdown tipe form */
  const [isFormTypeOpen, setIsFormTypeOpen] = useState(false);

  // Track initial isReplied state untuk detect perubahan
  /**
   * Status awal `isReplied` untuk mendeteksi perubahan dari false → true.
   * Digunakan untuk menentukan apakah perlu memanggil endpoint reply.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [initialIsReplied, setInitialIsReplied] = useState(false);

  /** @type {boolean} Status apakah ini mode edit atau create */
  const isEditMode = initialData && Object.keys(initialData).length > 0;

  // Inisialisasi form data berdasarkan mode
  useEffect(() => {
    if (isEditMode) {
      const isRepliedValue = initialData.isReplied || false;

      setFormData({
        company: initialData.company || "",
        address: initialData.address || "",
        country: initialData.country || "",
        name: initialData.name || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        fax: initialData.fax || "",
        message: initialData.message || "",
        formType: initialData.formType || "CATALOG",
        isReplied: isRepliedValue,
      });

      // Simpan initial state
      setInitialIsReplied(isRepliedValue);
    } else {
      setFormData({
        company: "",
        address: "",
        country: "",
        name: "",
        phone: "",
        email: "",
        fax: "",
        message: "",
        formType: "CATALOG",
        isReplied: false,
      });
      setInitialIsReplied(false);
    }
  }, [initialData, isEditMode]);

  /**
   * Handler perubahan input form.
   * Mendukung input teks dan checkbox.
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>} e - Event input
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /**
   * Handler submit form utama.
   * Mengelola logika bisnis untuk create/update klien dengan penanganan khusus untuk status replied.
   * @param {React.FormEvent<HTMLFormElement>} e - Event submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validasi sesuai backend
    if (!formData.name.trim()) {
      setError("Contact name is required");
      return;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Invalid email format");
      return;
    }
    if (!formData.message.trim()) {
      setError("Message is required");
      return;
    }
    if (!formData.formType) {
      setError("Form type is required");
      return;
    }

    setLoading(true);

    try {
      let result;

      if (isEditMode) {
        // mengecek apakah isReplied berubah dari false → true
        const isRepliedChanged = !initialIsRepired && formData.isReplied;

        if (isRepliedChanged) {
          // Hit endpoint POST /clients/:id/reply
          result = await clientService.reply(initialData.id);

          if (!result.success) {
            throw new Error(result.message || "Failed to mark as replied");
          }
        }

        // update data lainnya (tanpa isReplied)
        const updateData = {
          company: formData.company,
          address: formData.address,
          country: formData.country,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          fax: formData.fax,
          message: formData.message,
          formType: formData.formType,
        };

        result = await clientService.update(initialData.id, updateData);
      } else {
        // Untuk create, kirim semua data
        const createData = {
          company: formData.company,
          address: formData.address,
          country: formData.country,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          fax: formData.fax,
          message: formData.message,
          formType: formData.formType,
          isReplied: formData.isReplied,
        };

        result = await clientService.create(createData);
      }

      if (result.success) {
        if (onSuccess) {
          await onSuccess();
        }
        closeModal(isEditMode ? "clientEditModal" : "clientFormModal");

        setTimeout(() => {
          openModal(
            "clientSuccessAlert",
            <AlertModal
              title={isEditMode ? "Updated!" : "Success!"}
              type="success"
              message={`Client successfully ${
                isEditMode ? "updated" : "created"
              }!`}
              onClose={() => {
                closeModal("clientSuccessAlert");
              }}
            />,
            "small"
          );
        }, 300);
      } else {
        throw new Error(result.message || "Failed to save client data");
      }
    } catch (err) {
      openModal(
        "clientErrorAlert",
        <AlertModal
          title="Error"
          type="error"
          message={err.message || "An error occurred while saving data."}
          onClose={() => closeModal("clientErrorAlert")}
        />,
        "small"
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handler pembatalan form.
   * Menutup modal dengan nama yang sesuai berdasarkan mode.
   */
  const handleCancel = () => {
    const modalName = isEditMode ? "clientEditModal" : "clientFormModal";
    closeModal(modalName);
  };

  // Handle klik di luar dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        formTypeSelectRef.current &&
        !formTypeSelectRef.current.contains(e.target)
      ) {
        setIsFormTypeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="client-form">
      {error && <div className="client-form-error">{error}</div>}

      <div className="client-form-layout">
        <div className="client-form-column">
          <div className="client-form-group">
            <label>Company</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              aria-label="Company name"
            />
          </div>

          <div className="client-form-group">
            <label>Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="5"
              aria-label="Company address"
            />
          </div>

          <div className="client-form-group">
            <label>Country</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              aria-label="Country"
            />
          </div>

          <div className="client-form-group">
            <label>Contact Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              aria-required="true"
              aria-label="Contact person name"
            />
          </div>

          <div className="client-form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              aria-required="true"
              aria-label="Contact email"
            />
          </div>

          <div className="client-form-group">
            <label>Phone Number</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              aria-label="Phone number"
            />
          </div>

          <div className="client-form-group">
            <label>Fax</label>
            <input
              type="text"
              name="fax"
              value={formData.fax}
              onChange={handleChange}
              aria-label="Fax number"
            />
          </div>
        </div>

        <div className="client-form-column">
          <div className="client-form-group">
            <label>Message *</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows="5"
              required
              aria-required="true"
              aria-label="Message content"
            />
          </div>

          <div className="client-form-group">
            <label>Form Type *</label>
            <div
              ref={formTypeSelectRef}
              className={`client-custom-select ${
                isFormTypeOpen ? "client-custom-select--open" : ""
              }`}
              tabIndex={0}
              onClick={() => setIsFormTypeOpen(!isFormTypeOpen)}
              aria-label="Select form type"
              role="combobox"
              aria-expanded={isFormTypeOpen}
            >
              <div className="client-custom-select__control">
                <span>
                  {formData.formType === "CATALOG" ? "Catalog" : "Contact"}
                </span>
                <ChevronDown
                  size={20}
                  className={`client-custom-select__arrow ${
                    isFormTypeOpen ? "rotated" : ""
                  }`}
                  aria-hidden="true"
                />
              </div>

              {isFormTypeOpen && (
                <ul className="client-custom-select__menu" role="listbox">
                  <li
                    className="client-custom-select__option"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        formType: "CATALOG",
                      }));
                      setIsFormTypeOpen(false);
                    }}
                    role="option"
                    aria-selected={formData.formType === "CATALOG"}
                  >
                    Catalog
                  </li>
                  <li
                    className="client-custom-select__option"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        formType: "CONTACT",
                      }));
                      setIsFormTypeOpen(false);
                    }}
                    role="option"
                    aria-selected={formData.formType === "CONTACT"}
                  >
                    Contact
                  </li>
                </ul>
              )}
            </div>
          </div>

          {/* Checkbox isReplied - hanya tampil di Edit Mode */}
          {isEditMode && (
            <div className="client-form-group">
              <label>Status</label>
              <div className="client-checkbox-group">
                <label className="client-checkbox-label">
                  <input
                    type="checkbox"
                    name="isReplied"
                    checked={formData.isReplied}
                    onChange={handleChange}
                    // Disable jika sudah replied (one-way action)
                    disabled={initialIsReplied}
                    aria-label={
                      initialIsReplied
                        ? "Already replied"
                        : "Mark as replied"
                    }
                  />
                  <span className="client-checkmark">
                    {formData.isReplied && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span>
                    {initialIsReplied ? "Already Replied" : "Mark as Replied"}
                  </span>
                </label>
              </div>
              {initialIsReplied && (
                <small
                  style={{
                    color: "#6b7280",
                    marginTop: "4px",
                    display: "block",
                  }}
                  aria-live="polite"
                >
                  This client has already been marked as replied
                </small>
              )}
            </div>
          )}

          {isEditMode && (
            <div className="client-form-group client-readonly-info">
              <div className="client-readonly-label">
                <strong>Additional Information</strong>
              </div>
              <div className="client-readonly-fields">
                <div>
                  <strong>Created:</strong> {initialData.joinDateFormatted}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`badge status ${
                      initialData.isReplied ? "replied" : "not-replied"
                    }`}
                  >
                    {initialData.isReplied ? "Replied" : "Not Replied"}
                  </span>
                </div>
                {initialData.repliedAt && (
                  <div>
                    <strong>Replied At:</strong> {initialData.repliedAt}
                  </div>
                )}
                <div>
                  <strong>IP:</strong> {initialData.ipAddress || "N/A"}
                </div>
                <div>
                  <strong>Source:</strong> {initialData.source || "N/A"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="client-form-actions">
        <button
          type="button"
          className="client-btn-secondary"
          onClick={handleCancel}
          aria-label="Cancel form"
        >
          Cancel
        </button>
        <button type="submit" className="client-btn-primary" disabled={loading}>
          {loading ? (
            <span className="btn-loading">
              <PulseDots size="sm" color="#ffffff" count={6} />
            </span>
          ) : isEditMode ? (
            "Update Client"
          ) : (
            "Save Client"
          )}
        </button>
      </div>
    </form>
  );
};

export default ClientForm;