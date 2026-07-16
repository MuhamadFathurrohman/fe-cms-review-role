/**
 * @file dashboardService.js
 * @description Layanan terpusat untuk mengambil data dashboard utama.
 * Menggabungkan data dari berbagai service untuk menyediakan ringkasan komprehensif
 * yang ditampilkan di halaman Home dashboard.
 *
 * Terdiri dari tiga fungsi utama:
 * - `getSummary()`: Mengambil statistik ringkas dan tren analitik
 * - `getRecentVisitors()`: Mengambil daftar pengunjung terbaru
 * - `getContentSummary()`: Mengambil ringkasan status review blog dan items
 */

import { usersService } from "./usersService";
import { clientService } from "./clientService";
import { analyticsService } from "./analyticsService";
import {
  blogService,
  REVIEW_STATUS as BLOG_REVIEW_STATUS,
} from "./blogService";
import {
  itemService,
  REVIEW_STATUS as ITEM_REVIEW_STATUS,
} from "./itemService";

/**
 * Semua status review yang perlu dihitung.
 * @type {string[]}
 */
const ALL_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "REVISION",
];

/**
 * Mengambil jumlah item per status untuk satu modul.
 * Menggunakan Promise.all agar semua status di-fetch paralel.
 *
 * @async
 * @param {'blog'|'item'} type - Tipe modul
 * @param {string|null} userId - ID user untuk filter (null = semua data)
 * @returns {Promise<Object>} Object dengan jumlah per status dan total
 */
const fetchStatusCounts = async (type, userId = null) => {
  try {
    const fetchFn =
      type === "blog"
        ? (status) => {
            const filters = { reviewStatus: status };
            if (userId) filters.submittedBy = userId;
            return blogService.getPaginated(1, 1, "", filters, "EN", false);
          }
        : (status) => {
            const filters = { reviewStatus: status };
            if (userId) filters.submittedBy = userId;
            return itemService.getPaginated(1, 1, "", filters, false);
          };

    const results = await Promise.all(
      ALL_STATUSES.map((status) => fetchFn(status)),
    );

    const counts = {};
    ALL_STATUSES.forEach((status, index) => {
      counts[status] = results[index].success
        ? (results[index].pagination?.totalItems ?? 0)
        : 0;
    });

    counts.total = Object.values(counts).reduce((sum, val) => sum + val, 0);

    return { success: true, counts };
  } catch (err) {
    console.error(`dashboardService.fetchStatusCounts (${type}) error:`, err);
    return {
      success: false,
      counts: {
        DRAFT: 0,
        PENDING_REVIEW: 0,
        APPROVED: 0,
        REJECTED: 0,
        REVISION: 0,
        total: 0,
      },
    };
  }
};

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
   *       snapshot: Object,
   *       trend: Array
   *     }
   *   }
   * }}
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
   * @returns {{ success: boolean, data: Array<Object> }}
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

  /**
   * Mengambil ringkasan status review untuk modul Blog dan Items.
   *
   * Logika filter berdasarkan role:
   * - Reviewer (`isReviewer = true`): semua data tanpa filter user
   * - Staff (`isReviewer = false`): hanya data milik sendiri (filter by userId)
   *
   * Kedua modul di-fetch paralel untuk efisiensi.
   *
   * @async
   * @param {string} userId - ID user yang sedang login
   * @param {boolean} [isReviewer=false] - Apakah user adalah reviewer
   * @param {boolean} [canAccessBlog=false] - Apakah user punya akses ke blog
   * @param {boolean} [canAccessProduct=false] - Apakah user punya akses ke product
   * @returns {{
   *   success: boolean,
   *   data?: {
   *     blog: { counts: Object, total: number },
   *     items: { counts: Object, total: number }
   *   }
   * }}
   */
  getContentSummary: async (
    userId,
    isReviewer = false,
    canAccessBlog = false,
    canAccessProduct = false,
  ) => {
    try {
      // Filter userId: reviewer lihat semua, staff hanya milik sendiri
      const blogUserId = isReviewer ? null : userId;
      const itemUserId = isReviewer ? null : userId;

      const promises = [];
      const keys = [];

      if (canAccessBlog) {
        promises.push(fetchStatusCounts("blog", blogUserId));
        keys.push("blog");
      }
      if (canAccessProduct) {
        promises.push(fetchStatusCounts("item", itemUserId));
        keys.push("items");
      }

      if (promises.length === 0) {
        return { success: true, data: { blog: null, items: null } };
      }

      const results = await Promise.all(promises);

      const data = { blog: null, items: null };
      keys.forEach((key, index) => {
        data[key] = results[index].success ? results[index].counts : null;
      });

      return { success: true, data };
    } catch (err) {
      console.error("dashboardService.getContentSummary error:", err);
      return { success: false, data: { blog: null, items: null } };
    }
  },
};
