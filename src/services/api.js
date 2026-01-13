import axios from "axios";

// =========================
// SESSION STATE
// =========================

/** @type {Array<function(): void>} Daftar callback yang dipanggil saat sesi habis. */
const sessionExpiredListeners = [];

/** @type {Array<function(): void>} Daftar callback yang dipanggil saat sesi habis terlalu lama (>15 menit). */
const tooLongListeners = [];

/** @type {boolean} Flag untuk mencegah pemicuan berulang saat sesi habis. */
let isSessionExpiredTriggered = false;

/** @type {number|null} Timestamp saat sesi pertama kali habis. */
let sessionExpiredAt = null;

// Timer (unified)
/** @type {number|null} Waktu kedaluwarsa access token dalam milidetik sejak epoch. */
let accessTokenExpiryTime = null;

/** @type {NodeJS.Timeout|null} Interval timer untuk memantau status sesi. */
let sessionTimerInterval = null;

/** @constant {number} Durasi maksimal idle (dalam menit) sebelum sesi dianggap terlalu lama habis. */
const MAX_IDLE_MINUTES = 15;

// =========================
// SESSION EXPIRED LISTENERS
// =========================

/**
 * Mendaftarkan callback yang akan dipanggil saat sesi pengguna habis.
 * @param {function(): void} callback - Fungsi yang akan dijalankan saat sesi habis.
 * @returns {function(): void} Fungsi untuk menghapus listener ini dari daftar.
 */
export const onSessionExpired = (callback) => {
  sessionExpiredListeners.push(callback);
  return () => {
    const idx = sessionExpiredListeners.indexOf(callback);
    if (idx !== -1) sessionExpiredListeners.splice(idx, 1);
  };
};

/**
 * Memicu semua listener sesi habis dan menandai bahwa sesi telah habis.
 * Hanya dijalankan sekali meskipun dipanggil berulang.
 * @private
 */
const triggerSessionExpired = () => {
  if (isSessionExpiredTriggered) return;

  isSessionExpiredTriggered = true;
  sessionExpiredAt = Date.now();

  sessionExpiredListeners.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error("Session expired listener error:", err);
    }
  });
};

/**
 * Mereset flag sesi habis agar sesi baru dapat dimulai (misal setelah login ulang).
 */
export const resetSessionExpiredFlag = () => {
  isSessionExpiredTriggered = false;
  sessionExpiredAt = null;
};

/**
 * Memeriksa apakah sesi masih bisa diperpanjang berdasarkan waktu sejak habis.
 * @param {number} [maxIdleMinutes=MAX_IDLE_MINUTES] - Batas waktu idle maksimum dalam menit.
 * @returns {boolean} `true` jika masih dalam batas waktu perpanjangan, `false` jika sudah terlalu lama.
 */
export const canStillExtendSession = (maxIdleMinutes = MAX_IDLE_MINUTES) => {
  if (!sessionExpiredAt) return true;

  const elapsedMinutes = (Date.now() - sessionExpiredAt) / 1000 / 60;
  return elapsedMinutes <= maxIdleMinutes;
};

/**
 * Menghitung berapa menit telah berlalu sejak sesi habis.
 * @returns {number} Jumlah menit sejak sesi habis, atau 0 jika sesi belum pernah habis.
 */
export const getMinutesSinceExpired = () => {
  if (!sessionExpiredAt) return 0;
  return Math.floor((Date.now() - sessionExpiredAt) / 1000 / 60);
};

// =========================
// SESSION EXPIRED TOO LONG LISTENERS
// =========================

/**
 * Mendaftarkan callback yang akan dipanggil saat sesi habis lebih dari batas waktu idle.
 * @param {function(): void} callback - Fungsi yang akan dijalankan saat sesi terlalu lama habis.
 * @returns {function(): void} Fungsi untuk menghapus listener ini dari daftar.
 */
export const onSessionExpiredTooLong = (callback) => {
  tooLongListeners.push(callback);
  return () => {
    const idx = tooLongListeners.indexOf(callback);
    if (idx !== -1) tooLongListeners.splice(idx, 1);
  };
};

/**
 * Memicu semua listener untuk kondisi "sesi habis terlalu lama".
 * Biasanya digunakan untuk redirect ke halaman logout permanen.
 * @private
 */
