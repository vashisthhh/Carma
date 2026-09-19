import React from 'react';
import {
  Calendar,
  Gauge,
  IndianRupee,
  FileCheck2,
  Wrench,
  Paperclip,
  Upload,
  ShieldCheck,
  CheckCircle2,
  Info,
  Layers,
  FileText,
  ExternalLink
} from 'lucide-react';
import { getVehicleServiceSummary } from '../data/serviceHistoryData';

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
  recordsVersion = 0
}) {
  // Dynamically calculate summary metrics from actual service records
  const summary = getVehicleServiceSummary(vehicle?.id);
  const { totalRecords, documentCount, totalSpend, records } = summary;

  // Extract all records that have an attached document
  const serviceDocuments = records.filter((r) => Boolean(r.document));

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
            {serviceDocuments.map((record) => (
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
                      title={`Inspect ${record.componentDisplayName} on 3D vehicle`}
                    >
                      <Layers size={12} />
                      <span>{record.componentDisplayName}</span>
                    </button>
                  </div>

                  {record.document.url && (
                    <a
                      href={record.document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-view-document"
                      title={`Open ${record.document.name}`}
                    >
                      <ExternalLink size={12} />
                      <span>View Document</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
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
            {records.map((record) => (
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
                  <div className="record-date-block">
                    <Calendar size={13} className="record-date-icon" />
                    <span className="record-date-text">{formatDate(record.date)}</span>
                  </div>
                  <span className={`badge ${getServiceTypeBadgeClass(record.type)}`}>
                    {record.type}
                  </span>
                </div>

                <div className="record-main-row">
                  <span className="record-comp-name">{record.componentDisplayName}</span>
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
            ))}
          </div>
        )}
      </div>

      {/* 4. Vehicle-Level Documents (Insurance, PUC) */}
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
          {vehicle.documents?.map((doc) => (
            <div key={doc.id} className="workspace-doc-card">
              <div className="doc-card-header">
                <div className="doc-icon-wrap">
                  <ShieldCheck size={18} color="#10b981" />
                </div>
                <div className="doc-titles">
                  <span className="doc-primary-title">{doc.title}</span>
                  <span className="doc-issuer-name">{doc.issuer}</span>
                </div>
                <span className="badge-active-doc">
                  <CheckCircle2 size={11} />
                  <span>{doc.status}</span>
                </span>
              </div>

              <div className="doc-card-body">
                <div className="doc-row">
                  <span className="doc-label">
                    {doc.type === 'Insurance' ? 'Policy Number' : 'Certificate Number'}:
                  </span>
                  <span className="doc-val">
                    {doc.policyNumber || doc.certificateNumber}
                  </span>
                </div>
                <div className="doc-row">
                  <span className="doc-label">Expires:</span>
                  <span className="doc-val doc-val-highlight">{doc.expiryDate}</span>
                </div>
              </div>
            </div>
          ))}
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
