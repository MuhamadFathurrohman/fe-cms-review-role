/**
 * @file useAutoRefetch.js
 * @description Hook custom untuk secara otomatis memperbarui data saat sesi pengguna diperpanjang.
 * Mendengarkan event `sessionRefreshed` dari sistem sesi dan memicu fungsi refetch yang disediakan.
 * 
 * Sangat berguna untuk memastikan data sensitif (seperti profil pengguna, notifikasi, dll.)
 * tetap sinkron setelah sesi diperbarui melalui refresh token.
 */

import { useEffect, useCallback } from "react";
import { onSessionRefreshed } from "../services/api";

/**
 * Hook custom untuk auto-refetch data setelah sesi di-extend atau diperbarui.
 * 
 * Hook ini berlangganan ke event `sessionRefreshed` dan akan memanggil fungsi `refetchFn`
 * setiap kali sesi pengguna berhasil diperbarui (misalnya melalui mekanisme refresh token).
 * 
 * @param {Function} refetchFn - Fungsi yang akan dipanggil untuk memperbarui data.
 *   Bisa berupa fungsi fetch custom, fungsi refetch dari React Query, atau fungsi lain apa pun.
 * @param {Array} [deps=[]] - Array dependensi opsional untuk useCallback internal.
 *   Gunakan ini jika `refetchFn` bergantung pada variabel eksternal yang bisa berubah.
 * 
 * @example
 * // Dengan fungsi fetch custom
 * const fetchUserData = useCallback(async () => {
 *   const response = await api.get('/auth/me');
 *   setUser(response.data);
 * }, []);
 * 
 * useAutoRefetch(fetchUserData);
 * 
 * @example
 * // Dengan React Query
 * const { data, refetch } = useQuery(['userProfile'], fetchUserProfile);
 * useAutoRefetch(refetch);
 * 
 * @example
 * // Dengan dependensi eksternal
 * const [userId, setUserId] = useState(null);
 * const fetchUserNotifications = useCallback(() => {
 *   if (userId) fetchNotifications(userId);
 * }, [userId]);
 * 
 * useAutoRefetch(fetchUserNotifications, [userId]);
 */
export const useAutoRefetch = (refetchFn, deps = []) => {
  /**
   * Handler refetch yang dibungkus dengan penanganan error.
   * Memastikan error tidak menghentikan aplikasi.
   */
  const handleRefetch = useCallback(() => {
    if (typeof refetchFn === "function") {
      try {
        refetchFn();
      } catch (error) {
        console.error("❌ Error refetching data:", error);
      }
    }
  }, [refetchFn, ...deps]);

  // Berlangganan ke event sessionRefreshed
  useEffect(() => {
    const unsubscribe = onSessionRefreshed(handleRefetch);
    return () => unsubscribe();
  }, [handleRefetch]);
};