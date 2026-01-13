/**
 * @file actionHelper.js
 * @description Utilitas untuk memformat dan mengklasifikasikan nama aksi dari sistem audit log.
 * Digunakan untuk menampilkan informasi audit log dalam format yang ramah pengguna,
 * dengan styling visual yang sesuai berdasarkan kategori aksi.
 * 
 * Mendukung dua fungsi utama:
 * - `formatActionName`: Mengubah nama aksi dari format database ke Title Case
 * - `getActionBadgeClass`: Menentukan kelas CSS berdasarkan kategori aksi
 */

/**
 * Memformat nama aksi dari format database ke format tampilan yang ramah pengguna.
 * Mengubah underscore menjadi spasi dan mengkapitalisasi setiap kata.
 * 
 * @param {string|null|undefined} action - Nama aksi dalam format database (misal: "CREATE_PRODUCT", "USER_LOGIN")
 * @returns {string} Nama aksi yang telah diformat (misal: "Create Product", "User Login"), atau "—" jika input tidak valid
 * 
 * @example
 * formatActionName("CREATE_PRODUCT"); // "Create Product"
 * formatActionName("USER_LOGIN"); // "User Login"
 * formatActionName(null); // "—"
 * formatActionName(""); // "—"
 */
export const formatActionName = (action) => {
  if (!action) return "—";
  return action
    .replace(/_/g, " ") // Ganti underscore dengan spasi
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize setiap kata
};

/**
 * Menentukan kelas CSS untuk badge aksi berdasarkan kategori fungsional.
 * Mengklasifikasikan aksi ke dalam kategori berikut:
 * - `auth`: Aksi terkait autentikasi (login, logout, reset password)
 * - `create`: Aksi pembuatan data
 * - `update`: Aksi pembaruan data  
 * - `delete`: Aksi penghapusan data
 * - `restore`: Aksi pemulihan data
 * - `other`: Semua aksi lainnya
 * - `unknown`: Input tidak valid
 * 
 * @param {string|null|undefined} action - Nama aksi dalam format database
 * @returns {string} Kelas CSS yang sesuai untuk styling badge
 * 
 * @example
 * getActionBadgeClass("CREATE_USER"); // "create"
 * getActionBadgeClass("USER_LOGIN"); // "auth"
 * getActionBadgeClass("UPDATE_PRODUCT"); // "update"
 * getActionBadgeClass("DELETE_CATEGORY"); // "delete"
 * getActionBadgeClass("VIEW_DASHBOARD"); // "other"
 * getActionBadgeClass(null); // "unknown"
 */
export const getActionBadgeClass = (action) => {
  if (!action) return "unknown";

  const normalized = action.toLowerCase();

  // Auth-related actions
  if (
    normalized.includes("login") ||
    normalized.includes("logout") ||
    normalized.includes("forgot_password") ||
    normalized.includes("reset_password")
  ) {
    return "auth";
  }

  // Create actions
  if (normalized.startsWith("create")) {
    return "create";
  }

  // Update actions
  if (normalized.startsWith("update")) {
    return "update";
  }

  // Delete actions
  if (normalized.startsWith("delete")) {
    return "delete";
  }

  // Restore actions
  if (normalized.startsWith("restore")) {
    return "restore";
  }

  // Default
  return "other";
};