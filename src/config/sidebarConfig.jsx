/**
 * @file sidebarConfig.jsx
 * @description Konfigurasi lengkap untuk sidebar navigasi dashboard.
 * Menyediakan:
 * - Daftar menu statis dengan ikon dan izin akses
 * - Utilitas penyaringan berbasis permission
 * - Konfigurasi tampilan (lebar, animasi, breakpoint)
 * - Helper untuk navigasi dan kategori
 *
 * Menu disusun berdasarkan prinsip **permission-based access control**,
 * bukan berdasarkan nama peran.
 */

import HomeIcon from "../assets/icons/Home.svg";
import UsersIcon from "../assets/icons/Users.svg";
import ClientIcon from "../assets/icons/Client.svg";
import AnalyticIcon from "../assets/icons/Analytic.svg";
import ContentIcon from "../assets/icons/Content.svg";
import AuditIcon from "../assets/icons/Audit.svg";
import SettingsIcon from "../assets/icons/Settings.svg";
import LogOutIcon from "../assets/icons/LogOut.svg";
import ArrowDownIcon from "../assets/icons/ArrowDown.svg";
import ProductsIcon from "../assets/icons/Product.svg";
import CatalogIcon from "../assets/icons/Catalog.svg";
import ShieldIcon from "../assets/icons/Shield.svg";
import { canRead } from "../utils/permissions";

/**
 * @typedef {Object} SidebarMenuItem
 * @property {string} id - ID unik item menu
 * @property {string} path - Rute React Router
 * @property {string} icon - Path atau komponen ikon
 * @property {string} label - Label tampilan
 * @property {string|null} requiredPermission - Izin yang dibutuhkan untuk melihat menu
 * @property {'main'|'management'|'system'|'insights'} category - Kategori menu
 * @property {boolean} [hasSubmenu=false] - Apakah item memiliki submenu
 * @property {SidebarMenuItem[]} [submenu] - Daftar submenu (jika ada)
 */

/**
 * Konfigurasi dasar menu sidebar.
 * Setiap item didefinisikan dengan izin akses (`requiredPermission`) dan kategori.
 * Item tanpa `requiredPermission` (null) dapat diakses oleh semua pengguna terautentikasi.
 *
 * @type {SidebarMenuItem[]}
 */
export const sidebarMenuConfig = [
  {
    id: "home",
    path: "/dashboard/home",
    icon: HomeIcon,
    label: "Home",
    requiredPermission: null,
    category: "main",
  },
  {
    id: "users",
    path: "/dashboard/users",
    icon: UsersIcon,
    label: "Users",
    requiredPermission: "user",
    category: "management",
  },
  {
    id: "roles",
    path: "/dashboard/roles",
    icon: ShieldIcon,
    label: "Roles & Permissions",
    requiredPermission: "role",
    category: "system",
  },
  {
    id: "clients",
    path: "/dashboard/clients",
    icon: ClientIcon,
    label: "Clients",
    requiredPermission: "client",
    category: "management",
  },
  {
    id: "catalog",
    path: "/dashboard/catalog",
    icon: CatalogIcon,
    label: "Catalog",
    requiredPermission: "catalog",
    category: "management",
  },
  {
    id: "analytics",
    path: "/dashboard/analytics",
    icon: AnalyticIcon,
    label: "Analytics",
    requiredPermission: "analytics",
    category: "insights",
  },
  {
    id: "content",
    path: "/dashboard/content",
    icon: ContentIcon,
    label: "Content",
    requiredPermission: "blog",
    category: "management",
    hasSubmenu: true,
    submenu: [
      {
        id: "gallery",
        path: "/dashboard/content/gallery",
        label: "Gallery",
        requiredPermission: "gallery",
      },
      {
        id: "blogs",
        path: "/dashboard/content/blogs",
        label: "Blogs",
        requiredPermission: "blog",
      },
    ],
  },
  {
    id: "products",
    path: "/dashboard/products",
    icon: ProductsIcon,
    label: "Products",
    requiredPermission: "product",
    category: "management",
    hasSubmenu: true,
    submenu: [
      {
        id: "categories",
        path: "/dashboard/products/categories",
        label: "Categories",
        requiredPermission: "category",
      },
      {
        id: "brands",
        path: "/dashboard/products/brands",
        label: "Brands & Clients",
        requiredPermission: "brand",
      },
      {
        id: "items",
        path: "/dashboard/products/items",
        label: "Items",
        requiredPermission: "product",
      },
    ],
  },
  {
    id: "auditlog",
    path: "/dashboard/auditlog",
    icon: AuditIcon,
    label: "Audit Log",
    requiredPermission: "audit_log",
    category: "system",
  },
];

/**
 * Peta konfigurasi ikon untuk digunakan di seluruh aplikasi.
 * @type {Object<string, string>}
 */
