/**
 * @file BounceRateModal.jsx
 * @description Komponen modal untuk menampilkan insight detail bounce rate website.
 * Menyediakan tiga tab utama:
 * - **Trend**: Grafik garis tren bounce rate harian
 * - **High Bounce Pages**: Halaman dengan bounce rate tertinggi
 * - **Referrer Impact**: Distribusi bounce rate berdasarkan sumber traffic
 * 
 * Menggunakan Recharts untuk visualisasi data dengan:
 * - Reference area berwarna untuk threshold bounce rate
 * - Tooltip kustom yang informatif
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
  Cell,
  BarChart,
  Bar,
  ReferenceArea,
} from "recharts";

import { TrendingUp, FileText, Info, BarChart3 } from "lucide-react";
import { analyticsService } from "../../../services/analyticsService";
import { baseService } from "../../../services/baseService";
import "../../../sass/components/Modals/BounceRateModal/BounceRateModal.scss";

/**
 * Props untuk komponen BounceRateModal.
 * @typedef {Object} BounceRateModalProps
 * @property {string} startDate - Tanggal mulai filter (YYYY-MM-DD)
 * @property {string} endDate - Tanggal akhir filter (YYYY-MM-DD)
 * @property {function(): void} onClose - Handler saat modal ditutup
 */

/**
 * Komponen modal insight bounce rate.
 * Menampilkan visualisasi data analitik bounce rate dalam format yang mudah dipahami.
 *
 * @component
 * @param {BounceRateModalProps} props - Props komponen
 */
