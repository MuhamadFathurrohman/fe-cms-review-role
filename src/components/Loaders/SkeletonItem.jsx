/**
 * @file SkeletonItem.jsx
 * @description Komponen skeleton loader dasar untuk menampilkan placeholder loading.
 * Menggunakan efek shimmer/gradient animasi untuk memberikan indikasi visual bahwa
 * konten sedang dimuat. Dapat digunakan sebagai:
 * - Elemen placeholder tunggal
 * - Container untuk konten skeleton kustom
 * 
 * Dirancang untuk menjadi building block dasar sistem loading skeleton aplikasi.
 */

import React from "react";
import "../../sass/components/Loader/SkeletonItem/SkeletonItem.css";

/**
 * Props untuk komponen SkeletonItem.
 * @typedef {Object} SkeletonItemProps
 * @property {string} [className=''] - Kelas CSS tambahan untuk kustomisasi styling
 * @property {Object} [style={}] - Gaya inline tambahan untuk penyesuaian spesifik
 * @property {React.ReactNode} [children] - Konten opsional untuk membuat container skeleton
 */

/**
 * Komponen skeleton loader dasar dengan efek shimmer animasi.
 * Dapat digunakan sebagai elemen placeholder tunggal atau sebagai container
 * untuk struktur skeleton yang lebih kompleks.
 *
 * @component
 * @param {SkeletonItemProps} props - Props komponen
 * @returns {JSX.Element} Elemen skeleton dengan efek shimmer
 *
 * @example
 * // Placeholder elemen tunggal
 * <SkeletonItem className="skeleton-avatar" />
 * 
 * @example
 * // Container untuk struktur skeleton kompleks
 * <SkeletonItem>
 *   <div className="skeleton-line skeleton-line--large" />
 *   <div className="skeleton-line skeleton-line--medium" />
 *   <div className="skeleton-line skeleton-line--small" />
 * </SkeletonItem>
 */
const SkeletonItem = ({ className = "", style, children }) => {
  const baseClass = "skeleton-item";

  // Jika ada children, gunakan sebagai container shimmer
  if (children) {
    return (
      <div className={`${baseClass} ${className}`} style={style}>
        {children}
      </div>
    );
  }

  // Jika tidak ada children, jadikan elemen dasar
  return <div className={`${baseClass} ${className}`} style={style} />;
};

export default SkeletonItem;