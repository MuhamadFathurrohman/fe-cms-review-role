/**
 * @file Layout.jsx
 * @description Komponen layout utama untuk halaman dashboard.
 * Bertindak sebagai kerangka aplikasi yang menyediakan:
 * - Sidebar navigasi
 * - TopBar (header dengan info pengguna)
 * - Area konten dinamis (`<Outlet />`)
 * - Modal peringatan sesi kedaluwarsa
 * - Overlay loader saat inisialisasi
 *
 * Menggunakan beberapa context provider untuk mengelola state global:
 * - `SidebarProvider`: Status sidebar (collapsed/mobile)
 * - `OverlayProvider`: Overlay UI (loader, tooltip, dll.)
 * - `ModalProvider`: Modal dialog
 */

import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { SidebarProvider, useSidebarContext } from "../contexts/SidebarContext";
import { OverlayProvider, useOverlay } from "../contexts/OverlayContext";
import { ModalProvider } from "../contexts/ModalContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import SessionExpiredAlert from "./Alerts/SessionExpiredAlert";
import "../sass/components/Layout/Layout.css";
import "../sass/components/Overlays/SubmenuOverlay/SubmenuOverlay.css";
import "../sass/components/Overlays/ExpandingLabel/ExpandingLabel.css";
import "../sass/components/Overlays/LoaderOverlay/LoaderOverlay.css";
import "../sass/components/Overlays/EmailTooltip/EmailTooltip.css";

/**
 * Konten utama layout dashboard.
 * Mengelola logika sesi, navigasi, dan integrasi antar-komponen.
 *
 * @component
 */
const LayoutContent = () => {
  const {
    isInitialized,
    user,
    logout,
    sessionExpired,
    sessionExpiredTooLong,
    extendSession,
    updateUser,
  } = useAuth();
  const navigate = useNavigate();
  const { collapsed, isMobile } = useSidebarContext();
  const { showOverlay, hideOverlay } = useOverlay();

  /**
   * Status loading saat memperpanjang sesi.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isExtending, setIsExtending] = useState(false);

  /**
   * Status loading saat logout.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Salinan lokal data pengguna untuk update UI instan.
   * @type {[import("../contexts/AuthContext").User | null, React.Dispatch<React.SetStateAction<...>>]}
   */
  const [currentUser, setCurrentUser] = useState(user);

  // Sync currentUser dengan user dari AuthContext
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // ======================================================
  // APP INITIALIZATION LOADER
  // ======================================================
  /**
   * Menampilkan overlay loader saat aplikasi sedang memeriksa sesi awal.
   * Disembunyikan setelah `isInitialized === true`.
   */
  useEffect(() => {
    if (!isInitialized) {
      showOverlay("app-loader", {
        type: "loader-overlay",
        content: {},
        position: { top: 0, left: 0 },
      });
    } else {
      hideOverlay("app-loader");
    }
  }, [isInitialized, showOverlay, hideOverlay]);

  // ======================================================
  // USER UPDATE HANDLER untuk TopBar
  // ======================================================
  /**
   * Handler untuk memperbarui data pengguna dari TopBar.
   * Memperbarui state lokal dan context global.
   *
   * @param {import("../contexts/AuthContext").User} updatedUser - Data pengguna yang diperbarui
   */
  const handleUserUpdate = useCallback(
    (updatedUser) => {
      setCurrentUser(updatedUser);
      if (updateUser && typeof updateUser === "function") {
        updateUser(updatedUser);
      }
    },
    [updateUser]
  );

  // ======================================================
  // EXTEND SESSION HANDLER
  // ======================================================
  /**
   * Memperpanjang sesi pengguna saat modal sesi habis muncul.
   * Menangani loading state dan error.
   */
  const handleExtend = async () => {
    setIsExtending(true);
    try {
      await extendSession();
    } catch (error) {
      console.error("❌ Failed to extend session:", error);
    } finally {
      setIsExtending(false);
    }
  };

  // ======================================================
  // LOGOUT HANDLER
  // ======================================================
  /**
   * Melakukan logout dan mengarahkan ke halaman login.
   * Menangani loading state dan error.
   */
  const handleGoToLogin = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("❌ Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // ======================================================
  // SIDEBAR CLASSES
  // ======================================================
  /**
   * Menentukan kelas CSS untuk area konten utama berdasarkan status sidebar.
   * @returns {string} String kelas CSS
   */
  const getMainContentClass = () => {
    let classes = ["main-content"];
    if (!isMobile && collapsed) {
      classes.push("sidebar-collapsed");
    }
    return classes.join(" ");
  };

  return (
    <>
      <div className="layout-container">
        <Sidebar />
        <div className={getMainContentClass()}>
          <TopBar
            user={currentUser}
            onLogout={handleGoToLogin}
            onUserUpdate={handleUserUpdate}
          />
          <main className="page-content">
            <div className="content-wrapper">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Modal peringatan sesi kedaluwarsa */}
      <SessionExpiredAlert
        isVisible={sessionExpired}
        onExtend={handleExtend}
        onGoToLogin={handleGoToLogin}
        isExtending={isExtending}
        isLoggingOut={isLoggingOut}
        sessionExpiredTooLong={sessionExpiredTooLong}
      />
    </>
  );
};

/**
 * Komponen wrapper Layout yang menyediakan semua context provider yang diperlukan.
 * Digunakan di dalam rute terlindungi di router.jsx.
 *
 * @component
 * @example
 * <Route element={<Layout />}>
 *   <Route path="home" element={<Home />} />
 * </Route>
 */
const Layout = () => {
  return (
    <SidebarProvider>
      <OverlayProvider>
        <ModalProvider>
          <LayoutContent />
        </ModalProvider>
      </OverlayProvider>
    </SidebarProvider>
  );
};

export default Layout;