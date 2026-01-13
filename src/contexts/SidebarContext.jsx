/**
 * @file SidebarContext.jsx
 * @description Context React untuk mengelola state global sidebar.
 * Menyediakan:
 * - Status collapsed/expanded
 * - Status mobile open/close
 * - Deteksi perangkat (mobile vs desktop)
 * - Manajemen submenu aktif
 * - Handler interaksi pengguna (toggle, close)
 *
 * Context ini digunakan oleh komponen `Sidebar`, `TopBar`, dan hook terkait
 * untuk memastikan sinkronisasi state di seluruh aplikasi.
 */

import React, { createContext, useContext, useState, useEffect } from "react";

/**
 * Context React untuk state dan fungsi sidebar.
 * @type {React.Context<Object | undefined>}
 */
const SidebarContext = createContext();

/**
 * Hook custom untuk mengakses state dan fungsi sidebar dari SidebarContext.
 * Harus digunakan di dalam komponen yang dibungkus oleh `<SidebarProvider>`.
 *
 * @returns {{
 *   collapsed: boolean,
 *   setCollapsed: React.Dispatch<React.SetStateAction<boolean>>,
 *   mobileOpen: boolean,
 *   setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>,
 *   isMobile: boolean,
 *   toggleSidebar: () => void,
 *   closeMobileSidebar: () => void,
 *   activeSubmenu: string | null,
 *   setActiveSubmenu: React.Dispatch<React.SetStateAction<string | null>>,
 *   toggleSubmenu: (menuId: string) => void,
 *   closeAllSubmenus: () => void,
 *   isSubmenuOpen: (menuId: string) => boolean
 * }} Objek berisi state dan fungsi sidebar
 * @throws {Error} Jika digunakan di luar SidebarProvider
 *
 * @example
 * const { collapsed, toggleSidebar, isSubmenuOpen } = useSidebarContext();
 */
export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
};

/**
 * Provider komponen untuk SidebarContext.
 * Menginisialisasi state sidebar dan menangani logika responsif.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Komponen anak yang akan menerima context
 * @returns {JSX.Element}
 */
export const SidebarProvider = ({ children }) => {
  /**
   * Status apakah sidebar dalam mode collapsed (desktop).
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [collapsed, setCollapsed] = useState(false);

  /**
   * Status apakah sidebar terbuka di perangkat mobile.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [mobileOpen, setMobileOpen] = useState(false);

  /**
   * Status deteksi perangkat mobile berdasarkan lebar jendela.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isMobile, setIsMobile] = useState(false);

  /**
   * ID submenu yang sedang aktif (dibuka).
   * @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]}
   */
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  // Check if device is mobile
  /**
   * Efek samping untuk mendeteksi perubahan ukuran layar dan menentukan status mobile.
   * Menggunakan breakpoint 1024px (tablet ke bawah dianggap mobile).
   */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Auto close mobile sidebar when clicking outside or navigating
  /**
   * Menutup sidebar mobile saat pengguna mengklik di luar area sidebar.
   * Mencegah penutupan jika klik pada tombol toggle (`mobile-menu-toggle`).
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && mobileOpen) {
        const sidebar = document.querySelector(".sidebar");
        if (
          sidebar &&
          !sidebar.contains(event.target) &&
          !event.target.closest(".mobile-menu-toggle")
        ) {
          setMobileOpen(false);
        }
      }
    };

    if (isMobile && mobileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobile, mobileOpen]);

  // Clear submenu when switching to collapsed mode (desktop)
  /**
   * Menutup semua submenu saat beralih ke mode collapsed di desktop.
   * Mencegah konflik antara submenu overlay dan menu utama.
   */
  useEffect(() => {
    if (collapsed && !isMobile) {
      setActiveSubmenu(null);
    }
  }, [collapsed, isMobile]);

  /**
   * Toggle status sidebar berdasarkan perangkat:
   * - Mobile: buka/tutup sidebar
   * - Desktop: collapsed/expanded
   */
  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  /**
   * Menutup sidebar di perangkat mobile.
   * Tidak berpengaruh di desktop.
   */
  const closeMobileSidebar = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  /**
   * Toggle submenu berdasarkan ID menu.
   * Jika submenu sudah aktif → tutup.
   * Jika submenu lain aktif → ganti ke submenu baru.
   *
   * @param {string} menuId - ID unik item menu
   */
  const toggleSubmenu = (menuId) => {
    setActiveSubmenu((prev) => {
      if (prev === menuId) {
        return null;
      }
      return menuId;
    });
  };

  /**
   * Menutup semua submenu yang sedang aktif.
   */
  const closeAllSubmenus = () => {
    setActiveSubmenu(null);
  };

  /**
   * Memeriksa apakah submenu tertentu sedang aktif.
   *
   * @param {string} menuId - ID unik item menu
   * @returns {boolean} `true` jika submenu aktif, `false` jika tidak
   */
  const isSubmenuOpen = (menuId) => {
    return activeSubmenu === menuId;
  };

  /** @type {Object} Nilai context yang disediakan ke seluruh aplikasi */
  const value = {
    // Core sidebar state
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
    isMobile,

    // Actions
    toggleSidebar,
    closeMobileSidebar,

    // Enhanced submenu state and actions
    activeSubmenu,
    setActiveSubmenu,
    toggleSubmenu,
    closeAllSubmenus,
    isSubmenuOpen,
  };

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
};