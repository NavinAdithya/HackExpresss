/**
 * CameraRig — Responsive subtle camera movement responding to pointer
 */

import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef } from 'react';

export function CameraRig() {
  const vec = useRef(new THREE.Vector3());

  useFrame((state) => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Smoothly tilt camera according to pointer coordinates
    const targetX = (state.pointer.x * 1.2);
    const targetY = (state.pointer.y * 0.8) + 1.5;
    
    vec.current.set(targetX, targetY, 6.5);
    state.camera.position.lerp(vec.current, 0.05);
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}
