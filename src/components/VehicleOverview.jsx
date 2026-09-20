import React, { useState } from 'react';
import {
  Car,
  Plus,
  Box,
  Calendar,
  Gauge,
  IndianRupee,
  FileText,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Paperclip,
  Wrench,
  RotateCcw,
  Info,
  X
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

export function VehicleOverview({
  vehicle,
  vehicles = [],
  onSelectVehicle,
  onExploreVehicle3D,
  onInspectComponent
}) {
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // Dynamically calculate summary metrics from actual service records
  const summary = getVehicleServiceSummary(vehicle?.id);
  const { totalRecords, documentCount, totalSpend, records } = summary;

  return (
    <div className="vehicle-overview-container">
      {/* Top Header / Nav Bar */}
      <header className="overview-header">
        <div className="overview-brand">
          <div className="brand-icon">
            <Car size={20} />
          </div>
          <div className="brand-info">
            <span className="brand-name">Carma</span>
            <span className="brand-tagline">Vehicle Service & Component Intelligence</span>
          </div>
        </div>

        <div className="overview-nav-actions">
          <span className="badge badge-section">MY VEHICLES</span>
          <button
            className="btn-secondary-add-vehicle"
            onClick={() => setShowAddVehicleModal(true)}
            title="Add a new vehicle"
          >
            <Plus size={15} />
            <span>Add Vehicle</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="overview-main">
        {/* Top Section: Vehicle Hero Card & Quick Actions */}
        <section className="vehicle-hero-card">
          <div className="vehicle-hero-left">
            <div className="vehicle-title-row">
              <span className="vehicle-make-badge">{vehicle.make}</span>
              <span className="vehicle-reg-badge">{vehicle.registrationNumber}</span>
            </div>

            <h1 className="vehicle-model-heading">
              {vehicle.make} {vehicle.model}
              {vehicle.variant ? <span className="vehicle-variant"> {vehicle.variant}</span> : null}
            </h1>

            <div className="vehicle-specs-row">
              <div className="spec-item">
                <Calendar size={14} className="spec-icon" />
                <span>{vehicle.year}</span>
              </div>
              <span className="spec-dot">·</span>
              <div className="spec-item">
                <Gauge size={14} className="spec-icon" />
                <span>{vehicle.odometer.toLocaleString('en-IN')} km</span>
              </div>
              <span className="spec-dot">·</span>
              <div className="spec-item">
                <span>{vehicle.fuelType}</span>
              </div>
              <span className="spec-dot">·</span>
              <div className="spec-item">
                <span>{vehicle.transmission}</span>
              </div>
            </div>
          </div>

          <div className="vehicle-hero-right">
            <button
              className="btn-explore-3d-hero"
              onClick={() => onExploreVehicle3D()}
              title="Enter interactive 3D vehicle experience"
            >
              <div className="btn-explore-icon">
                <Box size={20} />
              </div>
              <div className="btn-explore-text">
                <span className="btn-explore-title">Explore Vehicle in 3D</span>
                <span className="btn-explore-subtitle">Inspect components, geometry & parts</span>
              </div>
              <ChevronRight size={18} className="btn-explore-arrow" />
            </button>
          </div>
        </section>

        {/* Dynamic Summary Cards: DOCUMENTED HISTORY */}
        <section className="documented-history-section">
          <div className="section-header">
            <div className="section-title-wrap">
              <h2 className="section-title">DOCUMENTED HISTORY</h2>
              <span className="section-subtitle">
                Dynamic aggregation from verified component service records
              </span>
            </div>
            <span className="badge badge-verified">
              <CheckCircle2 size={12} />
              <span>Dynamic Calculation</span>
            </span>
          </div>

          <div className="summary-cards-grid">
            <div className="summary-card">
              <div className="summary-card-icon icon-records">
                <Wrench size={18} />
              </div>
              <div className="summary-card-content">
                <span className="summary-card-label">Service Records</span>
                <div className="summary-card-value-wrap">
                  <span className="summary-card-value">{totalRecords}</span>
                  <span className="summary-card-unit">logged events</span>
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card-icon icon-docs">
                <FileCheck2 size={18} />
              </div>
              <div className="summary-card-content">
                <span className="summary-card-label">Attached Documents</span>
                <div className="summary-card-value-wrap">
                  <span className="summary-card-value">{documentCount}</span>
                  <span className="summary-card-unit">verified files</span>
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card-icon icon-spend">
                <IndianRupee size={18} />
              </div>
              <div className="summary-card-content">
                <span className="summary-card-label">Documented Spend</span>
                <div className="summary-card-value-wrap">
                  <span className="summary-card-value">
                    ₹{totalSpend.toLocaleString('en-IN')}
                  </span>
                  <span className="summary-card-unit">total maintenance</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two-Column Grid: RECENT HISTORY + VEHICLE DOCUMENTS */}
        <div className="overview-details-grid">
          {/* Column 1: Chronological Recent History */}
          <section className="recent-history-section">
            <div className="section-header">
              <div className="section-title-wrap">
                <h3 className="section-title">RECENT HISTORY</h3>
                <span className="section-subtitle">
                  Chronological component maintenance & service events
                </span>
              </div>
              <button
                className="btn-link-3d"
                onClick={() => onExploreVehicle3D()}
                title="View in 3D"
              >
                <span>3D View</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            {records.length === 0 ? (
              <div className="empty-history-state">
                <Info size={24} color="#64748b" />
                <p>No service records documented for this vehicle yet.</p>
              </div>
            ) : (
              <div className="recent-records-list">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="recent-record-card"
                    onClick={() => {
                      if (onInspectComponent && record.componentId) {
                        onInspectComponent(record.componentId);
                      } else {
                        onExploreVehicle3D();
                      }
                    }}
                    title="Click to inspect this component in 3D"
                  >
                    <div className="record-header-row">
                      <div className="record-date-wrap">
                        <Calendar size={13} className="record-icon-muted" />
                        <span className="record-date">{formatDate(record.date)}</span>
                      </div>
                      <span className={`badge ${getServiceTypeBadgeClass(record.type)}`}>
                        {record.type}
                      </span>
                    </div>

                    <div className="record-body-row">
                      <div className="record-component-info">
                        <span className="record-component-name">
                          {record.componentDisplayName}
                        </span>
                        {record.description && (
                          <p className="record-description">{record.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="record-footer-row">
                      <div className="record-stats-group">
                        <div className="stat-pill">
                          <Gauge size={12} className="stat-icon" />
                          <span>{record.mileage ? `${record.mileage.toLocaleString('en-IN')} km` : '—'}</span>
                        </div>
                        <div className="stat-pill stat-cost">
                          <IndianRupee size={12} className="stat-icon" />
                          <span>{record.cost ? `₹${record.cost.toLocaleString('en-IN')}` : '—'}</span>
                        </div>
                      </div>

                      {record.document && (
                        <div
                          className="record-doc-pill"
                          title={`Attached: ${record.document.name}`}
                        >
                          <Paperclip size={12} />
                          <span className="doc-name-truncate">{record.document.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Column 2: Vehicle-Level Documents (Insurance, PUC) */}
          <section className="vehicle-documents-section">
            <div className="section-header">
              <div className="section-title-wrap">
                <h3 className="section-title">VEHICLE DOCUMENTS</h3>
                <span className="section-subtitle">
                  Ownership, compliance & statutory records
                </span>
              </div>
              <span className="badge badge-vehicle-docs">Statutory</span>
            </div>

            <div className="vehicle-docs-list">
              {vehicle.documents?.map((doc) => (
                <div key={doc.id} className="vehicle-doc-card">
                  <div className="doc-card-top">
                    <div className="doc-type-icon">
                      <ShieldCheck size={18} color="#10b981" />
                    </div>
                    <div className="doc-card-heading">
                      <span className="doc-title">{doc.title}</span>
                      <span className="doc-issuer">{doc.issuer}</span>
                    </div>
                    <span className="badge badge-active-status">
                      <CheckCircle2 size={11} />
                      <span>{doc.status}</span>
                    </span>
                  </div>

                  <div className="doc-card-details">
                    <div className="doc-meta-item">
                      <span className="doc-meta-label">
                        {doc.type === 'Insurance' ? 'Policy No' : 'Cert No'}:
                      </span>
                      <span className="doc-meta-value">
                        {doc.policyNumber || doc.certificateNumber}
                      </span>
                    </div>
                    <div className="doc-meta-item">
                      <span className="doc-meta-label">Expires:</span>
                      <span className="doc-meta-value doc-expiry-highlight">
                        {doc.expiryDate}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Explanatory Note */}
            <div className="docs-explanatory-note">
              <Info size={14} className="note-icon" />
              <span>
                Vehicle documents represent compliance metadata. Component-level service invoices are attached directly to individual service records.
              </span>
            </div>

            {/* Explore in 3D Callout Card */}
            <div className="explore-callout-card">
              <div className="callout-header">
                <Box size={18} />
                <span className="callout-title">Interactive 3D Inspection</span>
              </div>
              <p className="callout-desc">
                Select individual components like Headlights, Tyres, Back Glass, and Steering to inspect assemblies, view component history, or attach new service records.
              </p>
              <button
                className="btn-callout-explore"
                onClick={() => onExploreVehicle3D()}
              >
                <span>Launch 3D Inspection</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Add Vehicle Modal (Minimal placeholder) */}
      {showAddVehicleModal && (
        <div className="overview-modal-overlay" onClick={() => setShowAddVehicleModal(false)}>
          <div className="overview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Car size={18} />
                <h3>Add Vehicle</h3>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setShowAddVehicleModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-lead">
                Multi-vehicle garage management is coming in a future milestone.
              </p>
              <div className="modal-info-box">
                <span className="info-title">Current Active Vehicle:</span>
                <p className="info-text">
                  <strong>{vehicle.make} {vehicle.model}</strong> ({vehicle.year}) · {vehicle.registrationNumber}
                </p>
                <p className="info-subtext">
                  The current 3D interaction model is linked to this vehicle profile. Additional vehicle profiles and 3D models can be connected as new assets become available.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-modal-dismiss"
                onClick={() => setShowAddVehicleModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
