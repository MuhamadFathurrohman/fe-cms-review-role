/**
 * @file Users.jsx
 * @description Komponen halaman manajemen pengguna sistem.
 * Menyediakan antarmuka lengkap untuk:
 * - Melihat daftar pengguna dengan pencarian dan pagination
 * - Menambah, mengedit, dan menghapus pengguna
 * - Menampilkan informasi peran dan status
 * - Ekspor data pengguna (jika diizinkan)
 * 
 * Mengimplementasikan kontrol akses berbasis izin:
 * - Super admin: Akses penuh ke semua fitur
 * - Pengguna dengan izin "manage user": Akses CRUD
 * - Pengguna dengan izin "read user": Hanya melihat
 * - Pengguna tanpa izin: Tidak bisa mengakses halaman
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { formatRoleName, getRoleBadgeClass } from "../utils/roleHelper";
import {
  Users as UsersIcon,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usersService } from "../services/usersService";
import { roleService } from "../services/roleService";
import { canManage, canExport, isSuperAdmin } from "../utils/permissions";
import { useAutoRefetch } from "../hooks/useAutoRefetch";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch";
import { generatePageNumbers } from "../utils/pagination";
import "../sass/views/Users/Users.css";
import { useModalContext } from "../contexts/ModalContext";
import UserForm from "../components/Modals/Form/UserForm";
import Modal from "../components/Modals/Modal";
import AlertModal from "../components/Alerts/AlertModal";
import ExportDropdown from "../components/ExportDropdown";

/**
 * Komponen halaman manajemen pengguna utama.
 * Menampilkan tabel pengguna dengan fitur pencarian, pagination, dan aksi CRUD.
 *
 * @component
 */
