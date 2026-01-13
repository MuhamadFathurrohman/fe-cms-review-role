/**
 * @file useDateRangeFilter.js
 * @description Hook custom untuk mengelola rentang tanggal filter dengan persistensi.
 * Menyediakan sinkronisasi tiga arah antara:
 * - State React (untuk UI interaktif)
 * - URL query parameters (untuk bookmarkable URLs)
 * - SessionStorage (untuk mempertahankan filter saat refresh)
 * 
 * Mendukung dua mode operasi:
 * - **Custom range**: Menggunakan date picker dengan state sementara
 * - **Preset range**: Langsung menerapkan rentang tanggal tertentu
 */

import { useState, useEffect } from "react";

/**
 * Memformat objek Date ke string YYYY-MM-DD tanpa timezone.
 * Digunakan untuk komunikasi dengan backend yang mengharapkan format ini.
 * 
 * @param {Date} date - Objek Date JavaScript
 * @returns {string} Tanggal dalam format YYYY-MM-DD
 */
const formatDateForBackend = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Hook custom untuk mengelola rentang tanggal filter dengan persistensi.
 * Menggabungkan state management, URL sync, dan sessionStorage persistence.
 * 
 * @param {number} [defaultDaysBack=6] - Jumlah hari ke belakang untuk rentang default
 * @param {string} [storageKey="dateRangeFilter"] - Kunci untuk sessionStorage
 * @returns {{
 *   startDate: string,
 *   endDate: string,
 *   tempStartDate: string,
 *   tempEndDate: string,
 *   setTempStartDate: function(string): void,
 *   setTempEndDate: function(string): void,
 *   applyFilter: function(string, string): void,
 *   resetToDefault: function(): void,
 *   isTempAtDefault: function(): boolean,
 *   isAppliedAtDefault: function(): boolean
 * }} Objek berisi state dan fungsi kontrol rentang tanggal
 * 
 * @example
 * // Penggunaan dasar
 * const {
 *   startDate,
 *   endDate,
 *   tempStartDate,
 *   tempEndDate,
 *   setTempStartDate,
 *   setTempEndDate,
 *   applyFilter,
 *   resetToDefault
 * } = useDateRangeFilter(6, "analyticsDateRange");
 * 
 * @example
 * // Menerapkan preset langsung
 * const applyLast7Days = () => {
 *   const today = new Date();
 *   const start = formatDateForBackend(new Date(today - 6 * 86400000));
 *   const end = formatDateForBackend(today);
 *   applyFilter(start, end);
 * };
 */
