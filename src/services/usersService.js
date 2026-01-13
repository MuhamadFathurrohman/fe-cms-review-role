/**
 * @file usersService.js
 * @description Layanan terpusat untuk mengelola operasi data pengguna.
 * Menyediakan abstraksi di atas `dataService.users` dengan fitur tambahan:
 * - Transformasi data untuk tampilan UI
 * - Manajemen URL avatar lengkap
 * - Validasi input dan penanganan file
 * - Sinkronisasi data setelah operasi avatar
 * 
 * Mendukung dua mode operasi:
 * - **Mode Admin**: Mengelola pengguna lain
 * - **Mode Profil**: Mengelola profil sendiri
 */

import { dataService } from "./dataService";
import { baseService } from "./baseService";
import { uploadService } from "./uploadService";

/**
 * Layanan pengguna terpusat.
 * Mengelola semua operasi CRUD dan transformasi data pengguna.
 * 
 * @namespace usersService
 */
export const usersService = {
  // ===================================================================
  // AVATAR URL HELPER
  // ===================================================================
  /**
   * Menghasilkan URL lengkap untuk avatar pengguna.
   * Mendeteksi apakah path sudah merupakan URL lengkap atau perlu digabungkan dengan base URL.
   * 
   * @param {string|null|undefined} avatarPath - Path avatar dari backend
   * @returns {string|null} URL lengkap avatar atau null jika path tidak valid
   * 
   * @example
   * // Path relatif
   * usersService.getFullAvatarUrl("avatars/user123.jpg");
   * // → "https://api.example.com/avatars/user123.jpg"
   * 
   * @example
   * // URL lengkap
   * usersService.getFullAvatarUrl("https://external.com/avatar.jpg");
   * // → "https://external.com/avatar.jpg"
   */
  getFullAvatarUrl: (avatarPath) => {
    if (!avatarPath) return null;

    if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
      return avatarPath;
    }
    const apiBaseUrl = import.meta.env.VITE_PHOTO_URL || "";

    const cleanPath = avatarPath.startsWith("/")
      ? avatarPath
      : `/${avatarPath}`;

    return `${apiBaseUrl}${cleanPath}`;
  },

  // ===================================================================
  // PROCESS LIST - Transform user list dengan avatar URL
  // ===================================================================
  /**
   * Memproses daftar pengguna untuk ditampilkan di UI.
   * Menambahkan properti yang diformat dan URL avatar lengkap.
   * 
   * @param {Array<Object>} users - Daftar pengguna dari API
   * @returns {Array<Object>} Daftar pengguna yang telah diproses dengan properti tambahan
   * 
   * @example
   * const processedUsers = usersService.processList(rawUsers);
   * // Setiap user memiliki: avatar, createdAtFormatted, statusColor, dll.
   */
  processList: (users) => {
    return users.map((user) => ({
      ...user,
      avatar: usersService.getFullAvatarUrl(user.avatar),
      createdAtFormatted: baseService.formatDate(user.createdAt),
      lastLoginFormatted: user.lastLoginAt
        ? baseService.timeAgo(user.lastLoginAt)
        : "-",
      statusColor: baseService.getStatusColor(user.status),
      statusText:
        user.status === "ACTIVE"
          ? "active"
          : user.status === "INACTIVE"
          ? "inactive"
          : user.status === "SUSPENDED"
          ? "suspended"
          : "unknown",
      role: user.role?.name || user.roleId || "user",
    }));
  },

  // ===================================================================
  // PROCESS SINGLE USER - Transform single user dengan avatar URL
  // ===================================================================
  /**
   * Memproses data pengguna tunggal untuk ditampilkan di UI.
   * Mempertahankan path avatar asli dan menambahkan URL lengkap terpisah.
   * 
   * @param {Object|null} user - Data pengguna dari API
   * @returns {Object|null} Data pengguna yang telah diproses atau null jika input tidak valid
   * 
   * @example
   * const processedUser = usersService.processSingleUser(rawUser);
   * // User memiliki: avatar (path asli), avatarUrl (URL lengkap), roleName, dll.
   */
  processSingleUser: (user) => {
    if (!user) return null;

    return {
      ...user,
      avatar: user.avatar, // Keep original path
      avatarUrl: usersService.getFullAvatarUrl(user.avatar), // Add full URL
      createdAtFormatted: baseService.formatDate(user.createdAt),
      lastLoginFormatted: user.lastLoginAt
        ? baseService.timeAgo(user.lastLoginAt)
        : "-",
      statusColor: baseService.getStatusColor(user.status),
      statusText:
        user.status === "ACTIVE"
          ? "active"
          : user.status === "INACTIVE"
          ? "inactive"
          : user.status === "SUSPENDED"
          ? "suspended"
          : "unknown",
      roleName: user.role?.name || user.roleName || "User",
      roleId: user.role?.id || user.roleId,
    };
  },

  // ===================================================================
  // AVATAR: Upload dan Delete
  // ===================================================================
  /**
   * Mengupload avatar untuk pengguna yang sedang login.
   * Melakukan validasi file sebelum mengirim ke server.
   * 
   * @async
   * @param {File} avatarFile - File gambar avatar
   * @returns {{ success: boolean, message?: string }} Status operasi upload
   */
  uploadAvatarSelf: async (avatarFile) => {
    try {
      const validation = uploadService.validateFile(avatarFile);
      if (!validation.isValid) {
        return { success: false, message: validation.error };
      }
      return await dataService.users.uploadAvatarSelf(avatarFile);
    } catch (error) {
      console.error("Error uploading self avatar:", error);
      return {
        success: false,
        message: "Oops! We couldn't upload your avatar. Please try again.",
      };
    }
  },

  /**
   * Menghapus avatar pengguna yang sedang login.
   * 
   * @async
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan
   */
  deleteAvatarSelf: async () => {
    try {
      return await dataService.users.deleteAvatarSelf();
    } catch (error) {
      console.error("Error deleting self avatar:", error);
      return {
        success: false,
        message: "Oops! We couldn't delete your avatar. Please try again.",
      };
    }
  },

  /**
   * Mengupload avatar untuk pengguna lain berdasarkan ID.
   * Melakukan validasi file sebelum mengirim ke server.
   * 
   * @async
   * @param {string|number} id - ID pengguna target
   * @param {File} avatarFile - File gambar avatar
   * @returns {{ success: boolean, message?: string }} Status operasi upload
   */
  uploadAvatarById: async (id, avatarFile) => {
    try {
      const validation = uploadService.validateFile(avatarFile);
      if (!validation.isValid) {
        return { success: false, message: validation.error };
      }
      return await dataService.users.uploadAvatarById(id, avatarFile);
    } catch (error) {
      console.error("Error uploading avatar by ID:", error);
      return {
        success: false,
        message: "Oops! We couldn't upload the avatar. Please try again.",
      };
    }
  },

  /**
   * Menghapus avatar pengguna lain berdasarkan ID.
   * 
   * @async
   * @param {string|number} id - ID pengguna target
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan
   */
  deleteAvatarById: async (id) => {
    try {
      return await dataService.users.deleteAvatarById(id);
    } catch (error) {
      console.error("Error deleting avatar by ID:", error);
      return {
        success: false,
        message: "Oops! We couldn't delete the avatar. Please try again.",
      };
    }
  },

  // ===================================================================
  // CREATE USER
  // ===================================================================
  /**
   * Membuat pengguna baru dengan dukungan upload avatar terpisah.
   * Mengikuti pola:
   * 1. Buat profil pengguna
   * 2. Jika ada avatar, upload secara terpisah
   * 3. Ambil data terbaru untuk memastikan sinkronisasi
   * 
   * @async
   * @param {Object} userData - Data pengguna yang akan dibuat
   * @param {File} [userData.avatar] - File avatar opsional
   * @param {string} userData.name - Nama pengguna
   * @param {string} userData.email - Email pengguna
   * @param {string} userData.password - Kata sandi
   * @param {number} userData.roleId - ID peran
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data pengguna yang dibuat
   */
  create: async (userData) => {
    try {
      const { avatar, ...profileData } = userData;

      // Validasi file jika ada
      if (avatar instanceof File) {
        const validation = uploadService.validateFile(avatar);
        if (!validation.isValid) {
          return { success: false, message: validation.error };
        }
      }

      // Kirim hanya data profil
      const result = await dataService.users.create(profileData);
      if (!result.success) return result;

      // Jika ada avatar, upload terpisah
      if (avatar instanceof File) {
        const uploadResult = await dataService.users.uploadAvatarById(
          result.data.id,
          avatar
        );
        if (!uploadResult.success) {
          // Opsional: rollback? atau biarkan user retry
          console.warn(
            "Avatar upload failed, but user created:",
            uploadResult.message
          );
        }
      }

      // Ambil data terbaru setelah upload
      const freshUser = await dataService.users.getById(result.data.id);
      if (freshUser.success) {
        result.data = usersService.processSingleUser(freshUser.data);
      }

      return result;
    } catch (error) {
      console.error("Error in create user:", error);
      return {
        success: false,
        message: "Oops! We couldn't create the user. Please try again",
      };
    }
  },

  // ===================================================================
  // UPDATE USER
  // ===================================================================
  /**
   * Memperbarui data pengguna dengan dukungan manajemen avatar fleksibel.
   * Mendukung dua mode:
   * - **Mode Profil**: Mengelola profil sendiri (menggunakan endpoint self)
   * - **Mode Admin**: Mengelola pengguna lain (menggunakan endpoint by ID)
   * 
   * @async
   * @param {string|number} id - ID pengguna yang akan diperbarui
   * @param {Object} userData - Data pembaruan
   * @param {File} [userData.avatar] - File avatar baru (opsional)
   * @param {boolean} [userData.isAvatarRemoved] - Flag untuk menghapus avatar
   * @param {string} [userData.email] - Email baru (divalidasi)
   * @param {string} [userData.password] - Kata sandi baru (minimal 6 karakter)
   * @param {string} [userData.status] - Status baru (ACTIVE/INACTIVE/SUSPENDED)
   * @param {boolean} [isProfileMode=false] - Apakah ini mode profil sendiri
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data pengguna yang diperbarui
   */
  update: async (id, userData, isProfileMode = false) => {
    try {
      const { avatar, isAvatarRemoved, ...profileData } = userData;

      // Validasi data profil
      if (profileData.password && profileData.password.length < 6) {
        return {
          success: false,
          message: "Password must be at least 6 characters",
        };
      }
      if (profileData.email && !baseService.isValidEmail(profileData.email)) {
        return { success: false, message: "Invalid email format" };
      }
      if (
        profileData.status &&
        !["ACTIVE", "INACTIVE", "SUSPENDED"].includes(profileData.status)
      ) {
        return { success: false, message: "Invalid status" };
      }

      // Kirim hanya data profil
      const result = await dataService.users.update(id, profileData);
      if (!result.success) return result;

      // Handle avatar berdasarkan mode
      if (isAvatarRemoved) {
        if (isProfileMode) {
          await usersService.deleteAvatarSelf();
        } else {
          await usersService.deleteAvatarById(id);
        }
      } else if (avatar instanceof File) {
        if (isProfileMode) {
          await usersService.uploadAvatarSelf(avatar);
        } else {
          await usersService.uploadAvatarById(id, avatar);
        }
      }

      // Ambil data terbaru untuk memastikan avatar & profil sinkron
      const freshUser = await dataService.users.getById(id);
      if (freshUser.success) {
        result.data = usersService.processSingleUser(freshUser.data);
      }

      return result;
    } catch (error) {
      console.error("Error in update user:", error);
      return {
        success: false,
        message: "Ops! We couldn't update the user. Please try again",
      };
    }
  },

  // ===================================================================
  // GET CURRENT USER
  // ===================================================================
  /**
   * Mendapatkan data pengguna yang sedang login.
   * Secara otomatis memproses data untuk tampilan UI.
   * 
   * @async
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data pengguna yang diproses
   */
  getCurrentUser: async () => {
    try {
      const result = await dataService.users.getCurrentUser();
      if (!result.success) {
        console.error("❌ usersService: Failed to fetch current user");
        return result;
      }
      const processedUser = usersService.processSingleUser(result.data);
      return { success: true,  processedUser };
    } catch (error) {
      console.error("❌ usersService: Error fetching current user:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the user. Please try again",
      };
    }
  },

  // ===================================================================
  // GET PAGINATED USERS
  // ===================================================================
  /**
   * Mendapatkan daftar pengguna dengan pagination dan pencarian.
   * Secara otomatis memproses data untuk tampilan UI.
   * 
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=8] - Jumlah pengguna per halaman
   * @param {string} [search=""] - String pencarian (nama, email)
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   pagination: Object,
   *   message?: string
   * }} Respons dengan daftar pengguna yang diproses dan metadata pagination
   */
  getPaginated: async (
    page = 1,
    limit = 8,
    search = "",
    bypassCache = false
  ) => {
    try {
      const params = {
        page,
        limit,
        search,
        deletedAt: null,
        bypassCache,
      };

      const result = await dataService.users.getAll(params);

      if (!result.success) {
        return result;
      }

      const processedUsers = usersService.processList(result.data);

      return {
        success: true,
        data:processedUsers,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Error in getPaginated:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the users. Please try again.",
      };
    }
  },

  // ===================================================================
  // SOFT DELETE USER
  // ===================================================================
  /**
   * Melakukan soft delete pengguna (set deletedAt).
   * 
   * @async
   * @param {string|number} id - ID pengguna yang akan dihapus
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan
   */
  softDelete: async (id) => {
    try {
      const result = await dataService.users.softDelete(id);
      return result;
    } catch (error) {
      console.error(`Failed to delete user with ID ${id}:`, error);
      return {
        success: false,
        message: "Oops! We couldn't delete the user. Please try again.",
      };
    }
  },

  // ===================================================================
  // HARD DELETE USER
  // ===================================================================
  /**
   * Melakukan hard delete pengguna (hapus permanen dari database).
   * 
   * @async
   * @param {string|number} id - ID pengguna yang akan dihapus permanen
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan permanen
   */
  hardDelete: async (id) => {
    try {
      const result = await dataService.users.hardDelete(id);

      if (result.success) {
        return {
          success: true,
          message: "User successfully deleted permanently",
        };
      }
      return result;
    } catch (error) {
      console.error("Error in delete user:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't delete the user permanently. Please try again.",
      };
    }
  },

  // ===================================================================
  // GET USER BY ID
  // ===================================================================
  /**
   * Mendapatkan detail pengguna berdasarkan ID.
   * Secara otomatis memproses data untuk tampilan UI.
   * 
   * @async
   * @param {string|number} id - ID pengguna yang diminta
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data pengguna yang diproses
   */
  getById: async (id) => {
    try {
      const result = await dataService.users.getById(id);

      if (result.success && result.data) {
        result.data = usersService.processSingleUser(result.data);
      }

      return result;
    } catch (error) {
      console.error("Error in getById:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the user details. Please try again.",
      };
    }
  },

  // ===================================================================
  // GET TOTAL COUNT
  // ===================================================================
  /**
   * Mendapatkan jumlah total pengguna aktif.
   * Digunakan untuk statistik dashboard.
   * 
   * @async
   * @returns {{ success: boolean, total: number }} Respons dengan jumlah total pengguna
   */
  getTotalCount: async () => {
    try {
      const result = await dataService.users.getAll({
        page: 1,
        limit: 1,
        bypassCache: true,
      });
      if (!result.success) {
        return { success: false, total: 0 };
      }
      return {
        success: true,
        total: result.pagination?.totalItems || 0,
      };
    } catch (error) {
      console.error("Error in usersService.getTotalCount:", error);
      return { success: false, total: 0 };
    }
  },
};