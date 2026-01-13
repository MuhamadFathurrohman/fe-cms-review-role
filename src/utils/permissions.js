/**
 * @file permissions.js
 * @description Utilitas untuk memeriksa izin akses pengguna berdasarkan sistem permission-based.
 * Mendukung tiga level akses:
 * - `read`: Akses baca saja
 * - `manage`: Akses penuh (baca, buat, edit, hapus)
 * - `null/undefined`: Tidak memerlukan izin (akses publik dalam konteks terautentikasi)
 * 
 * Semua fungsi dirancang untuk aman terhadap input null/undefined dan struktur data yang tidak valid.
 */

/**
 * Memeriksa apakah pengguna memiliki izin baca atau kelola untuk sumber daya tertentu.
 * Izin "manage" secara implisit mencakup izin "read".
 * 
 * @param {Array<{resource: string, access: string}>} userPermissions - Daftar izin pengguna dari AuthContext
 * @param {string|null|undefined} resource - Nama sumber daya yang diperiksa (misal: "user", "product")
 * @returns {boolean} `true` jika pengguna memiliki izin baca/kelola, `false` jika tidak
 * 
 * @example
 * // Izin baca
 * canRead([{ resource: "user", access: "read" }], "user"); // true
 * 
 * // Izin kelola (mencakup baca)
 * canRead([{ resource: "user", access: "manage" }], "user"); // true
 * 
 * // Tidak ada izin
 * canRead([], "user"); // false
 * 
 * // Resource null/undefined → akses diizinkan
 * canRead(userPermissions, null); // true
 */
export const canRead = (userPermissions, resource) => {
  // ✅ Jika resource null/undefined, beri akses (karena berarti "tidak perlu permission")
  if (resource === null || resource === undefined) {
    return true;
  }

  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }

  const perm = userPermissions.find((p) => p.resource === resource);
  if (!perm) return false;

  return perm.access === "read" || perm.access === "manage";
};

/**
 * Memeriksa apakah pengguna memiliki izin kelola penuh untuk sumber daya tertentu.
 * Hanya mengembalikan `true` untuk akses "manage", bukan "read".
 * 
 * @param {Array<{resource: string, access: string}>} userPermissions - Daftar izin pengguna
 * @param {string} resource - Nama sumber daya yang diperiksa
 * @returns {boolean} `true` jika pengguna memiliki izin kelola, `false` jika tidak
 * 
 * @example
 * canManage([{ resource: "user", access: "manage" }], "user"); // true
 * canManage([{ resource: "user", access: "read" }], "user"); // false
 */
export const canManage = (userPermissions, resource) => {
  if (!userPermissions || !Array.isArray(userPermissions) || !resource) {
    return false;
  }

  const perm = userPermissions.find((p) => p.resource === resource);
  return perm?.access === "manage";
};

/**
 * Memeriksa apakah pengguna dapat mengekspor data untuk sumber daya tertentu.
 * Hanya sumber daya tertentu yang diizinkan untuk diekspor, dan pengguna harus memiliki izin baca.
 * 
 * @param {Array<{resource: string, access: string}>} userPermissions - Daftar izin pengguna
 * @param {string} resource - Nama sumber daya yang diperiksa
 * @returns {boolean} `true` jika ekspor diizinkan, `false` jika tidak
 * 
 * @example
 * // User memiliki izin baca untuk "user" → ekspor diizinkan
 * canExport([{ resource: "user", access: "read" }], "user"); // true
 * 
 * // "settings" tidak dalam daftar ekspor → ditolak
 * canExport(userPermissions, "settings"); // false
 */
export const canExport = (userPermissions, resource) => {
  const exportableResources = [
    "user",
    "client",
    "analytics",
    "brand",
    "product",
  ];
  if (!exportableResources.includes(resource)) {
    return false;
  }
  return canRead(userPermissions, resource);
};

/**
 * Memeriksa izin berdasarkan objek konfigurasi izin.
 * Digunakan untuk integrasi dengan sistem yang menyediakan izin sebagai objek `{ resource, access }`.
 * 
 * @param {Array<{resource: string, access: string}>} userPermissions - Daftar izin pengguna
 * @param {{resource: string, access: string}|null|undefined} requiredPermission - Objek izin yang dibutuhkan
 * @returns {boolean} `true` jika izin sesuai, `false` jika tidak
 * 
 * @example
 * hasPermission(userPermissions, { resource: "user", access: "read" }); // true/false
 * hasPermission(userPermissions, null); // true (tidak perlu izin)
 */
export const hasPermission = (userPermissions, requiredPermission) => {
  if (requiredPermission === null || requiredPermission === undefined) {
    return true;
  }

  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }

  const { resource, access } = requiredPermission;
  return access === "read"
    ? canRead(userPermissions, resource)
    : canManage(userPermissions, resource);
};

/**
 * Memeriksa apakah pengguna adalah super admin.
 * Super admin memiliki akses penuh ke semua fitur tanpa pembatasan izin.
 * 
 * @param {Object} user - Objek pengguna dari AuthContext
 * @param {string} [user.roleName] - Nama peran pengguna
 * @returns {boolean} `true` jika pengguna adalah super admin, `false` jika tidak
 * 
 * @example
 * isSuperAdmin({ roleName: "super_admin" }); // true
 * isSuperAdmin({ roleName: "admin" }); // false
 */
export const isSuperAdmin = (user) => {
  return user?.roleName === "super_admin";
};