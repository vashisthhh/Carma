import React, { useState, useEffect } from 'react';
import { Edit3, X, CheckCircle2, Layers } from 'lucide-react';

export function RenameComponentModal({
  isOpen,
  componentId,
  currentDisplayName,
  onClose,
  onSave
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentDisplayName || '');
      setError(null);
    }
  }, [isOpen, currentDisplayName]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a valid component name.');
      return;
    }
    onSave(componentId, trimmed);
    onClose();
  };

  return (
    <div className="overview-modal-overlay" onClick={onClose}>
      <div className="rename-component-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Edit3 size={18} color="#38bdf8" />
            </div>
            <div>
              <h3 className="modal-title">Rename Component</h3>
              <p className="modal-subtitle">
                Change the display name of this component. The 3D model mapping and history remain intact.
              </p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rename-modal-form">
          {error && (
            <div className="modal-error-banner">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="rename-component-input">
              <Layers size={13} />
              <span>Display Name</span>
            </label>
            <input
              id="rename-component-input"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Rear Light, Front Right Tyre..."
              autoFocus
              required
            />
            <span className="form-help-text">
              Underlying ID: <code className="component-id-code">{componentId}</code> (used internally by 3D engine)
            </span>
          </div>

          <div className="rename-modal-actions">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-import"
            >
              <CheckCircle2 size={14} />
              <span>Save Name</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
