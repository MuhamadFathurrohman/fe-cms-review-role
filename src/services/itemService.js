/**
 * @file itemService.js
 * @description Layanan terpusat untuk mengelola operasi data produk/item.
 * Menyediakan abstraksi di atas `generalApiService` dengan fitur tambahan:
 * - Dukungan terjemahan bilingual (English/Indonesian)
 * - Transformasi URL gambar lengkap
 * - Validasi input bilingual yang ketat
 * - Normalisasi data dari berbagai format (CMS vs backend)
 * - Formatting tanggal untuk tampilan UI
 * - Alur Review & Approval (submit, approve, reject, requestRevision)
 *
 * Setiap entri produk mendukung konten dalam dua bahasa dengan struktur:
 * - English (wajib): Deskripsi pendek/panjang, spesifikasi, fitur
 * - Indonesian (opsional): Harus lengkap jika disediakan
 * - Gambar produk (array)
 * - Metadata SEO bilingual
 */

import generalApiService from "./generalApiService";
import { baseService } from "./baseService";
import { separateImages } from "../utils/imageUtils";
import { normalizePaginatedResponse } from "./dataService";

/**
 * Konstanta status review item/product.
 * Sinkron dengan enum `ReviewStatus` di schema Prisma backend.
 *
 * @constant
 */

export const REVIEW_STATUS = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  REVISION: "REVISION",
};

