"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

// Loads a heavy section's code only when it nears the screen, and keeps its space so the
// page does not jump. The home page's first load stays small this way.
export default function Lazy({ load, minHeight = 480, label }: { load: () => Promise<{ default: React.ComponentType }>; minHeight?: number; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, { once: true, margin: "600px 0px" });
  const [C, setC] = useState<React.ComponentType | null>(null);
  useEffect(() => {
    if (near && !C) load().then((m) => setC(() => m.default));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near]);
  return (
    <div ref={ref} style={C ? undefined : { minHeight }} aria-busy={!C} aria-label={C ? undefined : label}>
      {C && <C />}
    </div>
  );
}
