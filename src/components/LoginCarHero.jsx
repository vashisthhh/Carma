import React, { Suspense, useRef, useMemo, useEffect, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Center, ContactShadows } from '@react-three/drei';

/**
 * Error boundary to gracefully catch any WebGL or Canvas rendering issues
 * ensuring the login form remains 100% accessible and functional.
 */
class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('LoginCarHero 3D Canvas error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="login-car-fallback-graphic">
          <div className="fallback-car-glow" />
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Isolated 3D Vehicle Showcase for the Login Page.
 * Uses a cloned copy of the preloaded GLTF model so the main workspace
 * viewer in CarViewer.jsx is completely unaffected.
 */
function StudioCar() {
  const gltf = useGLTF('/models/eon.glb');
  const groupRef = useRef();

  // Clone scene graph to guarantee zero mutation or ownership conflict with CarViewer
  const clonedScene = useMemo(() => {
    if (!gltf || !gltf.scene) return null;
    const clone = gltf.scene.clone(true);
    
    // Set exterior body paint to match the refined matte off-white in the workspace
    clone.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m && m.name === 'Blue Body') {
            m.color.set('#e2e5e8');
            m.roughness = 0.6;
            m.metalness = 0.08;
          }
        });
      }
    });

    return clone;
  }, [gltf]);

  // Grounded car with slow subtle yaw oscillation around a flattering 3/4 front beauty angle (no vertical bobbing)
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = -0.42 + Math.sin(t * 0.22) * 0.06;
  });

  if (!clonedScene) return null;

  return (
    <>
      <group ref={groupRef}>
        <Center top>
          <primitive object={clonedScene} />
        </Center>
      </group>
      {/* Crisp, soft ground contact shadow directly beneath wheels */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.75}
        scale={11}
        blur={2.0}
        far={4.0}
        color="#000000"
      />
    </>
  );
}

export function LoginCarHero() {
  const glRef = useRef(null);

  useEffect(() => {
    return () => {
      // Immediately force context loss on unmount so CarViewer can acquire WebGL without waiting for GC
      if (glRef.current) {
        try {
          glRef.current.forceContextLoss?.();
          glRef.current.dispose?.();
        } catch (e) {
          // Ignore disposal errors
        }
      }
    };
  }, []);

  return (
    <div className="login-car-stage" aria-hidden="true">
      {/* Automotive Studio Stage Elements */}
      <div className="login-studio-backdrop-glow" />
      <div className="login-studio-floor" />
      <CanvasErrorBoundary>
        <Canvas
          shadows
          camera={{ position: [4.4, 1.9, 4.4], fov: 38 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false
          }}
          onCreated={({ gl }) => {
            glRef.current = gl;
          }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
        >
          {/* Studio Photography Lighting */}
          <ambientLight intensity={0.8} />
          {/* Key Light */}
          <directionalLight position={[8, 14, 8]} intensity={1.7} />
          {/* Rim Light for silhouette separation */}
          <directionalLight position={[-8, 10, -10]} intensity={0.9} />
          {/* Soft front fill */}
          <directionalLight position={[-6, 6, 8]} intensity={0.5} />
          {/* Underside floor fill */}
          <directionalLight position={[0, -6, 0]} intensity={0.2} />

          <Suspense fallback={null}>
            <StudioCar />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}

// Ensure the GLB is preloaded
useGLTF.preload('/models/eon.glb');
