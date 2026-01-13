/**
 * @file galleryService.js
 * @description Layanan terpusat untuk mengelola operasi data galeri gambar.
 * Menyediakan abstraksi di atas `dataService.gallery` dengan fitur tambahan:
 * - Transformasi URL gambar lengkap
 * - Formatting tanggal untuk tampilan UI
 * - Validasi input ketat untuk operasi CRUD
 * - Dukungan pagination dengan cache control
 * 
 * Setiap entri galeri berisi satu gambar yang diupload melalui form,
 * dengan validasi bahwa hanya file gambar yang diterima.
 */

import { dataService } from "./dataService";
import { baseService } from "./baseService";

/**
 * Layanan galeri terpusat.
 * Mengelola semua operasi CRUD dan transformasi terkait data galeri.
 * 
 * @namespace galleryService
 */
export const galleryService = {
  /**
   * Menghasilkan URL lengkap untuk gambar galeri.
   * Mendeteksi apakah path sudah merupakan URL lengkap atau perlu digabungkan dengan base URL.
   * 
   * @param {string|null|undefined} imagePath - Path gambar dari backend
   * @returns {string|null} URL lengkap gambar atau null jika path tidak valid
   * 
   * @example
   * // Path relatif
   * galleryService._getFullImageUrl("galleries/image123.jpg");
   * // → "https://api.example.com/galleries/image123.jpg"
   * 
   * @example
   * // URL lengkap
   * galleryService._getFullImageUrl("https://external.com/image.jpg");
   * // → "https://external.com/image.jpg"
   */
  _getFullImageUrl: (imagePath) => {
    if (!imagePath) return null;

    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    const apiBaseUrl = import.meta.env.VITE_PHOTO_URL || "";

    const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    return `${apiBaseUrl}${cleanPath}`;
  },

  // parameter bypassCache
  /**
   * Mendapatkan daftar galeri dengan pagination.
   * Mendukung kontrol cache untuk data segar setelah operasi CRUD.
   * 
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=10] - Jumlah galeri per halaman
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   pagination: Object,
   *   message?: string
   * }} Respons dengan daftar galeri yang diproses dan metadata pagination
   */
  getPaginated: async (
    page = 1,
    limit = 10,
    bypassCache = false
  ) => {
    try {
      const params = {
        page,
        limit,
        deletedAt: null,
        bypassCache,
      };

      const result = await dataService.gallery.getAll(params);

      if (!result.success) {
        return result;
      }

      const processedData = result.data.map((item) => ({
        ...item,
        imageUrl: galleryService._getFullImageUrl(item.image),
        createdAtFormatted: baseService.formatDateTime(item.createdAt),
        deletedAtFormatted: item.deletedAt
          ? baseService.formatDateTime(item.deletedAt)
          : null,
      }));

      return {
        success: true,
        data: processedData,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Error in galleryService.getPaginated:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the gallery. Please try again.",
      };
    }
  },

  /**
   * Mendapatkan semua galeri tanpa pagination.
   * Digunakan untuk dropdown seleksi atau komponen yang membutuhkan data lengkap.
   * 
   * @async
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   message?: string
   * }} Respons dengan daftar galeri yang diproses
   */
  getAll: async () => {
    try {
      const result = await dataService.gallery.getAll();
      if (!result.success) return result;

      const data = (result.data || []).map((item) => ({
        ...item,
        imageUrl: galleryService._getFullImageUrl(item.image),
        createdAtFormatted: baseService.formatDateTime(item.createdAt),
        deletedAtFormatted: item.deletedAt
          ? baseService.formatDateTime(item.deletedAt)
          : null,
      }));

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error("Error in galleryService.getAll:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the gallery. Please try again.",
      };
    }
  },

  /**
   * Mendapatkan detail galeri berdasarkan ID.
   * Secara otomatis memproses URL gambar dan formatting tanggal.
   * 
   * @async
   * @param {string|number} id - ID galeri yang diminta
   * @returns {{
   *   success: boolean,
   *   data?: Object,
   *   message?: string
   * }} Respons dengan data galeri yang diproses
   */
  getById: async (id) => {
    try {
      const result = await dataService.gallery.getById(id);
      if (!result.success) return result;

      const processedData = {
        ...result.data,
        imageUrl: galleryService._getFullImageUrl(result.data.image),
        createdAtFormatted: baseService.formatDateTime(result.data.createdAt),
        deletedAtFormatted: result.data.deletedAt
          ? baseService.formatDateTime(result.data.deletedAt)
          : null,
      };

      return {
        success: true,
        data: processedData,
      };
    } catch (error) {
      console.error("Error in galleryService.getById:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't load the gallery details. Please try again.",
      };
    }
  },

  /**
   * Membuat entri galeri baru dengan gambar.
   * Melakukan validasi ketat bahwa input adalah instance File.
   * 
   * @async
   * @param {Object} galleryData - Data galeri yang akan dibuat
   * @param {File} galleryData.image - File gambar yang diupload
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data galeri yang dibuat
   */
  create: async (galleryData) => {
    try {
      if (!galleryData.image || !(galleryData.image instanceof File)) {
        return {
          success: false,
          message: "Image is required and must be a file",
        };
      }

      return await dataService.gallery.create(galleryData);
    } catch (error) {
      console.error("Error in galleryService.create:", error);
      return {
        success: false,
        message: "Oops! We couldn't create the gallery. Please try again.",
      };
    }
  },

  /**
   * Memperbarui entri galeri yang sudah ada dengan gambar baru.
   * Melakukan validasi ketat bahwa input adalah instance File.
   * 
   * @async
   * @param {string|number} id - ID galeri yang akan diperbarui
   * @param {Object} galleryData - Data pembaruan
   * @param {File} galleryData.image - File gambar baru
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data galeri yang diperbarui
   */
  update: async (id, galleryData) => {
    try {
      if (!galleryData.image || !(galleryData.image instanceof File)) {
        return {
          success: false,
          message: "Image is required and must be a file",
        };
      }

      return await dataService.gallery.update(id, galleryData);
    } catch (error) {
      console.error("Error in galleryService.update:", error);
      return {
        success: false,
        message: "Oops! We couldn't update the gallery. Please try again.",
      };
    }
  },

  /**
   * Melakukan soft delete galeri (set deletedAt).
   * 
   * @async
   * @param {string|number} id - ID galeri yang akan dihapus
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan
   */
  softDelete: async (id) => {
    try {
      return await dataService.gallery.softDelete(id);
    } catch (error) {
      console.error("Error in galleryService.delete:", error);
      return {
        success: false,
        message: "Oops! We couldn't delete the gallery. Please try again.",
      };
    }
  },

  /**
   * Melakukan hard delete galeri (hapus permanen dari database).
   * 
   * @async
   * @param {string|number} id - ID galeri yang akan dihapus permanen
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan permanen
   */
  hardDelete: async (id) => {
    try {
      return await dataService.gallery.hardDelete(id);
    } catch (error) {
      console.error("Error in galleryService.delete:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't delete the gallery permanently. Please try again.",
      };
    }
  },
};