/**
 * @file Sidebar.jsx
 * @description Komponen navigasi samping dashboard dengan dukungan:
 * - Mode collapsed/expanded
 * - Responsif mobile
 * - Submenu dengan animasi buka/tutup halus
 * - Tooltip ekspansi saat collapsed
 * - Overlay backdrop untuk mobile
 *
 * Menggunakan kombinasi custom hooks dan context untuk mengelola state kompleks:
 * - `useSidebar()`: Menyediakan daftar menu berdasarkan izin pengguna
 * - `useSidebarContext()`: Mengelola state global sidebar (mobileOpen, activeSubmenu)
 * - `useSidebarOverlay()`: Menangani tooltip dan interaksi mouse saat collapsed
 */

import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../hooks/useSidebar";
import { useSidebarContext } from "../contexts/SidebarContext";
import { useSidebarOverlay } from "../hooks/useSidebarOverlay";
import { brandConfig, hasSubmenu, iconConfig } from "../config/sidebarConfig";
import Logo from "../assets/images/logo1.png";
import PulseDots from "../components/Loaders/PulseDots";
import "../sass/components/Sidebar/Sidebar.css";

/**
 * Komponen sidebar navigasi utama.
 * Menampilkan menu dinamis berdasarkan izin pengguna dan mendukung interaksi kompleks.
 *
 * @component
 */
