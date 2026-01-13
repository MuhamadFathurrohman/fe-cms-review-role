/**
 * @file AuthContext.jsx
 * @description Menyediakan manajemen autentikasi global menggunakan React Context dan useReducer.
 * Mengelola status login, sesi pengguna, refresh token otomatis, dan penanganan kedaluwarsa sesi.
 * Terintegrasi dengan sistem session timer dari `api.js`.
 */

import React, { createContext, useContext, useReducer, useEffect } from "react";
import {
  apiClientNoHeaders,
  onSessionExpired,
  onSessionExpiredTooLong,
  resetSessionExpiredFlag,
  triggerSessionRefreshed,
  setAccessTokenExpiry,
  resetAccessTokenExpiry,
  canStillExtendSession,
  getMinutesSinceExpired,
} from "../services/api";

/**
 * @typedef {Object} User
 * @property {number} id - ID pengguna
 * @property {string} email - Email pengguna
 * @property {string} name - Nama lengkap
 * @property {string} roleName - Nama peran (misal: "admin", "editor")
 * @property {Array<{resource: string, access: string}>} permissions - Daftar izin akses
 * @property {Object} role - Objek peran asli dari backend
 */

/**
 * @typedef {Object} AuthState
 * @property {User | null} user - Data pengguna saat ini, atau null jika belum login
 * @property {string | null} token - Token autentikasi (saat ini tidak digunakan karena cookie-based)
 * @property {boolean} isAuthenticated - Status apakah pengguna sudah diautentikasi
 * @property {boolean} loading - Status sedang memuat (misal: saat login/check sesi)
 * @property {string | null} error - Pesan error terakhir, atau null
 * @property {boolean} isInitialized - Apakah pengecekan sesi awal sudah selesai
 * @property {boolean} sessionExpired - Apakah sesi telah habis (bisa diperpanjang)
 * @property {boolean} sessionExpiredTooLong - Apakah sesi habis terlalu lama (>15 menit), tidak bisa diperpanjang
 */

/** @type {AuthState} */
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isInitialized: false,
  sessionExpired: false,
  sessionExpiredTooLong: false,
};

/**
 * @constant {Object<string, string>} AUTH_ACTIONS
 * @description Kumpulan tipe aksi untuk reducer autentikasi.
 */
const AUTH_ACTIONS = {
  LOGIN_START: "LOGIN_START",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",
  CLEAR_ERROR: "CLEAR_ERROR",
  RESTORE_SESSION: "RESTORE_SESSION",
  SET_INITIALIZED: "SET_INITIALIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  CLEAR_SESSION_EXPIRED: "CLEAR_SESSION_EXPIRED",
  SESSION_EXPIRED_TOO_LONG: "SESSION_EXPIRED_TOO_LONG",
  UPDATE_USER: "UPDATE_USER",
};

/**
 * Reducer untuk mengelola perubahan state autentikasi.
 * @param {AuthState} state - State saat ini
 * @param {{ type: string, payload?: any }} action - Aksi yang dipicu
 * @returns {AuthState} State baru setelah aksi diterapkan
 */
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return { ...state, loading: true, error: null };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null,
        sessionExpired: false,
        sessionExpiredTooLong: false,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload.message,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        isInitialized: true,
        sessionExpired: false,
        sessionExpiredTooLong: false,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    case AUTH_ACTIONS.RESTORE_SESSION:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        sessionExpired: false,
        sessionExpiredTooLong: false,
      };

    case AUTH_ACTIONS.SET_INITIALIZED:
      return { ...state, isInitialized: true, loading: false };

    case AUTH_ACTIONS.SESSION_EXPIRED:
      return { ...state, sessionExpired: true };

    case AUTH_ACTIONS.CLEAR_SESSION_EXPIRED:
      return { ...state, sessionExpired: false, sessionExpiredTooLong: false };

    case AUTH_ACTIONS.SESSION_EXPIRED_TOO_LONG:
      return { ...state, sessionExpiredTooLong: true };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload,
        },
      };

    default:
      return state;
  }
};

/**
 * Context React untuk menyediakan state dan fungsi autentikasi ke seluruh aplikasi.
 * @type {React.Context<AuthContextValue | undefined>}
 */
const AuthContext = createContext();

/**
 * @typedef {Object} AuthContextValue
 * @property {User | null} user
 * @property {string | null} token
 * @property {boolean} isAuthenticated
 * @property {boolean} loading
 * @property {string | null} error
 * @property {boolean} isInitialized
 * @property {boolean} sessionExpired
 * @property {boolean} sessionExpiredTooLong
 * @property {(credentials: {email: string, password: string}) => Promise<{success: boolean, message?: string, data?: {user: User}}>} login
 * @property {() => Promise<void>} logout
 * @property {() => void} clearError
 * @property {() => Promise<void>} extendSession
 * @property {(updatedData: Partial<User>) => void} updateUser
 */

