import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CarViewer } from './components/CarViewer';
import { DebugPanel } from './components/DebugPanel';
import { InspectionPanel } from './components/InspectionPanel';
import { VehicleWorkspace } from './components/VehicleWorkspace';
import { DocumentImportModal } from './components/DocumentImportModal';
import { AddServiceRecordModal } from './components/AddServiceRecordModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { RenameComponentModal } from './components/RenameComponentModal';
import { Onboarding } from './components/Onboarding';
import {
  VEHICLES,
  DEFAULT_VEHICLE_ID,
  getDefaultVehicle,
  getVehicleById,
  getStoredVehicle,
  saveStoredVehicle,
  resetVehicleData
} from './data/vehicleData';
import { getInspectionConfig, calculateCameraFraming } from './config/inspectionConfig';
import {
  updateServiceRecord,
  deleteServiceRecord,
  renameComponent,
  clearComponentHistory,
  getComponentDisplayName,
  getComponentServiceHistory,
  resetServiceHistoryData
} from './data/serviceHistoryData';
import {
  Car,
  MousePointer,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ArrowLeft,
  CheckCircle2,
  LogOut,
  AlertTriangle,
  ChevronDown,
  Edit3,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';

export default function App() {
  const containerRef = useRef(null);
  const userMenuRef = useRef(null);

  // Theme Management (System / Light / Dark)
  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('carma_theme_preference') || 'system';
  });

  useEffect(() => {
    localStorage.setItem('carma_theme_preference', themePreference);

    function applyTheme() {
      let resolvedTheme = themePreference;
      if (themePreference === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolvedTheme);
    }

    applyTheme();

    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [themePreference]);

  // Authentication & Session State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('carma_auth_session') === 'authenticated';
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hasInteractedWith3D, setHasInteractedWith3D] = useState(false);

  // Close user dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  // Vehicle Profile & Onboarding State
  const [vehicleProfile, setVehicleProfile] = useState(() => getStoredVehicle());
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);


  // Vehicle State (Generic Vehicle-Agnostic Model)
  const [currentVehicleId, setCurrentVehicleId] = useState(VEHICLES[0].id);
  const currentVehicle = vehicleProfile || getVehicleById(currentVehicleId);

  // Dynamic Records Version Tracker (triggers re-render when records change)
  const [recordsVersion, setRecordsVersion] = useState(0);

  // Unified Document Ingestion Modal State (service-record vs vehicle-document)
  const [importModalConfig, setImportModalConfig] = useState({
    isOpen: false,
    context: 'service-record',
    componentId: null,
    documentCategory: null
  });
  const [toastMessage, setToastMessage] = useState(null);

  // Data Management Modal States (Edit, Delete, Rename)
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [renamingComponent, setRenamingComponent] = useState(null);

  const [modelData, setModelData] = useState({
    rootTree: null,
    flatNodes: [],
    nodeMap: new Map(),
    totalCount: 0,
    meshCount: 0,
    groupCount: 0
  });
  const [selectedMesh, setSelectedMesh] = useState(null);
  const [modelStatus, setModelStatus] = useState('loading'); // 'loading' | 'loaded' | 'failed'
  const [modelLoadError, setModelLoadError] = useState(null);
  const [modelRetryKey, setModelRetryKey] = useState(0);

  // Component Inspection Mode States (3D View)
  const [activeInspectionConfig, setActiveInspectionConfig] = useState(null);
  const [inspectionCameraFocus, setInspectionCameraFocus] = useState(null);
  const [showHierarchyInInspection, setShowHierarchyInInspection] = useState(false);

  // Callback when 3D model finishes loading and traversing
  const handleLoaded = useCallback((data) => {
    setModelData(data);
    setModelStatus('loaded');
    setModelLoadError(null);
  }, []);

  // Callback when 3D model encounters an error
  const handleModelError = useCallback((err) => {
    console.warn('[Carma 3D] Model loading error:', err);
    setModelStatus('failed');
    setModelLoadError(err?.message || 'Failed to load 3D vehicle model.');
  }, []);

  // Safe timeout for model loading so the UI never hangs indefinitely
  useEffect(() => {
    if (modelStatus === 'loaded' || !currentVehicle?.modelPath) return;

    const timer = setTimeout(() => {
      if (modelStatus === 'loading') {
        console.warn('[Carma 3D] Model loading timed out after 18s.');
        setModelStatus('failed');
        setModelLoadError('Loading took too long. Check your connection and retry.');
      }
    }, 18000);

    return () => clearTimeout(timer);
  }, [modelStatus, currentVehicle?.modelPath, modelRetryKey]);

  const handleRetryModel = useCallback(() => {
    setModelStatus('loading');
    setModelLoadError(null);
    setModelRetryKey((k) => k + 1);
  }, []);

  // Enter Component Inspection Mode with dynamic bounding-box framing
  const handleEnterInspection = useCallback((config, cameraFraming) => {
    setActiveInspectionConfig(config);
    setInspectionCameraFocus(cameraFraming);
    setShowHierarchyInInspection(false);
    setHasInteractedWith3D(true);

    console.log(
      '%c🔍 [Entering Component Inspection Mode]',
      'color: #a33b4a; font-weight: bold; font-size: 14px;'
    );
    console.log('Inspecting Component:', config.title);
    if (cameraFraming?.boundingBox) {
      console.log('Framing Bounding Box Center:', cameraFraming.boundingBox.center);
      console.log('Framing Bounding Box Size:', cameraFraming.boundingBox.size);
    }
    console.log('Framing Target:', cameraFraming?.target);
    console.log('Framing Camera Position:', cameraFraming?.cameraPos);
  }, []);

  // Exit Component Inspection Mode
  const handleExitInspection = useCallback(() => {
    console.log(
      '%c↩️ [Exiting Component Inspection Mode]',
      'color: #94a3b8; font-style: italic;'
    );
    setActiveInspectionConfig(null);
    setInspectionCameraFocus(null);
    setShowHierarchyInInspection(false);
  }, []);

  // When a component is clicked from the workspace history, scroll to top and inspect
  const handleInspectComponentFromWorkspace = useCallback(
    (componentId) => {
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (componentId) {
        const serviceData = getComponentServiceHistory(componentId);
        const searchNames = [
          componentId,
          serviceData?.componentId,
          ...(serviceData?.aliases || [])
        ].filter(Boolean);

        let meshObj = null;
        let foundConfig = null;

        if (modelData?.nodeMap) {
          for (const name of searchNames) {
            const node = modelData.nodeMap.get(name) || modelData.nodeMap.get(name.toLowerCase());
            if (node?.objectRef) {
              meshObj = node.objectRef;
              foundConfig = getInspectionConfig(node.name || name);
              break;
            }
          }
        }

        if (!foundConfig) {
          foundConfig = getInspectionConfig(componentId);
        }

        if (meshObj && foundConfig) {
          const cameraFraming = calculateCameraFraming(meshObj);
          handleEnterInspection(foundConfig, cameraFraming);
        }
      }
    },
    [modelData, handleEnterInspection]
  );

  // When a mesh is clicked in the 3D viewport
  const handleSelectMesh = useCallback((mesh) => {
    setSelectedMesh(mesh);
    setHasInteractedWith3D(true);
  }, []);

  // When a node is clicked in the Debug Panel
  const handleSelectNode = useCallback(
    (node) => {
      if (node.objectRef) {
        setSelectedMesh(node.objectRef);

        const config = getInspectionConfig(node.name);
        if (config && !activeInspectionConfig) {
          const cameraFraming = calculateCameraFraming(node.objectRef);
          handleEnterInspection(config, cameraFraming);
        }
      }
    },
    [activeInspectionConfig, handleEnterInspection]
  );

  // Unified Modal Opening Handlers
  const handleOpenServiceDocImport = useCallback(() => {
    const rawTarget = activeInspectionConfig?.targetMeshName || activeInspectionConfig?.id;
    const resolvedCompId = rawTarget
      ? (getComponentServiceHistory(rawTarget)?.componentId || rawTarget)
      : null;
    setImportModalConfig({
      isOpen: true,
      context: 'service-record',
      componentId: resolvedCompId,
      documentCategory: null
    });
  }, [activeInspectionConfig]);

  const handleOpenAddRecordFromInspection = useCallback((compTargetId) => {
    const resolvedCompId = compTargetId
      ? (getComponentServiceHistory(compTargetId)?.componentId || compTargetId)
      : null;
    setImportModalConfig({
      isOpen: true,
      context: 'service-record',
      componentId: resolvedCompId,
      documentCategory: null
    });
  }, []);

  const handleOpenVehicleDocUpload = useCallback((category) => {
    setImportModalConfig({
      isOpen: true,
      context: 'vehicle-document',
      componentId: null,
      documentCategory: category
    });
  }, []);

  // When a record is imported / saved via DocumentImportModal
  const handleRecordSaved = useCallback((newRecord, componentId) => {
    setRecordsVersion((v) => v + 1);
    setToastMessage(`Service record successfully saved.`);
    setTimeout(() => setToastMessage(null), 3500);

    // If user saved a record for a component, focus it
    if (componentId) {
      handleInspectComponentFromWorkspace(componentId);
    }
  }, [handleInspectComponentFromWorkspace]);

  // When a vehicle statutory document is saved
  const handleVehicleDocumentSaved = useCallback((savedDoc, category, updatedVehicle) => {
    const latest = updatedVehicle || getStoredVehicle() || getVehicleById(currentVehicleId);
    setVehicleProfile({ ...latest });
    setRecordsVersion((v) => v + 1);
    const docName = category === 'puc' ? 'PUC' : 'Insurance';
    setToastMessage(`${docName} document verified and saved.`);
    setTimeout(() => setToastMessage(null), 3500);
  }, [currentVehicleId]);

  // Data Management Handlers (Edit, Delete, Rename, Clear History)
  const handleEditRecord = useCallback((record) => {
    setEditingRecord(record);
  }, []);

  const handleDeleteRecord = useCallback((record) => {
    setDeletingRecord(record);
  }, []);

  const handleConfirmDelete = useCallback((recordId) => {
    const res = deleteServiceRecord(recordId);
    if (res.success) {
      setRecordsVersion((v) => v + 1);
      setDeletingRecord(null);
      setToastMessage('Service record deleted.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, []);

  const handleSaveEditedRecord = useCallback((recordData, targetCompId) => {
    if (editingRecord) {
      const res = updateServiceRecord(editingRecord.id, recordData, targetCompId);
      if (res) {
        setRecordsVersion((v) => v + 1);
        setEditingRecord(null);
        setToastMessage('Service record updated successfully.');
        setTimeout(() => setToastMessage(null), 3000);

        if (targetCompId && targetCompId !== editingRecord.componentId) {
          handleInspectComponentFromWorkspace(targetCompId);
        }
      }
    }
  }, [editingRecord, handleInspectComponentFromWorkspace]);

  const handleRenameComponent = useCallback((componentId, currentName) => {
    setRenamingComponent({ id: componentId, name: currentName });
  }, []);

  const handleSaveRenamedComponent = useCallback((componentId, newName) => {
    renameComponent(componentId, newName);
    setRecordsVersion((v) => v + 1);
    setRenamingComponent(null);
    setToastMessage(`Component renamed to "${newName}".`);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleClearHistory = useCallback((componentId) => {
    const res = clearComponentHistory(componentId);
    setRecordsVersion((v) => v + 1);
    setToastMessage(`Cleared ${res.clearedCount} records from component history.`);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleOnboardingComplete = useCallback((data) => {
    const saved = saveStoredVehicle(data);
    setVehicleProfile(saved);
    localStorage.setItem('carma_auth_session', 'authenticated');
    setIsAuthenticated(true);
    setToastMessage(`Welcome to your ${saved.make} ${saved.model} workspace!`);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const handleLogin = useCallback(() => {
    localStorage.setItem('carma_auth_session', 'authenticated');
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('carma_auth_session');
    setIsAuthenticated(false);
    setShowLogoutConfirm(false);
    setActiveInspectionConfig(null);
    setToastMessage('Logged out successfully.');
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleResetDemo = useCallback(() => {
    // 1. Clear persisted client-side stores
    resetVehicleData();
    resetServiceHistoryData();
    localStorage.removeItem('carma_auth_session');
    localStorage.removeItem('carma_vehicle_profile');

    // 2. Reset in-memory application state
    setVehicleProfile(null);
    setIsAuthenticated(false);
    setShowResetConfirm(false);
    setShowLogoutConfirm(false);
    setActiveInspectionConfig(null);
    setSelectedMesh(null);
    setEditingRecord(null);
    setDeletingRecord(null);
    setRenamingComponent(null);
    setCurrentVehicleId(DEFAULT_VEHICLE_ID);
    setRecordsVersion((v) => v + 1);

    // 3. User feedback
    setToastMessage('Demo reset to initial setup state.');
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const handleSaveVehicleEdit = useCallback((data) => {
    const saved = saveStoredVehicle(data);
    setVehicleProfile(saved);
    setIsEditingVehicle(false);
    setToastMessage('Vehicle details updated.');
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Protected Route Gate: If user is not authenticated, show Welcome / Login screen
  if (!isAuthenticated) {
    return (
      <Onboarding
        initialStep="welcome"
        hasExistingVehicle={Boolean(vehicleProfile)}
        existingVehicleData={vehicleProfile}
        onLogin={handleLogin}
        onComplete={handleOnboardingComplete}
        themePreference={themePreference}
        onThemeChange={setThemePreference}
      />
    );
  }

  return (
    <div className="app-workspace-page" ref={containerRef}>
      {/* Sticky Top Navigation Bar */}
      <header className="workspace-navbar">
        <div className="navbar-brand">
          <div className="navbar-brand-icon">
            <Car size={18} />
          </div>
          <div className="navbar-brand-text">
            <span className="navbar-brand-title">CARMA</span>
            <span className="navbar-brand-sub">DIGITAL COCKPIT</span>
          </div>
        </div>

        <div className="navbar-actions-right">
          <div className="user-menu-wrapper" ref={userMenuRef}>
            <button
              type="button"
              className="btn-user-profile"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-expanded={showUserMenu}
            >
              <div className="user-avatar-dot"></div>
              <span className="user-vehicle-label">
                {currentVehicle?.ownerName ? `${currentVehicle.ownerName}'s ` : ''}
                {currentVehicle?.make} {currentVehicle?.model}
              </span>
              <ChevronDown size={14} className={`user-menu-chevron ${showUserMenu ? 'open' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="user-dropdown-menu">
                <div className="user-dropdown-header">
                  <span className="dropdown-owner-name">{currentVehicle?.ownerName || 'Vehicle Owner'}</span>
                  <span className="dropdown-vehicle-info">{currentVehicle?.make} {currentVehicle?.model} ({currentVehicle?.year})</span>
                  {currentVehicle?.registrationNumber && (
                    <span className="dropdown-reg-badge">{currentVehicle.registrationNumber}</span>
                  )}
                </div>
                <div className="user-dropdown-divider"></div>
                <div className="user-dropdown-theme-section">
                  <span className="dropdown-section-label">Appearance</span>
                  <div className="theme-segmented-control">
                    <button
                      type="button"
                      className={`theme-segment-btn ${themePreference === 'system' ? 'active' : ''}`}
                      onClick={() => setThemePreference('system')}
                      title="Match system appearance"
                    >
                      <Laptop size={12} />
                      <span>Auto</span>
                    </button>
                    <button
                      type="button"
                      className={`theme-segment-btn ${themePreference === 'light' ? 'active' : ''}`}
                      onClick={() => setThemePreference('light')}
                      title="Light appearance"
                    >
                      <Sun size={12} />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      className={`theme-segment-btn ${themePreference === 'dark' ? 'active' : ''}`}
                      onClick={() => setThemePreference('dark')}
                      title="Dark appearance"
                    >
                      <Moon size={12} />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>
                <div className="user-dropdown-divider"></div>
                <button
                  type="button"
                  className="user-dropdown-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    setIsEditingVehicle(true);
                  }}
                >
                  <Edit3 size={14} />
                  <span>Edit Vehicle Details</span>
                </button>
                <button
                  type="button"
                  className="user-dropdown-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowResetConfirm(true);
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Reset Demo</span>
                </button>
                <div className="user-dropdown-divider"></div>
                <button
                  type="button"
                  className="user-dropdown-item dropdown-item-logout"
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowLogoutConfirm(true);
                  }}
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SECTION 1: HERO PRIMARY AREA — 3D VEHICLE */}
      <section className="hero-3d-section">
        {/* Vehicle Identity Header immediately above 3D */}
        <div className="hero-vehicle-identity">
          <div className="identity-title-row">
            <h1 className="hero-vehicle-name">
              {currentVehicle?.make} {currentVehicle?.model}
            </h1>
            {currentVehicle?.variant && (
              <span className="hero-vehicle-variant">{currentVehicle.variant}</span>
            )}
          </div>
          <div className="hero-specs-row">
            <span className="spec-item">{currentVehicle?.year}</span>
            <span className="spec-bullet">·</span>
            <span className="spec-item">
              {currentVehicle?.odometer ? currentVehicle.odometer.toLocaleString('en-IN') : '0'} km
            </span>
            {currentVehicle?.registrationNumber && (
              <>
                <span className="spec-bullet">·</span>
                <span className="spec-reg">{currentVehicle.registrationNumber}</span>
              </>
            )}
            <button
              type="button"
              className="btn-hero-edit-vehicle"
              onClick={() => setIsEditingVehicle(true)}
              title="Edit vehicle details"
            >
              <Edit3 size={11} />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Loading Screen for 3D Asset */}
        {modelStatus === 'loading' && currentVehicle?.modelPath && (
          <div className="loading-screen">
            <div className="spinner"></div>
            <div className="loading-text">
              Loading {currentVehicle?.make} {currentVehicle?.model} 3D Model...
            </div>
            <div className="loading-subtext">
              Downloading 3D vehicle asset (24 MB)...
            </div>
          </div>
        )}

        {/* 3D Canvas Viewport */}
        <div className="hero-3d-canvas-container">
          {modelStatus === 'failed' ? (
            <div className="no-3d-fallback">
              <div className="fallback-card">
                <AlertTriangle size={36} color="#d97706" />
                <h3>3D Vehicle Viewport Paused</h3>
                <p>
                  {modelLoadError || 'The 3D model could not be loaded.'}
                  <br />
                  Your vehicle workspace, records, and documents below are fully functional.
                </p>
                <button
                  type="button"
                  className="btn-switch-demo"
                  onClick={handleRetryModel}
                >
                  <RotateCcw size={13} style={{ display: 'inline', marginRight: 6 }} />
                  <span>Retry Loading 3D Model</span>
                </button>
              </div>
            </div>
          ) : currentVehicle?.modelPath ? (
            <CarViewer
              key={modelRetryKey}
              onLoaded={handleLoaded}
              onError={handleModelError}
              onSelectMesh={handleSelectMesh}
              selectedMesh={selectedMesh}
              inspectionConfig={activeInspectionConfig}
              inspectionCameraFocus={inspectionCameraFocus}
              onEnterInspection={handleEnterInspection}
            />
          ) : (
            <div className="no-3d-fallback">
              <div className="fallback-card">
                <Car size={36} color="#64748b" />
                <h3>3D Model Not Available</h3>
                <p>
                  Interactive 3D model is currently available for the <strong>Hyundai Eon</strong> demo.
                  Your vehicle workspace, records, and documents for <strong>{currentVehicle?.make} {currentVehicle?.model}</strong> are fully functional below.
                </p>
                <button
                  type="button"
                  className="btn-switch-demo"
                  onClick={() => {
                    const demo = saveStoredVehicle({
                      ownerName: currentVehicle?.ownerName || 'Vashisth',
                      make: 'Hyundai',
                      model: 'Eon',
                      year: 2019,
                      odometer: 61240,
                      registrationNumber: 'MH-01-AB-1234'
                    });
                    setVehicleProfile(demo);
                  }}
                >
                  Switch to Hyundai Eon Demo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Inspection Mode Status Overlay / Back to Vehicle Button */}
        {activeInspectionConfig ? (
          <div className="floating-back-container">
            <button
              className="floating-back-btn"
              onClick={handleExitInspection}
              title="Exit Inspection and return to full vehicle view"
            >
              <ArrowLeft size={16} />
              <span>Back to Vehicle</span>
            </button>
          </div>
        ) : (
          <div className={`hero-interaction-hint ${hasInteractedWith3D ? 'hint-dimmed' : ''}`}>
            <span className="hint-pill">
              Select a component to inspect its history
            </span>
          </div>
        )}


        {/* Inspection Panel (Slides in on right when a component is inspected) */}
        {activeInspectionConfig && !showHierarchyInInspection && (
          <InspectionPanel
            config={activeInspectionConfig}
            onExit={handleExitInspection}
            onOpenHierarchy={() => setShowHierarchyInInspection(true)}
            onEditRecord={handleEditRecord}
            onDeleteRecord={handleDeleteRecord}
            onRenameComponent={handleRenameComponent}
            onClearHistory={handleClearHistory}
            onOpenAddRecord={handleOpenAddRecordFromInspection}
          />
        )}

        {/* Diagnostic Scene Graph Tree (If hierarchy explicitly opened) */}
        {showHierarchyInInspection && (
          <DebugPanel
            rootTree={modelData.rootTree}
            flatNodes={modelData.flatNodes}
            nodeMap={modelData.nodeMap}
            totalCount={modelData.totalCount}
            meshCount={modelData.meshCount}
            groupCount={modelData.groupCount}
            selectedMesh={selectedMesh}
            onSelectNode={handleSelectNode}
          />
        )}

        {/* Navigation & Interaction Hint Overlay (Bottom Left of 3D Canvas) */}
        <div className="hint-overlay">
          <div className="hint-item">
            <RotateCw size={12} />
            <span><span className="hint-key">Left Drag</span> Orbit</span>
          </div>
          <div className="hint-item">
            <ZoomIn size={12} />
            <span><span className="hint-key">Scroll</span> Zoom</span>
          </div>
          <div className="hint-item">
            <MousePointer size={12} />
            <span><span className="hint-key">Right Drag</span> Pan</span>
          </div>
        </div>
      </section>

      {/* SECTION 2: VEHICLE WORKSPACE & DATA UNDERNEATH */}
      <VehicleWorkspace
        vehicle={currentVehicle}
        onInspectComponent={handleInspectComponentFromWorkspace}
        onOpenAiImport={handleOpenServiceDocImport}
        onOpenVehicleDocUpload={handleOpenVehicleDocUpload}
        recordsVersion={recordsVersion}
        onEditRecord={handleEditRecord}
        onDeleteRecord={handleDeleteRecord}
        onRenameComponent={handleRenameComponent}
        onClearHistory={handleClearHistory}
        onEditVehicle={() => setIsEditingVehicle(true)}
      />

      {/* Edit Vehicle Details Modal */}
      {isEditingVehicle && (
        <Onboarding
          isEditMode={true}
          initialData={currentVehicle}
          onComplete={handleSaveVehicleEdit}
          onCancel={() => setIsEditingVehicle(false)}
        />
      )}

      {/* Unified Document Ingestion Modal (Service Records & Statutory Vehicle Documents) */}
      <DocumentImportModal
        isOpen={importModalConfig.isOpen}
        context={importModalConfig.context}
        documentCategory={importModalConfig.documentCategory}
        defaultComponentId={importModalConfig.componentId}
        vehicleId={currentVehicle?.id}
        onClose={() => setImportModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onRecordSaved={handleRecordSaved}
        onVehicleDocumentSaved={handleVehicleDocumentSaved}
      />

      {/* Edit Service Record Modal */}
      {editingRecord && (
        <AddServiceRecordModal
          isOpen={Boolean(editingRecord)}
          initialRecord={editingRecord}
          componentId={editingRecord.componentId}
          componentName={getComponentDisplayName(editingRecord.componentId)}
          onClose={() => setEditingRecord(null)}
          onSave={handleSaveEditedRecord}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord && (
        <DeleteConfirmationModal
          isOpen={Boolean(deletingRecord)}
          record={deletingRecord}
          onClose={() => setDeletingRecord(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Rename Component Modal */}
      {renamingComponent && (
        <RenameComponentModal
          isOpen={Boolean(renamingComponent)}
          componentId={renamingComponent.id}
          currentDisplayName={renamingComponent.name}
          onClose={() => setRenamingComponent(null)}
          onSave={handleSaveRenamedComponent}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="overview-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="logout-confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="logout-modal-header">
              <div className="logout-icon-wrap">
                <LogOut size={18} color="#f59e0b" />
              </div>
              <div>
                <h3 className="logout-modal-title">Log out?</h3>
                <p className="logout-modal-subtitle">
                  You can sign back in anytime. Your vehicle history and documents will remain saved.
                </p>
              </div>
            </div>
            <div className="logout-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-logout-confirm"
                onClick={handleLogout}
              >
                <LogOut size={13} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Demo Confirmation Modal */}
      {showResetConfirm && (
        <div className="overview-modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="reset-confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="reset-modal-header">
              <div className="reset-icon-wrap">
                <AlertTriangle size={18} color="#ef4444" />
              </div>
              <div>
                <h3 className="reset-modal-title">Reset demo?</h3>
                <p className="reset-modal-subtitle">
                  This will remove the current vehicle profile, service history, documents and vehicle information and return the app to its initial setup state.
                </p>
              </div>
            </div>
            <div className="reset-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-reset-demo-confirm"
                onClick={handleResetDemo}
              >
                <RotateCcw size={13} />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="global-toast-notification">
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
