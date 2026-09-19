import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Wrench,
  Info,
  Layers,
  ChevronRight,
  Calendar,
  Gauge,
  IndianRupee,
  FileText,
  Clock,
  CheckCircle2,
  Paperclip,
  ExternalLink,
  File
} from 'lucide-react';
import { getComponentServiceHistory, addServiceRecord } from '../data/serviceHistoryData';
import { AddServiceRecordModal } from './AddServiceRecordModal';

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

export function InspectionPanel({
  config,
  onExit,
  onOpenHierarchy
}) {
  const [toastMessage, setToastMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordsVersion, setRecordsVersion] = useState(0);

  if (!config) return null;

  // Retrieve service history for the inspected component using targetMeshName or id
  const serviceData = getComponentServiceHistory(
    config.targetMeshName || config.id || config.title
  );

  const records = serviceData.records || [];
  const displayName = serviceData.displayName || config.title;

  const handleAddRecordClick = () => {
    setIsModalOpen(true);
  };

  const handleSaveRecord = (recordData) => {
    addServiceRecord(serviceData.componentId, recordData);
    setRecordsVersion((v) => v + 1);
    setIsModalOpen(false);
    setToastMessage('Service record added successfully.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <aside className="inspection-panel">
      {/* Top Header with Back Navigation */}
      <div className="inspection-header">
        <button className="back-to-vehicle-btn" onClick={onExit} title="Exit Inspection Mode">
          <ArrowLeft size={16} />
          <span>Back to Vehicle</span>
        </button>
        <span className="inspection-badge">INSPECTION MODE</span>
      </div>

      {/* Component Title & Subtitle */}
      <div className="inspection-title-section">
        <div className="component-type-tag">COMPONENT</div>
        <h1 className="inspection-title">{displayName.toUpperCase()}</h1>
        <p className="inspection-subtitle">{config.subtitle || 'Vehicle Component'}</p>
      </div>

      {/* Service History Section */}
      <div className="service-history-section">
        <div className="service-history-header">
          <div className="service-history-title-row">
            <h2 className="service-history-title">
              <Clock size={16} color="#38bdf8" />
              <span>Service History</span>
            </h2>
            <div className="service-header-badges">
              <span className={`records-count-badge ${records.length > 0 ? 'badge-active' : 'badge-empty'}`}>
                {records.length} {records.length === 1 ? 'Record' : 'Records'}
              </span>
              <span className="demo-data-badge">DEMO DATA</span>
            </div>
          </div>
        </div>

        {/* Record Cards List */}
        {records.length > 0 ? (
          <div className="service-records-list">
            {records.map((record) => {
              const typeLower = (record.type || 'service').toLowerCase();
              return (
                <div key={record.id} className="service-record-card">
                  {/* Card Header: Type Badge & Date */}
                  <div className="record-header">
                    <span className={`service-type-badge badge-${typeLower}`}>
                      {record.type}
                    </span>
                    <div className="record-date">
                      <Calendar size={13} />
                      <span>{formatDate(record.date)}</span>
                    </div>
                  </div>

                  {/* Metrics Row: Mileage & Cost */}
                  <div className="record-metrics-row">
                    <div className="record-metric-item">
                      <Gauge size={14} className="metric-icon" />
                      <div className="metric-content">
                        <span className="metric-label">Mileage</span>
                        <span className="metric-value">{record.mileage.toLocaleString()} km</span>
                      </div>
                    </div>
                    <div className="record-metric-item">
                      <IndianRupee size={14} className="metric-icon" />
                      <div className="metric-content">
                        <span className="metric-label">Cost</span>
                        <span className="metric-value">₹{record.cost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="record-description">
                    {record.description}
                  </div>

                  {/* Document Attachment Indicator */}
                  {record.document && (
                    <div className="record-document-attachment">
                      <div className="document-info">
                        <Paperclip size={13} className="document-icon" />
                        <span className="document-name" title={record.document.name}>
                          {record.document.name}
                        </span>
                        {record.document.size && (
                          <span className="document-size">
                            ({(record.document.size / 1024).toFixed(0)} KB)
                          </span>
                        )}
                      </div>
                      {record.document.url && (
                        <a
                          href={record.document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-document-btn"
                          title={`View ${record.document.name}`}
                        >
                          <ExternalLink size={11} />
                          <span>View</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Record Footer with ID and Verification */}
                  <div className="record-footer">
                    <span className="record-id">{record.id}</span>
                    <span className="record-verified-tag">
                      <CheckCircle2 size={11} />
                      <span>Verified Test Record</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State when no records exist */
          <div className="service-empty-state">
            <div className="empty-icon-wrap">
              <FileText size={22} color="#64748b" />
            </div>
            <h3 className="empty-title">No service records found.</h3>
            <p className="empty-text">
              No service or maintenance records have been logged for this component yet.
            </p>
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="inspection-action-section">
        <button className="add-record-btn" onClick={handleAddRecordClick}>
          <Plus size={16} />
          <span>+ Add Service Record</span>
        </button>

        {/* Temporary Toast for User Feedback */}
        {toastMessage && (
          <div className="toast-notification">
            <Info size={14} color="#38bdf8" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Component Technical Specs / Hierarchy Reference */}
      {config.info?.metadata && config.info.metadata.length > 0 && (
        <div className="inspection-specs-section">
          <h3 className="specs-header">
            <Wrench size={14} color="#94a3b8" />
            <span>Assembly Details</span>
          </h3>
          <div className="specs-grid">
            {config.info.metadata.map((item, index) => (
              <div key={index} className="spec-item">
                <span className="spec-label">{item.label}</span>
                <span className="spec-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exploded View Notice (Only for front wheel assembly) */}
      {config.associatedMeshNames && config.associatedMeshNames.length > 0 && (
        <div className="exploded-notice-card">
          <div className="notice-title">
            <Layers size={14} color="#38bdf8" />
            <span>Exploded View Active</span>
          </div>
          <p className="notice-text">
            Surrounding wheel components have been slightly separated along the axle to isolate the front tyre.
          </p>
        </div>
      )}

      {/* Footer link to full Scene Hierarchy */}
      <div className="inspection-footer">
        <button className="hierarchy-toggle-link" onClick={onOpenHierarchy}>
          <span>View complete scene hierarchy</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Add Service Record Modal */}
      <AddServiceRecordModal
        isOpen={isModalOpen}
        componentName={displayName}
        componentId={serviceData.componentId}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRecord}
      />
    </aside>
  );
}
