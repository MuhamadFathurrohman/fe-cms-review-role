/**
 * @file Gallery.jsx
 * @description Komponen halaman galeri gambar dokumentasi.
 * Menyediakan antarmuka visual untuk melihat dan mengelola gambar galeri dalam format grid.
 * 
 * Fitur utama:
 * - Tampilan grid responsif dengan lazy loading
 * - Preview gambar dalam modal fullscreen
 * - Operasi CRUD (Create, Delete) dengan konfirmasi
 * - Pagination untuk navigasi koleksi besar
 * - Kontrol akses berbasis izin pengguna
 * 
 * Mengimplementasikan kontrol akses berbasis izin:
 * - Super admin: Akses penuh ke semua fitur
 * - Pengguna dengan izin "manage gallery": Akses CRUD
 * - Pengguna tanpa izin: Hanya bisa melihat galeri
 */

import React, { useMemo } from "react";
import {
  Eye,
  Image,
  Plus,
  // Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { galleryService } from "../../services/galleryService";
import { useModalContext } from "../../contexts/ModalContext";
import { useAutoRefetch } from "../../hooks/useAutoRefetch";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import Modal from "../../components/Modals/Modal";
import AlertModal from "../../components/Alerts/AlertModal";
import GalleryForm from "../../components/Modals/Form/GalleryForm";
import ImageViewerModal from "../../components/Modals/view/ImageViewerModal";
import SkeletonItem from "../../components/Loaders/SkeletonItem";
import { canManage, isSuperAdmin } from "../../utils/permissions";
import "../../sass/views/Gallery/Gallery.css";

/**
 * Komponen halaman galeri utama.
 * Menampilkan grid gambar galeri dengan fitur manajemen dan preview.
 *
 * @component
 */
const Gallery = () => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();

  /** @type {number} Jumlah item galeri per halaman */
  const itemsPerPage = 10;

  // Tambah parameter bypassCache
  /**
   * Hook pencarian dengan debouncing dan pagination untuk data galeri.
   * Meskipun galeri tidak mendukung pencarian teks, hook ini digunakan untuk
   * konsistensi pola dan dukungan pagination/cache control.
   */
  const {
    data: galleryItems,
    loading,
    error,
    currentPage,
    totalPages,
    goToPage,
    refresh,
  } = useDebouncedSearch(
    async (page, limit, _search, bypassCache = false) => {
      // Gallery tidak pakai search, tapi tetap terima parameter untuk konsistensi
      return await galleryService.getPaginated(page, limit, bypassCache);
    },
    1,
    itemsPerPage,
    0
  );

  // refreshWithPageValidation dengan bypassCache
  /**
   * Memperbarui data galeri dengan validasi halaman untuk mencegah out-of-bounds.
   * @async
   * @param {boolean} [bypassCache=false] - Apakah melewati cache browser
   */
  const refreshWithPageValidation = async (bypassCache = false) => {
    try {
      // Fetch halaman 1 dengan bypass cache
      const result = await galleryService.getPaginated(
        1,
        itemsPerPage,
        bypassCache
      );

      if (result.success) {
        const newTotalPages = result.pagination?.totalPages || 1;
        const targetPage = Math.min(currentPage, newTotalPages);

        if (targetPage === currentPage) {
          refresh(bypassCache);
        } else {
          goToPage(targetPage);
        }
      } else {
        refresh(bypassCache);
      }
    } catch (error) {
      console.error("Error in refreshWithPageValidation:", error);
      refresh(bypassCache);
    }
  };

  /**
   * Fungsi auto-refetch yang dipanggil setiap 30 detik.
   * Memperbarui data galeri secara otomatis.
   * @async
   */
  const handleAutoRefetch = async () => {
    try {
      await refreshWithPageValidation(true);
    } catch (error) {
      console.error("❌ Gallery.jsx: Auto-refetch failed:", error);
    }
  };

  useAutoRefetch(handleAutoRefetch);

  // === Permission Logic ===
  /**
   * Status apakah pengguna saat ini adalah super admin.
   * @type {boolean}
   */
  const isSuper = isSuperAdmin(currentUser);

  /**
   * Status apakah pengguna memiliki izin mengelola galeri.
   * @type {boolean}
   */
  const canManageGallery =
    isSuper || canManage(currentUser?.permissions, "gallery");

  /**
   * Handler untuk menutup banner error dan merefresh data.
   */
  const handleCloseError = () => {
    refresh();
  };

  /**
   * Membuka modal tambah galeri baru.
   * @param {React.MouseEvent} e - Event klik
   */
  const handleAddGallery = (e) => {
    if (!canManageGallery) return;
    e.stopPropagation();
    openModal(
      "add-gallery",
      <Modal
        title="Add New Gallery"
        showHeader={true}
        showCloseButton={true}
        onClose={() => closeModal("add-gallery")}
      >
        <GalleryForm
          onClose={() => closeModal("add-gallery")}
          onSuccess={() => {
            closeModal("add-gallery");
            refresh(); // Add tidak perlu bypass cache
          }}
        />
      </Modal>
    );
  };

  /**
   * Membuka modal preview gambar galeri.
   * @param {Object} item - Data item galeri
   * @param {React.MouseEvent} e - Event klik
   */
  const handleViewGallery = (item, e) => {
    e.stopPropagation();
    openModal(
      "view-gallery",
      <ImageViewerModal
        imageUrl={item.imageUrl}
        date={item.createdAtFormatted}
        alt={item.createdAtFormatted || "Gallery image"}
        onClose={() => closeModal("view-gallery")}
      />
    );
  };

  // const handleEditGallery = (item, e) => {
  //   if (!canManageGallery) return;
  //   e.stopPropagation();
  //   openModal(
  //     "edit-gallery",
  //     <Modal
  //       title="Edit Gallery"
  //       showHeader={true}
  //       showCloseButton={true}
  //       onClose={() => closeModal("edit-gallery")}
  //     >
  //       <GalleryForm
  //         item={item}
  //         onClose={() => closeModal("edit-gallery")}
  //         onSuccess={() => {
  //           closeModal("edit-gallery");
  //           refreshWithPageValidation(true);
  //         }}
  //       />
  //     </Modal>
  //   );
  // };

  /**
   * Membuka modal konfirmasi hapus item galeri.
   * @param {Object} item - Data item galeri yang akan dihapus
   * @param {React.MouseEvent} e - Event klik
   */
  const handleDeleteGallery = (item, e) => {
    if (!canManageGallery) return;
    e.stopPropagation();
    openModal(
      "deleteGalleryConfirm",
      <AlertModal
        type="delete"
        title="Delete Item?"
        message="Are you sure you want to delete this image? This action cannot be undone."
        showActions={true}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={async () => {
          closeModal("deleteGalleryConfirm");
          try {
            const result = await galleryService.hardDelete(
              item.id,
              currentUser.id
            );
            if (result.success) {
              openModal(
                "deleteSuccessAlert",
                <AlertModal
                  type="success"
                  title="Deleted!"
                  message="Image has been successfully deleted."
                  onClose={() => {
                    closeModal("deleteSuccessAlert");
                    refreshWithPageValidation(true);
                  }}
                />,
                "small"
              );
            } else {
              openModal(
                "deleteErrorAlert",
                <AlertModal
                  type="error"
                  title="Error"
                  message="Failed to delete image."
                  onClose={() => closeModal("deleteErrorAlert")}
                />,
                "small"
              );
            }
          } catch (err) {
            openModal(
              "deleteErrorAlert",
              <AlertModal
                type="error"
                title="Error"
                message="An error occurred while deleting image."
                onClose={() => closeModal("deleteErrorAlert")}
              />,
              "small"
            );
          }
        }}
        onCancel={() => closeModal("deleteGalleryConfirm")}
      />,
      "small"
    );
  };

  /** @type {number[]} Daftar nomor halaman untuk ditampilkan */
  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages]);

  return (
    <div className="page-gallery">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <Image size={28} /> Gallery
          </h1>
          <p>View and manage all documentation images in a visual gallery</p>
        </div>
        {canManageGallery && (
          <button className="btn-primary" onClick={handleAddGallery}>
            <Plus size={18} /> Add New Gallery
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button
            className="error-banner-close"
            onClick={handleCloseError}
            aria-label="Close error banner"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="gallery-container">
        {loading ? (
          <div className="gallery-grid">
            {[...Array(itemsPerPage)].map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="gallery-item skeleton-loading"
              >
                <div className="gallery-image-wrapper">
                  <SkeletonItem
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "12px 12px 0 0",
                    }}
                  />
                </div>
                <div className="gallery-info">
                  <div className="gallery-meta">
                    <div className="skeleton-date">
                      <SkeletonItem
                        type="default"
                        style={{
                          width: "100px",
                          height: "14px",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : Array.isArray(galleryItems) && galleryItems.length > 0 ? (
          <>
            <div className="gallery-grid">
              {galleryItems.map((item) => (
                <div key={item.id} className="gallery-item">
                  <div className="gallery-image-wrapper">
                    {item.image ? (
                      <img
                        src={item.imageUrl}
                        className="gallery-image"
                        loading="lazy"
                        alt={item.createdAtFormatted || "Gallery image"}
                        aria-label={`Gallery image from ${item.createdAtFormatted}`}
                      />
                    ) : (
                      <div className="gallery-placeholder">
                        <Image size={48} />
                        <span>No Image</span>
                      </div>
                    )}

                    <div className="gallery-overlay">
                      <div className="gallery-actions">
                        <button
                          className="gallery-action-btn view-btn"
                          title="View details"
                          onClick={(e) => handleViewGallery(item, e)}
                          aria-label="View gallery image"
                        >
                          <Eye size={16} />
                        </button>

                        {canManageGallery && (
                          <>
                            {/* <button
                              className="gallery-action-btn edit-btn"
                              title="Edit gallery"
                              onClick={(e) => handleEditGallery(item, e)}
                            >
                              <Edit2 size={16} />
                            </button> */}
                            <button
                              className="gallery-action-btn delete-btn"
                              title="Delete gallery"
                              onClick={(e) => handleDeleteGallery(item, e)}
                              aria-label="Delete gallery image"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="gallery-info">
                    <div className="gallery-meta">
                      <span className="gallery-date">
                        {item.createdAtFormatted}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  className={`pagination-arrow ${
                    currentPage === 1 ? "disabled" : ""
                  }`}
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>

                <div className="pagination-pages">
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      className={`pagination-page ${
                        currentPage === page ? "active" : ""
                      }`}
                      onClick={() => goToPage(page)}
                      aria-label={`Go to page ${page}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className={`pagination-arrow ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-data">
            <Image size={48} />
            <p>No gallery items found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;