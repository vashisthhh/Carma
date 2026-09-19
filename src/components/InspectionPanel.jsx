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
  Edit3,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { getComponentServiceHistory, addServiceRecord, getComponentDisplayName } from '../data/serviceHistoryData';
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
  onOpenHierarchy,
  onEditRecord,
  onDeleteRecord,
  onRenameComponent,
  onClearHistory,
  onOpenAddRecord
}) {
  const [toastMessage, setToastMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [showComponentMenu, setShowComponentMenu] = useState(false);

  if (!config) return null;

  // Retrieve service history for the inspected component using targetMeshName or id
  const targetId = config.targetMeshName || config.id || config.title;
  const serviceData = getComponentServiceHistory(targetId);

  const records = serviceData.records || [];
  const displayName = getComponentDisplayName(serviceData.componentId) || serviceData.displayName || config.title;

  const handleAddRecordClick = () => {
    if (onOpenAddRecord) {
      onOpenAddRecord(serviceData.componentId);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleSaveRecord = (recordData, targetCompId) => {
    addServiceRecord(targetCompId || serviceData.componentId, recordData);
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
          <ArrowLeft size={15} />
          <span>Back to Vehicle</span>
        </button>
        <span className="inspection-badge">COMPONENT INSPECTION</span>
      </div>

      {/* Component Title & Subtitle */}
      <div className="inspection-title-section">
        <div className="component-title-row">
          <h1 className="inspection-title">{displayName.toUpperCase()}</h1>
          <div className="component-menu-wrapper">
            <button
              type="button"
              className="btn-dots-menu"
              onClick={() => setShowComponentMenu(!showComponentMenu)}
              title="Component options"
            >
              <MoreVertical size={16} />
            </button>
            {showComponentMenu && (
              <div className="dropdown-menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setShowComponentMenu(false);
                    if (onRenameComponent) {
                      onRenameComponent(serviceData.componentId, displayName);
                    }
                  }}
                >
                  <Edit3 size={13} />
                  <span>Rename Component</span>
                </button>
                {records.length > 0 && (
                  <button
                    type="button"
                    className="dropdown-item dropdown-item-danger"
                    onClick={() => {
                      setShowComponentMenu(false);
                      if (onClearHistory) {
                        onClearHistory(serviceData.componentId);
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
        <p className="inspection-subtitle">
          {records.length} documented {records.length === 1 ? 'event' : 'events'}
        </p>
      </div>

      {/* Primary Add Record Action */}
      <div className="inspection-quick-action">
        <button className="add-record-btn" onClick={handleAddRecordClick}>
          <Plus size={15} />
          <span>Add Service Record</span>
        </button>
      </div>

      {/* Service History Section */}
      <div className="service-history-section">
        <div className="service-history-header">
          <div className="service-history-title-row">
            <h2 className="service-history-title">
              <Clock size={15} color="#38bdf8" />
              <span>Documented History</span>
            </h2>
          </div>
        </div>

        {/* Record Cards List */}
        {records.length > 0 ? (
          <div className="service-records-list">
            {records.map((record) => {
              const typeLower = (record.type || 'service').toLowerCase();
              return (
                <div key={record.id} className="service-record-card">
                  {/* Card Header: Type Badge & Date & Actions */}
                  <div className="record-header">
                    <div className="record-header-left">
                      <span className={`service-type-badge badge-${typeLower}`}>
                        {record.type}
                      </span>
                      <div className="record-date">
                        <Calendar size={13} />
                        <span>{formatDate(record.date)}</span>
                      </div>
                    </div>
                    <div className="record-actions">
                      <button
                        type="button"
                        className="btn-record-action"
                        onClick={() => onEditRecord && onEditRecord(record)}
                        title="Edit service record"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn-record-action btn-record-delete"
                        onClick={() => onDeleteRecord && onDeleteRecord(record)}
                        title="Delete service record"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
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

      {/* Temporary Toast for User Feedback */}
      {toastMessage && (
        <div className="toast-notification">
          <Info size={14} color="#38bdf8" />
          <span>{toastMessage}</span>
        </div>
      )}


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
