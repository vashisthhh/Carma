import React, { useState } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  Plus,
  Wrench,
  Info,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export function InspectionPanel({
  config,
  onExit,
  onOpenHierarchy
}) {
  const [toastMessage, setToastMessage] = useState(null);

  if (!config) return null;

  const handleAddRecordClick = () => {
    setToastMessage('Service record addition functionality coming in the next update.');
    setTimeout(() => setToastMessage(null), 3500);
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
        <h1 className="inspection-title">{config.title}</h1>
        <p className="inspection-subtitle">{config.subtitle}</p>
      </div>

      {/* Status Card */}
      <div className="inspection-status-card">
        <div className="status-indicator-row">
          <div className="status-pill status-neutral">
            <span className="status-dot"></span>
            <span>Status: {config.info.status}</span>
          </div>
        </div>
        <p className="status-description">{config.info.description}</p>
      </div>

      {/* Primary Action Button */}
      <div className="inspection-action-section">
        <button className="add-record-btn" onClick={handleAddRecordClick}>
          <Plus size={16} />
          <span>{config.info.buttonLabel}</span>
        </button>

        {/* Temporary Toast for Placeholder Action */}
        {toastMessage && (
          <div className="toast-notification">
            <Info size={14} color="#38bdf8" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Component Technical Specs / Hierarchy Reference */}
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

      {/* Exploded View Notice */}
      <div className="exploded-notice-card">
        <div className="notice-title">
          <Layers size={14} color="#38bdf8" />
          <span>Exploded View Active</span>
        </div>
        <p className="notice-text">
          Surrounding wheel components have been slightly separated along the axle to isolate the front tyre.
        </p>
      </div>

      {/* Footer link to full Scene Hierarchy */}
      <div className="inspection-footer">
        <button className="hierarchy-toggle-link" onClick={onOpenHierarchy}>
          <span>View complete scene hierarchy</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </aside>
  );
}
