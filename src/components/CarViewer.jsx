import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Center, ContactShadows } from '@react-three/drei';
import gsap from 'gsap';
import { CarModel } from './CarModel';

const DEFAULT_CAMERA_POS = [4.5, 2.2, 4.5];
const DEFAULT_TARGET = [0, 0, 0];

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
      // Smoothly animate camera to the component framing
      gsap.killTweensOf(camera.position);
      gsap.to(camera.position, {
        x: inspectionState.cameraPos[0],
        y: inspectionState.cameraPos[1],
        z: inspectionState.cameraPos[2],
        duration: 1.2,
        ease: 'power2.inOut'
      });

      if (controlsRef.current) {
        gsap.killTweensOf(controlsRef.current.target);
        gsap.to(controlsRef.current.target, {
          x: inspectionState.target[0],
          y: inspectionState.target[1],
          z: inspectionState.target[2],
          duration: 1.2,
          ease: 'power2.inOut',
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
        duration: 1.2,
        ease: 'power2.inOut'
      });

      if (controlsRef.current) {
        gsap.killTweensOf(controlsRef.current.target);
        gsap.to(controlsRef.current.target, {
          x: DEFAULT_TARGET[0],
          y: DEFAULT_TARGET[1],
          z: DEFAULT_TARGET[2],
          duration: 1.2,
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

  return (
    <div className="canvas-container">
      <Canvas
        shadows
        camera={{ position: [4.5, 2.2, 4.5], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0e1014' }}
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
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
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
            />
          </Center>

          {/* Ground contact shadow */}
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.65}
            scale={12}
            blur={2.0}
            far={4.5}
          />
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

        {/* Subtle ground grid */}
        <gridHelper
          args={[20, 20, '#1e293b', '#131822']}
          position={[0, -0.01, 0]}
        />
      </Canvas>
    </div>
  );
}
