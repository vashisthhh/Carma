import React, { Component, Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import gsap from 'gsap';
import { CarModel } from './CarModel';
import { RotateCcw, AlertTriangle } from 'lucide-react';

const DEFAULT_CAMERA_POS = [4.5, 2.2, 4.5];
const DEFAULT_TARGET = [0, 0, 0];

/**
 * Localized Error Boundary for CarViewer 3D Canvas.
 * Catches WebGL context or rendering exceptions to protect the rest of CARMA.
 */
class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('CarViewer 3D Canvas error caught by local boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="canvas-error-fallback" role="alert">
          <div className="canvas-error-card">
            <div className="canvas-error-icon">
              <AlertTriangle size={24} />
            </div>
            <h3 className="canvas-error-title">3D Viewport Paused</h3>
            <p className="canvas-error-desc">
              The 3D graphics context was interrupted or encountered a render issue.
              Your vehicle records and workspace remain fully functional below.
            </p>
            <button
              type="button"
              className="btn-canvas-retry"
              onClick={this.handleRetry}
            >
              <RotateCcw size={14} />
              <span>Reload 3D View</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Camera & Controls animator
function CameraController({ inspectionState, controlsRef }) {
  const { camera } = useThree();
  const isFirstMount = useRef(true);
  const prevInspectionRef = useRef(null);

  useEffect(() => {
    // Prevent any camera movement on initial mount
    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevInspectionRef.current = inspectionState;
      return;
    }

    const wasInspecting = !!prevInspectionRef.current;
    const isInspecting = !!inspectionState;
    prevInspectionRef.current = inspectionState;

    if (isInspecting && inspectionState.cameraPos && inspectionState.target) {
      // Smoothly animate camera to the component framing (short, controlled, deliberate)
      gsap.killTweensOf(camera.position);
      gsap.to(camera.position, {
        x: inspectionState.cameraPos[0],
        y: inspectionState.cameraPos[1],
        z: inspectionState.cameraPos[2],
        duration: 0.85,
        ease: 'power2.out'
      });

      if (controlsRef.current) {
        gsap.killTweensOf(controlsRef.current.target);
        gsap.to(controlsRef.current.target, {
          x: inspectionState.target[0],
          y: inspectionState.target[1],
          z: inspectionState.target[2],
          duration: 0.85,
          ease: 'power2.out',
          onUpdate: () => controlsRef.current && controlsRef.current.update()
        });
      }
    } else if (wasInspecting && !isInspecting) {
      // ONLY animate back to default vehicle overview when transitioning FROM inspecting TO non-inspecting
      gsap.killTweensOf(camera.position);
      gsap.to(camera.position, {
        x: DEFAULT_CAMERA_POS[0],
        y: DEFAULT_CAMERA_POS[1],
        z: DEFAULT_CAMERA_POS[2],
        duration: 0.85,
        ease: 'power2.inOut'
      });

      if (controlsRef.current) {
        gsap.killTweensOf(controlsRef.current.target);
        gsap.to(controlsRef.current.target, {
          x: DEFAULT_TARGET[0],
          y: DEFAULT_TARGET[1],
          z: DEFAULT_TARGET[2],
          duration: 0.85,
          ease: 'power2.inOut',
          onUpdate: () => controlsRef.current && controlsRef.current.update()
        });
      }
    }
    // If was NOT inspecting and is NOT inspecting (normal orbit / selection): DO NOTHING.
  }, [inspectionState, camera, controlsRef]);

  return null;
}

export function CarViewer({
  onLoaded,
  onSelectMesh,
  selectedMesh,
  inspectionConfig,
  inspectionCameraFocus,
  onEnterInspection
}) {
  const controlsRef = useRef();
  const [hoveredTitle, setHoveredTitle] = React.useState(null);
  const [canvasKey, setCanvasKey] = useState(0);

  return (
    <div className="canvas-container">
      {/* Minimal 3D Component Hover Tooltip */}
      {!inspectionConfig && hoveredTitle && (
        <div className="minimal-3d-tooltip" role="tooltip">
          <span>{hoveredTitle}</span>
        </div>
      )}

      <CanvasErrorBoundary key={canvasKey} onRetry={() => setCanvasKey((k) => k + 1)}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [4.5, 2.2, 4.5], fov: 42 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          style={{ background: 'transparent' }}
        >
          {/* Dynamic Camera Animation Controller */}
          <CameraController
            inspectionState={inspectionCameraFocus}
            controlsRef={controlsRef}
          />

          {/* Studio & Directional Lighting */}
          <ambientLight intensity={0.75} />
          <directionalLight
            position={[10, 15, 10]}
            intensity={1.6}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <directionalLight position={[-10, 8, -10]} intensity={0.7} />
          <directionalLight position={[0, -10, 0]} intensity={0.25} />

          {/* 3D Model with Center and Suspense */}
          <Suspense fallback={null}>
            <Center top>
              <CarModel
                onLoaded={onLoaded}
                onSelectMesh={onSelectMesh}
                selectedMesh={selectedMesh}
                inspectionConfig={inspectionConfig}
                onEnterInspection={onEnterInspection}
                onHoverComponent={(title) => setHoveredTitle(title)}
                onUnhoverComponent={() => setHoveredTitle(null)}
              />
            </Center>
          </Suspense>

          {/* Orbit / Zoom Controls */}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={0.5} // Allow close-up inspection
            maxDistance={25}
            maxPolarAngle={Math.PI / 2 + 0.05}
          />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
