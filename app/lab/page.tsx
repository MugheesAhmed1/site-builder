"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { CREATURES, makeBrain } from "@/template/src/three/creatures.jsx";

function Spin({ who, state }: { who: string; state: string }) {
  const brain = useMemo(() => makeBrain(), []);
  const C = (CREATURES as Record<string, React.ComponentType<{ brain: unknown; scale?: number }>>)[who];
  useFrame((_, dt) => brain.step(dt, { near: state === "LOOK", x: 0.6, y: 0.2, tapped: state === "REACT" && brain.since > 1.5, away: state === "AWAY", loud: state === "DANCE" }));
  return <C brain={brain} scale={1} />;
}

export default function Lab() {
  const q = typeof window !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
  const who = q.get("who") || "parrot";
  const state = q.get("state") || "IDLE";
  const yaw = Number(q.get("yaw") || 0);
  return (
    <div style={{ height: "100vh", background: "#173b28" }}>
      <Canvas camera={{ position: [Math.sin(yaw) * Number(q.get("d") || 5), 0.6, Math.cos(yaw) * Number(q.get("d") || 5)], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 8, 6]} intensity={1.4} />
        <Spin who={who} state={state} />
      </Canvas>
    </div>
  );
}
