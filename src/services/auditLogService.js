/**
 * @file auditLogService.js
 * @description Layanan terpusat untuk mengelola operasi data audit log.
 * Menyediakan abstraksi di atas `dataService.auditLogs` dengan fitur tambahan:
 * - Humanisasi tindakan dan nama tabel menjadi deskripsi yang mudah dibaca
 * - Pemfilteran field sensitif (password, token, dll.)
 * - Formatting nilai untuk tampilan UI yang konsisten
 * - Deteksi khusus untuk entri sistem (website company profile)
 * - Ringkasan perubahan antara nilai lama dan baru
 * 
 * Setiap entri audit log berisi informasi lengkap tentang:
 * - Siapa yang melakukan tindakan (user atau sistem)
 * - Apa yang dilakukan (CREATE, UPDATE, DELETE, dll.)
 * - Pada tabel apa tindakan dilakukan
 * - Nilai sebelum dan sesudah perubahan
 */

import { dataService } from "./dataService";
import { baseService } from "./baseService";

/**
 * Layanan audit log terpusat.
 * Mengelola semua operasi terkait data audit log dan transformasi untuk tampilan UI.
 * 
 * @namespace auditLogService
 */
export const auditLogService = {
  /**
   * Mendapatkan daftar audit log dengan pagination dan pencarian.
   * Mendukung pencarian teks bebas berdasarkan konten log.
   * 
   * @async
   * @param {number} [page=1] - Halaman yang diminta
   * @param {number} [limit=10] - Jumlah log per halaman
   * @param {string} [search=""] - String pencarian (konten log)
   * @returns {{
   *   success: boolean,
   *    Array<Object>,
   *   pagination: Object,
   *   message?: string
   * }} Respons dengan daftar log yang diproses dan metadata pagination
   */
  getPaginated: async (page = 1, limit = 10, search = "") => {
    try {
      const params = { page, limit };
      if (search) params.search = search;

      const result = await dataService.auditLogs.getAll(params);
      if (!result.success) return result;

      // Hanya proses dasar (tanpa resolve referensi)
      const processedLogs = result.data.map((log) =>
        auditLogService.processSingle(log)
      );

      return {
        success: true,
        data: processedLogs,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Error in auditLogService.getPaginated:", error);
      return {
        success: false,
        message: "Oops! We couldn't load the audit logs. Please try again",
      };
    }
  },

  /**
   * Memproses data log tunggal untuk ditampilkan di UI.
   * Melakukan transformasi lengkap termasuk humanisasi dan formatting.
   * 
   * @param {Object} log - Data log dari API
   * @returns {Object} Data log yang telah diproses dengan properti tambahan
   */
  processSingle: (log) => {
    const oldValues =
      typeof log.oldValues === "string"
        ? JSON.parse(log.oldValues)
        : log.oldValues || {};

    const newValues =
      typeof log.newValues === "string"
        ? JSON.parse(log.newValues)
        : log.newValues || {};

    // Tidak perlu resolve referensi di sini
    // Karena sudah di-handle oleh getWithReferences

    const filteredOldValues = auditLogService.filterValues(oldValues);
    const filteredNewValues = auditLogService.filterValues(newValues);

    // Hapus prefix "is" dari key
    const cleanedOldValues = auditLogService.removeIsPrefix(filteredOldValues);
    const cleanedNewValues = auditLogService.removeIsPrefix(filteredNewValues);

    return {
      ...log,
      createdAtFormatted: baseService.formatDateTime(log.createdAt),
      userName: (() => {
        // Deteksi: CREATE client dari website company profile
        if (
          log.tableName === "Client" &&
          (log.action === "CREATE_CLIENT" || log.action === "CREATE") &&
          (!log.userId || log.userId === null)
        ) {
          return "Website (Company Profile)";
        }

        // Fallback normal
        return log.userName || log.user?.name || "System";
      })(),
      description: auditLogService.generateDescription(
        log.action,
        log.tableName,
        cleanedOldValues,
        cleanedNewValues
      ),
      oldValues: auditLogService.formatValues(cleanedOldValues),
      newValues: auditLogService.formatValues(cleanedNewValues),
      changes: auditLogService.getChangeSummary(
        cleanedOldValues,
        cleanedNewValues
      ),
    };
  },

  // BARU: Hapus prefix "is" dari key
  /**
   * Menghapus prefix "is" dari nama field boolean untuk humanisasi yang lebih baik.
   * Contoh: "isActive" → "active", "isPublished" → "published"
   * 
   * @param {Object} values - Objek nilai yang akan diproses
   * @returns {Object} Objek dengan nama field yang telah dibersihkan
   */
  removeIsPrefix: (values) => {
    if (!values || typeof values !== "object") return values;

    const cleaned = {};
    for (const [key, value] of Object.entries(values)) {
      if (
        key.startsWith("is") &&
        key.length > 2 &&
        key[2] === key[2].toUpperCase()
      ) {
        const newKey = key[2].toLowerCase() + key.slice(3);
        cleaned[newKey] = value;
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  },

  /**
   * Memfilter field yang tidak ingin ditampilkan di UI untuk alasan keamanan atau relevansi.
   * Field yang difilter: password, token, secret, slug, SKU, dll.
   * 
   * @param {Object} values - Objek nilai yang akan difilter
   * @returns {Object} Objek dengan field sensitif yang telah dihapus
   */
  filterValues: (values) => {
    if (!values || typeof values !== "object") return {};

    const fieldsToSkip = [
      "slug",
      "sku",
      "password",
      "token",
      "secret",
      "translations",
      "permissions",
      "id",
    ];
    const filtered = {};

    for (const [key, value] of Object.entries(values)) {
      if (!fieldsToSkip.includes(key.toLowerCase())) {
        filtered[key] = value;
      }
    }

    return filtered;
  },

  /**
   * Menghasilkan deskripsi human-readable untuk tindakan audit log.
   * Menggunakan template yang sesuai dengan jenis tindakan dan konteks.
   * 
   * @param {string} action - Jenis tindakan (CREATE, UPDATE, DELETE, dll.)
   * @param {string} tableName - Nama tabel yang terkena dampak
   * @param {Object} oldValues - Nilai sebelum perubahan
   * @param {Object} newValues - Nilai setelah perubahan
   * @returns {string} Deskripsi human-readable dari tindakan
   */
  generateDescription: (action, tableName, oldValues, newValues) => {
    if (!action) return "Unknown action";

    const { baseAction, targetTable } = auditLogService.parseAction(
      action,
      tableName
    );

    const tableNameClean = auditLogService.humanizeTableName(
      targetTable || tableName
    );

    const recordName = auditLogService.getRecordIdentifier(
      baseAction === "DELETE" || baseAction === "REMOVE" ? oldValues : newValues
    );

    switch (baseAction) {
      case "CREATE":
      case "INSERT":
      case "ADD":
        return `Created new ${tableNameClean}${
          recordName ? ` "${recordName}"` : ""
        }`;

      case "UPDATE":
      case "EDIT":
      case "MODIFY":
      case "CHANGE":
        const changedFields = Object.keys(newValues).filter(
          (key) =>
            JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
        );

        if (changedFields.length === 0) {
          return `Updated ${tableNameClean} record`;
        }

        if (changedFields.length === 1) {
          const fieldName = auditLogService.humanizeFieldName(changedFields[0]);
          return `Changed ${fieldName} in ${tableNameClean}`;
        }

        return `Updated ${changedFields.length} fields in ${tableNameClean}`;

      case "DELETE":
      case "REMOVE":
      case "DESTROY":
        return `Deleted ${tableNameClean}${
          recordName ? ` "${recordName}"` : " record"
        }`;

      case "LOGIN":
      case "SIGNIN":
        return `User logged in to the system`;

      case "LOGOUT":
      case "SIGNOUT":
        return `User logged out from the system`;

      case "RESTORE":
        return `Restored ${tableNameClean}${
          recordName ? ` "${recordName}"` : " record"
        }`;

      case "ARCHIVE":
        return `Archived ${tableNameClean}${
          recordName ? ` "${recordName}"` : " record"
        }`;

      case "APPROVE":
        return `Approved ${tableNameClean}${
          recordName ? ` "${recordName}"` : " record"
        }`;

      case "REJECT":
        return `Rejected ${tableNameClean}${
          recordName ? ` "${recordName}"` : " record"
        }`;

      case "ACTIVATE":
      case "ENABLE":
        return `Activated ${tableNameClean}${
          recordName ? ` "${recordName}"` : " record"
        }`;

      case "DEACTIVATE":
      case "DISABLE":
        return `Deactivated ${tableNameClean}${
          recordName ? ` "${recordName}"` : " record"
        }`;

      case "EXPORT":
        return `Exported ${tableNameClean} data`;

      case "IMPORT":
        return `Imported ${tableNameClean} data`;

      case "DOWNLOAD":
        return `Downloaded ${tableNameClean}${
          recordName ? ` "${recordName}"` : " file"
        }`;

      case "UPLOAD":
        return `Uploaded ${tableNameClean}${
          recordName ? ` "${recordName}"` : " file"
        }`;

      case "SEND":
        return `Sent ${tableNameClean}${recordName ? ` "${recordName}"` : ""}`;

      case "RECEIVE":
        return `Received ${tableNameClean}${
          recordName ? ` "${recordName}"` : ""
        }`;

      default:
        const actionHumanized = auditLogService.humanizeAction(baseAction);
        return `${actionHumanized} ${tableNameClean}${
          recordName ? ` "${recordName}"` : ""
        }`;
    }
  },

  /**
   * Mengurai tindakan audit log menjadi komponen dasar dan tabel target.
   * Mendukung format tindakan seperti "CREATE_USER" atau "UPDATE_PRODUCT".
   * 
   * @param {string} action - Tindakan audit log mentah
   * @param {string} fallbackTable - Nama tabel fallback jika tidak ditemukan dalam tindakan
   * @returns {{ baseAction: string, targetTable: string|null }} Komponen tindakan yang diurai
   */
  parseAction: (action, fallbackTable) => {
    if (!action) return { baseAction: "UNKNOWN", targetTable: null };

    const actionUpper = action.toUpperCase();

    if (actionUpper.includes("_")) {
      const parts = actionUpper.split("_");

      if (parts.length === 2) {
        return {
          baseAction: parts[0],
          targetTable: parts[1],
        };
      }

      return {
        baseAction: parts.slice(0, -1).join("_"),
        targetTable: parts[parts.length - 1],
      };
    }

    return {
      baseAction: actionUpper,
      targetTable: fallbackTable,
    };
  },

  /**
   * Mendapatkan identifier record untuk ditampilkan dalam deskripsi.
   * Mencari field yang paling representatif seperti name, title, email, dll.
   * 
   * @param {Object} values - Nilai record yang akan diidentifikasi
   * @returns {string|null} Identifier record atau null jika tidak ditemukan
   */
  getRecordIdentifier: (values) => {
    if (!values || typeof values !== "object") return null;

    const identifierFields = [
      "name",
      "title",
      "username",
      "email",
      "code",
      "id",
    ];

    for (const field of identifierFields) {
      if (values[field] && typeof values[field] === "string") {
        const value = values[field];
        return value.length > 30 ? value.substring(0, 30) + "..." : value;
      }
    }

    return null;
  },

  /**
   * Mengubah tindakan teknis menjadi format yang dapat dibaca manusia.
   * Contoh: "CREATE_USER" → "Create User"
   * 
   * @param {string} action - Tindakan teknis mentah
   * @returns {string} Tindakan yang telah dihumanisasi
   */
  humanizeAction: (action) => {
    if (!action) return "Action";

    return action
      .replace(/_/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  },

  /**
   * Memformat nilai objek untuk ditampilkan di UI dengan penanganan keamanan.
   * Field sensitif seperti password akan ditampilkan sebagai "[Hidden]".
   * 
   * @param {Object} values - Objek nilai yang akan diformat
   * @returns {Object} Objek dengan nilai yang telah diformat
   */
  formatValues: (values) => {
    if (!values || typeof values !== "object") return {};

    const formatted = {};

    for (const [key, value] of Object.entries(values)) {
      if (["password", "token", "secret"].includes(key.toLowerCase())) {
        formatted[key] = "[Hidden]";
        continue;
      }

      formatted[key] = auditLogService.formatValue(value);
    }

    return formatted;
  },

  /**
   * Memformat nilai tunggal untuk ditampilkan di UI.
   * Menangani berbagai tipe data termasuk boolean, tanggal, array, dan objek.
   * 
   * @param {*} value - Nilai yang akan diformat
   * @returns {string} Nilai yang telah diformat sebagai string
   */
  formatValue: (value) => {
    if (value === null) return "(empty)";
    if (value === undefined) return "(none)";

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        return baseService.formatDateTime(value);
      } catch {
        return value;
      }
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return "(empty)";
      return value.join(", ");
    }

    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    if (typeof value === "number") {
      return value.toLocaleString("en-US");
    }

    if (value === "") return "(empty)";

    return value;
  },

  /**
   * Menghasilkan ringkasan perubahan antara nilai lama dan baru.
   * Mengembalikan array objek yang berisi field yang berubah dan nilainya.
   * 
   * @param {Object} oldValues - Nilai sebelum perubahan
   * @param {Object} newValues - Nilai setelah perubahan
   * @returns {Array<{field: string, oldValue: string, newValue: string}>} Ringkasan perubahan
   */
  getChangeSummary: (oldValues, newValues) => {
    if (!oldValues || !newValues) return [];

    const changes = [];

    for (const key of Object.keys(newValues)) {
      const oldVal = oldValues[key];
      const newVal = newValues[key];

      if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;
      if (["password", "token", "secret"].includes(key.toLowerCase())) continue;

      changes.push({
        field: key,
        oldValue: auditLogService.formatValue(oldVal),
        newValue: auditLogService.formatValue(newVal),
      });
    }

    return changes;
  },

  /**
   * Mengubah nama tabel teknis menjadi format yang dapat dibaca manusia.
   * Contoh: "user" → "User", "product_catalog" → "Product Catalog"
   * 
   * @param {string} tableName - Nama tabel teknis
   * @returns {string} Nama tabel yang telah dihumanisasi
   */
  humanizeTableName: (tableName) => {
    if (!tableName) return "Record";

    return tableName.charAt(0).toUpperCase() + tableName.slice(1);
  },

  /**
   * Mengubah nama field teknis menjadi format yang dapat dibaca manusia.
   * Mendukung mapping khusus dan humanisasi otomatis untuk field umum.
   * 
   * @param {string} fieldName - Nama field teknis
   * @returns {string} Nama field yang telah dihumanisasi
   */
  humanizeFieldName: (fieldName) => {
    if (!fieldName) return "Unknown";

    // Daftar field yang sudah dipetakan
    const fieldNames = {
      name: "Name",
      email: "Email",
      phone: "Phone Number",
      address: "Address",
      status: "Status",
      quantity: "Quantity",
      description: "Description",
      role: "Role",
      author: "Author",
      category: "Category",
      brand: "Brand",
      catalog: "Catalog",
      repliedBy: "Replied By",
      active: "Active",
      deleted: "Deleted",
      published: "Published",
      createdAt: "Created At",
      updatedAt: "Updated At",
      deletedAt: "Deleted At",
      lastLoginAt: "Last Login At",
      repliedAt: "Replied At",
    };

    // Return jika field sudah dipetakan
    if (fieldNames[fieldName]) {
      return fieldNames[fieldName];
    }

    //  Humanisasi camelCase yang lebih baik (termasuk angka)
    return fieldName
      .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase: firstName → firstName
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // PascalCase: HTTPServer → HTTP Server
      .replace(/(\d)([a-zA-Z])/g, "$1 $2") // Angka: field1Name → field1 Name
      .replace(/([a-zA-Z])(\d)/g, "$1 $2") // Angka: version2 → version 2
      .replace(/_/g, " ") // underscore
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
      .trim();
  },
};