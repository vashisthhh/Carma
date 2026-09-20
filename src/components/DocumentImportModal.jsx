import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Shield,
  ShieldCheck,
  Clock,
  Edit3
} from 'lucide-react';
import { extractDocumentWithAI, normalizeDateToISO } from '../services/aiExtractionService';
import {
  addServiceRecord,
  SUPPORTED_COMPONENTS,
  getComponentDisplayName,
  getComponentServiceHistory
} from '../data/serviceHistoryData';
import { updateVehicleDocument, calculateExpiryStatus } from '../data/vehicleData';

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

export function DocumentImportModal({
  isOpen,
  onClose,
  context = 'service-record', // 'service-record' | 'vehicle-document'
  documentCategory = null, // 'insurance' | 'puc'
  defaultComponentId = null,
  vehicleId = null,
  onRecordSaved,
  onVehicleDocumentSaved
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [extractionError, setExtractionError] = useState(null);
  const [isManualEntry, setIsManualEntry] = useState(false);

  // Service Record Form Fields
  const [targetComponentId, setTargetComponentId] = useState(defaultComponentId || 'tail-light');
  const [serviceType, setServiceType] = useState('Replacement');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [serviceCenter, setServiceCenter] = useState('');
  const [description, setDescription] = useState('');

  // Vehicle Document Form Fields (Insurance / PUC)
  const [docTitle, setDocTitle] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [issuer, setIssuer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  const fileInputRef = useRef(null);

  const isVehicleDoc = context === 'vehicle-document';
  const isPuc = documentCategory === 'puc';

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setIsExtracting(false);
      setExtractionResult(null);
      setExtractionError(null);
      setIsManualEntry(false);

      const initialComp = defaultComponentId
        ? (getComponentServiceHistory(defaultComponentId)?.componentId || defaultComponentId)
        : 'tail-light';
      setTargetComponentId(initialComp);
      setServiceType('Replacement');
      setDate(new Date().toISOString().split('T')[0]);
      setMileage('');
      setCost('');
      setServiceCenter('');
      setDescription('');

      if (isVehicleDoc) {
        setDocTitle(isPuc ? 'Pollution Under Control (PUC)' : 'Comprehensive Motor Insurance');
        setPolicyNumber('');
        setCertificateNumber('');
        setIssuer('');
        setStartDate('');
        setExpiryDate('');
        setRegistrationNumber('');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, defaultComponentId, isVehicleDoc, isPuc]);

  if (!isOpen) return null;

  // Auto-detect matching component from extracted text/parts (only used if defaultComponentId not specified)
  const detectComponentFromExtraction = (extracted) => {
    if (defaultComponentId) {
      return getComponentServiceHistory(defaultComponentId)?.componentId || defaultComponentId;
    }
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

    return 'tail-light';
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsExtracting(true);
    setExtractionError(null);
    setExtractionResult(null);

    try {
      const compName = defaultComponentId ? getComponentDisplayName(defaultComponentId) : '';
      const result = await extractDocumentWithAI(
        file,
        compName,
        defaultComponentId || '',
        {
          context,
          documentCategory
        }
      );

      if (!result.isVehicleDocument) {
        setExtractionError(
          result.reason ||
            `This document does not appear to be a valid vehicle ${isVehicleDoc ? (isPuc ? 'PUC certificate' : 'insurance policy') : 'service document'}.`
        );
        setIsExtracting(false);
        return;
      }

      setExtractionResult(result);
      const fields = result.fields || {};

      if (isVehicleDoc) {
        // Populate vehicle document fields
        if (fields.policyNumber) setPolicyNumber(fields.policyNumber);
        if (fields.certificateNumber) setCertificateNumber(fields.certificateNumber);
        if (fields.issuer) setIssuer(fields.issuer);
        if (fields.registrationNumber) setRegistrationNumber(fields.registrationNumber);
        if (fields.startDate) setStartDate(normalizeDateToISO(fields.startDate) || fields.startDate);
        if (fields.expiryDate) setExpiryDate(normalizeDateToISO(fields.expiryDate) || fields.expiryDate);
      } else {
        // Populate service record fields: authoritative defaultComponentId takes precedence
        const detectedComp = defaultComponentId
          ? (getComponentServiceHistory(defaultComponentId)?.componentId || defaultComponentId)
          : detectComponentFromExtraction(fields);
        setTargetComponentId(detectedComp);

        if (fields.serviceType) setServiceType(fields.serviceType);
        if (fields.date) setDate(normalizeDateToISO(fields.date) || fields.date);
        if (fields.mileage !== null && fields.mileage !== undefined) setMileage(String(fields.mileage));
        if (fields.cost !== null && fields.cost !== undefined) setCost(String(fields.cost));
        if (fields.serviceCenter) setServiceCenter(fields.serviceCenter);
        if (fields.description) setDescription(fields.description);
        else if (fields.parts) setDescription(fields.parts);
      }
    } catch (err) {
      setExtractionError(err.message || 'Failed to extract information from document.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveServiceRecord = (e) => {
    e.preventDefault();

    const finalTargetId =
      targetComponentId ||
      (defaultComponentId
        ? getComponentServiceHistory(defaultComponentId)?.componentId || defaultComponentId
        : 'tail-light');

    const safeMileage = mileage !== '' && !isNaN(Number(mileage)) ? parseInt(mileage, 10) : 0;
    const safeCost = cost !== '' && !isNaN(Number(cost)) ? Number(cost) : 0;

    const recordData = {
      type: serviceType || 'Maintenance',
      date: date || new Date().toISOString().split('T')[0],
      mileage: safeMileage,
      cost: safeCost,
      description: description || 'Service record',
      serviceCenter: serviceCenter || null,
      document: selectedFile
        ? {
            name: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size,
            url: URL.createObjectURL(selectedFile),
            file: selectedFile
          }
        : null
    };

    const created = addServiceRecord(finalTargetId, recordData);

    if (onRecordSaved) {
      onRecordSaved(created, finalTargetId);
    }

    onClose();
  };

  const handleSaveVehicleDocument = (e) => {
    e.preventDefault();

    const docData = {
      title: isPuc ? 'Pollution Under Control (PUC)' : 'Motor Vehicle Insurance',
      issuer: issuer || (isPuc ? 'Transport Dept. Authorized Centre' : 'Insurance Provider'),
      policyNumber: !isPuc ? (policyNumber || null) : null,
      certificateNumber: isPuc ? (certificateNumber || null) : null,
      registrationNumber: registrationNumber || null,
      startDate: startDate || null,
      expiryDate: expiryDate || null,
      document: selectedFile
        ? {
            name: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size,
            url: URL.createObjectURL(selectedFile),
            file: selectedFile
          }
        : null
    };

    const targetCategory = documentCategory || (isPuc ? 'puc' : 'insurance');
    const result = updateVehicleDocument(vehicleId || 'veh-001', targetCategory, docData);
    const savedDoc = result?.savedDoc || result;
    const updatedVehicle = result?.updatedVehicle || null;

    if (onVehicleDocumentSaved) {
      onVehicleDocumentSaved(savedDoc, targetCategory, updatedVehicle);
    }

    onClose();
  };

  // Compute dynamic expiry calculation for vehicle document review
  const expiryStatus = isVehicleDoc && expiryDate ? calculateExpiryStatus(expiryDate) : null;

  return (
    <div className="overview-modal-overlay" onClick={onClose}>
      <div className="ai-import-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              {isVehicleDoc ? (
                <Shield size={18} color="#10b981" />
              ) : (
                <FileText size={18} color="#38bdf8" />
              )}
            </div>
            <div>
              <h3>
                {isVehicleDoc
                  ? isPuc
                    ? 'Upload PUC Document'
                    : 'Upload Insurance Document'
                  : 'Import Service Document'}
              </h3>
              <p className="modal-subtitle">
                {isVehicleDoc
                  ? isPuc
                    ? 'Upload Pollution Under Control certificate to extract dates and certificate details.'
                    : 'Upload Motor Insurance policy to extract policy number, insurer and validity period.'
                  : defaultComponentId
                  ? `Upload document to extract and link history to ${getComponentDisplayName(defaultComponentId)}.`
                  : 'Upload a service invoice or receipt to extract and link history.'}
              </p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body ai-modal-body">
          {/* File Upload Dropzone (When no file is selected and not in manual entry) */}
          {!selectedFile && !isManualEntry && (
            <div
              className="ai-upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="upload-dropzone-icon" />
              <div className="upload-dropzone-text">
                <span className="upload-dropzone-title">
                  {isVehicleDoc
                    ? isPuc
                      ? 'Choose PUC certificate or drag & drop here'
                      : 'Choose Insurance policy or drag & drop here'
                    : 'Choose an invoice or drag & drop here'}
                </span>
                <span className="upload-dropzone-sub">
                  Supports PDF, PNG, JPG, JPEG (e.g. {isVehicleDoc ? 'statutory certificates' : 'workshop invoices, parts receipts'})
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

          {/* Option to enter manually without document */}
          {!selectedFile && !isManualEntry && (
            <div className="manual-entry-divider">
              <button
                type="button"
                className="btn-text-link"
                onClick={() => setIsManualEntry(true)}
              >
                <Edit3 size={13} />
                <span>Or enter details manually without a document</span>
              </button>
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
                  setIsManualEntry(false);
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
                  {isVehicleDoc
                    ? 'Extracting policy/certificate details and validity period'
                    : 'Reading date, cost, mileage, parts & verifying automotive relevance'}
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

          {/* ========================================================================= */}
          {/* VEHICLE DOCUMENT FORM (INSURANCE / PUC) */}
          {/* ========================================================================= */}
          {isVehicleDoc && (extractionResult || isManualEntry) && (
            <form onSubmit={handleSaveVehicleDocument} className="ai-review-form">
              <div className="ai-review-banner">
                <CheckCircle2 size={16} color="#10b981" />
                <span>
                  {extractionResult
                    ? 'Document details extracted. Review and confirm statutory record:'
                    : 'Enter document details manually:'}
                </span>
              </div>

              {/* Dynamic Expiry Preview Banner */}
              {expiryStatus && (
                <div className="doc-expiry-preview-card">
                  <div className="expiry-preview-left">
                    <ShieldCheck size={18} color={expiryStatus.isExpired ? '#ef4444' : '#10b981'} />
                    <div className="expiry-preview-info">
                      <span className="expiry-preview-title">
                        {isPuc ? 'PUC Validity' : 'Policy Period'}: {startDate ? `${formatDate(startDate)} → ` : ''}{formatDate(expiryDate)}
                      </span>
                      <span className="expiry-preview-sub">
                        {expiryStatus.label}
                      </span>
                    </div>
                  </div>
                  <span className={`badge-status ${expiryStatus.badgeClass}`}>
                    {expiryStatus.status}
                  </span>
                </div>
              )}

              <div className="form-grid-2col">
                {/* Policy or Certificate Number */}
                <div className="form-group-ai">
                  <label className="form-label-ai">
                    <FileText size={14} />
                    <span>{isPuc ? 'Certificate Number' : 'Policy Number'}</span>
                  </label>
                  <input
                    type="text"
                    className="form-input-ai"
                    placeholder={isPuc ? 'e.g. PUC-MH01-2026-4412' : 'e.g. POL-2026-984210'}
                    value={isPuc ? certificateNumber : policyNumber}
                    onChange={(e) => (isPuc ? setCertificateNumber(e.target.value) : setPolicyNumber(e.target.value))}
                    required
                  />
                </div>

                {/* Issuer / Provider */}
                <div className="form-group-ai">
                  <label className="form-label-ai">
                    <Building size={14} />
                    <span>{isPuc ? 'Authorized Testing Centre' : 'Insurance Provider'}</span>
                  </label>
                  <input
                    type="text"
                    className="form-input-ai"
                    placeholder={isPuc ? 'e.g. Transport Dept. Authorized Centre' : 'e.g. HDFC ERGO General Insurance'}
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    required
                  />
                </div>

                {/* Start Date */}
                <div className="form-group-ai">
                  <label className="form-label-ai">
                    <Calendar size={14} />
                    <span>{isPuc ? 'Test Date (Optional)' : 'Valid From (Optional)'}</span>
                  </label>
                  <input
                    type="date"
                    className="form-input-ai"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* Expiry Date */}
                <div className="form-group-ai">
                  <label className="form-label-ai">
                    <Clock size={14} />
                    <span>Expiry Date (Valid Until)</span>
                  </label>
                  <input
                    type="date"
                    className="form-input-ai"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Registration Number */}
              <div className="form-group-ai">
                <label className="form-label-ai">
                  <Layers size={14} />
                  <span>Vehicle Registration Number</span>
                </label>
                <input
                  type="text"
                  className="form-input-ai"
                  placeholder="e.g. MH-01-AB-1234"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
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
                  <span>Use Extracted Information</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* SERVICE RECORD FORM */}
          {/* ========================================================================= */}
          {!isVehicleDoc && (extractionResult || isManualEntry) && (
            <form onSubmit={handleSaveServiceRecord} className="ai-review-form">
              <div className="ai-review-banner">
                <CheckCircle2 size={16} color="#10b981" />
                <span>
                  {extractionResult
                    ? 'Information extracted. Review details and select target component:'
                    : 'Enter service record details:'}
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
                  />
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
                  <span>{extractionResult ? 'Use Extracted Information' : 'Save Service Record'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentImportModal;
