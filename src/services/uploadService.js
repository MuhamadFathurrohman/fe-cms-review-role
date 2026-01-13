/**
 * @file uploadService.js
 * @description Layanan terpusat untuk memvalidasi file sebelum diupload.
 * Menyediakan validasi standar untuk:
 * - Tipe file yang diizinkan (default: PNG, JPEG, JPG)
 * - Ukuran maksimum file (default: 2MB)
 * - Keberadaan file
 * 
 * Dirancang untuk digunakan secara konsisten di seluruh aplikasi
 * untuk memastikan kualitas dan keamanan file yang diupload.
 */

/**
 * Memvalidasi file sebelum diupload ke server.
 * Mendukung konfigurasi fleksibel untuk tipe file dan ukuran maksimum.
 * 
 * @param {File} file - Objek File yang akan divalidasi
 * @param {Object} [options={}] - Opsi validasi
 * @param {number} [options.maxSize=2097152] - Ukuran maksimum dalam bytes (default: 2MB)
 * @param {string[]} [options.allowedTypes=["image/png","image/jpeg","image/jpg"]] - Tipe file yang diizinkan
 * @returns {{
 *   isValid: boolean,
 *   error: string|null
 * }} Hasil validasi dengan pesan error jika tidak valid
 * 
 * @example
 * // Validasi gambar default (PNG/JPG, max 2MB)
 * const validation = uploadService.validateFile(file);
 * if (!validation.isValid) {
 *   console.error(validation.error);
 * }
 * 
 * @example
 * // Validasi dengan konfigurasi kustom
 * const validation = uploadService.validateFile(file, {
 *   maxSize: 5 * 1024 * 1024, // 5MB
 *   allowedTypes: ["image/png", "image/jpeg", "image/webp"]
 * });
 */
const validateFile = (file, options = {}) => {
  const {
    maxSize = 2 * 1024 * 1024, // 2MB dalam bytes
    allowedTypes = ["image/png", "image/jpeg", "image/jpg"],
  } = options;

  // Validasi: file harus ada
  if (!file) {
    return {
      isValid: false,
      error: "No file provided",
    };
  }

  // Validasi tipe file
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "File type not allowed. Only PNG and JPG files are accepted.",
    };
  }

  // Validasi ukuran file
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: "File size too large. Maximum size is 2MB.",
    };
  }

  return { isValid: true, error: null };
};

/**
 * Layanan upload terpusat.
 * Menyediakan utilitas validasi untuk memastikan kualitas file yang diupload.
 * 
 * @namespace uploadService
 */
export const uploadService = {
  /**
   * Memvalidasi file sebelum diupload.
   * @function validateFile
   * @memberof uploadService
   */
  validateFile,
};