/**
 * Provider komponen untuk membungkus aplikasi dengan konteks autentikasi.
 * Menginisialisasi sesi, menangani login/logout, dan merespons kedaluwarsa sesi.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Komponen anak yang akan menerima konteks
 * @returns {JSX.Element}
 */
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ======================================================
  // Listener: Sesi Habis
  // ======================================================
  useEffect(() => {
    const handleExpired = () => {
      dispatch({ type: AUTH_ACTIONS.SESSION_EXPIRED });
    };

    const unsub = onSessionExpired(handleExpired);
    return () => unsub();
  }, []);

  // ======================================================
  // Listener: Sesi Habis Terlalu Lama
  // ======================================================
  useEffect(() => {
    const handleTooLong = () => {
      dispatch({ type: AUTH_ACTIONS.SESSION_EXPIRED_TOO_LONG });
    };

    const unsub = onSessionExpiredTooLong(handleTooLong);
    return () => unsub();
  }, []);

  // ======================================================
  // Listener: Perubahan Visibilitas Tab (Backup Check)
  // ======================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        state.sessionExpired &&
        !state.sessionExpiredTooLong
      ) {
        const minutesSinceExpired = getMinutesSinceExpired();

        if (minutesSinceExpired > 15) {
          dispatch({ type: AUTH_ACTIONS.SESSION_EXPIRED_TOO_LONG });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [state.sessionExpired, state.sessionExpiredTooLong]);

  /**
   * Memperpanjang sesi pengguna dengan memanggil endpoint `/auth/refresh` dan `/auth/me`.
   * Hanya bisa dipanggil jika sesi belum melebihi batas idle (15 menit).
   * @async
   * @returns {Promise<void>}
   */
  const extendSession = async () => {
    try {
      if (!canStillExtendSession(15)) {
        dispatch({ type: AUTH_ACTIONS.SESSION_EXPIRED_TOO_LONG });
        return;
      }

      await apiClientNoHeaders.post("/auth/refresh");

      const meResponse = await apiClientNoHeaders.get("/auth/me");
      const user = meResponse.data;

      const permissions = user.role?.permissions || [];
      const formattedPermissions = permissions.map((p) => ({
        resource: p.resource,
        access: p.action,
      }));

      const userData = {
        ...user,
        permissions: formattedPermissions,
        roleName: user.role?.name || "user",
      };

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { token: null, user: userData },
      });

      dispatch({ type: AUTH_ACTIONS.CLEAR_SESSION_EXPIRED });
      resetSessionExpiredFlag();
      setAccessTokenExpiry(15 * 60 * 1000);
      triggerSessionRefreshed();
    } catch (err) {
      console.error("Failed to extend session:", err);
      dispatch({ type: AUTH_ACTIONS.SESSION_EXPIRED_TOO_LONG });
    }
  };

  // ======================================================
  // Inisialisasi Awal: Cek Sesi Saat Aplikasi Dimuat
  // ======================================================
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await apiClientNoHeaders.get("/auth/me");
        const user = response.data;

        const permissions = user.role?.permissions || [];
        const formattedPermissions = permissions.map((p) => ({
          resource: p.resource,
          access: p.action,
        }));

        const userData = {
          ...user,
          permissions: formattedPermissions,
          roleName: user.role?.name || "user",
        };

        dispatch({
          type: AUTH_ACTIONS.RESTORE_SESSION,
          payload: { user: userData, token: null },
        });

        setAccessTokenExpiry(15 * 60 * 1000);
      } catch (error) {
        // No active session — tetap lanjutkan
      } finally {
        dispatch({ type: AUTH_ACTIONS.SET_INITIALIZED });
      }
    };

    restoreSession();
  }, []);

  /**
   * Melakukan proses login pengguna.
   * @async
   * @param {{ email: string, password: string }} credentials - Kredensial login
   * @returns {Promise<{ success: boolean, message?: string, data?: { user: User } }>}
   */
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      await apiClientNoHeaders.post("/auth/login", credentials);

      const meResponse = await apiClientNoHeaders.get("/auth/me");
      const user = meResponse.data;

      const permissions = user.role?.permissions || [];
      const formattedPermissions = permissions.map((p) => ({
        resource: p.resource,
        access: p.action,
      }));

      const userData = {
        ...user,
        permissions: formattedPermissions,
        roleName: user.role?.name || "user",
      };

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { token: null, user: userData },
      });

      resetSessionExpiredFlag();
      setAccessTokenExpiry(15 * 60 * 1000);

      return { success: true, data: { user: userData } };
    } catch (err) {
      let message = "Login failed";
      if (err.response?.status === 401) {
        message = "Email or password is incorrect";
      }

      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: { message } });
      return { success: false, message };
    }
  };

  /**
   * Melakukan logout pengguna dan membersihkan sesi.
   * @async
   * @returns {Promise<void>}
   */
  const logout = async () => {
    try {
      await apiClientNoHeaders.post("/auth/logout");
    } catch (err) {
      console.error("Logout endpoint failed:", err);
    }

    resetSessionExpiredFlag();
    resetAccessTokenExpiry();

    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    dispatch({ type: AUTH_ACTIONS.CLEAR_SESSION_EXPIRED });
  };

  /**
   * Membersihkan pesan error autentikasi saat ini.
   */
  const clearError = () => dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

  /**
   * Memperbarui data pengguna di state (misal: setelah update profil).
   * @param {Partial<User>} updatedUserData - Data pengguna yang diperbarui
   */
  const updateUser = (updatedUserData) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: updatedUserData,
    });
  };

  /** @type {AuthContextValue} */
  const value = {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    isInitialized: state.isInitialized,
    sessionExpired: state.sessionExpired,
    sessionExpiredTooLong: state.sessionExpiredTooLong,
    login,
    logout,
    clearError,
    extendSession,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook custom untuk mengakses state dan fungsi autentikasi dari AuthContext.
 * Harus digunakan di dalam komponen yang dibungkus oleh `<AuthProvider>`.
 *
 * @returns {AuthContextValue} Objek berisi state dan fungsi autentikasi
 * @throws {Error} Jika digunakan di luar AuthProvider
 *
 * @example
 * const { user, login, isAuthenticated } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};