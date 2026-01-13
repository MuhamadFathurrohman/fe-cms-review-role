/**
 * @file RoleDetail.jsx
 * @description Komponen modal untuk menampilkan detail lengkap peran dan izin.
 * Menyediakan tampilan readonly yang komprehensif meliputi:
 * - Daftar semua pengguna yang ditugaskan ke peran ini
 * - Breakdown lengkap izin akses per resource (termasuk resource sistem)
 * - Penjelasan level akses (none/read/manage)
 * 
 * Menggunakan super admin mode saat mengambil data izin untuk memastikan
 * semua resource (termasuk "role") ditampilkan, terlepas dari status pengguna saat ini.
 */

import React, { useState, useEffect } from "react";
import { roleService } from "../../../services/roleService";
import { usersService } from "../../../services/usersService";
import { formatRoleName, getRoleBadgeClass } from "../../../utils/roleHelper";
import "../../../sass/components/Modals/RoleDetail/RoleDetail.css";

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
 * Komponen spinner loading untuk indikator proses pengambilan data.
 * @component
 * @returns {JSX.Element} Spinner loading dengan pesan teks
 */
const LoadingSpinner = () => (
  <div className="role-detail-spinner-container">
    <div className="role-detail-spinner"></div>
    <p>Loading role details...</p>
  </div>
);

/**
 * Props untuk komponen RoleDetail.
 * @typedef {Object} RoleDetailProps
 * @property {Object} role - Data peran yang akan ditampilkan detailnya
 * @property {string|number} role.id - ID peran
 * @property {string} role.name - Nama peran
 */

/**
 * Komponen modal detail peran.
 * Menampilkan informasi lengkap tentang peran termasuk pengguna yang ditugaskan dan izin akses.
 *
 * @component
 * @param {RoleDetailProps} props - Props komponen
 */
const RoleDetail = ({ role }) => {
  /**
   * Daftar izin per resource untuk peran ini.
   * @type {Array<{resource: string, action: string}>}
   */
  const [permissions, setPermissions] = useState([]);

  /**
   * Daftar pengguna yang ditugaskan ke peran ini.
   * @type {Array<{id: string|number, name: string, roleName: string}>}
   */
  const [users, setUsers] = useState([]);

  /**
   * Status loading saat mengambil data detail peran.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(true);

  /**
   * Pesan error jika gagal mengambil data.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [error, setError] = useState("");

  // Fetch data detail peran saat komponen dipasang
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        // Ambil SEMUA resource (termasuk "role") dengan isSuperAdmin=true
        const roleResult = await roleService.getById(role.id, true);
        if (!roleResult.success) {
          throw new Error(roleResult.message || "Failed to load role data");
        }

        const rolePermissions = roleResult.data.permissions || [];
        setPermissions(rolePermissions);

        const usersResult = await usersService.getPaginated();
        if (!usersResult.success) {
          throw new Error(usersResult.message || "Failed to load users");
        }

        const roleUsers = usersResult.data
          .filter((user) => user.roleId === role.id && !user.deletedAt)
          .map((user) => ({
            id: user.id,
            name: user.name,
            roleName: role.name,
          }));

        setUsers(roleUsers);
      } catch (err) {
        console.error("Failed to load role details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role.id, role.name]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="role-detail-error">{error}</div>;
  }

  // Tampilkan semua resource
  const allPermissions = permissions;

  return (
    <div className="role-detail-content">
      {/* Penjelasan Permission Umum */}
      <div className="role-detail-permission-explanation">
        <h3>Permission Overview</h3>
        <div className="role-detail-explanation-content">
          <p>
            This role's access is defined per resource. Below is the complete
            permission breakdown:
          </p>
          <ul>
            <li>
              <strong>None</strong>: Resource is completely hidden and
              inaccessible.
            </li>
            <li>
              <strong>Read</strong>: View-only access. Export data is available.
            </li>
            <li>
              <strong>Manage</strong>: Full CRUD access — create, read, update,
              delete, and export (where applicable).
            </li>
          </ul>
        </div>
      </div>

      {/* Daftar User */}
      <div className="role-detail-users-section">
        <h3>Users with this Role ({users.length})</h3>
        {users.length === 0 ? (
          <p className="role-detail-no-users">
            No users assigned to this role.
          </p>
        ) : (
          <div className="role-detail-users-list">
            {users.map((user) => (
              <div key={user.id} className="role-detail-user-item">
                <span className="role-detail-user-name">{user.name}</span>
                <span className={`badge role ${getRoleBadgeClass(role.name)}`}>
                  {formatRoleName(role.name)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daftar Permission Detail LENGKAP */}
      {allPermissions.length > 0 ? (
        <div className="role-detail-permissions-section">
          <h3>Resource Permissions ({allPermissions.length})</h3>
          <div className="role-detail-permissions-grid">
            {allPermissions.map((perm) => (
              <div key={perm.resource} className="role-detail-permission-item">
                <span className="role-detail-permission-resource">
                  {formatResourceName(perm.resource)}
                </span>
                <span
                  className={`role-detail-permission-access access-${perm.action}`}
                  aria-label={`${perm.action} access for ${formatResourceName(perm.resource)}`}
                >
                  {perm.action.charAt(0).toUpperCase() + perm.action.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="role-detail-permissions-section">
          <h3>Resource Permissions</h3>
          <p className="role-detail-no-permissions">
            No permission data available.
          </p>
        </div>
      )}
    </div>
  );
};

export default RoleDetail;