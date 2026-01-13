/**
 * @file useSidebar.js
 * @description Hook custom untuk mengelola logika sidebar berbasis izin pengguna.
 * Menggabungkan:
 * - Data pengguna dari AuthContext
 * - State sidebar dari SidebarContext
 * - Konfigurasi menu dari sidebarConfig
 *
 * Menghasilkan menu yang telah difilter berdasarkan izin akses pengguna,
 * serta menyediakan fungsi utilitas untuk interaksi sidebar.
 */

import { useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSidebarContext } from "../contexts/SidebarContext";
import {
  filterMenuByPermission,
  findMenuByPath,
  sidebarMenuConfig,
} from "../config/sidebarConfig";

/**
 * Hook custom untuk mendapatkan data dan fungsi sidebar yang telah disesuaikan dengan izin pengguna.
 * 
 * @param {string} [currentPath] - Path rute saat ini, digunakan untuk menentukan menu aktif
 * @returns {{
 *   collapsed: boolean,
 *   activeSubmenu: string | null,
 *   menuItems: import("../config/sidebarConfig").SidebarMenuItem[],
 *   activeMenu: import("../config/sidebarConfig").SidebarMenuItem | { parent: import("../config/sidebarConfig").SidebarMenuItem, submenu: import("../config/sidebarConfig").SidebarMenuItem } | null,
 *   toggleCollapse: () => void,
 *   toggleSubmenu: (menuId: string) => void,
 *   closeAllSubmenus: () => void
 * }} Objek berisi state, data, dan fungsi sidebar
 *
 * @example
 * const { menuItems, activeMenu, toggleCollapse } = useSidebar(location.pathname);
 */
export const useSidebar = (currentPath) => {
  const { user } = useAuth();

  const {
    collapsed,
    activeSubmenu,
    toggleSubmenu,
    toggleSidebar,
    closeAllSubmenus,
  } = useSidebarContext();

  /**
   * Daftar menu yang telah difilter berdasarkan izin pengguna.
   * Menggunakan `useMemo` untuk mencegah re-komputasi yang tidak perlu.
   * 
   * @type {import("../config/sidebarConfig").SidebarMenuItem[]}
   */
  const menuItems = useMemo(() => {
    return filterMenuByPermission(sidebarMenuConfig, user?.permissions);
  }, [user?.permissions]);

  /**
   * Item menu yang sedang aktif berdasarkan path rute saat ini.
   * Mendukung pencarian di menu utama dan submenu.
   * 
   * @type {import("../config/sidebarConfig").SidebarMenuItem | { parent: import("../config/sidebarConfig").SidebarMenuItem, submenu: import("../config/sidebarConfig").SidebarMenuItem } | null}
   */
  const activeMenu = useMemo(() => {
    return currentPath ? findMenuByPath(menuItems, currentPath) : null;
  }, [menuItems, currentPath]);

  /**
   * Toggle status collapsed sidebar (desktop) atau buka/tutup sidebar (mobile).
   * Wrapper untuk `toggleSidebar` dari context.
   */
  const toggleCollapse = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  return {
    // State dari context
    collapsed,
    activeSubmenu,

    // Nilai yang dihitung
    menuItems,
    activeMenu,

    // Fungsi aksi
    toggleCollapse,
    toggleSubmenu,
    closeAllSubmenus,
  };
};