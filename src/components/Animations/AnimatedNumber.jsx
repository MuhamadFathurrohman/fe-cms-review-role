/**
 * @file AnimatedNumber.jsx
 * @description Komponen animasi angka yang menampilkan transisi halus dari 0 ke nilai target.
 * Menggunakan algoritma easing `easeOutExpo` untuk efek animasi yang natural dan profesional.
 * Ideal untuk menampilkan statistik, metrik, atau angka yang berubah secara dinamis.
 * 
 * Animasi menggunakan `requestAnimationFrame` untuk performa optimal dan sinkronisasi dengan refresh rate layar.
 */

import React, { useEffect, useState, useRef } from "react";
import "../../sass/components/Animations/AnimatedNumber/AnimatedNumber.css";

/**
 * Fungsi easing exponential out untuk animasi smooth.
 * Memberikan efek percepatan awal yang cepat dan perlambatan halus di akhir.
 * 
 * @param {number} t - Progress animasi (0.0 hingga 1.0)
 * @returns {number} Nilai eased progress
 */
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Props untuk komponen AnimatedNumber.
 * @typedef {Object} AnimatedNumberProps
 * @property {number} [value=0] - Nilai target yang akan dianimasikan
 * @property {number} [duration=1000] - Durasi animasi dalam milidetik
 * @property {number} [delay=0] - Delay sebelum animasi dimulai dalam milidetik
 * @property {string} [className=''] - Kelas CSS tambahan untuk styling
 * @property {function(number): string} [formatter] - Fungsi kustom untuk memformat angka
 */

/**
 * Komponen animasi angka dengan transisi smooth dari 0 ke nilai target.
 * Mendukung formatter kustom dan penanganan error untuk input tidak valid.
 *
 * @component
 * @param {AnimatedNumberProps} props - Props komponen
 * @returns {JSX.Element} Span dengan angka yang dianimasikan
 *
 * @example
 * // Angka dasar dengan format Indonesia
 * <AnimatedNumber value={1500} duration={1500} />
 * 
 * @example
 * // Dengan formatter kustom (persentase)
 * <AnimatedNumber 
 *   value={85.5} 
 *   formatter={(val) => `${val.toFixed(1)}%`} 
 * />
 * 
 * @example
 * // Dengan delay dan durasi kustom
 * <AnimatedNumber 
 *   value={12345} 
 *   duration={2000} 
 *   delay={500}
 *   className="stat-number"
 * />
 */
const AnimatedNumber = ({
  value = 0,
  duration = 1000,
  delay = 0,
  className = "",
  formatter,
}) => {
  /**
   * Nilai yang sedang ditampilkan selama animasi.
   * @type {[number, React.Dispatch<React.SetStateAction<number>>]}
   */
  const [displayValue, setDisplayValue] = useState(0);

  /** @type {React.MutableRefObject<number>} Ref untuk requestAnimationFrame */
  const requestRef = useRef();

  /** @type {React.MutableRefObject<number>} Ref untuk timestamp awal animasi */
  const startTimeRef = useRef();

  /**
   * Fungsi animasi utama yang dijalankan setiap frame.
   * Menghitung progress animasi dan memperbarui nilai tampilan.
   * 
   * @param {number} timestamp - Timestamp saat ini dari requestAnimationFrame
   */
  const animate = (timestamp) => {
    if (!startTimeRef.current) {
      // Tambahkan delay ke startTime
      startTimeRef.current = timestamp + delay;
      return (requestRef.current = requestAnimationFrame(animate));
    }

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutExpo(progress);
    const currentValue = value * easedProgress;

    setDisplayValue(currentValue);

    if (progress < 1) {
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  // Validasi input dan inisialisasi animasi
  useEffect(() => {
    // Validasi input
    if (typeof value !== "number" || isNaN(value) || value < 0) {
      setDisplayValue(0);
      return;
    }

    // Reset dan mulai animasi
    startTimeRef.current = null;

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [value, duration, delay]);

  // Format nilai akhir
  /**
   * Nilai yang telah diformat untuk ditampilkan.
   * Menggunakan formatter kustom jika disediakan, atau format angka Indonesia default.
   * @type {string}
   */
  const formattedValue = formatter
    ? formatter(displayValue)
    : Math.round(displayValue).toLocaleString("id-ID");

  return (
    <span className={`animated-number ${className}`}>{formattedValue}</span>
  );
};

export default AnimatedNumber;