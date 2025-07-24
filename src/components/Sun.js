// components/Sun.js
import * as THREE from 'three';
import React from 'react';

export default function Sun() {
  return (
    <group>
      {/* Light source */}
      <pointLight
        castShadow
        position={[0, 0, 0]}
        intensity={100}
        distance={100}
        decay={1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      {/* Visual representation of the Sun */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="yellow" />
      </mesh>

      {/* Optional: Axes helper */}
      <axesHelper args={[10]} />

      {/* Optional: Slight ambient fill light */}
      <ambientLight intensity={0.1} />
    </group>
  );
}
