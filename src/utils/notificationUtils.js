/**
 * @file notificationUtils.js
 * @description Lapisan transform untuk notifikasi: menerjemahkan data mentah
 * dari backend menjadi bentuk siap-tampil untuk komponen UI.
 *
 * Tanggung jawab:
 * - Memetakan `type` (fallback ke `sourceType`) menjadi ikon lucide-react
 * - Membersihkan emoji di awal `title` (emoji ditambahkan backend di template)
 * - Memberi nilai default `priority` agar UI konsisten
 *
 * Catatan desain:
 * - Warna TIDAK ditangani di sini — CSS sudah menanganinya via `data-priority`.
 * - Ikon dikembalikan sebagai referensi komponen lucide-react, dirender
 *   langsung di UI: `<Icon size={16} />`.
 */

import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Mail,
  ShieldAlert,
  TrendingUp,
  BarChart2,
  Download,
  FileText,
  Package,
  Bell,
} from "lucide-react";

/**
 * Pemetaan utama: `type` notifikasi → komponen ikon.
 * Daftar `type` mengikuti NOTIFICATION_TEMPLATES di backend (notification.service.ts).
 *
 * @type {Object<string, import("lucide-react").LucideIcon>}
 */
const ICON_MAP = {
  review_submitted: Clock,
  review_approved: CheckCircle,
  review_revision: AlertCircle,
  review_rejected: XCircle,
  new_client: Mail,
  security_alert: ShieldAlert,
  high_traffic: TrendingUp,
  visitor_summary: BarChart2,
  export_ready: Download,
  new_blog: FileText,
  new_product: Package,
};

/**
 * Pemetaan fallback: `sourceType` → komponen ikon.
 * Dipakai saat `type` tidak dikenali di ICON_MAP.
 *
 * @type {Object<string, import("lucide-react").LucideIcon>}
 */
const SOURCE_TYPE_MAP = {
  blogs: FileText,
  products: Package,
};

/**
 * Pemetaan warna ikon berdasarkan makna semantik `type`.
 * Mengembalikan nama varian (bukan warna mentah) — warna sebenarnya
 * didefinisikan di SCSS via modifier class `--{varian}`.
 *
 * Varian: success | warning | info | danger | primary | default
 *
 * @type {Object<string, string>}
 */
const ICON_COLOR_MAP = {
  review_approved: "success",
  export_ready: "success",
  review_submitted: "warning",
  high_traffic: "warning",
  review_revision: "info",
  visitor_summary: "info",
  review_rejected: "danger",
  security_alert: "danger",
  new_client: "primary",
  new_blog: "default",
  new_product: "default",
};

/**
 * Menentukan komponen ikon untuk sebuah notifikasi.
 * Prioritas: `type` → `sourceType` → default (Bell).
 *
 * @param {string} [type] - Tipe notifikasi (mis. "review_submitted")
 * @param {string} [sourceType] - Sumber notifikasi (mis. "blogs", "products")
 * @returns {import("lucide-react").LucideIcon} Komponen ikon lucide-react
 */
export const getNotificationIcon = (type, sourceType) => {
  return ICON_MAP[type] || SOURCE_TYPE_MAP[sourceType] || Bell;
};

/**
 * Menentukan varian warna ikon berdasarkan `type`.
 *
 * @param {string} [type] - Tipe notifikasi
 * @returns {'success'|'warning'|'info'|'danger'|'primary'|'default'} Nama varian
 */
export const getIconColorClass = (type) => {
  return ICON_COLOR_MAP[type] || "default";
};

/**
 * Memisahkan label catatan ("Catatan:" atau "Alasan:") dari isi pesan.
 * Backend menyusun pesan review revisi/tolak sebagai:
 *   `"...perlu direvisi. Catatan: <isi>"` atau `"...ditolak. Alasan: <isi>"`
 * Label aslinya dipertahankan agar makna (catatan vs alasan) tidak hilang.
 */
