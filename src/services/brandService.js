/**
 * @file brandService.js
 * @description Layanan terpusat untuk mengelola operasi data brand/merek.
 * Menyediakan abstraksi di atas `dataService.brands` dengan fitur tambahan:
 * - Transformasi URL logo lengkap
 * - Formatting tanggal untuk tampilan UI
 * - Validasi input ketat untuk operasi CRUD
 * - Dukungan pagination dengan filter
 * 
 * Setiap entri brand berisi informasi dasar:
 * - Nama brand (wajib)
 * - Tipe brand (default: "PRODUCT")
 * - Logo brand (opsional)
 * - Urutan tampilan (sortOrder)
 * - Status publikasi
 */

import { dataService } from "./dataService";
import { baseService } from "./baseService";

/**
 * Layanan brand terpusat.
 * Mengelola semua operasi CRUD dan transformasi terkait data brand.
 * 
 * @namespace brandService
 */
export const brandService = {
  /**
   * Menghasilkan URL lengkap untuk logo brand.
   * Mendeteksi apakah path sudah merupakan URL lengkap atau perlu digabungkan dengan base URL.
   * 
   * @param {string|null|undefined} logoPath - Path logo dari backend
   * @returns {string|null} URL lengkap logo atau null jika path tidak valid
   * 
   * @example
   * // Path relatif
   * brandService._getFullLogoUrl("brands/logo123.png");
   * // → "https://api.example.com/brands/logo123.png"
   * 
   * @example
   * // URL lengkap
   * brandService._getFullLogoUrl("https://external.com/logo.png");
   * // → "https://external.com/logo.png"
   */
  _getFullLogoUrl: (logoPath) => {
    if (!logoPath) return null;

    if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) {
      return logoPath;
    }
    const apiBaseUrl = import.meta.env.VITE_PHOTO_URL || "";

    const cleanPath = logoPath.startsWith("/") ? logoPath : `/${logoPath}`;
    return `${apiBaseUrl}${cleanPath}`;
  },

  /**
   * Memproses daftar brand untuk ditampilkan di UI.
   * Menambahkan properti yang diformat dan URL logo lengkap.
   * 
   * @param {Array<Object>} brands - Daftar brand dari API
   * @returns {Array<Object>} Daftar brand yang telah diproses dengan properti tambahan
   * 
   * @example
   * const processedBrands = brandService.processList(rawBrands);
   * // Setiap brand memiliki: logoUrl, createdAtFormatted, sortOrder
   */
  processList: (brands) => {
    return brands.map((brand) => ({
      ...brand,
      logoUrl: brandService._getFullLogoUrl(brand.logo),
      createdAtFormatted: baseService.formatDateTime(brand.createdAt),
      updatedAtFormatted: brand.updatedAt
        ? baseService.formatDateTime(brand.updatedAt)
        : null,
      sortOrder: brand.sortOrder || 0,
    }));
  },

  /**
   * Memproses data brand tunggal untuk ditampilkan di UI.
   * Menambahkan properti yang diformat dan URL logo lengkap.
   * 
   * @param {Object} brand - Data brand dari API
   * @returns {Object|null} Data brand yang telah diproses atau null jika input tidak valid
   * 
   * @example
   * const processedBrand = brandService.processSingle(rawBrand);
   * // Brand memiliki: logoUrl, createdAtFormatted, sortOrder
   */
  processSingle: (brand) => {
    if (!brand) return null;
    return {
      ...brand,
      logoUrl: brandService._getFullLogoUrl(brand.logo),
      createdAtFormatted: baseService.formatDateTime(brand.createdAt),
      updatedAtFormatted: brand.updatedAt
        ? baseService.formatDateTime(brand.updatedAt)
        : null,
      sortOrder: brand.sortOrder || 0,
    };
  },

  /**
   * Mendapatkan semua brand tanpa pagination.
   * Digunakan untuk dropdown seleksi atau komponen yang membutuhkan data lengkap.
   * 
   * @async
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   message?: string
   * }} Respons dengan daftar brand yang diproses
   */
  getAll: async () => {
    try {
      const result = await dataService.brands.getAll();
      if (!result.success) return result;
      return {
        success: true,
        data: brandService.processList(result.data),
      };
    } catch (error) {
      console.error("Error in brandService.getAll:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the brands. Please try again",
      };
    }
  },

  /**
   * Mendapatkan detail brand berdasarkan ID.
   * Secara otomatis memproses URL logo dan formatting tanggal.
   * 
   * @async
   * @param {string|number} id - ID brand yang diminta
   * @returns {{
   *   success: boolean,
   *   data?: Object,
   *   message?: string
   * }} Respons dengan data brand yang diproses
   */
  getById: async (id) => {
    try {
      const result = await dataService.brands.getById(id);
      if (!result.success) return result;
      return {
        success: true,
        data: brandService.processSingle(result.data),
      };
    } catch (error) {
      return {
        success: false,
        message: "Oops! We couldn't load the brand details. Please try again",
      };
    }
  },

  // Tambah parameter bypassCache
  /**
   * Mendapatkan daftar brand dengan pagination, pencarian, dan filter.
   * Mendukung filter berdasarkan status publikasi dan tipe brand.
   * 
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=10] - Jumlah brand per halaman
   * @param {string} [search=""] - String pencarian (nama brand)
   * @param {Object} [filters={}] - Filter tambahan
   * @param {boolean} [filters.isPublished] - Filter berdasarkan status publikasi
   * @param {string} [filters.type] - Filter berdasarkan tipe brand
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   pagination: Object,
   *   message?: string
   * }} Respons dengan daftar brand yang diproses dan metadata pagination
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

      if (filters.isPublished !== undefined) {
        params.isPublished = filters.isPublished;
      }
      if (filters.type) {
        params.type = filters.type;
      }

      const result = await dataService.brands.getAll(params);

      if (!result.success) {
        return result;
      }

      const processedBrands = brandService.processList(result.data);

      return {
        success: true,
        data: processedBrands,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Error in brandService.getPaginated:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the brands. Please try again",
      };
    }
  },

  /**
   * Membuat brand baru.
   * Melakukan validasi ketat dan memproses data sebelum dikirim ke backend.
   * 
   * @async
   * @param {Object} brandData - Data brand yang akan dibuat
   * @param {string} brandData.name - Nama brand (wajib)
   * @param {string} [brandData.type="PRODUCT"] - Tipe brand
   * @param {number} [brandData.sortOrder=0] - Urutan tampilan
   * @param {File|string|null} [brandData.logo] - Logo brand (opsional)
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data brand yang dibuat
   */
  create: async (brandData) => {
    try {
      if (!brandData.name?.trim()) {
        return { success: false, message: "Brand name is required" };
      }

      const processedData = {
        name: brandData.name.trim(),
        type: brandData.type || "PRODUCT",
        sortOrder: Number(brandData.sortOrder) || 0,
        logo: brandData.logo || null,
      };

      return await dataService.brands.create(processedData);
    } catch (error) {
      console.error("Error in brandService.create:", error);
      return {
        success: false,
        message: "Oops! We couldn't create the brand. Please try again",
      };
    }
  },

  /**
   * Memperbarui brand yang sudah ada.
   * Melakukan validasi ketat dan memproses data sebelum dikirim ke backend.
   * Menangani konversi tipe data untuk kompatibilitas FormData.
   * 
   * @async
   * @param {string|number} id - ID brand yang akan diperbarui
   * @param {Object} brandData - Data pembaruan
   * @param {string} brandData.name - Nama brand baru (wajib)
   * @param {string} [brandData.type="PRODUCT"] - Tipe brand baru
   * @param {number} [brandData.sortOrder=0] - Urutan tampilan baru
   * @param {File|string|null} [brandData.logo] - Logo brand baru
   * @param {boolean|string} [brandData.isActive] - Status aktif baru
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data brand yang diperbarui
   */
  update: async (id, brandData) => {
    try {
      if (!id) {
        return { success: false, message: "Brand ID is required" };
      }

      if (!brandData.name?.trim()) {
        return { success: false, message: "Brand name is required" };
      }

      // Siapkan data yang bersih untuk dikirim ke dataService
      const processedData = {
        name: brandData.name.trim(),
        type: brandData.type || "PRODUCT",
        // sortOrder tetap number — dataService akan handle konversi saat membuat FormData
        sortOrder: Number(brandData.sortOrder) || 0,
        logo: brandData.logo ?? null, // bisa File, string path, atau null
        // Penting: convert isActive ke STRING "true"/"false"
        isActive:
          typeof brandData.isActive === "boolean"
            ? brandData.isActive
              ? "true"
              : "false"
            : // kalau sudah string (mis. "true"/"false") biarkan saja
            typeof brandData.isActive === "string"
            ? brandData.isActive
            : undefined,
      };

      // Hapus field yang undefined supaya tidak terkirim
      Object.keys(processedData).forEach((k) => {
        if (processedData[k] === undefined) delete processedData[k];
      });

      // Panggil dataService (yang akan memilih FormData atau JSON)
      return await dataService.brands.update(id, processedData);
    } catch (error) {
      console.error("Error in brandService.update:", error);
      return {
        success: false,
        message: "Oops! We couldn't update the brand. Please try again",
      };
    }
  },

  /**
   * Melakukan soft delete brand (set deletedAt).
   * 
   * @async
   * @param {string|number} id - ID brand yang akan dihapus
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan
   */
  softDelete: async (id) => {
    try {
      const result = await dataService.brands.softDelete(id);
      if (result.success) {
        return {
          success: true,
          message: "Brand successfully deleted",
        };
      }

      return result;
    } catch (error) {
      console.error("Error in delete:", error);
      return {
        success: false,
        message: "Oops! We couldn't delete the brand. Please try again",
      };
    }
  },

  /**
   * Melakukan hard delete brand (hapus permanen dari database).
   * 
   * @async
   * @param {string|number} id - ID brand yang akan dihapus permanen
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan permanen
   */
  hardDelete: async (id) => {
    try {
      const result = await dataService.brands.hardDelete(id);
      if (result.success) {
        return {
          success: true,
          message: "Brand successfully deleted",
        };
      }

      return result;
    } catch (error) {
      console.error("Error in delete:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't delete the brand permanently. Please try again",
      };
    }
  },
};