import React, { useState } from 'react';
import {
  Car,
  ArrowRight,
  CheckCircle2,
  X,
  Gauge,
  Calendar,
  User,
  FileText,
  Sun,
  Moon,
  Laptop,
  AlertCircle
} from 'lucide-react';
import { LoginCarHero } from './LoginCarHero';

/**
 * Onboarding and Vehicle Setup Flow
 * 
 * Step 1: Welcome / Login Screen (Opening screen of premium automotive product)
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
  onCancel,
  themePreference = 'system',
  onThemeChange
}) {
  const [step, setStep] = useState(initialStep);

  // Login Credentials State
  const [email, setEmail] = useState('demo@carma.auto');
  const [password, setPassword] = useState('••••••••');
  const [authError, setAuthError] = useState(null);

  // Vehicle Setup Form State
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

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setAuthError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // Subtle credential validation
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (
      !cleanPassword ||
      cleanPassword.length < 4 ||
      cleanPassword.toLowerCase() === 'wrong' ||
      cleanPassword.toLowerCase() === 'error' ||
      cleanPassword.toLowerCase() === 'invalid'
    ) {
      setAuthError('Incorrect email or password.');
      return;
    }

    // Successful login:
    if (hasExistingVehicle && onLogin) {
      onLogin();
    } else {
      handleStartSetup();
    }
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
  // STEP 1: WELCOME / LOGIN SCREEN (PREMIUM AUTOMOTIVE EXPERIENCE)
  // =========================================================================
  if (step === 'welcome' && !isEditMode) {
    return (
      <div className="login-experience">
        {/* Subtle Top Navigation Bar */}
        <header className="login-topbar">
          <div className="login-brand-lockup">
            <div className="login-brand-icon">
              <Car size={17} color="#38bdf8" />
            </div>
            <div className="login-brand-text">
              <span className="login-brand-title">CARMA</span>
              <span className="login-brand-sep">·</span>
              <span className="login-brand-tagline">VEHICLE HISTORY · REIMAGINED</span>
            </div>
          </div>

          {onThemeChange && (
            <div className="theme-segmented-control login-theme-toggle">
              <button
                type="button"
                className={`theme-segment-btn ${themePreference === 'system' ? 'active' : ''}`}
                onClick={() => onThemeChange('system')}
                title="Match system appearance"
              >
                <Laptop size={12} />
                <span>Auto</span>
              </button>
              <button
                type="button"
                className={`theme-segment-btn ${themePreference === 'light' ? 'active' : ''}`}
                onClick={() => onThemeChange('light')}
                title="Light appearance"
              >
                <Sun size={12} />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`theme-segment-btn ${themePreference === 'dark' ? 'active' : ''}`}
                onClick={() => onThemeChange('dark')}
                title="Dark appearance"
              >
                <Moon size={12} />
                <span>Dark</span>
              </button>
            </div>
          )}
        </header>

        {/* Hero Composition Grid */}
        <main className="login-hero-grid">
          {/* Left Column: Brand Statement & Integrated Form */}
          <div className="login-content-column">
            <div className="login-hero-tag">THE CAR IS THE INTERFACE</div>

            <h1 className="login-hero-title">
              YOUR VEHICLE.<br />
              YOUR HISTORY.
            </h1>

            <p className="login-hero-subtitle">
              Every service. Every component. Connected to the car.
            </p>

            <div className="login-form-container">
              <div className="login-form-header">
                <h2 className="login-form-title">
                  {hasExistingVehicle ? 'Welcome back' : 'Get Started'}
                </h2>
                <p className="login-form-desc">
                  {hasExistingVehicle
                    ? `Continue to your ${existingVehicleData?.make || 'vehicle'} workspace.`
                    : 'Sign in to access or configure your vehicle workspace.'}
                </p>
              </div>

              {hasExistingVehicle && existingVehicleData && (
                <div className="login-connected-vehicle">
                  <div className="login-connected-dot" />
                  <div className="login-connected-info">
                    <span className="login-connected-model">
                      {existingVehicleData.make} {existingVehicleData.model}
                      {existingVehicleData.year ? ` · ${existingVehicleData.year}` : ''}
                    </span>
                    {existingVehicleData.registrationNumber && (
                      <span className="login-connected-reg">{existingVehicleData.registrationNumber}</span>
                    )}
                  </div>
                </div>
              )}

              {authError && (
                <div className="login-error-inline" role="alert">
                  <AlertCircle size={13} />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="login-form">
                <div className="login-field-group">
                  <label className="login-field-label" htmlFor="login-email">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    className="login-field-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="demo@carma.auto"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="login-field-group">
                  <label className="login-field-label" htmlFor="login-password">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    className="login-field-input"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <button type="submit" className="login-submit-btn">
                  <span>Continue</span>
                  <ArrowRight size={15} />
                </button>

                {hasExistingVehicle && (
                  <button
                    type="button"
                    className="login-secondary-link"
                    onClick={handleStartSetup}
                  >
                    Set up a different vehicle
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Right Column: Atmospheric 3D Vehicle Showcase */}
          <div className="login-visual-column">
            <LoginCarHero />
          </div>
        </main>
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
