/**
 * @file blogService.js
 * @description Layanan terpusat untuk mengelola operasi data blog dengan dukungan multi-bahasa.
 * Menyediakan abstraksi langsung di atas `generalApiService` dengan fitur tambahan:
 * - Dukungan terjemahan bilingual (English/Indonesian)
 * - Transformasi URL gambar lengkap
 * - Validasi input bilingual yang ketat
 * - Formatting tanggal untuk tampilan UI
 * - Fallback bahasa yang cerdas
 * - Fitur Review & Approval (Submit, Approve, Reject, Request Revision)
 *
 * Endpoint review (sesuai backend routes):
 * - POST /:id/submit   — submit untuk review (manage)
 * - POST /:id/approve  — approve blog (review)
 * - POST /:id/revise   — request revision, wajib reviewNote (review)
 * - POST /:id/reject   — reject blog, wajib reviewNote (review)
 *
 * Catatan:
 * - isPublished TIDAK dikirim ke backend saat create/update
 *   Backend mengontrol isPublished otomatis via alur review (approve → isPublished = true)
 */

import generalApiService from "./generalApiService";
import { normalizePaginatedResponse } from "./dataService";
import { baseService } from "./baseService";

/**
 * Konstanta status review blog.
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
 * Layanan blog terpusat.
 * Mengelola semua operasi CRUD, transformasi, dan review terkait data blog bilingual.
 *
 * @namespace blogService
 */
