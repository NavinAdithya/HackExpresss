/**
 * VehicleNodes — Glowing nodes traveling along routes
 * Represents commuters and shared vehicles in PO → PO orange/cream palette
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NodeData {
  curve: THREE.CubicBezierCurve3;
  speed: number;
  offset: number;
  color: string;
  size: number;
}

export function VehicleNodes() {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const nodes: NodeData[] = useMemo(() => [
    {
      curve: new THREE.CubicBezierCurve3(
        new THREE.Vector3(-4, -1, -2),
        new THREE.Vector3(-1.5, 2, 0),
        new THREE.Vector3(1, -1.5, 1),
        new THREE.Vector3(4, 1.2, -1)
      ),
      speed: 0.12,
      offset: 0.1,
      color: '#F63B03',
      size: 0.13,
    },
    {
      curve: new THREE.CubicBezierCurve3(
        new THREE.Vector3(-4, -1, -2),
        new THREE.Vector3(-1.5, 2, 0),
        new THREE.Vector3(1, -1.5, 1),
        new THREE.Vector3(4, 1.2, -1)
      ),
      speed: 0.12,
      offset: 0.55,
      color: '#FFF8E5',
      size: 0.1,
    },
    {
      curve: new THREE.CubicBezierCurve3(
        new THREE.Vector3(-3.5, 1.5, 1),
        new THREE.Vector3(-1, -1, 2),
        new THREE.Vector3(2, 2, 0),
        new THREE.Vector3(3.5, -1, -2)
      ),
      speed: 0.18,
      offset: 0.3,
      color: '#E79E89',
      size: 0.14,
    },
    {
      curve: new THREE.CubicBezierCurve3(
        new THREE.Vector3(-2, -2, 0),
        new THREE.Vector3(0, 0, 1.5),
        new THREE.Vector3(1, -0.5, -1.5),
        new THREE.Vector3(3, 2, 1)
      ),
      speed: 0.14,
      offset: 0.75,
      color: '#F73C06',
      size: 0.12,
    },
  ], []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    nodes.forEach((node, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;

      const t = (time * node.speed + node.offset) % 1;
      const point = node.curve.getPointAt(t);
      mesh.position.copy(point);

      const scale = 1 + Math.sin(time * 4 + i) * 0.15;
      mesh.scale.set(scale, scale, scale);
    });
  });

  return (
    <group>
      {nodes.map((node, i) => (
        <mesh
          key={i}
          ref={(el) => (meshRefs.current[i] = el)}
        >
          <sphereGeometry args={[node.size, 16, 16]} />
          <meshBasicMaterial
            color={node.color}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
