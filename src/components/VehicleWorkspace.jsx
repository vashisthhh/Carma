import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Gauge,
  IndianRupee,
  FileCheck2,
  Wrench,
  Paperclip,
  Upload,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Clock,
  RotateCcw,
  CheckCircle2,
  Info,
  Layers,
  FileText,
  ExternalLink,
  Edit3,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  getVehicleServiceSummary,
  getComponentDisplayName,
  getAllComponents
} from '../data/serviceHistoryData';
import { calculateExpiryStatus } from '../data/vehicleData';

/**
 * Format ISO date string 'YYYY-MM-DD' to 'DD Mon YYYY'
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthName = months[parseInt(month, 10) - 1] || month;
  return `${parseInt(day, 10)} ${monthName} ${year}`;
}

/**
 * Return badge CSS modifier according to service type
 */
function getServiceTypeBadgeClass(type) {
  switch (type) {
    case 'Replacement':
      return 'badge-type-replacement';
    case 'Inspection':
      return 'badge-type-inspection';
    case 'Repair':
      return 'badge-type-repair';
    case 'Maintenance':
    default:
      return 'badge-type-maintenance';
  }
}

export function VehicleWorkspace({
  vehicle,
  onInspectComponent,
  onOpenAiImport,
  recordsVersion = 0,
  onEditRecord,
  onDeleteRecord,
  onRenameComponent,
  onClearHistory,
  onOpenVehicleDocUpload,
  onEditVehicle
}) {
  const [activeMenuCompId, setActiveMenuCompId] = useState(null);

  // Dynamically calculate summary metrics from actual service records
  const summary = getVehicleServiceSummary(vehicle?.id);
  const { totalRecords, documentCount, totalSpend, records } = summary;

  // Group records by year in descending order
  const recordsByYear = useMemo(() => {
    const groups = {};
    records.forEach((rec) => {
      const year = rec.date ? rec.date.split('-')[0] : 'Other';
      if (!groups[year]) groups[year] = [];
      groups[year].push(rec);
    });
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((year) => ({
        year,
        records: groups[year]
      }));
  }, [records]);

  // Extract all records that have an attached document
  const serviceDocuments = records.filter((r) => Boolean(r.document));

  // Registered components list with live names and record counts
  const componentsList = getAllComponents();

  // Insurance and PUC status using existing dynamic expiry calculation
  const insuranceDoc = (vehicle?.documents || []).find(
    (d) => (d.type || '').toLowerCase() === 'insurance'
  );
  const insuranceStatus = insuranceDoc?.expiryDate
    ? calculateExpiryStatus(insuranceDoc.expiryDate)
    : (insuranceDoc ? calculateExpiryStatus(null) : null);

  const pucDoc = (vehicle?.documents || []).find(
    (d) => (d.type || '').toLowerCase() === 'puc'
  );
  const pucStatus = pucDoc?.expiryDate
    ? calculateExpiryStatus(pucDoc.expiryDate)
    : (pucDoc ? calculateExpiryStatus(null) : null);


  return (
    <section className="vehicle-workspace-container">
      {/* 1. Compact Vehicle Summary Strip (Specification/Status Strip) */}
      <div className="workspace-summary-strip">
        <div className="summary-metric-item">
          <span className="summary-metric-label">DOCUMENTED SERVICES</span>
          <span className="summary-metric-val">{totalRecords}</span>
        </div>

        <div className="summary-metric-divider"></div>

        <div className="summary-metric-item">
          <span className="summary-metric-label">DOCUMENTED SPEND</span>
          <span className="summary-metric-val">₹{totalSpend.toLocaleString('en-IN')}</span>
        </div>

        <div className="summary-metric-divider"></div>

        <div className="summary-metric-item">
          <span className="summary-metric-label">SERVICE DOCUMENTS</span>
          <span className="summary-metric-val">{documentCount}</span>
        </div>

        <div className="summary-metric-divider"></div>

        <div className="summary-metric-item">
          <span className="summary-metric-label">INSURANCE</span>
          <div className="summary-status-content">
            <span className={`summary-status-badge ${insuranceStatus ? insuranceStatus.badgeClass : 'status-none'}`}>
              {insuranceStatus ? insuranceStatus.status : 'Not uploaded'}
            </span>
            {insuranceDoc && insuranceStatus?.daysUntilExpiry !== null && (
              <span className="summary-status-sub">
                {insuranceStatus.daysUntilExpiry > 0
                  ? `${insuranceStatus.daysUntilExpiry} days remaining`
                  : insuranceStatus.daysUntilExpiry === 0
                  ? 'Expires today'
                  : `Expired ${Math.abs(insuranceStatus.daysUntilExpiry)}d ago`}
              </span>
            )}
          </div>
        </div>

        <div className="summary-metric-divider"></div>

        <div className="summary-metric-item">
          <span className="summary-metric-label">PUC</span>
          <div className="summary-status-content">
            <span className={`summary-status-badge ${pucStatus ? pucStatus.badgeClass : 'status-none'}`}>
              {pucStatus ? pucStatus.status : 'Not uploaded'}
            </span>
            {pucDoc && pucStatus?.daysUntilExpiry !== null && (
              <span className="summary-status-sub">
                {pucStatus.daysUntilExpiry > 0
                  ? `${pucStatus.daysUntilExpiry} days remaining`
                  : pucStatus.daysUntilExpiry === 0
                  ? 'Expires today'
                  : `Expired ${Math.abs(pucStatus.daysUntilExpiry)}d ago`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Service History Section (Vehicle Timeline) */}
      <div className="workspace-section">
        <div className="section-header-row">
          <div>
            <h2 className="workspace-section-title">SERVICE HISTORY</h2>
            <span className="workspace-section-subtitle">
              Chronological timeline of component maintenance, repair & replacement events
            </span>
          </div>
          <button className="btn-secondary-action" onClick={onOpenAiImport}>
            <Upload size={13} />
            <span>Import Service Documents</span>
          </button>
        </div>

        {records.length === 0 ? (
          <div className="workspace-empty-state">
            <div className="empty-icon-wrap">
              <Wrench size={24} />
            </div>
            <h3 className="empty-state-title">No documented service history</h3>
            <p className="empty-state-desc">
              Your vehicle history will appear here as you add service records.
            </p>
            <button className="btn-secondary-action" onClick={onOpenAiImport}>
              <Upload size={13} />
              <span>Import Service Documents</span>
            </button>
          </div>
        ) : (
          <div className="vehicle-timeline-container">
            {recordsByYear.map(({ year, records: yearRecords }) => (
              <div key={`year-${year}`} className="timeline-year-group">
                <div className="timeline-year-marker">
                  <span className="timeline-year-text">{year}</span>
                </div>

                <div className="timeline-events-list">
                  {yearRecords.map((record) => {
                    const liveCompName = getComponentDisplayName(record.componentId);
                    return (
                      <div
                        key={record.id}
                        className="timeline-event-item"
                        onClick={() => {
                          if (onInspectComponent && record.componentId) {
                            onInspectComponent(record.componentId);
                          }
                        }}
                        title="Click to inspect component in 3D"
                      >
                        {/* Vertical timeline node */}
                        <div className="timeline-node">
                          <div className="timeline-node-dot"></div>
                        </div>

                        {/* Event Content Card */}
                        <div className="timeline-event-body">
                          <div className="timeline-event-header">
                            <div className="timeline-event-main-title">
                              <span className={`badge ${getServiceTypeBadgeClass(record.type)}`}>
                                {record.type}
                              </span>
                              <span className="timeline-event-component">{liveCompName}</span>
                            </div>
                            <div className="timeline-event-actions" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="btn-timeline-action"
                                onClick={() => onEditRecord && onEditRecord(record)}
                                title="Edit service record"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn-timeline-action btn-timeline-delete"
                                onClick={() => onDeleteRecord && onDeleteRecord(record)}
                                title="Delete service record"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {record.description && (
                            <p className="timeline-event-desc">{record.description}</p>
                          )}

                          <div className="timeline-event-footer">
                            <div className="timeline-meta-group">
                              <div className="timeline-meta-item">
                                <Calendar size={12} />
                                <span>{formatDate(record.date)}</span>
                              </div>
                              <span className="meta-bullet">·</span>
                              <div className="timeline-meta-item">
                                <Gauge size={12} />
                                <span>{record.mileage ? `${record.mileage.toLocaleString('en-IN')} km` : '—'}</span>
                              </div>
                              {record.cost > 0 && (
                                <>
                                  <span className="meta-bullet">·</span>
                                  <div className="timeline-meta-item meta-cost">
                                    <IndianRupee size={12} />
                                    <span>₹{record.cost.toLocaleString('en-IN')}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {record.document && (
                              <div
                                className="timeline-doc-indicator"
                                onClick={(e) => {
                                  if (record.document.url) {
                                    e.stopPropagation();
                                    window.open(record.document.url, '_blank');
                                  }
                                }}
                                title={`Attached evidence: ${record.document.name}`}
                              >
                                <Paperclip size={11} />
                                <span className="timeline-doc-name">{record.document.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Service Documents Section (Dedicated Evidence Category) */}
      <div className="workspace-section">
        <div className="section-header-row">
          <div>
            <h2 className="workspace-section-title">SERVICE DOCUMENTS</h2>
            <span className="workspace-section-subtitle">
              Invoices and maintenance records associated with this vehicle.
            </span>
          </div>
          <button className="btn-primary-import" onClick={onOpenAiImport}>
            <Upload size={14} />
            <span>Import Service Documents</span>
          </button>
        </div>

        {serviceDocuments.length === 0 ? (
          <div className="workspace-empty-state">
            <div className="empty-icon-wrap">
              <FileText size={24} />
            </div>
            <h3 className="empty-state-title">No service documents</h3>
            <p className="empty-state-desc">
              Upload invoices and maintenance records to build your documented history.
            </p>
            <button className="btn-primary-import" onClick={onOpenAiImport}>
              <Upload size={14} />
              <span>Import Service Documents</span>
            </button>
          </div>
        ) : (
          <div className="service-evidence-grid">
            {serviceDocuments.map((record) => {
              const liveCompName = getComponentDisplayName(record.componentId);
              return (
                <div key={`doc-${record.id}`} className="evidence-card">
                  <div className="evidence-header">
                    <div className="evidence-title-group">
                      <span className="evidence-type-tag">{record.type.toUpperCase()}</span>
                      <span className="evidence-date">{formatDate(record.date)}</span>
                    </div>
                    {record.cost > 0 && (
                      <span className="evidence-cost">₹{record.cost.toLocaleString('en-IN')}</span>
                    )}
                  </div>

                  <div className="evidence-component-row">
                    <span className="evidence-comp-label">Component:</span>
                    <button
                      type="button"
                      className="btn-evidence-comp"
                      onClick={() => onInspectComponent && record.componentId && onInspectComponent(record.componentId)}
                      title={`Inspect ${liveCompName} in 3D`}
                    >
                      <Layers size={11} />
                      <span>{liveCompName}</span>
                    </button>
                  </div>

                  <div className="evidence-file-footer">
                    <div className="evidence-file-info">
                      <FileText size={14} className="file-icon" />
                      <span className="file-name" title={record.document.name}>
                        {record.document.name}
                      </span>
                    </div>

                    <div className="evidence-actions">
                      {record.document.url && (
                        <a
                          href={record.document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-view-evidence"
                          title={`View ${record.document.name}`}
                        >
                          <ExternalLink size={12} />
                          <span>View</span>
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn-evidence-action"
                        onClick={() => onEditRecord && onEditRecord(record)}
                        title="Edit record"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn-evidence-action btn-evidence-delete"
                        onClick={() => onDeleteRecord && onDeleteRecord(record)}
                        title="Delete record"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Vehicle Components Section (Interactive 3D Parts & Categories) */}
      <div className="workspace-section">
        <div className="section-header-row">
          <div>
            <h2 className="workspace-section-title">VEHICLE COMPONENTS</h2>
            <span className="workspace-section-subtitle">
              Interactive 3D parts & maintenance tracking categories
            </span>
          </div>
        </div>

        <div className="vehicle-components-grid">
          {componentsList.map((comp) => (
            <div
              key={comp.id}
              className="vehicle-component-card"
              onClick={() => onInspectComponent && onInspectComponent(comp.id)}
            >
              <div className="component-card-main">
                <div className="component-card-info">
                  <div className="comp-name-row">
                    <span className="component-card-name">{comp.name}</span>
                    {comp.id === 'general-maintenance' && (
                      <span className="badge badge-general-maint">General</span>
                    )}
                  </div>
                  <span className={`comp-records-pill ${comp.recordCount > 0 ? 'has-records' : 'zero-records'}`}>
                    {comp.recordCount} {comp.recordCount === 1 ? 'record' : 'records'}
                  </span>
                </div>

                <div className="component-menu-wrapper" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn-dots-menu"
                    onClick={() =>
                      setActiveMenuCompId(activeMenuCompId === comp.id ? null : comp.id)
                    }
                    title="Component actions"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {activeMenuCompId === comp.id && (
                    <div className="dropdown-menu">
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setActiveMenuCompId(null);
                          if (onRenameComponent) {
                            onRenameComponent(comp.id, comp.name);
                          }
                        }}
                      >
                        <Edit3 size={13} />
                        <span>Rename Component</span>
                      </button>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setActiveMenuCompId(null);
                          if (onInspectComponent) {
                            onInspectComponent(comp.id);
                          }
                        }}
                      >
                        <Layers size={13} />
                        <span>View in 3D</span>
                      </button>
                      {comp.recordCount > 0 && (
                        <button
                          type="button"
                          className="dropdown-item dropdown-item-danger"
                          onClick={() => {
                            setActiveMenuCompId(null);
                            if (onClearHistory) {
                              onClearHistory(comp.id);
                            }
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Clear History</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Vehicle Documents Section (Insurance & PUC) */}
      <div className="workspace-section">
        <div className="section-header-row">
          <div>
            <h2 className="workspace-section-title">VEHICLE DOCUMENTS</h2>
            <span className="workspace-section-subtitle">
              Statutory ownership & compliance certificates
            </span>
          </div>
        </div>

        <div className="vehicle-docs-duo-grid">
          {/* Insurance Card */}
          {insuranceDoc ? (
            <div className="statutory-doc-card">
              <div className="statutory-card-header">
                <div className="statutory-header-left">
                  <div className="statutory-icon-wrap">
                    <ShieldCheck size={18} color={insuranceStatus?.isExpired ? '#ef4444' : '#10b981'} />
                  </div>
                  <div>
                    <h3 className="statutory-title">INSURANCE</h3>
                    <span className="statutory-subtitle">{insuranceDoc.issuer || 'Motor Insurance Provider'}</span>
                  </div>
                </div>
                <span className={`statutory-badge ${insuranceStatus?.badgeClass}`}>
                  {insuranceStatus?.status}
                </span>
              </div>

              <div className="statutory-card-body">
                <div className="statutory-period-block">
                  <span className="statutory-period-label">Policy Period</span>
                  <div className="statutory-period-dates">
                    <span>{insuranceDoc.startDate ? formatDate(insuranceDoc.startDate) : '—'}</span>
                    <span className="period-arrow">→</span>
                    <span>{insuranceDoc.expiryDate ? formatDate(insuranceDoc.expiryDate) : '—'}</span>
                  </div>
                </div>

                {insuranceStatus?.daysUntilExpiry !== null && (
                  <div className="statutory-remaining-highlight">
                    <Clock size={13} />
                    <span>
                      {insuranceStatus.daysUntilExpiry > 0
                        ? `${insuranceStatus.daysUntilExpiry} days remaining`
                        : insuranceStatus.daysUntilExpiry === 0
                        ? 'Expires today'
                        : `Expired ${Math.abs(insuranceStatus.daysUntilExpiry)} days ago`}
                    </span>
                  </div>
                )}

                {insuranceDoc.policyNumber && (
                  <div className="statutory-number-row">
                    <span className="number-label">Policy No:</span>
                    <span className="number-val">{insuranceDoc.policyNumber}</span>
                  </div>
                )}
              </div>

              <div className="statutory-card-footer">
                {insuranceDoc.document?.url && (
                  <a
                    href={insuranceDoc.document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-statutory-view"
                  >
                    <ExternalLink size={12} />
                    <span>View Document</span>
                  </a>
                )}
                <button
                  type="button"
                  className="btn-statutory-replace"
                  onClick={() => onOpenVehicleDocUpload && onOpenVehicleDocUpload('insurance')}
                >
                  <RotateCcw size={12} />
                  <span>Replace</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="statutory-doc-card statutory-card-empty">
              <div className="statutory-card-header">
                <div className="statutory-header-left">
                  <div className="statutory-icon-wrap icon-wrap-muted">
                    <Shield size={18} color="#64748b" />
                  </div>
                  <div>
                    <h3 className="statutory-title">INSURANCE</h3>
                    <span className="statutory-subtitle">Statutory vehicle coverage</span>
                  </div>
                </div>
              </div>
              <div className="statutory-card-body">
                <h4 className="empty-card-heading">No insurance document</h4>
                <p className="empty-card-sub">
                  Upload your policy document to keep its validity and status in one place.
                </p>
              </div>
              <div className="statutory-card-footer">
                <button
                  type="button"
                  className="btn-statutory-upload"
                  onClick={() => onOpenVehicleDocUpload && onOpenVehicleDocUpload('insurance')}
                >
                  <Upload size={13} />
                  <span>Upload Insurance</span>
                </button>
              </div>
            </div>
          )}

          {/* PUC Card */}
          {pucDoc ? (
            <div className="statutory-doc-card">
              <div className="statutory-card-header">
                <div className="statutory-header-left">
                  <div className="statutory-icon-wrap">
                    <ShieldCheck size={18} color={pucStatus?.isExpired ? '#ef4444' : '#10b981'} />
                  </div>
                  <div>
                    <h3 className="statutory-title">PUC</h3>
                    <span className="statutory-subtitle">{pucDoc.issuer || 'Pollution Under Control'}</span>
                  </div>
                </div>
                <span className={`statutory-badge ${pucStatus?.badgeClass}`}>
                  {pucStatus?.status}
                </span>
              </div>

              <div className="statutory-card-body">
                <div className="statutory-period-block">
                  <span className="statutory-period-label">Validity Period</span>
                  <div className="statutory-period-dates">
                    <span>{pucDoc.startDate ? formatDate(pucDoc.startDate) : '—'}</span>
                    <span className="period-arrow">→</span>
                    <span>{pucDoc.expiryDate ? formatDate(pucDoc.expiryDate) : '—'}</span>
                  </div>
                </div>

                {pucStatus?.daysUntilExpiry !== null && (
                  <div className="statutory-remaining-highlight">
                    <Clock size={13} />
                    <span>
                      {pucStatus.daysUntilExpiry > 0
                        ? `${pucStatus.daysUntilExpiry} days remaining`
                        : pucStatus.daysUntilExpiry === 0
                        ? 'Expires today'
                        : `Expired ${Math.abs(pucStatus.daysUntilExpiry)} days ago`}
                    </span>
                  </div>
                )}

                {pucDoc.certificateNumber && (
                  <div className="statutory-number-row">
                    <span className="number-label">Certificate No:</span>
                    <span className="number-val">{pucDoc.certificateNumber}</span>
                  </div>
                )}
              </div>

              <div className="statutory-card-footer">
                {pucDoc.document?.url && (
                  <a
                    href={pucDoc.document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-statutory-view"
                  >
                    <ExternalLink size={12} />
                    <span>View Document</span>
                  </a>
                )}
                <button
                  type="button"
                  className="btn-statutory-replace"
                  onClick={() => onOpenVehicleDocUpload && onOpenVehicleDocUpload('puc')}
                >
                  <RotateCcw size={12} />
                  <span>Replace</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="statutory-doc-card statutory-card-empty">
              <div className="statutory-card-header">
                <div className="statutory-header-left">
                  <div className="statutory-icon-wrap icon-wrap-muted">
                    <Shield size={18} color="#64748b" />
                  </div>
                  <div>
                    <h3 className="statutory-title">PUC</h3>
                    <span className="statutory-subtitle">Mandatory emission certificate</span>
                  </div>
                </div>
              </div>
              <div className="statutory-card-body">
                <h4 className="empty-card-heading">No PUC document</h4>
                <p className="empty-card-sub">
                  Upload your PUC certificate to keep its validity and status in one place.
                </p>
              </div>
              <div className="statutory-card-footer">
                <button
                  type="button"
                  className="btn-statutory-upload"
                  onClick={() => onOpenVehicleDocUpload && onOpenVehicleDocUpload('puc')}
                >
                  <Upload size={13} />
                  <span>Upload PUC</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="compliance-note">
          <Info size={14} className="note-icon" />
          <span>
            Vehicle documents represent statutory ownership compliance. Component-level service records and parts invoices are attached directly to each individual service event above.
          </span>
        </div>
      </div>
    </section>
  );
}

