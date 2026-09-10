import { CameraControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Avatar } from "./Avatar";
import { Library } from "./Library";

export const Scenario = () => {
  const cameraControls = useRef();
  useEffect(() => {
    cameraControls.current.setLookAt(0, 2.2, 5, 0, 1.0, 0, true);
  }, []);
  return (
    <>
      <CameraControls
        ref={cameraControls}
        minDistance={2.5}
        maxDistance={9}
        minPolarAngle={0.9}
        maxPolarAngle={1.55}
        minAzimuthAngle={-0.85}
        maxAzimuthAngle={0.85}
        enablePan={false}
      />
      <Library />
      <Avatar />
    </>
  );
};
