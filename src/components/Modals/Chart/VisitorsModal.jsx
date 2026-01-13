/**
 * @file VisitorsModal.jsx
 * @description Komponen modal untuk menampilkan insight detail pengunjung website.
 * Menyediakan tiga tab utama:
 * - **Trend**: Grafik garis tren pengunjung baru vs returning
 * - **Countries**: Distribusi pengunjung berdasarkan negara asal
 * - **Technology**: Breakdown teknologi (device, browser, OS)
 * 
 * Menggunakan Recharts untuk visualisasi data dengan:
 * - Tooltip kustom yang informatif
 * - Responsivitas untuk mobile/desktop
 * - Penanganan data kosong yang elegan
 */

import React, { useState, useEffect } from "react";
import {
  Globe,
  Smartphone,
  TrendingUp,
  Globe as GlobeIcon,
} from "lucide-react";
import { analyticsService } from "../../../services/analyticsService";
import { baseService } from "../../../services/baseService";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "../../../sass/components/Modals/VisitorsModal/VisitorsModal.scss";

/**
 * Props untuk komponen VisitorsModal.
 * @typedef {Object} VisitorsModalProps
 * @property {string} startDate - Tanggal mulai filter (YYYY-MM-DD)
 * @property {string} endDate - Tanggal akhir filter (YYYY-MM-DD)
 * @property {function(): void} onClose - Handler saat modal ditutup
 */

/**
 * Komponen modal insight pengunjung.
 * Menampilkan visualisasi data analitik pengunjung dalam format yang mudah dipahami.
 *
 * @component
 * @param {VisitorsModalProps} props - Props komponen
 */
