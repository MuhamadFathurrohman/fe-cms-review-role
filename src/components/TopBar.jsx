/**
 * @file TopBar.jsx
 * @description Komponen header dashboard yang menampilkan:
 * - Tombol toggle sidebar
 * - Jam dan tanggal real-time
 * - Notifikasi dengan badge unread count
 * - Menu pengguna dengan avatar dan profil
 *
 * Mengintegrasikan berbagai layanan dan context:
 * - AuthContext (melalui props `user`)
 * - ModalContext (untuk form profil dan notifikasi)
 * - OverlayContext (untuk tooltip email)
 * - Auto-refetch data setiap 30 detik
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bell, Menu, User, LogOut, ChevronDown } from "lucide-react";
import { useSidebarContext } from "../contexts/SidebarContext";
import { useModalContext } from "../contexts/ModalContext";
import { useOverlay, OVERLAY_TYPES } from "../contexts/OverlayContext";
import { formatRoleName, getRoleBadgeClass } from "../utils/roleHelper";
import { notificationService } from "../services/notificationService";
import { baseService } from "../services/baseService";
import { usersService } from "../services/usersService";
import { useAutoRefetch } from "../hooks/useAutoRefetch";
import PulseDots from "../components/Loaders/PulseDots";
import Modal from "./Modals/Modal";
import UserForm from "./Modals/Form/UserForm";
import NotificationsModal from "./Modals/view/NotificationsModal";
import defaultAvatar from "../assets/images/default-avatar.png";
import "../sass/components/Topbar/Topbar.css";

/**
 * Props untuk komponen TopBar.
 * @typedef {Object} TopBarProps
 * @property {import("../contexts/AuthContext").User} user - Data pengguna saat ini
 * @property {function(): Promise<void>} onLogout - Handler logout
 * @property {function(import("../contexts/AuthContext").User): void} onUserUpdate - Callback saat data pengguna diperbarui
 */

/**
 * Komponen header dashboard utama.
 * Menyediakan navigasi, informasi waktu, notifikasi, dan akses profil pengguna.
 *
 * @component
 * @param {TopBarProps} props - Props komponen
 */
