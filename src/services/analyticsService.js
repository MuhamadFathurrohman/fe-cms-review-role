/**
 * @file analyticsService.js
 * @description Layanan terpusat untuk mengelola operasi data analitik website.
 * Menyediakan abstraksi di atas `dataService.analytics` dengan fitur tambahan:
 * - Agregasi statistik dari data mentah
 * - Transformasi data untuk tampilan UI
 * - Perhitungan tren dan insight
 * - Dukungan pagination dan filter berdasarkan rentang tanggal
 * - Ekspor data berbasis periode
 * 
 * Mengelola dua jenis data:
 * 1. **Data agregat harian**: Statistik per hari (page views, bounce rate, dll.)
 * 2. **Data event-level**: Detail setiap kunjungan halaman (device, browser, dll.)
 */

import { dataService } from "./dataService";
import { baseService } from "./baseService";
import generalApiService from "./generalApiService";

/**
 * Memformat durasi dalam detik ke format "Xm Ys".
 * 
 * @param {number} seconds - Durasi dalam detik
 * @returns {string} Durasi terformat (misal: "5m 30s")
 */
const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return "0m 0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

/**
 * Layanan analitik terpusat.
 * Mengelola semua operasi terkait data analitik website.
 * 
 * @namespace analyticsService
 */
