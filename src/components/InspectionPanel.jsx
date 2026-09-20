import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
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
    <aside className="inspection-panel" aria-label="Component Inspection Panel">
      {/* Top Header with Back to Vehicle Navigation */}
      <div className="inspection-header">
        <button
          type="button"
          className="back-to-vehicle-btn"
          onClick={onExit}
          title="Exit Inspection and return to full vehicle view"
        >
          <ArrowLeft size={13} />
          <span>Back to vehicle</span>
        </button>
        <span className="inspection-badge">INSPECTION</span>
      </div>

      {/* Component Title & Subtitle */}
      <div className="inspection-title-section">
        <div className="component-title-row">
          <h1 className="inspection-title">{displayName}</h1>
          <div className="component-menu-wrapper">
            <button
              type="button"
              className="btn-dots-menu"
              onClick={() => setShowComponentMenu(!showComponentMenu)}
              title="Component options"
              aria-expanded={showComponentMenu}
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
        <div className="inspection-subtitle-row">
          <span className="inspection-subtitle">
            {records.length > 0
              ? `${records.length} documented ${records.length === 1 ? 'event' : 'events'}`
              : 'No documented service history'}
          </span>
          {records.length > 0 && records[0]?.date && (
            <>
              <span className="inspection-meta-sep">·</span>
              <span className="inspection-last-date">
                Last documented: {formatDate(records[0].date)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Primary Add Record Action */}
      <div className="inspection-quick-action">
        <button
          type="button"
          className="add-record-btn"
          onClick={handleAddRecordClick}
        >
          <Plus size={14} />
          <span>Add Service Record</span>
        </button>
      </div>

      {/* Service History Section */}
      <div className="service-history-section">
        <div className="service-history-header">
          <div className="service-history-title-row">
            <h2 className="service-history-title">
              <Clock size={14} color="#38bdf8" />
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
                  {/* Card Header: Type Badge, Date, Mileage & Actions */}
                  <div className="record-header">
                    <div className="record-header-left">
                      <span className={`service-type-badge badge-${typeLower}`}>
                        {record.type || 'Service'}
                      </span>
                      <div className="record-date">
                        <span>{formatDate(record.date)}</span>
                        {record.mileage !== undefined && record.mileage !== null && !isNaN(Number(record.mileage)) ? (
                          <>
                            <span className="record-bullet">·</span>
                            <span>{Number(record.mileage).toLocaleString('en-IN')} km</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="record-actions">
                      <button
                        type="button"
                        className="btn-record-action"
                        onClick={() => onEditRecord && onEditRecord(record)}
                        title="Edit service record"
                      >
                        <Edit3 size={11} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn-record-action btn-record-delete"
                        onClick={() => onDeleteRecord && onDeleteRecord(record)}
                        title="Delete service record"
                      >
                        <Trash2 size={11} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Prominent Cost Metric */}
                  {record.cost !== undefined && record.cost !== null && !isNaN(Number(record.cost)) && (
                    <div className="record-cost-row">
                      <span className="record-cost-val">
                        ₹{Number(record.cost).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {record.description && (
                    <div className="record-description">
                      {record.description}
                    </div>
                  )}

                  {/* Document Evidence Section */}
                  {record.document && (
                    <div className="record-evidence-block">
                      <span className="evidence-header-label">EVIDENCE</span>
                      <div className="evidence-card">
                        <div className="evidence-file-info">
                          <FileText size={13} className="evidence-icon" />
                          <span className="evidence-filename" title={record.document.name}>
                            {record.document.name}
                          </span>
                          {record.document.size && (
                            <span className="evidence-filesize">
                              ({(record.document.size / 1024).toFixed(0)} KB)
                            </span>
                          )}
                        </div>
                        {record.document.url && (
                          <a
                            href={record.document.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="evidence-view-link"
                            title={`View ${record.document.name}`}
                          >
                            <span>View document</span>
                            <ArrowRight size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Record Footer */}
                  <div className="record-footer">
                    <span className="record-id">{record.id}</span>
                    <span className="record-verified-tag">
                      <CheckCircle2 size={11} />
                      <span>Verified Record</span>
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
              <FileText size={20} color="var(--text-tertiary)" />
            </div>
            <h3 className="empty-title">No documented service history</h3>
            <p className="empty-text">
              No service events have been recorded for this component yet.
            </p>
            <div className="empty-state-actions">
              <button
                type="button"
                className="btn-empty-add-record"
                onClick={handleAddRecordClick}
              >
                <Plus size={13} />
                <span>Add Service Record</span>
              </button>
            </div>
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
