/**
 * @file itemService.js
 * @description Layanan terpusat untuk mengelola operasi data produk/item.
 * Menyediakan abstraksi di atas `dataService.products` dengan fitur tambahan:
 * - Dukungan terjemahan bilingual (English/Indonesian)
 * - Transformasi URL gambar lengkap
 * - Validasi input bilingual yang ketat
 * - Normalisasi data dari berbagai format (CMS vs backend)
 * - Formatting tanggal untuk tampilan UI
 * 
 * Setiap entri produk mendukung konten dalam dua bahasa dengan struktur:
 * - English (wajib): Deskripsi pendek/panjang, spesifikasi, fitur
 * - Indonesian (opsional): Harus lengkap jika disediakan
 * - Gambar produk (array)
 * - Metadata SEO bilingual
 */

import { dataService } from "./dataService";
import { baseService } from "./baseService";

/**
 * Layanan produk terpusat.
 * Mengelola semua operasi CRUD dan transformasi terkait data produk.
 * 
 * @namespace itemService
 */
export const itemService = {
  /**
   * Menghasilkan URL lengkap untuk gambar produk.
   * Mendeteksi apakah path sudah merupakan URL lengkap atau perlu digabungkan dengan base URL.
   * 
   * @param {string|null|undefined} imagePath - Path gambar dari backend
   * @returns {string|null} URL lengkap gambar atau null jika path tidak valid
   * 
   * @example
   * // Path relatif
   * itemService._getFullImageUrl("products/image123.jpg");
   * // → "https://api.example.com/products/image123.jpg"
   * 
   * @example
   * // URL lengkap
   * itemService._getFullImageUrl("https://external.com/image.jpg");
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

  /**
   * Menormalisasi data terjemahan ke format backend yang konsisten.
   * Mendukung konversi dari format CMS (flatten) ke format backend (array).
   * 
   * @param {Object} data - Data produk mentah
   * @returns {Array<{language: string, ...}>} Array terjemahan dalam format backend
   */
  normalizeTranslations: (data) => {
    // Jika sudah dalam backend format (array translations)
    if (Array.isArray(data.translations)) {
      return data.translations;
    }

    // Jika format CMS (flatten)
    return [
      {
        language: "EN",
        shortDescription: data.shortDescription || "",
        longDescription: data.longDescription || "",
        specifications: data.specifications || {},
        features: data.features || [],
        metaTitle: data.metaTitle || "",
        metaDescription: data.metaDescription || "",
        metaKeywords: data.metaKeywords || "",
      },
      {
        language: "ID",
        shortDescription: data.shortDescriptionId || "",
        longDescription: data.longDescriptionId || "",
        specifications: data.specificationsId || {},
        features: data.featuresId || [],
        metaTitle: data.metaTitleId || "",
        metaDescription: data.metaDescriptionId || "",
        metaKeywords: data.metaKeywordsId || "",
      },
    ];
  },

  // ==================== VALIDATION ====================

  /**
   * Memvalidasi data produk sebelum operasi create/update.
   * Menerapkan aturan bilingual yang ketat:
   * - English selalu wajib (deskripsi pendek dan panjang)
   * - Indonesian opsional tapi harus lengkap jika disediakan
   * - Gambar wajib hanya saat create
   * 
   * @param {Array<{language: string, shortDescription: string, longDescription: string}>} translations - Daftar terjemahan
   * @param {boolean} [isUpdate=false] - Apakah ini operasi update
   * @param {boolean} [hasImage=false] - Apakah ada gambar yang disediakan
   * @returns {{
   *   isValid: boolean,
   *   errors: string[]
   * }} Hasil validasi dengan daftar error jika tidak valid
   */
  validateItemData: (translations, isUpdate = false, hasImage = false) => {
    const errors = [];

    const enTranslation = translations.find((t) => t.language === "EN");
    const idTranslation = translations.find((t) => t.language === "ID");

    if (!enTranslation) {
      errors.push("English translation is required");
    } else {
      if (!enTranslation.shortDescription?.trim()) {
        errors.push("English short description is required");
      }
      if (!enTranslation.longDescription?.trim()) {
        errors.push("English long description is required");
      }
    }

    if (idTranslation) {
      if (!idTranslation.shortDescription?.trim()) {
        errors.push(
          "Indonesian short description is required when Indonesian translation is provided"
        );
      }
      if (!idTranslation.longDescription?.trim()) {
        errors.push(
          "Indonesian long description is required when Indonesian translation is provided"
        );
      }
    }

    if (!isUpdate && !hasImage) {
      errors.push("Product image is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // ==================== CREATE & UPDATE (via dataService) ====================

  /**
   * Membuat entri produk baru dengan dukungan multi-bahasa.
   * Melakukan validasi ketat sesuai aturan bilingual.
   * 
   * @async
   * @param {Object} productData - Data produk yang akan dibuat
   * @param {string|number} currentUserId - ID pengguna yang membuat
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data produk yang dibuat
   */
  create: async (productData, currentUserId) => {
    try {
      if (!currentUserId) {
        return { success: false, message: "User ID is required" };
      }

      const validation = itemService.validateItemData(
        productData.translations,
        false,
        productData.images && productData.images.length > 0
      );

      if (!validation.isValid) {
        return { success: false, message: validation.errors.join(", ") };
      }

      return await dataService.products.create(productData);
    } catch (error) {
      console.error("Error in itemService.create:", error);
      let message = "Oops! We couldn't create the product. Please try again.";
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      return { success: false, message };
    }
  },

  /**
   * Memperbarui entri produk yang sudah ada dengan dukungan multi-bahasa.
   * Melakukan validasi ketat sesuai aturan bilingual.
   * 
   * @async
   * @param {string|number} id - ID produk yang akan diperbarui
   * @param {Object} productData - Data pembaruan
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data produk yang diperbarui
   */
  update: async (id, productData) => {
    try {
      if (!id) {
        return { success: false, message: "Product ID is required" };
      }

      // Validasi basic
      const validation = itemService.validateItemData(
        productData.translations,
        true,
        productData.images && productData.images.length > 0
      );

      if (!validation.isValid) {
        return { success: false, message: validation.errors.join(", ") };
      }

      // dataService will handle image conversion
      return await dataService.products.update(id, productData);
    } catch (error) {
      console.error("Error in itemService.update:", error);

      let message = "Oops! We couldn't update the product. Please try again.";
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }

      return { success: false, message };
    }
  },

  // ==================== READ & DELETE (via dataService) ====================

  /**
   * Mendapatkan semua produk tanpa pagination.
   * Digunakan untuk dropdown seleksi atau komponen yang membutuhkan data lengkap.
   * 
   * @async
   * @param {'EN'|'ID'} [language='EN'] - Bahasa untuk ditampilkan
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   message?: string
   * }} Respons dengan daftar produk yang diproses
   */
  getAll: async (language = "EN") => {
    try {
      const result = await dataService.products.getAll();
      if (!result.success) {
        return result;
      }

      const processedItems = itemService.processList(result.data, language);
      return {
        success: true,
         processedItems,
      };
    } catch (error) {
      console.error("Error in itemService.getAll:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the products. Please try again.",
      };
    }
  },

  /**
   * Mendapatkan detail produk berdasarkan ID dengan dukungan multi-bahasa.
   * Menyediakan fallback ke English jika bahasa yang diminta tidak tersedia.
   * Mengembalikan struktur data yang dioptimalkan untuk form edit.
   * 
   * @async
   * @param {string|number} id - ID produk yang diminta
   * @param {'EN'|'ID'} [language='EN'] - Bahasa utama untuk ditampilkan
   * @returns {{
   *   success: boolean,
   *   data?: Object,
   *   message?: string
   * }} Respons dengan data produk yang diproses
   */
  getById: async (id, language = "EN") => {
    try {
      const result = await dataService.products.getById(id);

      if (!result.success || !result.data) {
        return { success: false, message: "Product not found" };
      }

      // --- NORMALISASI DATA BACKEND ---
      const raw = result.data;

      const data = {
        ...raw,
        translations: Array.isArray(raw.translations) ? raw.translations : [],
        images: Array.isArray(raw.images) ? raw.images : [],
        specifications: raw.specifications || {},
        features: raw.features || [],
      };

      // --- CARI TRANSLATION SESUAI LANGUAGE DAN FALLBACK EN ---
      const translation = data.translations.find(
        (t) => t.language === language
      );
      const enTranslation = data.translations.find((t) => t.language === "EN");

      const fallback = translation ||
        enTranslation || {
          shortDescription: "",
          longDescription: "",
          specifications: {},
          features: [],
          metaTitle: "",
          metaDescription: "",
          metaKeywords: "",
        };

      // --- TRANSLATION ID ---
      const idTranslation = data.translations.find(
        (t) => t.language === "ID"
      ) || {
        shortDescription: "",
        longDescription: "",
        specifications: {},
        features: [],
        metaTitle: "",
        metaDescription: "",
        metaKeywords: "",
      };

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          categoryId: data.categoryId,
          brandId: data.brandId,

          // Images aman
          images: data.images.map((img) => itemService._getFullImageUrl(img)),

          isActive: data.isActive ?? false,
          isFeatured: data.isFeatured ?? false,
          sortOrder: data.sortOrder ?? 0,

          // Translation fallback EN -> ID -> default
          shortDescription: fallback.shortDescription || "",
          longDescription: fallback.longDescription || "",
          specifications: fallback.specifications || {},
          features: fallback.features || [],

          metaTitle: fallback.metaTitle || "",
          metaDescription: fallback.metaDescription || "",
          metaKeywords: fallback.metaKeywords || "",

          // Translations always array
          translations: data.translations,

          createdAtFormatted: data.createdAtFormatted || data.createdAt || "",
          updatedAtFormatted: data.updatedAtFormatted || data.updatedAt || "",

          // Translation ID fields
          shortDescriptionId: idTranslation.shortDescription || "",
          longDescriptionId: idTranslation.longDescription || "",
          specificationsId: idTranslation.specifications || {},
          featuresId: idTranslation.features || [],
          metaTitleId: idTranslation.metaTitle || "",
          metaDescriptionId: idTranslation.metaDescription || "",
          metaKeywordsId: idTranslation.metaKeywords || "",
        },
      };
    } catch (error) {
      console.error("Error in itemService.getById:", error);
      return {
        success: false,
        message:
          error.message || "Oops! something went wrong, please try again",
      };
    }
  },

  /**
   * Melakukan soft delete produk (set deletedAt).
   * 
   * @async
   * @param {string|number} id - ID produk yang akan dihapus
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan
   */
  softDelete: async (id) => {
    try {
      const result = await dataService.products.softDelete(id);
      if (result.success) {
        return {
          success: true,
          message: "item product successfully deleted",
        };
      }
      return result;
    } catch (error) {
      console.error("Error in itemService.delete:", error);
      return {
        success: false,
        message: "Oops! We couldn't delete the product. Please try again.",
      };
    }
  },

  /**
   * Melakukan hard delete produk (hapus permanen dari database).
   * 
   * @async
   * @param {string|number} id - ID produk yang akan dihapus permanen
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan permanen
   */
  hardDelete: async (id) => {
    try {
      const result = await dataService.products.hardDelete(id);
      if (result.success) {
        return {
          success: true,
          message: "item product successfully deleted permanently",
        };
      }
      return result;
    } catch (error) {
      console.error("Error in itemService.delete:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't delete the product permanently. Please try again.",
      };
    }
  },

  // ==================== PAGINATION & FILTERS ====================

  // parameter bypassCache
  /**
   * Mendapatkan daftar produk dengan pagination, pencarian, dan filter.
   * Mendukung filter berdasarkan brand, kategori, dan status aktif.
   * 
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=8] - Jumlah produk per halaman
   * @param {string} [search=""] - String pencarian (nama produk)
   * @param {Object} [filters={}] - Filter tambahan
   * @param {string} [filters.brandId] - Filter berdasarkan ID brand
   * @param {string} [filters.categoryId] - Filter berdasarkan ID kategori
   * @param {boolean} [filters.isActive] - Filter berdasarkan status aktif
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   pagination: Object,
   *   message?: string
   * }} Respons dengan daftar produk yang diproses dan metadata pagination
   */
  getPaginated: async (
    page = 1,
    limit = 8,
    search = "",
    filters = {},
    bypassCache = false
  ) => {
    try {
      const params = {
        page,
        limit,
        search,
        deleted: "false",
        bypassCache,
      };

      if (filters.brandId) params.brandId = filters.brandId;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.isActive !== undefined) params.isActive = filters.isActive;

      const result = await dataService.products.getAll(params);

      if (!result.success) {
        return result;
      }

      const processedItems = result.data.map((item) =>
        itemService.processSingle(item, "EN")
      );

      return {
        success: true,
        data: processedItems,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Error in itemService.getPaginated:", error);
      return {
        success: false,
        message: "Oops! something went wrong, please try again",
      };
    }
  },

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Memproses daftar produk untuk ditampilkan di UI.
   * Menambahkan properti yang diformat dan URL gambar lengkap.
   * 
   * @param {Array<Object>} items - Daftar produk dari API
   * @param {'EN'|'ID'} [language='EN'] - Bahasa untuk ditampilkan
   * @returns {Array<Object>} Daftar produk yang telah diproses
   */
  processList: (items, language = "EN") => {
    return items.map((item) => itemService.processSingle(item, language));
  },

  /**
   * Memproses data produk tunggal untuk ditampilkan di UI.
   * Menambahkan properti yang diformat, URL gambar, dan konten terjemahan.
   * 
   * @param {Object} item - Data produk dari API
   * @param {'EN'|'ID'} [language='EN'] - Bahasa untuk ditampilkan
   * @returns {Object} Data produk yang telah diproses
   */
  processSingle: (item, language = "EN") => {
    const translation = item.translations?.find((t) => t.language === language);

    return {
      ...item,
      sortOrder: item.sortOrder ?? 0,
      images: Array.isArray(item.images)
        ? item.images.map((img) => itemService._getFullImageUrl(img))
        : [],

      primaryPhoto:
        Array.isArray(item.images) && item.images.length > 0
          ? itemService._getFullImageUrl(item.images[0])
          : null,

      createdAtFormatted: baseService.formatDateTime(item.createdAt),
      updatedAtFormatted: item.updatedAt
        ? baseService.formatDateTime(item.updatedAt)
        : null,

      shortDescription:
        translation?.shortDescription || item.shortDescription || "",
      longDescription:
        translation?.longDescription || item.longDescription || "",
      specifications: translation?.specifications || item.specifications || {},
      features: Array.isArray(translation?.features)
        ? translation.features
        : Array.isArray(item.features)
        ? item.features
        : [],
      metaTitle: translation?.metaTitle || item.metaTitle || "",
      metaDescription:
        translation?.metaDescription || item.metaDescription || "",
      metaKeywords: translation?.metaKeywords || item.metaKeywords || "",
    };
  },
};