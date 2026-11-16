"use client";

import { useEffect, useState } from "react";
import { Atmosphere } from "@/template/src/atmos/Atmos.jsx";

export default function SceneLab() {
  const [q, setQ] = useState<{ id: string; n: number; still: boolean; name: string } | null>(null);
  useEffect(() => {
    const read = () => {
      const u = new URLSearchParams(location.search);
      setQ({ id: u.get("id") || "chrome", n: Number(u.get("n") || 8), still: u.get("still") === "1", name: u.get("name") || "" });
    };
    read();
    (window as unknown as { __scene: (id: string) => void }).__scene = (id: string) => setQ((v) => (v ? { ...v, id } : v));
  }, []);
  if (!q) return null;
  return (
    <main style={{ position: "fixed", inset: 0, background: "#000" }}>
      <Atmosphere id={q.id} intensity={q.n} still={q.still} accent="#8b5cf6" name={q.name} />
    </main>
  );
}