export const blogService = {
  /**
   * Menghasilkan URL lengkap untuk gambar blog.
   *
   * @param {string|null|undefined} imagePath - Path gambar dari backend
   * @returns {string|null} URL lengkap gambar atau null jika path tidak valid
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
   * Memformat field-field review dari data blog mentah.
   * Digunakan secara konsisten di `getPaginated` dan `getById`.
   *
   * @param {Object} blog - Data blog mentah dari backend
   * @returns {Object} Field review yang sudah diformat
   */
  _formatReviewData: (blog) => {
    return {
      reviewStatus: blog.reviewStatus || REVIEW_STATUS.DRAFT,
      reviewNote: blog.reviewNote || null,
      submittedBy: blog.submittedBy || null,
      submittedAt: blog.submittedAt
        ? baseService.formatDateTime(blog.submittedAt)
        : null,
      reviewedBy: blog.reviewedBy || null,
      reviewedAt: blog.reviewedAt
        ? baseService.formatDateTime(blog.reviewedAt)
        : null,
    };
  },

  /**
   * Memvalidasi data blog sebelum operasi create/update.
   *
   * @param {Array} translations
   * @param {boolean} [isUpdate=false]
   * @param {boolean} [hasImage=false]
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  validateBlogData: (translations, isUpdate = false, hasImage = false) => {
    const errors = [];

    const enTranslation = translations.find((t) => t.language === "EN");
    const idTranslation = translations.find((t) => t.language === "ID");

    if (!enTranslation) {
      errors.push("English translation is required");
    } else {
      if (!enTranslation.title?.trim())
        errors.push("English title is required");
      if (!enTranslation.content?.trim())
        errors.push("English content is required");
    }

    if (idTranslation) {
      if (!idTranslation.title?.trim()) {
        errors.push(
          "Indonesian title is required when Indonesian translation is provided",
        );
      }
      if (!idTranslation.content?.trim()) {
        errors.push(
          "Indonesian content is required when Indonesian translation is provided",
        );
      }
    }

    if (!isUpdate && !hasImage) {
      errors.push("Blog image is required");
    }

    return { isValid: errors.length === 0, errors };
  },

  /**
   * Mendapatkan daftar blog dengan pagination, pencarian, dan filter.
   *
   * @async
   * @param {number} [page=1]
   * @param {number} [limit=8]
   * @param {string} [search=""]
   * @param {Object} [filters={}]
   * @param {'EN'|'ID'} [language='EN']
   * @param {boolean} [bypassCache=false]
   * @returns {Promise<{ success: boolean, data?: Array<Object>, pagination?: Object, message?: string }>}
   */
  getPaginated: async (
    page = 1,
    limit = 8,
    search = "",
    filters = {},
    language = "EN",
    bypassCache = false,
  ) => {
    try {
      const response = await generalApiService.getAll("/blogs", {
        page,
        limit,
        search,
        deletedAt: null,
        ...filters,
        bypassCache,
      });

      const result = normalizePaginatedResponse(response);

      if (!result.success) return result;

      const processedBlogs = result.data.map((blog) => {
        const translation = blog.translations?.find(
          (t) => t.language === language,
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
          ...blogService._formatReviewData(blog),
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
   * Mendapatkan detail blog berdasarkan ID.
   *
   * @async
   * @param {string|number} id
   * @param {'EN'|'ID'} [language='EN']
   * @returns {Promise<{ success: boolean, data?: Object, message?: string }>}
   */
  getById: async (id, language = "EN") => {
    try {
      if (!id) return { success: false, message: "Blog ID is required" };

      const result = await generalApiService.get(`/blogs/${id}`);

      if (!result.success || !result.data) {
        return { success: false, message: "Blog not found" };
      }

      const blog = result.data;
      const translation = blog.translations?.find(
        (t) => t.language === language,
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

          // Konten aktif (sesuai bahasa / fallback)
          title: fallback.title || "",
          excerpt: fallback.excerpt || "",
          content: fallback.content || "",
          metaTitle: fallback.metaTitle || "",
          metaDescription: fallback.metaDescription || "",
          metaKeywords: fallback.metaKeywords || "",
          tags: Array.isArray(fallback.tags) ? fallback.tags : [],

          // Semua translations mentah
          translations: blog.translations || [],

          // Field per bahasa (untuk form edit)
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

          // Tanggal format
          publishedAt: blog.publishedAt
            ? baseService.formatDateTime(blog.publishedAt)
            : null,
          createdAtFormatted: blog.createdAt
            ? baseService.formatDateTime(blog.createdAt)
            : "N/A",
          updatedAtFormatted: blog.updatedAt
            ? baseService.formatDateTime(blog.updatedAt)
            : null,

          // Field review
          ...blogService._formatReviewData(blog),
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
   * Membuat entri blog baru.
   * Catatan: isPublished TIDAK dikirim — dikontrol backend via alur review.
   *
   * @async
   * @param {Object} blogData
   * @param {string|number} currentUserId
   * @returns {Promise<{ success: boolean, data?: Object, message?: string }>}
   */
  create: async (blogData, currentUserId) => {
    try {
      if (!currentUserId) {
        return { success: false, message: "User ID is required" };
      }

      const validation = blogService.validateBlogData(
        blogData.translations,
        false,
        blogData.image instanceof File,
      );

      if (!validation.isValid) {
        return { success: false, message: validation.errors.join(", ") };
      }

      const formData = new FormData();

      Object.entries(blogData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === "translations") {
            formData.append(key, JSON.stringify(value));
          } else if (key === "image") {
            if (value instanceof File) formData.append("image", value);
            else if (typeof value === "string") formData.append("image", value);
          } else if (key === "isFeatured") {
            // isPublished dikecualikan — dikontrol backend via alur review
            formData.append(key, String(value));
          } else if (key !== "isPublished") {
            formData.append(key, value);
          }
        }
      });

      return await generalApiService.create("/blogs", formData);
    } catch (error) {
      console.error("Error in blogService.create:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Oops! We couldn't create the blog. Please try again.",
      };
    }
  },

  /**
   * Memperbarui entri blog yang sudah ada.
   * Catatan: isPublished TIDAK dikirim — dikontrol backend via alur review.
   *
   * @async
   * @param {string|number} id
   * @param {Object} blogData
   * @returns {Promise<{ success: boolean, data?: Object, message?: string }>}
   */
  update: async (id, blogData) => {
    try {
      if (!id) return { success: false, message: "Blog ID is required" };

      const validation = blogService.validateBlogData(
        blogData.translations,
        true,
        blogData.image instanceof File || typeof blogData.image === "string",
      );

      if (!validation.isValid) {
        return { success: false, message: validation.errors.join(", ") };
      }

      const hasNewFile = blogData.image instanceof File;

      if (hasNewFile) {
        const formData = new FormData();

        Object.entries(blogData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (key === "translations") {
              formData.append(key, JSON.stringify(value));
            } else if (key === "image") {
              if (value instanceof File) formData.append("image", value);
            } else if (key === "isFeatured") {
              // isPublished dikecualikan — dikontrol backend via alur review
              formData.append(key, String(value));
            } else if (key === "isPublished") {
              formData.append(key, value);
            }
          }
        });

        return await generalApiService.update("/blogs", id, formData);
      } else {
        // isPublished dikecualikan — dikontrol backend via alur review
        const { isPublished: _, ...rest } = blogData;
        const payload = {
          image: rest.image,
          isFeatured: rest.isFeatured,
          isPublished: rest.isPublished,
          translations: rest.translations,
        };

        Object.keys(payload).forEach((key) => {
          if (payload[key] === undefined) delete payload[key];
        });

        return await generalApiService.update("/blogs", id, payload);
      }
    } catch (error) {
      console.error("Error in blogService.update:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Oops! We couldn't update the blog. Please try again.",
      };
    }
  },

  // /**
  //  * Soft delete blog.
  //  *
  //  * @async
  //  * @param {string|number} id
  //  * @returns {Promise<{ success: boolean, message?: string }>}
  //  */
  // softDelete: async (id) => {
  //   try {
  //     return await generalApiService.delete(`/blogs/${id}`);
  //   } catch (error) {
  //     console.error("Error in blogService.softDelete:", error);
  //     return {
  //       success: false,
  //       message: "Oops! We couldn't delete the blog. Please try again",
  //     };
  //   }
  // },

  /**
   * Hard delete blog (hapus permanen).
   *
   * @async
   * @param {string|number} id
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  hardDelete: async (id) => {
    try {
      return await generalApiService.delete(`/blogs/${id}/hard`);
    } catch (error) {
      console.error("Error in blogService.hardDelete:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't delete the blog permanently. Please try again",
      };
    }
  },

  /**
   * Submit blog untuk direview.
   * Mengubah status DRAFT / REVISION → PENDING_REVIEW.
   * Endpoint: POST /:id/submit
   * Permission: manage blog
   *
   * @async
   * @param {string|number} id
   * @returns {Promise<{ success: boolean, data?: Object, message?: string }>}
   */
  submitReview: async (id) => {
    try {
      if (!id) return { success: false, message: "Blog ID is required" };
      return await generalApiService.create(`/blogs/${id}/submit`);
    } catch (error) {
      console.error("Error in blogService.submitReview:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Oops! We couldn't submit the blog for review. Please try again.",
      };
    }
  },

  /**
   * Approve blog.
   * Mengubah status PENDING_REVIEW → APPROVED.
   * Backend otomatis set isPublished = true dan publishedAt.
   * Endpoint: POST /:id/approve
   * Permission: review blog
   *
   * @async
   * @param {string|number} id
   * @returns {Promise<{ success: boolean, data?: Object, message?: string }>}
   */
  approve: async (id) => {
    try {
      if (!id) return { success: false, message: "Blog ID is required" };
      return await generalApiService.create(`/blogs/${id}/approve`);
    } catch (error) {
      console.error("Error in blogService.approve:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Oops! We couldn't approve the blog. Please try again.",
      };
    }
  },

  /**
   * Reject blog.
   * Mengubah status PENDING_REVIEW → REJECTED.
   * reviewNote wajib diisi sebagai alasan penolakan.
   * Endpoint: POST /:id/reject
   * Permission: review blog
   *
   * @async
   * @param {string|number} id
   * @param {string} reviewNote - Alasan penolakan (wajib)
   * @returns {Promise<{ success: boolean, data?: Object, message?: string }>}
   */
  reject: async (id, reviewNote) => {
    try {
      if (!id) return { success: false, message: "Blog ID is required" };
      if (!reviewNote?.trim()) {
        return {
          success: false,
          message: "Review note is required when rejecting",
        };
      }
      return await generalApiService.create(`/blogs/${id}/reject`, {
        reviewNote,
      });
    } catch (error) {
      console.error("Error in blogService.reject:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Oops! We couldn't reject the blog. Please try again.",
      };
    }
  },

  /**
   * Request revision blog.
   * Mengubah status PENDING_REVIEW → REVISION.
   * reviewNote wajib diisi sebagai catatan revisi.
   * Endpoint: POST /:id/revise
   * Permission: review blog
   *
   * @async
   * @param {string|number} id
   * @param {string} reviewNote - Catatan revisi yang diperlukan (wajib)
   * @returns {Promise<{ success: boolean, data?: Object, message?: string }>}
   */
  requestRevision: async (id, reviewNote) => {
    try {
      if (!id) return { success: false, message: "Blog ID is required" };
      if (!reviewNote?.trim()) {
        return {
          success: false,
          message: "Review note is required when requesting revision",
        };
      }
      return await generalApiService.create(`/blogs/${id}/revise`, {
        reviewNote,
      });
    } catch (error) {
      console.error("Error in blogService.requestRevision:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Oops! We couldn't request revision for the blog. Please try again.",
      };
    }
  },
};