const Users = () => {
  const { user: currentUser, updateUser } = useAuth();
  const searchInputRef = useRef(null);
  const { openModal, closeModal } = useModalContext();
  const [roles, setRoles] = useState([]);

  // === Hook pencarian dengan debouncing dan pagination ===
  const {
    searchTerm,
    setSearchTerm,
    data: users,
    loading,
    error,
    currentPage,
    totalPages,
    goToPage,
    refresh,
  } = useDebouncedSearch(
    async (page, limit, search, bypassCache = false) => {
      return await usersService.getPaginated(page, limit, search, bypassCache);
    },
    1,
    8,
    800
  );

  // === Permission Logic ===
  /**
   * Status apakah pengguna saat ini adalah super admin.
   * @type {boolean}
   */
  const isSuper = isSuperAdmin(currentUser);

  /**
   * Status apakah pengguna memiliki izin mengelola pengguna.
   * @type {boolean}
   */
  const canManageUsers = isSuper || canManage(currentUser?.permissions, "user");

  /**
   * Status apakah pengguna memiliki izin mengekspor data pengguna.
   * @type {boolean}
   */
  const canExportUsers = isSuper || canExport(currentUser?.permissions, "user");

  // === Load Roles ===
  /**
   * Memuat daftar peran dari server untuk digunakan dalam form pengguna.
   * @async
   */
  const loadRoles = async () => {
    try {
      const result = await roleService.getAll();
      if (result.success) {
        setRoles(result.data || []);
      } else {
        console.error("Gagal memuat roles:", result.message);
      }
    } catch (err) {
      console.error("Error loading roles:", err);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  /**
   * Fungsi auto-refetch yang dipanggil setiap 30 detik.
   * Memperbarui data pengguna dan peran secara otomatis.
   * @async
   */
  const handleAutoRefetch = async () => {
    try {
      await refreshWithPageValidation(true);
      await loadRoles();
    } catch (error) {
      console.error("❌ Users.jsx: Auto-refetch failed:", error);
    }
  };

  useAutoRefetch(handleAutoRefetch);

  // === Role Mapping ===
  /**
   * Peta ID peran ke nama peran untuk lookup cepat.
   * @type {Object.<number, string>}
   */
  const roleMap = useMemo(() => {
    return roles.reduce((acc, role) => {
      acc[role.id] = role.name;
      return acc;
    }, {});
  }, [roles]);

  /**
   * Mendapatkan nama peran berdasarkan ID peran.
   * @param {number|string} roleId - ID peran
   * @returns {string} Nama peran atau ID asli jika tidak ditemukan
   */
  const getRoleName = (roleId) => {
    return roleMap[roleId] || roleId;
  };

  /**
   * Memperbarui data dengan validasi halaman untuk mencegah out-of-bounds.
   * @async
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   */
  const refreshWithPageValidation = async (bypassCache = false) => {
    try {
      const result = await usersService.getPaginated(
        1,
        8,
        searchTerm,
        bypassCache
      );

      if (result.success) {
        const newTotalPages = result.pagination?.totalPages || 1;
        const targetPage = Math.min(currentPage, newTotalPages);

        if (targetPage === currentPage) {
          refresh(bypassCache);
        } else {
          goToPage(targetPage);
        }
      } else {
        refresh(bypassCache);
      }
    } catch (error) {
      console.error("Error in refreshWithPageValidation:", error);
      refresh(bypassCache);
    }
  };

  // === Handlers ===
  /**
   * Handler untuk input pencarian.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Event input
   */
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Handler untuk perubahan halaman pagination.
   * @param {number} page - Nomor halaman yang dituju
   */
  const handlePageChange = (page) => {
    goToPage(page);
  };

  /** @type {(number|string)[]} Daftar nomor halaman untuk ditampilkan */
  const pageNumbers = generatePageNumbers(currentPage, totalPages);

  /**
   * Membuka modal edit pengguna.
   * @param {Object} user - Data pengguna yang akan diedit
   */
  const handleEdit = async (user) => {
    if (!canManageUsers) return;

    try {
      const result = await usersService.getById(user.id);

      if (!result.success) {
        openModal(
          "fetchErrorAlert",
          <AlertModal
            type="error"
            title="Error"
            message={result.message || "Failed to fetch user data"}
            onClose={() => closeModal("fetchErrorAlert")}
          />,
          "small"
        );
        return;
      }

      openModal(
        "userEditModal",
        <Modal
          title="Edit User"
          showHeader={true}
          showCloseButton={true}
          size="large"
          onClose={() => closeModal("userEditModal")}
        >
          <UserForm
            isProfileMode={false}
            roles={roles}
            initialData={result.data}
            onSuccess={(updatedUser) => {
              closeModal("userEditModal");

              if (
                updatedUser &&
                currentUser &&
                updatedUser.id === currentUser.id
              ) {
                updateUser(updatedUser);
              }

              refreshWithPageValidation(true);
            }}
            onCancel={() => closeModal("userEditModal")}
          />
        </Modal>
      );
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  /**
   * Membuka modal konfirmasi hapus pengguna.
   * @param {Object} user - Data pengguna yang akan dihapus
   */
  const handleDelete = (user) => {
    if (!canManageUsers) return;
    openModal(
      "deleteUserConfirm",
      <AlertModal
        type="delete"
        title="Delete User?"
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="highlighted-name">{user.name}</span>? This action
            cannot be undone.
          </>
        }
        showActions={true}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={async () => {
          closeModal("deleteUserConfirm");
          try {
            const result = await usersService.hardDelete(user.id);
            if (result.success) {
              openModal(
                "deleteSuccessAlert",
                <AlertModal
                  type="success"
                  title="Deleted!"
                  message={
                    <>
                      User <span className="highlighted-name">{user.name}</span>{" "}
                      has been successfully deleted.
                    </>
                  }
                  onClose={() => {
                    closeModal("deleteSuccessAlert");
                    refreshWithPageValidation(true);
                  }}
                />,
                "small"
              );
            } else {
              openModal(
                "deleteErrorAlert",
                <AlertModal
                  type="error"
                  title="Failed to Delete"
                  message={
                    result.message || "Failed to delete user. Please try again."
                  }
                  onClose={() => closeModal("deleteErrorAlert")}
                />,
                "small"
              );
            }
          } catch (err) {
            openModal(
              "deleteErrorAlert",
              <AlertModal
                type="error"
                title="Error"
                message="An error occurred while deleting user."
                onClose={() => closeModal("deleteErrorAlert")}
              />,
              "small"
            );
          }
        }}
        onCancel={() => closeModal("deleteUserConfirm")}
      />,
      "small"
    );
  };

  /**
   * Membuka modal tambah pengguna baru.
   */
  const handleAddUser = () => {
    if (!canManageUsers) return;
    openModal(
      "userFormModal",
      <Modal
        title="Add New User"
        showHeader={true}
        showCloseButton={true}
        size="large"
        onClose={() => closeModal("userFormModal")}
      >
        <UserForm
          isProfileMode={false}
          roles={roles}
          onSuccess={() => {
            closeModal("userFormModal");
            refresh();
          }}
          onCancel={() => closeModal("userFormModal")}
        />
      </Modal>
    );
  };

  // Function untuk render pesan no data
  /**
   * Merender pesan ketika tidak ada data pengguna.
   * Menyesuaikan pesan berdasarkan konteks pencarian.
   * @returns {JSX.Element} Pesan no data yang sesuai konteks
   */
  const renderNoDataMessage = () => {
    if (searchTerm.trim()) {
      // Jika sedang search
      return (
        <>
          No user found matching "<strong>{searchTerm}</strong>".
          <br />
          <span style={{ fontSize: "0.9em", opacity: 0.8 }}>
            Try adjusting your search criteria.
          </span>
        </>
      );
    } else {
      // Jika tidak ada search (data memang kosong)
      return (
        <>
          No users available.
          {canManageUsers && (
            <>
              <br />
              <span style={{ fontSize: "0.9em", opacity: 0.8 }}>
                Click "Add New User" to create your first user.
              </span>
            </>
          )}
        </>
      );
    }
  };

  // === Render ===
  return (
    <div className="page-users">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <UsersIcon size={28} /> Users
          </h1>
          <p>Manage all system users and their roles</p>
        </div>
        <div className="header-actions">
          {canExportUsers && (
            <div className="export-dropdown-wrapper">
              <ExportDropdown entity="users" />
            </div>
          )}
          {canManageUsers && (
            <button className="btn-primary" onClick={handleAddUser}>
              <Plus size={16} />
              Add New User
            </button>
          )}
        </div>
      </div>

      <div className="search-container">
        <div className="search-wrapper">
          <Search
            size={19}
            stroke="currentColor"
            className="search-icon"
            onClick={() => searchInputRef.current?.focus()}
            aria-label="Focus search input"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, email..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
            aria-label="Search users"
          />
          {loading && searchTerm && (
            <div className="search-input-spinner"></div>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={refresh} className="retry-btn" aria-label="Retry">
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              {canManageUsers && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canManageUsers ? 7 : 6} className="loading-cell">
                  <div className="loading-spinner"></div>
                  <p>Loading users...</p>
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((user, index) => (
                <tr key={user.id}>
                  <td>{index + 1 + (currentPage - 1) * 8}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span
                      className={`badge role ${getRoleBadgeClass(
                        getRoleName(user.roleId)
                      )}`}
                    >
                      {formatRoleName(getRoleName(user.roleId))}
                    </span>
                  </td>
                  <td>
                    <span className={`badge status ${user.status}`}>
                      {user.statusText}
                    </span>
                  </td>
                  <td>{user.lastLoginFormatted || "-"}</td>
                  {canManageUsers && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(user)}
                          aria-label={`Edit user ${user.name}`}
                        >
                          <Edit2 />
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(user)}
                          aria-label={`Delete user ${user.name}`}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={canManageUsers ? 7 : 6} className="no-data">
                  {renderNoDataMessage()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`pagination-btn pagination-arrow ${
              currentPage === 1 ? "disabled" : ""
            }`}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>

          <div className="pagination-pages">
            {pageNumbers.map((page, index) =>
              page === "..." ? (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`pagination-page ${
                    currentPage === page ? "active" : ""
                  }`}
                  aria-label={`Go to page ${page}`}
                >
                  {page}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`pagination-btn pagination-arrow ${
              currentPage === totalPages ? "disabled" : ""
            }`}
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Users;