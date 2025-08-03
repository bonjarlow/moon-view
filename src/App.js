import React, { useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { julian } from "astronomia";
import * as THREE from "three";

import { Earth, EarthOrbit, SunToEarthLine, KeyPoints } from "./components/Earth";
import Sun from "./components/Sun";
import StarsAndConstellations from "./components/StarsAndConstellations";
import * as astro from "./utils/astroUtil";
import useHipparcosData from "./utils/useHipparcosData";
import CameraControls from "./components/CameraControls";
import SimulationControls from "./components/SimulationControls";
import CameraView from "./components/CameraView";

export default function App() {

  const startDate = new Date(Date.UTC(2024, 3, 8, 19, 0, 0)); // historical/future start date
  const [jdNow, setJdNow] = useState(julian.DateToJD(startDate));
  const initialPos = astro.getEarthPositionJD(jdNow);

  const [earthPos, setEarthPos] = useState(initialPos);
  const [earthQuat, setEarthQuat] = useState(() => new THREE.Quaternion()); //gives correct earth spin
  const [cameraMode, setCameraMode] = useState("sun");
  const [showGeometry, setShowGeometry] = useState(false);

  const [realScale, setRealScale] = useState(false);
  const scaleSettings = realScale
    //SCALE is distance scaling. 1 is an Earth radius
    //orbScale scales up sizes of moon and earth
    //sunrad sets sun size
    ? { SCALE: 27000, orbScale: 1, sunrad: 109 }
    : { SCALE: 500, orbScale: 10, sunrad: 50 };

  const [sampleRate, setSampleRate] = useState(1); // seconds per sample
  const [speedUp, setSpeedUp] = useState(1.0); //speedUp = 1 means each sample increments sim by 1 second

  const { stars, constellations } = useHipparcosData();
  const selectedConstellations = useMemo(() => {
  const names = ["UMa", "UMi", "Ori", "Cas", "Cnc", "Gem", "Leo",
  "Aqr", "Cap", "Psc", "Ari", "Tau", "Vir", "Lib", "Sco", "Sgr"];
  return Object.fromEntries(
    names
      .filter(name => constellations[name])
      .map(name => [name, constellations[name]])
  );
}, [constellations]);

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~ TODO: ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  //better buttons for play, pause, time scaling (fix time scaling so it's consistent speed up)
  //Camera improvements at both scales
  //camera view from earth location
  //constellation maps
  //optimization... is earth being textured and rotated into position from scratch every frame?

  useEffect(() => {
    if (sampleRate === 0) return; // Pause the simulation

    const interval = setInterval(() => {
      const jdIncrement = (sampleRate / 86400) * speedUp;
      const newJd = jdNow + jdIncrement;

      const pos = astro.getEarthPositionJD(newJd, scaleSettings.SCALE);
      if (pos) setEarthPos(pos);
      setJdNow(newJd);
    }, sampleRate * 1000);

    return () => clearInterval(interval);
  }, [sampleRate, speedUp, jdNow, scaleSettings.SCALE]);

  const toggleCameraMode = () => {
    setCameraMode(prev => {
      if (prev === "sun") return "earth";
      if (prev === "earth") return "surface";
      return "sun";
    });
  };

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

      <SimulationControls
        jdNow={jdNow}
        sampleRate={sampleRate}
        setSampleRate={setSampleRate}
        speedUp={speedUp}
        setSpeedUp={setSpeedUp}
      />

      {/* Reset to Now Button */}
      <button
        onClick={() => {
          const now = new Date();
          const jd = julian.DateToJD(now);
          const pos = astro.getEarthPositionJD(jd, scaleSettings.SCALE);
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

       <button
         onClick={() => setRealScale(!realScale)}
         style={{
           position: "absolute",
           top: 140,
           left: 20,
           zIndex: 10,
           padding: "0.5rem 1rem",
           background: "#111",
           color: "#fff",
           border: "1px solid #333",
           borderRadius: "4px",
          }}
       >
         {realScale ? "Switch to Aesthetic Scale" : "Switch to Realistic Scale"}
       </button>

      <Canvas
        shadows
        camera={{ position: [0, -1000, 200], fov: 50, near: 0.1, far: 1000000 }}
        gl={{ physicallyCorrectLights: true }}
        style={{ height: "100vh", background: "black" }}
      >
        <Sun showGeometry={showGeometry} sunrad={scaleSettings.sunrad} />
        <EarthOrbit jdNow={jdNow} showGeometry={showGeometry} SCALE={scaleSettings.SCALE} />
        <Earth
          position={earthPos} jdNow={jdNow} showGeometry={showGeometry}
          orbScale={scaleSettings.orbScale} onQuatReady={setEarthQuat}
        />
        <SunToEarthLine earthPos={earthPos} showGeometry={showGeometry} />
        <KeyPoints showGeometry={showGeometry} SCALE={scaleSettings.SCALE} />
        <StarsAndConstellations stars={stars} constellations={selectedConstellations} />
        <CameraView
          cameraMode={cameraMode} earthPos={earthPos}
          lat={THREE.MathUtils.degToRad(41)} lon={THREE.MathUtils.degToRad(71)}
          orbScale={scaleSettings.orbScale} earthQuat={earthQuat}
        />

      </Canvas>
    </>
  );
}
