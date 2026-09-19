import React, { useState } from 'react';
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
  onOpenVehicleDocUpload
}) {
  const [activeMenuCompId, setActiveMenuCompId] = useState(null);

  // Dynamically calculate summary metrics from actual service records
  const summary = getVehicleServiceSummary(vehicle?.id);
  const { totalRecords, documentCount, totalSpend, records } = summary;

  // Extract all records that have an attached document
  const serviceDocuments = records.filter((r) => Boolean(r.document));

  // Registered components list with live names and record counts
  const componentsList = getAllComponents();

  return (
    <section className="vehicle-workspace-container">
      {/* 1. Vehicle Identity & Key Information */}
      <div className="workspace-vehicle-header">
        <div className="workspace-title-row">
          <div className="workspace-title-left">
            <div className="vehicle-badges-row">
              <span className="badge-make">{vehicle.make}</span>
              <span className="badge-reg">{vehicle.registrationNumber}</span>
            </div>
            <h1 className="workspace-vehicle-name">
              {vehicle.make} {vehicle.model}
              {vehicle.variant ? <span className="workspace-variant"> {vehicle.variant}</span> : null}
            </h1>
            <div className="workspace-specs-row">
              <span>{vehicle.year}</span>
              <span className="spec-dot">·</span>
              <span>{vehicle.odometer.toLocaleString('en-IN')} km</span>
              <span className="spec-dot">·</span>
              <span>{vehicle.fuelType}</span>
              <span className="spec-dot">·</span>
              <span>{vehicle.transmission}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Metric Pills */}
        <div className="workspace-metrics-row">
          <div className="metric-pill">
            <Wrench size={14} className="metric-icon metric-icon-records" />
            <span className="metric-value">{totalRecords}</span>
            <span className="metric-label">Documented Service Records</span>
          </div>

          <div className="metric-pill">
            <FileCheck2 size={14} className="metric-icon metric-icon-docs" />
            <span className="metric-value">{documentCount}</span>
            <span className="metric-label">Attached Documents</span>
          </div>

          <div className="metric-pill">
            <IndianRupee size={14} className="metric-icon metric-icon-spend" />
            <span className="metric-value">₹{totalSpend.toLocaleString('en-IN')}</span>
            <span className="metric-label">Documented Spend</span>
          </div>
        </div>
      </div>

      {/* 2. Service Documents Section (Dedicated Evidence/Source Files Category) */}
      <div className="workspace-section">
        <div className="section-header-row">
          <div>
            <h2 className="workspace-section-title">SERVICE DOCUMENTS</h2>
            <span className="workspace-section-subtitle">
              Uploaded invoices, repair bills & maintenance receipts
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
            <h3 className="empty-state-title">No service documents uploaded yet.</h3>
            <p className="empty-state-desc">
              Upload invoices or receipts to automatically extract service records and link them to vehicle components.
            </p>
            <button className="btn-primary-import" onClick={onOpenAiImport}>
              <Upload size={14} />
              <span>Import Service Documents</span>
            </button>
          </div>
        ) : (
          <div className="service-documents-grid">
            {serviceDocuments.map((record) => {
              const liveCompName = getComponentDisplayName(record.componentId);
              return (
                <div key={`doc-${record.id}`} className="service-doc-card">
                  <div className="doc-card-main">
                    <div className="doc-icon-badge">
                      <FileText size={18} color="#38bdf8" />
                    </div>
                    <div className="doc-details">
                      <span className="doc-filename" title={record.document.name}>
                        {record.document.name}
                      </span>
                      <div className="doc-meta-row">
                        <span>
                          {record.document.size
                            ? `${(record.document.size / 1024).toFixed(0)} KB`
                            : 'Document'}
                        </span>
                        <span className="spec-dot">·</span>
                        <span>{formatDate(record.date)}</span>
                        <span className="spec-dot">·</span>
                        <span className="doc-event-type">{record.type}</span>
                      </div>
                    </div>
                    {record.cost > 0 && (
                      <div className="doc-cost-badge">
                        <IndianRupee size={12} />
                        <span>{record.cost.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  <div className="doc-card-footer">
                    <div className="doc-linked-component">
                      <span className="linked-label">Component:</span>
                      <button
                        type="button"
                        className="btn-linked-comp"
                        onClick={() =>
                          onInspectComponent && record.componentId && onInspectComponent(record.componentId)
                        }
                        title={`Inspect ${liveCompName} on 3D vehicle`}
                      >
                        <Layers size={12} />
                        <span>{liveCompName}</span>
                      </button>
                    </div>

                    <div className="doc-actions-right">
                      {record.document.url && (
                        <a
                          href={record.document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-view-document"
                          title={`Open ${record.document.name}`}
                        >
                          <ExternalLink size={12} />
                          <span>View</span>
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn-inline-action"
                        onClick={() => onEditRecord && onEditRecord(record)}
                        title="Edit service record"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn-inline-action btn-inline-delete"
                        onClick={() => onDeleteRecord && onDeleteRecord(record)}
                        title="Delete service record"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Service History Section (Structured Timeline of Records) */}
      <div className="workspace-section">
        <div className="section-header-row">
          <div>
            <h2 className="workspace-section-title">SERVICE HISTORY</h2>
            <span className="workspace-section-subtitle">
              Structured timeline of component maintenance, repair & replacement records
            </span>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="workspace-empty-state">
            <div className="empty-icon-wrap">
              <Wrench size={24} />
            </div>
            <h3 className="empty-state-title">No documented service history yet.</h3>
            <p className="empty-state-desc">
              This vehicle has 0 service records logged. Import service documents above to automatically populate records, or inspect components on the 3D model to log records manually.
            </p>
          </div>
        ) : (
          <div className="workspace-records-timeline">
            {records.map((record) => {
              const liveCompName = getComponentDisplayName(record.componentId);
              return (
                <div
                  key={record.id}
                  className="workspace-record-card"
                  onClick={() => {
                    if (onInspectComponent && record.componentId) {
                      onInspectComponent(record.componentId);
                    }
                  }}
                  title="Click to view component in 3D"
                >
                  <div className="record-top-row">
                    <div className="record-top-left">
                      <div className="record-date-block">
                        <Calendar size={13} className="record-date-icon" />
                        <span className="record-date-text">{formatDate(record.date)}</span>
                      </div>
                      <span className={`badge ${getServiceTypeBadgeClass(record.type)}`}>
                        {record.type}
                      </span>
                    </div>

                    <div className="record-actions-inline" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-inline-action"
                        onClick={() => onEditRecord && onEditRecord(record)}
                        title="Edit service record"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn-inline-action btn-inline-delete"
                        onClick={() => onDeleteRecord && onDeleteRecord(record)}
                        title="Delete service record"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="record-main-row">
                    <span className="record-comp-name">{liveCompName}</span>
                    {record.description && (
                      <p className="record-desc-text">{record.description}</p>
                    )}
                  </div>

                  <div className="record-bottom-row">
                    <div className="record-tags-group">
                      <div className="record-tag">
                        <Gauge size={12} />
                        <span>{record.mileage ? `${record.mileage.toLocaleString('en-IN')} km` : '—'}</span>
                      </div>
                      <div className="record-tag record-cost-tag">
                        <IndianRupee size={12} />
                        <span>{record.cost ? `₹${record.cost.toLocaleString('en-IN')}` : '—'}</span>
                      </div>
                    </div>

                    {record.document && (
                      <div className="record-doc-badge" title={`Attached: ${record.document.name}`}>
                        <Paperclip size={12} />
                        <span className="doc-name-text">{record.document.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Vehicle Components Section (Management & Renaming) */}
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

      {/* 5. Vehicle-Level Documents (Insurance, PUC) */}
      <div className="workspace-section">
        <div className="section-header-row">
          <div>
            <h2 className="workspace-section-title">VEHICLE DOCUMENTS</h2>
            <span className="workspace-section-subtitle">
              Statutory ownership & compliance certificates
            </span>
          </div>
          <span className="badge badge-statutory">Statutory Compliance</span>
        </div>

        <div className="workspace-docs-grid">
          {/* Insurance Card */}
          {(() => {
            const insuranceDoc = (vehicle.documents || []).find(
              (d) => (d.type || '').toLowerCase() === 'insurance'
            );
            if (insuranceDoc) {
              const expiryStatus = calculateExpiryStatus(insuranceDoc.expiryDate);
              return (
                <div key={insuranceDoc.id} className="workspace-doc-card">
                  <div className="doc-card-header">
                    <div className="doc-icon-wrap">
                      <ShieldCheck size={18} color={expiryStatus.isExpired ? '#ef4444' : '#10b981'} />
                    </div>
                    <div className="doc-titles">
                      <span className="doc-primary-title">{insuranceDoc.title || 'Motor Vehicle Insurance'}</span>
                      <span className="doc-issuer-name">{insuranceDoc.issuer || 'Insurance Provider'}</span>
                    </div>
                    <span className={`badge-doc-status ${expiryStatus.badgeClass}`}>
                      <CheckCircle2 size={11} />
                      <span>{expiryStatus.status}</span>
                    </span>
                  </div>

                  <div className="doc-card-body">
                    <div className="doc-row">
                      <span className="doc-label">Policy Number:</span>
                      <span className="doc-val">{insuranceDoc.policyNumber || 'Not specified'}</span>
                    </div>
                    <div className="doc-row">
                      <span className="doc-label">Valid from:</span>
                      <span className="doc-val">
                        {insuranceDoc.startDate ? formatDate(insuranceDoc.startDate) : 'Not specified'}
                      </span>
                    </div>
                    <div className="doc-row">
                      <span className="doc-label">Valid until:</span>
                      <span className="doc-val">
                        {insuranceDoc.expiryDate ? formatDate(insuranceDoc.expiryDate) : 'Not specified'}
                      </span>
                    </div>
                    <div className="doc-row">
                      <span className="doc-label">Status:</span>
                      <span className={`doc-val ${expiryStatus.isExpired ? 'doc-val-expired' : 'doc-val-highlight'}`}>
                        {expiryStatus.label}
                      </span>
                    </div>
                  </div>

                  <div className="doc-card-actions">
                    {insuranceDoc.document?.url && (
                      <a
                        href={insuranceDoc.document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-doc-link"
                        title="View original insurance document"
                      >
                        <ExternalLink size={12} />
                        <span>View Document</span>
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-doc-action"
                      onClick={() => onOpenVehicleDocUpload && onOpenVehicleDocUpload('insurance')}
                      title="Replace insurance document"
                    >
                      <RotateCcw size={12} />
                      <span>Replace</span>
                    </button>
                  </div>
                </div>
              );
            }

            // Empty state for Insurance
            return (
              <div key="empty-insurance" className="workspace-doc-card doc-card-empty">
                <div className="doc-card-header">
                  <div className="doc-icon-wrap icon-wrap-muted">
                    <Shield size={18} color="#64748b" />
                  </div>
                  <div className="doc-titles">
                    <span className="doc-primary-title">Motor Insurance</span>
                    <span className="doc-issuer-name">Statutory vehicle coverage</span>
                  </div>
                </div>
                <div className="doc-card-body">
                  <p className="doc-empty-text">No insurance document uploaded.</p>
                </div>
                <div className="doc-card-actions">
                  <button
                    type="button"
                    className="btn-upload-statutory"
                    onClick={() => onOpenVehicleDocUpload && onOpenVehicleDocUpload('insurance')}
                  >
                    <Upload size={13} />
                    <span>Upload Insurance</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* PUC Card */}
          {(() => {
            const pucDoc = (vehicle.documents || []).find(
              (d) => (d.type || '').toLowerCase() === 'puc'
            );
            if (pucDoc) {
              const expiryStatus = calculateExpiryStatus(pucDoc.expiryDate);
              return (
                <div key={pucDoc.id} className="workspace-doc-card">
                  <div className="doc-card-header">
                    <div className="doc-icon-wrap">
                      <ShieldCheck size={18} color={expiryStatus.isExpired ? '#ef4444' : '#10b981'} />
                    </div>
                    <div className="doc-titles">
                      <span className="doc-primary-title">{pucDoc.title || 'Pollution Under Control (PUC)'}</span>
                      <span className="doc-issuer-name">{pucDoc.issuer || 'Authorized Testing Centre'}</span>
                    </div>
                    <span className={`badge-doc-status ${expiryStatus.badgeClass}`}>
                      <CheckCircle2 size={11} />
                      <span>{expiryStatus.status}</span>
                    </span>
                  </div>

                  <div className="doc-card-body">
                    <div className="doc-row">
                      <span className="doc-label">Certificate Number:</span>
                      <span className="doc-val">{pucDoc.certificateNumber || 'Not specified'}</span>
                    </div>
                    <div className="doc-row">
                      <span className="doc-label">Valid from:</span>
                      <span className="doc-val">
                        {pucDoc.startDate ? formatDate(pucDoc.startDate) : 'Not specified'}
                      </span>
                    </div>
                    <div className="doc-row">
                      <span className="doc-label">Valid until:</span>
                      <span className="doc-val">
                        {pucDoc.expiryDate ? formatDate(pucDoc.expiryDate) : 'Not specified'}
                      </span>
                    </div>
                    <div className="doc-row">
                      <span className="doc-label">Status:</span>
                      <span className={`doc-val ${expiryStatus.isExpired ? 'doc-val-expired' : 'doc-val-highlight'}`}>
                        {expiryStatus.label}
                      </span>
                    </div>
                  </div>

                  <div className="doc-card-actions">
                    {pucDoc.document?.url && (
                      <a
                        href={pucDoc.document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-doc-link"
                        title="View original PUC document"
                      >
                        <ExternalLink size={12} />
                        <span>View Document</span>
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-doc-action"
                      onClick={() => onOpenVehicleDocUpload && onOpenVehicleDocUpload('puc')}
                      title="Replace PUC document"
                    >
                      <RotateCcw size={12} />
                      <span>Replace</span>
                    </button>
                  </div>
                </div>
              );
            }

            // Empty state for PUC
            return (
              <div key="empty-puc" className="workspace-doc-card doc-card-empty">
                <div className="doc-card-header">
                  <div className="doc-icon-wrap icon-wrap-muted">
                    <Shield size={18} color="#64748b" />
                  </div>
                  <div className="doc-titles">
                    <span className="doc-primary-title">Pollution Under Control (PUC)</span>
                    <span className="doc-issuer-name">Mandatory emission certificate</span>
                  </div>
                </div>
                <div className="doc-card-body">
                  <p className="doc-empty-text">No PUC document uploaded.</p>
                </div>
                <div className="doc-card-actions">
                  <button
                    type="button"
                    className="btn-upload-statutory"
                    onClick={() => onOpenVehicleDocUpload && onOpenVehicleDocUpload('puc')}
                  >
                    <Upload size={13} />
                    <span>Upload PUC</span>
                  </button>
                </div>
              </div>
            );
          })()}
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

