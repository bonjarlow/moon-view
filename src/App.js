import React, { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { julian } from "astronomia";
import { Text } from "@react-three/drei";
import * as THREE from "three";

import { Earth, EarthOrbit, SunToEarthLine, KeyPoints } from "./components/Earth";
import Sun from "./components/Sun";
import * as astro from "./utils/astroUtil";
import CameraControls from "./components/CameraControls"

export default function App() {
  const sampleRate = 10; // in seconds

  const startDate = new Date(Date.UTC(1995, 6, 10, 12, 0, 0)); // historical/future start date
  const [jdNow, setJdNow] = useState(julian.DateToJD(startDate));
  const initialPos = astro.getEarthPositionJD(jdNow);

  const [earthPos, setEarthPos] = useState(initialPos);
  const [cameraMode, setCameraMode] = useState("sun");
  const [showGeometry, setShowGeometry] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      // Increment JD by sampleRate seconds
      const jdIncrement = sampleRate / 86400; // 86400 seconds in a day
      const newJd = jdNow + jdIncrement;

      const pos = astro.getEarthPositionJD(newJd);
      if (pos) setEarthPos(pos);
      setJdNow(newJd);

      console.log("new earth pos", pos, julian.JDToDate(newJd).toUTCString());
    }, sampleRate * 1000); // convert sampleRate to milliseconds

    return () => clearInterval(interval);
  }, [jdNow, sampleRate]);

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

      <button
        onClick={() => setShowGeometry(prev => !prev)}
        style={{
          position: "absolute",
          top: 60, // slightly below the other button
          left: 20,
          zIndex: 10,
          padding: "0.5rem 1rem",
          background: "#111",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: "4px",
        }}
      >
        {showGeometry ? "Hide Geometry" : "Show Geometry"}
      </button>

      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 10,
          padding: "0.5rem 1rem",
          background: "#111",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: "4px",
          fontFamily: "monospace",
          fontSize: "0.8rem",
        }}
      >
        Simulated Time: {julian.JDToDate(jdNow).toLocaleString("en-US", {timeZone: "America/New_York" })}
      </div>

      {/* Reset to Now Button */}
      <button
        onClick={() => {
          const now = new Date();
          const jd = julian.DateToJD(now);
          const pos = astro.getEarthPositionJD(jd);
          setJdNow(jd);
          setEarthPos(pos);
        }}
        style={{
          position: "absolute",
          top: 100, // slightly lower than the first button
          left: 20,
          zIndex: 10,
          padding: "0.5rem 1rem",
          background: "#111",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: "4px",
        }}
       >
         Reset to Now
       </button>

      <Canvas
        shadows
        camera={{ position: [0, 20, 40], fov: 50, near: 0.1, far: 1000000 }}
        gl={{ physicallyCorrectLights: true }}
        style={{ height: "100vh", background: "black" }}
      >
        <Sun showGeometry={showGeometry}/>
        <EarthOrbit jdNow={jdNow} showGeometry={showGeometry} />
        <Earth position={earthPos} jdNow={jdNow} showGeometry={showGeometry} />
        <SunToEarthLine earthPos={earthPos} showGeometry={showGeometry} />
        <KeyPoints showGeometry={showGeometry} />
        <CameraControls target={target} />

      </Canvas>
    </>
  );
}
