/**
 * @file NotificationsModal.jsx
 * @description Komponen modal untuk menampilkan daftar lengkap notifikasi pengguna.
 * Menyediakan antarmuka yang bersih untuk melihat semua notifikasi dalam satu tempat,
 * dengan dukungan:
 * - Loading state saat mengambil data
 * - Indikator status baca/tidak baca
 * - Prioritas notifikasi (low/medium/high)
 * - Format waktu yang ramah pengguna
 * 
 * Dirancang sebagai ekstensi dari dropdown notifikasi di header,
 * memberikan pengalaman yang lebih lengkap untuk manajemen notifikasi.
 */

import React, { useState, useEffect } from "react";
import { notificationService } from "../../../services/notificationService";
import { baseService } from "../../../services/baseService";
import "../../../sass/components/Modals/NotificationsModal/NotificationsModal.css";

// Import Bell icon yang digunakan di render no-data
import { Bell } from "lucide-react";

/**
 * Props untuk komponen NotificationsModal.
 * @typedef {Object} NotificationsModalProps
 * @property {function(): void} onClose - Handler saat modal ditutup
 */

/**
 * Komponen modal daftar notifikasi lengkap.
 * Menampilkan semua notifikasi pengguna dalam format daftar yang mudah dibaca.
 *
 * @component
 * @param {NotificationsModalProps} props - Props komponen
 */
const NotificationsModal = ({ onClose }) => {
  /**
   * Daftar notifikasi yang dimuat dari service.
   * @type {[Array<Object>, React.Dispatch<React.SetStateAction<Array<Object>>>]}
   */
  const [notifications, setNotifications] = useState([]);

  /**
   * Status loading saat mengambil data notifikasi.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(true);

  // Fetch semua notifikasi saat komponen dipasang
  useEffect(() => {
    const loadAllNotifications = async () => {
      setLoading(true);

      try {
        const result = await notificationService.getNotifications(1, 50);

        if (result.success && Array.isArray(result.data)) {
          const notificationsWithDefaults = result.data.map((n) => ({
            ...n,
            priority: n.priority || "medium",
            isRead: n.isRead !== false, // default ke true jika undefined
          }));
          setNotifications(notificationsWithDefaults);
        } else {
          setNotifications([]);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllNotifications();
  }, []);

  return (
    <div className="nm-content">
      <div className="nm-list-wrapper">
        {loading ? (
          <div className="nm-loading">
            <div className="nm-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="nm-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`nm-item ${!notification.isRead ? "nm-unread" : ""}`}
                role="listitem"
                aria-label={`${notification.title}. ${notification.message}. ${baseService.timeAgo(notification.timestamp)}`}
              >
                <div
                  className="nm-priority-dot"
                  data-priority={notification.priority}
                  aria-label={`Priority: ${notification.priority}`}
                ></div>

                <div className="nm-content-row">
                  <div className="nm-text">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                  </div>
                  <span className="nm-time">
                    {baseService.timeAgo(notification.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="nm-no-data">
            <Bell size={48} className="nm-no-data-icon" />
            <p>No notifications available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsModal;