/**
 * @file blogService.js
 * @description Layanan terpusat untuk mengelola operasi data blog dengan dukungan multi-bahasa.
 * Menyediakan abstraksi di atas `dataService.blogs` dengan fitur tambahan:
 * - Dukungan terjemahan bilingual (English/Indonesian)
 * - Transformasi URL gambar lengkap
 * - Validasi input bilingual yang ketat
 * - Formatting tanggal untuk tampilan UI
 * - Fallback bahasa yang cerdas
 * 
 * Setiap entri blog mendukung konten dalam dua bahasa dengan struktur:
 * - English (wajib): Judul, konten, meta tags
 * - Indonesian (opsional): Harus lengkap jika disediakan
 */

import { dataService } from "./dataService";
import { baseService } from "./baseService";

/**
 * Layanan blog terpusat.
 * Mengelola semua operasi CRUD dan transformasi terkait data blog bilingual.
 * 
 * @namespace blogService
 */
export const blogService = {
  /**
   * Menghasilkan URL lengkap untuk gambar blog.
   * Mendeteksi apakah path sudah merupakan URL lengkap atau perlu digabungkan dengan base URL.
   * 
   * @param {string|null|undefined} imagePath - Path gambar dari backend
   * @returns {string|null} URL lengkap gambar atau null jika path tidak valid
   * 
   * @example
   * // Path relatif
   * blogService._getFullImageUrl("blogs/image123.jpg");
   * // → "https://api.example.com/blogs/image123.jpg"
   * 
   * @example
   * // URL lengkap
   * blogService._getFullImageUrl("https://external.com/image.jpg");
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
   * Memvalidasi data blog sebelum operasi create/update.
   * Menerapkan aturan bilingual yang ketat:
   * - English selalu wajib
   * - Indonesian opsional tapi harus lengkap jika disediakan
   * - Gambar wajib hanya saat create
   * 
   * @param {Array<{language: string, title: string, content: string}>} translations - Daftar terjemahan
   * @param {boolean} [isUpdate=false] - Apakah ini operasi update
   * @param {boolean} [hasImage=false] - Apakah ada gambar yang disediakan
   * @returns {{
   *   isValid: boolean,
   *   errors: string[]
   * }} Hasil validasi dengan daftar error jika tidak valid
   */
  validateBlogData: (translations, isUpdate = false, hasImage = false) => {
    const errors = [];

    const enTranslation = translations.find((t) => t.language === "EN");
    const idTranslation = translations.find((t) => t.language === "ID");

    // English is always required
    if (!enTranslation) {
      errors.push("English translation is required");
    } else {
      if (!enTranslation.title?.trim()) {
        errors.push("English title is required");
      }
      if (!enTranslation.content?.trim()) {
        errors.push("English content is required");
      }
    }

    // Indonesian is optional but must be complete if provided
    if (idTranslation) {
      if (!idTranslation.title?.trim()) {
        errors.push(
          "Indonesian title is required when Indonesian translation is provided"
        );
      }
      if (!idTranslation.content?.trim()) {
        errors.push(
          "Indonesian content is required when Indonesian translation is provided"
        );
      }
    }

    // Image required only on create
    if (!isUpdate && !hasImage) {
      errors.push("Blog image is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Mendapatkan daftar blog dengan pagination, pencarian, dan filter.
   * Mendukung seleksi bahasa untuk menampilkan konten dalam bahasa tertentu.
   * 
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=8] - Jumlah blog per halaman
   * @param {string} [search=""] - String pencarian (judul, konten)
   * @param {Object} [filters={}] - Filter tambahan
   * @param {'EN'|'ID'} [language='EN'] - Bahasa untuk ditampilkan
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   pagination: Object,
   *   message?: string
   * }} Respons dengan daftar blog yang diproses dan metadata pagination
   */
  getPaginated: async (
    page = 1,
    limit = 8,
    search = "",
    filters = {},
    language = "EN",
    bypassCache = false
  ) => {
    try {
      const result = await dataService.blogs.getAll({
        page,
        limit,
        search,
        deletedAt: null,
        ...filters,
        bypassCache,
      });

      if (!result.success) {
        return result;
      }

      const processedBlogs = result.data.map((blog) => {
        const translation = blog.translations?.find(
          (t) => t.language === language
        );

        return {
          ...blog,
          imageUrl: blogService._getFullImageUrl(blog.image || null),
          title: translation?.title || "",
          excerpt: translation?.excerpt || "",
          content: translation?.content || "",
          createdAtFormatted: blog.createdAt
            ? baseService.formatDateTime(blog.createdAt)
            : "N/A",
          updatedAtFormatted: blog.updatedAt
            ? baseService.formatDateTime(blog.updatedAt)
            : null,
        };
      });

      return {
        success: true,
        data: processedBlogs,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Error in blogService.getPaginated:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the blogs. Please try again",
      };
    }
  },

  
  /**
   * Mendapatkan detail blog berdasarkan ID dengan dukungan multi-bahasa.
   * Menyediakan fallback ke English jika bahasa yang diminta tidak tersedia.
   * Mengembalikan struktur data yang dioptimalkan untuk form edit.
   * 
   * @async
   * @param {string|number} id - ID blog yang diminta
   * @param {'EN'|'ID'} [language='EN'] - Bahasa utama untuk ditampilkan
   * @returns {{
   *   success: boolean,
   *   data?: Object,
   *   message?: string
   * }} Respons dengan data blog yang diproses
   */
  getById: async (id, language = "EN") => {
    try {
      if (!id) {
        return { success: false, message: "Blog ID is required" };
      }

      const result = await dataService.blogs.getById(id);

      if (!result.success || !result.data) {
        return { success: false, message: "Blog not found" };
      }

      const blog = result.data;

      const translation = blog.translations?.find(
        (t) => t.language === language
      );

      
      const enTranslation = blog.translations?.find((t) => t.language === "EN");
      const fallback = translation || enTranslation || {};

      return {
        success: true,
        data: {
          id: blog.id,
          image: blog.image,
          imageUrl: blogService._getFullImageUrl(blog.image || null),
          isPublished: blog.isPublished,
          isFeatured: blog.isFeatured,
          viewCount: blog.viewCount || 0,

          
          title: fallback.title || "",
          excerpt: fallback.excerpt || "",
          content: fallback.content || "",
          metaTitle: fallback.metaTitle || "",
          metaDescription: fallback.metaDescription || "",
          metaKeywords: fallback.metaKeywords || "",
          tags: Array.isArray(fallback.tags) ? fallback.tags : [],

          
          translations: blog.translations || [],

          
          titleEn:
            blog.translations?.find((t) => t.language === "EN")?.title || "",
          contentEn:
            blog.translations?.find((t) => t.language === "EN")?.content || "",
          excerptEn:
            blog.translations?.find((t) => t.language === "EN")?.excerpt || "",
          metaTitleEn:
            blog.translations?.find((t) => t.language === "EN")?.metaTitle ||
            "",
          metaDescriptionEn:
            blog.translations?.find((t) => t.language === "EN")
              ?.metaDescription || "",
          metaKeywordsEn:
            blog.translations?.find((t) => t.language === "EN")?.metaKeywords ||
            "",
          tagsEn:
            blog.translations?.find((t) => t.language === "EN")?.tags || [],

          titleId:
            blog.translations?.find((t) => t.language === "ID")?.title || "",
          contentId:
            blog.translations?.find((t) => t.language === "ID")?.content || "",
          excerptId:
            blog.translations?.find((t) => t.language === "ID")?.excerpt || "",
          metaTitleId:
            blog.translations?.find((t) => t.language === "ID")?.metaTitle ||
            "",
          metaDescriptionId:
            blog.translations?.find((t) => t.language === "ID")
              ?.metaDescription || "",
          metaKeywordsId:
            blog.translations?.find((t) => t.language === "ID")?.metaKeywords ||
            "",
          tagsId:
            blog.translations?.find((t) => t.language === "ID")?.tags || [],

          
          createdAtFormatted: blog.createdAt
            ? baseService.formatDateTime(blog.createdAt)
            : "N/A",
          updatedAtFormatted: blog.updatedAt
            ? baseService.formatDateTime(blog.updatedAt)
            : null,
        },
      };
    } catch (error) {
      console.error("Error in blogService.getById:", error);
      return {
        success: false,
        message:
          error.message ||
          "Oops! We couldn't load the blog details. Please try again",
      };
    }
  },

  /**
   * Membuat entri blog baru dengan dukungan multi-bahasa.
   * Melakukan validasi ketat sesuai aturan bilingual.
   * 
   * @async
   * @param {Object} blogData - Data blog yang akan dibuat
   * @param {string|number} currentUserId - ID pengguna yang membuat
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data blog yang dibuat
   */
  create: async (blogData, currentUserId) => {
    try {
      if (!currentUserId) {
        return { success: false, message: "User ID is required" };
      }

      const validation = blogService.validateBlogData(
        blogData.translations,
        false,
        blogData.image instanceof File
      );

      if (!validation.isValid) {
        return { success: false, message: validation.errors.join(", ") };
      }

      return await dataService.blogs.create(blogData);
    } catch (error) {
      console.error("Error in blogService.create:", error);
      let message = "Oops! We couldn't create the blog. Please try again.";
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      return { success: false, message };
    }
  },

  /**
   * Memperbarui entri blog yang sudah ada dengan dukungan multi-bahasa.
   * Melakukan validasi ketat sesuai aturan bilingual.
   * 
   * @async
   * @param {string|number} id - ID blog yang akan diperbarui
   * @param {Object} blogData - Data pembaruan
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data blog yang diperbarui
   */
  update: async (id, blogData) => {
    try {
      if (!id) {
        return { success: false, message: "Blog ID is required" };
      }

      const validation = blogService.validateBlogData(
        blogData.translations,
        true,
        blogData.image instanceof File || typeof blogData.image === "string"
      );

      if (!validation.isValid) {
        return { success: false, message: validation.errors.join(", ") };
      }

      return await dataService.blogs.update(id, blogData);
    } catch (error) {
      console.error("Error in blogService.update:", error);
      let message = "Oops! We couldn't update the blog. Please try again.";
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      return { success: false, message };
    }
  },

  /**
   * Melakukan soft delete blog (set deletedAt).
   * 
   * @async
   * @param {string|number} id - ID blog yang akan dihapus
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan
   */
  softDelete: async (id) => {
    try {
      return await dataService.blogs.softDelete(id);
    } catch (error) {
      console.error("Error in blogService.softDelete:", error);
      return {
        success: false,
        message: "Oops! We couldn't delete the blog. Please try again",
      };
    }
  },

  /**
   * Melakukan hard delete blog (hapus permanen dari database).
   * 
   * @async
   * @param {string|number} id - ID blog yang akan dihapus permanen
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan permanen
   */
  hardDelete: async (id) => {
    try {
      return await dataService.blogs.hardDelete(id);
    } catch (error) {
      console.error("Error in blogService.hardDelete:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't delete the blog permanently. Please try again",
      };
    }
  },
};