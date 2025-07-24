import React, { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { julian } from "astronomia";
import { Text } from "@react-three/drei";
import * as THREE from "three";

import { Earth, EarthOrbit, SunToEarthLine, KeyPoints } from "./components/Earth";
import * as astro from "./utils/astroUtil";
import CameraControls from "./components/CameraControls"

export default function App() {
  // Compute JD once, right now
  const date = new Date(Date.UTC(1995, 6, 10, 12, 0, 0)); //historical (or future :) ) date set. month is zero indexed (jan = 0) yr-mo-day-h-m-s
  const now = new Date();
  const [jdNow, setJdNow] = useState(julian.DateToJD(now));
  const initialPos = astro.getEarthPositionJD(jdNow);

  const [earthPos, setEarthPos] = useState(initialPos);
  const [cameraMode, setCameraMode] = useState("sun"); // "sun" or "earth"


  useEffect(() => {
    const interval = setInterval(() => {
      const jd = julian.DateToJD(new Date());
      const pos = astro.getEarthPositionJD(jd);
      if (pos) setEarthPos(pos);
      if (jd) setJdNow(jd);
      console.log("new earth pos + jd", pos, jd);
    }, 10000); // update every ten seconds

    return () => clearInterval(interval); // cleanup on unmount
  }, []);

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
