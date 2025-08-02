import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import CameraControls from "./CameraControls";
import * as THREE from "three";
import * as astro from "../utils/astroUtil";


export default function CameraView({ cameraMode, earthPos, lat, lon, orbScale, earthQuat }) {
  const { camera } = useThree();

  const raRef = useRef(0);
  const decRef = useRef(0);
  const pressedKeys = useRef({});

  const target =
    cameraMode === "sun" ? [0, 0, 0] :
    cameraMode === "earth" ? earthPos :
    null;

  // Keyboard input tracking
  useEffect(() => {
    const down = (e) => (pressedKeys.current[e.key] = true);
    const up = (e) => (pressedKeys.current[e.key] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Frame update
  useFrame(() => {
    if (cameraMode !== "surface") return;

    const raStep = 0.01;
    const decStep = 0.01;

    if (pressedKeys.current["ArrowLeft"]) raRef.current -= raStep;
    if (pressedKeys.current["ArrowRight"]) raRef.current += raStep;
    if (pressedKeys.current["ArrowUp"]) decRef.current += decStep;
    if (pressedKeys.current["ArrowDown"]) decRef.current -= decStep;

    // === Get local observer position ===
    const surfaceLocal = astro.latLonToVector3(lat, lon, orbScale * 1.001); // Vector from Earth's center to lat/lon
    const rotated = surfaceLocal.clone().applyQuaternion(earthQuat); // World-space position
    const worldPos = new THREE.Vector3(...earthPos).add(rotated);     // Final camera position

    // === Local ENU basis vectors ===
    // These are Earth-relative, we must rotate them with the Earth!
    const east = astro.latLonToVector3(lat, lon + Math.PI / 2, 1).sub(surfaceLocal).normalize();  // East direction
    const north = astro.latLonToVector3(lat + Math.PI / 2, lon, 1).sub(surfaceLocal).normalize(); // North direction
    const up = surfaceLocal.clone().normalize(); // Up from Earth center

    // Rotate ENU to world space
    east.applyQuaternion(earthQuat);
    north.applyQuaternion(earthQuat);
    up.applyQuaternion(earthQuat);

    // === Apply RA/DEC rotations ===
    let forward = east.clone(); // Looking toward local east initially
    forward.applyAxisAngle(up, raRef.current); // Yaw (RA)
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();
    forward.applyAxisAngle(right, decRef.current); // Pitch (DEC)
    const camUp = new THREE.Vector3().crossVectors(forward, right).normalize();

    // === Apply to camera ===
    const mat = new THREE.Matrix4().makeBasis(right, camUp, forward);
    camera.position.copy(worldPos);
    camera.setRotationFromMatrix(mat);
  });

  return cameraMode !== "surface" ? <CameraControls target={target} /> : null;
}
