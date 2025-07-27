import * as THREE from "three";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { latLonToVector3, getSublunarLatLon } from "../utils/astroUtil";

export default function Moon({ moonPos, orbScale }) {
  const moonRef = useRef();
  const moonColor = "gray";

  return (
    <>
      {/* Moon mesh */}
      <mesh castShadow receiveShadow position={moonPos}>
        <sphereGeometry args={[0.3*orbScale, 128, 128]} />
        <meshStandardMaterial color={moonColor} />
      </mesh>
    </>
  );
}
