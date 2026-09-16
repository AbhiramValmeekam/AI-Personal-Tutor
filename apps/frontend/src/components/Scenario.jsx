import { CameraControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Avatar } from "./Avatar";
import { Library } from "./Library";

export const Scenario = () => {
  const cameraControls = useRef();
  useEffect(() => {
    cameraControls.current.setLookAt(0, 1.5, 7.5, 0, 0.9, 0, true);
  }, []);
  return (
    <>
      <CameraControls
        ref={cameraControls}
        minDistance={2.5}
        maxDistance={12}
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
