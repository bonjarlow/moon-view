import React, { useRef, useEffect, useMemo, useState } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import * as astro from "../utils/astroUtil";
import { Text } from "@react-three/drei";
import Moon from "./Moon";

const Earth = ({ position, jdNow, showGeometry, orbScale, onQuatReady }) => {
  const earthTexture = useLoader(THREE.TextureLoader, "/textures/00_earthmap1k.jpg");
  const earthGroupRef = useRef();

  // Only compute once: texture fix, axial tilt, base orientation
  const baseQuat = useMemo(() => {
    const textureFixQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2
    );
    const tiltQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      THREE.MathUtils.degToRad(-23.44)
    );
    return textureFixQuat.multiply(tiltQuat);
  }, []);

  const spinAxisWorld = useMemo(() => {
    return new THREE.Vector3(0, 1, 0).applyQuaternion(baseQuat).normalize();
  }, [baseQuat]);

  // Subsolar marker in local Earth space — will be transformed by group's quaternion
  const subsolar = useMemo(() => astro.getSubsolarLatLon(jdNow), [jdNow]);
  const subsolarMarker = useMemo(() => {
    return astro.latLonToVector3(subsolar.subsolarLat, subsolar.subsolarLon, orbScale * 1.001);
  }, [subsolar, orbScale]);

  //sublunar marker
  const sublunar = useMemo(() => astro.getSublunarLatLon(jdNow), [jdNow]);
  const moonPos = useMemo(() => {
    return astro.latLonToVector3(sublunar.lat, sublunar.lon, sublunar.rangeAU);
  }, [sublunar]);
  const sublunarMarker = useMemo(() => {
    return astro.latLonToVector3(sublunar.lat, sublunar.lon, orbScale * 1.001);
  }, [sublunar, orbScale]);

  useEffect(() => {
    if (!earthGroupRef.current) return;

    // Dynamic: compute Earth's rotation to align subsolar point with Sun
    const subsolarLocal = astro.latLonToVector3(subsolar.subsolarLat, subsolar.subsolarLon).normalize();
    const subsolarWorld = subsolarLocal.clone().applyQuaternion(baseQuat);

    const sunDir = new THREE.Vector3(...position).normalize().negate();

    const projectedSubsolar = subsolarWorld.clone().projectOnPlane(spinAxisWorld).normalize();
    const projectedSun = sunDir.clone().projectOnPlane(spinAxisWorld).normalize();

    let spinAngle = projectedSubsolar.angleTo(projectedSun);
    const cross = projectedSubsolar.clone().cross(projectedSun);
    if (cross.dot(spinAxisWorld) < 0) spinAngle = -spinAngle;

    const spinQuat = new THREE.Quaternion().setFromAxisAngle(spinAxisWorld, spinAngle);
    const finalQuat = spinQuat.clone().multiply(baseQuat);

    earthGroupRef.current.quaternion.copy(finalQuat);
    onQuatReady?.(finalQuat); // Pass quaternion back up to App
  }, [jdNow, position, baseQuat, spinAxisWorld]);

  return (
    <group position={position} ref={earthGroupRef}>
      {/* Earth Sphere */}
      <mesh receiveShadow>
        <sphereGeometry args={[1*orbScale, 128, 128]} />
        <meshStandardMaterial map={earthTexture} />
      </mesh>

      {/* Moon (relative to Earth) */}
      <Moon moonPos={moonPos} orbScale={orbScale} />

      {showGeometry && (
        <>
          {/* Local XY plane - centered on Earth */}
          <mesh rotation={[0, 0, 0]} position={[0, 0, 0]}>
            <circleGeometry args={[2*orbScale]} />
            <meshBasicMaterial
              color="cyan"
              opacity={0.3}
              transparent
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Equatorial torus */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.0*orbScale, 0.05, 16, 100]} />
            <meshBasicMaterial color="orange" />
          </mesh>

          {/* Local XZ plane - centered on Earth */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <circleGeometry args={[2*orbScale]} />
            <meshBasicMaterial
              color="cyan"
              opacity={0.3}
              transparent
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Subsolar position */}
          <mesh position={subsolarMarker}>
            <sphereGeometry args={[orbScale/30.0, 16, 16]} />
            <meshStandardMaterial color="yellow" emissive="yellow" />
          </mesh>

          {/* Sublunar position */}
          <mesh position={sublunarMarker}>
            <sphereGeometry args={[orbScale/30.0, 16, 16]} />
            <meshStandardMaterial color="grey" emissive="grey" />
          </mesh>

          <MoonToEarthLine moonPos={ moonPos } />

          {/* Axes Helper */}
          <axesHelper args={[2*orbScale]} />
        </>
      )}
    </group>
  );
}

function EarthOrbit({ jdNow, showGeometry, SCALE }) {
  const [orbitJD, setOrbitJD] = useState(jdNow);
  const [points, setPoints] = useState(() => {
    // Compute initial orbit on mount
    const initialPoints = [];
    for (let i = 0; i <= 365; i++) {
      const jd = jdNow - 182 + i;
      const pos = astro.getEarthPositionJD(jd, SCALE);
      if (pos) initialPoints.push(new THREE.Vector3(...pos));
    }
    return initialPoints;
  });

  // Recompute only if jdNow drifts beyond ±182 days
  useEffect(() => {
    if (Math.abs(jdNow - orbitJD) > 182) {
      const newPoints = [];
      for (let i = 0; i <= 365; i++) {
        const jd = jdNow - 182 + i;
        const pos = astro.getEarthPositionJD(jd, SCALE);
        if (pos) newPoints.push(new THREE.Vector3(...pos));
      }
      setOrbitJD(jdNow);
      setPoints(newPoints);
    }
  }, [jdNow, orbitJD, SCALE]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  return (
    <>
      <line geometry={geometry}>
        <lineBasicMaterial attach="material" color="lightblue" linewidth={2} />
      </line>

      {showGeometry && (
        <mesh rotation={[0, 0, 0]}>
          <circleGeometry args={[SCALE, 128]} />
          <meshBasicMaterial
            color="orange"
            opacity={0.10}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </>
  );
}

function SunToEarthLine({ earthPos, showGeometry }) {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(...earthPos)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <>
      {showGeometry && (
        <line geometry={geometry}>
          <lineBasicMaterial attach="material" color="white" linewidth={2} />
        </line>
      )}
    </>
  );
}

function MoonToEarthLine({ moonPos }) {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(...moonPos)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <>
      <line geometry={geometry}>
        <lineBasicMaterial attach="material" color="white" linewidth={2} />
      </line>
    </>
  );
}

function KeyPoints({ showGeometry, SCALE }) {
  if (!showGeometry) return null;

  const points = {
    "Vernal Equinox (March)": [SCALE, 0, SCALE/20],     // +X
    "Summer Solstice (June)": [0, SCALE, SCALE/20],     // +Y
    "Autumn Equinox (September)": [-SCALE, 0, SCALE/20], // -X
    "Winter Solstice (December)": [0, -SCALE, SCALE/20], // -Y
  };

  return (
    <>
      {Object.entries(points).map(([label, pos]) => (
        <group position={pos} key={label}>
          <mesh>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshBasicMaterial color="white" />
          </mesh>
          <Text
            position={[0, 0.5, 0]}
            fontSize={SCALE/20}
            color="white"
            anchorX="center"
            anchorY="bottom"
          >
            {label}
          </Text>
        </group>
      ))}
    </>
  );
}

export { Earth, EarthOrbit, SunToEarthLine, KeyPoints };