const NOTE_SEPARATOR = /\.\s*(Catatan|Alasan):\s*/;

/**
 * Merapikan pesan: hapus tanda kutip berpasangan dan pisahkan bagian catatan.
 *
 * @param {string} [rawMessage] - Pesan mentah dari backend
 * @returns {{ message: string, note: { label: string, content: string } | null }}
 *   `message` adalah isi utama (sudah bersih), `note` berisi label + isi catatan
 *   bila ada, atau `null`.
 */
const formatMessage = (rawMessage) => {
  // Hapus hanya kutip berpasangan: "X" → X (kutip tunggal/ganjil tak tersentuh)
  const cleaned = (rawMessage || "").replace(/"([^"]+)"/g, "$1");

  const match = cleaned.match(NOTE_SEPARATOR);
  if (!match) {
    return { message: cleaned.trim(), note: null };
  }

  const body = cleaned.slice(0, match.index).trim();
  const content = cleaned.slice(match.index + match[0].length).trim();
  return { message: body, note: { label: match[1], content } };
};

/**
 * Menghapus emoji yang berada di AWAL string title.
 * Backend menambahkan emoji sebagai prefix pada template (mis. "🔍 Konten...").
 * Hanya posisi awal yang dibersihkan agar emoji di tengah pesan (jika ada) tetap utuh.
 *
 * @param {string} [title] - Judul mentah dari backend
 * @returns {string} Judul tanpa emoji di awal
 */
const stripLeadingEmoji = (title) => {
  if (!title) return "";
  // Buang rangkaian karakter emoji di awal: piktograf + variation selector
  // (U+FE0F) + ZWJ (U+200D) + spasi pengikutnya. Berhenti di karakter teks pertama.
  return title
    .replace(/^[\p{Extended_Pictographic}\u{FE0F}\u{200D}\s]+/u, "")
    .trim();
};

/**
 * Mentransformasi satu objek notifikasi mentah menjadi bentuk siap-tampil.
 *
 * @param {Object} raw - Notifikasi mentah dari backend
 * @param {string|number} raw.id - ID notifikasi
 * @param {string} [raw.type] - Tipe notifikasi
 * @param {string} [raw.sourceType] - Sumber notifikasi
 * @param {string} [raw.priority] - Prioritas ("low"|"medium"|"high")
 * @param {string} [raw.title] - Judul (mungkin mengandung emoji prefix)
 * @param {string} [raw.message] - Isi pesan
 * @param {boolean} [raw.isRead] - Status baca
 * @param {string} [raw.timestamp] - Waktu notifikasi
 * @returns {{
 *   id: string|number,
 *   type: string|undefined,
 *   sourceType: string|undefined,
 *   priority: 'low'|'medium'|'high',
 *   title: string,
 *   message: string,
 *   note: { label: string, content: string } | null,
 *   isRead: boolean,
 *   timestamp: string|undefined,
 *   icon: import("lucide-react").LucideIcon,
 *   iconColorClass: 'success'|'warning'|'info'|'danger'|'primary'|'default'
 * }} Notifikasi siap-tampil
 */
export const transformNotification = (raw) => {
  const { message, note } = formatMessage(raw.message);

  return {
    id: raw.id,
    type: raw.type,
    sourceType: raw.sourceType,
    priority: raw.priority || "medium",
    title: stripLeadingEmoji(raw.title),
    message,
    note,
    isRead: raw.isRead ?? false,
    timestamp: raw.timestamp,
    icon: getNotificationIcon(raw.type, raw.sourceType),
    iconColorClass: getIconColorClass(raw.type),
  };
};

/**
 * Mentransformasi array notifikasi mentah.
 * Helper tipis di atas `transformNotification` untuk pemakaian di komponen.
 *
 * @param {Array<Object>} list - Array notifikasi mentah
 * @returns {Array<Object>} Array notifikasi siap-tampil
 */
export const transformNotifications = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(transformNotification);
};
