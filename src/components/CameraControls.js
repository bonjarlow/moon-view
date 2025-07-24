import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

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

export default CameraControls;
