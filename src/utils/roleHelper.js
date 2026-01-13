/**
 * @file roleHelper.js
 * @description Utilitas untuk memformat dan mengelola tampilan nama peran (role) pengguna.
 * Menyediakan dua fungsi utama:
 * - `formatRoleName`: Mengubah nama peran dari format database ke format tampilan manusiawi
 * - `getRoleBadgeClass`: Menentukan kelas CSS untuk badge berdasarkan jenis peran
 * 
 * Digunakan secara konsisten di seluruh antarmuka pengguna untuk menampilkan informasi peran.
 */

/**
 * Memformat nama peran dari format database ke format tampilan yang ramah pengguna.
 * Mengubah underscore menjadi spasi dan mengkapitalisasi setiap kata.
 * 
 * @param {string|null|undefined} roleName - Nama peran dalam format database (misal: "super_admin", "content_editor")
 * @returns {string} Nama peran yang telah diformat (misal: "Super Admin", "Content Editor")
 * 
 * @example
 * formatRoleName("super_admin"); // "Super Admin"
 * formatRoleName("content_editor"); // "Content Editor"
 * formatRoleName(null); // "Unknown"
 * formatRoleName("unknown"); // "Unknown"
 */
export const formatRoleName = (roleName) => {
  if (!roleName || roleName === "unknown") return "Unknown";
  return roleName
    .replace(/_/g, " ") // Ganti underscore dengan spasi
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize setiap kata
};

/**
 * Menentukan kelas CSS untuk badge peran berdasarkan jenis peran.
 * Menggunakan sistem klasifikasi tiga tingkat:
 * - `super-admin`: Untuk super administrator
 * - `admin`: Untuk administrator biasa  
 * - `user`: Untuk semua peran lainnya (warna default)
 * 
 * @param {string|null|undefined} roleName - Nama peran yang telah diformat (misal: "Super Admin", "Editor")
 * @returns {string} Kelas CSS yang sesuai untuk styling badge
 * 
 * @example
 * getRoleBadgeClass("Super Admin"); // "super-admin"
 * getRoleBadgeClass("Admin"); // "admin" 
 * getRoleBadgeClass("Editor"); // "user"
 * getRoleBadgeClass(null); // "user"
 */
export const getRoleBadgeClass = (roleName) => {
  const normalized = (roleName || "").toLowerCase();
  if (normalized === "super admin") return "super-admin";
  if (normalized === "admin") return "admin";
  return "user";
};