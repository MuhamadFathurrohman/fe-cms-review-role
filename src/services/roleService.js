/**
 * @file roleService.js
 * @description Layanan terpusat untuk mengelola operasi data peran (roles) dan izin.
 * Menyediakan abstraksi di atas `dataService.roles` dengan fitur tambahan:
 * - Validasi izin berbasis daftar resource yang valid
 * - Transformasi data untuk tampilan UI
 * - Proteksi khusus untuk peran sistem dan super admin
 * - Penanganan izin "none/read/manage/review" yang konsisten
 *
 * Mengimplementasikan prinsip keamanan:
 * - Hanya super admin yang bisa mengelola izin peran
 * - Resource "role" dilindungi dari modifikasi non-super-admin
 * - Validasi ketat terhadap format izin
 */

import { dataService } from "./dataService";
import { baseService } from "./baseService";

/** @constant {string[]} Daftar resource umum yang tersedia untuk semua peran */
const COMMON_RESOURCES = [
  "user",
  "client",
  "analytics",
  "blog",
  "gallery",
  "product",
  "category",
  "brand",
  "audit_log",
  "catalog",
];

/** @constant {string[]} Daftar semua resource yang valid (termasuk sistem) */
const ALL_VALID_RESOURCES = [...COMMON_RESOURCES];

/** @constant {string[]} Level akses yang valid untuk setiap resource */
const VALID_ACCESS_LEVELS = ["none", "read", "manage", "review"];

/**
 * Resource yang mendukung level akses "review".
 * Sinkron dengan konstanta REVIEW_SUPPORTED_RESOURCES di RoleForm.jsx.
 *
 * @constant {string[]}
 */
const REVIEW_SUPPORTED_RESOURCES = ["blog", "product"];

/**
 * Menghasilkan pesan pilihan akses yang valid berdasarkan resource.
 * Resource yang mendukung review akan menyertakan opsi "Review" di pesan.
 *
 * @param {string} resource - Nama resource yang divalidasi
 * @returns {string} Pesan pilihan akses yang sesuai
 */
const getValidChoicesMessage = (resource) => {
  return REVIEW_SUPPORTED_RESOURCES.includes(resource)
    ? "None, Read, Manage, or Review"
    : "None, Read, or Manage";
};

/**
 * Layanan peran terpusat.
 * Mengelola semua operasi CRUD dan validasi terkait peran dan izin.
 *
 * @namespace roleService
 */
