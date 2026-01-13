/**
 * @file baseService.js
 * @description Kumpulan utilitas dasar yang digunakan di seluruh aplikasi.
 * Menyediakan fungsi helper untuk:
 * - Format tanggal & waktu
 * - Format angka & persentase
 * - Penentuan warna status
 * - Validasi data
 * - Manipulasi array
 *
 * Semua fungsi bersifat stateless dan reusable.
 */

/**
 * Layanan utilitas dasar untuk operasi umum di frontend.
 * @namespace baseService
 */
export const baseService = {
  /**
   * Memformat string tanggal ISO ke format DD/MM/YYYY.
   * Digunakan untuk tampilan tanggal sederhana (tanpa waktu).
   *
   * @param {string | Date | null | undefined} dateStr - Input tanggal dalam bentuk string ISO, objek Date, atau nilai null/undefined
   * @returns {string} Tanggal terformat sebagai "DD/MM/YYYY", atau string kosong jika input tidak valid
   *
   * @example
   * baseService.formatDate("2025-01-13T10:00:00Z"); // "13/01/2025"
   * baseService.formatDate(null); // ""
   */
  formatDate: (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  },

  /**
   * Memformat string tanggal ISO ke format lengkap: DD/MM/YYYY, HH:mm.
   * Digunakan saat informasi waktu diperlukan.
   *
   * @param {string | Date | null | undefined} dateString - Input tanggal
   * @returns {string} Tanggal dan waktu terformat, atau "N/A" jika input tidak valid
   *
   * @example
   * baseService.formatDateTime("2025-01-13T14:30:00Z"); // "13/01/2025, 21:30" (sesuai zona lokal)
   */
  formatDateTime: (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  },

  /**
   * Mengonversi timestamp menjadi representasi "time ago" dalam Bahasa Inggris,
   * dengan fallback ke format absolut jika sudah lewat ≥7 jam.
   *
   * Aturan:
   * - <2 menit → "Just now"
   * - <60 menit → "X minutes ago"
   * - <7 jam → "X hours ago"
   * - ≥7 jam → format absolut (`formatDateTime`)
   *
   * @param {string | Date | null | undefined} date - Timestamp input
   * @returns {string} Representasi waktu relatif atau absolut
   *
   * @example
   * baseService.timeAgo("2026-01-13T10:00:00Z"); // "Just now" (jika sekarang 10:01)
   * baseService.timeAgo("2026-01-13T03:00:00Z"); // "13/01/2026, 10:00" (jika sekarang 10:00 dan >7 jam)
   */
  timeAgo: (date) => {
    if (!date) return "N/A";
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = diffMs / (1000 * 60 * 60); // keep as float for precise 7-hour check

    // Jika kurang dari 2 menit → "Just now"
    if (diffMinutes < 2) {
      return "Just now";
    }

    // Jika kurang dari 7 jam → format relatif (Bahasa Inggris)
    if (diffHours < 7) {
      const hours = Math.floor(diffHours);
      if (diffMinutes < 60) {
        return diffMinutes === 1
          ? "1 minute ago"
          : `${diffMinutes} minutes ago`;
      }
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    }

    // Jika >= 7 jam → format absolut
    return baseService.formatDateTime(date);
  },

  /**
   * Memformat angka menggunakan locale Indonesia (pemisah ribuan: titik).
   * Mendukung opsi Intl.NumberFormat tambahan.
   *
   * @param {number | null | undefined} number - Angka yang akan diformat
   * @param {Intl.NumberFormatOptions} [options={}] - Opsi tambahan untuk Intl.NumberFormat
   * @returns {string} Angka terformat, atau "0" jika input null/undefined
   *
   * @example
   * baseService.formatNumber(1500000); // "1.500.000"
   * baseService.formatNumber(1234.56, { minimumFractionDigits: 2 }); // "1.234,56"
   */
  formatNumber: (number, options = {}) => {
    if (number === null || number === undefined) return "0";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      ...options,
    }).format(number);
  },

  /**
   * Menghitung persentase dari nilai terhadap total.
   *
   * @param {number} value - Nilai bagian
   * @param {number} total - Nilai total
   * @returns {number} Persentase bulat (0–100), atau 0 jika total tidak valid
   *
   * @example
   * baseService.calculatePercentage(25, 100); // 25
   * baseService.calculatePercentage(10, 0); // 0
   */
  calculatePercentage: (value, total) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  },

  /**
   * Menentukan kelas warna berdasarkan status string.
   * Digunakan untuk badge/status indicator di UI.
   *
   * @param {string} status - Status dalam huruf besar (misal: "ACTIVE", "INACTIVE")
   * @returns {"success"|"warning"|"error"|"default"} Kelas warna sesuai status
   *
   * @example
   * baseService.getStatusColor("ACTIVE"); // "success"
   * baseService.getStatusColor("UNKNOWN"); // "default"
   */
  getStatusColor: (status) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "INACTIVE":
        return "warning";
      case "SUSPENDED":
        return "error";
      default:
        return "default";
    }
  },

  /**
   * Memvalidasi format email menggunakan regex sederhana.
   *
   * @param {string} email - String email yang akan divalidasi
   * @returns {boolean} `true` jika format valid, `false` jika tidak
   *
   * @example
   * baseService.isValidEmail("user@example.com"); // true
   * baseService.isValidEmail("invalid-email"); // false
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Mengelompokkan array objek berdasarkan nilai properti tertentu.
   *
   * @template T
   * @param {T[]} array - Array objek yang akan dikelompokkan
   * @param {keyof T} key - Nama properti yang digunakan sebagai kunci pengelompokan
   * @returns {{ [group: string]: T[] }} Objek dengan kunci grup dan nilai array item
   *
   * @example
   * const users = [{ name: "A", role: "admin" }, { name: "B", role: "user" }];
   * baseService.groupBy(users, "role");
   * // { admin: [{ name: "A", role: "admin" }], user: [{ name: "B", role: "user" }] }
   */
  groupBy: (array, key) => {
    if (!Array.isArray(array)) return {};
    return array.reduce((result, item) => {
      const group = item[key];
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {});
  },
};