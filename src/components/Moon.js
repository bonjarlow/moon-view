import * as THREE from "three";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { latLonToVector3, getSublunarLatLon } from "../utils/astroUtil";

export default function Moon({ jdNow }) {
  const moonRef = useRef();
  const moonColor = "gray";

  // Compute current Moon position (relative to Earth)
  const moonPos = useMemo(() => {
    const {lat, lon, rangeAU} = getSublunarLatLon(jdNow);
    console.log("sub lunar lat deg", THREE.MathUtils.radToDeg(lat));
    console.log("sub lunar lon deg", THREE.MathUtils.radToDeg(lon));
    console.log("lunar range", rangeAU);
    return latLonToVector3(lat, lon, rangeAU);
  }, [jdNow]);

  return (
    <>
      {/* Moon mesh */}
      <mesh position={moonPos}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={moonColor} />
      </mesh>
    </>
  );
}
