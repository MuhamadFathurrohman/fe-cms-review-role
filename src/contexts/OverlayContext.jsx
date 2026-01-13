/**
 * @file OverlayContext.jsx
 * @description Context React untuk mengelola sistem overlay UI dinamis.
 * Mendukung berbagai jenis overlay:
 * - Tooltip ekspansi (untuk sidebar collapsed)
 * - Submenu overlay (untuk navigasi saat collapsed)
 * - Tooltip email
 * - Loader overlay aplikasi
 *
 * Menggunakan Map untuk manajemen state overlay dan z-index dinamis
 * untuk memastikan tumpukan overlay yang benar.
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import LoaderMain from "../components/Loaders/LoaderMain";

/**
 * Context React untuk sistem overlay.
 * @type {React.Context<Object | undefined>}
 */
const OverlayContext = createContext();

/**
 * Enum tipe overlay yang didukung oleh sistem.
 * Digunakan untuk menentukan komponen renderer dan z-index dasar.
 * @enum {string}
 */
export const OVERLAY_TYPES = {
  EXPANDING_LABEL: "expanding-label",
  SUBMENU_OVERLAY: "submenu-overlay",
  SUBMENU_REGULAR: "submenu-regular",
  EMAIL_TOOLTIP: "email-tooltip",
  LOADER_OVERLAY: "loader-overlay",
};

/**
 * Nilai z-index dasar untuk setiap tipe overlay.
 * Digunakan untuk menghitung z-index akhir dengan offset urutan.
 * @type {{ [key in keyof typeof OVERLAY_TYPES]: number }}
 */
const Z_INDEX_BASE = {
  EXPANDING_LABEL: 1000,
  SUBMENU_OVERLAY: 1100,
  SUBMENU_REGULAR: 900,
  LOADER_OVERLAY: 9999,
};

/**
 * Komponen overlay tooltip email.
 * Menampilkan alamat email dalam tooltip yang diposisikan di atas elemen target.
 *
 * @param {{ overlay: Object }} props - Props komponen
 * @param {Object} props.overlay - Konfigurasi overlay
 * @param {string} props.overlay.id - ID unik overlay
 * @param {string} props.overlay.type - Tipe overlay
 * @param {Object} props.overlay.position - Posisi absolut (top, left)
 * @param {number} props.overlay.zIndex - Z-index untuk stacking
 * @param {Object} props.overlay.content - Konten overlay
 * @param {string} props.overlay.content.email - Alamat email yang ditampilkan
 * @returns {JSX.Element} Komponen tooltip email
 */
const EmailTooltipOverlay = ({ overlay }) => (
  <div
    className="email-tooltip-overlay"
    data-overlay-id={overlay.id}
    data-overlay-type={overlay.type}
    style={{
      position: "fixed",
      top: `${overlay.position.top}px`,
      left: `${overlay.position.left}px`,
      zIndex: overlay.zIndex,
      transform: "translate(-50%, -100%)",
      marginTop: "-8px",
    }}
  >
    <div className="email-tooltip">
      <span className="tooltip-text">{overlay.content.email}</span>
    </div>
  </div>
);

/**
 * Komponen overlay label ekspansi.
 * Menampilkan label teks saat pengguna mengarahkan kursor ke ikon menu collapsed.
 *
 * @param {{ overlay: Object }} props - Props komponen
 * @param {Object} props.overlay - Konfigurasi overlay
 * @param {string} props.overlay.id - ID unik overlay
 * @param {string} props.overlay.type - Tipe overlay
 * @param {Object} props.overlay.position - Posisi absolut
 * @param {number} props.overlay.zIndex - Z-index untuk stacking
 * @param {Object} props.overlay.content - Konten overlay
 * @param {string} props.overlay.content.label - Teks label yang ditampilkan
 * @returns {JSX.Element} Komponen label ekspansi
 */
const ExpandingLabelOverlay = ({ overlay }) => (
  <div
    className="expanding-label-overlay"
    data-overlay-id={overlay.id}
    data-overlay-type={overlay.type}
    style={{
      position: "fixed",
      top: `${overlay.position.top}px`,
      left: `${overlay.position.left}px`,
      zIndex: overlay.zIndex,
    }}
  >
    <div className="expanding-label">
      <span className="label-text">{overlay.content.label}</span>
    </div>
  </div>
);

/**
 * Komponen overlay submenu.
 * Menampilkan daftar submenu sebagai overlay saat sidebar dalam mode collapsed.
 *
 * @param {{ overlay: Object, onSubmenuClick: Function }} props - Props komponen
 * @param {Object} props.overlay - Konfigurasi overlay
 * @param {string} props.overlay.id - ID unik overlay
 * @param {string} props.overlay.type - Tipe overlay
 * @param {Object} props.overlay.position - Posisi absolut
 * @param {number} props.overlay.zIndex - Z-index untuk stacking
 * @param {Function} props.overlay.onMouseEnter - Handler mouse enter
 * @param {Function} props.overlay.onMouseLeave - Handler mouse leave
 * @param {Object} props.overlay.content - Konten overlay
 * @param {Array} props.overlay.content.submenuItems - Daftar item submenu
 * @param {Function} props.onSubmenuClick - Handler klik pada item submenu
 * @returns {JSX.Element} Komponen overlay submenu
 */
