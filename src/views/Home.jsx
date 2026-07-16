/**
 * @file Home.jsx
 * @description Komponen halaman utama dashboard yang menampilkan ringkasan data aplikasi.
 * Menyediakan:
 * - Kartu statistik (pengguna, klien) — ditampilkan sesuai permission
 * - Chart tren analitik 30 hari terakhir — ditampilkan sesuai permission
 * - Log aktivitas pengunjung terbaru
 * - Overview status review Blog dan Items — ditampilkan sesuai permission
 *
 * Batasan akses:
 * - Users card: canRead(permissions, "user") atau super admin
 * - Clients card: canRead(permissions, "client") atau super admin
 * - Analytics card: canRead(permissions, "analytics") atau super admin
 * - Blog overview: canAccess(permissions, "blog") atau super admin
 * - Items overview: canAccess(permissions, "product") atau super admin
 *
 * Untuk overview Blog/Items:
 * - Reviewer (canReview): melihat semua data
 * - Staff (canManage): hanya melihat data milik sendiri
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Users,
  UserCheck,
  Activity,
  FileText,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { dashboardService } from "../services/dashboardService";
import { useAutoRefetch } from "../hooks/useAutoRefetch";
import SkeletonItem from "../components/Loaders/SkeletonItem";
import { AnimatedNumber } from "../components/Animations";
import AnalyticsChart from "../components/AnalyticsChart";
import {
  canRead,
  canAccess,
  canReview,
  isSuperAdmin,
} from "../utils/permissions";
import "../sass/views/Home/Home.css";

/**
 * Konfigurasi tampilan per review status untuk overview cards.
 */
const STATUS_CONFIG = {
  DRAFT: { label: "Draft", className: "status-draft", icon: FileText },
  PENDING_REVIEW: {
    label: "Pending",
    className: "status-pending",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    className: "status-approved",
    icon: CheckCircle,
  },
  REJECTED: { label: "Rejected", className: "status-rejected", icon: XCircle },
  REVISION: {
    label: "Revision",
    className: "status-revision",
    icon: RotateCcw,
  },
};

/**
 * Komponen skeleton untuk content overview card.
 * @component
 */
const ContentOverviewSkeleton = () => (
  <div className="home-content-overview-card">
    <div className="home-content-overview-header">
      <SkeletonItem
        style={{ width: "120px", height: "20px", borderRadius: "6px" }}
      />
      <SkeletonItem
        style={{ width: "40px", height: "24px", borderRadius: "12px" }}
      />
    </div>
    <div className="home-content-status-grid">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="home-content-status-item skeleton">
          <SkeletonItem
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              marginBottom: "6px",
            }}
          />
          <SkeletonItem
            style={{
              width: "30px",
              height: "18px",
              borderRadius: "4px",
              marginBottom: "4px",
            }}
          />
          <SkeletonItem
            style={{ width: "50px", height: "12px", borderRadius: "4px" }}
          />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Komponen overview card untuk satu modul konten (Blog atau Items).
 *
 * @component
 * @param {Object} props
 * @param {string} props.title - Judul card
 * @param {React.ReactNode} props.icon - Icon modul
 * @param {Object|null} props.counts - Data jumlah per status
 * @param {function} props.onClick - Handler klik card
 * @param {string} props.accentClass - Class CSS untuk aksen warna
 */
