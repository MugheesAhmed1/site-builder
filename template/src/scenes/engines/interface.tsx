import { useCallback, useRef } from "react";
import type { DomEngineProps } from "../Stage";
import { clamp, freshTaps, num, str, type Frame } from "../frame";
import { blend, objectBox, place, useFrame, type Slot } from "./dom";

// Interface: the product itself tells the story. Styles: "app" (a clean product window) and
// "holo" (glowing panels in depth). Beat key: step, 0 scattered notes, 1 a clean table, 2 the
// product in use with a cursor, 3 work flowing through by itself, 4 a chart that climbs. The
// same six panels move between those layouts, so the transformation reads as one object.
// The window tilts toward the cursor (cursor.tilt); a tap makes the panels jump (click.react).

const N = 6;
const BARS = [0.35, 0.5, 0.45, 0.68, 0.8, 0.96];

const LAYOUTS: Slot[][] = [
  // 0: scattered
  [
    { x: 0.18, y: 0.25, w: 0.3, h: 0.24, r: -9 },
    { x: 0.62, y: 0.16, w: 0.28, h: 0.2, r: 6 },
    { x: 0.86, y: 0.55, w: 0.26, h: 0.26, r: -4 },
    { x: 0.35, y: 0.7, w: 0.32, h: 0.22, r: 8 },
    { x: 0.64, y: 0.86, w: 0.26, h: 0.18, r: -7 },
    { x: 0.1, y: 0.78, w: 0.22, h: 0.18, r: 12 },
  ],
  // 1: a table
  Array.from({ length: N }, (_, i) => ({ x: 0.5, y: 0.12 + i * 0.152, w: 0.92, h: 0.12 })),
  // 2: the app window
  [
    { x: 0.11, y: 0.5, w: 0.18, h: 0.94 },
    { x: 0.6, y: 0.1, w: 0.76, h: 0.12 },
    { x: 0.41, y: 0.4, w: 0.37, h: 0.36 },
    { x: 0.79, y: 0.4, w: 0.37, h: 0.36 },
    { x: 0.41, y: 0.79, w: 0.37, h: 0.34 },
    { x: 0.79, y: 0.79, w: 0.37, h: 0.34 },
  ],
  // 3: a flow
  Array.from({ length: N }, (_, i) => ({ x: 0.09 + i * 0.164, y: 0.5 + (i % 2 ? 0.16 : -0.16), w: 0.15, h: 0.24 })),
  // 4: a chart
  BARS.map((v, i) => ({ x: 0.1 + i * 0.16, y: 0.96 - (v * 0.86) / 2, w: 0.11, h: v * 0.86 })),
];

export function Interface({ bus, labels }: DomEngineProps) {
  const root = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const cursor = useRef<HTMLDivElement>(null);
  const flow = useRef<SVGPathElement>(null);
  const fn = useCallback((f: Frame) => {
    const step = clamp(num(f.beat, "step", 0), 0, 4);
    const box = objectBox(f);
    const tap = freshTaps(f, 600).pop();
    const holo = str(f.params, "style", "app") === "holo";
    if (root.current) root.current.style.opacity = String(box.alpha);
    if (win.current) {
      // The window frame shows only while the panels form the product.
      const frame = clamp(1 - Math.abs(step - 2) * 1.2);
      const tx = f.pointer ? f.nx * 7 : 0;
      const ty = f.pointer ? -f.ny * 5 : 0;
      win.current.style.cssText = `width:${box.w + 24}px;height:${box.h + 24}px;transform:translate3d(${box.x - 12}px,${box.y - 12}px,0) perspective(900px) rotateY(${tx}deg) rotateX(${ty}deg);opacity:${frame}`;
      root.current?.style.setProperty("--tilt", `perspective(900px) rotateY(${tx}deg) rotateX(${ty}deg)`);
    }
    for (let i = 0; i < N; i++) {
      const s = blend(LAYOUTS, step, i);
      if (holo) s.r = (s.r ?? 0) * 0.5;
      if (tap && !f.reduced) {
        const k = Math.sin(tap.age * Math.PI) * (1 - tap.age);
        s.y -= k * 0.06 * ((i % 3) + 1);
      }
      if (step > 2.6 && step < 3.6 && !f.reduced) s.y += Math.sin(f.t * 2.4 + i * 0.9) * 0.02;
      place(panels.current[i], box, s);
    }
    if (cursor.current) {
      const on = clamp(1 - Math.abs(step - 2.2) * 1.4);
      const k = (f.t * 0.5) % 4;
      const tgt = [
        [0.42, 0.42],
        [0.8, 0.42],
        [0.8, 0.8],
        [0.12, 0.3],
      ][Math.floor(k)];
      const cx = box.x + (f.pointer ? (f.px - box.x) / box.w : tgt[0]) * box.w;
      const cy = box.y + (f.pointer ? (f.py - box.y) / box.h : tgt[1]) * box.h;
      const c = cursor.current;
      const prev = (c as any)._p ?? [cx, cy];
      const nx = prev[0] + (cx - prev[0]) * 0.08;
      const ny = prev[1] + (cy - prev[1]) * 0.08;
      (c as any)._p = [nx, ny];
      c.style.transform = `translate3d(${nx}px,${ny}px,0)`;
      c.style.opacity = String(f.pointer ? 0 : on);
    }
    if (flow.current) {
      const on = clamp(1 - Math.abs(step - 3) * 1.5);
      flow.current.style.opacity = String(on);
      flow.current.style.strokeDashoffset = String(-((f.t * 40) % 40));
      const pts = LAYOUTS[3].map((p) => `${box.x + p.x * box.w},${box.y + p.y * box.h}`);
      flow.current.setAttribute("d", "M" + pts.join(" L"));
    }
  }, []);
  useFrame(bus, fn);
  const words = labels.length ? labels : ["Overview", "Orders", "Customers", "Reports", "Settings", "Team"];
  return (
    <div ref={root} className="xp-ui">
      <div ref={win} className="xp-ui-window">
        <span />
        <span />
        <span />
      </div>
      <svg className="xp-ui-flow" width="100%" height="100%">
        <path ref={flow} d="M0 0" />
      </svg>
      {Array.from({ length: N }, (_, i) => (
        <div key={i} ref={(el) => void (panels.current[i] = el)} className={"xp-ui-panel" + (i === 0 ? " is-lead" : "")}>
          <b>{words[i % words.length]}</b>
          <i />
          <i />
        </div>
      ))}
      <div ref={cursor} className="xp-ui-cursor" />
    </div>
  );
}
