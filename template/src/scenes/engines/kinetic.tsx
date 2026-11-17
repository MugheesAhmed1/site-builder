import { useCallback, useRef } from "react";
import type { DomEngineProps } from "../Stage";
import { clamp, freshTaps, num, ramp, rng, smooth, type Frame } from "../frame";
import { objectBox, useFrame } from "./dom";

// Kinetic: type and line are the world. Styles:
//  - "bold" and "neon": the name fills the screen behind the words; letters drop in, split
//    apart (beat split), stack in alternating weights (step 2) and ride a wave (step 3).
//    Letters move away from the cursor (cursor.repel); a tap scatters them (click.burst).
//  - "luxury" and "ink": one fine line draws itself across the page (beat draw) and closes
//    into a frame around the object; the cursor bends it.
//  - "gallery": a corridor of frames the camera walks through (beat cam), with the site's
//    work captions on them. The cursor turns the head a little.

function Letters({ bus, labels, params }: DomEngineProps) {
  const root = useRef<HTMLDivElement>(null);
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const word = (labels[0] || "Studio").toUpperCase().slice(0, 14);
  const chars = [...word];
  const R = rng(word.length * 31 + 7);
  const rand = useRef(chars.map(() => [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1])).current;
  const fn = useCallback((f: Frame) => {
    const step = num(f.beat, "step", 0);
    const split = clamp(num(f.beat, "split", 0));
    const scale = num(f.beat, "scale", 1);
    const tap = freshTaps(f, 1200).pop();
    const burst = tap && !f.reduced ? Math.sin(clamp(tap.age) * Math.PI) : 0;
    const el = root.current;
    if (!el) return;
    const fs = Math.min((f.w / Math.max(4, chars.length)) * 1.45, f.h * 0.42) * scale;
    el.style.fontSize = fs.toFixed(1) + "px";
    el.style.opacity = String(f.mobile ? 0.14 : 0.1 + (1 - f.presence) * 0.12 + 0.08);
    const drop = f.reduced ? 1 : smooth(clamp(f.t / 1.2));
    const wave = ramp(step, 2.4, 3) * (1 - ramp(step, 3.5, 4));
    const stack = ramp(step, 1.4, 2) * (1 - ramp(step, 2.6, 3));
    chars.forEach((_, i) => {
      const s = spans.current[i];
      if (!s) return;
      const [a, b, c] = rand[i];
      let x = a * split * fs * 0.5 + burst * a * fs * 0.8;
      let y = (1 - drop) * -f.h * (0.4 + Math.abs(b) * 0.3) + b * split * fs * 0.6 + burst * b * fs * 0.6;
      y += Math.sin(i * 0.7 + f.t * 1.6) * fs * 0.25 * wave;
      const r = c * split * 18 + burst * c * 40;
      if (f.pointer) {
        const rect = s.getBoundingClientRect();
        const host = el.getBoundingClientRect();
        const dx = rect.left - host.left + rect.width / 2 - f.px;
        const dy = rect.top - host.top + rect.height / 2 - f.py;
        const d = Math.hypot(dx, dy) || 1;
        const k = clamp(1 - d / (fs * 1.2)) * fs * 0.3;
        (x += (dx / d) * k), (y += (dy / d) * k);
      }
      s.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${r.toFixed(1)}deg)`;
      s.style.fontWeight = stack > 0.5 ? (i % 2 ? "300" : "900") : "";
    });
  }, [chars.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(bus, fn);
  return (
    <div ref={root} className={"xp-kin-word" + (params.style === "neon" ? " is-neon" : "")}>
      {chars.map((ch, i) => (
        <span key={i} ref={(el) => void (spans.current[i] = el)}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </div>
  );
}

function Line({ bus }: DomEngineProps) {
  const path = useRef<SVGPathElement>(null);
  const frame = useRef<SVGRectElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const fn = useCallback((f: Frame) => {
    const draw = clamp(num(f.beat, "draw", 0.25));
    const step = num(f.beat, "step", 0);
    if (!path.current || !svg.current) return;
    svg.current.setAttribute("viewBox", `0 0 ${f.w} ${f.h}`);
    // A long calm curve across the page; the cursor bends it.
    const y = f.h * (f.mobile ? 0.4 : 0.62);
    const by = f.pointer ? (f.py - y) * 0.35 : Math.sin(f.t * 0.3) * 12;
    const bx = f.pointer ? f.px : f.w * 0.55;
    path.current.setAttribute("d", `M ${-20} ${y + 40} C ${f.w * 0.25} ${y - 60}, ${bx - 80} ${y + by}, ${bx} ${y + by * 0.6} S ${f.w * 0.85} ${y - 80}, ${f.w + 20} ${y - 20}`);
    path.current.style.strokeDashoffset = String(1 - draw);
    if (frame.current) {
      const box = objectBox(f);
      const on = ramp(step, 1.4, 2.2);
      frame.current.setAttribute("x", String(box.x));
      frame.current.setAttribute("y", String(box.y));
      frame.current.setAttribute("width", String(box.w));
      frame.current.setAttribute("height", String(box.h));
      frame.current.style.strokeDashoffset = String(1 - on);
    }
  }, []);
  useFrame(bus, fn);
  return (
    <svg ref={svg} className="xp-kin-line" preserveAspectRatio="none">
      <path ref={path} pathLength={1} />
      <rect ref={frame} pathLength={1} rx={2} />
    </svg>
  );
}

function Corridor({ bus, labels }: DomEngineProps) {
  const room = useRef<HTMLDivElement>(null);
  const frames = 8;
  const fn = useCallback((f: Frame) => {
    const cam = clamp(num(f.beat, "cam", 0));
    if (!room.current) return;
    const depth = f.mobile ? 520 : 760;
    const z = cam * depth * (frames / 2 - 1);
    const yaw = f.pointer ? f.nx * 6 : 0;
    room.current.style.transform = `translateZ(${z.toFixed(1)}px) rotateY(${yaw.toFixed(2)}deg)`;
    room.current.style.setProperty("--depth", depth + "px");
    room.current.style.opacity = String(f.mobile ? 0.6 : 0.45 + f.presence * 0.55);
  }, []);
  useFrame(bus, fn);
  const words = labels.length ? labels : ["Work", "Studio", "Story", "Craft"];
  return (
    <div className="xp-kin-corridor">
      <div ref={room} className="xp-kin-room">
        {Array.from({ length: frames }, (_, i) => (
          <figure key={i} className={i % 2 ? "is-right" : "is-left"} style={{ ["--i" as string]: Math.floor(i / 2) }}>
            <span style={{ ["--h" as string]: (i * 47) % 360 }} />
            <figcaption>{words[i % words.length]}</figcaption>
          </figure>
        ))}
        <div className="xp-kin-floor" />
      </div>
    </div>
  );
}

export function Kinetic(props: DomEngineProps) {
  const style = typeof props.params.style === "string" ? props.params.style : "bold";
  if (style === "gallery") return <Corridor {...props} />;
  if (style === "luxury" || style === "ink") return <Line {...props} />;
  return <Letters {...props} />;
}
