import React, { useState, useCallback } from 'react';
import { CarViewer } from './components/CarViewer';
import { DebugPanel } from './components/DebugPanel';
import { InspectionPanel } from './components/InspectionPanel';
import { getInspectionConfig, calculateCameraFraming } from './config/inspectionConfig';
import { Car, MousePointer, RotateCw, ZoomIn, ArrowLeft } from 'lucide-react';

export default function App() {
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

  // Component Inspection Mode States
  const [activeInspectionConfig, setActiveInspectionConfig] = useState(null);
  const [inspectionCameraFocus, setInspectionCameraFocus] = useState(null);
  const [showHierarchyInInspection, setShowHierarchyInInspection] = useState(false);

  // Callback when model finishes loading and traversing
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

  // When a mesh is clicked in the 3D viewport
  const handleSelectMesh = useCallback((mesh) => {
    setSelectedMesh(mesh);
  }, []);

  // When a node is clicked in the Debug Panel
  const handleSelectNode = useCallback(
    (node) => {
      if (node.objectRef) {
        console.log(
          '%c📋 [Selected via Hierarchy Tree]',
          'color: #a855f7; font-weight: bold; font-size: 13px;'
        );
        console.log(`Node #${node.index}: "%c${node.name}%c"`, 'color: #c084fc; font-weight: bold;', '');
        console.log('Type:', node.type);
        console.log('Parent:', node.parentName || '(root)');
        console.log('Vertices:', node.vertexCount);
        console.log('Material:', node.materialName);
        console.log('Object Reference:', node.objectRef);

        setSelectedMesh(node.objectRef);

        // If user clicks an inspectable component in the tree, enter inspection mode for it
        const config = getInspectionConfig(node.name);
        if (config && !activeInspectionConfig) {
          const cameraFraming = calculateCameraFraming(node.objectRef);
          handleEnterInspection(config, cameraFraming);
        }
      }
    },
    [activeInspectionConfig, handleEnterInspection]
  );

  return (
    <div className="app-container">
      {/* Top Header Overlay */}
      <header className="header-overlay">
        <div className="header-title">
          <Car size={18} color="#38bdf8" />
          <span>Carma 3D Prototype</span>
        </div>
        <div className="header-subtitle">
          {activeInspectionConfig
            ? `Inspecting: ${activeInspectionConfig.title}`
            : 'Hyundai Eon Component Hierarchy & Inspection'}
        </div>
        <div className="header-badges">
          {activeInspectionConfig ? (
            <span className="badge badge-cyan">Inspection Active</span>
          ) : (
            <span className="badge badge-cyan">GLB Scene Graph</span>
          )}
          <span className="badge">R3F + Three.js</span>
          {modelData.totalCount > 0 && (
            <span className="badge">{modelData.meshCount} Meshes</span>
          )}
        </div>
      </header>

      {/* Prominent Back to Vehicle Floating Button (When in Inspection Mode) */}
      {activeInspectionConfig && (
        <div className="floating-back-container">
          <button
            className="floating-back-btn"
            onClick={handleExitInspection}
            title="Exit Inspection and return to vehicle view"
          >
            <ArrowLeft size={16} />
            <span>Back to Vehicle</span>
          </button>
        </div>
      )}

      {/* Loading Screen */}
      {isLoading && (
        <div className="loading-screen">
          <div className="spinner"></div>
          <div className="loading-text">Loading Hyundai Eon 3D Model...</div>
        </div>
      )}

      {/* 3D Canvas Viewport */}
      <CarViewer
        onLoaded={handleLoaded}
        onSelectMesh={handleSelectMesh}
        selectedMesh={selectedMesh}
        inspectionConfig={activeInspectionConfig}
        inspectionCameraFocus={inspectionCameraFocus}
        onEnterInspection={handleEnterInspection}
      />

      {/* Right Side: Inspection Panel OR Diagnostic Hierarchy Tree */}
      {activeInspectionConfig && !showHierarchyInInspection ? (
        <InspectionPanel
          config={activeInspectionConfig}
          onExit={handleExitInspection}
          onOpenHierarchy={() => setShowHierarchyInInspection(true)}
        />
      ) : (
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

      {/* Navigation & Interaction Hint Overlay */}
      <div className="hint-overlay">
        <div className="hint-item">
          <RotateCw size={13} />
          <span><span className="hint-key">Left Drag</span> Orbit</span>
        </div>
        <div className="hint-item">
          <ZoomIn size={13} />
          <span><span className="hint-key">Scroll</span> Zoom</span>
        </div>
        <div className="hint-item">
          <MousePointer size={13} />
          <span><span className="hint-key">Right Drag</span> Pan</span>
        </div>
        <div className="hint-item" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 8 }}>
          {activeInspectionConfig ? (
            <span>Exploded Front Wheel Assembly | Click <strong>Back to Vehicle</strong> to return</span>
          ) : (
            <span><span className="hint-key">Click tyre front</span> Enter Inspection Mode</span>
          )}
        </div>
      </div>
    </div>
  );
}