const triggerSessionExpiredTooLong = () => {
  tooLongListeners.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error("Session expired too long listener error:", err);
    }
  });
};

// =========================
// UNIFIED SESSION TIMER
// =========================

/**
 * Memulai timer sesi terpadu yang memantau:
 * - Kedaluwarsa access token
 * - Waktu idle setelah sesi habis
 * @private
 */
const startSessionTimer = () => {
  stopSessionTimer(); // Cleanup existing

  sessionTimerInterval = setInterval(() => {
    const now = Date.now();

    // Access token expiry
    if (accessTokenExpiryTime && now >= accessTokenExpiryTime) {
      triggerSessionExpired();
      accessTokenExpiryTime = null; // Clear after trigger
    }

    // Too long idle (only if already expired)
    if (sessionExpiredAt) {
      const minutesSinceExpired = (now - sessionExpiredAt) / 1000 / 60;
      if (minutesSinceExpired > MAX_IDLE_MINUTES) {
        triggerSessionExpiredTooLong();
        stopSessionTimer();
      }
    }
  }, 10000);
};

/**
 * Menghentikan dan membersihkan interval timer sesi.
 * @private
 */
const stopSessionTimer = () => {
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }
};

/**
 * Menetapkan waktu kedaluwarsa access token dan memulai timer sesi.
 * @param {number} [expiresInMs=900000] - Durasi validitas token dalam milidetik (default: 15 menit).
 */
export const setAccessTokenExpiry = (expiresInMs = 15 * 60 * 1000) => {
  accessTokenExpiryTime = Date.now() + expiresInMs;
  startSessionTimer();
};

/**
 * Menghentikan timer sesi dan menghapus waktu kedaluwarsa token.
 * Digunakan saat logout atau sesi benar-benar diakhiri.
 */
export const resetAccessTokenExpiry = () => {
  stopSessionTimer();
  accessTokenExpiryTime = null;
};

// =========================
// SESSION REFRESHED LISTENERS
// =========================

/** @type {Array<function(): void>} Daftar callback yang dipanggil saat sesi berhasil diperbarui. */
const sessionRefreshedListeners = [];

/**
 * Mendaftarkan callback yang akan dipanggil saat sesi diperbarui (misal via refresh token).
 * @param {function(): void} callback - Fungsi yang akan dijalankan saat sesi diperbarui.
 * @returns {function(): void} Fungsi untuk menghapus listener ini dari daftar.
 */
export const onSessionRefreshed = (callback) => {
  sessionRefreshedListeners.push(callback);
  return () => {
    const idx = sessionRefreshedListeners.indexOf(callback);
    if (idx !== -1) sessionRefreshedListeners.splice(idx, 1);
  };
};

/**
 * Memicu semua listener sesi diperbarui.
 * Biasanya dipanggil setelah berhasil mendapatkan access token baru.
 */
export const triggerSessionRefreshed = () => {
  sessionRefreshedListeners.forEach((cb) => {
    try {
      cb();
    } catch (error) {
      console.error("Session refreshed listener error:", error);
    }
  });
};

// =========================
// BASE URL
// =========================

/** @constant {string} Base URL untuk semua request API, diambil dari environment variable VITE_API_URL. */
const BASE_URL = import.meta.env.VITE_API_URL || "";

// =========================
// API CLIENTS
// =========================

/**
 * Instance utama Axios dengan konfigurasi default:
 * - baseURL dari environment
 * - timeout 10 detik
 * - withCredentials: true (untuk cookie auth)
 * - Menetapkan Content-Type ke application/json kecuali FormData
 * @type {import('axios').AxiosInstance}
 */
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Instance Axios alternatif tanpa modifikasi header otomatis.
 * Digunakan untuk request yang memerlukan kontrol penuh atas header (misal: upload file).
 * @type {import('axios').AxiosInstance}
 */
const apiClientNoHeaders = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

// Response interceptor untuk menangani unauthorized (401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";

    const isLoginCall = requestUrl.includes("/auth/login");
    const isRefreshCall = requestUrl.includes("/auth/refresh");
    const isMeCall = requestUrl.includes("/auth/me");

    // Trigger sesi habis hanya untuk request non-auth
    if (status === 401 && !isLoginCall && !isMeCall && !isRefreshCall) {
      triggerSessionExpired();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export { apiClientNoHeaders };