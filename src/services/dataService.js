/**
 * @file dataService.js
 * @description Layanan terpusat untuk mengelola operasi data entitas aplikasi.
 * Menggunakan `generalApiService` sebagai lapisan bawah dan menambahkan:
 * - Normalisasi respons paginasi
 * - Penanganan FormData untuk upload file (avatar, gambar, logo)
 * - Logika khusus per entitas (misal: blogs, products, brands)
 *
 * Setiap sub-modul mengikuti pola CRUD + soft/hard delete.
 */

import generalApiService from "./generalApiService";
import { separateImages } from "../utils/imageUtils";

/**
 * Menormalisasi respons dari `generalApiService.getAll()` ke format standar.
 * Digunakan oleh semua metode `getAll` di seluruh sub-modul.
 *
 * @param {Object} response - Respons dari generalApiService
 * @param {boolean} response.success - Status keberhasilan
 * @param {any} [response.data] - Data utama
 * @param {Object} [response.meta] - Metadata pagination (jika ada)
 * @param {string} [response.message] - Pesan error (jika gagal)
 * @returns {{
 *   success: boolean,
 *   message?: string,
 *   data?: Array<any>,
 *   pagination?: {
 *     currentPage: number,
 *     totalPages: number,
 *     totalItems: number,
 *     itemsPerPage: number
 *   }
 * }} Respons terformat seragam
 */
export const normalizePaginatedResponse = (response) => {
  if (response.success === false) {
    return {
      success: false,
      message: response.message || "Failed to fetch data",
    };
  }

  // Handle response dengan pagination (seperti products, users, dll)
  if (response.meta) {
    return {
      success: true,
      data: response.data,
      pagination: {
        currentPage: response.meta.page,
        totalPages: response.meta.lastPage,
        totalItems: response.meta.total,
        itemsPerPage: response.meta.perPage,
      },
    };
  }

  // Handle kasus lain
  return {
    success: true,
    data: Array.isArray(response.data) ? response.data : [response.data],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: Array.isArray(response.data) ? response.data.length : 1,
      itemsPerPage: 10,
    },
  };
};

/**
 * Layanan data terpusat untuk semua entitas aplikasi.
 * Diorganisir dalam sub-modul berdasarkan domain (users, clients, catalogs, dll.).
 *
 * @namespace dataService
 */
