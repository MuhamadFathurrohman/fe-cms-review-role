/**
 * @file generalApiService.js
 * @description Layanan API generik untuk berinteraksi dengan backend.
 * Menyediakan wrapper seragam di atas Axios dengan penanganan error,
 * format respons konsisten, dan fitur tambahan seperti:
 * - Ekspor data (PDF/Excel)
 * - Download file dengan ekstraksi nama otomatis
 * - Dukungan pagination (untuk `getAll`)
 *
 * Semua metode mengembalikan objek dengan struktur:
 * ```js
 * { success: boolean, data?: any, message?: string, meta?: object }
 * ```
 */

import apiClient from "./api";

/**
 * @typedef {Object} ApiResponseSuccess
 * @property {true} success - Indikator keberhasilan
 * @property {any} data - Data respons dari server
 * @property {Object} [meta] - Metadata tambahan (misal: pagination)
 */

/**
 * @typedef {Object} ApiResponseFailure
 * @property {false} success - Indikator kegagalan
 * @property {string} message - Pesan error yang ramah pengguna
 * @property {string} [error] - Detail error teknis (opsional)
 */

/**
 * @typedef {ApiResponseSuccess | ApiResponseFailure} ApiResponse
 */

/**
 * Layanan API generik untuk operasi CRUD dan utilitas.
 * Menggunakan instance `apiClient` yang telah dikonfigurasi dengan interceptor sesi.
 *
 * @namespace generalApiService
 */
