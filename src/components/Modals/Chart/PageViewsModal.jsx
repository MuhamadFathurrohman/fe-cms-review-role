/**
 * @file PageViewsModal.jsx
 * @description Komponen modal untuk menampilkan insight detail kunjungan halaman.
 * Menyediakan dua tab utama:
 * - **Top Pages**: Halaman dengan jumlah kunjungan tertinggi
 * - **Trend**: Tren harian total kunjungan halaman
 * 
 * Menggunakan Recharts untuk visualisasi data dengan:
 * - Tooltip kustom yang informatif
 * - Responsivitas untuk mobile/desktop
 * - Penanganan data kosong yang elegan
 * 
 * Fitur performance (durasi sesi per halaman) saat ini dikomentari
 * karena keterbatasan data dari endpoint /analytics.
 */

import React, { useState, useEffect } from "react";
import { Eye, TrendingUp, FileText } from "lucide-react";
import { analyticsService } from "../../../services/analyticsService";
import { baseService } from "../../../services/baseService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import "../../../sass/components/Modals/PageViewsModal/PageViewsModal.scss";

/**
 * Props untuk komponen PageViewsModal.
 * @typedef {Object} PageViewsModalProps
 * @property {string} startDate - Tanggal mulai filter (YYYY-MM-DD)
 * @property {string} endDate - Tanggal akhir filter (YYYY-MM-DD)
 * @property {function(): void} onClose - Handler saat modal ditutup
 */

/**
 * Komponen modal insight kunjungan halaman.
 * Menampilkan visualisasi data analitik kunjungan halaman dalam format yang mudah dipahami.
 *
 * @component
 * @param {PageViewsModalProps} props - Props komponen
 */
