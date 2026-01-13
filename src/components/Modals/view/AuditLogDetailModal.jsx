/**
 * @file AuditLogDetailModal.jsx
 * @description Komponen modal untuk menampilkan detail lengkap entri audit log.
 * Menyediakan tampilan komprehensif dari aktivitas sistem dengan:
 * - Informasi dasar (tanggal, user, tindakan, tabel)
 * - Ringkasan perubahan dalam format sebelum/sesudah
 * - Nilai detail lama dan baru dalam format yang dapat dibaca
 * - Resolusi otomatis ID referensi menjadi nama yang bermakna
 * 
 * Fitur khusus:
 * - Mengubah ID seperti roleId, categoryId menjadi nama yang dapat dibaca
 * - Menangani entri yang mengacu pada record yang telah dihapus
 * - Humanisasi field name untuk keterbacaan yang lebih baik
 * - Penanganan aman untuk nilai sensitif (password, token, dll.)
 */

import React, { useEffect, useState } from "react";
import { auditLogService } from "../../../services/auditLogService";
import {
  formatActionName,
  getActionBadgeClass,
} from "../../../utils/actionHelper";
import { dataService } from "../../../services/dataService";
import "../../../sass/components/Modals/AuditLogDetailModal/AuditLogDetailModal.css";

/**
 * Props untuk komponen AuditLogDetailModal.
 * @typedef {Object} AuditLogDetailModalProps
 * @property {Object} log - Data audit log yang akan ditampilkan
 */

/**
 * Komponen modal detail audit log.
 * Menampilkan informasi lengkap tentang entri audit log dengan resolusi referensi.
 *
 * @component
 * @param {AuditLogDetailModalProps} props - Props komponen
 */
