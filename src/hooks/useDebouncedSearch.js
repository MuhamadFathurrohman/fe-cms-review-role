/**
 * @file useDebouncedSearch.js
 * @description Hook custom untuk mengelola pencarian dengan debouncing dan pagination.
 * Menggabungkan fitur:
 * - Debounced search input (menghindari spam API calls)
 * - Pagination state management
 * - Loading dan error handling
 * - Optional cache bypass untuk data segar
 * - Dukungan statistik dan tren tambahan
 * 
 * Dirancang untuk digunakan dengan fungsi fetch yang mendukung parameter:
 * `(page, limit, searchTerm, bypassCache)`
 */

import { useState, useEffect, useRef } from "react";

/**
 * Hook custom untuk pencarian dengan debouncing dan pagination.
 * Mengelola seluruh state yang diperlukan untuk antarmuka pencarian dinamis.
 * 
 * @param {function(number, number, string, boolean): Promise<Object>} fetchData - Fungsi fetch data yang kompatibel
 *   - Parameter 1: current page
 *   - Parameter 2: items per page (limit)
 *   - Parameter 3: search term
 *   - Parameter 4: bypass cache flag
 *   - Harus mengembalikan objek dengan struktur: { success, data, pagination, stats?, trends? }
 * @param {number} [initialPage=1] - Halaman awal saat hook diinisialisasi
 * @param {number} [initialLimit=8] - Jumlah item per halaman
 * @param {number} [debounceDelay=800] - Delay debouncing dalam milidetik
 * @param {Array} [dependencies=[]] - Dependensi tambahan untuk trigger reload
 * @returns {{
 *   searchTerm: string,
 *   setSearchTerm: function(string): void,
 *   data: Array<Object>,
 *   loading: boolean,
 *   error: string|null,
 *   currentPage: number,
 *   totalPages: number,
 *   limit: number,
 *   goToPage: function(number): void,
 *   refresh: function(boolean): void,
 *   stats: Object,
 *   trends: Object
 * }} Objek berisi state dan fungsi kontrol pencarian
 * 
 * @example
 * // Penggunaan dasar
 * const {
 *   searchTerm,
 *   setSearchTerm,
 *   data,
 *   loading,
 *   error,
 *   currentPage,
 *   totalPages,
 *   goToPage,
 *   refresh
 * } = useDebouncedSearch(
 *   usersService.getPaginated,
 *   1,
 *   10,
 *   500,
 *   [someDependency]
 * );
 * 
 * @example
 * // Dengan refresh force cache bypass
 * const handleForceRefresh = () => {
 *   refresh(true); // bypass cache
 * };
 */
export const useDebouncedSearch = (
  fetchData,
  initialPage = 1,
  initialLimit = 8,
  debounceDelay = 800,
  dependencies = []
) => {
  /**
   * Nilai input pencarian saat ini (belum didebounce).
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [searchTerm, setSearchTerm] = useState("");

  /**
   * Nilai pencarian yang telah didebounce dan siap digunakan untuk fetch.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  /**
   * Data hasil fetch yang ditampilkan di UI.
   * @type {[Array<Object>, React.Dispatch<React.SetStateAction<Array<Object>>>]}
   */
  const [data, setData] = useState([]);

  /**
   * Status loading saat fetch sedang berlangsung.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(true);

  /**
   * Pesan error jika fetch gagal.
   * @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]}
   */
  const [error, setError] = useState(null);

  /**
   * Halaman saat ini untuk pagination.
   * @type {[number, React.Dispatch<React.SetStateAction<number>>]}
   */
  const [currentPage, setCurrentPage] = useState(initialPage);

  /**
   * Total halaman berdasarkan hasil fetch.
   * @type {[number, React.Dispatch<React.SetStateAction<number>>]}
   */
  const [totalPages, setTotalPages] = useState(1);

  /**
   * Limit item per halaman (konstan setelah inisialisasi).
   * @type {number}
   */
  const [limit] = useState(initialLimit);

  /**
   * Statistik tambahan yang dikembalikan oleh API (opsional).
   * @type {[Object, React.Dispatch<React.SetStateAction<Object>>]}
   */
  const [stats, setStats] = useState({});

  /**
   * Data tren tambahan yang dikembalikan oleh API (opsional).
   * @type {[Object, React.Dispatch<React.SetStateAction<Object>>]}
   */
  const [trends, setTrends] = useState({});

  /** @type {React.MutableRefObject<number|null>} Ref untuk timeout debouncing */
  const searchTimeout = useRef(null);

  /**
   * Memuat data dari API dengan parameter yang sesuai.
   * Mendukung bypass cache untuk mendapatkan data terbaru.
   * 
   * @async
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   */
  const loadData = async (bypassCache = false) => {
    setLoading(true);
    try {
      const result = await fetchData(
        currentPage,
        limit,
        debouncedSearchTerm,
        bypassCache
      );

      if (result.success) {
        if (!Array.isArray(result.data)) {
          setData([]);
        } else {
          setData(result.data);
        }
        setTotalPages(result.pagination?.totalPages || 1);
        setError(null);

        setStats(result.stats || {});
        setTrends(result.trends || {});
      } else {
        if (result.message && result.message !== "No data found") {
          setError(result.message);
        } else {
          setError(null);
        }
        setData([]);
        setTotalPages(1);
        setStats({});
        setTrends({});
      }
    } catch (err) {
      setError("An error occurred while loading data");
      setData([]);
      setTotalPages(1);
      setStats({});
      setTrends({});
    } finally {
      setLoading(false);
    }
  };

  // Trigger load data saat dependensi berubah
  useEffect(() => {
    loadData(false);
  }, [currentPage, debouncedSearchTerm, ...dependencies]);

  /**
   * Handler untuk input pencarian dengan debouncing.
   * Mengatur timeout dan mereset ke halaman 1 saat pencarian berubah.
   * 
   * @param {string} value - Nilai input pencarian baru
   */
  const handleSearch = (value) => {
    setSearchTerm(value);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      setDebouncedSearchTerm(value);
      setCurrentPage(1);
    }, debounceDelay);
  };

  // Cleanup timeout saat unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  /**
   * Navigasi ke halaman tertentu dalam pagination.
   * Memastikan halaman berada dalam rentang yang valid.
   * 
   * @param {number} page - Nomor halaman yang dituju
   */
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  /**
   * Memperbarui data dengan opsi bypass cache.
   * Berguna untuk mendapatkan data segar setelah operasi CRUD.
   * 
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   */
  const refresh = (bypassCache = false) => {
    loadData(bypassCache);
  };

  return {
    searchTerm,
    setSearchTerm: handleSearch,
    data,
    loading,
    error,
    currentPage,
    totalPages,
    limit,
    goToPage,
    refresh,
    stats,
    trends,
  };
};