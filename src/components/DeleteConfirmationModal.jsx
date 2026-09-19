import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Calendar, IndianRupee, Layers, Paperclip } from 'lucide-react';
import { getComponentDisplayName } from '../data/serviceHistoryData';

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

export function DeleteConfirmationModal({
  isOpen,
  record,
  onClose,
  onConfirm
}) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const compName = getComponentDisplayName(record.componentId);

  return (
    <div className="overview-modal-overlay" onClick={onClose}>
      <div className="delete-confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="delete-icon-badge">
              <AlertTriangle size={18} color="#ef4444" />
            </div>
            <div>
              <h3 className="modal-title">Delete Service Record?</h3>
              <p className="modal-subtitle">
                This will remove the service record and its association with this document. This action cannot be undone.
              </p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Record Summary Card */}
        <div className="delete-record-preview">
          <div className="delete-preview-row">
            <span className="delete-preview-type">{record.type}</span>
            <div className="delete-preview-date">
              <Calendar size={12} />
              <span>{formatDate(record.date)}</span>
            </div>
          </div>

          <div className="delete-preview-main">
            <div className="delete-comp-row">
              <Layers size={13} color="#94a3b8" />
              <span className="delete-comp-name">{compName}</span>
            </div>
            {record.description && (
              <p className="delete-desc-text">{record.description}</p>
            )}
          </div>

          <div className="delete-preview-footer">
            <div className="delete-cost-tag">
              <IndianRupee size={12} />
              <span>{Number(record.cost || 0).toLocaleString('en-IN')}</span>
            </div>
            {record.document && (
              <div className="delete-doc-tag">
                <Paperclip size={12} />
                <span className="delete-doc-name">{record.document.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="delete-modal-actions">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-delete-confirm"
            onClick={() => onConfirm(record.id)}
          >
            <Trash2 size={14} />
            <span>Delete Record</span>
          </button>
        </div>
      </div>
    </div>
  );
}