/**
 * Layanan produk terpusat.
 * Mengelola semua operasi CRUD, transformasi, dan review terkait data produk.
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
    if (Array.isArray(data.translations)) {
      return data.translations;
    }

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
   * @param {Array<{language: string, shortDescription: string, longDescription: string}>} translations
   * @param {boolean} [isUpdate=false] - Apakah ini operasi update
   * @param {boolean} [hasImage=false] - Apakah ada gambar yang disediakan
   * @returns {{ isValid: boolean, errors: string[] }}
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
          "Indonesian short description is required when Indonesian translation is provided",
        );
      }
      if (!idTranslation.longDescription?.trim()) {
        errors.push(
          "Indonesian long description is required when Indonesian translation is provided",
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

  // ==================== CREATE & UPDATE ====================

  /**
   * Membuat entri produk baru dengan dukungan multi-bahasa.
   * Menggunakan FormData untuk mendukung upload multi-gambar.
   * isActive tidak dikirim — dikontrol otomatis oleh backend melalui alur review.
   *
   * @async
   * @param {Object} productData - Data produk yang akan dibuat
   * @param {string|number} currentUserId - ID pengguna yang membuat
   * @returns {{ success: boolean, data?: Object, message?: string }}
   */
  create: async (productData, currentUserId) => {
    try {
      if (!currentUserId) {
        return { success: false, message: "User ID is required" };
      }

      const validation = itemService.validateItemData(
        productData.translations,
        false,
        productData.images && productData.images.length > 0,
      );

      if (!validation.isValid) {
        return { success: false, message: validation.errors.join(", ") };
      }

      const formData = new FormData();

      // Ekstrak file dari array images
      let imageFiles = [];
      if (Array.isArray(productData.images) && productData.images.length > 0) {
        imageFiles = productData.images
          .map((img) => {
            if (img && img.file instanceof File) return img.file;
            if (img instanceof File) return img;
            return null;
          })
          .filter(Boolean);
      }

      Object.entries(productData).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        if (key === "translations") {
          formData.append("translations", JSON.stringify(value));
        } else if (key === "images") {
          imageFiles.forEach((file) => {
            formData.append("images", file);
          });
        } else if (key === "isFeatured") {
          // isActive sengaja tidak dikirim — dikontrol backend via review flow
          formData.append(key, value ? "true" : "false");
        } else if (key === "sortOrder") {
          formData.append(key, String(value));
        } else if (key === "isActive") {
          // Diabaikan — backend mengontrol isActive melalui alur review
          return;
        } else {
          formData.append(key, value);
        }
      });

      return await generalApiService.create("/products", formData);
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
   * Memisahkan gambar baru (File) dari path gambar lama menggunakan separateImages.
   * isActive tidak dikirim — dikontrol otomatis oleh backend melalui alur review.
   *
   * @async
   * @param {string|number} id - ID produk yang akan diperbarui
   * @param {Object} productData - Data pembaruan
   * @returns {{ success: boolean, data?: Object, message?: string }}
   */
  update: async (id, productData) => {
    try {
      if (!id) {
        return { success: false, message: "Product ID is required" };
      }

      const validation = itemService.validateItemData(
        productData.translations,
        true,
        productData.images && productData.images.length > 0,
      );

      if (!validation.isValid) {
        return { success: false, message: validation.errors.join(", ") };
      }

      const formData = new FormData();

      let newFiles = [];
      let existingPaths = [];

      if (Array.isArray(productData.images) && productData.images.length > 0) {
        const result = separateImages(productData.images);
        newFiles = result.newFiles;
        existingPaths = result.existingPaths;
      }

      Object.entries(productData).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        if (key === "translations") {
          formData.append("translations", JSON.stringify(value));
        } else if (key === "images") {
          if (existingPaths.length > 0) {
            formData.append("images", JSON.stringify(existingPaths));
          }
          if (newFiles.length > 0) {
            newFiles.forEach((file) => {
              formData.append("images", file);
            });
          }
        } else if (key === "isFeatured") {
          formData.append(key, value ? "true" : "false");
        } else if (key === "sortOrder") {
          formData.append(key, String(value));
        } else if (key === "isActive") {
          // Diabaikan — backend mengontrol isActive melalui alur review
          return;
        } else {
          formData.append(key, value);
        }
      });

      return await generalApiService.update("/products", id, formData);
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

  // ==================== READ & DELETE ====================

  /**
   * Mendapatkan semua produk tanpa pagination.
   * Digunakan untuk dropdown seleksi atau komponen yang membutuhkan data lengkap.
   *
   * @async
   * @param {'EN'|'ID'} [language='EN'] - Bahasa untuk ditampilkan
   * @returns {{ success: boolean, processedItems?: Array<Object>, message?: string }}
   */
  getAll: async (language = "EN") => {
    try {
      const response = await generalApiService.getAll("/products", {
        deletedAt: null,
      });
      const result = normalizePaginatedResponse(response);

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
   *
   * @async
   * @param {string|number} id - ID produk yang diminta
   * @param {'EN'|'ID'} [language='EN'] - Bahasa utama untuk ditampilkan
   * @returns {{ success: boolean, data?: Object, message?: string }}
   */
  getById: async (id, language = "EN") => {
    try {
      const result = await generalApiService.get(`/products/${id}`);

      if (!result.success || !result.data) {
        return { success: false, message: "Product not found" };
      }

      const raw = result.data;

      const data = {
        ...raw,
        translations: Array.isArray(raw.translations) ? raw.translations : [],
        images: Array.isArray(raw.images) ? raw.images : [],
        specifications: raw.specifications || {},
        features: raw.features || [],
      };

      const translation = data.translations.find(
        (t) => t.language === language,
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

      const idTranslation = data.translations.find(
        (t) => t.language === "ID",
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

          images: data.images.map((img) => itemService._getFullImageUrl(img)),

          isActive: data.isActive ?? false,
          isFeatured: data.isFeatured ?? false,
          sortOrder: data.sortOrder ?? 0,

          // Review & Approval fields
          reviewStatus: data.reviewStatus ?? "DRAFT",
          reviewNote: data.reviewNote ?? null,

          shortDescription: fallback.shortDescription || "",
          longDescription: fallback.longDescription || "",
          specifications: fallback.specifications || {},
          features: fallback.features || [],
          metaTitle: fallback.metaTitle || "",
          metaDescription: fallback.metaDescription || "",
          metaKeywords: fallback.metaKeywords || "",

          translations: data.translations,

          createdAtFormatted: data.createdAt
            ? baseService.formatDateTime(data.createdAt)
            : "N/A",
          updatedAtFormatted: data.updatedAt
            ? baseService.formatDateTime(data.updatedAt)
            : null,

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
   * @returns {{ success: boolean, message?: string }}
   */
  softDelete: async (id) => {
    try {
      const result = await generalApiService.delete(`/products/${id}`);
      if (result.success) {
        return {
          success: true,
          message: "item product successfully deleted",
        };
      }
      return result;
    } catch (error) {
      console.error("Error in itemService.softDelete:", error);
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
   * @returns {{ success: boolean, message?: string }}
   */
  hardDelete: async (id) => {
    try {
      const result = await generalApiService.delete(`/products/${id}/hard`);
      if (result.success) {
        return {
          success: true,
          message: "item product successfully deleted permanently",
        };
      }
      return result;
    } catch (error) {
      console.error("Error in itemService.hardDelete:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't delete the product permanently. Please try again.",
      };
    }
  },

  // ==================== PAGINATION & FILTERS ====================

  /**
   * Mendapatkan daftar produk dengan pagination, pencarian, dan filter.
   * Mendukung filter berdasarkan brand, kategori, status aktif, dan reviewStatus.
   *
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=8] - Jumlah produk per halaman
   * @param {string} [search=""] - String pencarian (nama produk)
   * @param {Object} [filters={}] - Filter tambahan
   * @param {string} [filters.brandId] - Filter berdasarkan ID brand
   * @param {string} [filters.categoryId] - Filter berdasarkan ID kategori
   * @param {boolean} [filters.isActive] - Filter berdasarkan status aktif
   * @param {string} [filters.reviewStatus] - Filter berdasarkan status review (DRAFT|PENDING_REVIEW|APPROVED|REJECTED|REVISION)
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   * @returns {{
   *   success: boolean,
   *   data?: Array<Object>,
   *   pagination?: Object,
   *   message?: string
   * }}
   */
  getPaginated: async (
    page = 1,
    limit = 8,
    search = "",
    filters = {},
    bypassCache = false,
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
      if (filters.reviewStatus) params.reviewStatus = filters.reviewStatus;

      const response = await generalApiService.getAll("/products", params);
      const result = normalizePaginatedResponse(response);

      if (!result.success) {
        return result;
      }

      const processedItems = result.data.map((item) =>
        itemService.processSingle(item, "EN"),
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

  // ==================== REVIEW & APPROVAL ====================

  /**
   * Mengajukan produk untuk direview.
   * Status transisi: DRAFT | REVISION → PENDING_REVIEW.
   * Permission yang dibutuhkan: manage.
   *
   * @async
   * @param {string|number} id - ID produk
   * @returns {{ success: boolean, data?: Object, message?: string }}
   */
  submitReview: async (id) => {
    try {
      if (!id) {
        return { success: false, message: "Product ID is required" };
      }

      const result = await generalApiService.create(
        `/products/${id}/submit`,
        {},
      );

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: result.data?.message || "Product submitted for review",
        };
      }

      return result;
    } catch (error) {
      console.error("Error in itemService.submitReview:", error);
      let message =
        "Oops! We couldn't submit the product for review. Please try again.";
      if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.message) {
        message = error.message;
      }
      return { success: false, message };
    }
  },

  /**
   * Menyetujui produk.
   * Status transisi: PENDING_REVIEW → APPROVED. isActive otomatis true.
   * Permission yang dibutuhkan: review.
   *
   * @async
   * @param {string|number} id - ID produk
   * @returns {{ success: boolean, data?: Object, message?: string }}
   */
  approve: async (id) => {
    try {
      if (!id) {
        return { success: false, message: "Product ID is required" };
      }

      const result = await generalApiService.create(
        `/products/${id}/approve`,
        {},
      );

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: result.data?.message || "Product approved successfully",
        };
      }

      return result;
    } catch (error) {
      console.error("Error in itemService.approve:", error);
      let message = "Oops! We couldn't approve the product. Please try again.";
      if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.message) {
        message = error.message;
      }
      return { success: false, message };
    }
  },

  /**
   * Meminta revisi produk. reviewNote wajib diisi.
   * Status transisi: PENDING_REVIEW → REVISION.
   * Permission yang dibutuhkan: review.
   *
   * @async
   * @param {string|number} id - ID produk
   * @param {string} reviewNote - Catatan revisi untuk author
   * @returns {{ success: boolean, data?: Object, message?: string }}
   */
  requestRevision: async (id, reviewNote) => {
    try {
      if (!id) {
        return { success: false, message: "Product ID is required" };
      }

      if (!reviewNote || String(reviewNote).trim() === "") {
        return { success: false, message: "Review note is required" };
      }

      const result = await generalApiService.create(`/products/${id}/revise`, {
        reviewNote: String(reviewNote).trim(),
      });

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: result.data?.message || "Revision requested successfully",
        };
      }

      return result;
    } catch (error) {
      console.error("Error in itemService.requestRevision:", error);
      let message = "Oops! We couldn't request the revision. Please try again.";
      if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.message) {
        message = error.message;
      }
      return { success: false, message };
    }
  },

  /**
   * Menolak produk. reviewNote wajib diisi sebagai alasan penolakan.
   * Status transisi: PENDING_REVIEW → REJECTED.
   * Permission yang dibutuhkan: review.
   *
   * @async
   * @param {string|number} id - ID produk
   * @param {string} reviewNote - Alasan penolakan untuk author
   * @returns {{ success: boolean, data?: Object, message?: string }}
   */
  reject: async (id, reviewNote) => {
    try {
      if (!id) {
        return { success: false, message: "Product ID is required" };
      }

      if (!reviewNote || String(reviewNote).trim() === "") {
        return { success: false, message: "Review note is required" };
      }

      const result = await generalApiService.create(`/products/${id}/reject`, {
        reviewNote: String(reviewNote).trim(),
      });

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: result.data?.message || "Product rejected successfully",
        };
      }

      return result;
    } catch (error) {
      console.error("Error in itemService.reject:", error);
      let message = "Oops! We couldn't reject the product. Please try again.";
      if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.message) {
        message = error.message;
      }
      return { success: false, message };
    }
  },

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Memproses daftar produk untuk ditampilkan di UI.
   *
   * @param {Array<Object>} items - Daftar produk dari API
   * @param {'EN'|'ID'} [language='EN'] - Bahasa untuk ditampilkan
   * @returns {Array<Object>}
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
   * @returns {Object}
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

      // Review & Approval fields
      reviewStatus: item.reviewStatus ?? "DRAFT",
      reviewNote: item.reviewNote ?? null,

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