export const iconConfig = {
  Home: HomeIcon,
  Users: UsersIcon,
  Client: ClientIcon,
  Analytic: AnalyticIcon,
  Content: ContentIcon,
  Products: ProductsIcon,
  Audit: AuditIcon,
  Settings: SettingsIcon,
  LogOut: LogOutIcon,
  ArrowDown: ArrowDownIcon,
};

/**
 * Konfigurasi branding untuk sidebar.
 * @type {{ brandName: string, shortName: string }}
 */
export const brandConfig = {
  brandName: "ENERKOMP PERSADA RAYA",
  shortName: "EPR",
};

/**
 * Konfigurasi perilaku UI sidebar.
 * @type {{
 *   collapsedWidth: number,
 *   expandedWidth: number,
 *   animationDuration: string,
 *   breakpoints: { mobile: number, tablet: number, desktop: number }
 * }}
 */
export const sidebarConfig = {
  collapsedWidth: 70,
  expandedWidth: 280,
  animationDuration: "0.3s",
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200,
  },
};

/**
 * Menyaring daftar menu berdasarkan izin pengguna.
 * Hanya menampilkan item yang memiliki izin `canRead`.
 * Untuk item dengan submenu:
 * - Jika ada submenu yang memenuhi izin → tampilkan item + submenu yang valid
 * - Jika tidak ada submenu yang valid tapi item utama memenuhi izin → tampilkan item tanpa submenu
 *
 * @param {SidebarMenuItem[]} menuItems - Daftar menu asli
 * @param {Array<{resource: string, access: string}>} userPermissions - Daftar izin pengguna
 * @returns {SidebarMenuItem[]} Daftar menu yang telah difilter
 */
export const filterMenuByPermission = (menuItems, userPermissions) => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return [];
  }

  return menuItems
    .map((item) => {
      let filteredSubmenu = [];
      if (item.submenu) {
        filteredSubmenu = item.submenu.filter((subItem) =>
          canRead(userPermissions, subItem.requiredPermission)
        );
      }

      if (item.hasSubmenu) {
        if (filteredSubmenu.length > 0) {
          return { ...item, submenu: filteredSubmenu };
        }
        if (canRead(userPermissions, item.requiredPermission)) {
          return { ...item, submenu: [] };
        }
        return null;
      }

      return canRead(userPermissions, item.requiredPermission) ? item : null;
    })
    .filter(Boolean);
};

/**
 * Mengelompokkan menu berdasarkan kategori.
 *
 * @param {SidebarMenuItem[]} menuItems - Daftar menu
 * @param {'main'|'management'|'system'|'insights'} category - Kategori yang dicari
 * @returns {SidebarMenuItem[]} Daftar menu dalam kategori tertentu
 */
export const getMenuByCategory = (menuItems, category) => {
  return menuItems.filter((item) => item.category === category);
};

/**
 * Mencari item menu berdasarkan path.
 * Mendukung pencarian di menu utama dan submenu.
 *
 * @param {SidebarMenuItem[]} menuItems - Daftar menu
 * @param {string} path - Path rute yang dicari
 * @returns {SidebarMenuItem | { parent: SidebarMenuItem, submenu: SidebarMenuItem } | undefined}
 *   - Jika ditemukan di menu utama: kembalikan item
 *   - Jika ditemukan di submenu: kembalikan objek dengan `parent` dan `submenu`
 *   - Jika tidak ditemukan: `undefined`
 */
export const findMenuByPath = (menuItems, path) => {
  let foundItem = menuItems.find((item) => item.path === path);

  if (!foundItem) {
    for (const item of menuItems) {
      if (item.submenu) {
        foundItem = item.submenu.find((subItem) => subItem.path === path);
        if (foundItem) {
          return { parent: item, submenu: foundItem };
        }
      }
    }
  }

  return foundItem;
};

/**
 * Memeriksa apakah item menu memiliki submenu yang valid.
 *
 * @param {SidebarMenuItem} menuItem - Item menu yang diperiksa
 * @returns {boolean} `true` jika memiliki submenu, `false` jika tidak
 */
export const hasSubmenu = (menuItem) => {
  return menuItem.hasSubmenu && menuItem.submenu && menuItem.submenu.length > 0;
};

/**
 * Memeriksa apakah item menu aktif berdasarkan path saat ini.
 * Item dianggap aktif jika:
 * - Path-nya cocok dengan `currentPath`, atau
 * - Salah satu submenu-nya cocok dengan `currentPath`
 *
 * @param {SidebarMenuItem} menuItem - Item menu
 * @param {string} currentPath - Path rute saat ini
 * @returns {boolean} `true` jika aktif, `false` jika tidak
 */
export const isMenuActive = (menuItem, currentPath) => {
  if (menuItem.path === currentPath) {
    return true;
  }

  if (menuItem.submenu) {
    return menuItem.submenu.some((subItem) => subItem.path === currentPath);
  }

  return false;
};