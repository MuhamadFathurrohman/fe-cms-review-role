/**
 * @file pagination.js
 * @description Utilitas untuk menghasilkan daftar nomor halaman yang responsif.
 * Mengoptimalkan tampilan pagination berdasarkan ukuran layar:
 * - **Mobile**: Menampilkan maksimal 3 nomor halaman + ellipsis untuk menghemat ruang
 * - **Desktop**: Menampilkan lebih banyak nomor halaman untuk navigasi yang lebih cepat
 * 
 * Algoritma ini memastikan bahwa halaman saat ini selalu terlihat dan memberikan
 * konteks navigasi yang jelas kepada pengguna.
 */

/**
 * Menghasilkan array nomor halaman yang dioptimalkan untuk tampilan UI.
 * Menggunakan deteksi ukuran layar langsung untuk menentukan strategi tampilan.
 * 
 * @param {number} currentPage - Halaman saat ini (1-based)
 * @param {number} totalPages - Total jumlah halaman
 * @returns {(number|string)[]} Array berisi nomor halaman dan string ellipsis ("...")
 *   - Nomor halaman sebagai number
 *   - Ellipsis sebagai string "..."
 * 
 * @example
 * // Desktop, 10 halaman total, di halaman 1
 * generatePageNumbers(1, 10); // [1, 2, 3, 4, 5, "...", 10]
 * 
 * @example
 * // Mobile, 10 halaman total, di halaman 5
 * generatePageNumbers(5, 10); // [1, "...", 5, "...", 10]
 * 
 * @example
 * // Total halaman ≤ 5 (semua ditampilkan)
 * generatePageNumbers(3, 4); // [1, 2, 3, 4]
 */
export const generatePageNumbers = (currentPage, totalPages) => {
  // DETEKSI MOBILE SECARA LANGSUNG
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // Jika total halaman sedikit, tampilkan semua
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (isMobile) {
    // Mobile: tampilkan MAX 3 nomor + ellipsis
    if (currentPage <= 2) {
      return [1, 2, 3, "...", totalPages];
    }
    if (currentPage >= totalPages - 1) {
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage, "...", totalPages];
  }

  // Desktop: tampilkan lebih banyak
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
};