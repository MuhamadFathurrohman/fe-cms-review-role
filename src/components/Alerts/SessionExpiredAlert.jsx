/**
 * @file SessionExpiredAlert.jsx
 * @description Komponen modal peringatan yang muncul saat sesi pengguna habis.
 * Menampilkan dua kondisi berbeda:
 * 1. **Sesi habis (<15 menit)**: Berikan opsi "Extend Session" atau "Go to Login".
 * 2. **Sesi habis terlalu lama (>15 menit)**: Hanya tampilkan tombol "Go to Login".
 * 
 * Modal ini dikontrol oleh AuthContext dan menggunakan service session dari api.js.
 */

import React from "react";
import { Clock, AlertTriangle } from "lucide-react";
import PulseDots from "../Loaders/PulseDots";
import "../../sass/components/Alerts/SessionExpired/SessionExpired.css";

/**
 * Props untuk komponen SessionExpiredAlert.
 * @typedef {Object} SessionExpiredAlertProps
 * @property {boolean} isVisible - Apakah modal harus ditampilkan.
 * @property {boolean} sessionExpiredTooLong - Jika true, tampilkan versi "terlalu lama" (tidak bisa diperpanjang).
 * @property {function(): void} onExtend - Callback saat pengguna memilih "Extend Session".
 * @property {function(): void} onGoToLogin - Callback saat pengguna memilih "Go to Login".
 * @property {boolean} isExtending - Status loading saat memperpanjang sesi.
 * @property {boolean} isLoggingOut - Status loading saat logout/redirect ke login.
 */

/**
 * Modal peringatan sesi kedaluwarsa.
 * Muncul di atas seluruh aplikasi saat sesi pengguna habis.
 * Mendukung aksesibilitas penuh (ARIA alertdialog).
 *
 * @component
 * @param {SessionExpiredAlertProps} props - Properti komponen
 * @example
 * <SessionExpiredAlert
 *   isVisible={true}
 *   sessionExpiredTooLong={false}
 *   onExtend={handleExtend}
 *   onGoToLogin={handleLogout}
 *   isExtending={false}
 *   isLoggingOut={false}
 * />
 */
const SessionExpiredAlert = ({
  onExtend,
  onGoToLogin,
  isVisible,
  isExtending,
  isLoggingOut,
  sessionExpiredTooLong,
}) => {
  if (!isVisible) return null;

  // KONDISI: Session expired terlalu lama (>15 menit)
  if (sessionExpiredTooLong) {
    return (
      <div
        className="session-alert-overlay"
        role="alertdialog"
        aria-labelledby="session-alert-title"
        aria-modal="true"
      >
        <div className="session-alert-modal session-alert-modal--expired">
          <div className="session-alert-icon session-alert-icon--warning">
            <AlertTriangle size={32} />
          </div>
          <h2 id="session-alert-title" className="session-alert-title">
            Session Timed Out
          </h2>
          <p className="session-alert-message">
            Your session has been inactive for too long. Please log in again to
            continue.
          </p>
          <div className="session-alert-actions">
            <button
              type="button"
              className="session-alert-btn session-alert-btn--primary session-alert-btn--full"
              onClick={onGoToLogin}
              disabled={isLoggingOut}
              aria-label="Go to login"
            >
              {isLoggingOut ? (
                <span className="btn-loading">
                  <PulseDots count={6} size="md" color="#ffffff" />
                </span>
              ) : (
                "Go to Login"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Session baru expired (<15 menit)
  return (
    <div
      className="session-alert-overlay"
      role="alertdialog"
      aria-labelledby="session-alert-title"
      aria-modal="true"
    >
      <div className="session-alert-modal">
        <div className="session-alert-icon">
          <Clock size={32} />
        </div>
        <h2 id="session-alert-title" className="session-alert-title">
          Session Expired
        </h2>
        <p className="session-alert-message">
          Your session has expired. Extend to stay signed in.
        </p>
        <div className="session-alert-actions">
          <button
            type="button"
            className="session-alert-btn session-alert-btn--primary"
            onClick={onExtend}
            disabled={isExtending || isLoggingOut}
            aria-label="Extend session"
          >
            {isExtending ? (
              <span className="btn-loading">
                <PulseDots count={6} size="md" color="#ffffff" />
              </span>
            ) : (
              "Extend Session"
            )}
          </button>
          <button
            type="button"
            className="session-alert-btn session-alert-btn--secondary"
            onClick={onGoToLogin}
            disabled={isExtending || isLoggingOut}
            aria-label="Go to login"
          >
            {isLoggingOut ? (
              <span className="btn-loading">
                <PulseDots count={6} size="md" color="#ffffff" />
              </span>
            ) : (
              "Go to Login"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredAlert;