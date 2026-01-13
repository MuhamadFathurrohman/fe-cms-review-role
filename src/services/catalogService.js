/**
 * @file catalogService.js
 * @description Layanan terpusat untuk mengelola operasi data katalog.
 * Menyediakan abstraksi di atas `dataService.catalogs` dengan fitur tambahan:
 * - Validasi data katalog (nama, Google Drive link)
 * - Transformasi data untuk tampilan UI
 * - Dukungan pagination dengan filter
 * - Penanganan error yang konsisten
 * 
 * Khusus untuk validasi Google Drive link:
 * - Hanya menerima domain `drive.google.com`
 * - Harus mengarah ke file spesifik (`/file/d/{fileId}`)
 * - Memvalidasi format URL yang benar
 */

import { dataService } from "./dataService";
import { baseService } from "./baseService";

/**
 * Layanan katalog terpusat.
 * Mengelola semua operasi CRUD dan validasi terkait data katalog.
 * 
 * @namespace catalogService
 */
const catalogService = {
  // UPDATE: Tambah parameter bypassCache
  /**
   * Mendapatkan daftar katalog dengan pagination, pencarian, dan filter.
   * Mendukung filter berdasarkan status dan pencarian teks bebas.
   * 
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=10] - Jumlah katalog per halaman
   * @param {string} [search=""] - String pencarian (nama katalog)
   * @param {Object} [filters={}] - Filter tambahan
   * @param {string} [filters.status] - Filter berdasarkan status katalog
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   pagination: Object,
   *   message?: string
   * }} Respons dengan daftar katalog yang diformat dan metadata pagination
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

      // Tambahkan filter lain jika perlu
      if (filters.status) {
        params.status = filters.status;
      }

      const result = await dataService.catalogs.getAll(params);

      if (!result.success) {
        return result;
      }

      const formattedData = result.data.map(
        catalogService.formatCatalogForDisplay
      );

      return {
        success: true,
        data: formattedData,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Failed to fetch catalogs:", error);
      return {
        success: false,
        message: "Oops! we couldn't load the catalogs. Please try again",
      };
    }
  },

  /**
   * Membuat katalog baru.
   * Data harus divalidasi sebelum dipanggil service ini.
   * 
   * @async
   * @param {Object} catalogData - Data katalog yang akan dibuat
   * @param {string} catalogData.name - Nama katalog
   * @param {string} catalogData.file - Google Drive link file
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data katalog yang dibuat
   */
  create: async (catalogData) => {
    try {
      const result = await dataService.catalogs.create(catalogData);
      return result;
    } catch (error) {
      console.error("Failed to create new catalog:", error);
      return {
        success: false,
        message: "Oops! we couldn't create the catalog. Please try again",
      };
    }
  },

  /**
   * Memperbarui katalog yang sudah ada.
   * 
   * @async
   * @param {string|number} id - ID katalog yang akan diperbarui
   * @param {Object} updatedData - Data pembaruan
   * @param {string} [updatedData.name] - Nama katalog baru
   * @param {string} [updatedData.file] - Google Drive link baru
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data katalog yang diperbarui
   */
  update: async (id, updatedData) => {
    try {
      const result = await dataService.catalogs.update(id, updatedData);
      return result;
    } catch (error) {
      console.error(`Failed to update catalog with ID ${id}:`, error);
      return {
        success: false,
        message: "Oops! we couldn't update the catalog. Please try again",
      };
    }
  },

  /**
   * Melakukan soft delete katalog (set deletedAt).
   * 
   * @async
   * @param {string|number} id - ID katalog yang akan dihapus
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan
   */
  softDelete: async (id) => {
    try {
      const result = await dataService.catalogs.softDelete(id);
      if (result.success) {
        return {
          success: true,
          message: "Catalog successfully deleted",
        };
      }
    } catch (error) {
      console.error(`Failed to delete catalog with ID ${id}:`, error);
      return {
        success: false,
        message: "Oops! we couldn't delete the catalog. Please try again",
      };
    }
  },

  /**
   * Melakukan hard delete katalog (hapus permanen dari database).
   * 
   * @async
   * @param {string|number} id - ID katalog yang akan dihapus permanen
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan permanen
   */
  hardDelete: async (id) => {
    try {
      const result = await dataService.catalogs.hardDelete(id);
      if (result.success) {
        return {
          success: true,
          message: "Catalog successfully deleted permanently",
        };
      }
      return result;
    } catch (error) {
      console.error(`Failed to delete catalog with ID ${id}:`, error);
      return {
        success: false,
        message:
          "Oops! we couldn't delete the catalog permanently. Please try again",
      };
    }
  },

  /**
   * Mendapatkan detail katalog berdasarkan ID.
   * 
   * @async
   * @param {string|number} id - ID katalog yang diminta
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data katalog
   */
  getById: async (id) => {
    try {
      const result = await dataService.catalogs.getById(id);
      return result;
    } catch (error) {
      console.error(`Failed to fetch catalog with ID ${id}:`, error);
      return {
        success: false,
        message: "Oops! we couldn't load the catalog details. Please try again",
      };
    }
  },

  // Helper functions (dipertahankan)
  /**
   * Memformat data katalog untuk ditampilkan di UI.
   * Menambahkan properti tanggal yang diformat.
   * 
   * @param {Object} catalog - Data katalog dari API
   * @returns {Object} Data katalog yang telah diformat dengan properti tambahan
   * 
   * @example
   * const formattedCatalog = catalogService.formatCatalogForDisplay(rawCatalog);
   * // Hasil memiliki: formattedCreatedAt, formattedUpdatedAt
   */
  formatCatalogForDisplay: (catalog) => {
    const formattedCreatedAt = baseService.formatDateTime(catalog.createdAt);
    const formattedUpdatedAt = catalog.updatedAt
      ? baseService.formatDateTime(catalog.updatedAt)
      : null;

    return {
      ...catalog,
      formattedCreatedAt,
      formattedUpdatedAt,
    };
  },

  /**
   * Memvalidasi data katalog sebelum disimpan.
   * Melakukan validasi ketat terhadap:
   * - Nama katalog (wajib, maks 200 karakter)
   * - Google Drive link (domain, path, format)
   * 
   * @param {Object} catalogData - Data katalog yang akan divalidasi
   * @param {string} catalogData.name - Nama katalog
   * @param {string} catalogData.file - Google Drive link
   * @returns {{
   *   isValid: boolean,
   *   errors: string[]
   * }} Hasil validasi dengan daftar error jika tidak valid
   * 
   * @example
   * const validation = catalogService.validateCatalogData({
   *   name: "Product Catalog",
   *   file: "https://drive.google.com/file/d/123456789/view"
   * });
   * // validation.isValid === true
   */
  validateCatalogData: (catalogData) => {
    const errors = [];

    if (!catalogData.name || catalogData.name.trim().length === 0) {
      errors.push("Catalog name is required.");
    } else if (catalogData.name.length > 200) {
      errors.push("Catalog name must not exceed 200 characters.");
    }

    const fileUrl = catalogData.file?.trim();
    if (!fileUrl) {
      errors.push("Google Drive link is required.");
    } else {
      try {
        const parsed = new URL(fileUrl);
        if (parsed.hostname !== "drive.google.com") {
          errors.push("Only Google Drive links are allowed.");
        } else if (!parsed.pathname.startsWith("/file/d/")) {
          errors.push("Link must point to a valid Google Drive file.");
        } else {
          const fileId = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (!fileId) {
            errors.push("Invalid Google Drive file URL format.");
          }
        }
      } catch (e) {
        errors.push("Please enter a valid URL.");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

export default catalogService;