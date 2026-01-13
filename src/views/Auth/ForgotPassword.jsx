/**
 * @file ForgotPassword.jsx
 * @description Halaman lupa kata sandi.
 * Memungkinkan pengguna memasukkan email untuk meminta tautan reset password.
 * Mengimplementasikan mekanisme cooldown (120 detik) untuk mencegah spam,
 * serta menampilkan feedback visual melalui alert dan loading state.
 */

import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import generalApiService from "../../services/generalApiService";
import Logo from "../../assets/images/logo.svg";
import PulseDots from "../../components/Loaders/PulseDots";
import "../../sass/views/Auth/ForgotPassword/ForgotPassword.css";

/**
 * Komponen halaman "Lupa Password".
 * Mengelola input email, validasi, permintaan reset, dan batasan cooldown.
 *
 * @component
 * @example
 * <ForgotPassword />
 */
const ForgotPassword = () => {
  /**
   * Email yang dimasukkan pengguna.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [email, setEmail] = useState("");

  /**
   * Status loading saat mengirim permintaan reset.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(false);

  /**
   * State untuk menampilkan pesan alert (sukses/error).
   * @type {[{show: boolean, message: string, type: 'success'|'error'}, React.Dispatch<React.SetStateAction<...>>]}
   */
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Cooldown state
  /**
   * Menandai apakah cooldown aktif (mencegah permintaan berulang).
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [cooldownActive, setCooldownActive] = useState(false);

  /**
   * Sisa waktu cooldown dalam detik.
   * @type {[number, React.Dispatch<React.SetStateAction<number>>]}
   */
  const [countdown, setCountdown] = useState(0);

  /** @constant {number} Durasi cooldown dalam detik (2 menit). */
  const COOLDOWN_SECONDS = 120;

  // Countdown timer
  /**
   * Efek samping untuk menjalankan timer mundur saat cooldown aktif.
   * Secara otomatis menonaktifkan cooldown saat hitungan selesai.
   */
  useEffect(() => {
    let timer;
    if (cooldownActive && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCooldownActive(false);
    }
    return () => clearInterval(timer);
  }, [cooldownActive, countdown]);

  // Auto-hide alert
  /**
   * Efek samping untuk menyembunyikan alert secara otomatis setelah 3–4 detik.
   */
  useEffect(() => {
    if (alert.show) {
      const fadeOutTimeout = setTimeout(() => setIsFadingOut(true), 3000);
      const clearTimeoutId = setTimeout(() => {
        setAlert({ show: false, message: "", type: "" });
        setIsFadingOut(false);
      }, 4000);
      return () => {
        clearTimeout(fadeOutTimeout);
        clearTimeout(clearTimeoutId);
      };
    }
  }, [alert.show]);

  /**
   * Menangani pengiriman formulir permintaan reset password.
   * - Memvalidasi cooldown
   * - Mengirim email ke endpoint `/auth/forgot-password`
   * - Menyimpan email di localStorage (untuk halaman reset berikutnya)
   * - Menampilkan feedback sesuai respons API
   *
   * @param {React.FormEvent<HTMLFormElement>} e - Event submit form
   * @async
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cooldownActive) return;

    setLoading(true);
    setAlert({ show: false, message: "", type: "" });

    const result = await generalApiService.create("/auth/forgot-password", {
      email,
    });

    // Di dalam handleSubmit, setelah result.success
    if (result.success) {
      if (email && email.includes("@")) {
        localStorage.setItem("resetEmail", email);
      }

      setAlert({
        show: true,
        message:
          "If your email is registered, you will receive a password reset link.",
        type: "success",
      });

      setCooldownActive(true);
      setCountdown(COOLDOWN_SECONDS);
    } else {
      // Hanya terjadi jika error jaringan, timeout, atau non-2xx
      setAlert({
        show: true,
        message: result.message || "An error occurred. Please try again.",
        type: "error",
      });
    }

    setLoading(false);
  };

  return (
    <div className="forgot-password-container">
      {/* Alert Overlay */}
      {alert.show && (
        <div className="alert-overlay">
          <div
            className={`alert ${alert.type} ${
              isFadingOut ? "fade-out" : "fade-in"
            }`}
          >
            {alert.message}
          </div>
        </div>
      )}

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <img src={Logo} alt="Logo" className="auth-logo-img" />
          </div>
          <h1 className="auth-title">Forgot Password</h1>
          <p className="auth-subtitle">
            Enter your email and we’ll send you a link to reset your password.
          </p>

          {cooldownActive && (
            <p className="cooldown-message-top">
              You can request again in{" "}
              <strong>
                {Math.floor(countdown / 60)}m{" "}
                {String(countdown % 60).padStart(2, "0")}s
              </strong>
              .
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
              disabled={loading || cooldownActive}
              aria-describedby={alert.show ? "alert-message" : undefined}
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading || cooldownActive}
            aria-disabled={loading || cooldownActive}
          >
            {loading ? (
              <span className="login-button-loading">
                <PulseDots size="sm" color="white" />
              </span>
            ) : cooldownActive ? (
              "Please Wait..."
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Remember your password? </span>
          <NavLink to="/login" className="auth-link">
            Sign In
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;