const AuditLogDetailModal = ({ log }) => {
  /**
   * Data log yang telah diperkaya dengan resolusi referensi.
   * @type {Object|null}
   */
  const [enrichedLog, setEnrichedLog] = useState(null);

  /**
   * Status loading saat memproses data log.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!log) {
      setLoading(false);
      return;
    }

    const enrichLog = async () => {
      try {
        const oldValues =
          typeof log.oldValues === "string"
            ? JSON.parse(log.oldValues)
            : log.oldValues || {};

        const newValues =
          typeof log.newValues === "string"
            ? JSON.parse(log.newValues)
            : log.newValues || {};

        const filteredOld = auditLogService.filterValues(oldValues);
        const filteredNew = auditLogService.filterValues(newValues);

        const resolvedOld = await resolveReferenceIds(filteredOld);
        const resolvedNew = await resolveReferenceIds(filteredNew);

        const cleanedOld = auditLogService.removeIsPrefix(resolvedOld);
        const cleanedNew = auditLogService.removeIsPrefix(resolvedNew);

        const formattedOld = auditLogService.formatValues(cleanedOld);
        const formattedNew = auditLogService.formatValues(cleanedNew);

        const changes = auditLogService.getChangeSummary(
          cleanedOld,
          cleanedNew
        );

        const enriched = {
          ...log,
          oldValues: formattedOld,
          newValues: formattedNew,
          changes,
        };

        setEnrichedLog(enriched);
      } catch (error) {
        console.error("Error enriching audit log:", error);
        setEnrichedLog(log);
      } finally {
        setLoading(false);
      }
    };

    enrichLog();
  }, [log]);

  /**
   * Menyelesaikan ID referensi menjadi nama yang dapat dibaca.
   * Mengubah ID seperti roleId, categoryId menjadi nama entitas yang sesuai.
   * 
   * @async
   * @param {Object} values - Objek nilai yang berisi ID referensi
   * @returns {Object} Objek dengan ID referensi yang telah diselesaikan menjadi nama
   */
  const resolveReferenceIds = async (values) => {
    if (!values || typeof values !== "object") return values;

    const resolved = { ...values };

    const referenceFields = {
      roleId: { newKey: "role", service: "roles" },
      authorId: { newKey: "author", service: "users" },
      categoryId: { newKey: "category", service: "categories" },
      brandId: { newKey: "brand", service: "brands" },
      catalogId: { newKey: "catalog", service: "catalogs" },
      repliedBy: { newKey: "repliedBy", service: "users" },
      createdBy: { newKey: "createdBy", service: "users" },
      updatedBy: { newKey: "updatedBy", service: "users" },
    };

    for (const [originalKey, config] of Object.entries(referenceFields)) {
      if (originalKey in resolved) {
        const id = resolved[originalKey];
        delete resolved[originalKey];

        if (id && typeof id === "string" && id.trim()) {
          try {
            const result = await dataService[config.service].getById(id);
            if (result.success && result.data) {
              const name = result.data.name || result.data.title || id;
              resolved[config.newKey] = name;
            } else {
              resolved[config.newKey] = `[Deleted] ${id}`;
            }
          } catch (error) {
            resolved[config.newKey] = `[Error] ${id}`;
          }
        } else {
          resolved[config.newKey] = "(empty)";
        }
      }
    }

    return resolved;
  };

  // RENDER DENGAN STRUKTUR TUNGGAL
  if (loading) {
    return (
      <div className="audit-log-detail-modal">
        <div className="audit-log-loading-container">
          <div className="audit-log-spinner"></div>
          <p className="audit-log-loading-text">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!enrichedLog) {
    return (
      <div className="audit-log-detail-modal">
        <div className="audit-log-error">
          <p>Log data not available</p>
        </div>
      </div>
    );
  }

  /** @type {boolean} Status apakah log memiliki perubahan yang tercatat */
  const hasChanges = enrichedLog.changes && enrichedLog.changes.length > 0;

  /** @type {boolean} Status apakah log memiliki nilai lama */
  const hasOldValues =
    enrichedLog.oldValues && Object.keys(enrichedLog.oldValues).length > 0;

  /** @type {boolean} Status apakah log memiliki nilai baru */
  const hasNewValues =
    enrichedLog.newValues && Object.keys(enrichedLog.newValues).length > 0;

  return (
    <div className="audit-log-detail-modal">
      {/* Basic Information */}
      <div className="detail-section">
        <h3 className="section-title">Basic Information</h3>
        <div className="log-detail-row">
          <div className="log-detail-label">Date & Time</div>
          <div className="log-detail-value">
            {enrichedLog.createdAtFormatted}
          </div>
        </div>
        <div className="log-detail-row">
          <div className="log-detail-label">User</div>
          <div className="log-detail-value">
            {enrichedLog.userName || "System"}
          </div>
        </div>
        <div className="log-detail-row">
          <div className="log-detail-label">Action</div>
          <div className="log-detail-value">
            <span
              className={`badge action ${getActionBadgeClass(
                enrichedLog.action
              )}`}
              aria-label={`Action: ${formatActionName(enrichedLog.action) || "Unknown"}`}
            >
              {formatActionName(enrichedLog.action) || "—"}
            </span>
          </div>
        </div>
        <div className="log-detail-row">
          <div className="log-detail-label">Table</div>
          <div className="log-detail-value">{enrichedLog.tableName || "—"}</div>
        </div>
        <div className="log-detail-row">
          <div className="log-detail-label">Description</div>
          <div className="log-detail-value">
            {enrichedLog.description || "No description provided"}
          </div>
        </div>
      </div>

      {/* Changes Summary */}
      {hasChanges && (
        <div className="detail-section">
          <h3 className="section-title">Changes Summary</h3>
          <div className="changes-container">
            {enrichedLog.changes.map((change, index) => (
              <div key={index} className="change-item">
                <div className="change-field">
                  {auditLogService.humanizeFieldName(change.field)}
                </div>
                <div className="change-values">
                  <div className="change-old">
                    <span className="change-label">Before</span>
                    <span className="change-value">
                      {change.oldValue || "(empty)"}
                    </span>
                  </div>
                  <div className="change-arrow">→</div>
                  <div className="change-new">
                    <span className="change-label">After</span>
                    <span className="change-value">
                      {change.newValue || "(empty)"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Values */}
      {(hasOldValues || hasNewValues) && (
        <div className="detail-section">
          <h3 className="section-title">Detailed Values</h3>
          <div className="values-grid">
            {hasOldValues && (
              <div className="value-column">
                <h4 className="value-column-title">Old Values</h4>
                <div className="value-list">
                  {Object.entries(enrichedLog.oldValues).map(([key, value]) => (
                    <div key={key} className="value-item">
                      <div className="value-key">
                        {auditLogService.humanizeFieldName(key)}
                      </div>
                      <div className="value-content">
                        <span className="value-text">{String(value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasNewValues && (
              <div className="value-column">
                <h4 className="value-column-title">New Values</h4>
                <div className="value-list">
                  {Object.entries(enrichedLog.newValues).map(([key, value]) => (
                    <div key={key} className="value-item">
                      <div className="value-key">
                        {auditLogService.humanizeFieldName(key)}
                      </div>
                      <div className="value-content">
                        <span className="value-text">{String(value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogDetailModal;