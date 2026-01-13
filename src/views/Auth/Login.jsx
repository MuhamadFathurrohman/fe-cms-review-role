/**
 * @file Login.jsx
 * @description Halaman login utama aplikasi.
 * Memungkinkan pengguna memasukkan kredensial, menangani autentikasi melalui AuthContext,
 * dan mengarahkan pengguna ke dashboard setelah login berhasil.
 * Menampilkan pesan error, loading state, dan animasi feedback UX.
 */

import React, { useState, useEffect } from "react";
import "../../sass/views/Auth/Login/Login.css";
import Logo from "../../assets/images/logo.svg";
import { NavLink, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import LoaderMain from "../../components/Loaders/LoaderMain";
import PulseDots from "../../components/Loaders/PulseDots";

/**
 * Komponen halaman login.
 * Mengelola formulir input, validasi, status loading, dan navigasi pasca-login.
 *
 * @component
 * @example
 * <Login />
 */
export default function Login() {
  const { login, user, error, clearError, isAuthenticated, isInitialized } =
    useAuth();

  /**
   * @typedef {Object} FormData
   * @property {string} email - Email pengguna
   * @property {string} password - Kata sandi pengguna
   */

  /**
   * State untuk menyimpan nilai input form.
   * @type {[FormData, React.Dispatch<React.SetStateAction<FormData>>]}
   */
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  /**
   * State untuk menampilkan pesan alert (sukses/error).
   * @type {[{type: 'success'|'error', message: string}|null, React.Dispatch<React.SetStateAction<...>>]}
   */
  const [alert, setAlert] = useState(null);

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [isFadingOut, setIsFadingOut] = useState(false);

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [showPassword, setShowPassword] = useState(false);

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // ======================================================
  // Redirect otomatis jika sesi masih aktif
  // ======================================================
  useEffect(() => {
    if (isInitialized && isAuthenticated && user) {
      redirectUserBasedOnRole(user);
    }
  }, [isInitialized, isAuthenticated, user]);

  // ======================================================
  // Sinkronisasi error dari AuthContext ke UI
  // ======================================================
  useEffect(() => {
    if (error) {
      setAlert({
        type: "error",
        message: error,
      });
      setIsLoading(false);
    }
  }, [error]);

  /**
   * Handler perubahan input form.
   * Membersihkan error/alert saat pengguna mulai mengetik.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Event perubahan input
   */
  const handleChange = (e) => {
    if (error) clearError();
    if (alert) setAlert(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * Mengarahkan pengguna ke halaman berdasarkan perannya.
   * Saat ini semua peran diarahkan ke `/dashboard/home`.
   * @param {import("../../contexts/AuthContext").User} userData - Data pengguna yang sudah diautentikasi
   */
  const redirectUserBasedOnRole = (userData) => {
    try {
      navigate("/dashboard/home", { replace: true });
    } catch (error) {
      console.error("Redirect error:", error);
      setAlert({
        type: "error",
        message: "Error redirecting user. Please contact support.",
      });
    }
  };

  /**
   * Menangani proses login saat form disubmit.
   * Memvalidasi input, memanggil fungsi login dari AuthContext,
   * dan menampilkan feedback UX (loading, sukses, error).
   * @param {React.FormEvent<HTMLFormElement>} e - Event submit form
   * @async
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setAlert({ type: "error", message: "Please fill in all fields" });
      return;
    }

    setIsLoading(true);
    setAlert(null);

    try {
      const loginPromise = login(formData);
      // Minimum loading time untuk UX yang lebih smooth
      const minLoadingTime = new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );
      const [result] = await Promise.all([loginPromise, minLoadingTime]);

      if (result.success) {
        setAlert({
          type: "success",
          message: "Login successful! Redirecting...",
        });
        // Tidak perlu setTimeout kosong — redirect otomatis via useEffect
      } else {
        setAlert({
          type: "error",
          message: result.message || "Login failed. Please try again.",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      setAlert({
        type: "error",
        message: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ======================================================
  // Auto-hide alert setelah 3-4 detik
  // ======================================================
  useEffect(() => {
    if (alert) {
      const fadeOutTimeout = setTimeout(() => setIsFadingOut(true), 3000);
      const clearTimeout_id = setTimeout(() => {
        setAlert(null);
        setIsFadingOut(false);
      }, 4000);
      return () => {
        clearTimeout(fadeOutTimeout);
        clearTimeout(clearTimeout_id);
      };
    }
  }, [alert]);

  // ======================================================
  // Loading awal saat mengecek sesi
  // ======================================================
  if (!isInitialized) {
    return (
      <div className="login-container">
        <div className="login-card login-card--loading">
          <div className="initial-loader">
            <img src={Logo} alt="Logo" className="logo" />
            <LoaderMain variant="default" size={180} />
            <p className="initial-loader-text">Checking your connection...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="logo-wrapper">
          <img src={Logo} alt="Logo" className="logo" />
        </div>
        <h2>
          <span className="highlight"> CONTENT</span> MANAGEMENT SYSTEM
        </h2>
        <h3>PT ENERKOMP PERSADA RAYA</h3>
        <p className="sub-text">Please sign in to your account</p>

        <div className="section-input">
          <div>
            <label className="label-input" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              placeholder="Enter Your Email"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div className="section-input-password">
            <label className="label-input" htmlFor="password">
              Password
            </label>
            <div className="input-password">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                required
                placeholder="Enter Your Password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
              <span
                onClick={() => !isLoading && setShowPassword(!showPassword)}
                style={{ cursor: isLoading ? "not-allowed" : "pointer" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>
            <NavLink to="/forgot-password" className={"forgot-password"}>
              Forgot Password?
            </NavLink>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`login-button ${isLoading ? "loading" : ""}`}
        >
          {isLoading ? (
            <div className="login-button-loading">
              <PulseDots size="sm" color="#fff" count={6} />
            </div>
          ) : (
            "Sign In"
          )}
        </button>

        {alert && (
          <div className="alert-overlay">
            <div
              className={`alert ${alert.type} ${
                isFadingOut ? "fade-out" : "fade-in"
              }`}
            >
              <span>{alert.message}</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}