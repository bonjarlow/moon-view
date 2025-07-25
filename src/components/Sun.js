// components/Sun.js
import * as THREE from 'three';
import React from 'react';

export default function Sun({ showGeometry, orbScale }) {
  const sunrad = 109; //sun radius in on screen units

  return (
    <group>
      {/* Light source */}
      <pointLight
        castShadow
        position={[0, 0, 0]}
        intensity={10}
        distance={0}
        decay={0}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      {/* Visual representation of the Sun */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[sunrad * orbScale, 32, 32]} />
        <meshBasicMaterial color="yellow" />
      </mesh>

      {/* Optional: Axes helper */}
      {showGeometry && <axesHelper args={[27000]} />}

      {/* Optional: Slight ambient fill light */}
      <ambientLight intensity={0.5} />
    </group>
  );
}
