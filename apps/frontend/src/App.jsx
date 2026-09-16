import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Scenario } from "./components/Scenario";
import { ChatInterface } from "./components/ChatInterface";
import "./styles/animations.css"; // Import the animations CSS
import React from "react";

function App() {
  // Remounts the 3D scene (avatar reset) whenever the chat session changes
  const [sessionKey, setSessionKey] = React.useState("local");
  return (
    <>
      <Loader />
      <Leva collapsed hidden />
      <ChatInterface onSessionChange={setSessionKey} />
      <Canvas shadows camera={{ position: [0, 0, 0], fov: 16, near: 0.5, far: 60 }}>
        <Scenario key={sessionKey} />
      </Canvas>
    </>
  );
}

export default App;