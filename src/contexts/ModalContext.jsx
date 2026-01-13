/**
 * @file ModalContext.jsx
 * @description Context React untuk mengelola sistem modal global aplikasi.
 * Memungkinkan pembukaan dan penutupan modal dari mana saja dalam aplikasi
 * tanpa perlu prop drilling atau state management kompleks.
 * 
 * Menggunakan pendekatan stack-based di mana beberapa modal dapat ditumpuk,
 * dan setiap modal diidentifikasi oleh key unik.
 */

import React, { createContext, useContext, useState } from "react";
import { ModalRenderer } from "../components/Modals/Modal";

/**
 * Context React untuk sistem modal global.
 * @type {React.Context<Object | undefined>}
 */
const ModalContext = createContext();

/**
 * Hook custom untuk mengakses sistem modal dari ModalContext.
 * Harus digunakan di dalam komponen yang dibungkus oleh `<ModalProvider>`.
 *
 * @returns {{
 *   openModal: (key: string, content: React.ReactNode, size?: 'small'|'medium'|'large', className?: string) => void,
 *   closeModal: (key: string) => void
 * }} Objek berisi fungsi kontrol modal
 * @throws {Error} Jika digunakan di luar ModalProvider
 *
 * @example
 * const { openModal, closeModal } = useModalContext();
 * 
 * // Buka modal
 * openModal('userProfile', <UserProfileModal />, 'large');
 * 
 * // Tutup modal
 * closeModal('userProfile');
 */
export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalContext must be used within ModalProvider");
  }
  return context;
};

/**
 * Provider komponen untuk ModalContext.
 * Mengelola state stack modal dan menyediakan fungsi kontrol.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Komponen anak yang akan menerima context
 * @returns {JSX.Element}
 */
export const ModalProvider = ({ children }) => {
  /**
   * Stack modal yang sedang aktif.
   * Setiap modal memiliki key unik untuk identifikasi.
   * @type {[Array<{ key: string, content: React.ReactNode, size: string, className: string }>, React.Dispatch<React.SetStateAction<...>>]}
   */
  const [modals, setModals] = useState([]);

  /**
   * Membuka modal baru dan menambahkannya ke stack.
   * Modal akan ditampilkan di atas modal lain jika sudah ada.
   *
   * @param {string} key - Kunci unik untuk mengidentifikasi modal
   * @param {React.ReactNode} content - Konten modal (biasanya komponen React)
   * @param {'small'|'medium'|'large'} [size='medium'] - Ukuran modal
   * @param {string} [className=''] - Kelas CSS tambahan
   */
  const openModal = (key, content, size = "medium", className = "") => {
    setModals((prev) => [...prev, { key, content, size, className }]);
  };

  /**
   * Menutup modal berdasarkan kunci unik.
   * Menghapus modal dari stack tanpa memengaruhi modal lain.
   *
   * @param {string} key - Kunci unik modal yang akan ditutup
   */
  const closeModal = (key) => {
    setModals((prev) => prev.filter((modal) => modal.key !== key));
  };

  /** @type {Object} Nilai context yang disediakan ke aplikasi */
  const value = {
    openModal,
    closeModal,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      <ModalRenderer modals={modals} closeModal={closeModal} />
    </ModalContext.Provider>
  );
};