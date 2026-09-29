/**
 * RouteNetwork — 3D connected route curves with glowing animation
 * Uses official PO → PO orange and dust-pink palette
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function RouteNetwork() {
  const groupRef = useRef<THREE.Group>(null!);

  const routes = useMemo(() => {
    const curves = [
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(-4, -1, -2),
        new THREE.Vector3(-1.5, 2, 0),
        new THREE.Vector3(1, -1.5, 1),
        new THREE.Vector3(4, 1.2, -1)
      ),
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(-3.5, 1.5, 1),
        new THREE.Vector3(-1, -1, 2),
        new THREE.Vector3(2, 2, 0),
        new THREE.Vector3(3.5, -1, -2)
      ),
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(-2, -2, 0),
        new THREE.Vector3(0, 0, 1.5),
        new THREE.Vector3(1, -0.5, -1.5),
        new THREE.Vector3(3, 2, 1)
      ),
    ];

    return curves.map((curve, idx) => {
      const geometry = new THREE.TubeGeometry(curve, 64, 0.03, 8, false);
      const color = idx % 2 === 0 ? '#F63B03' : '#E79E89';
      return { geometry, color };
    });
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {routes.map((route, i) => (
        <mesh key={i} geometry={route.geometry}>
          <meshBasicMaterial
            color={route.color}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
