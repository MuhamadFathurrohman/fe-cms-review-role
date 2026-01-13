/**
 * @file PulseDots.jsx
 * @description Komponen loader animasi berbasis CSS dengan titik-titik berdenyut.
 * Menampilkan urutan titik yang berdenyut secara berurutan dengan delay animasi.
 * Sangat ringan dan fleksibel untuk digunakan di berbagai konteks loading:
 * - Tombol loading
 * - Indikator status
 * - Loading inline dalam teks
 * 
 * Menggunakan CSS custom properties untuk kontrol warna dan kelas CSS untuk ukuran.
 */

import React from "react";
import "../../sass/components/Loader/PulseDots/PulseDots.css";

/**
 * Props untuk komponen PulseDots.
 * @typedef {Object} PulseDotsProps
 * @property {'sm'|'md'|'lg'} [size='md'] - Ukuran titik loading
 *   - `sm`: Sangat kecil (untuk teks inline)
 *   - `md`: Sedang (default, untuk tombol)
 *   - `lg`: Besar (untuk indikator utama)
 * @property {string} [color='currentColor'] - Warna titik, mendukung nilai CSS apa pun
 *   - `currentColor`: Mengikuti warna teks parent
 *   - `#hex`, `rgb()`, `var(--color)`: Nilai warna CSS custom
 * @property {number} [count=3] - Jumlah titik yang ditampilkan (minimal 1)
 * @property {string} [className=''] - Kelas CSS tambahan untuk kustomisasi lebih lanjut
 */

/**
 * Komponen loader animasi titik berdenyut dengan kontrol fleksibel.
 * Ideal untuk indikator loading ringan yang tidak mengganggu tata letak.
 *
 * @component
 * @param {PulseDotsProps} props - Props komponen
 * @returns {JSX.Element} Container titik animasi dengan styling CSS
 *
 * @example
 * // Loading di tombol
 * <button disabled>
 *   <PulseDots size="sm" color="#ffffff" count={5} />
 * </button>
 * 
 * @example
 * // Loading inline dalam teks
 * <p>Loading data <PulseDots size="sm" /></p>
 * 
 * @example
 * // Indikator loading utama
 * <PulseDots size="lg" color="var(--primary-color)" count={6} />
 */
const PulseDots = ({
  size = "md",
  color = "currentColor",
  count = 3,
  className = "",
}) => {
  /** @type {{[key: string]: string}} Mapping ukuran ke kelas CSS */
  const sizeClasses = {
    sm: "pulse-dots--sm",
    md: "pulse-dots--md",
    lg: "pulse-dots--lg",
  };

  // Buat array titik dinamis dengan delay animasi berurutan
  /**
   * Array elemen titik dengan delay animasi yang meningkat.
   * Setiap titik memiliki delay 0.2s lebih lama dari titik sebelumnya.
   * @type {JSX.Element[]}
   */
  const dots = Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className="pulse-dot"
      style={{
        animationDelay: `${i * 0.2}s`,
      }}
      aria-hidden="true"
    />
  ));

  return (
    <span
      className={`pulse-dots ${sizeClasses[size]} ${className}`}
      style={{ "--pulse-color": color }}
      aria-label="Loading"
      aria-live="polite"
      role="status"
    >
      {dots}
    </span>
  );
};

export default PulseDots;