const TopBar = ({ user, onLogout, onUserUpdate }) => {
  /**
   * Status tampilan dropdown menu pengguna.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [showUserMenu, setShowUserMenu] = useState(false);

  /**
   * Status tampilan dropdown notifikasi.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [showNotifications, setShowNotifications] = useState(false);

  /**
   * Waktu saat ini untuk display jam real-time.
   * @type {[Date, React.Dispatch<React.SetStateAction<Date>>]}
   */
  const [currentTime, setCurrentTime] = useState(new Date());

  /**
   * Daftar notifikasi terbaru (5 item).
   * @type {[Array<Object>, React.Dispatch<React.SetStateAction<Array<Object>>>]}
   */
  const [notifications, setNotifications] = useState([]);

  /**
   * Jumlah notifikasi belum dibaca.
   * @type {[number, React.Dispatch<React.SetStateAction<number>>]}
   */
  const [unreadCount, setUnreadCount] = useState(0);

  const { openModal, closeModal } = useModalContext();
  const { showOverlay, hideOverlay } = useOverlay();
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const { toggleSidebar, collapsed, mobileOpen, isMobile } =
    useSidebarContext();

  /**
   * Status error loading avatar per ukuran/resolusi.
   * @type {{[key: string]: boolean}}
   */
  const [avatarError, setAvatarError] = useState({});

  /**
   * Status loading saat proses logout berlangsung.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Salinan lokal data pengguna untuk update UI instan.
   * @type {[import("../contexts/AuthContext").User | null, React.Dispatch<React.SetStateAction<...>>]}
   */
  const [currentUser, setCurrentUser] = useState(user);

  // Sinkronisasi currentUser dengan props user
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      setAvatarError({});
    }
  }, [user]);

  // Role Badge - hanya digunakan di user menu
  const displayRole = formatRoleName(currentUser?.roleName);
  const badgeClass = getRoleBadgeClass(displayRole);

  /**
   * Menangani error loading avatar dan fallback ke inisial.
   * @param {string} key - Kunci unik berdasarkan ukuran dan ID pengguna
   */
  const handleAvatarError = (key) => {
    setAvatarError((prev) => ({ ...prev, [key]: true }));
  };

  /**
   * Merender avatar pengguna dengan fallback yang sesuai.
   * 
   * @param {import("../contexts/AuthContext").User | null} userData - Data pengguna
   * @param {'small'|'medium'} [size='small'] - Ukuran avatar
   * @returns {JSX.Element} Elemen avatar atau inisial
   */
  const renderAvatar = (userData, size = "small") => {
    const key = `${size}-${userData?.id || "unknown"}`;
    const hasAvatarPath = !!userData?.avatar;
    const shouldUseDefault = avatarError[key] || !userData;

    if (userData && !hasAvatarPath && !avatarError[key]) {
      return (
        <img
          src={defaultAvatar}
          alt={userData?.name || "User"}
          className="avatar-image"
        />
      );
    }

    if (shouldUseDefault) {
      return <span>{userData?.name?.charAt(0)?.toUpperCase() || "?"}</span>;
    }

    const fullAvatarUrl = usersService.getFullAvatarUrl(userData.avatar);

    return (
      <img
        src={fullAvatarUrl}
        alt={userData?.name || "User"}
        className="avatar-image"
        onError={() => handleAvatarError(key)}
        key={fullAvatarUrl}
      />
    );
  };

  // Time Updates
  /**
   * Memperbarui jam real-time setiap detik.
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Notifications
  /**
   * Memuat daftar notifikasi terbaru (5 item).
   * @async
   */
  const loadNotifications = useCallback(async () => {
    if (!currentUser?.id) return;
    const result = await notificationService.getNotifications(1, 5);
    if (result.success) {
      setNotifications(result.data || []);
    } else {
      setNotifications([]);
    }
  }, [currentUser?.id]);

  /**
   * Memuat jumlah notifikasi belum dibaca.
   * @async
   */
  const loadUnreadCount = useCallback(async () => {
    if (!currentUser?.id) return;
    const result = await notificationService.getUnreadCount();
    setUnreadCount(result.success ? result.count || 0 : 0);
  }, [currentUser?.id]);

  // Refresh user data
  /**
   * Memperbarui data pengguna dari server.
   * Digunakan untuk sinkronisasi avatar dan profil setelah update.
   * @async
   */
  const refreshUserData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const result = await usersService.getCurrentUser();
      if (result.success && result.data) {
        setCurrentUser(result.data);
        if (onUserUpdate) {
          onUserUpdate(result.data);
        }
        setAvatarError({});
      }
    } catch (error) {
      console.error("❌ TopBar: Failed to refresh user data:", error);
    }
  }, [currentUser?.id, onUserUpdate]);

  /**
   * Fungsi refetch otomatis yang dipanggil setiap 30 detik.
   * Memperbarui notifikasi, unread count, dan data pengguna.
   * @async
   */
  const handleAutoRefetch = useCallback(async () => {
    try {
      await Promise.all([
        loadNotifications(),
        loadUnreadCount(),
        refreshUserData(),
      ]);
    } catch (error) {
      console.error("❌ TopBar: Failed to refetch data:", error);
    }
  }, [loadNotifications, loadUnreadCount, refreshUserData]);

  useAutoRefetch(handleAutoRefetch);

  // Load initial data
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  // Close Dropdowns
  /**
   * Menutup dropdown saat klik di luar area.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Membuka dropdown notifikasi dan menandai semua sebagai sudah dibaca.
   * @async
   */
  const handleOpenNotifications = async () => {
    setShowNotifications(true);
    const allResult = await notificationService.getNotifications(1, 100);
    if (allResult.success && Array.isArray(allResult.data)) {
      const unreadNotifications = allResult.data.filter((n) => !n.isRead);
      if (unreadNotifications.length > 0) {
        await Promise.all(
          unreadNotifications.map((n) => notificationService.markAsRead(n.id))
        );
        setNotifications(allResult.data.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    }
  };

  // Date & Time Formatting
  /**
   * Mendapatkan string tanggal dalam format: "DayName, DD MMM YYYY".
   * @returns {string} Tanggal terformat
   */
  const getCurrentDate = () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const day = currentTime.getDate();
    const month = months[currentTime.getMonth()];
    const year = currentTime.getFullYear();
    const dayName = days[currentTime.getDay()];
    return `${dayName}, ${day} ${month} ${year}`;
  };

  /**
   * Mendapatkan string waktu dalam format: "HH:MM:SS".
   * @returns {string} Waktu terformat
   */
  const getCurrentTime = () => {
    const hours = String(currentTime.getHours()).padStart(2, "0");
    const minutes = String(currentTime.getMinutes()).padStart(2, "0");
    const seconds = String(currentTime.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  // Email Tooltip Handlers
  /**
   * Memperbarui posisi kursor untuk efek ripple pada tooltip email.
   * @param {React.MouseEvent} e - Event mouse
   */
  const updateCursorPosition = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.target.style.setProperty("--cursor-x", `${x}px`);
    e.target.style.setProperty("--cursor-y", `${y}px`);
  };

  /**
   * Menampilkan tooltip email saat hover.
   * @param {React.MouseEvent} e - Event mouse
   */
  const handleEmailHover = (e) => {
    if (!currentUser?.email) return;
    updateCursorPosition(e);
    showOverlay("email-tooltip", {
      type: OVERLAY_TYPES.EMAIL_TOOLTIP,
      content: { email: currentUser.email },
      position: { top: e.clientY, right: e.clientX },
    });
  };

  /**
   * Memperbarui posisi tooltip saat mouse bergerak.
   * @param {React.MouseEvent} e - Event mouse
   */
  const handleEmailMouseMove = (e) => {
    if (document.querySelector('[data-overlay-id="email-tooltip"]')) {
      updateCursorPosition(e);
    }
  };

  /**
   * Menyembunyikan tooltip email.
   */
  const handleEmailLeave = () => {
    hideOverlay("email-tooltip");
  };

  /**
   * Melakukan proses logout.
   * @async
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // HANDLE PROFILE
  /**
   * Membuka modal profil pengguna.
   * Mengirimkan data yang telah diformat ke UserForm.
   */
  const handleProfile = () => {
    const profileData = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone || "",
      avatar: currentUser.avatar,
      avatarUrl: usersService.getFullAvatarUrl(currentUser.avatar),
      roleName: currentUser.roleName || currentUser.role?.name || "User",
      roleId: currentUser.role?.id ? String(currentUser.role.id) : "",
      status: currentUser.status || "ACTIVE",
    };

    openModal(
      "profileUserModal",
      <Modal
        title="Your Profile"
        showHeader={true}
        showCloseButton={true}
        size="large"
        onClose={() => closeModal("profileUserModal")}
      >
        <UserForm
          isProfileMode={true}
          initialData={profileData}
          onSuccess={(updatedUser) => {
            closeModal("profileUserModal");
            if (updatedUser) {
              setCurrentUser(updatedUser);
              if (onUserUpdate) {
                onUserUpdate(updatedUser);
              }
              setAvatarError({});
            } else {
              refreshUserData();
            }
          }}
          onCancel={() => closeModal("profileUserModal")}
        />
      </Modal>
    );
  };

  /**
   * Membuka modal notifikasi lengkap.
   */
  const handleViewAllNotifications = () => {
    setShowNotifications(false);
    openModal(
      "viewAllNotifications",
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Bell size={22} />
            <span>All Notifications</span>
          </div>
        }
        showHeader={true}
        showCloseButton={true}
        size="medium"
        onClose={() => closeModal("viewAllNotifications")}
      >
        <NotificationsModal
          onClose={() => closeModal("viewAllNotifications")}
        />
      </Modal>
    );
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className={`hamburger-menu ${
            isMobile && mobileOpen ? "active" : ""
          } ${!isMobile && collapsed ? "collapsed" : ""}`}
          onClick={toggleSidebar}
          aria-label={isMobile ? "Toggle mobile menu" : "Toggle sidebar"}
          title={
            isMobile
              ? "Toggle mobile menu"
              : collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          <Menu size={20} />
        </button>

        <div className="datetime-display">
          <div className="date-section">
            <span className="current-date">{getCurrentDate()}</span>
          </div>
          <div className="time-section">
            <span className="current-time">{getCurrentTime()}</span>
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <div className="notification-container" ref={notificationRef}>
          <button
            className="notification-button"
            onClick={handleOpenNotifications}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>Notifications</h3>
                <span className="notification-count">{unreadCount} unread</span>
              </div>
              <div className="notification-list">
                {Array.isArray(notifications) && notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${
                        !notification.isRead ? "unread" : ""
                      }`}
                    >
                      <div
                        className="priority-dot"
                        data-priority={notification.priority || "medium"}
                      ></div>
                      <div className="notification-content">
                        <h4>{notification.title}</h4>
                        <p>{notification.message}</p>
                        <span className="notification-time">
                          {baseService.timeAgo(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="notification-item">
                    <p>No new notifications</p>
                  </div>
                )}
              </div>
              <div className="notification-footer">
                <button
                  className="view-all-btn"
                  onClick={handleViewAllNotifications}
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="user-menu-container" ref={userMenuRef}>
          <button
            className="user-menu-button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User menu"
          >
            <div className="user-avatar user-avatar--small">
              {renderAvatar(currentUser, "small")}
            </div>
            <ChevronDown
              size={16}
              className={`chevron ${showUserMenu ? "rotated" : ""}`}
            />
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <div className="user-avatar user-avatar--medium">
                  {renderAvatar(currentUser, "medium")}
                </div>
                <div className="user-details">
                  <p className="name">{currentUser?.name || "User"}</p>
                  <div
                    className="email"
                    onMouseEnter={handleEmailHover}
                    onMouseMove={handleEmailMouseMove}
                    onMouseLeave={handleEmailLeave}
                  >
                    {currentUser?.email || "-"}
                  </div>
                  <p className={`badge role ${badgeClass}`}>{displayRole}</p>
                </div>
              </div>

              <div className="user-dropdown-menu">
                <button className="dropdown-item" onClick={handleProfile}>
                  <User size={16} />
                  <span>Profile</span>
                </button>
                <div className="dropdown-divider"></div>
                <button
                  className="dropdown-item logout"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  aria-disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <PulseDots
                      size="sm"
                      count={5}
                      color="#dc2626"
                      className="pulse-dots--centered"
                    />
                  ) : (
                    <>
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;