export const dataService = {
  // =============================================
  // USERS
  // =============================================
  /**
   * Operasi data untuk entitas User.
   * Mendukung manajemen profil dan avatar terpisah.
   */
  users: {
    /**
     * Mengambil daftar pengguna dengan pagination.
     * Secara otomatis menyaring hanya yang tidak dihapus (deletedAt = null).
     *
     * @param {Object} [params={}] - Parameter query (page, limit, search, dll.)
     * @returns {Promise<Object>} Respons terformat dengan `data` dan `pagination`
     */
    getAll: async (params = {}) => {
      const response = await generalApiService.getAll("/users", {
        ...params,
        deletedAt: null,
      });
      return normalizePaginatedResponse(response);
    },

    /**
     * Mengambil detail pengguna berdasarkan ID.
     * @param {string|number} id - ID pengguna
     * @returns {Promise<import("./generalApiService").ApiResponse>} Respons API
     */
    getById: async (id) => {
      return await generalApiService.get(`/users/${id}`);
    },

    /**
     * Membuat pengguna baru.
     * Avatar tidak dikirim dalam payload ini — di-handle terpisah.
     *
     * @param {Object} userData - Data pengguna
     * @param {string} userData.name - Nama lengkap
     * @param {string} userData.email - Email unik
     * @param {string} userData.password - Kata sandi
     * @param {number} userData.roleId - ID peran
     * @param {File} [userData.avatar] - File avatar (akan diabaikan)
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    create: async (userData) => {
      const { avatar, ...profileData } = userData;

      if (
        !profileData.name ||
        !profileData.email ||
        !profileData.password ||
        !profileData.roleId
      ) {
        return {
          success: false,
          message: "Name, email, password, and role are required",
        };
      }

      return await generalApiService.create("/users", profileData);
    },

    /**
     * Memperbarui profil pengguna (tanpa avatar).
     * Password kosong akan dihapus dari payload.
     *
     * @param {string|number} id - ID pengguna
     * @param {Object} userData - Data pembaruan
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    update: async (id, userData) => {
      const { avatar, ...profileData } = userData;

      if (!profileData.password) {
        delete profileData.password;
      }

      return await generalApiService.update("/users", id, profileData);
    },

    /**
     * Soft delete pengguna (set deletedAt).
     * @param {string|number} id - ID pengguna
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    softDelete: async (id) => {
      return await generalApiService.delete(`/users/${id}`);
    },

    /**
     * Hard delete pengguna (hapus permanen dari DB).
     * @param {string|number} id - ID pengguna
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    hardDelete: async (id) => {
      return await generalApiService.delete(`/users/${id}/hard`);
    },

    /**
     * Upload avatar untuk pengguna yang sedang login.
     * @param {File} avatarFile - File gambar
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    uploadAvatarSelf: async (avatarFile) => {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      return await generalApiService.create("/avatar/self", formData);
    },

    /**
     * Hapus avatar pengguna yang sedang login.
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    deleteAvatarSelf: async () => {
      return await generalApiService.delete("/avatar/self");
    },

    /**
     * Upload avatar untuk pengguna lain berdasarkan ID.
     * @param {string|number} id - ID pengguna target
     * @param {File} avatarFile - File gambar
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    uploadAvatarById: async (id, avatarFile) => {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      return await generalApiService.create(`/users/avatar/${id}`, formData);
    },

    /**
     * Hapus avatar pengguna lain berdasarkan ID.
     * @param {string|number} id - ID pengguna target
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    deleteAvatarById: async (id) => {
      return await generalApiService.delete(`/users/avatar/${id}`);
    },

    /**
     * Mendapatkan data pengguna yang sedang login.
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    getCurrentUser: async () => {
      return await generalApiService.get("/auth/me");
    },
  },

  // =============================================
  // CLIENTS
  // =============================================
  /**
   * Operasi data untuk entitas Client (permintaan dari company profile).
   */
  clients: {
    /**
     * Mengambil daftar client dengan pagination.
     * @param {Object} [params={}] - Parameter query
     * @returns {Promise<Object>} Respons terformat
     */
    getAll: async (params = {}) => {
      const response = await generalApiService.getAll("/clients", {
        ...params,
        deletedAt: null,
      });
      return normalizePaginatedResponse(response);
    },

    /**
     * Mengambil detail client berdasarkan ID.
     * @param {string|number} id - ID client
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    getById: async (id) => {
      return await generalApiService.get(`/clients/${id}`);
    },

    /**
     * Membuat client baru (biasanya dari form company profile).
     * @param {Object} clientData - Data client
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    create: async (clientData) => {
      return await generalApiService.create("/clients", clientData);
    },

    /**
     * Memperbarui client.
     * @param {string|number} id - ID client
     * @param {Object} clientData - Data pembaruan
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    update: async (id, clientData) => {
      return await generalApiService.update("/clients", id, clientData);
    },

    /**
     * Menandai client sebagai "replied".
     * @param {string|number} id - ID client
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    reply: async (id) => {
      return await generalApiService.create(`/clients/${id}/reply`);
    },

    /**
     * Soft delete client.
     * @param {string|number} id - ID client
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    softDelete: async (id) => {
      return await generalApiService.delete(`/clients/${id}`);
    },

    /**
     * Hard delete client.
     * @param {string|number} id - ID client
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    hardDelete: async (id) => {
      return await generalApiService.delete(`/clients/${id}/hard`);
    },
  },

  // =============================================
  // CATALOGS
  // =============================================
  /**
   * Operasi data untuk entitas Catalog.
   */
  catalogs: {
    /**
     * Mengambil daftar katalog dengan pagination.
     * @param {Object} [params={}] - Parameter query
     * @returns {Promise<Object>} Respons terformat
     */
    getAll: async (params = {}) => {
      const response = await generalApiService.getAll("/catalogs", {
        ...params,
        deletedAt: null,
      });
      return normalizePaginatedResponse(response);
    },

    /**
     * Mengambil detail katalog berdasarkan ID.
     * @param {string|number} id - ID katalog
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    getById: async (id) => {
      return await generalApiService.get(`/catalogs/${id}`);
    },

    /**
     * Membuat katalog baru.
     * @param {Object} catalogData - Data katalog
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    create: async (catalogData) => {
      return await generalApiService.create("/catalogs", catalogData);
    },

    /**
     * Memperbarui katalog.
     * @param {string|number} id - ID katalog
     * @param {Object} catalogData - Data pembaruan
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    update: async (id, catalogData) => {
      return await generalApiService.update("/catalogs", id, catalogData);
    },

    /**
     * Soft delete katalog.
     * @param {string|number} id - ID katalog
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    softDelete: async (id) => {
      return await generalApiService.delete(`/catalogs/${id}`);
    },

    /**
     * Hard delete katalog.
     * @param {string|number} id - ID katalog
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    hardDelete: async (id) => {
      return await generalApiService.delete(`/catalogs/${id}/hard`);
    },
  },

  // // =============================================
  // // BLOGS
  // // =============================================
  // /**
  //  * Operasi data untuk entitas Blog.
  //  * Mendukung multi-bahasa dan upload gambar.
  //  */
  // blogs: {
  //   /**
  //    * Mengambil daftar blog dengan pagination.
  //    * @param {Object} [params={}] - Parameter query
  //    * @returns {Promise<Object>} Respons terformat
  //    */
  //   getAll: async (params = {}) => {
  //     const response = await generalApiService.getAll("/blogs", {
  //       ...params,
  //       deletedAt: null,
  //     });
  //     return normalizePaginatedResponse(response);
  //   },

  //   /**
  //    * Mengambil detail blog berdasarkan ID.
  //    * @param {string|number} id - ID blog
  //    * @returns {Promise<import("./generalApiService").ApiResponse>}
  //    */
  //   getById: async (id) => {
  //     return await generalApiService.get(`/blogs/${id}`);
  //   },

  //   /**
  //    * Membuat blog baru.
  //    * Menggunakan FormData untuk mendukung upload gambar dan translations.
  //    *
  //    * @param {Object} blogData - Data blog
  //    * @param {File|string} blogData.image - Gambar (File saat create, string path saat edit)
  //    * @param {Array} blogData.translations - Data terjemahan multi-bahasa
  //    * @param {boolean} blogData.isPublished - Status publikasi
  //    * @param {boolean} blogData.isFeatured - Status unggulan
  //    * @returns {Promise<import("./generalApiService").ApiResponse>}
  //    */
  //   create: async (blogData) => {
  //     const formData = new FormData();

  //     Object.entries(blogData).forEach(([key, value]) => {
  //       if (value !== null && value !== undefined) {
  //         if (key === "translations") {
  //           formData.append(key, JSON.stringify(value));
  //         } else if (key === "image") {
  //           if (value instanceof File) {
  //             formData.append("image", value);
  //           } else if (typeof value === "string") {
  //             formData.append("image", value);
  //           }
  //         } else if (key === "isPublished" || key === "isFeatured") {
  //           formData.append(key, String(value));
  //         } else {
  //           formData.append(key, value);
  //         }
  //       }
  //     });

  //     return await generalApiService.create("/blogs", formData);
  //   },

  //   /**
  //    * Memperbarui blog.
  //    * Jika ada file gambar baru → gunakan FormData.
  //    * Jika tidak → kirim sebagai JSON biasa.
  //    *
  //    * @param {string|number} id - ID blog
  //    * @param {Object} blogData - Data pembaruan
  //    * @returns {Promise<import("./generalApiService").ApiResponse>}
  //    */
  //   update: async (id, blogData) => {
  //     const hasNewFile = blogData.image instanceof File;

  //     if (hasNewFile) {
  //       const formData = new FormData();

  //       Object.entries(blogData).forEach(([key, value]) => {
  //         if (value !== null && value !== undefined) {
  //           if (key === "translations") {
  //             formData.append(key, JSON.stringify(value));
  //           } else if (key === "image") {
  //             if (value instanceof File) {
  //               formData.append("image", value);
  //             }
  //           } else if (key === "isPublished" || key === "isFeatured") {
  //             formData.append(key, String(value));
  //           } else {
  //             formData.append(key, value);
  //           }
  //         }
  //       });

  //       return await generalApiService.update("/blogs", id, formData);
  //     } else {
  //       const payload = {
  //         image: blogData.image,
  //         isPublished: blogData.isPublished,
  //         isFeatured: blogData.isFeatured,
  //         translations: blogData.translations,
  //       };

  //       Object.keys(payload).forEach((key) => {
  //         if (payload[key] === undefined) {
  //           delete payload[key];
  //         }
  //       });

  //       return await generalApiService.update("/blogs", id, payload);
  //     }
  //   },

  //   /**
  //    * Soft delete blog.
  //    * @param {string|number} id - ID blog
  //    * @returns {Promise<import("./generalApiService").ApiResponse>}
  //    */
  //   softDelete: async (id) => {
  //     return await generalApiService.delete(`/blogs/${id}`);
  //   },

  //   /**
  //    * Hard delete blog.
  //    * @param {string|number} id - ID blog
  //    * @returns {Promise<import("./generalApiService").ApiResponse>}
  //    */
  //   hardDelete: async (id) => {
  //     return await generalApiService.delete(`/blogs/${id}/hard`);
  //   },
  // },

  // =============================================
  // NOTIFICATIONS
  // =============================================
  /**
   * Operasi data untuk entitas Notification.
   */
  notifications: {
    /**
     * Mengambil daftar notifikasi.
     * @param {Object} [params={}] - Parameter query
     * @returns {Promise<Object>} Respons terformat
     */
    getAll: async (params = {}) => {
      const response = await generalApiService.getAll("/notifications", params);
      return normalizePaginatedResponse(response);
    },

    /**
     * Menandai notifikasi sebagai sudah dibaca.
     * @param {string|number} id - ID notifikasi
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    markAsRead: async (id) => {
      return await generalApiService.patch(`/notifications/${id}/read`);
    },

    /**
     * Mendapatkan jumlah notifikasi belum dibaca.
     * @returns {Promise<{ success: boolean, count: number }>}
     */
    getUnreadCount: async () => {
      const response = await generalApiService.get(
        "/notifications/unread-count"
      );
      return {
        success: true,
        count: response.data?.count || 0,
      };
    },
  },

  // // =============================================
  // // PRODUCTS
  // // =============================================
  // /**
  //  * Operasi data untuk entitas Product.
  //  * Mendukung multi-gambar, multi-bahasa, dan sorting.
  //  */
  // products: {
  //   /**
  //    * Mengambil daftar produk dengan pagination.
  //    * @param {Object} [params={}] - Parameter query
  //    * @returns {Promise<Object>} Respons terformat
  //    */
  //   getAll: async (params = {}) => {
  //     const response = await generalApiService.getAll("/products", {
  //       ...params,
  //       deletedAt: null,
  //     });
  //     return normalizePaginatedResponse(response);
  //   },

  //   /**
  //    * Mengambil detail produk berdasarkan ID.
  //    * @param {string|number} id - ID produk
  //    * @returns {Promise<import("./generalApiService").ApiResponse>}
  //    */
  //   getById: async (id) => {
  //     return await generalApiService.get(`/products/${id}`);
  //   },

  //   /**
  //    * Membuat produk baru.
  //    * Menggunakan FormData untuk upload gambar dan translations.
  //    *
  //    * @param {Object} productData - Data produk
  //    * @param {Array<File|{file: File}>} productData.images - Daftar gambar
  //    * @param {Array} productData.translations - Data terjemahan
  //    * @param {boolean} productData.isActive - Status aktif
  //    * @param {boolean} productData.isFeatured - Status unggulan
  //    * @param {number} productData.sortOrder - Urutan tampilan
  //    * @returns {Promise<import("./generalApiService").ApiResponse>}
  //    */
  //   create: async (productData) => {
  //     const formData = new FormData();

  //     let imageFiles = [];
  //     if (Array.isArray(productData.images) && productData.images.length > 0) {
  //       imageFiles = productData.images
  //         .map((img) => {
  //           if (img && img.file instanceof File) {
  //             return img.file;
  //           } else if (img instanceof File) {
  //             return img;
  //           }
  //           return null;
  //         })
  //         .filter(Boolean);
  //     }

  //     Object.entries(productData).forEach(([key, value]) => {
  //       if (value === null || value === undefined) return;

  //       if (key === "translations") {
  //         formData.append("translations", JSON.stringify(value));
  //       } else if (key === "images") {
  //         imageFiles.forEach((file) => {
  //           formData.append("images", file);
  //         });
  //       } else if (key === "isActive" || key === "isFeatured") {
  //         formData.append(key, value ? "true" : "false");
  //       } else if (key === "sortOrder") {
  //         formData.append(key, String(value));
  //       } else {
  //         formData.append(key, value);
  //       }
  //     });

  //     return await generalApiService.create("/products", formData);
  //   },

  //   /**
  //    * Memperbarui produk.
  //    * Memisahkan gambar baru (File) dan path gambar lama menggunakan `separateImages`.
  //    *
  //    * @param {string|number} id - ID produk
  //    * @param {Object} productData - Data pembaruan
  //    * @returns {Promise<import("./generalApiService").ApiResponse>}
  //    */
  //   update: async (id, productData) => {
  //     const formData = new FormData();

  //     let newFiles = [];
  //     let existingPaths = [];

  //     if (Array.isArray(productData.images) && productData.images.length > 0) {
  //       const result = separateImages(productData.images);
  //       newFiles = result.newFiles;
  //       existingPaths = result.existingPaths;
  //     }

  //     Object.entries(productData).forEach(([key, value]) => {
  //       if (value === null || value === undefined) return;

  //       if (key === "translations") {
  //         formData.append("translations", JSON.stringify(value));
  //       } else if (key === "images") {
  //         if (existingPaths.length > 0) {
  //           formData.append("images", JSON.stringify(existingPaths));
  //         }
  //         if (newFiles.length > 0) {
  //           newFiles.forEach((file) => {
  //             formData.append("images", file);
  //           });
  //         }
  //       } else if (key === "isActive" || key === "isFeatured") {
  //         formData.append(key, value ? "true" : "false");
  //       } else if (key === "sortOrder") {
  //         formData.append(key, String(value));
  //       } else {
  //         formData.append(key, value);
  //       }
  //     });

  //     return await generalApiService.update("/products", id, formData);
  //   },

  //   /**
  //    * Soft delete produk.
  //    * @param {string|number} id - ID produk
  //    * @returns {Promise<import("./generalApiService").ApiResponse>}
  //    */
  //   softDelete: async (id) => {
  //     return await generalApiService.delete(`/products/${id}`);
  //   },

  //   /**
  //    * Hard delete produk.
  //    * @param {string|number} id - ID produk
  //    * @returns {Promise<import("./generalApiService").ApiResponse>}
  //    */
  //   hardDelete: async (id) => {
  //     return await generalApiService.delete(`/products/${id}/hard`);
  //   },
  // },

  // =============================================
  // CATEGORIES
  // =============================================
  /**
   * Operasi data untuk entitas Category.
   */
  categories: {
    /**
     * Mengambil daftar kategori.
     * @param {Object} [params={}] - Parameter query
     * @returns {Promise<Object>} Respons terformat
     */
    getAll: async (params = {}) => {
      const response = await generalApiService.getAll("/categories", params);
      return normalizePaginatedResponse(response);
    },

    /**
     * Mengambil detail kategori berdasarkan ID.
     * @param {string|number} id - ID kategori
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    getById: async (id) => {
      return await generalApiService.get(`/categories/${id}`);
    },

    /**
     * Membuat kategori baru.
     * @param {Object} categoryData - Data kategori
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    create: async (categoryData) => {
      return await generalApiService.create("/categories", categoryData);
    },

    /**
     * Memperbarui kategori.
     * @param {string|number} id - ID kategori
     * @param {Object} categoryData - Data pembaruan
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    update: async (id, categoryData) => {
      return await generalApiService.update("/categories", id, categoryData);
    },

    /**
     * Soft delete kategori.
     * @param {string|number} id - ID kategori
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    softDelete: async (id) => {
      return await generalApiService.delete(`/categories/${id}`);
    },

    /**
     * Hard delete kategori.
     * @param {string|number} id - ID kategori
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    hardDelete: async (id) => {
      return await generalApiService.delete(`/categories/${id}/hard`);
    },

    /**
     * Mengambil kategori berdasarkan status aktif.
     * @param {'active'|'inactive'} status - Status yang diinginkan
     * @returns {Promise<Object>} Respons terformat
     */
    getByStatus: async (status) => {
      const response = await generalApiService.getAll("/categories", {
        isActive: status === "active",
        deletedAt: null,
      });
      return normalizePaginatedResponse(response);
    },
  },

  // =============================================
  // BRANDS
  // =============================================
  /**
   * Operasi data untuk entitas Brand.
   * Mendukung upload logo dan pengurutan.
   */
  brands: {
    /**
     * Mengambil daftar brand dengan pagination.
     * @param {Object} [params={}] - Parameter query
     * @returns {Promise<Object>} Respons terformat
     */
    getAll: async (params = {}) => {
      const response = await generalApiService.getAll("/brands", {
        ...params,
        deletedAt: null,
      });
      return normalizePaginatedResponse(response);
    },

    /**
     * Mengambil detail brand berdasarkan ID.
     * @param {string|number} id - ID brand
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    getById: async (id) => {
      return await generalApiService.get(`/brands/${id}`);
    },

    /**
     * Membuat brand baru.
     * Menggunakan FormData jika ada logo (File).
     *
     * @param {Object} brandData - Data brand
     * @param {string} brandData.name - Nama brand
     * @param {string} brandData.slug - Slug unik
     * @param {string} brandData.type - Tipe brand
     * @param {File} [brandData.logo] - Logo brand
     * @param {number} brandData.sortOrder - Urutan tampilan
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    create: async (brandData) => {
      const formData = new FormData();

      Object.entries(brandData).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        if (key === "logo" && value instanceof File) {
          formData.append("logo", value);
        } else if (key === "sortOrder") {
          formData.append("sortOrder", String(value));
        } else if (key !== "logo") {
          formData.append(key, String(value));
        }
      });

      return await generalApiService.create("/brands", formData);
    },

    /**
     * Memperbarui brand.
     * Jika logo berupa File → gunakan FormData.
     * Jika tidak → kirim sebagai JSON.
     *
     * @param {string|number} id - ID brand
     * @param {Object} brandData - Data pembaruan
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    update: async (id, brandData) => {
      if (brandData.logo instanceof File) {
        const formData = new FormData();

        Object.entries(brandData).forEach(([key, value]) => {
          if (value === undefined) return;
          if (key === "sortOrder") {
            formData.append("sortOrder", String(value));
            return;
          }
          formData.append(key, value);
        });

        return await generalApiService.update("/brands", id, formData);
      }

      const payload = {};
      Object.entries(brandData).forEach(([key, value]) => {
        if (value === undefined) return;
        if (
          key === "logo" &&
          typeof value === "object" &&
          value !== null &&
          !(value instanceof File)
        ) {
          return;
        }
        if (key === "sortOrder") {
          payload.sortOrder = Number(value);
          return;
        }
        payload[key] = value;
      });

      return await generalApiService.update("/brands", id, payload);
    },

    /**
     * Soft delete brand.
     * @param {string|number} id - ID brand
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    softDelete: async (id) => {
      return await generalApiService.delete(`/brands/${id}`);
    },

    /**
     * Hard delete brand.
     * @param {string|number} id - ID brand
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    hardDelete: async (id) => {
      return await generalApiService.delete(`/brands/${id}/hard`);
    },
  },

  // =============================================
  // ANALYTICS
  // =============================================
  /**
   * Operasi data untuk entitas Analytics.
   */
  analytics: {
    /**
     * Mengambil data analitik.
     * @param {Object} [params={}] - Parameter query
     * @returns {Promise<Object>} Respons terformat
     */
    getAll: async (params = {}) => {
      const response = await generalApiService.getAll("/analytics", params);
      return normalizePaginatedResponse(response);
    },

    /**
     * Mengambil data analitik berdasarkan rentang tanggal.
     * @param {string} startDate - Tanggal mulai (YYYY-MM-DD)
     * @param {string} endDate - Tanggal akhir (YYYY-MM-DD)
     * @returns {Promise<Object>} Respons terformat
     */
    getByDateRange: async (startDate, endDate) => {
      const response = await generalApiService.getAll("/analytics", {
        startDate,
        endDate,
      });
      return normalizePaginatedResponse(response);
    },

    /**
     * Mengambil data page views.
     * @param {Object} [params={}] - Parameter query
     * @returns {Promise<Object>} Respons terformat
     */
    getPageViews: async (params = {}) => {
      const response = await generalApiService.getAll(
        "/analytics/page-views",
        params
      );
      return normalizePaginatedResponse(response);
    },

    /**
     * Mengambil data page views berdasarkan rentang tanggal.
     * @param {string} startDate - Tanggal mulai
     * @param {string} endDate - Tanggal akhir
     * @returns {Promise<Object>} Respons terformat
     */
    getPageViewsByDateRange: async (startDate, endDate) => {
      const response = await generalApiService.getAll("/analytics/page-views", {
        startDate,
        endDate,
      });
      return normalizePaginatedResponse(response);
    },
  },

  // =============================================
  // GALLERY
  // =============================================
  /**
   * Operasi data untuk entitas Gallery.
   * Hanya mendukung upload gambar (File).
   */
  gallery: {
    /**
     * Mengambil daftar galeri dengan pagination.
     * @param {Object} [params={}] - Parameter query
     * @returns {Promise<Object>} Respons terformat
     */
    getAll: async (params = {}) => {
      const response = await generalApiService.getAll("/galleries", {
        ...params,
        deletedAt: null,
      });
      return normalizePaginatedResponse(response);
    },

    /**
     * Mengambil detail galeri berdasarkan ID.
     * @param {string|number} id - ID galeri
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    getById: async (id) => {
      return await generalApiService.get(`/galleries/${id}`);
    },

    /**
     * Membuat entri galeri baru.
     * Harus menyertakan File gambar.
     *
     * @param {Object} galleryData - Data galeri
     * @param {File} galleryData.image - Gambar wajib
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     * @throws {Error} Jika image bukan File
     */
    create: async (galleryData) => {
      const formData = new FormData();

      if (!(galleryData.image instanceof File)) {
        throw new Error("Image must be a File object");
      }

      formData.append("image", galleryData.image);

      return await generalApiService.create("/galleries", formData);
    },

    /**
     * Soft delete galeri.
     * @param {string|number} id - ID galeri
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    softDelete: async (id) => {
      return await generalApiService.delete(`/galleries/${id}`);
    },

    /**
     * Hard delete galeri.
     * @param {string|number} id - ID galeri
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    hardDelete: async (id) => {
      return await generalApiService.delete(`/galleries/${id}/hard`);
    },
  },

  // =============================================
  // ROLES
  // =============================================
  /**
   * Operasi data untuk entitas Role.
   */
  roles: {
    /**
     * Mengambil daftar peran dengan pagination.
     * @param {Object} [params={}] - Parameter query
     * @returns {Promise<Object>} Respons terformat
     */
    getAll: async (params = {}) => {
      const response = await generalApiService.getAll("/roles", {
        ...params,
        deletedAt: null,
      });
      return normalizePaginatedResponse(response);
    },

    /**
     * Mengambil detail peran berdasarkan ID.
     * @param {string|number} id - ID peran
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    getById: async (id) => {
      return await generalApiService.get(`/roles/${id}`);
    },

    /**
     * Membuat peran baru.
     * @param {Object} data - Data peran
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    create: async (data) => {
      return await generalApiService.create("/roles", data);
    },

    /**
     * Memperbarui peran.
     * @param {string|number} id - ID peran
     * @param {Object} data - Data pembaruan
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    update: async (id, data) => {
      return await generalApiService.update("/roles", id, data);
    },

    /**
     * Soft delete peran.
     * @param {string|number} id - ID peran
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    softDelete: async (id) => {
      return await generalApiService.delete(`/roles/${id}`);
    },

    /**
     * Hard delete peran.
     * @param {string|number} id - ID peran
     * @returns {Promise<import("./generalApiService").ApiResponse>}
     */
    hardDelete: async (id) => {
      return await generalApiService.delete(`/roles/${id}/hard`);
    },
  },

  // =============================================
  // AUDIT LOGS
  // =============================================
  /**
   * Operasi data untuk entitas AuditLog.
   */
  auditLogs: {
    /**
     * Mengambil daftar log audit.
     * @param {Object} [params={}] - Parameter query (page, limit, action, dll.)
     * @returns {Promise<Object>} Respons terformat
     */
    getAll: async (params = {}) => {
      const response = await generalApiService.getAll("/audit-logs", params);
      return normalizePaginatedResponse(response);
    },
  },
};