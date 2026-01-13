/**
 * @file LoaderMain.jsx
 * @description Komponen loader animasi SVG untuk menampilkan indikator loading.
 * Menggunakan animasi SVG dengan empat lingkaran yang berputar secara sinkron.
 * Dirancang untuk dua konteks utama:
 * - `default`: Untuk loading awal aplikasi (warna gelap)
 * - `light`: Untuk loading di halaman utama (warna terang)
 * 
 * Ukuran loader dapat dikonfigurasi dan responsif terhadap kontainer parent.
 */

import React from "react";
import PropTypes from "prop-types";
import "../../sass/components/Loader/LoaderMain/LoaderMain.css";

/**
 * Props untuk komponen LoaderMain.
 * @typedef {Object} LoaderMainProps
 * @property {'default'|'light'} [variant='default'] - Variasi warna loader
 *   - `default`: Warna gelap (#2d4c52) untuk loading inisialisasi
 *   - `light`: Warna terang (#DDE4F3) untuk loading di halaman utama
 * @property {number} [size=180] - Ukuran loader dalam piksel (width dan height)
 */

/**
 * Komponen loader animasi SVG dengan empat lingkaran berputar.
 * Digunakan untuk menampilkan indikator loading saat data sedang dimuat.
 *
 * @component
 * @param {LoaderMainProps} props - Props komponen
 * @returns {JSX.Element} Loader SVG animasi
 *
 * @example
 * // Loader inisialisasi aplikasi
 * <LoaderMain variant="default" size={180} />
 * 
 * @example
 * // Loader di halaman utama
 * <LoaderMain variant="light" size={120} />
 */
const LoaderMain = ({ variant = "default", size = 180 }) => {
  return (
    <div className="loader-main">
      <svg
        viewBox="0 0 240 240"
        height={size}
        width={size}
        className="loader-main__svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Loading"
      >
        {/* Group semua lingkaran dan geser ke tengah */}
        <g transform="translate(120, 120)">
          <circle
            strokeLinecap="round"
            strokeDashoffset={-330}
            strokeDasharray="0 660"
            strokeWidth={10}
            fill="none"
            r={52.5}
            cy={0}
            cx={0}
            className={`loader-main__ring loader-main__ring--a loader-main__ring--${variant}`}
          />
          <circle
            strokeLinecap="round"
            strokeDashoffset={-110}
            strokeDasharray="0 220"
            strokeWidth={10}
            fill="none"
            r={17.5}
            cy={0}
            cx={0}
            className={`loader-main__ring loader-main__ring--b loader-main__ring--${variant}`}
          />
          <circle
            strokeLinecap="round"
            strokeDasharray="0 440"
            strokeWidth={10}
            fill="none"
            r={35}
            cy={0}
            cx={-25}
            className={`loader-main__ring loader-main__ring--c loader-main__ring--${variant}`}
          />
          <circle
            strokeLinecap="round"
            strokeDasharray="0 440"
            strokeWidth={10}
            fill="none"
            r={35}
            cy={0}
            cx={25}
            className={`loader-main__ring loader-main__ring--d loader-main__ring--${variant}`}
          />
        </g>
      </svg>
    </div>
  );
};

// Prop validation menggunakan PropTypes
LoaderMain.propTypes = {
  /**
   * Variasi warna loader sesuai konteks penggunaan.
   * @type {'default'|'light'}
   */
  variant: PropTypes.oneOf([
    "default", // #2d4c52 - For initialize loading
    "light", // #DDE4F3 - For main page loading
  ]),
  /**
   * Ukuran loader dalam piksel.
   * @type {number}
   */
  size: PropTypes.number,
};

export default LoaderMain;