const BounceRateModal = ({ startDate, endDate, onClose }) => {
  /**
   * Tab aktif di modal insight bounce rate.
   * @type {['trend'|'pages'|'referrer', React.Dispatch<React.SetStateAction<...>>]}
   */
  const [activeTab, setActiveTab] = useState("trend");

  /**
   * Status loading saat mengambil data insight.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(true);

  /**
   * Data insight bounce rate dari service.
   * @type {Object|null}
   */
  const [data, setData] = useState(null);

  /**
   * Pesan error jika gagal mengambil data.
   * @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]}
   */
  const [error, setError] = useState(null);

  /** @type {boolean} Status deteksi perangkat mobile */
  const isMobile = window.innerWidth < 768;

  /** @type {string} Rentang tanggal terformat untuk ditampilkan di UI */
  const formattedRange =
    startDate && endDate
      ? `${baseService.formatDate(startDate)} – ${baseService.formatDate(
          endDate
        )}`
      : "";

  // Fetch data insight bounce rate
  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await analyticsService.getBounceRateDetail(
          startDate,
          endDate
        );

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || "Failed to load bounce rate data");
        }
      } catch (err) {
        console.error("Error loading bounce rate data", err);
        setError("An error occurred while loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  /**
   * Mendapatkan warna berdasarkan tingkat bounce rate.
   * - Hijau: < 40% (rendah)
   * - Kuning: 40-60% (sedang)
   * - Merah: > 60% (tinggi)
   * 
   * @param {number} rate - Persentase bounce rate
   * @returns {string} Kode warna hex
   */
  const getBounceRateColor = (rate) => {
    if (rate < 40) return "#10b981";
    if (rate <= 60) return "#f59e0b";
    return "#dc2626";
  };

  /**
   * Mendapatkan warna teks untuk badge bounce rate.
   * Saat ini selalu mengembalikan warna putih untuk kontras yang baik.
   * 
   * @param {number} rate - Persentase bounce rate
   * @returns {string} Warna teks
   */
  const getBounceRateTextColor = (rate) => {
    return "white";
  };

  /** @type {{ low: string, medium: string, high: string }} Label threshold bounce rate */
  const ThresholdLabels = {
    low: "Low (under 40%)",
    medium: "Medium (40–60%)",
    high: "High (over 60%)",
  };

  // === Custom Tooltips ===
  /**
   * Tooltip kustom untuk chart garis tren bounce rate.
   * Menampilkan tanggal dan persentase bounce rate.
   * 
   * @param {Object} props - Props tooltip
   * @param {boolean} props.active - Status aktif tooltip
   * @param {Array} props.payload - Data yang ditampilkan
   * @param {string} props.label - Label sumbu X (tanggal)
   * @returns {JSX.Element|null} Tooltip kustom atau null jika tidak aktif
   */
  const CustomLineTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bounce-rate-modal__custom-tooltip">
          <p className="bounce-rate-modal__tooltip-label">{label}</p>
          <p className="bounce-rate-modal__tooltip-value">
            Bounce Rate: <span>{payload[0].value}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Tooltip kustom untuk chart bar halaman dengan bounce rate tinggi.
   * Menampilkan judul halaman, bounce rate, dan jumlah kunjungan.
   * 
   * @param {Object} props - Props tooltip
   * @param {boolean} props.active - Status aktif tooltip
   * @param {Array} props.payload - Data yang ditampilkan
   * @returns {JSX.Element|null} Tooltip kustom atau null jika tidak aktif
   */
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bounce-rate-modal__custom-tooltip">
          <p className="bounce-rate-modal__tooltip-label">
            {data.title || "Unknown Page"}
          </p>
          <p className="bounce-rate-modal__tooltip-value">
            Bounce Rate: <span>{data.bounceRate}%</span>
          </p>
          <p className="bounce-rate-modal__tooltip-value">
            Page Views: <span>{(data.pageViews || 0).toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Tooltip kustom untuk chart bar distribusi referrer.
   * Menampilkan sumber traffic, bounce rate, dan jumlah sesi.
   * 
   * @param {Object} props - Props tooltip
   * @param {boolean} props.active - Status aktif tooltip
   * @param {Array} props.payload - Data yang ditampilkan
   * @returns {JSX.Element|null} Tooltip kustom atau null jika tidak aktif
   */
  const CustomReferrerTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bounce-rate-modal__custom-tooltip">
          <p className="bounce-rate-modal__tooltip-label">{data.source}</p>
          <p className="bounce-rate-modal__tooltip-value">
            Bounce Rate: <span>{data.bounceRate}%</span>
          </p>
          <p className="bounce-rate-modal__tooltip-value">
            Sessions: <span>{data.views.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // === Komponen Pesan "No Data" ===
  /**
   * Merender pesan ketika tidak ada data untuk tab tertentu.
   * Menyesuaikan ikon dan pesan berdasarkan jenis tab.
   * 
   * @param {'trend'|'pages'|'referrer'} tab - Jenis tab yang tidak memiliki data
   * @param {string} [customMessage=null] - Pesan kustom opsional
   * @returns {JSX.Element} Pesan no data yang sesuai konteks
   */
  const renderNoDataMessage = (tab, customMessage = null) => {
    const messages = {
      trend:
        customMessage || "Aggregated bounce rate trend is not yet available.",
      pages: "No high bounce pages data available for this period.",
      referrer: "No referrer data available for this period.",
    };

    const icons = {
      trend: <TrendingUp size={48} />,
      pages: <FileText size={48} />,
      referrer: <BarChart3 size={48} />,
    };

    const titles = {
      trend: "No Trend Data",
      pages: "No High Bounce Pages",
      referrer: "No Referrer Data",
    };

    return (
      <div className="bounce-rate-modal__no-data-tab">
        <div className="bounce-rate-modal__no-data-icon">{icons[tab]}</div>
        <h4 className="bounce-rate-modal__no-data-title">{titles[tab]}</h4>
        <p className="bounce-rate-modal__no-data-description">
          {messages[tab]}
        </p>
      </div>
    );
  };

  return (
    <>
      <div className="bounce-rate-modal__chart-toggle-section">
        <div className="bounce-rate-modal__chart-toggle">
          <button
            className={activeTab === "trend" ? "active" : ""}
            onClick={() => setActiveTab("trend")}
            aria-label="Show bounce rate trend chart"
          >
            <TrendingUp size={16} /> Trend
          </button>

          <button
            className={activeTab === "pages" ? "active" : ""}
            onClick={() => setActiveTab("pages")}
            aria-label="Show high bounce pages chart"
          >
            <FileText size={16} /> High Bounce Pages
          </button>

          <button
            className={activeTab === "referrer" ? "active" : ""}
            onClick={() => setActiveTab("referrer")}
            aria-label="Show referrer impact chart"
          >
            <BarChart3 size={16} /> Referrer Impact
          </button>
        </div>
      </div>

      <div className="bounce-rate-modal__chart-content">
        {loading ? (
          <div className="bounce-rate-modal__loading">
            <div className="bounce-rate-modal__spinner"></div>
            <p>Loading bounce rate data...</p>
          </div>
        ) : error ? (
          <div className="bounce-rate-modal__error">
            <p>{error}</p>
            <button onClick={onClose} className="btn-cls-error">
              Close
            </button>
          </div>
        ) : (
          <>
            {activeTab === "trend" && (
              <div className="bounce-rate-modal__chart-section">
                <div className="bounce-rate-modal__chart-header-trend">
                  <div className="bounce-rate-modal__chart-header-content">
                    <h3 className="bounce-rate-modal__chart-title">
                      Bounce Rate Trend
                    </h3>
                    <p className="bounce-rate-modal__chart-description">
                      Bounce rate trend over time for the selected period.
                    </p>
                  </div>

                  {/* Date range di sisi kanan header */}
                  {formattedRange && (
                    <div className="bounce-rate-modal__date-range">
                      {formattedRange}
                    </div>
                  )}
                </div>

                {data?.trend?.length < 2 ? (
                  renderNoDataMessage(
                    "trend",
                    "Please select a date range of at least 2 days to view the trend."
                  )
                ) : (
                  <>
                    {data?.trendData && data.trendData.length > 0 ? (
                      <>
                        <div className="bounce-rate-modal__line-chart-wrapper">
                          <ResponsiveContainer
                            width="100%"
                            height={300}
                            className="no-focus-outline"
                          >
                            <LineChart
                              data={data.trendData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 20,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e5e7eb"
                              />
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
                                domain={[0, 100]}
                                tickFormatter={(value) => `${value}%`}
                              />
                              <RechartsTooltip
                                content={<CustomLineTooltip />}
                              />

                              <ReferenceArea
                                y1={0}
                                y2={40}
                                fill="#10b981"
                                fillOpacity={0.1}
                                stroke="none"
                              />
                              <ReferenceArea
                                y1={40}
                                y2={60}
                                fill="#f59e0b"
                                fillOpacity={0.1}
                                stroke="none"
                              />
                              <ReferenceArea
                                y1={60}
                                y2={100}
                                fill="#dc2626"
                                fillOpacity={0.1}
                                stroke="none"
                              />

                              <Line
                                type="monotone"
                                dataKey="rate"
                                stroke="#4b5563"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "#4b5563" }}
                                activeDot={{ r: 6, fill: "#4b5563" }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="bounce-rate-modal__threshold-info">
                          <div className="bounce-rate-modal__threshold-item">
                            <span
                              className="bounce-rate-modal__color-box"
                              style={{ backgroundColor: "#10b981" }}
                            ></span>
                            {ThresholdLabels.low}
                          </div>
                          <div className="bounce-rate-modal__threshold-item">
                            <span
                              className="bounce-rate-modal__color-box"
                              style={{ backgroundColor: "#f59e0b" }}
                            ></span>
                            {ThresholdLabels.medium}
                          </div>
                          <div className="bounce-rate-modal__threshold-item">
                            <span
                              className="bounce-rate-modal__color-box"
                              style={{ backgroundColor: "#dc2626" }}
                            ></span>
                            {ThresholdLabels.high}
                          </div>
                        </div>
                      </>
                    ) : (
                      renderNoDataMessage("trend")
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "pages" && (
              <div className="bounce-rate-modal__chart-section">
                <div className="bounce-rate-modal__chart-header">
                  <h3 className="bounce-rate-modal__chart-title">
                    Top High Bounce Pages
                  </h3>
                  <p className="bounce-rate-modal__chart-description">
                    Pages with the highest bounce rates.
                  </p>
                </div>

                {/* Tambahkan disclaimer */}
                <div className="bounce-rate-modal__disclaimer">
                  <Info size={16} />
                  <span>
                    This data is based on recorded page visits and may differ
                    from the main analytics.
                  </span>
                </div>

                {data?.highBouncePages && data.highBouncePages.length > 0 ? (
                  <>
                    <div className="bounce-rate-modal__bar-chart-wrapper">
                      <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="no-focus-outline"
                      >
                        <BarChart
                          data={data.highBouncePages.slice(0, 5)}
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
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            stroke="#6b7280"
                            tick={{ fontSize: 12 }}
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <RechartsTooltip content={<CustomBarTooltip />} />
                          <Bar
                            dataKey="bounceRate"
                            radius={[4, 4, 0, 0]}
                            label={{
                              position: "top",
                              fill: "#64748b",
                              fontSize: 12,
                              formatter: (value) => `${value}%`,
                            }}
                          >
                            {data.highBouncePages
                              .slice(0, 5)
                              .map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={getBounceRateColor(entry.bounceRate)}
                                />
                              ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bounce-rate-modal__threshold-info--bar">
                      <div className="bounce-rate-modal__threshold-item">
                        <span
                          className="bounce-rate-modal__color-box"
                          style={{ backgroundColor: "#10b981" }}
                        ></span>
                        {ThresholdLabels.low}
                      </div>
                      <div className="bounce-rate-modal__threshold-item">
                        <span
                          className="bounce-rate-modal__color-box"
                          style={{ backgroundColor: "#f59e0b" }}
                        ></span>
                        {ThresholdLabels.medium}
                      </div>
                      <div className="bounce-rate-modal__threshold-item">
                        <span
                          className="bounce-rate-modal__color-box"
                          style={{ backgroundColor: "#dc2626" }}
                        ></span>
                        {ThresholdLabels.high}
                      </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="bounce-rate-modal__table-container bounce-rate-modal__table-container--desktop">
                      <h4 className="bounce-rate-modal__table-title">
                        Pages Breakdown
                      </h4>
                      <table className="bounce-rate-modal__table">
                        <thead>
                          <tr>
                            <th>Page</th>
                            <th>Bounce Rate</th>
                            <th>Page Views</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.highBouncePages.map((page, index) => (
                            <tr key={index}>
                              <td>
                                <div className="bounce-rate-modal__page-title">
                                  {page.title || "Untitled Page"}
                                </div>
                                <div className="bounce-rate-modal__page-url">
                                  {page.url || "/"}
                                </div>
                              </td>
                              <td>
                                <span
                                  className="bounce-rate-modal__bounce-badge"
                                  style={{
                                    backgroundColor: getBounceRateColor(
                                      page.bounceRate
                                    ),
                                    color: getBounceRateTextColor(
                                      page.bounceRate
                                    ),
                                  }}
                                >
                                  {page.bounceRate}%
                                </span>
                              </td>
                              <td>{(page.pageViews || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Table */}
                    <div className="bounce-rate-modal__table-container bounce-rate-modal__table-container--mobile">
                      <h4 className="bounce-rate-modal__table-title">
                        Pages Breakdown
                      </h4>
                      <div className="bounce-rate-modal__mobile-table">
                        {data.highBouncePages.map((page, index) => (
                          <div
                            key={index}
                            className="bounce-rate-modal__mobile-table-row"
                          >
                            <div className="bounce-rate-modal__mobile-table-cell">
                              <span className="bounce-rate-modal__mobile-table-label">
                                Page Title
                              </span>
                              <span className="bounce-rate-modal__mobile-table-value">
                                {page.title || "Untitled Page"}
                              </span>
                            </div>
                            <div className="bounce-rate-modal__mobile-table-cell">
                              <span className="bounce-rate-modal__mobile-table-label">
                                Page URL
                              </span>
                              <span className="bounce-rate-modal__mobile-table-value">
                                {page.url || "/"}
                              </span>
                            </div>
                            <div className="bounce-rate-modal__mobile-table-cell">
                              <span className="bounce-rate-modal__mobile-table-label">
                                Bounce Rate
                              </span>
                              <span className="bounce-rate-modal__mobile-table-value">
                                <span
                                  className="bounce-rate-modal__bounce-badge"
                                  style={{
                                    backgroundColor: getBounceRateColor(
                                      page.bounceRate
                                    ),
                                    color: getBounceRateTextColor(
                                      page.bounceRate
                                    ),
                                    fontSize: "0.75rem",
                                    padding: "2px 6px",
                                  }}
                                >
                                  {page.bounceRate}%
                                </span>
                              </span>
                            </div>
                            <div className="bounce-rate-modal__mobile-table-cell">
                              <span className="bounce-rate-modal__mobile-table-label">
                                Page Views
                              </span>
                              <span className="bounce-rate-modal__mobile-table-value">
                                {(page.pageViews || 0).toLocaleString()}
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

            {activeTab === "referrer" && (
              <div className="bounce-rate-modal__chart-section">
                <div className="bounce-rate-modal__chart-header">
                  <h3 className="bounce-rate-modal__chart-title">
                    Bounce Rate by Traffic Source
                  </h3>
                  <p className="bounce-rate-modal__chart-description">
                    Bounce rate distribution across traffic sources.
                  </p>
                </div>

                {/* Tambahkan disclaimer */}
                <div className="bounce-rate-modal__disclaimer">
                  <Info size={16} />
                  <span>
                    This data is based on recorded page visits and may differ
                    from the main analytics.
                  </span>
                </div>

                {data?.referrerData?.length > 0 ? (
                  <>
                    <div className="bounce-rate-modal__bar-chart-wrapper">
                      <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="no-focus-outline"
                      >
                        <BarChart
                          data={data.referrerData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                            horizontal={false}
                          />
                          <YAxis
                            type="number"
                            stroke="#6b7280"
                            tick={{ fontSize: 12 }}
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <XAxis
                            dataKey="source"
                            type="category"
                            stroke="#6b7280"
                            width={100}
                            tick={{ fontSize: 12 }}
                          />
                          <RechartsTooltip
                            content={<CustomReferrerTooltip />}
                          />
                          <Bar
                            dataKey="bounceRate"
                            radius={[4, 4, 0, 0]}
                            label={{
                              position: "top",
                              fill: "#64748b",
                              fontSize: 12,
                              formatter: (value) => `${value}%`,
                            }}
                          >
                            {data.referrerData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={getBounceRateColor(entry.bounceRate)}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bounce-rate-modal__threshold-info--bar">
                      <div className="bounce-rate-modal__threshold-item">
                        <span
                          className="bounce-rate-modal__color-box"
                          style={{ backgroundColor: "#10b981" }}
                        ></span>
                        {ThresholdLabels.low}
                      </div>
                      <div className="bounce-rate-modal__threshold-item">
                        <span
                          className="bounce-rate-modal__color-box"
                          style={{ backgroundColor: "#f59e0b" }}
                        ></span>
                        {ThresholdLabels.medium}
                      </div>
                      <div className="bounce-rate-modal__threshold-item">
                        <span
                          className="bounce-rate-modal__color-box"
                          style={{ backgroundColor: "#dc2626" }}
                        ></span>
                        {ThresholdLabels.high}
                      </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="bounce-rate-modal__table-container bounce-rate-modal__table-container--desktop">
                      <h4 className="bounce-rate-modal__table-title">
                        Referrer Breakdown
                      </h4>
                      <table className="bounce-rate-modal__table bounce-rate-modal__table--referrer">
                        <thead>
                          <tr>
                            <th>Source</th>
                            <th>Bounce Rate</th>
                            <th>Page Views</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.referrerData.map((source, index) => (
                            <tr key={index}>
                              <td>{source.source || "Unknown"}</td>
                              <td>
                                <span
                                  className="bounce-rate-modal__bounce-badge"
                                  style={{
                                    backgroundColor: getBounceRateColor(
                                      source.bounceRate
                                    ),
                                    color: getBounceRateTextColor(
                                      source.bounceRate
                                    ),
                                  }}
                                >
                                  {source.bounceRate}%
                                </span>
                              </td>
                              <td>{(source.views || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Table */}
                    <div className="bounce-rate-modal__table-container bounce-rate-modal__table-container--mobile">
                      <h4 className="bounce-rate-modal__table-title">
                        Referrer Breakdown
                      </h4>
                      <div className="bounce-rate-modal__mobile-table">
                        {data.referrerData.map((source, index) => (
                          <div
                            key={index}
                            className="bounce-rate-modal__mobile-table-row"
                          >
                            <div className="bounce-rate-modal__mobile-table-cell">
                              <span className="bounce-rate-modal__mobile-table-label">
                                Source
                              </span>
                              <span className="bounce-rate-modal__mobile-table-value">
                                {source.source || "Unknown"}
                              </span>
                            </div>
                            <div className="bounce-rate-modal__mobile-table-cell">
                              <span className="bounce-rate-modal__mobile-table-label">
                                Bounce Rate
                              </span>
                              <span className="bounce-rate-modal__mobile-table-value">
                                <span
                                  className="bounce-rate-modal__bounce-badge"
                                  style={{
                                    backgroundColor: getBounceRateColor(
                                      source.bounceRate
                                    ),
                                    color: getBounceRateTextColor(
                                      source.bounceRate
                                    ),
                                    fontSize: "0.75rem",
                                    padding: "2px 6px",
                                  }}
                                >
                                  {source.bounceRate}%
                                </span>
                              </span>
                            </div>
                            <div className="bounce-rate-modal__mobile-table-cell">
                              <span className="bounce-rate-modal__mobile-table-label">
                                Page Views
                              </span>
                              <span className="bounce-rate-modal__mobile-table-value">
                                {(source.views || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  renderNoDataMessage("referrer")
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default BounceRateModal;