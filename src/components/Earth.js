import React, { useRef, useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import * as astro from "../utils/astroUtil";
import { Text } from "@react-three/drei";

function Earth({ position, jdNow, showGeometry }) {
  const earthTexture = useLoader(THREE.TextureLoader, "/textures/00_earthmap1k.jpg");
  const earthGroupRef = useRef();

  //position Earth in correct orientation
  useEffect(() => {
    if (!earthGroupRef.current) return;

    // 1) Texture fix (rotate poles to match R3F orientation)
    const textureFixQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2
    );

    // 2) Axial tilt (~23.44° around ecliptic X axis)
    const tiltQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      THREE.MathUtils.degToRad(-23.44)
    );

    // 3) Base orientation (tilt + texture fix)
    const baseQuat = textureFixQuat.clone().multiply(tiltQuat);

    // 4) Subsolar vector in local Earth space
    const { subsolarLat, subsolarLon } = astro.getSubsolarLatLon(jdNow);
    const subsolarLocal = astro.latLonToVector3(subsolarLat, subsolarLon).normalize();

    // 5) Convert subsolar vector to world space (without spin)
    const subsolarWorld = subsolarLocal.clone().applyQuaternion(baseQuat);

    // 6) Compute Sun direction (from Earth to Sun) in world space
    const sunDir = new THREE.Vector3(...position).normalize().negate(); // toward Sun

    // 7) Earth's spin axis in world space (local Y axis after base orientation)
    const spinAxisWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(baseQuat).normalize();

    // 8) Compute angle between subsolar point and sun direction in the plane perpendicular to spin axis
    const projectedSubsolar = subsolarWorld.clone().projectOnPlane(spinAxisWorld).normalize();
    const projectedSun = sunDir.clone().projectOnPlane(spinAxisWorld).normalize();

    let spinAngle = projectedSubsolar.angleTo(projectedSun);
    const cross = projectedSubsolar.clone().cross(projectedSun);
    if (cross.dot(spinAxisWorld) < 0) spinAngle = -spinAngle;

    // 9) Create spin quaternion around Earth's spin axis
    const spinQuat = new THREE.Quaternion().setFromAxisAngle(spinAxisWorld, spinAngle);

    // 10) Final orientation: spin * tilt * texture fix
    const finalQuat = spinQuat.clone().multiply(baseQuat);
    earthGroupRef.current.quaternion.copy(finalQuat);
  }, [position, jdNow]);

  // Subsolar marker in local Earth space — will be transformed by group's quaternion
  const subsolarMarker = useMemo(() => {
    const { subsolarLat, subsolarLon } = astro.getSubsolarLatLon(jdNow);
    return astro.latLonToVector3(subsolarLat, subsolarLon, 1.01);
  }, [jdNow]);

  return (
    <group position={position} ref={earthGroupRef}>
      {/* Earth Sphere */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={earthTexture} />
      </mesh>

      {showGeometry && (
        <>
          {/* Local XY plane - centered on Earth */}
          <mesh rotation={[0, 0, 0]} position={[0, 0, 0]}>
            <circleGeometry args={[2]} />
            <meshBasicMaterial
              color="cyan"
              opacity={0.3}
              transparent
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Equatorial torus */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.0, 0.01, 16, 100]} />
            <meshBasicMaterial color="orange" />
          </mesh>

          {/* Local XZ plane - centered on Earth */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <circleGeometry args={[2]} />
            <meshBasicMaterial
              color="cyan"
              opacity={0.3}
              transparent
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Subsolar position */}
          <mesh position={subsolarMarker}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshStandardMaterial color="yellow" emissive="yellow" />
          </mesh>

          {/* Axes Helper */}
          <axesHelper args={[2]} />
        </>
      )}
    </group>
  );
}

function EarthOrbit({ jdNow, showGeometry }) {

  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 365; i++) {
      const jd = jdNow - 182 + i;
      const pos = astro.getEarthPositionJD(jd);
      if (pos) pts.push(new THREE.Vector3(...pos));
    }
    return pts;
  }, [jdNow]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const eclipticRadius = points.length > 0 ? points[0].length() : 15;

  return (
    <>
      {/* Earth orbit path (always shown) */}
      <line geometry={geometry}>
        <lineBasicMaterial attach="material" color="lightblue" linewidth={2} />
      </line>

      {/* Conditionally show the ecliptic plane */}
      {showGeometry && (
        <mesh rotation={[0, 0, 0]}>
          <circleGeometry args={[eclipticRadius + 10, 128]} />
          <meshBasicMaterial
            color="orange"
            opacity={0.15}
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

function KeyPoints({ showGeometry }) {
  if (!showGeometry) return null;

  const radius = 15; // Match your Earth's orbital radius

  const points = {
    "Vernal Equinox (March)": [radius, 0, 0.1],     // +X
    "Summer Solstice (June)": [0, radius, 0.1],     // +Y
    "Autumn Equinox (September)": [-radius, 0, 0.1], // -X
    "Winter Solstice (December)": [0, -radius, 0.1], // -Y
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
            fontSize={0.5}
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