const VisitorsModal = ({ startDate, endDate, onClose }) => {
  /**
   * Tab chart aktif di tingkat atas.
   * @type {['trend'|'countries'|'device', React.Dispatch<React.SetStateAction<...>>]}
   */
  const [activeChart, setActiveChart] = useState("trend");

  /**
   * Sub-tab chart aktif untuk tab technology.
   * @type {['device'|'browser'|'os', React.Dispatch<React.SetStateAction<...>>]}
   */
  const [activeDeviceChart, setActiveDeviceChart] = useState("device");

  /**
   * Status loading saat mengambil data insight.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(true);

  /**
   * Data insight pengunjung dari service.
   * @type {Object|null}
   */
  const [data, setData] = useState(null);

  /**
   * Pesan error jika gagal mengambil data.
   * @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]}
   */
  const [error, setError] = useState(null);

  /**
   * Status deteksi perangkat mobile.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isMobile, setIsMobile] = useState(false);

  // ===========================
  //  Fetch Visitor Insights
  // ===========================
  /**
   * Mengambil data insight pengunjung dari analytics service.
   * Dipanggil saat rentang tanggal berubah.
   */
  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) return;

      setLoading(true);
      setError(null);

      try {
        const result = await analyticsService.getVisitorInsights(
          startDate,
          endDate
        );

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || "Failed to load visitor data");
        }
      } catch (err) {
        console.error("Error loading visitor data", err);
        setError("An error occurred while loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Deteksi perangkat mobile untuk optimasi UI
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ===========================
  //  Custom Tooltips
  // ===========================

  /**
   * Tooltip kustom untuk chart garis tren pengunjung.
   * Menampilkan jumlah pengunjung baru dan returning.
   * 
   * @param {Object} props - Props tooltip
   * @param {boolean} props.active - Status aktif tooltip
   * @param {Array} props.payload - Data yang ditampilkan
   * @param {string} props.label - Label sumbu X
   * @returns {JSX.Element|null} Tooltip kustom atau null jika tidak aktif
   */
  const CustomLineTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const d = payload.reduce((acc, entry) => {
      acc[entry.name] = entry.value;
      return acc;
    }, {});

    return (
      <div className="visitors-custom-tooltip">
        <p className="visitors-tooltip-label">{label}</p>
        <p className="visitors-tooltip-value">
          New Visitors: <span>{d["New Visitors"]?.toLocaleString()}</span>
        </p>
        <p className="visitors-tooltip-value">
          Returning Visitors:{" "}
          <span>{d["Returning Visitors"]?.toLocaleString()}</span>
        </p>
      </div>
    );
  };

  /**
   * Tooltip kustom untuk chart pie breakdown.
   * Menampilkan nama kategori, jumlah kunjungan, dan persentase.
   * 
   * @param {Object} props - Props tooltip
   * @param {boolean} props.active - Status aktif tooltip
   * @param {Array} props.payload - Data yang ditampilkan
   * @returns {JSX.Element|null} Tooltip kustom atau null jika tidak aktif
   */
  const CustomPieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const item = payload[0].payload;
    const name =
      item.country || item.device || item.browser || item.os || "Unknown";

    return (
      <div className="visitors-custom-tooltip">
        <p className="visitors-tooltip-label">{name}</p>
        <p className="visitors-tooltip-value">
          {(item.views || 0).toLocaleString()} visits
        </p>
        <p className="visitors-tooltip-percentage">
          {item.percentage.toFixed(2)}%
        </p>
      </div>
    );
  };

  /**
   * Merender pesan ketika tidak ada data untuk tab tertentu.
   * Menyesuaikan ikon dan pesan berdasarkan jenis tab.
   * 
   * @param {'trend'|'countries'|'device'} tab - Jenis tab yang tidak memiliki data
   * @param {'device'|'browser'|'os'} [subTab=null] - Sub-tab untuk tab technology
   * @returns {JSX.Element} Pesan no data yang sesuai konteks
   */
  const renderNoDataMessage = (tab, subTab = null) => {
    const messages = {
      trend: {
        icon: <TrendingUp size={48} />,
        title: "No Trend Data Available",
        description:
          "Aggregated visitor trend data is not yet available for this period.",
      },
      countries: {
        icon: <GlobeIcon size={48} />,
        title: "No Country Data Available",
        description:
          "Visitor location data could not be determined for this period.",
      },
      device: {
        icon: <Smartphone size={48} />,
        title: `${
          subTab === "browser"
            ? "Browser"
            : subTab === "os"
            ? "Operating System"
            : "Device"
        } Data Available`,
        description: `${
          subTab === "browser" ? "Browser" : subTab === "os" ? "OS" : "Device"
        } information is not available for this period.`,
      },
    };

    const msg = messages[tab] || messages.trend;

    return (
      <div className="visitors-no-data-tab">
        <div className="visitors-no-data-icon">{msg.icon}</div>
        <h4 className="visitors-no-data-title">{msg.title}</h4>
        <p className="visitors-no-data-description">{msg.description}</p>
      </div>
    );
  };

  return (
    <>
      <div className="visitors-chart-toggle-section">
        <div className="visitors-chart-toggle">
          <button
            className={activeChart === "trend" ? "active" : ""}
            onClick={() => setActiveChart("trend")}
            aria-label="Show visitor trend chart"
          >
            <TrendingUp size={16} /> Trend
          </button>
          <button
            className={activeChart === "countries" ? "active" : ""}
            onClick={() => setActiveChart("countries")}
            aria-label="Show visitor countries chart"
          >
            <Globe size={16} /> Countries
          </button>
          <button
            className={activeChart === "device" ? "active" : ""}
            onClick={() => setActiveChart("device")}
            aria-label="Show visitor technology chart"
          >
            <Smartphone size={16} /> Technology
          </button>
        </div>

        <div className="visitors-date-range-label">
          {startDate && endDate ? (
            <span>
              {baseService.formatDate(startDate)} –{" "}
              {baseService.formatDate(endDate)}
            </span>
          ) : (
            <span>Selected range: N/A</span>
          )}
        </div>
      </div>

      <div className="visitors-chart-content">
        {loading ? (
          <div className="visitors-loading">
            <div className="visitors-spinner"></div>
            <p>Loading visitor insights...</p>
          </div>
        ) : error ? (
          <div className="visitors-error">
            <p>{error}</p>
            <button onClick={onClose} className="btn-cls-error">
              Close
            </button>
          </div>
        ) : (
          <>
            {activeChart === "trend" && (
              <div className="visitors-chart-section">
                <div className="visitors-chart-header">
                  <h3 className="visitors-chart-title">
                    Visitor Behavior Trend
                  </h3>
                  <p className="visitors-chart-description">
                    <strong>New Visitors</strong>: Total new visitors
                    (aggregated).
                    <br />
                    <strong>Returning Visitors</strong>: Total returning
                    visitors (aggregated).
                  </p>
                </div>

                {!data?.trendData || data.trendData.length === 0 ? (
                  renderNoDataMessage("trend")
                ) : (
                  <div className="visitors-line-chart-wrapper">
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
                          domain={[0, "dataMax + 100"]}
                        />
                        <RechartsTooltip content={<CustomLineTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="visitors"
                          name="New Visitors"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{
                            r: 5,
                            fill: "#3b82f6",
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                          activeDot={{
                            r: 7,
                            fill: "#3b82f6",
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="uniqueVisitors"
                          name="Returning Visitors"
                          stroke="#D946ef"
                          strokeWidth={3}
                          dot={{
                            r: 5,
                            fill: "#D946ef",
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                          activeDot={{
                            r: 7,
                            fill: "#D946ef",
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {activeChart === "countries" && (
              <div className="visitors-chart-section">
                <div className="visitors-chart-header">
                  <h3 className="visitors-chart-title">Top Countries</h3>
                  <p className="visitors-chart-description">
                    Visitor distribution by country of origin for the selected
                    period.
                  </p>
                </div>
                {data?.countryBreakdown && data.countryBreakdown.length > 0 ? (
                  <>
                    <div className="visitors-pie-chart-wrapper">
                      <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="no-focus-outline"
                      >
                        <PieChart>
                          <Pie
                            data={data.countryBreakdown.slice(0, 5)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#3b82f6"
                            dataKey="views"
                            nameKey="country"
                            label={({ country, percentage }) => {
                              return isMobile
                                ? `${percentage.toFixed(2)}%`
                                : `${country} (${percentage.toFixed(2)}%)`;
                            }}
                          >
                            {data.countryBreakdown
                              .slice(0, 5)
                              .map((_, index) => (
                                <Cell key={`cell-${index}`} fill="#3b82f6" />
                              ))}
                          </Pie>
                          <RechartsTooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="visitors-breakdown-list">
                      <h4 className="visitors-breakdown-title">
                        Breakdown Detail
                      </h4>
                      {data.countryBreakdown.slice(0, 5).map((item, i) => (
                        <div key={i} className="visitors-breakdown-item">
                          <div className="visitors-breakdown-info">
                            <span className="visitors-breakdown-color-indicator" />
                            <span className="visitors-breakdown-name">
                              {item.country === "Unknown"
                                ? "Other"
                                : item.country}
                            </span>
                            <span className="visitors-breakdown-value">
                              {item.views.toLocaleString()} visits
                            </span>
                          </div>
                          <div className="visitors-breakdown-bar">
                            <div
                              className="visitors-breakdown-bar-fill"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="visitors-breakdown-percentage">
                            {item.percentage.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  renderNoDataMessage("countries")
                )}
              </div>
            )}

            {activeChart === "device" && (
              <div className="visitors-chart-section">
                <div className="visitors-chart-header">
                  <h3 className="visitors-chart-title">Technology Breakdown</h3>
                  <p className="visitors-chart-description">
                    Visitor distribution by device, browser, and operating
                    system.
                  </p>
                </div>

                <div className="visitors-sub-chart-toggle">
                  <button
                    className={activeDeviceChart === "device" ? "active" : ""}
                    onClick={() => setActiveDeviceChart("device")}
                    aria-label="Show device breakdown"
                  >
                    Device
                  </button>
                  <button
                    className={activeDeviceChart === "browser" ? "active" : ""}
                    onClick={() => setActiveDeviceChart("browser")}
                    aria-label="Show browser breakdown"
                  >
                    Browser
                  </button>
                  <button
                    className={activeDeviceChart === "os" ? "active" : ""}
                    onClick={() => setActiveDeviceChart("os")}
                    aria-label="Show operating system breakdown"
                  >
                    OS
                  </button>
                </div>

                {(activeDeviceChart === "device" &&
                  data?.deviceBreakdown?.length > 0) ||
                (activeDeviceChart === "browser" &&
                  data?.browserBreakdown?.length > 0) ||
                (activeDeviceChart === "os" &&
                  data?.osBreakdown?.length > 0) ? (
                  <>
                    <div className="visitors-pie-chart-wrapper">
                      <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="no-focus-outline"
                      >
                        <PieChart>
                          <Pie
                            data={
                              activeDeviceChart === "device"
                                ? data.deviceBreakdown
                                : activeDeviceChart === "browser"
                                ? data.browserBreakdown
                                : data.osBreakdown
                            }
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#3b82f6"
                            dataKey="views"
                            nameKey={
                              activeDeviceChart === "device"
                                ? "device"
                                : activeDeviceChart === "browser"
                                ? "browser"
                                : "os"
                            }
                            label={({ name, percentage }) => {
                              return isMobile
                                ? `${percentage.toFixed(2)}%`
                                : `${name} (${percentage.toFixed(2)}%)`;
                            }}
                          >
                            {(activeDeviceChart === "device"
                              ? data.deviceBreakdown
                              : activeDeviceChart === "browser"
                              ? data.browserBreakdown
                              : data.osBreakdown
                            )
                              .slice(0, 5)
                              .map((_, index) => (
                                <Cell key={`cell-${index}`} fill="#3b82f6" />
                              ))}
                          </Pie>
                          <RechartsTooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="visitors-breakdown-list">
                      <h4 className="visitors-breakdown-title">
                        Breakdown Detail
                      </h4>
                      {(activeDeviceChart === "device"
                        ? data.deviceBreakdown
                        : activeDeviceChart === "browser"
                        ? data.browserBreakdown
                        : data.osBreakdown
                      )
                        .slice(0, 5)
                        .map((item, i) => (
                          <div key={i} className="visitors-breakdown-item">
                            <div className="visitors-breakdown-info">
                              <span className="visitors-breakdown-color-indicator" />
                              <span className="visitors-breakdown-name">
                                {item.device ||
                                  item.browser ||
                                  item.os ||
                                  "Unknown"}
                              </span>
                              <span className="visitors-breakdown-value">
                                {item.views.toLocaleString()} visits
                              </span>
                            </div>
                            <div className="visitors-breakdown-bar">
                              <div
                                className="visitors-breakdown-bar-fill"
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                            <span className="visitors-breakdown-percentage">
                              {item.percentage.toFixed(2)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  renderNoDataMessage("device", activeDeviceChart)
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default VisitorsModal;