import * as THREE from "three";
import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as astro from "../utils/astroUtil";

export default function Moon({ jdNow, earthPos, orbScale, earthQuat }) {
  const moonTexture = useLoader(THREE.TextureLoader, "/textures/lroc_color_poles_1k.jpg");

  const sublunar = useMemo(() => astro.getSublunarLatLon(jdNow), [jdNow]);

  const moonRelativePos = useMemo(() => {
    const local = astro.latLonToVector3(sublunar.lat, sublunar.lon, sublunar.rangeAU);
    return local.applyQuaternion(earthQuat); // Earth orientation applied to local vector
  }, [sublunar, earthQuat]);

  const moonPos = useMemo(() => {
    return new THREE.Vector3(...earthPos).add(moonRelativePos);
  }, [earthPos, moonRelativePos]);

  return (
    <>
      {/* Moon mesh */}
      <mesh castShadow receiveShadow position={moonPos}>
        <sphereGeometry args={[0.3*orbScale, 128, 128]} />
        <meshStandardMaterial map={moonTexture} />
      </mesh>
    </>
  );
}
