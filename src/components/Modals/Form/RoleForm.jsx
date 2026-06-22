/**
 * @file RoleForm.jsx
 * @description Komponen form modal untuk manajemen peran dan izin pengguna.
 * Mendukung dua mode operasi:
 * - **Create**: Membuat peran baru dengan izin default "none"
 * - **Edit**: Mengedit peran yang sudah ada dengan izin yang disimpan
 *
 * Menyediakan antarmuka pengguna yang intuitif untuk:
 * - Mengatur nama dan deskripsi peran
 * - Mengelola izin akses per resource (none/read/manage/review)
 * - Validasi input dan penanganan error
 *
 * Mengimplementasikan kontrol keamanan:
 * - Super admin dapat mengakses semua resource termasuk "role"
 * - Pengguna biasa hanya dapat mengakses resource umum
 */

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { roleService } from "../../../services/roleService";
import { useModalContext } from "../../../contexts/ModalContext";
import AlertModal from "../../Alerts/AlertModal";
import PulseDots from "../../Loaders/PulseDots";
import { ChevronDown } from "lucide-react";
import "../../../sass/components/Modals/RoleForm/RoleForm.css";

/**
 * Daftar resource yang mendukung permission review.
 * Hanya blog dan product yang menampilkan opsi review pada dropdown.
 * @constant {string[]}
 */
const REVIEW_SUPPORTED_RESOURCES = ["blog", "product"];

/**
 * Memformat nama resource menjadi format yang ramah pengguna.
 * @param {string} resource - Nama resource dalam format snake_case atau kebab-case
 * @returns {string} Nama resource yang telah diformat
 */
const formatResourceName = (resource) => {
  if (!resource) return "";
  return resource
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Komponen form modal untuk manajemen peran dan izin.
 * @component
 */
const RoleForm = ({ role: initialRole, isSuperAdmin = false, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();
  const dropdownRef = useRef({});

  const [name, setName] = useState(initialRole?.name || "");
  const [description, setDescription] = useState(
    initialRole?.description || "",
  );
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Resource dropdown yang sedang terbuka.
   * Menyimpan nama resource, null jika semua tertutup.
   * @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]}
   */
  const [openDropdown, setOpenDropdown] = useState(null);

  const resourceList = roleService.getResourceList(isSuperAdmin);

  // Inisialisasi permissions
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
        })),
      );
    }
  }, [initialRole, isSuperAdmin]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdown) {
        const activeRef = dropdownRef.current[openDropdown];
        if (activeRef && !activeRef.contains(e.target)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  /**
   * Toggle buka/tutup dropdown untuk resource tertentu.
   * @param {string} resource - Nama resource
   */
  const toggleDropdown = (resource) => {
    if (loading) return;
    setOpenDropdown((prev) => (prev === resource ? null : resource));
  };

  /**
   * Handler perubahan permission untuk resource tertentu.
   * @param {string} resource - Nama resource
   * @param {string} action - Level aksi baru
   */
  const handlePermissionChange = (resource, action) => {
    setPermissions((prev) =>
      prev.map((perm) =>
        perm.resource === resource ? { ...perm, action } : perm,
      ),
    );
    setOpenDropdown(null);
  };

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

      permissions.forEach((perm) => {
        permissionMap.set(perm.resource, perm.action || "none");
      });

      const completePermissions = allResources.map((resource) => ({
        resource,
        action: permissionMap.get(resource) || "none",
      }));

      let result;
      if (initialRole) {
        result = await roleService.update(
          initialRole.id,
          { name, description },
          completePermissions,
          isSuperAdmin,
          currentUser.id,
        );
      } else {
        result = await roleService.create(
          { name, description },
          completePermissions,
          isSuperAdmin,
          currentUser.id,
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
            message={`Role has been successfully ${initialRole ? "updated" : "created"}.`}
            showActions={true}
            confirmText="OK"
            onConfirm={() => {
              closeModal("roleSaveSuccess");
              onSuccess();
            }}
            onCancel={() => closeModal("roleSaveSuccess")}
          />,
          "small",
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
          "small",
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
        "small",
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

        {/* Permission Info */}
        <div className="role-form-permission-info">
          <div className="role-form-info-item">
            <strong>None</strong>: Resource is completely hidden and
            inaccessible.
          </div>
          <div className="role-form-info-item">
            <strong>Read</strong>: View-only access. Export data is available.
          </div>
          <div className="role-form-info-item">
            <strong>Manage</strong>: Full access for create, read, update, delete,
            and export (where applicable).
          </div>
          <div className="role-form-info-item">
            <strong>Review</strong>: Can review, approve, reject, and
            revisions on content for Blog and Product only.
          </div>
        </div>

        {/* Permission Grid */}
        <div className="role-form-group">
          <label className="role-form-label">Resource Permissions</label>
          <div className="role-form-permission-grid">
            {permissions.map((perm) => {
              const isOpen = openDropdown === perm.resource;

              return (
                <div key={perm.resource} className="role-form-permission-row">
                  <span className="role-form-resource-label">
                    {formatResourceName(perm.resource)}
                  </span>

                  <div
                    ref={(el) => (dropdownRef.current[perm.resource] = el)}
                    className={`role-form-dropdown ${isOpen ? "is-open" : ""}`}
                  >
                    {/* Trigger */}
                    <button
                      type="button"
                      className={`role-form-dropdown-trigger action-${perm.action}`}
                      onClick={() => toggleDropdown(perm.resource)}
                      disabled={loading}
                      aria-haspopup="listbox"
                      aria-expanded={isOpen}
                      aria-label={`Permission for ${formatResourceName(perm.resource)}: ${perm.action}`}
                    >
                      <span>
                        {perm.action.charAt(0).toUpperCase() +
                          perm.action.slice(1)}
                      </span>
                      <ChevronDown
                        size={16}
                        className="role-form-dropdown-chevron"
                      />
                    </button>

                    {/* Options */}
                    {isOpen && (
                      <ul
                        className="role-form-dropdown-menu"
                        role="listbox"
                        aria-label={`Options for ${formatResourceName(perm.resource)}`}
                      >
                        {[
                          "none",
                          "read",
                          "manage",
                          ...(REVIEW_SUPPORTED_RESOURCES.includes(perm.resource)
                            ? ["review"]
                            : []),
                        ].map((action) => (
                          <li
                            key={action}
                            role="option"
                            aria-selected={perm.action === action}
                            className={`role-form-dropdown-item ${perm.action === action ? "is-selected" : ""} item-${action}`}
                            onClick={() =>
                              handlePermissionChange(perm.resource, action)
                            }
                          >
                            {action.charAt(0).toUpperCase() + action.slice(1)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
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