const generalApiService = {
  /**
   * Melakukan GET request ke endpoint tertentu.
   * Digunakan untuk mengambil data tunggal (non-paginated).
   *
   * @param {string} url - URL relatif ke endpoint API (misal: `/users/123`)
   * @returns {Promise<ApiResponse>} Respons dengan `data` jika sukses, atau `message` jika gagal
   */
  get: async (url) => {
    try {
      const response = await apiClient.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`GET ${url} error:`, error);
      return {
        success: false,
        message: "Oops! We couldn't load the data. Try refreshing the page.",
      };
    }
  },

  /**
   * Mengambil daftar data dari endpoint dengan dukungan pagination.
   * Mendeteksi otomatis format respons:
   * - Format paginated: `{ data: [...], meta: {...} }`
   * - Format array langsung: `[...]`
   * - Format objek tunggal: `{ ... }`
   *
   * @param {string} endpoint - Endpoint API (misal: `/users`)
   * @param {Object} [params={}] - Parameter query string
   * @param {boolean} [params.bypassCache=false] - Jika true, tambahkan `_t=timestamp` untuk bypass cache
   * @returns {Promise<ApiResponse & { meta?: Object }>} Respons dengan `data` dan opsional `meta`
   */
  getAll: async (endpoint, params = {}) => {
    try {
      const { bypassCache, ...queryParams } = params;

      const requestParams = bypassCache
        ? { ...queryParams, _t: Date.now() }
        : queryParams;

      const response = await apiClient.get(endpoint, { params: requestParams });

      if (
        response.data &&
        typeof response.data === "object" &&
        !Array.isArray(response.data) &&
        Array.isArray(response.data.data) &&
        response.data.meta
      ) {
        return {
          success: true,
          data: response.data.data,
          meta: response.data.meta,
        };
      }

      if (Array.isArray(response.data)) {
        return { success: true, data: response.data };
      }

      if (response.data && typeof response.data === "object") {
        return { success: true, data: response.data };
      }

      console.warn(
        `[generalApiService] Unrecognized response format for ${endpoint}`,
        response.data
      );
      return { success: false, message: "Invalid data format from server." };
    } catch (error) {
      console.error(`GET ${endpoint} error:`, error);
      return {
        success: false,
        message: "Oops! We couldn't load the data. Try refreshing the page.",
      };
    }
  },

  /**
   * Membuat resource baru melalui POST request.
   *
   * @param {string} endpoint - Endpoint API (misal: `/users`)
   * @param {Object} data - Data yang akan dikirim dalam body request
   * @returns {Promise<ApiResponse>} Respons dengan `data` jika sukses
   */
  create: async (endpoint, data) => {
    try {
      const response = await apiClient.post(endpoint, data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`POST ${endpoint} error:`, error);
      return {
        success: false,
        message:
          "Something went wrong while adding your data. Please try again.",
      };
    }
  },

  /**
   * Memperbarui resource yang ada melalui PUT request.
   * Mendukung dua gaya pemanggilan:
   * 1. `update('/users', { id: 123, name: 'John' })`
   * 2. `update('/users', 123, { name: 'John' })`
   *
   * @param {string} urlOrEndpoint - URL lengkap atau base endpoint
   * @param {string|number|Object} idOrData - ID resource atau objek data lengkap
   * @param {Object} [data] - Data pembaruan (hanya digunakan pada gaya pemanggilan #2)
   * @returns {Promise<ApiResponse>} Respons dengan `data` jika sukses
   * @throws {Error} Jika parameter tidak valid
   */
  update: async (urlOrEndpoint, idOrData, data) => {
    try {
      let url, payload;

      if (typeof idOrData === "object" && data === undefined) {
        url = urlOrEndpoint;
        payload = idOrData;
      } else if (typeof idOrData === "string" || typeof idOrData === "number") {
        url = `${urlOrEndpoint}/${idOrData}`;
        payload = data;
      } else {
        throw new Error("Invalid update parameters");
      }

      const response = await apiClient.put(url, payload);

      return { success: true, data: response.data };
    } catch (error) {
      console.error(`PUT ${urlOrEndpoint} error:`, error);
      return {
        success: false,
        message: "We couldn't update your data. Try again in a moment",
      };
    }
  },

  /**
   * Menghapus resource melalui DELETE request.
   * Mendukung dua gaya:
   * 1. `delete('/users/123')`
   * 2. `delete('/users', 123)`
   *
   * @param {string} urlOrEndpoint - URL lengkap atau base endpoint
   * @param {string|number} [id] - ID resource (opsional, jika URL belum lengkap)
   * @returns {Promise<ApiResponse>} Respons sukses tanpa data
   */
  delete: async (urlOrEndpoint, id) => {
    try {
      const url =
        typeof id !== "undefined" ? `${urlOrEndpoint}/${id}` : urlOrEndpoint;
      await apiClient.delete(url);
      return { success: true };
    } catch (error) {
      console.error(`DELETE ${urlOrEndpoint} error:`, error);
      return {
        success: false,
        message: "Unable to delete this data. Please try again",
      };
    }
  },

  /**
   * Melakukan partial update melalui PATCH request.
   *
   * @param {string} endpoint - Endpoint API lengkap (misal: `/users/123/avatar`)
   * @param {Object} [data={}] - Data parsial yang akan diperbarui
   * @returns {Promise<ApiResponse>} Respons dengan `data` jika sukses
   */
  patch: async (endpoint, data = {}) => {
    try {
      const response = await apiClient.patch(endpoint, data);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Request failed",
      };
    }
  },

  /**
   * Mengekspor data entitas ke format file (PDF/Excel).
   * Mengunduh file secara otomatis dan mengekstrak nama file dari header respons.
   *
   * @param {string} entity - Nama entitas (misal: `'users'`, `'brand'`, `'product'`)
   * @param {'pdf'|'excel'} format - Format ekspor yang diinginkan
   * @returns {Promise<ApiResponse & { fileName?: string }>} Respons dengan `fileName` jika sukses
   * @throws {Error} Jika entitas atau format tidak valid
   */
  exportData: async (entity, format) => {
    try {
      // Tambahkan mapping untuk entitas yang menggunakan bentuk plural di backend
      const entityMap = {
        brand: "brands",
        product: "products",
        users: "users",
      };
      const routeEntity = entityMap[entity] || entity;

      // Validasi berdasarkan routeEntity (bentuk yang benar)
      const validEntities = ["users", "brands", "products"]; // sesuaikan dengan route backend
      const validFormats = ["pdf", "excel"];

      if (!validEntities.includes(routeEntity)) {
        throw new Error(`Invalid entity: ${entity}`);
      }
      if (!validFormats.includes(format)) {
        throw new Error(`Invalid format: ${format}`);
      }

      // Gunakan routeEntity di URL
      const response = await apiClient.get(`/${routeEntity}/export/${format}`, {
        responseType: "blob",
      });

      const contentType = response.headers["content-type"];
      const contentDisposition = response.headers["content-disposition"];
      let fileName = `${routeEntity}_export.${
        format === "excel" ? "xlsx" : "pdf"
      }`;

      // Ekstrak filename dari header jika tersedia
      if (contentDisposition) {
        const match = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, "");
        }
      }

      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, fileName };
    } catch (error) {
      console.error(`Export ${entity} to ${format} failed:`, error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Oops! We couldn't export the data. Please try again.",
      };
    }
  },

  /**
   * Mengunduh file dari URL tertentu dengan ekstraksi nama file otomatis.
   * Digunakan untuk download file generik (misal: avatar, dokumen).
   *
   * @param {string} url - URL lengkap ke file
   * @param {Object} [params={}] - Parameter query string (opsional)
   * @param {string} [fallbackFilename="download"] - Nama file cadangan jika header tidak menyediakan
   * @returns {Promise<ApiResponse & { fileName?: string }>} Respons dengan `fileName` jika sukses
   */
  downloadFile: async (url, params = {}, fallbackFilename = "download") => {
    try {
      const response = await apiClient.get(url, {
        params,
        responseType: "blob",
      });

      const contentType = response.headers["content-type"];
      const contentDisposition = response.headers["content-disposition"];
      let fileName = fallbackFilename;

      // Ekstrak filename dari header jika tersedia
      if (contentDisposition) {
        const match = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, "");
        }
      } else {
        // Jika tidak ada header, pastikan ekstensi sesuai konten
        const ext = contentType?.includes("pdf")
          ? "pdf"
          : contentType?.includes("excel") ||
            contentType?.includes("spreadsheet")
          ? "xlsx"
          : "bin";
        fileName = `${fallbackFilename}.${ext}`;
      }

      const blob = new Blob([response.data], { type: contentType });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      return { success: true, fileName };
    } catch (error) {
      console.error(`DOWNLOAD ${url} failed:`, error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Oops! We couldn't export the data. Please try again.",
      };
    }
  },
};

export default generalApiService;