const ContentOverviewCard = ({ title, icon, counts, onClick }) => {
  return (
    <div
      className={`home-content-overview-card `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{ cursor: "pointer" }}
      aria-label={`Go to ${title}`}
    >
      <div className="home-content-overview-header">
        <div className="home-content-overview-title">
          {icon}
          <span>{title}</span>
        </div>
        <div className="home-content-overview-total">
          <span className="home-content-total-number">
            {counts?.total ?? 0}
          </span>
          <span className="home-content-total-label">total</span>
        </div>
      </div>

      <div className="home-content-status-grid">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const IconComponent = config.icon;
          const count = counts?.[status] ?? 0;

          return (
            <div
              key={status}
              className={`home-content-status-item ${config.className}`}
            >
              <div className="home-content-status-icon">
                <IconComponent size={14} />
              </div>
              <span className="home-content-status-count">{count}</span>
              <span className="home-content-status-label">{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Komponen halaman utama dashboard.
 *
 * @component
 */
const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // === Permission checks ===
  const isSuper = isSuperAdmin(user);
  const canSeeUsers = isSuper || canRead(user?.permissions, "user");
  const canSeeClients = isSuper || canRead(user?.permissions, "client");
  const canSeeAnalytics = isSuper || canRead(user?.permissions, "analytics");
  const canSeeBlog = isSuper || canAccess(user?.permissions, "blog");
  const canSeeProduct = isSuper || canAccess(user?.permissions, "product");
  const isReviewerBlog = isSuper || canReview(user?.permissions, "blog");
  const isReviewerProduct = isSuper || canReview(user?.permissions, "product");
  // Staff bisa manage tapi bukan reviewer — data difilter by userId
  const isReviewer = isReviewerBlog || isReviewerProduct;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [visitorActivity, setVisitorActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefetchingActivity, setIsRefetchingActivity] = useState(false);

  /**
   * Data ringkasan status review konten.
   * @type {{ blog: Object|null, items: Object|null } | null}
   */
  const [contentSummary, setContentSummary] = useState(null);

  /**
   * Status loading untuk content summary.
   */
  const [contentLoading, setContentLoading] = useState(true);

  const activityListRef = useRef(null);
  const hasAnimatedActivity = useRef(false);

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const isLowEndDevice =
    ("deviceMemory" in navigator && navigator.deviceMemory < 2) ||
    ("hardwareConcurrency" in navigator && navigator.hardwareConcurrency <= 2);
  const shouldAnimate = !prefersReducedMotion && !isLowEndDevice;

  // === Fetch Dashboard Summary ===
  const loadDashboardData = async () => {
    // Skip fetch jika user tidak punya akses ke data manapun di summary
    // (users / clients / analytics). Mencegah request 403 yang tidak terpakai.
    if (!canSeeUsers && !canSeeClients && !canSeeAnalytics) {
      setLoading(false);
      return;
    }

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

  // === Fetch Content Summary ===
  const loadContentSummary = async () => {
    if (!canSeeBlog && !canSeeProduct) {
      setContentLoading(false);
      return;
    }

    try {
      setContentLoading(true);
      const result = await dashboardService.getContentSummary(
        user?.id,
        isReviewer,
        canSeeBlog,
        canSeeProduct,
      );
      if (result.success) {
        setContentSummary(result.data);
      }
    } catch (err) {
      console.error("Error loading content summary:", err);
    } finally {
      setContentLoading(false);
    }
  };

  // === Fetch Recent Visitors ===
  const fetchRecentVisitors = async ({ isRefetch = false } = {}) => {
    // Activity log hanya tampil di section analytics. Skip fetch bila tak ada akses.
    if (!canSeeAnalytics) {
      setActivityLoading(false);
      setIsInitialLoad(false);
      return;
    }

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

  // === Animasi activity items ===
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
  useEffect(() => {
    loadDashboardData();
    fetchRecentVisitors();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // === Load content summary — dipisah agar tunggu user tersedia ===
  useEffect(() => {
    if (!user) return;
    loadContentSummary();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // === Auto-refetch ===
  const handleAutoRefetch = async () => {
    try {
      await loadDashboardData();
      await loadContentSummary();
      await fetchRecentVisitors({ isRefetch: true });
    } catch (error) {
      console.error("❌ Home.jsx: Auto-refetch failed:", error);
    }
  };

  useAutoRefetch(handleAutoRefetch);

  // Navigation handlers
  const handleUsersCardClick = () => navigate("/dashboard/users");
  const handleClientCardClick = () => navigate("/dashboard/clients");
  const handleAnalyticsCardClick = () => navigate("/dashboard/analytics");
  const handlePageViewsCardClick = () => navigate("/dashboard/analytics");
  const handleBlogClick = () => navigate("/dashboard/content/blogs");
  const handleItemsClick = () => navigate("/dashboard/products/items");

  const analyticsSnapshot = dashboardData?.analytics?.snapshot;
  const analyticsTrend = dashboardData?.analytics?.trend || [];

  // Apakah ada section manapun yang tampil
  const hasStatCards = canSeeUsers || canSeeClients;
  const hasTopSection = true; // Welcome card selalu tampil
  const hasAnalyticsSection = canSeeAnalytics;
  const hasContentSection = canSeeBlog || canSeeProduct;
  // Jika tidak ada stat cards, welcome card span full width
  const welcomeCardClass = hasStatCards
    ? "home-welcome-card"
    : "home-welcome-card home-welcome-card--full";

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
        {/* ==================== STATS ROW ==================== */}
        {hasTopSection && (
          <div className="home-stats-row">
            {loading ? (
              <>
                {/* Welcome skeleton selalu tampil */}
                <div className={welcomeCardClass}>
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

                {canSeeUsers && (
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
                )}

                {canSeeClients && (
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
                )}
              </>
            ) : (
              <>
                {/* Welcome Card — selalu tampil */}
                <div className={welcomeCardClass}>
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
                    <p className="home-company-name">
                      PT ENERKOMP PERSADA RAYA
                    </p>
                  </div>
                </div>

                {/* Users Card */}
                {canSeeUsers && (
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
                            value={dashboardData?.users?.total ?? 0}
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
                )}

                {/* Clients Card */}
                {canSeeClients && (
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
                            value={dashboardData?.clients?.total ?? 0}
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
                )}
              </>
            )}
          </div>
        )}

        {/* ==================== CHARTS ROW ==================== */}
        {hasAnalyticsSection &&
          (loading ? (
            <div className="home-charts-row">
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
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="home-stat-item-horizontal">
                          <SkeletonItem
                            className="skeleton-line skeleton-line--value"
                            style={{ width: "40px", height: "20px" }}
                          />
                          <div className="home-stat-label">
                            <SkeletonItem className="skeleton-line skeleton-line--short" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

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
                            <div
                              className="skeleton-activity-container"
                              key={i}
                            >
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
          ))}

        {/* ==================== CONTENT OVERVIEW ROW ==================== */}
        {hasContentSection && (
          <div className="home-content-overview-row">
            <div className="home-content-overview-section-header">
              <h2 className="home-content-overview-section-title">
                Content Overview
              </h2>
              <span className="home-content-overview-section-desc">
                {isReviewer
                  ? "Review status of all content"
                  : "Your content review status"}
              </span>
            </div>

            <div className="home-content-overview-grid">
              {canSeeBlog &&
                (contentLoading ? (
                  <ContentOverviewSkeleton />
                ) : (
                  <ContentOverviewCard
                    title="Blog"
                    icon={<FileText size={18} />}
                    counts={contentSummary?.blog}
                    onClick={handleBlogClick}
                    accentClass="accent-blog"
                  />
                ))}

              {canSeeProduct &&
                (contentLoading ? (
                  <ContentOverviewSkeleton />
                ) : (
                  <ContentOverviewCard
                    title="Products / Items"
                    icon={<Package size={18} />}
                    counts={contentSummary?.items}
                    onClick={handleItemsClick}
                    accentClass="accent-items"
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
