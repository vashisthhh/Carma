import React, { useState, useCallback, useRef } from 'react';
import { CarViewer } from './components/CarViewer';
import { DebugPanel } from './components/DebugPanel';
import { InspectionPanel } from './components/InspectionPanel';
import { VehicleWorkspace } from './components/VehicleWorkspace';
import { AiImportModal } from './components/AiImportModal';
import { VEHICLES, getDefaultVehicle, getVehicleById } from './data/vehicleData';
import { getInspectionConfig, calculateCameraFraming } from './config/inspectionConfig';
import { Car, MousePointer, RotateCw, ZoomIn, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function App() {
  const containerRef = useRef(null);

  // Vehicle State (Generic Vehicle-Agnostic Model)
  const [currentVehicleId, setCurrentVehicleId] = useState(VEHICLES[0].id);
  const currentVehicle = getVehicleById(currentVehicleId);

  // Dynamic Records Version Tracker (triggers re-render when records change)
  const [recordsVersion, setRecordsVersion] = useState(0);

  // AI Import Modal State
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [modelData, setModelData] = useState({
    rootTree: null,
    flatNodes: [],
    nodeMap: new Map(),
    totalCount: 0,
    meshCount: 0,
    groupCount: 0
  });
  const [selectedMesh, setSelectedMesh] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Component Inspection Mode States (3D View)
  const [activeInspectionConfig, setActiveInspectionConfig] = useState(null);
  const [inspectionCameraFocus, setInspectionCameraFocus] = useState(null);
  const [showHierarchyInInspection, setShowHierarchyInInspection] = useState(false);

  // Callback when 3D model finishes loading and traversing
  const handleLoaded = useCallback((data) => {
    setModelData(data);
    setIsLoading(false);
  }, []);

  // Enter Component Inspection Mode with dynamic bounding-box framing
  const handleEnterInspection = useCallback((config, cameraFraming) => {
    setActiveInspectionConfig(config);
    setInspectionCameraFocus(cameraFraming);
    setShowHierarchyInInspection(false);

    console.log(
      '%c🔍 [Entering Component Inspection Mode]',
      'color: #38bdf8; font-weight: bold; font-size: 14px;'
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
        const config = getInspectionConfig(componentId);
        if (config && modelData.nodeMap) {
          const meshObj =
            modelData.nodeMap.get(componentId)?.objectRef ||
            modelData.nodeMap.get(config.targetMeshName)?.objectRef;
          if (meshObj) {
            const cameraFraming = calculateCameraFraming(meshObj);
            handleEnterInspection(config, cameraFraming);
          }
        }
      }
    },
    [modelData, handleEnterInspection]
  );

  // When a mesh is clicked in the 3D viewport
  const handleSelectMesh = useCallback((mesh) => {
    setSelectedMesh(mesh);
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

  // When a record is imported via AI
  const handleRecordSaved = useCallback((newRecord, componentId) => {
    setRecordsVersion((v) => v + 1);
    setToastMessage(`Service record successfully saved.`);
    setTimeout(() => setToastMessage(null), 3500);

    // If user saved a record for a component, focus it
    if (componentId) {
      handleInspectComponentFromWorkspace(componentId);
    }
  }, [handleInspectComponentFromWorkspace]);

  return (
    <div className="app-workspace-page" ref={containerRef}>
      {/* Sticky Top Navigation Bar */}
      <header className="workspace-navbar">
        <div className="navbar-brand">
          <div className="navbar-brand-icon">
            <Car size={18} color="#38bdf8" />
          </div>
          <div className="navbar-brand-text">
            <span className="navbar-brand-title">Carma</span>
            <span className="navbar-brand-sub">Vehicle Workspace</span>
          </div>
        </div>

        <div className="navbar-center-info">
          <span className="badge badge-vehicle-active">
            {currentVehicle.make} {currentVehicle.model} ({currentVehicle.year})
          </span>
          <span className="badge badge-reg-muted">{currentVehicle.registrationNumber}</span>
        </div>
      </header>

      {/* SECTION 1: HERO PRIMARY AREA — 3D VEHICLE */}
      <section className="hero-3d-section">
        {/* Loading Screen for 3D Asset */}
        {isLoading && (
          <div className="loading-screen">
            <div className="spinner"></div>
            <div className="loading-text">
              Loading {currentVehicle.make} {currentVehicle.model} 3D Model...
            </div>
          </div>
        )}

        {/* 3D Canvas Viewport */}
        <div className="hero-3d-canvas-container">
          <CarViewer
            onLoaded={handleLoaded}
            onSelectMesh={handleSelectMesh}
            selectedMesh={selectedMesh}
            inspectionConfig={activeInspectionConfig}
            inspectionCameraFocus={inspectionCameraFocus}
            onEnterInspection={handleEnterInspection}
          />
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
          <div className="hero-interaction-hint">
            <span className="hint-pill">
              Click any component to inspect history & records
            </span>
          </div>
        )}

        {/* Inspection Panel (Slides in on right when a component is inspected) */}
        {activeInspectionConfig && !showHierarchyInInspection && (
          <InspectionPanel
            config={activeInspectionConfig}
            onExit={handleExitInspection}
            onOpenHierarchy={() => setShowHierarchyInInspection(true)}
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
        onOpenAiImport={() => setIsAiImportOpen(true)}
        recordsVersion={recordsVersion}
      />

      {/* AI Document Import Modal */}
      <AiImportModal
        isOpen={isAiImportOpen}
        onClose={() => setIsAiImportOpen(false)}
        onRecordSaved={handleRecordSaved}
        defaultComponentId={activeInspectionConfig?.targetMeshName || null}
      />

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