const Sidebar = () => {
  const { logout } = useAuth();
  const { menuItems } = useSidebar();
  const { mobileOpen, closeMobileSidebar, activeSubmenu, setActiveSubmenu } =
    useSidebarContext();

  const {
    collapsed,
    isMobile,
    showExpandingLabel,
    hideExpandingLabel,
    handleNavItemMouseEnter,
    handleSubmenuNavigation,
    getPositionFromEvent,
    handleSubmenuMouseLeave,
  } = useSidebarOverlay();

  /**
   * ID submenu yang sedang dalam proses animasi penutupan.
   * Digunakan untuk mencegah flicker saat toggle cepat.
   * @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]}
   */
  const [closingSubmenu, setClosingSubmenu] = useState(null);

  /**
   * Map timeout ID untuk setiap submenu yang sedang ditutup.
   * Memungkinkan pembatalan animasi jika pengguna membuka kembali submenu.
   * @type {{[submenuId: string]: number}}
   */
  const [submenuTimeouts, setSubmenuTimeouts] = useState({});

  /**
   * Status loading saat proses logout berlangsung.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /** @type {React.RefObject<HTMLDivElement>} Ref ke elemen sidebar untuk deteksi klik luar. */
  const sidebarRef = useRef(null);

  /** @type {React.MutableRefObject<Function | null>} Ref ke handler klik luar untuk memastikan closure terbaru. */
  const handleClickOutsideRef = useRef();

  /**
   * Melakukan proses logout pengguna.
   * Menonaktifkan tombol selama proses berlangsung.
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  /**
   * Menutup submenu dengan animasi delay.
   * Memberikan waktu untuk transisi CSS sebelum menghapus dari DOM.
   *
   * @param {string} submenuId - ID submenu yang akan ditutup
   */
  const closeSubmenuWithAnimation = (submenuId) => {
    if (submenuId && activeSubmenu === submenuId) {
      setClosingSubmenu(submenuId);

      if (submenuTimeouts[submenuId]) {
        clearTimeout(submenuTimeouts[submenuId]);
      }

      const timeoutId = setTimeout(() => {
        if (closingSubmenu === submenuId) {
          setActiveSubmenu(null);
          setClosingSubmenu(null);
        }
        setSubmenuTimeouts((prev) => {
          const newTimeouts = { ...prev };
          delete newTimeouts[submenuId];
          return newTimeouts;
        });
      }, 350);

      setSubmenuTimeouts((prev) => ({
        ...prev,
        [submenuId]: timeoutId,
      }));
    }
  };

  // Handler untuk menutup submenu saat klik di luar
  useEffect(() => {
    handleClickOutsideRef.current = (event) => {
      // Jangan tutup sidebar jika klik di dalam modal
      if (
        event.target.closest(".modal-overlay") ||
        event.target.closest(".modal-content") ||
        event.target.closest(".modal-backdrop")
      ) {
        return;
      }

      if (
        activeSubmenu &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        closeSubmenuWithAnimation(activeSubmenu);
      }
    };
  }, [activeSubmenu]);

  // Pasang event listener global untuk deteksi klik luar
  useEffect(() => {
    const handleClick = (event) => {
      if (handleClickOutsideRef.current) {
        handleClickOutsideRef.current(event);
      }
    };

    if (activeSubmenu) {
      document.addEventListener("mousedown", handleClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [activeSubmenu]);

  // Cleanup semua timeout saat komponen dilepas
  useEffect(() => {
    return () => {
      Object.values(submenuTimeouts).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, [submenuTimeouts]);

  /**
   * Handler klik pada item menu utama.
   * Mengelola logika buka/tutup submenu dan navigasi.
   *
   * @param {Object} item - Item menu yang diklik
   * @param {React.MouseEvent} e - Event klik
   */
  const handleMenuClick = (item, e) => {
    if (hasSubmenu(item)) {
      e.preventDefault();

      if (collapsed && !isMobile) {
        return;
      }

      if (closingSubmenu === item.id) {
        if (submenuTimeouts[item.id]) {
          clearTimeout(submenuTimeouts[item.id]);
          setSubmenuTimeouts((prev) => {
            const newTimeouts = { ...prev };
            delete newTimeouts[item.id];
            return newTimeouts;
          });
        }
        setClosingSubmenu(null);
        setActiveSubmenu(item.id);
        return;
      }

      if (activeSubmenu === item.id) {
        closeSubmenuWithAnimation(item.id);
      } else {
        Object.values(submenuTimeouts).forEach((timeoutId) => {
          clearTimeout(timeoutId);
        });
        setSubmenuTimeouts({});
        setClosingSubmenu(null);

        if (activeSubmenu) {
          setActiveSubmenu(null);
        }
        setActiveSubmenu(item.id);
      }
    } else {
      if (activeSubmenu) {
        closeSubmenuWithAnimation(activeSubmenu);
      }
      closeMobileSidebar();
    }
  };

  /**
   * Handler mouse enter pada item menu.
   * Menampilkan tooltip ekspansi saat mode collapsed.
   *
   * @param {Object} item - Item menu
   * @param {React.MouseEvent} e - Event mouse
   */
  const handleMouseEnter = (item, e) => {
    if (collapsed && !isMobile) {
      const position = getPositionFromEvent(e);
      handleNavItemMouseEnter(item, position);
    }
  };

  /**
   * Handler mouse leave pada item menu.
   * Menyembunyikan tooltip atau submenu overlay.
   *
   * @param {Object} item - Item menu
   * @param {React.MouseEvent} e - Event mouse
   */
  const handleMouseLeave = (item, e) => {
    if (collapsed && !isMobile) {
      if (hasSubmenu(item)) {
        handleSubmenuMouseLeave(item.id, e);
      } else {
        hideExpandingLabel(item.id);
      }
    }
  };

  /**
   * Handler mouse enter pada tombol logout.
   * Menampilkan tooltip "Sign Out".
   *
   * @param {React.MouseEvent} e - Event mouse
   */
  const handleLogoutMouseEnter = (e) => {
    if (collapsed && !isMobile) {
      const position = getPositionFromEvent(e);
      showExpandingLabel("logout", "Sign Out", position);
    }
  };

  /**
   * Handler mouse leave pada tombol logout.
   * Menyembunyikan tooltip logout.
   */
  const handleLogoutMouseLeave = () => {
    if (collapsed && !isMobile) {
      hideExpandingLabel("logout");
    }
  };

  /**
   * Handler klik pada item submenu.
   * Mencegah penutupan submenu saat navigasi internal.
   *
   * @param {React.MouseEvent} e - Event klik
   */
  const handleSubmenuClick = (e) => {
    handleSubmenuNavigation();
    if (isMobile) {
      closeMobileSidebar();
    }
  };

  /**
   * Menentukan kelas CSS untuk submenu berdasarkan status animasi.
   *
   * @param {string} itemId - ID item menu induk
   * @returns {string} String kelas CSS
   */
  const getSubmenuClass = (itemId) => {
    const classes = ["submenu-list"];

    if (activeSubmenu === itemId && closingSubmenu !== itemId) {
      classes.push("open");
    }

    if (closingSubmenu === itemId) {
      classes.push("closing");
    }

    return classes.join(" ");
  };

  // Tentukan kelas sidebar berdasarkan state
  const sidebarClasses = [
    "sidebar",
    collapsed && !isMobile ? "collapsed" : "",
    isMobile && mobileOpen ? "open" : "",
    isMobile ? "mobile" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* Backdrop untuk mobile */}
      {isMobile && mobileOpen && (
        <div className="sidebar-backdrop" onClick={closeMobileSidebar} />
      )}

      <aside className={sidebarClasses} ref={sidebarRef}>
        {/* Bagian Logo */}
        <div className="sidebar-logo-section">
          <div className="logo-container">
            <div className="logo-icon">
              <img src={Logo} alt="Logo" className="sidebar-logo" />
            </div>

            <div className="brand-text">
              {(!collapsed || isMobile) && <h3>{brandConfig.brandName}</h3>}
              <div className="brand-underline"></div>
            </div>
          </div>
        </div>

        {/* Menu Navigasi */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {menuItems.map((item) => {
              const isSubmenuOpen =
                activeSubmenu === item.id && closingSubmenu !== item.id;
              const isSubmenuClosing = closingSubmenu === item.id;

              return (
                <li key={item.id} className="nav-item">
                  <div className="nav-link-container">
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `nav-link ${isActive ? "active" : ""} ${
                          hasSubmenu(item) ? "has-submenu" : ""
                        }`
                      }
                      data-nav-item-id={item.id}
                      onClick={(e) => handleMenuClick(item, e)}
                      onMouseEnter={(e) => handleMouseEnter(item, e)}
                      onMouseLeave={(e) => handleMouseLeave(item, e)}
                    >
                      <img
                        src={item.icon}
                        alt={item.label}
                        className="nav-icon"
                      />
                      {(!collapsed || isMobile) && (
                        <>
                          <span className="nav-label">{item.label}</span>
                          {hasSubmenu(item) && (
                            <img
                              src={iconConfig.ArrowDown}
                              alt="Arrow"
                              className={`submenu-arrow ${
                                isSubmenuOpen ? "rotated" : ""
                              }`}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  </div>

                  {/* Submenu dengan animasi */}
                  {hasSubmenu(item) &&
                    (!collapsed || isMobile) &&
                    (isSubmenuOpen || isSubmenuClosing) && (
                      <ul
                        className={getSubmenuClass(item.id)}
                        data-submenu-id={item.id}
                      >
                        {item.submenu.map((subItem) => (
                          <li key={subItem.id} className="submenu-item">
                            <NavLink
                              to={subItem.path}
                              className={({ isActive }) =>
                                `submenu-link ${isActive ? "active" : ""}`
                              }
                              onClick={handleSubmenuClick}
                            >
                              <span className="submenu-label">
                                {subItem.label}
                              </span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                </li>
              );
            })}
          </ul>

          {/* Tombol Logout */}
          <div className="sidebar-footer">
            <div className="logout-container">
              <button
                className="logout-button"
                onClick={handleLogout}
                onMouseEnter={handleLogoutMouseEnter}
                onMouseLeave={handleLogoutMouseLeave}
                disabled={isLoggingOut}
                aria-label={isLoggingOut ? "Signing out..." : "Sign out"}
              >
                {isLoggingOut ? (
                  <PulseDots
                    size="sm"
                    color="#ffffff"
                    count={6}
                    className="pulse-dots--sidebar-logout"
                  />
                ) : (
                  <img
                    src={iconConfig.LogOut}
                    alt=""
                    className="logout-icon"
                  />
                )}
                {(!collapsed || isMobile) && (
                  <span className="logout-label">
                    {isLoggingOut ? "" : "Sign Out"}{" "}
                  </span>
                )}
              </button>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;