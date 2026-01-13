/**
 * @file RoleForm.jsx
 * @description Komponen form modal untuk manajemen peran dan izin pengguna.
 * Mendukung dua mode operasi:
 * - **Create**: Membuat peran baru dengan izin default "none"
 * - **Edit**: Mengedit peran yang sudah ada dengan izin yang disimpan
 * 
 * Menyediakan antarmuka pengguna yang intuitif untuk:
 * - Mengatur nama dan deskripsi peran
 * - Mengelola izin akses per resource (none/read/manage)
 * - Validasi input dan penanganan error
 * 
 * Mengimplementasikan kontrol keamanan:
 * - Super admin dapat mengakses semua resource termasuk "role"
 * - Pengguna biasa hanya dapat mengakses resource umum
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { roleService } from "../../../services/roleService";
import { useModalContext } from "../../../contexts/ModalContext";
import AlertModal from "../../Alerts/AlertModal";
import PulseDots from "../../Loaders/PulseDots";
import "../../../sass/components/Modals/RoleForm/RoleForm.css";

/**
 * Memformat nama resource menjadi format yang ramah pengguna.
 * Mengubah underscore/dash menjadi spasi dan mengkapitalisasi setiap kata.
 * 
 * @param {string} resource - Nama resource dalam format snake_case atau kebab-case
 * @returns {string} Nama resource yang telah diformat
 * 
 * @example
 * formatResourceName("user_management"); // "User Management"
 * formatResourceName("audit-log"); // "Audit Log"
 */