export const roleService = {
  /**
   * Mendapatkan daftar resource yang tersedia berdasarkan status super admin.
   *
   * @param {boolean} [isSuperAdmin=false] - Apakah pengguna adalah super admin
   * @returns {string[]} Daftar resource yang tersedia
   */
  getAllResources(isSuperAdmin = false) {
    return isSuperAdmin ? ALL_VALID_RESOURCES : COMMON_RESOURCES;
  },

  /**
   * Memproses daftar peran untuk ditampilkan di UI.
   * Menambahkan properti yang diformat dan metadata izin.
   *
   * @param {Array<Object>} roles - Daftar peran dari API
   * @returns {Array<Object>} Daftar peran yang telah diproses dengan properti tambahan
   */
  processList: (roles) => {
    return roles.map((role) => ({
      ...role,
      createdAtFormatted: baseService.formatDate(role.createdAt),
      updatedAtFormatted: baseService.formatDate(role.updatedAt),
      permissionCount: role.permissions ? role.permissions.length : 0,
    }));
  },

  /**
   * Mendapatkan semua peran tanpa pagination.
   * Digunakan untuk dropdown seleksi peran di form pengguna.
   *
   * @async
   * @returns {{ success: boolean, data?: Array<Object>, message?: string }}
   */
  getAll: async () => {
    try {
      const result = await dataService.roles.getAll({ deletedAt: null });
      if (!result.success) return result;

      const processedRoles = roleService.processList(result.data);
      return {
        success: true,
        data: processedRoles,
      };
    } catch (error) {
      console.error("Error in getAll roles:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the roles. Please try again.",
      };
    }
  },

  /**
   * Mendapatkan daftar peran dengan pagination, pencarian, dan filter.
   *
   * @async
   * @param {number} [page=1]
   * @param {number} [limit=10]
   * @param {string} [search=""]
   * @param {Object} [filters={}]
   * @param {boolean} [bypassCache=false]
   * @returns {{ success: boolean, data?: Array<Object>, pagination?: Object, message?: string }}
   */
  getPaginated: async (
    page = 1,
    limit = 10,
    search = "",
    filters = {},
    bypassCache = false,
  ) => {
    try {
      const params = {
        page,
        limit,
        deletedAt: null,
        bypassCache,
      };

      if (search) params.search = search;
      if (filters.isSystem !== undefined) params.isSystem = filters.isSystem;

      const result = await dataService.roles.getAll(params);

      if (!result.success) return result;

      const processedRoles = roleService.processList(result.data);

      return {
        success: true,
        data: processedRoles,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Error in getPaginated roles:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the roles. Please try again.",
      };
    }
  },

  /**
   * Membuat peran baru dengan izin yang ditentukan.
   * Melakukan validasi ketat terhadap nama peran dan format izin.
   * Pesan error validasi bersifat dinamis — menyesuaikan pilihan yang tersedia per resource.
   *
   * @async
   * @param {Object} roleData
   * @param {string} roleData.name - Nama peran (wajib)
   * @param {string} [roleData.description] - Deskripsi peran (opsional)
   * @param {Array<{resource: string, action: string}>} permissions
   * @param {boolean} [isSuperAdmin=false]
   * @returns {{ success: boolean, data?: Object, message?: string }}
   */
  create: async (roleData, permissions, isSuperAdmin = false) => {
    try {
      if (!roleData.name || roleData.name.trim() === "") {
        return { success: false, message: "Please enter a role name" };
      }

      if (!Array.isArray(permissions)) {
        return {
          success: false,
          message: "Something went wrong with permissions format",
        };
      }

      for (const perm of permissions) {
        const { resource, action } = perm;

        if (!ALL_VALID_RESOURCES.includes(resource)) {
          return {
            success: false,
            message: `'${resource}' is not a valid resource`,
          };
        }

        if (!VALID_ACCESS_LEVELS.includes(action)) {
          return {
            success: false,
            message: `Invalid permission for ${resource}. Please choose: ${getValidChoicesMessage(resource)}`,
          };
        }

        if (resource === "role" && !isSuperAdmin) {
          return {
            success: false,
            message: "Only Super Admins can manage role permissions",
          };
        }
      }

      const validPermissions = permissions.filter(
        (perm) => perm.action !== "none",
      );

      const rolePayload = {
        name: roleData.name.trim(),
        description: roleData.description?.trim() || null,
        permissions: validPermissions,
      };

      const createResult = await dataService.roles.create(rolePayload);

      if (!createResult.success) return createResult;

      return {
        success: true,
        data: createResult.data,
        message: "Role created successfully!",
      };
    } catch (error) {
      console.error("Error in create role:", error);
      return {
        success: false,
        message: "Oops! We couldn't create the role. Please try again.",
      };
    }
  },

  /**
   * Memperbarui peran yang sudah ada dengan izin baru.
   * Mengikuti validasi yang sama seperti pembuatan peran.
   * Pesan error validasi bersifat dinamis — menyesuaikan pilihan yang tersedia per resource.
   *
   * @async
   * @param {string|number} id
   * @param {Object} roleData
   * @param {string} roleData.name - Nama peran baru
   * @param {string} [roleData.description] - Deskripsi peran baru
   * @param {Array<{resource: string, action: string}>} permissions
   * @param {boolean} [isSuperAdmin=false]
   * @returns {{ success: boolean, data?: Object, message?: string }}
   */
  update: async (id, roleData, permissions, isSuperAdmin = false) => {
    try {
      if (!roleData.name || roleData.name.trim() === "") {
        return { success: false, message: "Please enter a role name" };
      }

      if (!Array.isArray(permissions)) {
        return {
          success: false,
          message: "Something went wrong with permissions format",
        };
      }

      for (const perm of permissions) {
        const { resource, action } = perm;

        if (!ALL_VALID_RESOURCES.includes(resource)) {
          return {
            success: false,
            message: `'${resource}' is not a valid resource`,
          };
        }

        if (!VALID_ACCESS_LEVELS.includes(action)) {
          return {
            success: false,
            message: `Invalid permission for ${resource}. Please choose: ${getValidChoicesMessage(resource)}`,
          };
        }

        if (resource === "role" && !isSuperAdmin) {
          return {
            success: false,
            message: "Only Super Admin can manage role permissions",
          };
        }
      }

      const validPermissions = permissions.filter(
        (perm) => perm.action !== "none",
      );

      const updatePayload = {
        name: roleData.name.trim(),
        description: roleData.description?.trim() || null,
        permissions: validPermissions,
      };

      const updateResult = await dataService.roles.update(id, updatePayload);

      if (!updateResult.success) return updateResult;

      return {
        success: true,
        data: updateResult.data,
        message: "Role successfully updated",
      };
    } catch (error) {
      console.error("Error in update role:", error);
      return {
        success: false,
        message: "Oops! We couldn't update the role. Please try again.",
      };
    }
  },

  /**
   * Melakukan soft delete peran (set deletedAt).
   *
   * @async
   * @param {string|number} id
   * @param {boolean} [isSuperAdmin=false]
   * @param {Object} [roleResult]
   * @returns {{ success: boolean, message?: string }}
   */
  softDelete: async (id, isSuperAdmin = false, roleResult) => {
    try {
      const role = roleResult.data;
      if (role && !isSuperAdmin) {
        return { success: false, message: "Can't delete system role" };
      }

      const result = await dataService.roles.softDelete(id);

      if (result.success) {
        return { success: true, message: "Role successfully deleted" };
      }
      return result;
    } catch (error) {
      console.error("Error in delete role:", error);
      return {
        success: false,
        message: "Oops! We couldn't delete the role. Please try again.",
      };
    }
  },

  /**
   * Melakukan hard delete peran (hapus permanen dari database).
   *
   * @async
   * @param {string|number} id
   * @param {boolean} [isSuperAdmin=false]
   * @param {Object} [roleResult]
   * @param {boolean} [isSystem]
   * @returns {{ success: boolean, message?: string }}
   */
  hardDelete: async (id, isSuperAdmin = false, roleResult, isSystem) => {
    try {
      const role = roleResult.data;
      if (role && !isSuperAdmin) {
        return { success: false, message: "Can't delete system role" };
      }

      const result = await dataService.roles.hardDelete(id);

      if (result.success) {
        return {
          success: true,
          message: "Role successfully deleted permanently",
        };
      }
      return result;
    } catch (error) {
      console.error("Error in delete role:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't delete the role permanently. Please try again.",
      };
    }
  },

  /**
   * Mendapatkan detail peran berdasarkan ID.
   * Mengisi izin lengkap untuk semua resource yang tersedia,
   * bahkan jika tidak disimpan di database (default ke "none").
   *
   * @async
   * @param {string|number} id
   * @param {boolean} [isSuperAdmin=false]
   * @returns {{ success: boolean, data?: Object, message?: string }}
   */
  getById: async (id, isSuperAdmin = false) => {
    try {
      const roleResult = await dataService.roles.getById(id);
      if (!roleResult.success) return roleResult;

      const embeddedPermissions = roleResult.data.permissions || [];

      const savedPermMap = new Map();
      embeddedPermissions.forEach((p) => {
        savedPermMap.set(p.resource, p.action);
      });

      const allResources = roleService.getAllResources(isSuperAdmin);
      const fullPermissions = allResources.map((resource) => ({
        resource,
        action: savedPermMap.get(resource) || "none",
      }));

      const roleWithPermissions = {
        ...roleResult.data,
        permissions: fullPermissions,
        rawPermissions: embeddedPermissions,
      };

      const processedRole = roleService.processList([roleWithPermissions])[0];

      return {
        success: true,
        data: processedRole,
      };
    } catch (error) {
      console.error("Error in getById role:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the role details. Please try again.",
      };
    }
  },

  /**
   * Mendapatkan daftar resource yang tersedia untuk pengguna saat ini.
   *
   * @param {boolean} [isSuperAdmin=false]
   * @returns {string[]}
   */
  getResourceList(isSuperAdmin = false) {
    return roleService.getAllResources(isSuperAdmin);
  },
};
