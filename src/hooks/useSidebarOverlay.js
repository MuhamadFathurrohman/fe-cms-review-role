/**
 * @file useSidebarOverlay.js
 * @description Hook custom untuk mengelola interaksi overlay sidebar saat mode collapsed.
 * Menyediakan fungsi untuk:
 * - Menampilkan/menyembunyikan tooltip label ekspansi
 * - Mengelola overlay submenu dengan deteksi mouse yang presisi
 * - Menangani navigasi dan pembersihan overlay
 *
 * Hook ini hanya aktif saat sidebar dalam mode collapsed di perangkat desktop.
 */

import { useCallback } from "react";
import { useOverlay, OVERLAY_TYPES } from "../contexts/OverlayContext";
import { useSidebarContext } from "../contexts/SidebarContext";

/**
 * Hook custom untuk mengelola overlay sidebar saat mode collapsed.
 * Mengintegrasikan OverlayContext dan SidebarContext untuk pengalaman UX yang mulus.
 *
 * @returns {{
 *   collapsed: boolean,
 *   isMobile: boolean,
 *   showExpandingLabel: (itemId: string, label: string, position: { top: number, left: number }) => void,
 *   hideExpandingLabel: (itemId: string) => void,
 *   showSubmenuOverlay: (item: Object, position: { top: number, left: number }, handlers: Object) => void,
 *   hideSubmenuOverlay: (itemId: string) => void,
 *   hideAllSubmenuOverlays: () => void,
 *   handleSubmenuNavigation: () => void,
 *   handleNavItemMouseEnter: (item: Object, position: { top: number, left: number }) => void,
 *   getPositionFromEvent: (e: MouseEvent) => { top: number, left: number },
 *   handleSubmenuMouseLeave: (itemId: string, mouseEvent: MouseEvent, delay?: number) => void
 * }} Objek berisi state dan fungsi manajemen overlay
 */
