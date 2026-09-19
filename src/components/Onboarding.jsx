import React, { useState } from 'react';
import { Car, ArrowRight, CheckCircle2, X, Gauge, Calendar, User, FileText } from 'lucide-react';

/**
 * Onboarding and Vehicle Setup Flow
 * 
 * Step 1: Welcome Screen (Your vehicle. One history.)
 * Step 2: Vehicle Setup Form (Let's set up your vehicle)
 * Also supports edit mode for updating vehicle details later.
 */
export function Onboarding({
  initialStep = 'welcome',
  initialData = null,
  hasExistingVehicle = false,
  existingVehicleData = null,
  onComplete,
  onLogin,
  isEditMode = false,
  onCancel
}) {
  const [step, setStep] = useState(initialStep);

  // Form State
  const [ownerName, setOwnerName] = useState(initialData?.ownerName || '');
  const [make, setMake] = useState(initialData?.make || 'Hyundai');
  const [model, setModel] = useState(initialData?.model || 'Eon');
  const [year, setYear] = useState(initialData?.year ? String(initialData.year) : '2019');
  const [odometer, setOdometer] = useState(initialData?.odometer ? String(initialData.odometer) : '61240');
  const [registrationNumber, setRegistrationNumber] = useState(initialData?.registrationNumber || 'MH 01 AB 1234');
  const [error, setError] = useState(null);

  const handleStartSetup = () => {
    setStep('setup');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!make.trim()) {
      setError('Please enter the vehicle brand.');
      return;
    }
    if (!model.trim()) {
      setError('Please enter the vehicle model.');
      return;
    }

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setError('Please enter a valid year.');
      return;
    }

    const odoNum = parseInt(odometer.replace(/[^0-9]/g, ''), 10);
    if (isNaN(odoNum) || odoNum < 0) {
      setError('Please enter a valid odometer reading.');
      return;
    }

    setError(null);

    const vehicleData = {
      ownerName: ownerName.trim(),
      make: make.trim(),
      model: model.trim(),
      year: yearNum,
      odometer: odoNum,
      registrationNumber: registrationNumber.trim()
    };

    if (onComplete) {
      onComplete(vehicleData);
    }
  };

  // =========================================================================
  // STEP 1: WELCOME / LOGIN SCREEN
  // =========================================================================
  if (step === 'welcome' && !isEditMode) {
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-card welcome-card">
          <div className="onboarding-badge-icon">
            <Car size={32} color="#38bdf8" />
          </div>

          <h1 className="welcome-headline">
            Your vehicle. One history.
          </h1>

          <p className="welcome-subtext">
            {hasExistingVehicle
              ? 'Access your vehicle workspace, service history, and statutory documents.'
              : 'Keep your service records, documents and important vehicle dates connected to the vehicle itself.'}
          </p>

          <div className="welcome-actions-stack">
            <button
              type="button"
              className="btn-onboarding-primary"
              onClick={hasExistingVehicle && onLogin ? onLogin : handleStartSetup}
            >
              <span>{hasExistingVehicle ? 'Enter Workspace' : 'Get Started'}</span>
              <ArrowRight size={16} />
            </button>

            {hasExistingVehicle && (
              <button
                type="button"
                className="btn-setup-different"
                onClick={handleStartSetup}
              >
                Set up a different vehicle
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP 2: VEHICLE SETUP SCREEN (OR EDIT MODAL)
  // =========================================================================
  return (
    <div className={`onboarding-overlay ${isEditMode ? 'onboarding-modal-mode' : ''}`}>
      <div className="onboarding-card setup-card">
        {isEditMode && (
          <button
            type="button"
            className="btn-close-onboarding"
            onClick={onCancel}
            title="Cancel"
          >
            <X size={18} />
          </button>
        )}

        <div className="setup-header">
          <div className="setup-icon-wrap">
            <Car size={22} color="#38bdf8" />
          </div>
          <div>
            <h2 className="setup-title">
              {isEditMode ? 'Edit Vehicle Details' : "Let's set up your vehicle"}
            </h2>
            <p className="setup-subtitle">
              {isEditMode
                ? 'Update your vehicle profile and odometer information.'
                : 'Enter your vehicle details to personalize your workspace.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="setup-error-banner">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="setup-form">
          {/* Your Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="setup-owner-name">
              <User size={13} />
              <span>Your name</span>
            </label>
            <input
              id="setup-owner-name"
              type="text"
              className="form-input"
              placeholder="e.g. Vashisth"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              autoFocus={!isEditMode}
            />
          </div>

          {/* Vehicle Brand & Model */}
          <div className="form-row-2col">
            <div className="form-group">
              <label className="form-label" htmlFor="setup-make">
                <Car size={13} />
                <span>Vehicle brand</span>
              </label>
              <input
                id="setup-make"
                type="text"
                className="form-input"
                placeholder="e.g. Hyundai"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="setup-model">
                <span>Model</span>
              </label>
              <input
                id="setup-model"
                type="text"
                className="form-input"
                placeholder="e.g. Eon"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Year & Odometer */}
          <div className="form-row-2col">
            <div className="form-group">
              <label className="form-label" htmlFor="setup-year">
                <Calendar size={13} />
                <span>Year</span>
              </label>
              <input
                id="setup-year"
                type="number"
                className="form-input"
                placeholder="e.g. 2019"
                min="1980"
                max="2030"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="setup-odometer">
                <Gauge size={13} />
                <span>Current odometer</span>
              </label>
              <input
                id="setup-odometer"
                type="number"
                className="form-input"
                placeholder="e.g. 61,240 km"
                min="0"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Registration Number */}
          <div className="form-group">
            <label className="form-label" htmlFor="setup-registration">
              <FileText size={13} />
              <span>Registration number (Optional)</span>
            </label>
            <input
              id="setup-registration"
              type="text"
              className="form-input"
              placeholder="e.g. MH 01 AB 1234"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="setup-actions">
            {isEditMode && (
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn-onboarding-primary"
            >
              <CheckCircle2 size={16} />
              <span>{isEditMode ? 'Save Changes' : 'Continue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
