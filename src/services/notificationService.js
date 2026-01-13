/**
 * @file notificationService.js
 * @description Layanan terpusat untuk mengelola operasi notifikasi pengguna.
 * Bertindak sebagai lapisan abstraksi di atas `dataService.notifications`
 * untuk menyediakan API yang konsisten dan mudah digunakan.
 * 
 * Menyediakan tiga fungsi utama:
 * - `getNotifications()`: Mengambil daftar notifikasi dengan pagination
 * - `markAsRead()`: Menandai notifikasi sebagai sudah dibaca
 * - `getUnreadCount()`: Mendapatkan jumlah notifikasi belum dibaca
 */

import { dataService } from "./dataService";

/**
 * Layanan notifikasi terpusat.
 * Mengelola semua operasi terkait notifikasi pengguna.
 * 
 * @namespace notificationService
 */
export const notificationService = {
  /**
   * Mengambil daftar notifikasi pengguna dengan dukungan pagination.
   * Secara otomatis menambahkan properti `priority` dengan nilai default "medium"
   * jika tidak disediakan oleh backend.
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
      const result = await dataService.notifications.getAll({
        page,
        limit,
      });

      if (result.success) {
        // Tambahkan priority jika belum ada
        const notificationsWithPriority = result.data.map((notif) => ({
          ...notif,
          priority: notif.priority || "medium",
        }));

        return {
          success: true,
          data: notificationsWithPriority,
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
      const result = await dataService.notifications.markAsRead(notificationId);
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
      const result = await dataService.notifications.getUnreadCount();
      return {
        success: true,
        count: result.count || 0,
      };
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
      return { success: false, count: 0 };
    }
  },
};