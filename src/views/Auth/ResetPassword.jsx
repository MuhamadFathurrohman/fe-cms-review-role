/**
 * @file ResetPassword.jsx
 * @description Halaman reset kata sandi setelah pengguna mengklik tautan dari email.
 * Mengambil token dari query string dan email dari localStorage,
 * memvalidasi input password (min 6 karakter, konfirmasi cocok),
 * lalu mengirim permintaan ke backend untuk memperbarui password.
 * Menampilkan pesan error jika token tidak valid atau sesi kadaluarsa.
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import generalApiService from "../../services/generalApiService";
import Logo from "../../assets/images/logo.svg";
import PulseDots from "../../components/Loaders/PulseDots";
import "../../sass/views/Auth/ResetPassword/ResetPassword.css";

/**
 * Komponen halaman reset password.
 * Memerlukan token dari URL dan email dari localStorage untuk berfungsi.
 *
 * @component
 * @example
 * // URL: /reset-password?token=abc123
 * // localStorage: resetEmail = "user@example.com"
 * <ResetPassword />
 */
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /**
   * Token reset password dari query string URL (`?token=...`).
   * @type {string | null}
   */
  const token = searchParams.get("token");

  /**
   * Email pengguna yang disimpan saat permintaan lupa password.
   * Diambil dari localStorage; digunakan untuk mengidentifikasi akun.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [email] = useState(() => {
    return localStorage.getItem("resetEmail") || "";
  });

  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [password, setPassword] = useState("");

  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [confirmPassword, setConfirmPassword] = useState("");

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [loading, setLoading] = useState(false);

  /**
   * State untuk menampilkan pesan alert (sukses/error).
   * @type {[{show: boolean, message: string, type: 'success'|'error'}, React.Dispatch<React.SetStateAction<...>>]}
   */
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [isFadingOut, setIsFadingOut] = useState(false);

  /**
   * Status validitas token dan email.
   * Jika `false`, form dinonaktifkan dan ditampilkan pesan error.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isTokenValid, setIsTokenValid] = useState(true);

  // State untuk toggle visibility password
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [showPassword, setShowPassword] = useState(false);

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State untuk tracking focus dan error tooltip
  /**
   * Input yang sedang dalam fokus, digunakan untuk menampilkan tooltip error real-time.
   * Nilai: `'password'` | `'confirmPassword'` | `null`
   * @type {['password'|'confirmPassword'|null, React.Dispatch<React.SetStateAction<...>>]}
   */
  const [focusedInput, setFocusedInput] = useState(null);

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [showPasswordError, setShowPasswordError] = useState(false);

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [showConfirmPasswordError, setShowConfirmPasswordError] =
    useState(false);

  // Validasi password (sesuai backend: min 6 karakter)
  /**
   * Apakah password memenuhi kriteria minimal (≥6 karakter).
   * @type {boolean}
   */
  const isPasswordValid = password.length >= 6;

  /**
   * Apakah password dan konfirmasi cocok.
   * @type {boolean}
   */
  const passwordsMatch = password === confirmPassword;

  /**
   * Apakah seluruh form valid dan siap dikirim.
   * @type {boolean}
   */
  const isFormValid =
    isPasswordValid && passwordsMatch && password && confirmPassword;

  // Validasi keberadaan token & email
  /**
   * Memeriksa apakah token dan email tersedia.
   * Jika tidak, tampilkan error dan nonaktifkan form.
   */
  useEffect(() => {
    if (!token || !email) {
      setAlert({
        show: true,
        message:
          "Missing information. Please request a new password reset link.",
        type: "error",
      });
      setIsTokenValid(false);
    }
  }, [token, email]);

  // Auto-hide alert
  /**
   * Menyembunyikan alert secara otomatis setelah 3–4 detik.
   */
  useEffect(() => {
    if (alert.show) {
      const fadeOutTimeout = setTimeout(() => setIsFadingOut(true), 3000);
      const clearTimeoutId = setTimeout(() => {
        setAlert((prev) => ({ ...prev, show: false }));
        setIsFadingOut(false);
      }, 4000);
      return () => {
        clearTimeout(fadeOutTimeout);
        clearTimeout(clearTimeoutId);
      };
    }
  }, [alert.show]);

  // useEffect untuk mengatur tampilan error tooltip
  /**
   * Menampilkan tooltip error hanya saat input dalam fokus dan nilai tidak valid.
   */
  useEffect(() => {
    if (focusedInput === "password" && password && !isPasswordValid) {
      setShowPasswordError(true);
    } else {
      setShowPasswordError(false);
    }

    if (
      focusedInput === "confirmPassword" &&
      confirmPassword &&
      !passwordsMatch
    ) {
      setShowConfirmPasswordError(true);
    } else {
      setShowConfirmPasswordError(false);
    }
  }, [
    focusedInput,
    password,
    confirmPassword,
    isPasswordValid,
    passwordsMatch,
  ]);

  /**
   * Menangani pengiriman form reset password.
   * - Memvalidasi form dan token
   * - Mengirim `token`, `email`, dan `password` ke `/auth/reset-password`
   * - Membersihkan `localStorage` setelah sukses
   * - Redirect ke halaman login
   *
   * @param {React.FormEvent<HTMLFormElement>} e - Event submit form
   * @async
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid || !isTokenValid) return;

    setLoading(true);
    setAlert({ show: false, message: "", type: "" });

    // Kirim email (dari localStorage), token, dan password
    const result = await generalApiService.create("/auth/reset-password", {
      token,
      email,
      password,
    });

    if (result.success) {
      // Hapus email dari localStorage setelah sukses
      localStorage.removeItem("resetEmail");

      setAlert({
        show: true,
        message:
          "Your password has been updated successfully. Redirecting to login...",
        type: "success",
      });
      setTimeout(() => navigate("/login"), 3000);
    } else {
      setAlert({
        show: true,
        message:
          result.message || "Failed to update password. Please try again.",
        type: "error",
      });

      // Nonaktifkan form jika error terkait token/email
      if (
        result.message?.toLowerCase().includes("token") ||
        result.message?.toLowerCase().includes("email")
      ) {
        setIsTokenValid(false);
      }
    }

    setLoading(false);
  };

  // Tampilkan error jika token atau email tidak tersedia
  if (!token || !email) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-header">
            <div className="reset-password-logo">
              <img src={Logo} alt="Logo" className="reset-password-logo-img" />
            </div>
            <h1 className="reset-password-title">Incomplete Reset Request</h1>
            <p className="reset-password-subtitle">
              We couldn't verify your reset request.
            </p>
          </div>

          <div className="reset-password-error-content">
            <p className="reset-password-error-text">
              Please go back to the login page and request a new password reset
              link.
            </p>

            <button
              type="button"
              className="reset-password-retry-button"
              onClick={() => navigate("/login")}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      {/* Alert Overlay */}
      {alert.show && (
        <div className="reset-password-alert-overlay">
          <div
            className={`reset-password-alert ${alert.type} ${
              isFadingOut ? "fade-out" : "fade-in"
            }`}
          >
            {alert.message}
          </div>
        </div>
      )}

      <div className="reset-password-card">
        <div className="reset-password-header">
          <div className="reset-password-logo">
            <img src={Logo} alt="Logo" className="reset-password-logo-img" />
          </div>
          <h1 className="reset-password-title">Reset Password</h1>
          <p className="reset-password-subtitle">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="reset-password-form-group">
            <label htmlFor="password" className="reset-password-form-label">
              New Password
            </label>
            <div className="reset-password-input-password">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`reset-password-form-input ${
                  password && !isPasswordValid ? "has-error" : ""
                }`}
                required
                disabled={loading || !isTokenValid}
                placeholder="At least 6 characters"
                onFocus={() => setFocusedInput("password")}
                onBlur={() => setFocusedInput(null)}
                aria-invalid={password && !isPasswordValid}
                aria-describedby={
                  showPasswordError ? "password-error-tooltip" : undefined
                }
              />
              <button
                type="button"
                className="reset-password-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || !isTokenValid}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>

              {showPasswordError && (
                <div
                  id="password-error-tooltip"
                  className="reset-password-error-tooltip"
                >
                  Password must be at least 6 characters.
                </div>
              )}
            </div>
          </div>

          <div className="reset-password-form-group">
            <label
              htmlFor="confirmPassword"
              className="reset-password-form-label"
            >
              Confirm New Password
            </label>
            <div className="reset-password-input-password">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`reset-password-form-input ${
                  confirmPassword && !passwordsMatch ? "has-error" : ""
                }`}
                required
                disabled={loading || !isTokenValid}
                placeholder="Re-enter your password"
                onFocus={() => setFocusedInput("confirmPassword")}
                onBlur={() => setFocusedInput(null)}
                aria-invalid={confirmPassword && !passwordsMatch}
                aria-describedby={
                  showConfirmPasswordError
                    ? "confirm-password-error-tooltip"
                    : undefined
                }
              />
              <button
                type="button"
                className="reset-password-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading || !isTokenValid}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>

              {showConfirmPasswordError && (
                <div
                  id="confirm-password-error-tooltip"
                  className="reset-password-error-tooltip"
                >
                  Passwords do not match.
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="reset-password-button"
            disabled={loading || !isFormValid || !isTokenValid}
            aria-disabled={loading || !isFormValid || !isTokenValid}
          >
            {loading ? (
              <span className="reset-password-button-loading">
                <PulseDots size="sm" color="white" />
              </span>
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;