export const useSidebarOverlay = () => {
  const { showOverlay, hideOverlay, clearAllOverlays } = useOverlay();
  const { collapsed, isMobile, closeMobileSidebar } = useSidebarContext();

  /**
   * Menampilkan tooltip label ekspansi saat pengguna mengarahkan kursor ke ikon menu.
   * Hanya aktif saat sidebar collapsed di desktop.
   *
   * @param {string} itemId - ID unik item menu
   * @param {string} label - Teks label yang akan ditampilkan
   * @param {{ top: number, left: number }} position - Posisi absolut untuk menempatkan tooltip
   */
  const showExpandingLabel = useCallback(
    (itemId, label, position) => {
      if (collapsed && !isMobile) {
        showOverlay(`expanding-label-${itemId}`, {
          type: OVERLAY_TYPES.EXPANDING_LABEL,
          content: { label },
          position,
        });
      }
    },
    [collapsed, isMobile, showOverlay]
  );

  /**
   * Menyembunyikan tooltip label ekspansi berdasarkan ID item.
   *
   * @param {string} itemId - ID unik item menu
   */
  const hideExpandingLabel = useCallback(
    (itemId) => {
      hideOverlay(`expanding-label-${itemId}`);
    },
    [hideOverlay]
  );

  /**
   * Menyembunyikan semua overlay submenu yang sedang aktif.
   * Digunakan saat pengguna beralih ke item menu lain.
   */
  const hideAllSubmenuOverlays = useCallback(() => {
    const allOverlays = document.querySelectorAll(
      '[data-overlay-type="submenu-overlay"]'
    );
    allOverlays.forEach((overlay) => {
      const overlayId = overlay.getAttribute("data-overlay-id");
      if (overlayId) {
        hideOverlay(overlayId);
      }
    });
  }, [hideOverlay]);

  /**
   * Menampilkan overlay submenu saat pengguna mengarahkan kursor ke item menu yang memiliki submenu.
   * Secara otomatis menyembunyikan overlay submenu lain sebelum menampilkan yang baru.
   *
   * @param {Object} item - Item menu yang memiliki submenu
   * @param {{ top: number, left: number }} position - Posisi untuk menempatkan overlay
   * @param {Object} handlers - Handler event tambahan
   * @param {Function} [handlers.onMouseEnter] - Handler mouse enter
   * @param {Function} [handlers.onMouseLeave] - Handler mouse leave
   */
  const showSubmenuOverlay = useCallback(
    (item, position, handlers = {}) => {
      if (collapsed && !isMobile) {
        hideAllSubmenuOverlays();

        showOverlay(`submenu-overlay-${item.id}`, {
          type: OVERLAY_TYPES.SUBMENU_OVERLAY,
          content: {
            submenuItems: item.submenu,
            parentLabel: item.label,
          },
          position,
          onMouseEnter: handlers.onMouseEnter || (() => {}),
          onMouseLeave: handlers.onMouseLeave || (() => {}),
        });
      }
    },
    [collapsed, isMobile, showOverlay, hideAllSubmenuOverlays]
  );

  /**
   * Menyembunyikan overlay submenu berdasarkan ID item.
   *
   * @param {string} itemId - ID unik item menu induk
   */
  const hideSubmenuOverlay = useCallback(
    (itemId) => {
      hideOverlay(`submenu-overlay-${itemId}`);
    },
    [hideOverlay]
  );

  /**
   * Menangani navigasi dari submenu overlay.
   * Menutup sidebar mobile dan membersihkan semua overlay.
   */
  const handleSubmenuNavigation = useCallback(() => {
    if (isMobile) {
      closeMobileSidebar();
    }
    clearAllOverlays();
  }, [isMobile, closeMobileSidebar, clearAllOverlays]);

  /**
   * Mendapatkan posisi absolut dari event mouse untuk penempatan overlay.
   *
   * @param {MouseEvent} e - Event mouse
   * @returns {{ top: number, left: number }} Posisi absolut elemen target
   */
  const getPositionFromEvent = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.right,
    };
  }, []);

  /**
   * Memeriksa apakah kursor mouse berada di atas elemen tertentu.
   *
   * @param {MouseEvent} mouseEvent - Event mouse
   * @param {string} elementSelector - Selector CSS untuk elemen target
   * @returns {boolean} `true` jika mouse berada di atas elemen, `false` jika tidak
   */
  const isMouseOverElement = useCallback((mouseEvent, elementSelector) => {
    const element = document.querySelector(elementSelector);
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const mouseX = mouseEvent.clientX || mouseEvent.pageX;
    const mouseY = mouseEvent.clientY || mouseEvent.pageY;

    return (
      mouseX >= rect.left &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom
    );
  }, []);

  /**
   * Memeriksa apakah kursor mouse berada di atas item menu tertentu.
   *
   * @param {MouseEvent} mouseEvent - Event mouse
   * @param {string} itemId - ID unik item menu
   * @returns {boolean} `true` jika mouse berada di atas item menu, `false` jika tidak
   */
  const isMouseOverSpecificNavItem = useCallback(
    (mouseEvent, itemId) => {
      const navItemSelector = `[data-nav-item-id="${itemId}"]`;
      return isMouseOverElement(mouseEvent, navItemSelector);
    },
    [isMouseOverElement]
  );

  /**
   * Menangani event mouse leave pada overlay submenu dengan logika yang presisi.
   * Menggunakan delay kecil untuk mencegah flicker saat mouse berpindah antara item dan submenu.
   *
   * @param {string} itemId - ID unik item menu induk
   * @param {MouseEvent} mouseEvent - Event mouse asli
   * @param {number} [delay=100] - Delay dalam milidetik sebelum memeriksa posisi akhir mouse
   */
  const handleSubmenuMouseLeave = useCallback(
    (itemId, mouseEvent, delay = 100) => {
      setTimeout(() => {
        const specificNavItemSelector = `[data-nav-item-id="${itemId}"]`;
        const submenuSelector = `[data-overlay-id="submenu-overlay-${itemId}"]`;

        const isOverSpecificNavItem = isMouseOverElement(
          mouseEvent,
          specificNavItemSelector
        );
        const isOverSubmenu = isMouseOverElement(mouseEvent, submenuSelector);

        if (!isOverSpecificNavItem && !isOverSubmenu) {
          hideSubmenuOverlay(itemId);
        }
      }, delay);
    },
    [hideSubmenuOverlay, isMouseOverElement]
  );

  /**
   * Menangani event mouse enter pada item menu utama.
   * Mengelola tampilan overlay berdasarkan jenis item (submenu vs non-submenu).
   *
   * @param {Object} item - Item menu yang di-hover
   * @param {{ top: number, left: number }} position - Posisi untuk penempatan overlay
   */
  const handleNavItemMouseEnter = useCallback(
    (item, position) => {
      if (collapsed && !isMobile) {
        // Bersihkan tooltip label lain
        const allExpandingLabels = document.querySelectorAll(
          '[data-overlay-type="expanding-label"]'
        );
        allExpandingLabels.forEach((overlay) => {
          const overlayId = overlay.getAttribute("data-overlay-id");
          if (overlayId && !overlayId.includes(item.id)) {
            hideOverlay(overlayId);
          }
        });

        if (item.submenu && item.submenu.length > 0) {
          showSubmenuOverlay(item, position, {
            onMouseLeave: (mouseEvent) =>
              handleSubmenuMouseLeave(item.id, mouseEvent),
          });
        } else {
          hideAllSubmenuOverlays();
          showExpandingLabel(item.id, item.label, position);
        }
      }
    },
    [
      collapsed,
      isMobile,
      showSubmenuOverlay,
      showExpandingLabel,
      hideOverlay,
      hideAllSubmenuOverlays,
      handleSubmenuMouseLeave,
    ]
  );

  return {
    // State
    collapsed,
    isMobile,

    // Label methods
    showExpandingLabel,
    hideExpandingLabel,

    // Submenu methods
    showSubmenuOverlay,
    hideSubmenuOverlay,
    hideAllSubmenuOverlays,

    // Navigation
    handleSubmenuNavigation,

    // Enhanced mouse handling
    handleNavItemMouseEnter,
    getPositionFromEvent,
    handleSubmenuMouseLeave,
  };
};