const SubmenuOverlayComponent = ({ overlay, onSubmenuClick }) => (
  <div
    className="submenu-overlay-container"
    data-overlay-id={overlay.id}
    data-overlay-type={overlay.type}
    style={{
      position: "fixed",
      top: `${overlay.position.top}px`,
      left: `${overlay.position.left}px`,
      zIndex: overlay.zIndex,
    }}
    onMouseEnter={overlay.onMouseEnter}
    onMouseLeave={overlay.onMouseLeave}
  >
    <ul className="submenu-list submenu-overlay">
      {overlay.content.submenuItems.map((subItem) => (
        <li key={subItem.id} className="submenu-item">
          <NavLink
            to={subItem.path}
            className={({ isActive }) =>
              `submenu-link ${isActive ? "active" : ""}`
            }
            onClick={onSubmenuClick}
          >
            <span className="submenu-label">{subItem.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Komponen overlay loader aplikasi.
 * Menampilkan indikator loading penuh layar.
 *
 * @param {{ overlay: Object }} props - Props komponen
 * @param {Object} props.overlay - Konfigurasi overlay
 * @returns {JSX.Element} Komponen loader overlay
 */
const LoaderOverlay = ({ overlay }) => (
  <div
    className="loader-overlay"
    data-overlay-id={overlay.id}
    data-overlay-type={overlay.type}
  >
    <LoaderMain variant="light" size={180} />
  </div>
);

/**
 * Renderer utama untuk semua overlay.
 * Memilih komponen yang sesuai berdasarkan tipe overlay.
 *
 * @param {{ overlays: Array<Object>, onSubmenuClick: Function }} props - Props komponen
 * @param {Array<Object>} props.overlays - Daftar overlay yang aktif
 * @param {Function} props.onSubmenuClick - Handler klik submenu
 * @returns {JSX.Element} Kumpulan komponen overlay
 */
const OverlayRenderer = ({ overlays, onSubmenuClick }) => {
  return (
    <>
      {overlays.map((overlay) => {
        switch (overlay.type) {
          case OVERLAY_TYPES.EXPANDING_LABEL:
            return <ExpandingLabelOverlay key={overlay.id} overlay={overlay} />;

          case OVERLAY_TYPES.SUBMENU_OVERLAY:
            return (
              <SubmenuOverlayComponent
                key={overlay.id}
                overlay={overlay}
                onSubmenuClick={onSubmenuClick}
              />
            );

          case OVERLAY_TYPES.EMAIL_TOOLTIP:
            return <EmailTooltipOverlay key={overlay.id} overlay={overlay} />;

          case OVERLAY_TYPES.LOADER_OVERLAY:
            return <LoaderOverlay key={overlay.id} overlay={overlay} />;

          default:
            return null;
        }
      })}
    </>
  );
};

/**
 * Provider komponen untuk OverlayContext.
 * Mengelola state overlay dan menyediakan fungsi kontrol.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Komponen anak
 * @param {Function} [props.onSubmenuClick] - Handler klik global untuk submenu
 * @returns {JSX.Element}
 */
export const OverlayProvider = ({ children, onSubmenuClick }) => {
  /**
   * State overlay menggunakan Map untuk akses O(1) dan urutan penyisipan.
   * @type {[Map<string, Object>, React.Dispatch<React.SetStateAction<Map<string, Object>>>]}
   */
  const [overlays, setOverlays] = useState(new Map());

  /**
   * Menampilkan overlay baru dengan konfigurasi tertentu.
   * Secara otomatis menghitung z-index berdasarkan tipe dan urutan.
   *
   * @param {string} id - ID unik overlay
   * @param {Object} config - Konfigurasi overlay
   * @param {string} config.type - Tipe overlay (harus sesuai OVERLAY_TYPES)
   * @param {Object} config.position - Posisi absolut (opsional untuk beberapa tipe)
   * @param {Object} config.content - Konten overlay
   */
  const showOverlay = useCallback((id, config) => {
    setOverlays((prev) => {
      const newMap = new Map(prev);

      // Auto assign z-index based on type
      const zIndexKey = config.type.toUpperCase().replace("-", "_");
      const baseZIndex = Z_INDEX_BASE[zIndexKey] || 1000;
      const zIndex = baseZIndex + newMap.size;

      newMap.set(id, {
        id,
        zIndex,
        createdAt: Date.now(),
        ...config,
      });

      return newMap;
    });
  }, []);

  /**
   * Menyembunyikan overlay berdasarkan ID.
   *
   * @param {string} id - ID overlay yang akan disembunyikan
   */
  const hideOverlay = useCallback((id) => {
    setOverlays((prev) => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  /**
   * Membersihkan semua overlay yang sedang aktif.
   */
  const clearAllOverlays = useCallback(() => {
    setOverlays(new Map());
  }, []);

  /** @type {Object} Nilai context yang disediakan ke aplikasi */
  const contextValue = {
    overlays: Array.from(overlays.values()),
    showOverlay,
    hideOverlay,
    clearAllOverlays,
  };

  return (
    <OverlayContext.Provider value={contextValue}>
      {children}
      <OverlayRenderer
        overlays={Array.from(overlays.values())}
        onSubmenuClick={onSubmenuClick}
      />
    </OverlayContext.Provider>
  );
};

/**
 * Hook custom untuk mengakses sistem overlay dari OverlayContext.
 * Harus digunakan di dalam komponen yang dibungkus oleh `<OverlayProvider>`.
 *
 * @returns {{
 *   overlays: Array<Object>,
 *   showOverlay: (id: string, config: Object) => void,
 *   hideOverlay: (id: string) => void,
 *   clearAllOverlays: () => void
 * }} Objek berisi state dan fungsi overlay
 * @throws {Error} Jika digunakan di luar OverlayProvider
 *
 * @example
 * const { showOverlay, hideOverlay } = useOverlay();
 * 
 * // Tampilkan tooltip
 * showOverlay('user-email', {
 *   type: OVERLAY_TYPES.EMAIL_TOOLTIP,
 *   position: { top: 100, left: 200 },
 *   content: { email: 'user@example.com' }
 * });
 */
export const useOverlay = () => {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error("useOverlay must be used within an OverlayProvider");
  }
  return context;
};