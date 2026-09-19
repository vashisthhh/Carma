import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Gauge,
  IndianRupee,
  Building,
  Wrench,
  Layers,
  ChevronDown
} from 'lucide-react';
import { extractDocumentWithAI } from '../services/aiExtractionService';
import { addServiceRecord, SUPPORTED_COMPONENTS } from '../data/serviceHistoryData';

export function AiImportModal({ isOpen, onClose, onRecordSaved, defaultComponentId = null }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [extractionError, setExtractionError] = useState(null);

  // Form Fields
  const [targetComponentId, setTargetComponentId] = useState(defaultComponentId || 'tail-light');
  const [serviceType, setServiceType] = useState('Replacement');
  const [date, setDate] = useState('');
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [serviceCenter, setServiceCenter] = useState('');
  const [description, setDescription] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Auto-detect matching component from extracted text/parts
  const detectComponentFromExtraction = (extracted) => {
    if (!extracted) return 'tail-light';
    const text = `${extracted.parts || ''} ${extracted.description || ''} ${extracted.partsOrWork || ''}`.toLowerCase();

    if (/tail\s*(?:light|lamp)|combination|rear\s*lamp/i.test(text)) return 'tail-light';
    if (/front\s*right\s*tyre|right\s*front\s*tyre/i.test(text)) return 'tyre-front-right';
    if (/front\s*left\s*tyre|left\s*front\s*tyre/i.test(text)) return 'tyre-front-left';
    if (/rear\s*right\s*tyre/i.test(text)) return 'tyre-rear-right';
    if (/rear\s*left\s*tyre/i.test(text)) return 'tyre-rear-left';
    if (/tyre|tire/i.test(text)) return 'tyre-front-right';
    if (/right\s*headlight|headlight\s*right|headlamp/i.test(text)) return 'headlight-right';
    if (/left\s*headlight/i.test(text)) return 'headlight-left';
    if (/rear\s*glass|back\s*glass|windshield/i.test(text)) return 'rear-glass';
    if (/steering/i.test(text)) return 'steering';
    if (/seat/i.test(text)) return 'seat-front';
    if (/boot|tailgate|latch/i.test(text)) return 'boot-lock';

    return defaultComponentId || 'tail-light';
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsExtracting(true);
    setExtractionError(null);
    setExtractionResult(null);

    try {
      const result = await extractDocumentWithAI(file, '', '');

      if (!result.isVehicleDocument) {
        setExtractionError(
          result.reason || 'This document does not contain vehicle service or maintenance information.'
        );
        setIsExtracting(false);
        return;
      }

      setExtractionResult(result);

      // Populate form fields with extracted values
      const fields = result.fields || {};
      const detectedComp = detectComponentFromExtraction(fields);
      setTargetComponentId(detectedComp);

      if (fields.serviceType) setServiceType(fields.serviceType);
      if (fields.date) setDate(fields.date);
      if (fields.mileage !== null && fields.mileage !== undefined) setMileage(String(fields.mileage));
      if (fields.cost !== null && fields.cost !== undefined) setCost(String(fields.cost));
      if (fields.serviceCenter) setServiceCenter(fields.serviceCenter);
      if (fields.description) setDescription(fields.description);
      else if (fields.parts) setDescription(fields.parts);
    } catch (err) {
      setExtractionError(err.message || 'Failed to extract information from document.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();

    const recordData = {
      type: serviceType || 'Maintenance',
      date: date || new Date().toISOString().split('T')[0],
      mileage: mileage ? parseInt(mileage, 10) : 0,
      cost: cost ? parseFloat(cost) : 0,
      description: description || 'Service record',
      serviceCenter: serviceCenter || null,
      document: selectedFile
        ? {
            name: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size,
            url: URL.createObjectURL(selectedFile)
          }
        : null
    };

    const created = addServiceRecord(targetComponentId, recordData);

    if (onRecordSaved) {
      onRecordSaved(created, targetComponentId);
    }

    onClose();
  };

  return (
    <div className="overview-modal-overlay" onClick={onClose}>
      <div className="ai-import-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <FileText size={18} color="#38bdf8" />
            </div>
            <div>
              <h3>Import Service Document</h3>
              <p className="modal-subtitle">
                Upload a service invoice or bill to automatically extract and link history.
              </p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body ai-modal-body">
          {/* File Upload Dropzone */}
          {!selectedFile && (
            <div
              className="ai-upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="upload-dropzone-icon" />
              <div className="upload-dropzone-text">
                <span className="upload-dropzone-title">
                  Choose an invoice or drag & drop here
                </span>
                <span className="upload-dropzone-sub">
                  Supports PDF, PNG, JPG, JPEG (e.g. workshop invoices, parts receipts)
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Active File & Extraction Status */}
          {selectedFile && (
            <div className="ai-file-status-card">
              <div className="file-info-group">
                <FileText size={20} color="#38bdf8" />
                <div className="file-name-meta">
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">
                    {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'Document'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-change-file"
                onClick={() => {
                  setSelectedFile(null);
                  setExtractionResult(null);
                  setExtractionError(null);
                }}
              >
                Change File
              </button>
            </div>
          )}

          {/* Loading Animation */}
          {isExtracting && (
            <div className="ai-extracting-state">
              <div className="spinner-ai"></div>
              <div className="ai-extracting-text">
                <span className="ai-extracting-title">Analyzing document...</span>
                <span className="ai-extracting-desc">
                  Reading date, cost, mileage, parts & verifying automotive relevance
                </span>
              </div>
            </div>
          )}

          {/* Rejection / Error Alert */}
          {extractionError && (
            <div className="ai-error-banner">
              <AlertTriangle size={18} color="#ef4444" />
              <div className="error-text">
                <strong>Document Not Accepted:</strong> {extractionError}
              </div>
            </div>
          )}

          {/* Verified Extracted Fields Form */}
          {extractionResult && (
            <form onSubmit={handleSave} className="ai-review-form">
              <div className="ai-review-banner">
                <CheckCircle2 size={16} color="#10b981" />
                <span>
                  Information extracted. Review details and select target component:
                </span>
              </div>

              {/* Target Component Selector */}
              <div className="form-group-ai">
                <label className="form-label-ai">
                  <Layers size={14} />
                  <span>Target Vehicle Component</span>
                </label>
                <div className="select-wrapper">
                  <select
                    className="form-input-ai form-select-ai"
                    value={targetComponentId}
                    onChange={(e) => setTargetComponentId(e.target.value)}
                    required
                  >
                    {SUPPORTED_COMPONENTS.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-chevron" />
                </div>
              </div>

              <div className="form-grid-2col">
                {/* Service Type */}
                <div className="form-group-ai">
                  <label className="form-label-ai">
                    <Wrench size={14} />
                    <span>Service Type</span>
                  </label>
                  <select
                    className="form-input-ai form-select-ai"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                  >
                    <option value="Replacement">Replacement</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Repair">Repair</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                {/* Date */}
                <div className="form-group-ai">
                  <label className="form-label-ai">
                    <Calendar size={14} />
                    <span>Service Date</span>
                  </label>
                  <input
                    type="date"
                    className="form-input-ai"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  >
                  </input>
                </div>

                {/* Mileage */}
                <div className="form-group-ai">
                  <label className="form-label-ai">
                    <Gauge size={14} />
                    <span>Mileage (km)</span>
                  </label>
                  <input
                    type="number"
                    className="form-input-ai"
                    placeholder="e.g. 48320"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                  />
                </div>

                {/* Cost */}
                <div className="form-group-ai">
                  <label className="form-label-ai">
                    <IndianRupee size={14} />
                    <span>Total Cost (₹)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input-ai"
                    placeholder="e.g. 2467"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>
              </div>

              {/* Service Center */}
              <div className="form-group-ai">
                <label className="form-label-ai">
                  <Building size={14} />
                  <span>Service Center / Workshop</span>
                </label>
                <input
                  type="text"
                  className="form-input-ai"
                  placeholder="e.g. GEMINI AUTO SERVICE CENTRE"
                  value={serviceCenter}
                  onChange={(e) => setServiceCenter(e.target.value)}
                />
              </div>

              {/* Description / Parts */}
              <div className="form-group-ai">
                <label className="form-label-ai">
                  <FileText size={14} />
                  <span>Work Performed & Parts Description</span>
                </label>
                <textarea
                  className="form-input-ai form-textarea-ai"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe parts replaced or work performed..."
                />
              </div>

              {/* Modal Footer */}
              <div className="modal-footer ai-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit-primary"
                >
                  <CheckCircle2 size={15} />
                  <span>Save Service Record</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
