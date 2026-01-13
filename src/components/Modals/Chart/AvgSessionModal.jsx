/**
 * @file AvgSessionModal.jsx
 * @description Komponen modal untuk menampilkan insight detail durasi sesi rata-rata.
 * Menyediakan tiga tab utama:
 * - **Trend**: Grafik garis tren durasi sesi harian
 * - **By Device**: Perbandingan durasi sesi berdasarkan jenis perangkat
 * - **Top Pages**: Halaman dengan durasi sesi rata-rata terpanjang
 * 
 * Menggunakan Recharts untuk visualisasi data dengan:
 * - Tooltip kustom yang menampilkan durasi dalam format "Xm Ys"
 * - Responsivitas untuk mobile/desktop
 * - Penanganan data kosong yang elegan
 */

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp, Monitor, FileText, Info } from "lucide-react";
import { analyticsService } from "../../../services/analyticsService";
import { baseService } from "../../../services/baseService";
import "../../../sass/components/Modals/AvgSessionModal/AvgSessionModal.scss";

/**
 * Props untuk komponen AvgSessionModal.
 * @typedef {Object} AvgSessionModalProps
 * @property {string} startDate - Tanggal mulai filter (YYYY-MM-DD)
 * @property {string} endDate - Tanggal akhir filter (YYYY-MM-DD)
 * @property {function(): void} onClose - Handler saat modal ditutup
 */

/**
 * Komponen modal insight durasi sesi rata-rata.
 * Menampilkan visualisasi data analitik durasi sesi dalam format yang mudah dipahami.
 *
 * @component
 * @param {AvgSessionModalProps} props - Props komponen
 */
