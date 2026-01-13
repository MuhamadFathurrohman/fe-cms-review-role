/**
 * @file dashboardService.js
 * @description Layanan terpusat untuk mengambil data dashboard utama.
 * Menggabungkan data dari berbagai service untuk menyediakan ringkasan komprehensif
 * yang ditampilkan di halaman Home dashboard.
 * 
 * Terdiri dari dua fungsi utama:
 * - `getSummary()`: Mengambil statistik ringkas dan tren analitik
 * - `getRecentVisitors()`: Mengambil daftar pengunjung terbaru
 */

import { usersService } from "./usersService";
import { clientService } from "./clientService";
import { analyticsService } from "./analyticsService";

/**
 * Layanan data dashboard terpusat.
 * Mengkoordinasikan permintaan ke berbagai service untuk mengoptimalkan loading.
 * 
 * @namespace dashboardService
 */
export const dashboardService = {
  /**
   * Mengambil ringkasan data dashboard utama.
   * Meliputi:
   * - Total pengguna
   * - Total klien  
   * - Snapshot analitik (page views, bounce rate, session duration)
   * - Tren 30 hari terakhir
   * 
   * Menggunakan Promise.all untuk memuat semua data secara paralel.
   * 
   * @async
   * @returns {{
   *   success: boolean,
   *   data?: {
   *     users: { total: number },
   *     clients: { total: number },
   *     analytics: {
   *       snapshot: {
   *         totalPageViews: number,
   *         totalBounceRate: number,
   *         avgSessionDurationFormatted: string
   *       },
   *       trend: Array<{ date: string, visitors: number }>
   *     }
   *   }
   * }} Respons dengan data ringkasan atau status kegagalan
   * 
   * @example
   * const result = await dashboardService.getSummary();
   * if (result.success) {
   *   console.log(result.data.users.total); // Total pengguna
   *   console.log(result.data.analytics.trend); // Tren 30 hari
   * }
   */
  getSummary: async () => {
    try {
      const [userRes, clientRes, snapshotRes, last30DaysTrendRes] =
        await Promise.all([
          usersService.getTotalCount(),
          clientService.getTotalCount(),
          analyticsService.getDashboardOverviewTrend(30),
          analyticsService.getLast30DaysTrend(30),
        ]);

      return {
        success: true,
        data: {
          users: { total: userRes.success ? userRes.total : 0 },
          clients: { total: clientRes.success ? clientRes.total : 0 },
          analytics: {
            snapshot: snapshotRes.success
              ? snapshotRes.data
              : {
                  totalPageViews: 0,
                  totalBounceRate: 0,
                  avgSessionDurationFormatted: "0m 0s",
                },
            trend: last30DaysTrendRes.success ? last30DaysTrendRes.data : [],
          },
        },
      };
    } catch (err) {
      console.error("dashboardService.getSummary error:", err);
      return { success: false };
    }
  },

  /**
   * Mengambil daftar pengunjung terbaru untuk ditampilkan di aktivitas dashboard.
   * 
   * @async
   * @param {number} [limit=20] - Jumlah maksimum item yang dikembalikan
   * @returns {{
   *   success: boolean,
   *   data: Array<Object>
   * }} Respons dengan daftar pengunjung terbaru atau array kosong jika gagal
   * 
   * @example
   * const visitors = await dashboardService.getRecentVisitors(10);
   * if (visitors.success) {
   *   console.log(visitors.data); // Array pengunjung terbaru
   * }
   */
  getRecentVisitors: async (limit = 20) => {
    try {
      const recentViewsRes =
        await analyticsService.getRecentPageViewsForDashboard(limit);
      if (recentViewsRes.success && Array.isArray(recentViewsRes.recentItems)) {
        return {
          success: true,
          data: recentViewsRes.recentItems.slice(0, limit),
        };
      }
      return { success: false, data: [] };
    } catch (err) {
      console.error("dashboardService.getRecentVisitors error:", err);
      return { success: false, data: [] };
    }
  },
};