export const useDateRangeFilter = (
  defaultDaysBack = 6,
  storageKey = "dateRangeFilter"
) => {
  /**
   * Tanggal mulai sementara untuk date picker UI.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [tempStartDate, setTempStartDate] = useState("");

  /**
   * Tanggal akhir sementara untuk date picker UI.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [tempEndDate, setTempEndDate] = useState("");

  /**
   * Tanggal mulai yang diterapkan saat ini.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [startDate, setStartDate] = useState("");

  /**
   * Tanggal akhir yang diterapkan saat ini.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [endDate, setEndDate] = useState("");

  // Fungsi internal: dapatkan rentang default menggunakan tanggal lokal
  /**
   * Mendapatkan rentang tanggal default berdasarkan parameter days back.
   * Menggunakan tanggal lokal browser untuk konsistensi UX.
   * 
   * @returns {{ startDate: string, endDate: string }} Rentang tanggal default
   */
  const getDefaultDateRange = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - defaultDaysBack);
    return {
      startDate: formatDateForBackend(start),
      endDate: formatDateForBackend(today),
    };
  };

  // Inisialisasi state dari URL atau sessionStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let startFromUrl = urlParams.get("startDate");
    let endFromUrl = urlParams.get("endDate");

    let start, end;

    // 1. Coba dari URL (harus format YYYY-MM-DD valid)
    if (startFromUrl && endFromUrl) {
      const startD = new Date(startFromUrl);
      const endD = new Date(endFromUrl);
      if (
        !isNaN(startD.getTime()) &&
        !isNaN(endD.getTime()) &&
        startD <= endD &&
        /^\d{4}-\d{2}-\d{2}$/.test(startFromUrl) &&
        /^\d{4}-\d{2}-\d{2}$/.test(endFromUrl)
      ) {
        start = startFromUrl;
        end = endFromUrl;
      }
    }

    // 2. Coba dari sessionStorage
    if (!start || !end) {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (
            parsed.startDate &&
            parsed.endDate &&
            /^\d{4}-\d{2}-\d{2}$/.test(parsed.startDate) &&
            /^\d{4}-\d{2}-\d{2}$/.test(parsed.endDate)
          ) {
            const startD = new Date(parsed.startDate);
            const endD = new Date(parsed.endDate);
            if (
              !isNaN(startD.getTime()) &&
              !isNaN(endD.getTime()) &&
              startD <= endD
            ) {
              start = parsed.startDate;
              end = parsed.endDate;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse sessionStorage date range", e);
      }
    }

    // 3. Fallback ke default
    if (!start || !end) {
      const defaultRange = getDefaultDateRange();
      start = defaultRange.startDate;
      end = defaultRange.endDate;
    }

    setStartDate(start);
    setEndDate(end);
    setTempStartDate(start);
    setTempEndDate(end);
  }, [defaultDaysBack, storageKey]);

  /**
   * Menerapkan filter rentang tanggal.
   * Mendukung dua pola panggilan:
   * - `applyFilter()` → Gunakan nilai sementara dari date picker
   * - `applyFilter(startDate, endDate)` → Terapkan rentang langsung (untuk preset)
   * 
   * @param {string} [startArg] - Tanggal mulai opsional (YYYY-MM-DD)
   * @param {string} [endArg] - Tanggal akhir opsional (YYYY-MM-DD)
   */
  const applyFilter = (startArg, endArg) => {
    let s = startArg || tempStartDate;
    let e = endArg || tempEndDate;

    if (!s || !e) return;

    const startD = new Date(s);
    const endD = new Date(e);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || startD > endD)
      return;

    // Set both temp and actual so caller tidak perlu menunggu state update
    setTempStartDate(s);
    setTempEndDate(e);
    setStartDate(s);
    setEndDate(e);

    // Persist ke sessionStorage
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        startDate: s,
        endDate: e,
      })
    );

    // Update URL (replace state, bukan push)
    const newUrl = new URL(window.location);
    newUrl.searchParams.set("startDate", s);
    newUrl.searchParams.set("endDate", e);
    window.history.replaceState(null, "", newUrl);
  };

  /**
   * Mereset filter ke rentang default.
   * Membersihkan sessionStorage dan menghapus parameter URL.
   */
  const resetToDefault = () => {
    const defaultRange = getDefaultDateRange();
    setStartDate(defaultRange.startDate);
    setEndDate(defaultRange.endDate);
    setTempStartDate(defaultRange.startDate);
    setTempEndDate(defaultRange.endDate);

    sessionStorage.removeItem(storageKey);

    const newUrl = new URL(window.location);
    newUrl.searchParams.delete("startDate");
    newUrl.searchParams.delete("endDate");
    window.history.replaceState(null, "", newUrl);
  };

  /**
   * Memeriksa apakah rentang yang diterapkan saat ini sama dengan default.
   * @returns {boolean} `true` jika menggunakan rentang default
   */
  const isAppliedAtDefault = () => {
    const defaultRange = getDefaultDateRange();
    return (
      startDate === defaultRange.startDate && endDate === defaultRange.endDate
    );
  };

  /**
   * Memeriksa apakah rentang sementara saat ini sama dengan default.
   * @returns {boolean} `true` jika rentang sementara menggunakan default
   */
  const isTempAtDefault = () => {
    const defaultRange = getDefaultDateRange();
    return (
      tempStartDate === defaultRange.startDate &&
      tempEndDate === defaultRange.endDate
    );
  };

  return {
    startDate,
    endDate,
    tempStartDate,
    tempEndDate,
    setTempStartDate,
    setTempEndDate,
    applyFilter, // now supports applyFilter(start, end)
    resetToDefault,
    isTempAtDefault,
    isAppliedAtDefault,
  };
};