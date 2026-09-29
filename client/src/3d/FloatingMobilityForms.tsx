/**
 * FloatingMobilityForms — Abstract 3D geometric shapes
 * Representing fluid connection and spatial mobility
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function FloatingMobilityForms() {
  const torusRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const sphereRef = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (torusRef.current) {
      torusRef.current.rotation.x = t * 0.15;
      torusRef.current.rotation.y = t * 0.2;
      torusRef.current.position.y = Math.sin(t * 0.8) * 0.2;
    }

    if (ringRef.current) {
      ringRef.current.rotation.x = -t * 0.12;
      ringRef.current.rotation.z = t * 0.18;
      ringRef.current.position.y = Math.cos(t * 0.7) * 0.25;
    }

    if (sphereRef.current) {
      sphereRef.current.position.y = -0.5 + Math.sin(t * 1.1) * 0.15;
    }
  });

  return (
    <group position={[0, 0, -1]}>
      {/* Central mobility ring */}
      <mesh ref={torusRef}>
        <torusGeometry args={[1.8, 0.04, 16, 100]} />
        <meshStandardMaterial
          color="#00f2fe"
          emissive="#00f2fe"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer orbit ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.5, 0.02, 16, 100]} />
        <meshStandardMaterial
          color="#7f00ff"
          emissive="#7f00ff"
          emissiveIntensity={0.5}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Core glowing sphere */}
      <mesh ref={sphereRef} position={[0, -0.5, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color="#00f2fe"
          emissive="#00c6ff"
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.5}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}
