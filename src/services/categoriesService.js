/**
 * @file categoriesService.js
 * @description Layanan terpusat untuk mengelola operasi data kategori produk.
 * Menyediakan abstraksi di atas `dataService.categories` dengan fitur tambahan:
 * - Transformasi data untuk tampilan UI
 * - Formatting tanggal yang konsisten
 * - Dukungan pagination dengan filter
 * - Validasi input dan penanganan error
 * 
 * Setiap kategori produk berisi informasi dasar:
 * - Nama kategori (wajib)
 * - Deskripsi (opsional)
 * - Status aktif/non-aktif
 */

import { dataService } from "./dataService";
import { baseService } from "./baseService";

/**
 * Layanan kategori terpusat.
 * Mengelola semua operasi CRUD dan transformasi terkait data kategori produk.
 * 
 * @namespace categoriesService
 */
export const categoriesService = {
  /**
   * Memproses daftar kategori untuk ditampilkan di UI.
   * Menambahkan properti tanggal yang diformat.
   * 
   * @param {Array<Object>} categories - Daftar kategori dari API
   * @returns {Array<Object>} Daftar kategori yang telah diproses dengan properti tambahan
   * 
   * @example
   * const processedCategories = categoriesService.processList(rawCategories);
   * // Setiap kategori memiliki: createdAtFormatted, updatedAtFormatted
   */
  processList: (categories) => {
    return categories.map((category) => ({
      ...category,
      createdAtFormatted: baseService.formatDateTime(category.createdAt),
      updatedAtFormatted: category.updatedAt
        ? baseService.formatDateTime(category.updatedAt)
        : null,
    }));
  },

  /**
   * Memproses data kategori tunggal untuk ditampilkan di UI.
   * Menambahkan properti tanggal yang diformat.
   * 
   * @param {Object} category - Data kategori dari API
   * @returns {Object} Data kategori yang telah diproses dengan properti tambahan
   * 
   * @example
   * const processedCategory = categoriesService.processSingle(rawCategory);
   * // Kategori memiliki: createdAtFormatted, updatedAtFormatted
   */
  processSingle: (category) => {
    return {
      ...category,
      createdAtFormatted: baseService.formatDateTime(category.createdAt),
      updatedAtFormatted: category.updatedAt
        ? baseService.formatDateTime(category.updatedAt)
        : null,
    };
  },

  /**
   * Mendapatkan semua kategori tanpa pagination.
   * Digunakan untuk dropdown seleksi atau komponen yang membutuhkan data lengkap.
   * 
   * @async
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   message?: string
   * }} Respons dengan daftar kategori yang diproses
   */
  getAll: async () => {
    try {
      const result = await dataService.categories.getAll();
      if (!result.success) return result;
      return {
        success: true,
        data: categoriesService.processList(result.data),
      };
    } catch (error) {
      return {
        success: false,
        message: "Oops! we couldn't load the categories. Please try again",
      };
    }
  },

  /**
   * Mendapatkan detail kategori berdasarkan ID.
   * Secara otomatis memproses formatting tanggal.
   * 
   * @async
   * @param {string|number} id - ID kategori yang diminta
   * @returns {{
   *   success: boolean,
   *   data?: Object,
   *   message?: string
   * }} Respons dengan data kategori yang diproses
   */
  getById: async (id) => {
    try {
      const result = await dataService.categories.getById(id);
      if (!result.success) return result;

      return {
        success: true,
        data: categoriesService.processSingle(result.data),
      };
    } catch (error) {
      return {
        success: false,
        message:
          "Oops! we couldn't load the category details. Please try again",
      };
    }
  },

  // parameter bypassCache
  /**
   * Mendapatkan daftar kategori dengan pagination, pencarian, dan filter.
   * Mendukung filter berdasarkan status aktif dan pencarian teks bebas.
   * 
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=10] - Jumlah kategori per halaman
   * @param {string} [search=""] - String pencarian (nama kategori)
   * @param {Object} [filters={}] - Filter tambahan
   * @param {boolean} [filters.isActive] - Filter berdasarkan status aktif
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   pagination: Object,
   *   message?: string
   * }} Respons dengan daftar kategori yang diproses dan metadata pagination
   */
  getPaginated: async (
    page = 1,
    limit = 10,
    search = "",
    filters = {},
    bypassCache = false
  ) => {
    try {
      const params = {
        page,
        limit,
        deletedAt: null,
        bypassCache,
      };

      if (search) {
        params.search = search;
      }

      if (filters.isActive !== undefined) {
        params.isActive = filters.isActive;
      }

      const result = await dataService.categories.getAll(params);

      if (!result.success) {
        return result;
      }

      const processedCategories = categoriesService.processList(result.data);

      return {
        success: true,
        data: processedCategories,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Error in categoriesService.getPaginated:", error);
      return {
        success: false,
        message: "Oops! we couldn't load the categories. Please try again",
      };
    }
  },

  /**
   * Membuat kategori baru.
   * Melakukan validasi dasar dan memproses data sebelum dikirim ke backend.
   * 
   * @async
   * @param {Object} categoryData - Data kategori yang akan dibuat
   * @param {string} categoryData.name - Nama kategori (wajib)
   * @param {string} [categoryData.description] - Deskripsi kategori (opsional)
   * @param {boolean} categoryData.isActive - Status aktif kategori
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data kategori yang dibuat
   */
  create: async (categoryData) => {
    try {
      const newCategory = {
        name: categoryData.name,
        description: categoryData.description || null,
        isActive: categoryData.isActive,
      };

      const result = await dataService.categories.create(newCategory);

      if (result.success && result.data) {
        result.data = categoriesService.processSingle(result.data);
      }

      return result;
    } catch (error) {
      console.error("Error in create:", error);
      return {
        success: false,
        message: "Oops! We couldn't create the category. Please try again",
      };
    }
  },

  /**
   * Memperbarui kategori yang sudah ada.
   * Melakukan validasi dasar dan memproses data sebelum dikirim ke backend.
   * 
   * @async
   * @param {string|number} id - ID kategori yang akan diperbarui
   * @param {Object} categoryData - Data pembaruan
   * @param {string} categoryData.name - Nama kategori baru
   * @param {string} [categoryData.description] - Deskripsi kategori baru
   * @param {boolean} categoryData.isActive - Status aktif baru
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data kategori yang diperbarui
   */
  update: async (id, categoryData) => {
    try {
      const updateData = {
        name: categoryData.name,
        description: categoryData.description || null,
        isActive: categoryData.isActive,
      };

      const result = await dataService.categories.update(id, updateData);

      if (result.success && result.data) {
        result.data = categoriesService.processSingle(result.data);
      }

      return result;
    } catch (error) {
      console.error("Error in update:", error);
      return {
        success: false,
        message: "Oops! We couldn't update the category. Please try again",
      };
    }
  },

  /**
   * Melakukan soft delete kategori (set deletedAt).
   * 
   * @async
   * @param {string|number} id - ID kategori yang akan dihapus
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan
   */
  softDelete: async (id) => {
    try {
      const result = await dataService.categories.softDelete(id);
      if (result.success) {
        return {
          success: true,
          message: "Category successfully deleted",
        };
      }

      return result;
    } catch (error) {
      console.error("Error in delete:", error);
      return {
        success: false,
        message: "Oops! We couldn't delete the category. Please try again",
      };
    }
  },

  /**
   * Melakukan hard delete kategori (hapus permanen dari database).
   * 
   * @async
   * @param {string|number} id - ID kategori yang akan dihapus permanen
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan permanen
   */
  hardDelete: async (id) => {
    try {
      const result = await dataService.categories.hardDelete(id);
      if (result.success) {
        return {
          success: true,
          message: "Category successfully deleted",
        };
      }

      return result;
    } catch (error) {
      console.error("Error in delete:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't delete the category permanently. Please try again",
      };
    }
  },
};