const formatResourceName = (resource) => {
  if (!resource) return "";
  return resource
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Props untuk komponen RoleForm.
 * @typedef {Object} RoleFormProps
 * @property {Object|null} [role=null] - Data peran awal untuk mode edit
 * @property {boolean} [isSuperAdmin=false] - Apakah pengguna adalah super admin
 * @property {function(): void} onSuccess - Callback saat operasi berhasil
 */

/**
 * Komponen form modal untuk manajemen peran dan izin.
 * Digunakan dalam konteks modal untuk operasi CRUD peran.
 *
 * @component
 * @param {RoleFormProps} props - Props komponen
 */
const RoleForm = ({ role: initialRole, isSuperAdmin = false, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();

  /**
   * Nama peran yang sedang diedit/dibuat.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [name, setName] = useState(initialRole?.name || "");

  /**
   * Deskripsi peran yang sedang diedit/dibuat.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [description, setDescription] = useState(
    initialRole?.description || ""
  );

  /**
   * Daftar izin per resource untuk peran ini.
   * Setiap izin memiliki struktur: { resource: string, action: 'none'|'read'|'manage' }
   * @type {Array<{resource: string, action: string}>}
   */
  const [permissions, setPermissions] = useState([]);

  /**
   * Status loading saat proses penyimpanan berlangsung.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(false);

  /**
   * Pesan error validasi untuk nama peran.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [error, setError] = useState("");

  /** @type {string[]} Daftar resource yang tersedia berdasarkan status super admin */
  const resourceList = roleService.getResourceList(isSuperAdmin);

  // Inisialisasi izin berdasarkan mode
  useEffect(() => {
    if (initialRole) {
      const fetchPermissions = async () => {
        const result = await roleService.getById(initialRole.id, isSuperAdmin);
        if (result.success) {
          setPermissions(result.data.permissions || []);
        }
      };
      fetchPermissions();
    } else {
      setPermissions(
        resourceList.map((resource) => ({
          resource,
          action: "none",
        }))
      );
    }
  }, [initialRole, isSuperAdmin]);

  /**
   * Handler perubahan izin untuk resource tertentu.
   * @param {string} resource - Nama resource yang diubah
   * @param {'none'|'read'|'manage'} action - Level aksi baru
   */
  const handlePermissionChange = (resource, action) => {
    setPermissions((prev) =>
      prev.map((perm) =>
        perm.resource === resource ? { ...perm, action } : perm
      )
    );
  };

  /**
   * Handler submit form utama.
   * Mengelola logika bisnis untuk create/update peran dengan validasi izin.
   * @param {React.FormEvent<HTMLFormElement>} e - Event submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Role name is required");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const allResources = roleService.getResourceList(isSuperAdmin);
      const permissionMap = new Map();

      // Gunakan "action" di sini
      permissions.forEach((perm) => {
        const action = perm.action || "none";
        permissionMap.set(perm.resource, action);
      });

      const completePermissions = allResources.map((resource) => ({
        resource,
        action: permissionMap.get(resource) || "none",
      }));

      // Kirim ke roleService
      let result;
      if (initialRole) {
        result = await roleService.update(
          initialRole.id,
          { name, description },
          completePermissions,
          isSuperAdmin,
          currentUser.id
        );
      } else {
        result = await roleService.create(
          { name, description },
          completePermissions,
          isSuperAdmin,
          currentUser.id
        );
      }

      if (result.success) {
        const modalId = initialRole ? `editRole-${initialRole.id}` : "addRole";
        closeModal(modalId);

        openModal(
          "roleSaveSuccess",
          <AlertModal
            type="success"
            title={initialRole ? "Updated!" : "Created!"}
            message={`Role has been successfully ${
              initialRole ? "updated" : "created"
            }.`}
            showActions={true}
            confirmText="OK"
            onConfirm={() => {
              closeModal("roleSaveSuccess");
              onSuccess();
            }}
            onCancel={() => closeModal("roleSaveSuccess")}
          />,
          "small"
        );
      } else {
        openModal(
          "roleSaveError",
          <AlertModal
            type="error"
            title="Failed to Save"
            message={result.message || "Failed to save role. Please try again."}
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("roleSaveError")}
            onCancel={() => closeModal("roleSaveError")}
          />,
          "small"
        );
      }
    } catch (err) {
      console.error("Save failed:", err);
      openModal(
        "roleSaveError",
        <AlertModal
          type="error"
          title="Error"
          message="An error occurred while saving role. Please try again."
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("roleSaveError")}
          onCancel={() => closeModal("roleSaveError")}
        />,
        "small"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-form-content">
      {error && <div className="role-form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="role-form-group">
          <label htmlFor="role-form-name" className="role-form-label">
            Role Name *
          </label>
          <input
            id="role-form-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="role-form-input"
            placeholder="e.g. content manager"
            aria-label="Role name"
            aria-required="true"
          />
        </div>

        <div className="role-form-group">
          <label htmlFor="role-form-description" className="role-form-label">
            Description
          </label>
          <textarea
            id="role-form-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="role-form-textarea"
            placeholder="Describe this role..."
            aria-label="Role description"
          />
        </div>

        <div className="role-form-permission-info">
          <div className="role-form-info-item">
            <strong>None</strong>: Resource is completely hidden and
            inaccessible.
          </div>
          <div className="role-form-info-item">
            <strong>Read</strong>: View-only access. Export data is available.
          </div>
          <div className="role-form-info-item">
            <strong>Manage</strong>: Full access — create, read, update, delete,
            and export (where applicable).
          </div>
        </div>

        <div className="role-form-group">
          <label className="role-form-label">Resource Permissions</label>
          <div className="role-form-permission-grid">
            {permissions.map((perm) => (
              <div key={perm.resource} className="role-form-permission-row">
                <span className="role-form-resource-label">
                  {formatResourceName(perm.resource)}
                </span>
                <div className="role-form-radio-group">
                  {["none", "read", "manage"].map((action) => (
                    <label key={action} className="role-form-radio-option">
                      <input
                        type="radio"
                        name={`permission-${perm.resource}`}
                        value={action}
                        checked={perm.action === action}
                        onChange={() =>
                          handlePermissionChange(perm.resource, action)
                        }
                        disabled={loading}
                        className="role-form-radio-input"
                        aria-label={`${action} access for ${formatResourceName(perm.resource)}`}
                      />
                      <span className="role-form-radio-label">
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="role-form-actions">
          <button
            type="button"
            className="role-form-btn-cancel"
            onClick={() => {
              const modalId = initialRole
                ? `editRole-${initialRole.id}`
                : "addRole";
              closeModal(modalId);
            }}
            disabled={loading}
            aria-label="Cancel form"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="role-form-btn-submit"
            disabled={loading || !name.trim()}
            aria-label={initialRole ? "Update role" : "Create role"}
          >
            {loading ? (
              <div className="role-form-btn-loading">
                <PulseDots size="sm" color="white" count={6} />
              </div>
            ) : initialRole ? (
              "Update Role"
            ) : (
              "Create Role"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoleForm;