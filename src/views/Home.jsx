/**
 * @file Home.jsx
 * @description Komponen halaman utama dashboard yang menampilkan ringkasan data aplikasi.
 * Menyediakan:
 * - Kartu statistik (pengguna, klien)
 * - Chart tren analitik 30 hari terakhir
 * - Log aktivitas pengunjung terbaru
 * 
 * Mengimplementasikan optimasi performa berbasis:
 * - Preferensi gerakan pengguna (`prefers-reduced-motion`)
 * - Kemampuan perangkat (`deviceMemory`, `hardwareConcurrency`)
 * 
 * Menggunakan sistem loading hybrid:
 * - Skeleton untuk loading awal
 * - Animasi angka untuk data yang dimuat
 * - Auto-refetch data setiap 30 detik
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Users, UserCheck, Activity } from "lucide-react";
import { dashboardService } from "../services/dashboardService";
import { useAutoRefetch } from "../hooks/useAutoRefetch";
import SkeletonItem from "../components/Loaders/SkeletonItem";
import { AnimatedNumber } from "../components/Animations";
import AnalyticsChart from "../components/AnalyticsChart";
import "../sass/views/Home/Home.css";

/**
 * Komponen halaman utama dashboard.
 * Menampilkan ringkasan data aplikasi dengan UX yang responsif dan performan.
 *
 * @component
 */
const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  /**
   * Status loading untuk data ringkasan dashboard.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(true);

  /**
   * Pesan error jika gagal memuat data.
   * @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]}
   */
  const [error, setError] = useState(null);

  /**
   * Data ringkasan dashboard utama.
   * @type {{ users: { total: number }, clients: { total: number }, analytics: Object } | null}
   */
  const [dashboardData, setDashboardData] = useState(null);

  // Untuk visitor activity — terpisah dari dashboard stats
  /**
   * Daftar aktivitas pengunjung terbaru.
   * @type {[Array<Object>, React.Dispatch<React.SetStateAction<Array<Object>>>]}
   */
  const [visitorActivity, setVisitorActivity] = useState([]);

  /**
   * Status loading untuk aktivitas pengunjung.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [activityLoading, setActivityLoading] = useState(true);

  /**
   * Status apakah ini adalah pemuatan awal halaman.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  /**
   * Status apakah sedang melakukan refetch aktivitas (auto-refetch).
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isRefetchingActivity, setIsRefetchingActivity] = useState(false);

  /** @type {React.RefObject<HTMLDivElement>} Ref ke daftar aktivitas untuk animasi */
  const activityListRef = useRef(null);

  /** @type {React.MutableRefObject<boolean>} Flag untuk mencegah animasi berulang */
  const hasAnimatedActivity = useRef(false);

  // Deteksi preferensi pengguna & perangkat lambat
  /**
   * Apakah pengguna memilih mengurangi gerakan animasi.
   * @type {boolean}
   */
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /**
   * Apakah perangkat dianggap low-end berdasarkan spesifikasi hardware.
   * @type {boolean}
   */
  const isLowEndDevice =
    ("deviceMemory" in navigator && navigator.deviceMemory < 2) ||
    ("hardwareConcurrency" in navigator && navigator.hardwareConcurrency <= 2);

  /**
   * Apakah animasi boleh dijalankan berdasarkan preferensi dan kemampuan perangkat.
   * @type {boolean}
   */
  const shouldAnimate = !prefersReducedMotion && !isLowEndDevice;

  // === Fetch Dashboard Summary (stats & trend only) ===
  /**
   * Memuat data ringkasan dashboard utama.
   * @async
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const result = await dashboardService.getSummary();
      if (result.success) {
        setDashboardData(result.data);
        setError(null);
      } else {
        setError(result.message || "Failed to load dashboard data");
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setError("An error occurred while loading the dashboard");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Memuat daftar pengunjung terbaru.
   * @async
   * @param {{ isRefetch?: boolean }} [options={}] - Opsi pemanggilan
   * @param {boolean} [options.isRefetch=false] - Apakah ini pemanggilan auto-refetch
   */
  const fetchRecentVisitors = async ({ isRefetch = false } = {}) => {
    if (isRefetch) {
      setIsRefetchingActivity(true);
    } else {
      setActivityLoading(true);
    }

    try {
      const result = await dashboardService.getRecentVisitors(20);
      if (result.success && Array.isArray(result.data)) {
        setVisitorActivity([...result.data]);
        hasAnimatedActivity.current = false;
      }
      // Jika gagal, biarkan data lama tetap ada — jangan reset ke []
    } catch (err) {
      console.error("Error fetching recent visitors:", err);
    } finally {
      if (isRefetch) {
        setIsRefetchingActivity(false);
      } else {
        setActivityLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  // === Animasi saat data pertama kali muncul ===
  /**
   * Menjalankan animasi slide-in untuk item aktivitas saat data pertama kali dimuat.
   */
  useEffect(() => {
    if (
      visitorActivity.length > 0 &&
      !activityLoading &&
      !hasAnimatedActivity.current &&
      shouldAnimate &&
      !isInitialLoad
    ) {
      hasAnimatedActivity.current = true;
      const timer = setTimeout(() => {
        const items = document.querySelectorAll(".home-activity-item");
        const itemsToAnimate = Array.from(items).slice(0, 20);
        itemsToAnimate.forEach((item, index) => {
          item.style.transitionDelay = `${index * 0.15}s`;
          item.classList.add("animate-slide-in");
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [visitorActivity, activityLoading, shouldAnimate, isInitialLoad]);

  // === Load initial data ===
  /**
   * Memuat data awal saat komponen dipasang.
   */
  useEffect(() => {
    loadDashboardData();
    fetchRecentVisitors();
  }, []);

  // === Auto-refetch hanya stats & recent visitors ===
  /**
   * Fungsi auto-refetch yang dipanggil setiap 30 detik.
   * @async
   */
  const handleAutoRefetch = async () => {
    try {
      await loadDashboardData();
      await fetchRecentVisitors({ isRefetch: true });
    } catch (error) {
      console.error("❌ Home.jsx: Auto-refetch failed:", error);
    }
  };

  useAutoRefetch(handleAutoRefetch);

  // Navigation handlers
  /**
   * Navigasi ke halaman pengguna.
   */
  const handleUsersCardClick = () => navigate("/dashboard/users");

  /**
   * Navigasi ke halaman klien.
   */
  const handleClientCardClick = () => navigate("/dashboard/clients");

  /**
   * Navigasi ke halaman analitik.
   */
  const handleAnalyticsCardClick = () => navigate("/dashboard/analytics");

  /**
   * Navigasi ke halaman page views.
   */
  const handlePageViewsCardClick = () => navigate("/dashboard/analytics");

  const analyticsSnapshot = dashboardData?.analytics?.snapshot;
  const analyticsTrend = dashboardData?.analytics?.trend || [];

  return (
    <div className="home-dashboard fade-in">
      {/* Header */}
      <div className="home-dashboard-header">
        <h1 className="home-page-title">HOME</h1>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="home-error-banner">
          <p>{error}</p>
          <button onClick={loadDashboardData} className="home-retry-button">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Content Wrapper */}
      <div className="home-dashboard-content">
        {/* Stats Row */}
        <div className="home-stats-row">
          {loading ? (
            <>
              {/* Skeletons: Welcome, Users, Clients */}
              <div className="home-welcome-card">
                <div className="home-welcome-text-wrapper">
                  <h2>
                    <SkeletonItem className="skeleton-line skeleton-line--header" />
                  </h2>
                  <div className="home-welcome-subtitle">
                    <SkeletonItem className="skeleton-line skeleton-line--medium" />
                  </div>
                  <div className="home-company-name">
                    <SkeletonItem className="skeleton-line skeleton-line--long" />
                  </div>
                </div>
              </div>

              <div className="home-dashboard-card home-stat-card home-admin-card">
                <div className="home-card-content-wrapper">
                  <h3 className="home-stat-title">
                    <SkeletonItem className="skeleton-line skeleton-line--header" />
                  </h3>
                  <div className="home-stat-number-wrapper">
                    <div className="home-stat-number">
                      <SkeletonItem className="skeleton-line skeleton-line--value" />
                    </div>
                    <div className="home-stat-icon">
                      <SkeletonItem
                        className="skeleton-circle"
                        style={{ width: 24, height: 24 }}
                      />
                    </div>
                    <span className="home-stat-subtitle">
                      <SkeletonItem className="skeleton-line skeleton-line--subtitle" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="home-dashboard-card home-stat-card home-client-card">
                <div className="home-card-content-wrapper">
                  <h3 className="home-stat-title">
                    <SkeletonItem className="skeleton-line skeleton-line--header" />
                  </h3>
                  <div className="home-stat-number-wrapper">
                    <div className="home-stat-number">
                      <SkeletonItem className="skeleton-line skeleton-line--value" />
                    </div>
                    <div className="home-stat-icon">
                      <SkeletonItem
                        className="skeleton-circle"
                        style={{ width: 24, height: 24 }}
                      />
                    </div>
                    <span className="home-stat-subtitle">
                      <SkeletonItem className="skeleton-line skeleton-line--subtitle" />
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Welcome Card */}
              <div className="home-welcome-card">
                <div className="home-welcome-text-wrapper">
                  <h2>
                    WELCOME BACK,{" "}
                    <span className="home-highlight">
                      {user?.name || "Admin"}
                    </span>
                  </h2>
                  <p className="home-welcome-subtitle">
                    To Dashboard Content Management System
                  </p>
                  <p className="home-company-name">PT ENERKOMP PERSADA RAYA</p>
                </div>
              </div>

              {/* Users Card */}
              <div
                className="home-dashboard-card home-stat-card home-admin-card"
                onClick={handleUsersCardClick}
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                aria-label="Go to Users page"
              >
                <div className="home-card-content-wrapper">
                  <h3 className="home-stat-title">Users</h3>
                  <div className="home-stat-number-wrapper">
                    <div className="home-stat-number">
                      <AnimatedNumber
                        value={
                          dashboardData?.users?.total != null
                            ? dashboardData.users.total
                            : 0
                        }
                        duration={shouldAnimate ? 800 : 0}
                        delay={shouldAnimate ? 200 : 0}
                      />
                    </div>
                    <div className="home-stat-icon">
                      <UserCheck size={24} />
                    </div>
                    <span className="home-stat-subtitle">
                      Total Registered Users
                    </span>
                  </div>
                </div>
              </div>

              {/* Clients Card */}
              <div
                className="home-dashboard-card home-stat-card home-client-card"
                onClick={handleClientCardClick}
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                aria-label="Go to Clients page"
              >
                <div className="home-card-content-wrapper">
                  <h3 className="home-stat-title">Clients</h3>
                  <div className="home-stat-number-wrapper">
                    <div className="home-stat-number">
                      <AnimatedNumber
                        value={
                          dashboardData?.clients?.total != null
                            ? dashboardData.clients.total
                            : 0
                        }
                        duration={shouldAnimate ? 800 : 0}
                        delay={shouldAnimate ? 300 : 0}
                      />
                    </div>
                    <div className="home-stat-icon">
                      <Users size={24} />
                    </div>
                    <span className="home-stat-subtitle">
                      Total Incoming Clients
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Charts Row */}
        {loading ? (
          <div className="home-charts-row">
            {/* Skeleton: Analytics */}
            <div className="home-dashboard-card home-chart-card home-analytics-card">
              <div className="home-chart-header">
                <h3>
                  <SkeletonItem className="skeleton-line skeleton-line--header" />
                </h3>
                <SkeletonItem
                  className="skeleton-circle"
                  style={{ width: 20, height: 20 }}
                />
              </div>
              <div className="home-chart-content">
                <div className="home-analytics-chart-container">
                  <div className="home-chart-and-legend">
                    <div className="home-chart-wrapper">
                      <SkeletonItem
                        className="skeleton-rect"
                        style={{ height: "120px" }}
                      />
                    </div>
                  </div>
                  <div className="home-analytics-stats-horizontal">
                    <div className="home-stat-item-horizontal">
                      <SkeletonItem
                        className="skeleton-line skeleton-line--value"
                        style={{ width: "40px", height: "20px" }}
                      />
                      <div className="home-stat-label">
                        <SkeletonItem className="skeleton-line skeleton-line--short" />
                      </div>
                    </div>
                    <div className="home-stat-item-horizontal">
                      <SkeletonItem
                        className="skeleton-line skeleton-line--value"
                        style={{ width: "40px", height: "20px" }}
                      />
                      <span className="home-stat-label">
                        <SkeletonItem className="skeleton-line skeleton-line--short" />
                      </span>
                    </div>
                    <div className="home-stat-item-horizontal">
                      <SkeletonItem
                        className="skeleton-line skeleton-line--value"
                        style={{ width: "40px", height: "20px" }}
                      />
                      <span className="home-stat-label">
                        <SkeletonItem className="skeleton-line skeleton-line--short" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Skeleton: Activity Log */}
            <div className="home-dashboard-card home-stat-card home-activity-card">
              <div className="home-stat-content">
                <div className="home-stat-header">
                  <h3 className="home-stat-title">
                    <SkeletonItem className="skeleton-line skeleton-line--header" />
                  </h3>
                  <SkeletonItem
                    className="skeleton-circle"
                    style={{ width: 20, height: 20 }}
                  />
                </div>
                <div
                  className="home-activity-list-container"
                  ref={activityListRef}
                >
                  <div className="home-activity-list">
                    {[...Array(3)].map((_, i) => (
                      <div className="skeleton-activity-container" key={i}>
                        <div className="skeleton-activity-dot"></div>
                        <div className="skeleton-activity-content">
                          <div className="skeleton-activity-line"></div>
                          <div className="skeleton-activity-line"></div>
                        </div>
                        <div className="skeleton-activity-time"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="home-charts-row">
            <AnalyticsChart
              analyticsSnapshot={analyticsSnapshot}
              analyticsTrend={analyticsTrend}
              onChartClick={handleAnalyticsCardClick}
            />

            {/* Visitor Activity Log — statis, tanpa real-time */}
            <div
              className="home-dashboard-card home-stat-card home-activity-card"
              onClick={handlePageViewsCardClick}
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              aria-label="Go to Analytics page"
            >
              <div className="home-stat-content">
                <div className="home-stat-header">
                  <h3 className="home-stat-title">Visitor Activity Log</h3>
                  <Activity size={20} />
                </div>
                <div
                  className="home-activity-list-container"
                  ref={activityListRef}
                >
                  <div className="home-activity-list">
                    {activityLoading || isRefetchingActivity ? (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <div className="skeleton-activity-container" key={i}>
                            <div className="skeleton-activity-dot"></div>
                            <div className="skeleton-activity-content">
                              <div className="skeleton-activity-line"></div>
                              <div className="skeleton-activity-line"></div>
                            </div>
                            <div className="skeleton-activity-time"></div>
                          </div>
                        ))}
                      </>
                    ) : visitorActivity.length > 0 ? (
                      visitorActivity.map((item, index) => (
                        <div
                          key={item.id}
                          className="home-activity-item"
                          style={{ transitionDelay: `${index * 0.2}s` }}
                        >
                          <div
                            className="home-activity-dot"
                            style={{ backgroundColor: "#3b82f6" }}
                          ></div>
                          <div className="home-activity-main">
                            <div className="home-activity-text">
                              Visitor from <strong>{item.country}</strong>
                            </div>
                            <div className="home-activity-meta">
                              {item.browser} on {item.os}
                            </div>
                          </div>
                          <div className="home-activity-time">
                            {item.timestampFormatted}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="home-activity-empty">
                        No recent visitors
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;