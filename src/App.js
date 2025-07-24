import React, { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { julian, planetposition, sidereal, solar } from "astronomia";
import { Equatorial } from 'astronomia/coord';
import earthData from "astronomia/data/vsop87Bearth";
import { Text } from "@react-three/drei";

//scales earth distance to 15 screen units from sun
const SCALE = 15;

// Convert RA/Dec/r to Cartesian (flips x and y to align with our coordinate system)
function sphericalToCartesian(lon, lat, range) {
  const x = range * Math.cos(lat) * Math.cos(lon);
  const y = range * Math.cos(lat) * Math.sin(lon);
  const z = range * Math.sin(lat);
  return [x, y, z];
}

function getGMST(jd) {
  // Julian centuries since J2000.0
  const T = (jd - 2451545.0) / 36525.0;

  // GMST in seconds (IAU 1982 convention)
  const gmstSeconds =
    67310.54841 +
    (876600 * 3600 + 8640184.812866) * T +
    0.093104 * T * T -
    6.2e-6 * T * T * T;

  // Convert seconds to degrees
  const gmstDeg = (gmstSeconds / 240.0) % 360;
  // Normalize and convert to radians
  return THREE.MathUtils.degToRad((gmstDeg + 360) % 360);
}

// Get Earth's position for Julian date
function getEarthPositionJD(jd) {
  const earth = new planetposition.Planet(earthData);
  const coords = earth.position2000(jd);
  return sphericalToCartesian(coords.lon, coords.lat, coords.range).map(n => n * SCALE);
}

function getSubsolarLatLon(jd) {
  const sunEq = solar.apparentEquatorial(jd); // { ra (rad), dec (rad) }
  const gmst = getGMST(jd); // in radians

  const subsolarLat = sunEq.dec;

  // Subsolar longitude = GMST - RA (in radians)
  let subsolarLon = gmst - sunEq.ra;

  // Normalize longitude to [-π, π]
  subsolarLon = (subsolarLon % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

  return {
    subsolarLat: subsolarLat, // radians
    subsolarLon: subsolarLon  // radians
  };
}

function EarthOrbit() {
  const jdNow = julian.DateToJD(new Date());

  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 365; i++) {
      const jd = jdNow - 182 + i;
      const pos = getEarthPositionJD(jd);
      if (pos) pts.push(new THREE.Vector3(...pos));
    }
    return pts;
  }, [jdNow]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const eclipticRadius = points.length > 0 ? points[0].length() : 15;

  return (
    <>
      <line geometry={geometry}>
        <lineBasicMaterial attach="material" color="lightblue" linewidth={2} />
      </line>
      <mesh rotation={[0, 0, 0]}>
        <circleGeometry args={[eclipticRadius, 128]} />
        <meshBasicMaterial color="orange" opacity={0.15} transparent side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function KeyPoints() {
  const radius = 15; // Match your Earth's orbital radius

  const points = {
    "Vernal Equinox (March)": [radius, 0, 0],     // +X
    "Summer Solstice (June)": [0, radius, 0],     // +Y
    "Autumn Equinox (September)": [-radius, 0, 0], // -X
    "Winter Solstice (December)": [0, -radius, 0], // -Y
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

function latLonToVector3(lat, lon, radius = 1) {
  const phi = (90 - THREE.MathUtils.radToDeg(lat)) * (Math.PI / 180); // latitude to polar
  const theta = (180 - THREE.MathUtils.radToDeg(lon)) * (Math.PI / 180); // longitude to azimuth

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y =  radius * Math.cos(phi);
  const z =  radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

function Earth({ position, jdNow }) {
  const earthTexture = useLoader(THREE.TextureLoader, "/textures/00_earthmap1k.jpg");
  const earthGroupRef = useRef();
  const { subsolarLat, subsolarLon } = getSubsolarLatLon(jdNow);

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
    const { subsolarLat, subsolarLon } = getSubsolarLatLon(jdNow);
    const subsolarLocal = latLonToVector3(subsolarLat, subsolarLon).normalize();

    // 5) Convert subsolar vector to world space (without spin)
    const subsolarWorld = subsolarLocal.clone().applyQuaternion(baseQuat);

    // 6) Compute Sun direction (from Earth to Sun) in world space
    const sunDir = new THREE.Vector3(...getEarthPositionJD(jdNow)).normalize().negate(); // toward Sun

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
  }, [jdNow]);

  // Subsolar marker in local Earth space — will be transformed by group's quaternion
  const subsolarMarker = useMemo(() => {
    const { subsolarLat, subsolarLon } = getSubsolarLatLon(jdNow);
    return latLonToVector3(subsolarLat, subsolarLon, 1.01);
  }, [jdNow]);

  return (
    <group position={position} ref={earthGroupRef}>
      {/* Earth Sphere */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={earthTexture} />
      </mesh>

      {/* Equatorial torus */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.0, 0.01, 16, 100]} />
        <meshBasicMaterial color="orange" />
      </mesh>

      {/* Local XY plane - centered on Earth */}
      <mesh rotation={[0, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[30, 20]} />
        <meshBasicMaterial color="cyan" opacity={0.3} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Subsolar position */}
      <mesh position={subsolarMarker}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color="yellow" emissive="yellow" />
      </mesh>

      {/* Axes Helper */}
      <axesHelper args={[2]} />
    </group>
  );
}

function SunToEarthLine({ earthPos }) {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(...earthPos)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial attach="material" color="white" linewidth={2} />
    </line>
  );
}

function CameraControls({ target }) {
  const controls = useRef();
  const { camera, gl } = useThree(); // <-- gl.domElement is needed

  useEffect(() => {
    if (controls.current && target) {
      controls.current.target.set(...target);
      controls.current.update();
    }
  }, [target]);

  useFrame(() => controls.current?.update());

  return <OrbitControls ref={controls} args={[camera, gl.domElement]} />;
}

export default function App() {
  // Compute JD once, right now
  const date = new Date(Date.UTC(1995, 6, 10, 12, 0, 0)); //historical (or future :) ) date set. month is zero indexed (jan = 0) yr-mo-day-h-m-s
  const now = new Date();
  const [jdNow, setJdNow] = useState(julian.DateToJD(date));
  const initialPos = getEarthPositionJD(jdNow);

  const [earthPos, setEarthPos] = useState(initialPos);
  const [cameraMode, setCameraMode] = useState("sun"); // "sun" or "earth"

  /*
  useEffect(() => {
    const interval = setInterval(() => {
      const jd = julian.DateToJD(new Date());
      const pos = getEarthPositionJD(jd);
      if (pos) setEarthPos(pos);
    }, 10000); // update every ten seconds

    return () => clearInterval(interval); // cleanup on unmount
  }, []); */

  const toggleCameraMode = () => {
    setCameraMode(prev => (prev === "sun" ? "earth" : "sun"));
  };

  const target = cameraMode === "sun" ? [0, 0, 0] : earthPos;

  return (
    <>
      <button
        onClick={toggleCameraMode}
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 10,
          padding: "0.5rem 1rem",
          background: "#111",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: "4px",
        }}
      >
        Toggle Camera: {cameraMode}
      </button>

      <Canvas
        shadows
        camera={{ position: [0, 20, 40], fov: 50, near: 0.1, far: 1000 }}
        gl={{ physicallyCorrectLights: true }}
        style={{ height: "100vh", background: "black" }}
      >
        <pointLight
          castShadow
          position={[0, 0, 0]}
          intensity={100}
          distance={100}
          decay={1}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial color="yellow" />
        </mesh>
        <axesHelper args={[10]} />
        <ambientLight intensity={0.1} />
        <EarthOrbit jdNow={jdNow} />
        <Earth position={earthPos} jdNow={jdNow} />
        <SunToEarthLine earthPos={earthPos} />
        <KeyPoints />
        <CameraControls target={target} />

      </Canvas>
    </>
  );
}
