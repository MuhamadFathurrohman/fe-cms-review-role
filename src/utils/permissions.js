/**
 * @file permissions.js
 * @description Utilitas untuk memeriksa izin akses pengguna berdasarkan sistem permission-based.
 * Mendukung empat level akses:
 * - `read`: Akses baca saja
 * - `manage`: Akses penuh (baca, buat, edit, hapus)
 * - `review`: Akses review (approve, reject, request revision)
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
 * canRead([{ resource: "user", access: "read" }], "user"); // true
 * canRead([{ resource: "user", access: "manage" }], "user"); // true
 * canRead([], "user"); // false
 * canRead(userPermissions, null); // true
 */
export const canRead = (userPermissions, resource) => {
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
 * Hanya mengembalikan `true` untuk akses "manage", bukan "read" atau "review".
 *
 * @param {Array<{resource: string, access: string}>} userPermissions - Daftar izin pengguna
 * @param {string} resource - Nama sumber daya yang diperiksa
 * @returns {boolean} `true` jika pengguna memiliki izin kelola, `false` jika tidak
 *
 * @example
 * canManage([{ resource: "user", access: "manage" }], "user"); // true
 * canManage([{ resource: "user", access: "read" }], "user"); // false
 * canManage([{ resource: "blog", access: "review" }], "blog"); // false
 */
export const canManage = (userPermissions, resource) => {
  if (!userPermissions || !Array.isArray(userPermissions) || !resource) {
    return false;
  }

  const perm = userPermissions.find((p) => p.resource === resource);
  return perm?.access === "manage";
};

/**
 * Memeriksa apakah pengguna memiliki izin review untuk sumber daya tertentu.
 * Digunakan untuk aksi approve, reject, dan request revision.
 * Hanya mengembalikan `true` untuk akses "review", bukan "read" atau "manage".
 *
 * @param {Array<{resource: string, access: string}>} userPermissions - Daftar izin pengguna
 * @param {string} resource - Nama sumber daya yang diperiksa (misal: "blog", "product")
 * @returns {boolean} `true` jika pengguna memiliki izin review, `false` jika tidak
 *
 * @example
 * canReview([{ resource: "blog", access: "review" }], "blog"); // true
 * canReview([{ resource: "blog", access: "manage" }], "blog"); // false
 * canReview([{ resource: "blog", access: "read" }], "blog"); // false
 */
export const canReview = (userPermissions, resource) => {
  if (!userPermissions || !Array.isArray(userPermissions) || !resource) {
    return false;
  }

  const perm = userPermissions.find((p) => p.resource === resource);
  return perm?.access === "review";
};

/**
 * Memeriksa apakah pengguna memiliki akses apapun ke sumber daya tertentu.
 * Mencakup semua level akses: read, manage, dan review.
 * Digunakan untuk melindungi rute yang bisa diakses oleh lebih dari satu level,
 * misalnya halaman Blogs yang bisa diakses oleh manage (author) dan review (reviewer).
 *
 * @param {Array<{resource: string, access: string}>} userPermissions - Daftar izin pengguna
 * @param {string|null|undefined} resource - Nama sumber daya yang diperiksa
 * @returns {boolean} `true` jika pengguna memiliki akses level apapun, `false` jika tidak
 *
 * @example
 * canAccess([{ resource: "blog", access: "review" }], "blog"); // true
 * canAccess([{ resource: "blog", access: "manage" }], "blog"); // true
 * canAccess([{ resource: "blog", access: "read" }], "blog");   // true
 * canAccess([], "blog"); // false
 * canAccess(userPermissions, null); // true
 */
export const canAccess = (userPermissions, resource) => {
  if (resource === null || resource === undefined) {
    return true;
  }

  return (
    canRead(userPermissions, resource) || canReview(userPermissions, resource)
  );
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
 * canExport([{ resource: "user", access: "read" }], "user"); // true
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
 * Mendukung semua level akses: read, manage, dan review.
 *
 * @param {Array<{resource: string, access: string}>} userPermissions - Daftar izin pengguna
 * @param {{resource: string, access: string}|null|undefined} requiredPermission - Objek izin yang dibutuhkan
 * @returns {boolean} `true` jika izin sesuai, `false` jika tidak
 *
 * @example
 * hasPermission(userPermissions, { resource: "user", access: "read" }); // true/false
 * hasPermission(userPermissions, { resource: "blog", access: "review" }); // true/false
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

  if (access === "read") return canRead(userPermissions, resource);
  if (access === "review") return canReview(userPermissions, resource);
  return canManage(userPermissions, resource);
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