const PageViewsModal = ({ startDate, endDate, onClose }) => {
  /**
   * Tab aktif di modal insight kunjungan halaman.
   * @type {['topPages'|'trend', React.Dispatch<React.SetStateAction<...>>]}
   */
  const [activeTab, setActiveTab] = useState("topPages");

  /**
   * Status loading saat mengambil data insight.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(true);

  /**
   * Data insight kunjungan halaman dari service.
   * @type {Object|null}
   */
  const [data, setData] = useState(null);

  /**
   * Pesan error jika gagal mengambil data.
   * @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]}
   */
  const [error, setError] = useState(null);

  /** @type {string} Rentang tanggal terformat untuk ditampilkan di UI */
  const formattedRange =
    startDate && endDate
      ? `${baseService.formatDate(startDate)} – ${baseService.formatDate(
          endDate
        )}`
      : "";

  // Fetch data insight kunjungan halaman
  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await analyticsService.getPageViewsInsights(
          startDate,
          endDate
        );

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || "Failed to load page views data");
        }
      } catch (err) {
        console.error("Error loading page views data", err);
        setError("An error occurred while loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // === Custom Tooltips ===
  /**
   * Tooltip kustom untuk chart bar top pages.
   * Menampilkan URL halaman, jumlah kunjungan, dan persentase.
   * 
   * @param {Object} props - Props tooltip
   * @param {boolean} props.active - Status aktif tooltip
   * @param {Array} props.payload - Data yang ditampilkan
   * @returns {JSX.Element|null} Tooltip kustom atau null jika tidak aktif
   */
  const CustomTopPagesTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="pageviews-custom-tooltip">
          <p className="pageviews-tooltip-label">{item.page}</p>
          <p className="pageviews-tooltip-value">
            {item.views.toLocaleString()} views
          </p>
          <p className="pageviews-tooltip-percentage">
            {item.percentage.toFixed(2)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Tooltip kustom untuk chart garis tren kunjungan.
   * Menampilkan tanggal dan jumlah kunjungan harian.
   * 
   * @param {Object} props - Props tooltip
   * @param {boolean} props.active - Status aktif tooltip
   * @param {Array} props.payload - Data yang ditampilkan
   * @param {string} props.label - Label sumbu X (tanggal)
   * @returns {JSX.Element|null} Tooltip kustom atau null jika tidak aktif
   */
  const CustomTrendTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="pageviews-custom-tooltip">
          <p className="pageviews-tooltip-label">{label}</p>
          <p className="pageviews-tooltip-value">
            {payload[0].value.toLocaleString()} page views
          </p>
        </div>
      );
    }
    return null;
  };

  // === PERFORMANCE TOOLTIP — DIKOMENTARI ===
  /*
  const CustomPerformanceTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="pageviews-custom-tooltip">
          <p className="pageviews-tooltip-label">{item.page}</p>
          <p className="pageviews-tooltip-value">{item.views} views</p>
          <p className="pageviews-tooltip-duration">
            Avg. duration: {formatDuration(item.avgDuration)}
          </p>
        </div>
      );
    }
    return null;
  };
  */

  // === FORMAT DURATION — DIKOMENTARI ===
  /*
  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins > 0 ? `${mins}m ` : ""}${secs}s`;
  };
  */

  /**
   * Memotong teks label chart agar tidak terlalu panjang.
   * 
   * @param {string} text - Teks yang akan dipotong
   * @param {number} [max=18] - Jumlah karakter maksimum sebelum dipotong
   * @returns {string} Teks yang telah dipotong dengan ellipsis jika perlu
   */
  const truncateLabel = (text, max = 18) => {
    if (!text) return "";
    return text.length > max ? text.slice(0, max) + "…" : text;
  };

  // === Pesan no-data per tab ===
  /**
   * Merender pesan ketika tidak ada data untuk tab tertentu.
   * Menyesuaikan ikon dan pesan berdasarkan jenis tab.
   * 
   * @param {'topPages'|'trend'} tab - Jenis tab yang tidak memiliki data
   * @returns {JSX.Element} Pesan no data yang sesuai konteks
   */
  const renderNoDataMessage = (tab) => {
    const messages = {
      topPages: {
        icon: <FileText size={48} />,
        title: "No Top Pages Data",
        description: "No page view data available for this period.",
      },
      trend: {
        icon: <TrendingUp size={48} />,
        title: "No Trend Data",
        description: "Aggregated page views trend is not yet available.",
      },
    };

    const msg = messages[tab];

    return (
      <div className="pageviews-no-data-tab">
        <div className="pageviews-no-data-icon">{msg.icon}</div>
        <h4 className="pageviews-no-data-title">{msg.title}</h4>
        <p className="pageviews-no-data-description">{msg.description}</p>
      </div>
    );
  };

  return (
    <>
      {/* === Top section: Tab toggle + Date Range === */}
      <div className="pageviews-top-header">
        <div className="pageviews-chart-toggle">
          <button
            className={activeTab === "trend" ? "active" : ""}
            onClick={() => setActiveTab("trend")}
            aria-label="Show page views trend chart"
          >
            <TrendingUp size={16} /> Trend
          </button>
          <button
            className={activeTab === "topPages" ? "active" : ""}
            onClick={() => setActiveTab("topPages")}
            aria-label="Show top pages chart"
          >
            <FileText size={16} /> Top Pages
          </button>
        </div>

        <div className="pageviews-date-range-label">{formattedRange}</div>
      </div>

      <div className="pageviews-chart-content">
        {loading ? (
          <div className="pageviews-loading">
            <div className="pageviews-spinner"></div>
            <p>Loading page views data...</p>
          </div>
        ) : error ? (
          <div className="pageviews-error">
            <p>{error}</p>
            <button onClick={onClose} className="btn-cls-error">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* === TAB: TOP PAGES === */}
            {activeTab === "topPages" && (
              <div className="pageviews-chart-section">
                <div className="pageviews-chart-header">
                  <h3 className="pageviews-chart-title">Top Pages</h3>
                  <p className="pageviews-chart-description">
                    Pages with the highest number of views during the selected
                    period.
                  </p>
                </div>

                {data?.topPages?.length ? (
                  <>
                    <div className="pageviews-bar-chart-wrapper">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={data.topPages.slice(0, 7)}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="page"
                            stroke="#6b7280"
                            tick={{ fontSize: 11 }}
                            angle={-25}
                            textAnchor="end"
                            height={40}
                            interval={0}
                            tickFormatter={(value) => truncateLabel(value, 14)}
                          />
                          <YAxis
                            stroke="#6b7280"
                            tick={{ fontSize: 12 }}
                            domain={[0, "dataMax * 1.1"]}
                          />
                          <RechartsTooltip
                            content={<CustomTopPagesTooltip />}
                          />
                          <Bar
                            dataKey="views"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* === Desktop Table === */}
                    <div className="pageviews-table-container pageviews-table-container--desktop">
                      <h4 className="pageviews-table-title">Pages Breakdown</h4>
                      <table className="pageviews-table">
                        <thead>
                          <tr>
                            <th>Page</th>
                            <th>Views</th>
                            <th>% of Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topPages.map((item, index) => (
                            <tr key={index}>
                              <td>
                                <div className="pageviews-page-title">
                                  {item.title || "Untitled Page"}
                                </div>
                                <div className="pageviews-page-url">
                                  {item.page}
                                </div>
                              </td>
                              <td>{item.views.toLocaleString()}</td>
                              <td>{item.percentage.toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* === Mobile Table === */}
                    <div className="pageviews-table-container pageviews-table-container--mobile">
                      <h4 className="pageviews-table-title">Pages Breakdown</h4>
                      <div className="pageviews-mobile-table">
                        {data.topPages.map((item, index) => (
                          <div
                            key={index}
                            className="pageviews-mobile-table-row"
                          >
                            <div className="pageviews-mobile-table-cell">
                              <span className="pageviews-mobile-table-label">
                                Page Title
                              </span>
                              <span className="pageviews-mobile-table-value">
                                {item.title}
                              </span>
                            </div>
                            <div className="pageviews-mobile-table-cell">
                              <span className="pageviews-mobile-table-label">
                                Views
                              </span>
                              <span className="pageviews-mobile-table-value">
                                {item.views.toLocaleString()}
                              </span>
                            </div>
                            <div className="pageviews-mobile-table-cell">
                              <span className="pageviews-mobile-table-label">
                                % of Total
                              </span>
                              <span className="pageviews-mobile-table-value">
                                {item.percentage.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  renderNoDataMessage("topPages")
                )}
              </div>
            )}

            {/* === TAB: TREND === */}
            {activeTab === "trend" && (
              <div className="pageviews-chart-section">
                <div className="pageviews-chart-header">
                  <h3 className="pageviews-chart-title">Page Views Trend</h3>
                  <p className="pageviews-chart-description">
                    Aggregated page views of trend over the selected period.
                  </p>
                </div>

                {data?.trendData?.length ? (
                  <div className="pageviews-line-chart-wrapper">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={data.trendData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          stroke="#6b7280"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          stroke="#6b7280"
                          tick={{ fontSize: 12 }}
                          domain={[0, "dataMax + 50"]}
                        />
                        <RechartsTooltip content={<CustomTrendTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="views"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{
                            r: 5,
                            fill: "#10b981",
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                          activeDot={{
                            r: 7,
                            fill: "#10b981",
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  renderNoDataMessage("trend")
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default PageViewsModal;