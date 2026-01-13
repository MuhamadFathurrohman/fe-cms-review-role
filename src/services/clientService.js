/**
 * @file clientService.js
 * @description Layanan terpusat untuk mengelola operasi data klien (clients).
 * Klien dalam konteks ini adalah pengguna yang mengisi form dari company profile,
 * baik untuk permintaan katalog maupun kontak umum.
 * 
 * Menyediakan fitur lengkap:
 * - CRUD operations dengan validasi
 * - Penandaan status "replied"
 * - Formatting data untuk tampilan UI
 * - Ekspor data berdasarkan periode
 * - Pagination dengan filter fleksibel
 */

import { dataService } from "./dataService";
import { baseService } from "./baseService";
import generalApiService from "./generalApiService";

/**
 * Layanan klien terpusat.
 * Mengelola semua operasi terkait data klien dari company profile.
 * 
 * @namespace clientService
 */
export const clientService = {
  // Process client list untuk detailed view
  /**
   * Memproses daftar klien untuk ditampilkan di UI.
   * Menambahkan properti yang diformat dan status berbasis logika bisnis.
   * 
   * @param {Array<Object>} clients - Daftar klien dari API
   * @returns {Array<Object>} Daftar klien yang telah diproses dengan properti tambahan
   * 
   * @example
   * const processedClients = clientService.processList(rawClients);
   * // Setiap klien memiliki: joinDateFormatted, statusColor, statusText, dll.
   */
  processList: (clients) => {
    return clients.map((client) => {
      const status = client.isReplied ? "replied" : "not_replied";

      return {
        ...client,
        joinDateFormatted: baseService.formatDateTime(client.createdAt),
        statusColor: baseService.getStatusColor(
          status === "replied" ? "active" : "pending"
        ),
        statusText:
          {
            replied: "Replied",
            not_replied: "Not Replied",
          }[status] || "Not Replied",
        phoneFormatted: client.phone || "N/A",
        typeLabel: client.formType === "CATALOG" ? "Catalog" : "Contact",
      };
    });
  },

  // parameter bypassCache
  /**
   * Mendapatkan daftar klien dengan pagination, pencarian, dan filter.
   * Mendukung filter berdasarkan:
   * - Status deleted (soft delete)
   * - Status replied
   * - Tipe form (CATALOG/CONTACT)
   * - Pencarian teks bebas
   * 
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=10] - Jumlah klien per halaman
   * @param {string} [search=""] - String pencarian (nama, email, pesan)
   * @param {Object} [filters={}] - Filter tambahan
   * @param {boolean} [filters.deleted=false] - Apakah menyertakan data yang dihapus
   * @param {boolean} [filters.isReplied] - Filter berdasarkan status replied
   * @param {string} [filters.formType] - Filter berdasarkan tipe form ("CATALOG" atau "CONTACT")
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   pagination: Object,
   *   message?: string
   * }} Respons dengan daftar klien yang diproses dan metadata pagination
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
        bypassCache,
      };

      // Filter deleted (default: false)
      if (filters.deleted !== undefined) {
        params.deleted = filters.deleted;
      } else {
        params.deleted = "false";
      }

      // Search
      if (search) {
        params.search = search;
      }

      // Filter isReplied
      if (filters.isReplied !== undefined) {
        params.isReplied = filters.isReplied;
      }

      // Filter formType
      if (filters.formType) {
        params.formType = filters.formType;
      }

      const result = await dataService.clients.getAll(params);

      if (!result.success) {
        return result;
      }

      const processedClients = clientService.processList(result.data);

      return {
        success: true,
        data:processedClients,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Error in getPaginated:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the clients. Please try again.",
      };
    }
  },

  /**
   * Membuat klien baru (biasanya dari form company profile).
   * Melakukan validasi ketat sesuai persyaratan backend.
   * 
   * @async
   * @param {Object} clientData - Data klien yang akan dibuat
   * @param {string} clientData.name - Nama klien (wajib)
   * @param {string} clientData.email - Email klien (wajib, harus valid)
   * @param {string} clientData.message - Pesan klien (wajib)
   * @param {string} clientData.formType - Tipe form ("CATALOG" atau "CONTACT", wajib)
   * @param {string} [clientData.phone] - Nomor telepon (opsional)
   * @param {string} [clientData.company] - Nama perusahaan (opsional)
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data klien yang dibuat
   */
  create: async (clientData) => {
    try {
      // Validasi email
      if (clientData.email && !baseService.isValidEmail(clientData.email)) {
        return { success: false, message: "Invalid email format" };
      }

      // Validasi required fields (sesuai backend)
      if (
        !clientData.name ||
        !clientData.email ||
        !clientData.message ||
        !clientData.formType
      ) {
        return {
          success: false,
          message: "Name, email, message, and form type are required",
        };
      }

      // Validasi formType
      if (!["CATALOG", "CONTACT"].includes(clientData.formType)) {
        return {
          success: false,
          message: "Invalid form type. Use CATALOG or CONTACT",
        };
      }

      const createResult = await dataService.clients.create(clientData);

      if (!createResult.success) {
        return createResult;
      }

      return {
        success: true,
        data:createResult.data,
        message: createResult.message || "Client created successfully",
      };
    } catch (error) {
      console.error("Error creating client:", error);
      return {
        success: false,
        message: "Oops! We couldn't create the client. Please try again.",
      };
    }
  },

  /**
   * Memperbarui data klien yang sudah ada.
   * 
   * @async
   * @param {string|number} id - ID klien yang akan diperbarui
   * @param {Object} clientData - Data pembaruan
   * @param {string} [clientData.email] - Email baru (divalidasi)
   * @param {string} [clientData.name] - Nama baru
   * @param {string} [clientData.message] - Pesan baru
   * @param {string} [clientData.phone] - Telepon baru
   * @param {string} [clientData.company] - Perusahaan baru
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data klien yang diperbarui
   */
  update: async (id, clientData) => {
    try {
      if (clientData.email && !baseService.isValidEmail(clientData.email)) {
        return { success: false, message: "Invalid email format" };
      }

      const updateResult = await dataService.clients.update(id, clientData);
      if (!updateResult.success) {
        return updateResult;
      }
      return {
        success: true,
        data:updateResult.data,
        message: "Client updated successfully",
      };
    } catch (error) {
      console.error("Error updating client:", error);
      return {
        success: false,
        message: "Oops! We couldn't update the client. Please try again.",
      };
    }
  },

  // Method untuk mark as replied
  /**
   * Menandai klien sebagai sudah dibalas (replied).
   * Mengubah status `isReplied` menjadi `true`.
   * 
   * @async
   * @param {string|number} id - ID klien yang akan ditandai
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan status operasi
   */
  reply: async (id) => {
    try {
      const result = await dataService.clients.reply(id);
      if (!result.success) {
        return result;
      }
      return {
        success: true,
         data:result.data,
        message: "Client marked as replied",
      };
    } catch (error) {
      console.error("Error replying to client:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't mark the client as replied. Please try again.",
      };
    }
  },

  /**
   * Melakukan soft delete klien (set deletedAt).
   * 
   * @async
   * @param {string|number} id - ID klien yang akan dihapus
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan
   */
  softDelete: async (id) => {
    try {
      const result = await dataService.clients.softDelete(id);
      if (!result.success) {
        return result;
      }
      return {
        success: true,
        message: "Client successfully deleted",
      };
    } catch (error) {
      console.error("Error deleting client:", error);
      return {
        success: false,
        message: "Oops! We couldn't delete the client. Please try again.",
      };
    }
  },

  /**
   * Melakukan hard delete klien (hapus permanen dari database).
   * 
   * @async
   * @param {string|number} id - ID klien yang akan dihapus permanen
   * @returns {{ success: boolean, message?: string }} Status operasi penghapusan permanen
   */
  hardDelete: async (id) => {
    try {
      const result = await dataService.clients.hardDelete(id);
      if (!result.success) {
        return result;
      }
      return {
        success: true,
        message: "Client successfully deleted",
      };
    } catch (error) {
      console.error("Error deleting client:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't delete the client permanently. Please try again.",
      };
    }
  },

  /**
   * Mendapatkan detail klien berdasarkan ID.
   * Secara otomatis memproses data untuk tampilan UI.
   * 
   * @async
   * @param {string|number} id - ID klien yang diminta
   * @returns {{ success: boolean, data?: Object, message?: string }} Respons dengan data klien yang diproses
   */
  getById: async (id) => {
    try {
      const result = await dataService.clients.getById(id);

      if (!result.success) {
        return result;
      }

      const processedClient = clientService.processList([result.data])[0];

      return {
        success: true,
         processedClient,
      };
    } catch (error) {
      console.error("Error getting client:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the client details. Please try again.",
      };
    }
  },

  /**
   * Mengekspor data klien ke format file berdasarkan periode bulan/tahun.
   * Menggunakan endpoint khusus `/clients/export/{format}`.
   * 
   * @async
   * @param {number} month - Bulan (1-12)
   * @param {number} year - Tahun (misal: 2026)
   * @param {'pdf'|'excel'} format - Format ekspor yang diinginkan
   * @returns {{ success: boolean, fileName?: string, error?: string }} Respons dengan nama file jika sukses
   */
  exportData: async (month, year, format) => {
    const url = `/clients/export/${format}`;
    const params = { month, year };
    const fallbackFilename = `clients_export_${year}_${String(month).padStart(
      2,
      "0"
    )}`;
    return await generalApiService.downloadFile(url, params, fallbackFilename);
  },

  /**
   * Mendapatkan jumlah total klien aktif (belum dihapus).
   * Digunakan untuk statistik dashboard.
   * 
   * @async
   * @returns {{ success: boolean, total: number }} Respons dengan jumlah total klien
   */
  getTotalCount: async () => {
    try {
      const result = await dataService.clients.getAll({
        page: 1,
        limit: 1,
        deleted: "false",
        bypassCache: true,
      });
      if (!result.success) {
        return { success: false, total: 0 };
      }
      return {
        success: true,
        total: result.pagination?.totalItems || 0,
      };
    } catch (error) {
      console.error("Error in clientService.getTotalCount:", error);
      return { success: false, total: 0 };
    }
  },
};