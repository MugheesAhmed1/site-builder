import { useCallback, useRef } from "react";
import type { DomEngineProps } from "../Stage";
import { clamp, freshTaps, num, ramp, type Frame } from "../frame";
import { blend, objectBox, place, useFrame, type Slot } from "./dom";

// Ledger: a case told with documents. Beat key: step, 0 a neat stack, 1 spread along a dated
// timeline, 2 key lines underlined and pinned, 3 the file closes and the seal is stamped.
// The papers lift toward the cursor (cursor.attract); a tap fans the stack (click.react).

const N = 5;
const LAYOUTS: Slot[][] = [
  Array.from({ length: N }, (_, i) => ({ x: 0.5 + i * 0.012, y: 0.5 - i * 0.018, w: 0.46, h: 0.66, r: (i - 2) * 2.5 })),
  Array.from({ length: N }, (_, i) => ({ x: 0.1 + i * 0.2, y: 0.45 + (i % 2 ? 0.08 : -0.06), w: 0.24, h: 0.42, r: (i % 2 ? 3 : -3) })),
  Array.from({ length: N }, (_, i) => ({ x: 0.14 + i * 0.18, y: 0.48, w: 0.26, h: 0.5, r: (i - 2) * 1.5, s: i === 2 ? 1.25 : 0.95 })),
  Array.from({ length: N }, (_, i) => ({ x: 0.5, y: 0.52 - i * 0.004, w: 0.42, h: 0.6, r: 0, o: i === N - 1 ? 1 : 0.9 })),
];

export function Ledger({ bus }: DomEngineProps) {
  const root = useRef<HTMLDivElement>(null);
  const docs = useRef<(HTMLDivElement | null)[]>([]);
  const line = useRef<HTMLDivElement>(null);
  const folder = useRef<HTMLDivElement>(null);
  const seal = useRef<HTMLDivElement>(null);
  const fn = useCallback((f: Frame) => {
    const step = clamp(num(f.beat, "step", 0), 0, 3);
    const box = objectBox(f);
    const tap = freshTaps(f, 900).pop();
    if (root.current) {
      root.current.style.opacity = String(box.alpha);
      root.current.style.setProperty("--mark", String(ramp(step, 1.5, 2.2) * (1 - ramp(step, 2.6, 3))));
    }
    for (let i = 0; i < N; i++) {
      const s = blend(LAYOUTS, step, i);
      if (tap && !f.reduced && step < 0.5) {
        const k = Math.sin(tap.age * Math.PI);
        (s.r = (s.r ?? 0) + (i - 2) * 9 * k), (s.x += (i - 2) * 0.05 * k);
      }
      if (f.pointer) {
        const dx = (f.px - (box.x + s.x * box.w)) / box.w;
        const dy = (f.py - (box.y + s.y * box.h)) / box.h;
        if (Math.hypot(dx, dy) < 0.25) (s.y -= 0.03), (s.s = (s.s ?? 1) * 1.03);
      }
      place(docs.current[i], box, s);
    }
    if (line.current) {
      const on = ramp(step, 0.4, 1) * (1 - ramp(step, 2.4, 3));
      line.current.style.cssText = `width:${box.w}px;transform:translate3d(${box.x}px,${box.y + box.h * 0.86}px,0) scaleX(${on});opacity:${on}`;
    }
    if (folder.current) {
      const on = ramp(step, 2.4, 3);
      place(folder.current, box, { x: 0.5, y: 0.55, w: 0.5, h: 0.68, o: on, s: 0.96 + on * 0.04 });
    }
    if (seal.current) {
      const on = ramp(step, 2.75, 3);
      place(seal.current, box, { x: 0.68, y: 0.72, w: 0.17, h: 0.17 * (box.w / box.h), o: on, s: 1.6 - on * 0.6, r: -12 });
    }
  }, []);
  useFrame(bus, fn);
  return (
    <div ref={root} className="xp-ledger">
      <div ref={line} className="xp-ledger-line">
        {Array.from({ length: N }, (_, i) => (
          <span key={i} style={{ left: 10 + i * 20 + "%" }} />
        ))}
      </div>
      {Array.from({ length: N }, (_, i) => (
        <div key={i} ref={(el) => void (docs.current[i] = el)} className="xp-ledger-doc">
          <i />
          <i />
          <i className="is-key" />
          <i />
          <i />
        </div>
      ))}
      <div ref={folder} className="xp-ledger-folder" />
      <div ref={seal} className="xp-ledger-seal" />
    </div>
  );
}
