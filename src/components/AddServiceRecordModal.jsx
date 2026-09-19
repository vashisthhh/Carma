import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Wrench,
  Calendar,
  Gauge,
  IndianRupee,
  FileText,
  Check,
  AlertCircle,
  Paperclip,
  File,
  Trash2,
  UploadCloud,
  Sparkles,
  Loader2,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { extractDocumentWithAI } from '../services/aiExtractionService';

const SERVICE_TYPES = [
  'Replacement',
  'Inspection',
  'Repair',
  'Maintenance'
];

/**
 * Helper to format ISO date string 'YYYY-MM-DD' to 'DD Mon YYYY'
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

export function AddServiceRecordModal({
  isOpen,
  componentName,
  componentId,
  onClose,
  onSave
}) {
  const today = new Date().toISOString().split('T')[0];

  const [serviceType, setServiceType] = useState('Replacement');
  const [date, setDate] = useState(today);
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [error, setError] = useState(null);

  // AI Extraction State: 'idle' | 'extracting' | 'review' | 'invalid_doc'
  const [aiStatus, setAiStatus] = useState('idle');
  const [aiResult, setAiResult] = useState(null);

  const fileInputRef = useRef(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setServiceType('Replacement');
      setDate(today);
      setMileage('');
      setCost('');
      setDescription('');
      setAttachedFile(null);
      setError(null);
      setAiStatus('idle');
      setAiResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setAiStatus('idle');
      setAiResult(null);
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setAiStatus('idle');
    setAiResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExtractAI = async () => {
    if (!attachedFile) return;

    setAiStatus('extracting');
    setError(null);

    try {
      const result = await extractDocumentWithAI(attachedFile, componentName, componentId);
      setAiResult(result);

      if (!result.isVehicleDocument && result.isVehicleServiceDocument !== true) {
        setAiStatus('invalid_doc');
      } else {
        setAiStatus('review');
      }
    } catch (err) {
      setError('AI extraction failed. Please enter details manually.');
      setAiStatus('idle');
    }
  };

  const handleApplyExtractedData = () => {
    if (!aiResult) return;

    const fields = aiResult.fields || aiResult;

    if (fields.serviceType) {
      setServiceType(fields.serviceType);
    }
    if (fields.date) {
      setDate(fields.date);
    }
    if (fields.mileage != null) {
      setMileage(String(fields.mileage));
    }
    if (fields.cost != null) {
      setCost(String(fields.cost));
    }
    if (fields.description) {
      setDescription(fields.description);
    }

    // Switch back to editable form with fields populated
    setAiStatus('idle');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!date) {
      setError('Please select a valid date.');
      return;
    }

    if (!mileage || Number(mileage) < 0) {
      setError('Please enter a valid mileage (km).');
      return;
    }

    if (cost === '' || Number(cost) < 0) {
      setError('Please enter a valid cost (₹).');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a short description of the service.');
      return;
    }

    setError(null);

    let documentData = null;
    if (attachedFile) {
      documentData = {
        name: attachedFile.name,
        type: attachedFile.type,
        size: attachedFile.size,
        url: URL.createObjectURL(attachedFile),
        file: attachedFile
      };
    }

    onSave({
      type: serviceType,
      date,
      mileage: Number(mileage),
      cost: Number(cost),
      description: description.trim(),
      document: documentData
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-wrap">
              <Wrench size={16} color="#38bdf8" />
            </div>
            <div>
              <h3 id="modal-title" className="modal-title">Add Service Record</h3>
              <p className="modal-subtitle">
                Component: <span className="modal-component-badge">{componentName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="modal-error-banner">
              <AlertCircle size={15} color="#ef4444" />
              <span>{error}</span>
            </div>
          )}

          {/* Service Type */}
          <div className="form-group">
            <label className="form-label" htmlFor="service-type">
              Service Type
            </label>
            <div className="service-type-grid">
              {SERVICE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`service-type-chip ${serviceType === type ? 'active' : ''}`}
                  onClick={() => setServiceType(type)}
                >
                  {serviceType === type && <Check size={12} />}
                  <span>{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Mileage Grid */}
          <div className="form-row-2col">
            <div className="form-group">
              <label className="form-label" htmlFor="service-date">
                <Calendar size={13} />
                <span>Date</span>
              </label>
              <input
                id="service-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="service-mileage">
                <Gauge size={13} />
                <span>Mileage (km)</span>
              </label>
              <input
                id="service-mileage"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 45000"
                className="form-input"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Cost */}
          <div className="form-group">
            <label className="form-label" htmlFor="service-cost">
              <IndianRupee size={13} />
              <span>Cost (₹)</span>
            </label>
            <input
              id="service-cost"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 3500"
              className="form-input"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="service-description">
              <FileText size={13} />
              <span>Description</span>
            </label>
            <textarea
              id="service-description"
              rows={3}
              placeholder="e.g. Replaced worn component with OEM specification part..."
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Attach Invoice / Document */}
          <div className="form-group">
            <label className="form-label">
              <Paperclip size={13} />
              <span>Attach Invoice / Document (Optional)</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="service-document-input"
            />

            {attachedFile ? (
              <div className="attached-file-container">
                <div className="attached-file-preview">
                  <div className="attached-file-info">
                    <div className="attached-file-icon">
                      <File size={16} color="#38bdf8" />
                    </div>
                    <div className="attached-file-text">
                      <span className="attached-file-name" title={attachedFile.name}>
                        {attachedFile.name}
                      </span>
                      <span className="attached-file-meta">
                        {(attachedFile.size / 1024).toFixed(0)} KB • Attached
                      </span>
                    </div>
                  </div>
                  <div className="attached-file-actions">
                    <button
                      type="button"
                      className="extract-ai-btn"
                      onClick={handleExtractAI}
                      disabled={aiStatus === 'extracting'}
                      title="Analyze document and extract service fields with AI"
                    >
                      {aiStatus === 'extracting' ? (
                        <>
                          <Loader2 size={13} className="spin-animation" />
                          <span>Extracting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          <span>Extract with AI</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="replace-file-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Choose a different file"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={handleRemoveFile}
                      title="Remove attached file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* AI Extracting Loading Indicator */}
                {aiStatus === 'extracting' && (
                  <div className="ai-extracting-card">
                    <Loader2 size={16} className="spin-animation" color="#38bdf8" />
                    <span>Analyzing document with AI...</span>
                  </div>
                )}

                {/* Invalid Document Warning Card */}
                {aiStatus === 'invalid_doc' && aiResult && (
                  <div className="ai-invalid-doc-card">
                    <div className="invalid-doc-header">
                      <ShieldAlert size={18} color="#ef4444" />
                      <span className="invalid-doc-title">
                        ⚠️ Document not recognized
                      </span>
                    </div>
                    <p className="invalid-doc-reason">
                      {aiResult.reason || aiResult.invalidReason || "This doesn't appear to be a vehicle service or maintenance document."}
                    </p>
                    <div className="invalid-doc-actions">
                      <button
                        type="button"
                        className="btn-remove-doc"
                        onClick={() => {
                          handleRemoveFile();
                          fileInputRef.current?.click();
                        }}
                      >
                        <UploadCloud size={13} />
                        <span>Choose Another Document</span>
                      </button>
                      <button
                        type="button"
                        className="btn-proceed-manual"
                        onClick={() => setAiStatus('idle')}
                      >
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* AI EXTRACTED Review Card */}
                {aiStatus === 'review' && aiResult && (() => {
                  const fields = aiResult.fields || aiResult;
                  const compMatch = aiResult.componentMatch || {
                    isMatch: aiResult.isComponentMatch !== false,
                    warning: aiResult.componentWarning
                  };

                  return (
                    <div className="ai-extracted-review-card">
                      <div className="ai-review-header">
                        <div className="ai-badge-group">
                          <span className="ai-badge">
                            <Sparkles size={12} />
                            <span>AI EXTRACTED</span>
                          </span>
                          <span className="ai-engine-tag">
                            {aiResult.engine === 'gemini-1.5-flash'
                              ? 'Gemini 1.5 Flash'
                              : 'Demo Fallback Engine'}
                          </span>
                        </div>
                        <span className="ai-component-locked">
                          Component: <strong>{componentName}</strong>
                        </span>
                      </div>

                      {/* Component Mismatch Warning Banner */}
                      {!compMatch.isMatch && compMatch.warning && (
                        <div className="ai-mismatch-warning">
                          <AlertCircle size={15} color="#f59e0b" />
                          <span>{compMatch.warning}</span>
                        </div>
                      )}

                      {/* Structured Extraction Summary Grid */}
                      <div className="ai-fields-list">
                        <div className="ai-field-item">
                          <span className="ai-field-label">Service Type</span>
                          <span className={`ai-field-val ${!fields.serviceType ? 'not-found' : ''}`}>
                            {fields.serviceType || 'Not found'}
                          </span>
                        </div>

                        <div className="ai-field-item">
                          <span className="ai-field-label">Date</span>
                          <span className={`ai-field-val ${!fields.date ? 'not-found' : ''}`}>
                            {fields.date ? formatDate(fields.date) : 'Not found'}
                          </span>
                        </div>

                        <div className="ai-field-item">
                          <span className="ai-field-label">Mileage</span>
                          <span className={`ai-field-val ${fields.mileage == null ? 'not-found' : ''}`}>
                            {fields.mileage != null
                              ? `${fields.mileage.toLocaleString()} km`
                              : 'Not found'}
                          </span>
                        </div>

                        <div className="ai-field-item">
                          <span className="ai-field-label">Cost</span>
                          <span className={`ai-field-val ${fields.cost == null ? 'not-found' : ''}`}>
                            {fields.cost != null ? `₹${fields.cost.toLocaleString()}` : 'Not found'}
                          </span>
                        </div>

                        <div className="ai-field-item">
                          <span className="ai-field-label">Service Center</span>
                          <span className={`ai-field-val ${!fields.serviceCenter ? 'not-found' : ''}`}>
                            {fields.serviceCenter || 'Not found'}
                          </span>
                        </div>

                        <div className="ai-field-item">
                          <span className="ai-field-label">Work Performed</span>
                          <span className={`ai-field-val ${!fields.parts && !fields.partsOrWork ? 'not-found' : ''}`}>
                            {fields.parts || fields.partsOrWork || 'Not found'}
                          </span>
                        </div>

                        <div className="ai-field-item ai-field-full">
                          <span className="ai-field-label">Description</span>
                          <span className={`ai-field-val ${!fields.description ? 'not-found' : ''}`}>
                            {fields.description || 'Not found'}
                          </span>
                        </div>

                        {fields.warranty && (
                          <div className="ai-field-item ai-field-full">
                            <span className="ai-field-label">Warranty</span>
                            <span className="ai-field-val">{fields.warranty}</span>
                          </div>
                        )}
                      </div>

                      {/* Review Actions */}
                      <div className="ai-review-actions">
                        <button
                          type="button"
                          className="btn-use-extracted"
                          onClick={handleApplyExtractedData}
                        >
                          <Check size={14} />
                          <span>Use Extracted Data</span>
                        </button>
                        <button
                          type="button"
                          className="btn-edit-extracted"
                          onClick={handleApplyExtractedData}
                        >
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn-discard-extracted"
                          onClick={() => setAiStatus('idle')}
                        >
                          <span>Discard</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div
                className="file-upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={20} color="#38bdf8" />
                <div className="dropzone-text">
                  <span className="upload-prompt">
                    <strong>Attach Invoice / Document</strong>
                  </span>
                  <span className="upload-hint">PDF, JPG, JPEG, or PNG</span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn-save"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
