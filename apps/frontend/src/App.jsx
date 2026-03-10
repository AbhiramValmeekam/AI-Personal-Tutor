import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Scenario } from "./components/Scenario";
import { ChatInterface } from "./components/ChatInterface";
import "./styles/animations.css"; // Import the animations CSS
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./components/LandingPage";

// Protected route: only allows access if a JWT token is stored in localStorage
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("adam_token");
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/avatar"
          element={
            <ProtectedRoute>
              <>
                <Loader />
                <Leva collapsed hidden />
                <ChatInterface />
                <Canvas shadows camera={{ position: [0, 0, 0], fov: 10 }}>
                  <Scenario />
                </Canvas>
              </>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;