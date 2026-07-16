/**
 * @file notificationService.js
 * @description Layanan terpusat untuk mengelola operasi notifikasi pengguna.
 * Berkomunikasi langsung dengan `generalApiService` pada endpoint `/notifications`.
 *
 * Menyediakan tiga fungsi utama:
 * - `getNotifications()`: Mengambil daftar notifikasi dengan pagination
 * - `markAsRead()`: Menandai notifikasi sebagai sudah dibaca
 * - `getUnreadCount()`: Mendapatkan jumlah notifikasi belum dibaca
 */

import generalApiService from "./generalApiService";
import { normalizePaginatedResponse } from "./dataService";

/**
 * Layanan notifikasi terpusat.
 * Mengelola semua operasi terkait notifikasi pengguna.
 * 
 * @namespace notificationService
 */
export const notificationService = {
  /**
   * Mengambil daftar notifikasi pengguna dengan dukungan pagination.
   * Mengembalikan data mentah dari backend (transformasi tampilan seperti
   * pemetaan ikon dan default `priority` dilakukan di `notificationUtils`).
   *
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=20] - Jumlah notifikasi per halaman
   * @returns {{
   *   success: boolean,
   *   data: Array<{
   *     id: string|number,
   *     title: string,
   *     message: string,
   *     isRead: boolean,
   *     timestamp: string,
   *     priority: 'low'|'medium'|'high'
   *   }>,
   *   pagination: {
   *     currentPage: number,
   *     totalPages: number,
   *     totalItems: number,
   *     itemsPerPage: number
   *   }
   * }} Respons dengan daftar notifikasi dan metadata pagination
   * 
   * @example
   * const result = await notificationService.getNotifications(1, 10);
   * if (result.success) {
   *   console.log(result.data); // Array notifikasi
   *   console.log(result.pagination); // Metadata pagination
   * }
   */
  async getNotifications(page = 1, limit = 20) {
    try {
      const response = await generalApiService.getAll("/notifications", {
        page,
        limit,
      });

      const result = normalizePaginatedResponse(response);

      if (result.success) {
        return {
          success: true,
          data: result.data,
          pagination: result.pagination,
        };
      }
      return { success: false, data: [], pagination: {} };
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      return { success: false, data: [], pagination: {} };
    }
  },

  /**
   * Menandai notifikasi tertentu sebagai sudah dibaca.
   * 
   * @async
   * @param {string|number} notificationId - ID notifikasi yang akan ditandai
   * @returns {{ success: boolean }} Status keberhasilan operasi
   * 
   * @example
   * const result = await notificationService.markAsRead(123);
   * if (result.success) {
   *   console.log("Notification marked as read");
   * }
   */
  async markAsRead(notificationId) {
    try {
      const result = await generalApiService.patch(
        `/notifications/${notificationId}/read`,
      );
      return { success: result.success };
    } catch (error) {
      console.error("Failed to mark as read:", error);
      return { success: false };
    }
  },

  /**
   * Mendapatkan jumlah notifikasi yang belum dibaca oleh pengguna.
   * 
   * @async
   * @returns {{
   *   success: boolean,
   *   count: number
   * }} Respons dengan jumlah notifikasi belum dibaca
   * 
   * @example
   * const result = await notificationService.getUnreadCount();
   * if (result.success) {
   *   console.log(`Unread notifications: ${result.count}`);
   * }
   */
  async getUnreadCount() {
    try {
      const response = await generalApiService.get(
        "/notifications/unread-count",
      );
      return {
        success: response.success,
        count: response.data?.count || 0,
      };
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
      return { success: false, count: 0 };
    }
  },
};