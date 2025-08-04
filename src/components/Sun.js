// components/Sun.js
import React from 'react';

export default function Sun({ showGeometry, sunrad }) {
  //const sunrad = 109; //sun radius in on screen units
  //const sunrad = 10;

  return (
    <group>
      {/* Light source */}
      <pointLight
        castShadow
        position={[0, 0, 0]}
        intensity={5}
        distance={0}
        decay={0}
        shadow-mapSize-width={1028}
        shadow-mapSize-height={1028}
      />
      {/* Visual representation of the Sun */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[sunrad, 32, 32]} />
        <meshBasicMaterial color="yellow" />
      </mesh>

      {/* Optional: Axes helper */}
      {showGeometry && <axesHelper args={[sunrad * 10]} />}

      {/* Optional: Slight ambient fill light */}
      <ambientLight intensity={0.5} />
    </group>
  );
}