export const analyticsService = {
  // Hitung statistik dari rentang tanggal yang diberikan (misal: 7 hari)
  /**
   * Memproses data analitik menjadi statistik ringkas.
   * Menghitung total dan rata-rata dari data agregat harian.
   * 
   * @param {Array<Object>} analytics - Data analitik agregat harian
   * @returns {Object} Statistik ringkas dengan properti terformat
   */
  processStats: (analytics) => {
    if (!Array.isArray(analytics) || analytics.length === 0) {
      return {
        totalPageViews: 0,
        totalNewVisitors: 0,
        totalReturningVisitors: 0,
        totalBounceRate: 0,
        avgSessionDuration: 0,
        avgSessionDurationFormatted: "0m 0s",
        trend: "stable",
        date: "N/A",
      };
    }

    // Urutkan descending (terbaru ke terlama)
    const sorted = [...analytics].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // Total seluruh rentang
    const totalPageViews = sorted.reduce(
      (sum, d) => sum + (d.pageViews || 0),
      0
    );
    const totalNewVisitors = sorted.reduce(
      (sum, d) => sum + (d.visitor || 0),
      0
    );
    const totalReturningVisitors = sorted.reduce(
      (sum, d) => sum + (d.uniqueVisitor || 0),
      0
    );

    // Rata-rata per hari
    const avgPageViews = Math.round(totalPageViews / sorted.length);
    const avgSessionDuration = Math.round(
      sorted.reduce((sum, d) => sum + (d.avgSessionTime || 0), 0) /
        sorted.length
    );

    // Bounce rate rata-rata tertimbang
    let totalWeightedBounce = 0;
    let totalSessions = 0;
    sorted.forEach((day) => {
      const bounce = parseFloat(day.bounceRate) || 0;
      const sessions = day.sessions || 0;
      totalWeightedBounce += bounce * sessions;
      totalSessions += sessions;
    });
    const totalBounceRate =
      totalSessions > 0 ? Math.round(totalWeightedBounce / totalSessions) : 0;

    const startDate = new Date(sorted[sorted.length - 1]?.date || Date.now());
    const endDate = new Date(sorted[0]?.date || Date.now());
    const dateRange = `${baseService.formatDate(
      startDate
    )} – ${baseService.formatDate(endDate)}`;

    return {
      totalPageViews,
      totalNewVisitors,
      totalReturningVisitors,
      totalBounceRate,
      avgSessionDuration,
      avgSessionDurationFormatted: formatDuration(avgSessionDuration),
      avgPageViews,
      trend: "stable",
      date: dateRange,
    };
  },

  /**
   * Memproses daftar data analitik untuk ditampilkan di UI.
   * Menambahkan properti yang diformat dan metadata.
   * 
   * @param {Array<Object>} analytics - Data analitik dari API
   * @returns {Array<Object>} Data analitik yang telah diproses
   */
  processList: (analytics) => {
    if (!Array.isArray(analytics)) return [];

    return analytics.map((item) => ({
      ...item,
      id: item.id || item.date,
      dateFormatted: baseService.formatDate(item.date),
      bounceRatePercentage: Math.round(parseFloat(item.bounceRate) || 0),
      sessionDurationFormatted: formatDuration(item.avgSessionTime),
      viewsFormatted: baseService.formatNumber(item.pageViews),
      uniqueVisitorsFormatted: baseService.formatNumber(item.uniqueVisitor),
      sessionsFormatted: baseService.formatNumber(item.sessions),
    }));
  },

  // Hitung trend dari dua periode terpisah
  /**
   * Menghitung perubahan persentase antara dua periode waktu.
   * Digunakan untuk menampilkan tren naik/turun di dashboard.
   * 
   * @param {Array<Object>} currentPeriod - Data periode saat ini
   * @param {Array<Object>} previousPeriod - Data periode sebelumnya
   * @returns {Object} Objek dengan perubahan persentase per metrik
   */
  calculateTrendsFromTwoPeriods: (currentPeriod, previousPeriod) => {
    const aggregate = (period) => {
      if (!Array.isArray(period) || period.length === 0) {
        return {
          totalVisitors: 0,
          totalUniqueVisitors: 0,
          totalPageViews: 0,
          totalSessions: 0,
          totalBounced: 0,
          totalSessionTime: 0,
        };
      }
      return period.reduce(
        (acc, day) => {
          const sessions = day.sessions || 0;
          const bounceRate = parseFloat(day.bounceRate) || 0;
          return {
            totalVisitors: acc.totalVisitors + (day.visitor || 0),
            totalUniqueVisitors:
              acc.totalUniqueVisitors + (day.uniqueVisitor || 0),
            totalPageViews: acc.totalPageViews + (day.pageViews || 0),
            totalSessions: acc.totalSessions + sessions,
            totalBounced: acc.totalBounced + (bounceRate / 100) * sessions,
            totalSessionTime: acc.totalSessionTime + (day.avgSessionTime || 0),
          };
        },
        {
          totalVisitors: 0,
          totalUniqueVisitors: 0,
          totalPageViews: 0,
          totalSessions: 0,
          totalBounced: 0,
          totalSessionTime: 0,
        }
      );
    };

    const current = aggregate(currentPeriod);
    const previous = aggregate(previousPeriod);

    const currentBounceRate =
      current.totalSessions > 0
        ? (current.totalBounced / current.totalSessions) * 100
        : 0;
    const previousBounceRate =
      previous.totalSessions > 0
        ? (previous.totalBounced / previous.totalSessions) * 100
        : 0;

    const safeChange = (cur, prev) => {
      if (prev === 0) return cur > 0 ? 100 : cur < 0 ? -100 : 0;
      const change = ((cur - prev) / prev) * 100;
      return Math.max(-100, Math.min(200, change));
    };

    return {
      newVisitors: safeChange(current.totalVisitors, previous.totalVisitors),
      returningVisitors: safeChange(
        current.totalUniqueVisitors,
        previous.totalUniqueVisitors
      ),
      pageViews: safeChange(current.totalPageViews, previous.totalPageViews),
      bounceRate: safeChange(currentBounceRate, previousBounceRate),
      avgSession: safeChange(
        current.totalSessions > 0
          ? current.totalSessionTime / current.totalSessions
          : 0,
        previous.totalSessions > 0
          ? previous.totalSessionTime / previous.totalSessions
          : 0
      ),
    };
  },

  /**
   * Mendapatkan daftar data analitik dengan pagination.
   * Digunakan untuk halaman analitik utama.
   * 
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=30] - Jumlah item per halaman
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   pagination: Object,
   *   stats: Object,
   *   message?: string
   * }} Respons dengan data analitik yang diproses dan statistik
   */
  getPaginated: async (page = 1, limit = 30) => {
    try {
      const params = { page, limit, deletedAt: null };

      const result = await dataService.analytics.getAll(params);
      if (!result.success) return result;

      return {
        success: true,
        data: analyticsService.processList(result.data),
        pagination: result.pagination,
        stats: analyticsService.processStats(result.data),
      };
    } catch (error) {
      console.error("Error analytics getPaginated:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the analytics data. Please try again",
      };
    }
  },

  // method get data endpoint /analytics
  /**
   * Mendapatkan data analitik berdasarkan rentang tanggal.
   * Digunakan untuk filter custom di halaman analitik.
   * 
   * @async
   * @param {string} startDate - Tanggal mulai (YYYY-MM-DD)
   * @param {string} endDate - Tanggal akhir (YYYY-MM-DD)
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   pagination: Object,
   *   stats: Object,
   *   message?: string
   * }} Respons dengan data analitik yang difilter dan statistik
   */
  getByDateRange: async (startDate, endDate) => {
    try {
      const result = await dataService.analytics.getByDateRange(
        startDate,
        endDate
      );

      if (!result.success)
        return { success: false, message: "Failed to load filtered analytics" };

      const analytics = result.data || [];

      return {
        success: true,
        data: analyticsService.processList(analytics),
        pagination: {
          page: 1,
          totalPages: 1,
        },
        stats: analyticsService.processStats(analytics),
      };
    } catch (err) {
      console.error("Error analytics getByDateRange:", err);
      return {
        success: false,
        message:
          "Oops! We couldn't load the filtered analytics data. Please try again",
      };
    }
  },

  // method get data endpoint /analytics/page-views
  /**
   * Mendapatkan detail kunjungan halaman berdasarkan rentang tanggal.
   * Menyediakan breakdown berdasarkan device, browser, dan OS.
   * 
   * @async
   * @param {string} startDate - Tanggal mulai (YYYY-MM-DD)
   * @param {string} endDate - Tanggal akhir (YYYY-MM-DD)
   * @returns {{
   *   success: boolean,
   *   processedPageViews: Array<Object>,
   *   stats: Object,
   *   deviceBreakdown: Array<Object>,
   *   browserBreakdown: Array<Object>,
   *   osBreakdown: Array<Object>,
   *   message?: string
   * }} Respons dengan data detail kunjungan dan breakdown
   */
  getPageViewsByDateRange: async (startDate, endDate) => {
    try {
      const result = await dataService.analytics.getPageViewsByDateRange(
        startDate,
        endDate
      );
      if (!result.success) {
        return {
          success: false,
          message:
            result.error ||
            "Oops! We couldn't load the page views data. Please try again",
        };
      }

      // Proses data
      const processedPageViews = analyticsService.processPageViews(result.data);
      const stats = analyticsService.getPageViewsStats(result.data);
      const allPageViews = result.data || [];

      const deviceMap = {};
      const browserMap = {};
      const osMap = {};

      allPageViews.forEach((view) => {
        const device = view.device || "Unknown";
        const browser = view.browser || "Unknown";
        const os = view.os || "Unknown";

        // Hitung durasi total dan jumlah sesi per kategori
        if (!deviceMap[device])
          deviceMap[device] = { device, totalDuration: 0, viewCount: 0 };
        deviceMap[device].totalDuration += view.duration || 0;
        deviceMap[device].viewCount += 1;

        if (!browserMap[browser])
          browserMap[browser] = { browser, totalDuration: 0, viewCount: 0 };
        browserMap[browser].totalDuration += view.duration || 0;
        browserMap[browser].viewCount += 1;

        if (!osMap[os]) osMap[os] = { os, totalDuration: 0, viewCount: 0 };
        osMap[os].totalDuration += view.duration || 0;
        osMap[os].viewCount += 1;
      });

      const calculateAvgDuration = (item) => {
        return item.viewCount > 0
          ? Math.round(item.totalDuration / item.viewCount)
          : 0;
      };

      const deviceBreakdown = Object.values(deviceMap)
        .map((item) => ({
          ...item,
          avgDuration: calculateAvgDuration(item),
          avgDurationFormatted: formatDuration(calculateAvgDuration(item)),
        }))
        .sort((a, b) => b.avgDuration - a.avgDuration);

      const browserBreakdown = Object.values(browserMap)
        .map((item) => ({
          ...item,
          avgDuration: calculateAvgDuration(item),
          avgDurationFormatted: formatDuration(calculateAvgDuration(item)),
        }))
        .sort((a, b) => b.avgDuration - a.avgDuration);

      const osBreakdown = Object.values(osMap)
        .map((item) => ({
          ...item,
          avgDuration: calculateAvgDuration(item),
          avgDurationFormatted: formatDuration(calculateAvgDuration(item)),
        }))
        .sort((a, b) => b.avgDuration - a.avgDuration);

      return {
        success: true,
        processedPageViews,
        stats,
        deviceBreakdown,
        browserBreakdown,
        osBreakdown,
      };
    } catch (error) {
      console.error("Error in getPageViewsByDateRange:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the page views data. Please try again",
      };
    }
  },

  // --- Fungsi untuk page-views (event-level) ---

  /**
   * Memproses data kunjungan halaman untuk ditampilkan di UI.
   * Menambahkan properti yang diformat dan metadata.
   * 
   * @param {Array<Object>} pageViews - Data kunjungan halaman dari API
   * @returns {Array<Object>} Data kunjungan yang telah diproses
   */
  processPageViews: (pageViews) => {
    return (pageViews || []).map((item) => ({
      ...item,
      timestampFormatted: baseService.formatDateTime(item.createdAt),
      timeAgo: baseService.timeAgo(item.createdAt),
      durationFormatted: `${Math.floor(item.duration / 60)}m ${
        item.duration % 60
      }s`,
      device: item.device || "Unknown",
      browser: item.browser || "Unknown",
      os: item.os || "Unknown",
      country: item.country || "Unknown",
      referrerDomain: item.referrer
        ? new URL(item.referrer).hostname.replace("www.", "")
        : "Direct",
      pagePath: item.page.split("?")[0],
      title: item.title || "Untitled Page",
    }));
  },

  /**
   * Menghitung statistik dari data kunjungan halaman.
   * 
   * @param {Array<Object>} pageViews - Data kunjungan halaman
   * @returns {Object} Statistik ringkas
   */
  getPageViewsStats: (pageViews) => {
    if (!pageViews.length) {
      return {
        totalViews: 0,
        avgDuration: 0,
        avgDurationFormatted: "0m 0s",
      };
    }
    const totalViews = pageViews.length;
    const totalDuration = pageViews.reduce((sum, pv) => sum + pv.duration, 0);
    const avgDuration = Math.round(totalDuration / totalViews);
    return {
      totalViews,
      avgDuration,
      avgDurationFormatted: `${Math.floor(avgDuration / 60)}m ${
        avgDuration % 60
      }s`,
    };
  },

  /**
   * Mendapatkan halaman teratas dari data analitik agregat.
   * 
   * @param {Array<Object>} analyticsData - Data analitik agregat harian
   * @returns {Array<Object>} Daftar halaman teratas dengan persentase
   */
  getTopPagesFromAggregated: (analyticsData) => {
    if (!analyticsData || !Array.isArray(analyticsData)) return [];

    const pageViews = {};

    // Gabungkan semua views per halaman dari setiap hari
    analyticsData.forEach((day) => {
      if (day.pages && typeof day.pages === "object") {
        Object.entries(day.pages).forEach(([path, count]) => {
          pageViews[path] = (pageViews[path] || 0) + count;
        });
      }
    });

    const totalViews = Object.values(pageViews).reduce((sum, n) => sum + n, 0);

    return Object.entries(pageViews)
      .map(([path, views]) => ({
        page: path,
        views,
        percentage:
          totalViews > 0 ? Math.round((views / totalViews) * 10000) / 100 : 0,
        title:
          path === "/"
            ? "Home"
            : path.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ||
              "Untitled Page",
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  },

  // aggregasi dan penjumlahan data agar sinkron dengan preset
  // untuk device, country, browser, os

  /**
   * Mengagregasi breakdown data dari analitik harian.
   * Menghitung persentase untuk country, device, browser, dan OS.
   * 
   * @param {Array<Object>} analyticsData - Data analitik agregat harian
   * @returns {Object} Breakdown data dengan persentase
   */
  aggregateBreakdowns: (analyticsData) => {
    const countries = {};
    const devices = {};
    const browsers = {};
    const operatingSystems = {};

    analyticsData.forEach((day) => {
      // Countries
      if (day.countries && typeof day.countries === "object") {
        Object.entries(day.countries).forEach(([country, count]) => {
          if (country && country !== "null" && count > 0) {
            countries[country] = (countries[country] || 0) + count;
          }
        });
      }

      // Device
      if (day.device && typeof day.device === "object") {
        Object.entries(day.device).forEach(([device, count]) => {
          if (device && count > 0) {
            devices[device] = (devices[device] || 0) + count;
          }
        });
      }

      // Browser
      if (day.browser && typeof day.browser === "object") {
        Object.entries(day.browser).forEach(([browser, count]) => {
          if (browser && count > 0) {
            browsers[browser] = (browsers[browser] || 0) + count;
          }
        });
      }

      // OS (operatingSystem)
      if (day.operatingSystem && typeof day.operatingSystem === "object") {
        Object.entries(day.operatingSystem).forEach(([os, count]) => {
          if (os && count > 0) {
            operatingSystems[os] = (operatingSystems[os] || 0) + count;
          }
        });
      }
    });

    // Hitung total untuk persentase
    const totalCountryViews = Object.values(countries).reduce(
      (sum, n) => sum + n,
      0
    );
    const totalDeviceViews = Object.values(devices).reduce(
      (sum, n) => sum + n,
      0
    );
    const totalBrowserViews = Object.values(browsers).reduce(
      (sum, n) => sum + n,
      0
    );
    const totalOSViews = Object.values(operatingSystems).reduce(
      (sum, n) => sum + n,
      0
    );

    // Format ke array dengan persentase
    const toBreakdown = (obj, total, labelKey = "name", valueKey = "views") => {
      return Object.entries(obj)
        .map(([key, value]) => ({
          [labelKey]: key,
          [valueKey]: value,
          percentage: total > 0 ? Math.round((value / total) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b[valueKey] - a[valueKey]);
    };

    return {
      countryBreakdown: toBreakdown(
        countries,
        totalCountryViews,
        "country",
        "views"
      ),
      deviceBreakdown: toBreakdown(
        devices,
        totalDeviceViews,
        "device",
        "views"
      ),
      browserBreakdown: toBreakdown(
        browsers,
        totalBrowserViews,
        "browser",
        "views"
      ),
      osBreakdown: toBreakdown(operatingSystems, totalOSViews, "os", "views"),
    };
  },

  /**
   * Mendapatkan insight pengunjung berdasarkan rentang tanggal.
   * Menyediakan tren dan breakdown berdasarkan country, device, dll.
   * 
   * @async
   * @param {string} startDate - Tanggal mulai (YYYY-MM-DD)
   * @param {string} endDate - Tanggal akhir (YYYY-MM-DD)
   * @returns {{
   *   success: boolean,
   *   data: Object,
   *   message?: string
   * }} Respons dengan data insight pengunjung
   */
  getVisitorInsights: async (startDate, endDate) => {
    try {
      const result = await dataService.analytics.getByDateRange(
        startDate,
        endDate
      );
      if (!result.success) {
        return {
          success: false,
          message:
            "Oops! we couldn't load the visitor insights. Please try again.",
        };
      }

      const analyticsData = result.data || [];

      // Ambil trend data (sudah benar)
      const trendData = analyticsData
        .map((item) => ({
          rawDate: item.date,
          date: baseService.formatDate(item.date),
          visitors: item.visitor || 0,
          uniqueVisitors: item.uniqueVisitor || 0,
        }))
        .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

      // Ambil breakdown dari data agregat
      const breakdowns = analyticsService.aggregateBreakdowns(analyticsData);

      return {
        success: true,
        data: {
          trendData,
          countryBreakdown: breakdowns.countryBreakdown,
          deviceBreakdown: breakdowns.deviceBreakdown,
          browserBreakdown: breakdowns.browserBreakdown,
          osBreakdown: breakdowns.osBreakdown,
        },
      };
    } catch (error) {
      console.error("Error in getVisitorInsights:", error);
      return {
        success: false,
        message:
          "Oops! we couldn't load the process visitor insights. Please try again. ",
      };
    }
  },

  /**
   * Mendapatkan insight kunjungan halaman berdasarkan rentang tanggal.
   * Menyediakan halaman teratas dan tren kunjungan.
   * 
   * @async
   * @param {string} startDate - Tanggal mulai (YYYY-MM-DD)
   * @param {string} endDate - Tanggal akhir (YYYY-MM-DD)
   * @returns {{
   *   success: boolean,
   *   data: Object,
   *   message?: string
   * }} Respons dengan data insight kunjungan halaman
   */
  getPageViewsInsights: async (startDate, endDate) => {
    try {
      // Hanya gunakan /analytics
      const result = await dataService.analytics.getByDateRange(
        startDate,
        endDate
      );
      if (!result.success) {
        return {
          success: false,
          message: "Oops! We couldn't load analytics. Please try again",
        };
      }

      const analyticsData = result.data || [];

      // Jika tidak ada data
      if (analyticsData.length === 0) {
        return {
          success: true,
          data: {
            topPages: [],
            trendData: [],
          },
        };
      }

      // ==== TOP PAGES ====
      const topPages =
        analyticsService.getTopPagesFromAggregated(analyticsData);

      // ==== TREND DATA (views per hari) ====
      // Pastikan semua tanggal dalam rentang ada (isi 0 jika tidak ada data)
      const trendData = [];
      let current = new Date(startDate);
      const last = new Date(endDate);

      while (current <= last) {
        const dateStr = current.toISOString().split("T")[0];
        // Cari data hari ini
        const dayData = analyticsData.find((d) => d.date.startsWith(dateStr));
        trendData.push({
          date: baseService.formatDate(dateStr, {
            month: "short",
            day: "numeric",
          }),
          views: dayData ? dayData.pageViews || 0 : 0,
        });
        current.setDate(current.getDate() + 1);
      }

      return {
        success: true,
        data: {
          topPages,
          trendData,
        },
      };
    } catch (error) {
      console.error("Error in getPageViewsInsights:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't load the page views insights. Please try again",
      };
    }
  },

  /**
   * Mendapatkan detail bounce rate berdasarkan rentang tanggal.
   * Menyediakan tren, halaman dengan bounce rate tinggi, dan breakdown referrer.
   * 
   * @async
   * @param {string} startDate - Tanggal mulai (YYYY-MM-DD)
   * @param {string} endDate - Tanggal akhir (YYYY-MM-DD)
   * @returns {{
   *   success: boolean,
   *   data: Object,
   *   message?: string
   * }} Respons dengan data detail bounce rate
   */
  getBounceRateDetail: async (startDate, endDate) => {
    try {
      // 1. Ambil data agregat harian dari /analytics untuk trend
      const analyticsResult = await dataService.analytics.getByDateRange(
        startDate,
        endDate
      );

      if (!analyticsResult.success) {
        return {
          success: false,
          message: "Oops! We couldn't load analytics data. Please try again",
        };
      }

      const analyticsData = analyticsResult.data || [];

      // 2. Bangun trendData dari data agregat
      const trendData = analyticsData.map((day) => ({
        rawDate: day.date.split("T")[0], // YYYY-MM-DD
        date: baseService.formatDate(day.date.split("T")[0], {
          month: "short",
          day: "numeric",
        }),
        rate: parseFloat(day.bounceRate) || 0,
      }));

      // 3. Ambil data granular dari /page-views untuk breakdown
      const pageViewsResult =
        await dataService.analytics.getPageViewsByDateRange(startDate, endDate);

      let highBouncePages = [];
      let referrerData = [];

      if (pageViewsResult.success) {
        const allPageViews = pageViewsResult.data || [];

        const filteredPageViews = allPageViews;

        if (filteredPageViews.length > 0) {
          // === GROUP BY SESSION (sama seperti sebelumnya) ===
          const sessions = {};
          filteredPageViews.forEach((view) => {
            const sessionId = view.sessionId || view.id;
            if (!sessions[sessionId]) {
              sessions[sessionId] = { views: [], isBounce: false };
            }
            sessions[sessionId].views.push(view);
          });

          Object.values(sessions).forEach((session) => {
            session.isBounce = session.views.length === 1;
          });

          // === HIGH BOUNCE PAGES (sama seperti sebelumnya) ===
          const pageStats = {};
          filteredPageViews.forEach((view) => {
            const path = view.page.split("?")[0];
            const title = view.title || "Untitled Page";
            const sessionId = view.sessionId || view.id;
            const isBounce = sessions[sessionId]?.isBounce;

            if (!pageStats[path]) {
              pageStats[path] = {
                url: path,
                title,
                totalSessions: 0,
                bouncedSessions: 0,
              };
            }
            pageStats[path].totalSessions += 1;
            if (isBounce) pageStats[path].bouncedSessions += 1;
          });

          highBouncePages = Object.values(pageStats)
            .map((page) => ({
              ...page,
              pageViews: page.totalSessions,
              bounceRate:
                page.totalSessions > 0
                  ? Math.round(
                      (page.bouncedSessions / page.totalSessions) * 100
                    )
                  : 0,
            }))
            .sort((a, b) => b.bounceRate - a.bounceRate)
            .slice(0, 5);

          // === REFERRER BREAKDOWN (sama seperti sebelumnya) ===
          const referrerStats = {};
          filteredPageViews.forEach((view) => {
            let source;
            if (!view.referrer || view.referrer.includes("direct")) {
              source = "Direct";
            } else if (view.referrer.includes("google")) {
              source = "Organic Search";
            } else if (
              view.referrer.includes("facebook") ||
              view.referrer.includes("twitter") ||
              view.referrer.includes("linkedin")
            ) {
              source = "Social Media";
            } else {
              source = "Referral";
            }

            const sessionId = view.sessionId || view.id;
            const isBounce = sessions[sessionId]?.isBounce;

            if (!referrerStats[source]) {
              referrerStats[source] = {
                source,
                totalSessions: 0,
                bouncedSessions: 0,
              };
            }
            referrerStats[source].totalSessions += 1;
            if (isBounce) referrerStats[source].bouncedSessions += 1;
          });

          referrerData = Object.values(referrerStats).map((ref) => {
            const rate =
              ref.totalSessions > 0
                ? Math.round((ref.bouncedSessions / ref.totalSessions) * 100)
                : 0;

            return {
              source: ref.source,
              views: ref.totalSessions,
              bounceRate: rate,
              impactScore: ref.totalSessions * rate,
            };
          });
        }
      }

      return {
        success: true,
        data: {
          trendData,
          highBouncePages,
          referrerData,
        },
      };
    } catch (error) {
      console.error("Error in getBounceRateDetail:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't load the bounce rate detail. Please try again.",
      };
    }
  },

  /**
   * Mendapatkan insight durasi sesi rata-rata berdasarkan rentang tanggal.
   * Menyediakan tren, breakdown device, dan halaman teratas berdasarkan durasi.
   * 
   * @async
   * @param {string} startDate - Tanggal mulai (YYYY-MM-DD)
   * @param {string} endDate - Tanggal akhir (YYYY-MM-DD)
   * @returns {{
   *   success: boolean,
   *   data: Object,
   *   message?: string
   * }} Respons dengan data insight durasi sesi
   */
  getAvgSessionInsights: async (startDate, endDate) => {
    try {
      // 1. Ambil data agregat harian dari /analytics untuk trend
      const analyticsResult = await dataService.analytics.getByDateRange(
        startDate,
        endDate
      );

      if (!analyticsResult.success) {
        return {
          success: false,
          message:
            "Oops! We couldn't load the analytics data. Please try again",
        };
      }

      const analyticsData = analyticsResult.data || [];

      // 2. Bangun trendData dari data agregat
      const trendData = analyticsData.map((day) => ({
        rawDate: day.date.split("T")[0],
        date: baseService.formatDate(day.date.split("T")[0], {
          month: "short",
          day: "numeric",
        }),
        avgDuration: day.avgSessionTime || 0,
        avgDurationFormatted: formatDuration(day.avgSessionTime || 0),
      }));

      // 3. Ambil data granular dari /page-views untuk breakdown
      const pageViewsResult =
        await dataService.analytics.getPageViewsByDateRange(startDate, endDate);

      let deviceBreakdown = [];
      let topPages = [];

      if (pageViewsResult.success) {
        const allPageViews = pageViewsResult.data || [];

        const filteredPageViews = allPageViews;

        if (filteredPageViews.length > 0) {
          // === GROUP BY SESSION (sama seperti sebelumnya) ===
          const sessions = {};
          filteredPageViews.forEach((view) => {
            const sessionId = view.sessionId || view.id;
            if (!sessions[sessionId]) {
              sessions[sessionId] = {
                views: [],
                totalDuration: 0,
                device: view.device || "Unknown",
                os: view.os || "Unknown",
                browser: view.browser || "Unknown",
              };
            }
            sessions[sessionId].views.push(view);
            sessions[sessionId].totalDuration = Math.max(
              sessions[sessionId].totalDuration,
              view.duration || 0
            );
          });

          // === DEVICE BREAKDOWN (sama seperti sebelumnya) ===
          const deviceMap = {};
          Object.values(sessions).forEach((session) => {
            const device = session.device;
            if (!deviceMap[device]) {
              deviceMap[device] = { device, totalDuration: 0, sessionCount: 0 };
            }
            deviceMap[device].totalDuration += session.totalDuration;
            deviceMap[device].sessionCount += 1;
          });

          deviceBreakdown = Object.values(deviceMap)
            .map((item) => {
              const avg =
                item.sessionCount > 0
                  ? Math.round(item.totalDuration / item.sessionCount)
                  : 0;
              return {
                ...item,
                avgDuration: avg,
                avgDurationFormatted: formatDuration(avg),
                sessions: item.sessionCount,
              };
            })
            .sort((a, b) => b.avgDuration - a.avgDuration);

          // === TOP PAGES (sama seperti sebelumnya) ===
          const pageDurationMap = {};
          filteredPageViews.forEach((view) => {
            const path = view.page.split("?")[0];
            const title = view.title || "Untitled Page";
            const sessionId = view.sessionId || view.id;
            const sessionDuration = sessions[sessionId]?.totalDuration || 0;

            if (!pageDurationMap[path]) {
              pageDurationMap[path] = {
                path,
                title,
                totalDuration: 0,
                viewCount: 0,
              };
            }
            pageDurationMap[path].totalDuration += sessionDuration;
            pageDurationMap[path].viewCount += 1;
          });

          topPages = Object.values(pageDurationMap)
            .map((page) => {
              const avg =
                page.viewCount > 0
                  ? Math.round(page.totalDuration / page.viewCount)
                  : 0;
              return {
                ...page,
                avgDuration: avg,
                avgDurationFormatted: formatDuration(avg),
                views: page.viewCount,
              };
            })
            .sort((a, b) => b.avgDuration - a.avgDuration)
            .slice(0, 10);
        }
      }

      return {
        success: true,
        data: {
          trendData,
          deviceBreakdown,
          topPages,
        },
      };
    } catch (error) {
      console.error("Error in getAvgSessionInsights:", error);
      return {
        success: false,
        message:
          "Oops! We couldn't load process session insights. Please try again.",
      };
    }
  },

  // --- Export ---

  /**
   * Mengekspor data analitik ke format file berdasarkan periode bulan/tahun.
   * 
   * @async
   * @param {number} month - Bulan (1-12)
   * @param {number} year - Tahun (misal: 2026)
   * @param {'pdf'|'excel'} format - Format ekspor yang diinginkan
   * @returns {{ success: boolean, fileName?: string, error?: string }} Respons dengan nama file jika sukses
   */
  exportData: async (month, year, format) => {
    const url = `/analytics/export/${format}`;
    const params = {
      month: String(month).padStart(2, "0"),
      year: String(year),
    };
    const fallbackFilename = `analytics_${year}_${String(month).padStart(
      2,
      "0"
    )}`;
    return await generalApiService.downloadFile(url, params, fallbackFilename);
  },

  /**
   * Mendapatkan tren 30 hari terakhir untuk chart di dashboard.
   * Mengisi data kosong dengan nilai 0 untuk visualisasi yang konsisten.
   * 
   * @async
   * @param {number} [days=30] - Jumlah hari ke belakang
   * @returns {{ success: boolean, data: Array<Object> }} Respons dengan data tren
   */
  getLast30DaysTrend: async (days = 30) => {
    try {
      // Validasi input
      if (!days || days < 1) {
        days = 30;
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days + 1);

      // Pastikan startDate tidak lebih dari endDate
      if (startDate > endDate) {
        return { success: false, data: [] };
      }

      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      // Panggil service
      const result = await analyticsService.getByDateRange(startStr, endStr);

      if (!result.success) {
        console.warn("getByDateRange failed, returning empty trend");
        return { success: true, data: [] };
      }

      // Ambil data, jika tidak ada, beri array kosong
      const rawData = Array.isArray(result.data) ? result.data : [];

      // Buat map dari data yang diterima — key: YYYY-MM-DD
      const dataMap = {};
      rawData.forEach((item) => {
        if (!item || !item.date) return;

        // Normalisasi format date (jika ada time)
        const dateKey = item.date.split("T")[0];

        dataMap[dateKey] = {
          visitor: typeof item.visitor === "number" ? item.visitor : 0,
          uniqueVisitor:
            typeof item.uniqueVisitor === "number" ? item.uniqueVisitor : 0,
        };
      });

      // Generate semua tanggal dalam rentang
      const allDates = [];
      let current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toISOString().split("T")[0];
        allDates.push(dateStr);
        current.setDate(current.getDate() + 1);
      }

      // Bangun trend: setiap hari punya nilai, bahkan jika 0
      const trend = allDates.map((date) => {
        const dayData = dataMap[date] || { visitor: 0, uniqueVisitor: 0 };

        return {
          date,
          label: baseService.formatDate(date, {
            month: "short",
            day: "numeric",
          }),
          newVisitors: dayData.visitor,
          returningVisitors: dayData.uniqueVisitor,
        };
      });

      return {
        success: true,
        data: trend,
      };
    } catch (error) {
      console.error("getLast30DaysTrend error:", error);
      return {
        success: false,
        data: [],
      };
    }
  },

  /**
   * Mendapatkan snapshot statistik untuk dashboard overview.
   * 
   * @async
   * @param {number} [days=30] - Jumlah hari untuk perhitungan statistik
   * @returns {{ success: boolean, data: Object }} Respons dengan statistik ringkas
   */
  getDashboardOverviewTrend: async (days = 30) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    try {
      const result = await analyticsService.getByDateRange(startStr, endStr);

      if (!result.success) {
        return {
          success: false,
          data: {
            totalPageViews: 0,
            totalBounceRate: 0,
            avgSessionDuration: 0,
            avgSessionDurationFormatted: "0m 0s",
          },
        };
      }

      const stats = result.stats || {};

      return {
        success: true,
        data: {
          totalPageViews: stats.totalPageViews || 0,
          totalBounceRate: stats.totalBounceRate || 0,
          avgSessionDuration: stats.avgSessionDuration || 0,
          avgSessionDurationFormatted:
            stats.avgSessionDurationFormatted || "0m 0s",
        },
      };
    } catch (error) {
      console.error("getDashboardOverviewTrend error:", error);
      return {
        success: false,
        data: {
          totalPageViews: 0,
          totalBounceRate: 0,
          avgSessionDuration: 0,
          avgSessionDurationFormatted: "0m 0s",
        },
      };
    }
  },

  /**
   * Mendapatkan daftar kunjungan halaman terbaru untuk aktivitas dashboard.
   * 
   * @async
   * @param {number} [limit=20] - Jumlah maksimum item yang dikembalikan
   * @returns {{ success: boolean, recentItems: Array<Object> }} Respons dengan daftar kunjungan terbaru
   */
  getRecentPageViewsForDashboard: async (limit = 20) => {
    try {
      const result = await dataService.analytics.getPageViews({
        _sort: "createdAt",
        _order: "desc",
        _limit: limit,
      });
      if (!result.success) {
        return { success: false, recentItems: [] };
      }
      const processed = (result.data || []).map((item) => ({
        id: item.id,
        country: item.country || "Unknown",
        browser: item.browser || "Unknown",
        os: item.os || "Unknown",
        timestampFormatted: baseService.timeAgo(item.createdAt),
        type: "pageView",
      }));
      return {
        success: true,
        recentItems: processed,
      };
    } catch (error) {
      console.error(
        "Error in analyticsService.getRecentPageViewsForDashboard:",
        error
      );
      return { success: false, recentItems: [] };
    }
  },
};