const AvgSessionModal = ({ startDate, endDate, onClose }) => {
  /**
   * Tab aktif di modal insight durasi sesi.
   * @type {['trend'|'device'|'pages', React.Dispatch<React.SetStateAction<...>>]}
   */
  const [activeTab, setActiveTab] = useState("trend");

  /**
   * Status loading saat mengambil data insight.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(true);

  /**
   * Data insight durasi sesi dari service.
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

  // Fetch data insight durasi sesi
  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await analyticsService.getAvgSessionInsights(
          startDate,
          endDate
        );

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || "Failed to load session data");
        }
      } catch (err) {
        console.error("Error loading avg session data", err);
        setError("An error occurred while loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // === Custom Tooltips ===
  /**
   * Tooltip kustom untuk chart garis tren durasi sesi.
   * Menampilkan tanggal dan durasi dalam format "Xm Ys".
   * 
   * @param {Object} props - Props tooltip
   * @param {boolean} props.active - Status aktif tooltip
   * @param {Array} props.payload - Data yang ditampilkan
   * @param {string} props.label - Label sumbu X (tanggal)
   * @returns {JSX.Element|null} Tooltip kustom atau null jika tidak aktif
   */
  const CustomTrendTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const duration = payload[0].value;
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      return (
        <div className="avg-session-modal__custom-tooltip">
          <p className="avg-session-modal__tooltip-label">{label}</p>
          <p className="avg-session-modal__tooltip-value">
            Avg. Duration:{" "}
            <span>
              {mins}m {secs}s
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Tooltip kustom untuk chart bar durasi sesi berdasarkan perangkat.
   * Menampilkan jenis perangkat, durasi rata-rata, dan jumlah sesi.
   * 
   * @param {Object} props - Props tooltip
   * @param {boolean} props.active - Status aktif tooltip
   * @param {Array} props.payload - Data yang ditampilkan
   * @returns {JSX.Element|null} Tooltip kustom atau null jika tidak aktif
   */
  const CustomDeviceTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="avg-session-modal__custom-tooltip">
          <p className="avg-session-modal__tooltip-label">{data.device}</p>
          <p className="avg-session-modal__tooltip-value">
            Avg. Duration: <span>{data.avgDurationFormatted}</span>
          </p>
          <p className="avg-session-modal__tooltip-value">
            Sessions: <span>{data.sessions.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Tooltip kustom untuk chart bar halaman dengan durasi sesi terpanjang.
   * Menampilkan judul halaman, durasi rata-rata, dan jumlah kunjungan.
   * 
   * @param {Object} props - Props tooltip
   * @param {boolean} props.active - Status aktif tooltip
   * @param {Array} props.payload - Data yang ditampilkan
   * @returns {JSX.Element|null} Tooltip kustom atau null jika tidak aktif
   */
  const CustomPagesTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="avg-session-modal__custom-tooltip">
          <p className="avg-session-modal__tooltip-label">
            {data.title || "Unknown Page"}
          </p>
          <p className="avg-session-modal__tooltip-value">
            Avg. Duration: <span>{data.avgDurationFormatted}</span>
          </p>
          <p className="avg-session-modal__tooltip-value">
            Page Views: <span>{data.views.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

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

  // === Komponen Pesan "No Data" ===
  /**
   * Merender pesan ketika tidak ada data untuk tab tertentu.
   * Menyesuaikan ikon dan pesan berdasarkan jenis tab.
   * 
   * @param {'trend'|'device'|'pages'} tab - Jenis tab yang tidak memiliki data
   * @returns {JSX.Element} Pesan no data yang sesuai konteks
   */
  const renderNoDataMessage = (tab) => {
    const messages = {
      trend: {
        icon: <TrendingUp size={48} />,
        title: "No Trend Data",
        description: "Aggregated session duration trend is not yet available.",
      },
      device: {
        icon: <Monitor size={48} />,
        title: "No Device Data",
        description: "No device breakdown data available for this period.",
      },
      pages: {
        icon: <FileText size={48} />,
        title: "No Page Data",
        description: "No page engagement data available for this period.",
      },
    };

    const msg = messages[tab] || messages.trend;

    return (
      <div className="avg-session-modal__no-data-tab">
        <div className="avg-session-modal__no-data-icon">{msg.icon}</div>
        <h4 className="avg-session-modal__no-data-title">{msg.title}</h4>
        <p className="avg-session-modal__no-data-description">
          {msg.description}
        </p>
      </div>
    );
  };

  return (
    <>
      <div className="avg-session-modal__chart-toggle-section">
        <div className="avg-session-modal__chart-toggle">
          <button
            className={activeTab === "trend" ? "active" : ""}
            onClick={() => setActiveTab("trend")}
            aria-label="Show session duration trend chart"
          >
            <TrendingUp size={16} /> Trend
          </button>
          <button
            className={activeTab === "device" ? "active" : ""}
            onClick={() => setActiveTab("device")}
            aria-label="Show session duration by device chart"
          >
            <Monitor size={16} /> By Device
          </button>
          <button
            className={activeTab === "pages" ? "active" : ""}
            onClick={() => setActiveTab("pages")}
            aria-label="Show top engaging pages chart"
          >
            <FileText size={16} /> Top Pages
          </button>
        </div>
      </div>

      <div className="avg-session-modal__chart-content">
        {loading ? (
          <div className="avg-session-modal__loading">
            <div className="avg-session-modal__spinner"></div>
            <p>Loading session insights...</p>
          </div>
        ) : error ? (
          <div className="avg-session-modal__error">
            <p>{error}</p>
            <button onClick={onClose} className="btn-cls-error">
              Close
            </button>
          </div>
        ) : (
          <>
            {activeTab === "trend" && (
              <div className="avg-session-modal__chart-section">
                <div className="avg-session-modal__chart-header-trend">
                  <div className="avg-session-modal__chart-header-content">
                    <h3 className="avg-session-modal__chart-title">
                      Avg. Session Duration Trend
                    </h3>
                    <p className="avg-session-modal__chart-description">
                      Average session duration during the selected period.
                    </p>
                  </div>

                  {formattedRange && (
                    <div className="avg-session-modal__date-range">
                      {formattedRange}
                    </div>
                  )}
                </div>
                {data?.trendData && data.trendData.length > 0 ? (
                  <div className="avg-session-modal__line-chart-wrapper">
                    <ResponsiveContainer
                      width="100%"
                      height={300}
                      className="no-focus-outline"
                    >
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
                          domain={["dataMin - 10", "dataMax + 10"]}
                          tickFormatter={(value) => {
                            const mins = Math.floor(value / 60);
                            return `${mins}m`;
                          }}
                        />
                        <RechartsTooltip content={<CustomTrendTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="avgDuration"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          dot={{
                            r: 5,
                            fill: "#8b5cf6",
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                          activeDot={{
                            r: 7,
                            fill: "#8b5cf6",
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

            {activeTab === "device" && (
              <div className="avg-session-modal__chart-section">
                <div className="avg-session-modal__chart-header">
                  <h3 className="avg-session-modal__chart-title">
                    Session Duration by Device
                  </h3>
                  <p className="avg-session-modal__chart-description">
                    Comparison of session duration across device types.
                  </p>
                </div>

                {/* Tambahkan disclaimer */}
                <div className="avg-session-modal__disclaimer">
                  <Info size={16} />
                  <span>
                    This data is based on recorded page visits and may differ
                    from the main analytics.
                  </span>
                </div>

                {data?.deviceBreakdown && data.deviceBreakdown.length > 0 ? (
                  <>
                    <div className="avg-session-modal__bar-chart-wrapper">
                      <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="no-focus-outline"
                      >
                        <BarChart
                          data={data.deviceBreakdown}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="device"
                            stroke="#6b7280"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            stroke="#6b7280"
                            tick={{ fontSize: 12 }}
                            domain={[0, "dataMax + 20"]}
                            tickFormatter={(value) => {
                              const mins = Math.floor(value / 60);
                              return `${mins}m`;
                            }}
                          />
                          <RechartsTooltip content={<CustomDeviceTooltip />} />
                          <Bar
                            dataKey="avgDuration"
                            radius={[4, 4, 0, 0]}
                            name="Avg Duration (seconds)"
                            fill="#8b5cf6"
                          ></Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Desktop Table */}
                    <div className="avg-session-modal__table-container avg-session-modal__table-container--desktop">
                      <h4 className="avg-session-modal__table-title">
                        Device Breakdown
                      </h4>
                      <table className="avg-session-modal__table">
                        <thead>
                          <tr>
                            <th>Device</th>
                            <th>Avg. Duration</th>
                            <th>Sessions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.deviceBreakdown.map((item, index) => (
                            <tr key={index}>
                              <td>{item.device}</td>
                              <td>{item.avgDurationFormatted}</td>
                              <td>{item.sessions.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Table */}
                    <div className="avg-session-modal__table-container avg-session-modal__table-container--mobile">
                      <h4 className="avg-session-modal__table-title">
                        Device Breakdown
                      </h4>
                      <div className="avg-session-modal__mobile-table">
                        {data.deviceBreakdown.map((item, index) => (
                          <div
                            key={index}
                            className="avg-session-modal__mobile-table-row"
                          >
                            <div className="avg-session-modal__mobile-table-cell">
                              <span className="avg-session-modal__mobile-table-label">
                                Device
                              </span>
                              <span className="avg-session-modal__mobile-table-value">
                                {item.device}
                              </span>
                            </div>
                            <div className="avg-session-modal__mobile-table-cell">
                              <span className="avg-session-modal__mobile-table-label">
                                Avg. Duration
                              </span>
                              <span className="avg-session-modal__mobile-table-value">
                                {item.avgDurationFormatted}
                              </span>
                            </div>
                            <div className="avg-session-modal__mobile-table-cell">
                              <span className="avg-session-modal__mobile-table-label">
                                Sessions
                              </span>
                              <span className="avg-session-modal__mobile-table-value">
                                {item.sessions.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  renderNoDataMessage("device")
                )}
              </div>
            )}

            {activeTab === "pages" && (
              <div className="avg-session-modal__chart-section">
                <div className="avg-session-modal__chart-header">
                  <h3 className="avg-session-modal__chart-title">
                    Top Engaging Pages
                  </h3>
                  <p className="avg-session-modal__chart-description">
                    Pages with the longest average session duration.
                  </p>
                </div>

                {/* Tambahkan disclaimer */}
                <div className="avg-session-modal__disclaimer">
                  <Info size={16} />
                  <span>
                    This data is based on recorded page visits and may differ
                    from the main analytics.
                  </span>
                </div>

                {data?.topPages && data.topPages.length > 0 ? (
                  <>
                    <div className="avg-session-modal__bar-chart-wrapper">
                      <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="no-focus-outline"
                      >
                        <BarChart
                          data={data.topPages}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="title"
                            stroke="#6b7280"
                            tick={{ fontSize: 11 }}
                            angle={-40}
                            textAnchor="end"
                            height={40}
                            interval={0}
                            tickFormatter={(v) => truncateLabel(v, 12)}
                          />
                          <YAxis
                            stroke="#6b7280"
                            tick={{ fontSize: 12 }}
                            domain={[0, "dataMax + 20"]}
                            tickFormatter={(value) => {
                              const mins = Math.floor(value / 60);
                              return `${mins}m`;
                            }}
                          />
                          <RechartsTooltip content={<CustomPagesTooltip />} />
                          <Bar
                            dataKey="avgDuration"
                            radius={[4, 4, 0, 0]}
                            name="Avg Duration (seconds)"
                            fill="#8b5cf6"
                          ></Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Desktop Table */}
                    <div className="avg-session-modal__table-container avg-session-modal__table-container--desktop">
                      <h4 className="avg-session-modal__table-title">
                        Pages Breakdown
                      </h4>
                      <table className="avg-session-modal__table">
                        <thead>
                          <tr>
                            <th>Page</th>
                            <th>Avg. Duration</th>
                            <th>Page Views</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topPages.map((item, index) => (
                            <tr key={index}>
                              <td>
                                <div className="avg-session-modal__page-title">
                                  {item.title || "Untitled Page"}
                                </div>
                                <div className="avg-session-modal__page-url">
                                  {item.path || "/"}
                                </div>
                              </td>
                              <td>{item.avgDurationFormatted}</td>
                              <td>{item.views.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Table */}
                    <div className="avg-session-modal__table-container avg-session-modal__table-container--mobile">
                      <h4 className="avg-session-modal__table-title">
                        Pages Breakdown
                      </h4>
                      <div className="avg-session-modal__mobile-table">
                        {data.topPages.map((item, index) => (
                          <div
                            key={index}
                            className="avg-session-modal__mobile-table-row"
                          >
                            <div className="avg-session-modal__mobile-table-cell">
                              <span className="avg-session-modal__mobile-table-label">
                                Page Title
                              </span>
                              <span className="avg-session-modal__mobile-table-value">
                                {item.title || "Untitled Page"}
                              </span>
                            </div>
                            <div className="avg-session-modal__mobile-table-cell">
                              <span className="avg-session-modal__mobile-table-label">
                                Page URL
                              </span>
                              <span className="avg-session-modal__mobile-table-value">
                                {item.path || "/"}
                              </span>
                            </div>
                            <div className="avg-session-modal__mobile-table-cell">
                              <span className="avg-session-modal__mobile-table-label">
                                Avg. Duration
                              </span>
                              <span className="avg-session-modal__mobile-table-value">
                                {item.avgDurationFormatted}
                              </span>
                            </div>
                            <div className="avg-session-modal__mobile-table-cell">
                              <span className="avg-session-modal__mobile-table-label">
                                Page Views
                              </span>
                              <span className="avg-session-modal__mobile-table-value">
                                {item.views.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  renderNoDataMessage("pages")
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default AvgSessionModal;