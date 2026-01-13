/**
 * @file imageUtils.js
 * @description Utilitas untuk memisahkan gambar menjadi dua kategori:
 * 1. **File baru** yang diupload oleh pengguna (instance File)
 * 2. **Path gambar existing** yang sudah tersimpan di server
 * 
 * Digunakan terutama dalam operasi update produk yang mendukung:
 * - Menjaga gambar existing yang tidak diubah
 * - Mengupload gambar baru yang ditambahkan
 * - Menghapus gambar yang dihapus dari daftar
 */

/**
 * Memisahkan array gambar menjadi file baru dan path existing.
 * Mendukung tiga format input yang berbeda:
 * - Objek dengan properti `file` (File) dan metadata
 * - Objek dengan properti `isExisting` dan `preview` (URL/path existing)
 * - Instance File langsung (fallback)
 * 
 * @param {Array} images - Array gambar dalam berbagai format
 * @returns {{
 *   newFiles: File[],
 *   existingPaths: string[]
 * }} Objek dengan dua array terpisah
 * 
 * @example
 * // Format objek dengan file baru
 * const images = [{ file: new File(...), preview: "blob:..." }];
 * separateImages(images); // { newFiles: [File], existingPaths: [] }
 * 
 * @example
 * // Format objek dengan gambar existing
 * const images = [{ isExisting: true, preview: "https://api.com/uploads/img.jpg" }];
 * separateImages(images); // { newFiles: [], existingPaths: ["/uploads/img.jpg"] }
 * 
 * @example
 * // Format File langsung
 * const images = [new File(...)];
 * separateImages(images); // { newFiles: [File], existingPaths: [] }
 */
export const separateImages = (images) => {
  if (!Array.isArray(images) || images.length === 0) {
    return { newFiles: [], existingPaths: [] };
  }

  /** @type {File[]} Array file gambar baru yang akan diupload */
  const newFiles = [];

  /** @type {string[]} Array path gambar existing yang akan dipertahankan */
  const existingPaths = [];

  for (const img of images) {
    // New uploaded file (objek dengan properti file)
    if (img.file instanceof File) {
      newFiles.push(img.file);
    }
    // Existing image (objek dengan isExisting dan preview URL/path)
    else if (img.isExisting && img.preview) {
      // Extract path from full URL
      let path = img.preview;

      // Convert full URL to path
      if (path.startsWith("http://") || path.startsWith("https://")) {
        try {
          const urlObj = new URL(path);
          path = urlObj.pathname; // Extract /uploads/products/...
        } catch (e) {
          console.warn("Failed to parse URL:", path);
        }
      }

      existingPaths.push(path);
    }
    //  Direct File (fallback untuk array File langsung)
    else if (img instanceof File) {
      newFiles.push(img);
    }
  }

  return { newFiles, existingPaths };
};