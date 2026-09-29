/**
 * POHeroScene — Main 3D Canvas experience for PO → PO
 *
 * Implements:
 * - Dynamic device pixel ratio
 * - Adaptive rendering quality (mobile vs desktop)
 * - Accessibility prefers-reduced-motion fallback
 * - Ambient lighting and iridescent color accents
 */

import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraRig } from './CameraRig';
import { RouteNetwork } from './RouteNetwork';
import { FloatingMobilityForms } from './FloatingMobilityForms';
import { VehicleNodes } from './VehicleNodes';
import { ParticleField } from './ParticleField';

export function POHeroScene({ height = '320px', interactive = true }: { height?: string; interactive?: boolean }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);

    setIsMobile(window.innerWidth < 768);

    return () => mq.removeEventListener('change', handler);
  }, []);

  // Graceful fallback for prefers-reduced-motion
  if (reducedMotion) {
    return (
      <div
        style={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, rgba(0,242,254,0.12) 0%, rgba(10,12,18,0) 70%)',
          borderRadius: '24px',
        }}
      >
        <div style={{ textAlign: 'center', color: '#8892b0', fontSize: '0.875rem' }}>
          <span>PO → PO Dynamic Mobility Network</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: '24px',
        overflow: 'hidden',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 1.5, 6.5], fov: 45 }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        gl={{ antialias: !isMobile, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#00f2fe" />
        <pointLight position={[-10, -5, -5]} intensity={0.8} color="#7f00ff" />
        
        <Suspense fallback={null}>
          <RouteNetwork />
          <FloatingMobilityForms />
          <VehicleNodes />
          <ParticleField count={isMobile ? 80 : 180} />
          {interactive && <CameraRig />}
        </Suspense>
      </Canvas>
    </div>
  );
}
