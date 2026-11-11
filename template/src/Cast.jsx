import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { PALETTES } from "./cast.js";

// Draws the cast from src/cast.js: 520 drawn characters, 60 real-life ones and 512 widgets, each with its own idle
// animation. Loops are CSS (cheap, run off the main thread); eyes that follow the pointer
// and the scroll story use Motion. Reduced motion stops the loops.

const SKIN_TONES = ["#F2D3B8", "#E8BB96", "#C98E66", "#A86F4C", "#7D5137", "#5A3A27"];
const HAIR = ["#1F1A17", "#3B2A20", "#6B4530", "#A0703F", "#2B2B33", "#8C3B2E"];

function pal(id) {
  return PALETTES.find((p) => p.id === id) || PALETTES[0];
}

function usePointerEyes(live) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 140, damping: 18 });
  const sy = useSpring(y, { stiffness: 140, damping: 18 });
  useEffect(() => {
    if (!live || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const on = (e) => {
      x.set(((e.clientX / window.innerWidth) * 2 - 1) * 3.2);
      y.set(((e.clientY / window.innerHeight) * 2 - 1) * 2.6);
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, [live, x, y]);
  return { x: sx, y: sy };
}

// Body parts per family. Each returns the drawing plus where the face and head top sit.
function body(def, P) {
  const v = def.variant || 0;
  const skin = SKIN_TONES[v % SKIN_TONES.length];
  const hair = HAIR[(v * 5) % HAIR.length];
  switch (def.family) {
    case "person": {
      const style = v % 5;
      return {
        face: { cx: 100, cy: 98, gap: 15, r: 4.4, mouthY: 116 },
        top: 52,
        neck: 142,
        draw: (
          <>
            <path d="M42 196c4-34 28-54 58-54s54 20 58 54z" fill={P.body} />
            <rect x="90" y="128" width="20" height="20" rx="8" fill={skin} />
            {style === 1 && <path d="M60 96c0-30 18-48 40-48s40 18 40 48v44c-8 4-18 2-20-6H80c-2 8-12 10-20 6z" fill={hair} />}
            <ellipse cx="100" cy="98" rx="34" ry="40" fill={skin} />
            {style === 0 && <path d="M66 90c0-26 15-40 34-40s34 14 34 40c-7-12-18-18-34-18s-27 6-34 18z" fill={hair} />}
            {style === 1 && <path d="M68 92c2-24 15-38 32-38s30 14 32 38c-12-10-22-14-32-14s-20 4-32 14z" fill={hair} />}
            {style === 2 && (
              <>
                <circle cx="100" cy="48" r="13" fill={hair} />
                <path d="M68 90c0-24 15-36 32-36s32 12 32 36c-8-10-19-15-32-15s-24 5-32 15z" fill={hair} />
              </>
            )}
            {style === 3 && (
              <g fill={hair}>
                {[[74, 74], [86, 62], [100, 58], [114, 62], [126, 74]].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="12" />
                ))}
              </g>
            )}
            {style === 4 && <path d="M70 84c3-20 16-30 30-30s27 10 30 30c-8-5-19-7-30-7s-22 2-30 7z" fill={hair} />}
          </>
        ),
      };
    }
    case "blob":
      return {
        face: { cx: 100, cy: 100, gap: 18, r: 6, mouthY: 124 },
        top: 46,
        neck: 150,
        draw: <path className="cc-blob" d="M100 44c40 0 70 26 70 68s-28 74-70 74-70-30-70-74 30-68 70-68z" fill={P.body} />,
      };
    case "robot":
      return {
        face: { cx: 100, cy: 98, gap: 20, r: 6, mouthY: 120, screen: true },
        top: 56,
        neck: 140,
        draw: (
          <>
            <line x1="100" y1="56" x2="100" y2="36" stroke={P.trim} strokeWidth="4" />
            <circle className="cc-led" cx="100" cy="32" r="7" fill={P.body} stroke={P.trim} strokeWidth="3" />
            <rect x="60" y="146" width="80" height="44" rx="14" fill={P.body} />
            <rect x="82" y="156" width="36" height="14" rx="5" fill={P.trim} opacity="0.35" />
            <rect x="54" y="56" width="92" height="84" rx="24" fill={P.body} />
            <rect x="66" y="76" width="68" height="44" rx="14" fill={P.trim} opacity="0.92" />
            <rect x="46" y="88" width="10" height="22" rx="4" fill={P.trim} />
            <rect x="144" y="88" width="10" height="22" rx="4" fill={P.trim} />
          </>
        ),
      };
    case "cat":
      return {
        face: { cx: 100, cy: 104, gap: 17, r: 5, mouthY: 122, whiskers: true },
        top: 58,
        neck: 150,
        draw: (
          <>
            <path className="cc-tail" d="M150 176c26-6 34-30 22-46" stroke={P.body} strokeWidth="12" strokeLinecap="round" fill="none" />
            <ellipse cx="100" cy="170" rx="44" ry="26" fill={P.body} />
            <path d="M58 82 66 40l28 26zM142 82l-8-42-28 26z" fill={P.body} />
            <path d="M66 70l4-18 12 12zM134 70l-4-18-12 12z" fill={P.trim} opacity="0.35" />
            <ellipse cx="100" cy="104" rx="46" ry="42" fill={P.body} />
          </>
        ),
      };
    case "bear":
      return {
        face: { cx: 100, cy: 100, gap: 17, r: 5, mouthY: 124, snout: true },
        top: 52,
        neck: 150,
        draw: (
          <>
            <ellipse cx="100" cy="172" rx="46" ry="26" fill={P.body} />
            <circle cx="62" cy="62" r="16" fill={P.body} />
            <circle cx="138" cy="62" r="16" fill={P.body} />
            <circle cx="62" cy="62" r="8" fill={P.trim} opacity="0.3" />
            <circle cx="138" cy="62" r="8" fill={P.trim} opacity="0.3" />
            <circle cx="100" cy="102" r="46" fill={P.body} />
          </>
        ),
      };
    case "bird":
      return {
        face: { cx: 100, cy: 92, gap: 16, r: 5, mouthY: 0, beak: true },
        top: 52,
        neck: 150,
        draw: (
          <>
            <path d="M92 52c-2-12 6-18 14-16-6 4-6 10-4 16z" fill={P.trim} />
            <ellipse cx="100" cy="118" rx="52" ry="60" fill={P.body} />
            <ellipse cx="100" cy="138" rx="30" ry="32" fill="#fff" opacity="0.35" />
            <ellipse className="cc-wing" cx="54" cy="124" rx="12" ry="28" fill={P.trim} opacity="0.55" />
            <ellipse className="cc-wing cc-wing-r" cx="146" cy="124" rx="12" ry="28" fill={P.trim} opacity="0.55" />
            <path d="M86 178l-6 12M114 178l6 12" stroke={P.trim} strokeWidth="4" strokeLinecap="round" />
          </>
        ),
      };
    case "ghost":
      return {
        face: { cx: 100, cy: 96, gap: 17, r: 6, mouthY: 120 },
        top: 46,
        neck: 140,
        draw: <path d="M52 100c0-32 22-54 48-54s48 22 48 54v80c-8 0-8-10-16-10s-8 10-16 10-8-10-16-10-8 10-16 10-8-10-16-10-8 10-16 10z" fill={P.body} />,
      };
    case "alien":
      return {
        face: { cx: 100, cy: 104, gap: 22, r: 8, mouthY: 130, big: true },
        top: 56,
        neck: 156,
        draw: (
          <>
            <path d="M74 64 60 34M126 64l14-30" stroke={P.body} strokeWidth="5" strokeLinecap="round" />
            <circle className="cc-led" cx="60" cy="32" r="7" fill={P.trim} />
            <circle className="cc-led" cx="140" cy="32" r="7" fill={P.trim} />
            <ellipse cx="100" cy="178" rx="34" ry="18" fill={P.body} />
            <ellipse cx="100" cy="104" rx="56" ry="50" fill={P.body} />
          </>
        ),
      };
    case "plant":
      return {
        face: { cx: 100, cy: 150, gap: 15, r: 4.5, mouthY: 166 },
        top: 34,
        neck: 128,
        draw: (
          <>
            <g className="cc-leaves">
              <path d="M100 128c-2-30-22-48-44-50 2 24 18 44 44 50z" fill="#4FAE7A" />
              <path d="M100 128c2-34 24-56 48-58-2 28-20 50-48 58z" fill="#3E9A68" />
              <path d="M100 128c0-36 4-62 0-90-8 26-10 56 0 90z" fill="#5CC08A" />
            </g>
            <path d="M62 128h76l-10 62H72z" fill={P.body} />
            <rect x="56" y="122" width="88" height="16" rx="6" fill={P.body} />
            <rect x="56" y="122" width="88" height="16" rx="6" fill={P.trim} opacity="0.2" />
          </>
        ),
      };
    case "cup":
      return {
        face: { cx: 94, cy: 128, gap: 15, r: 4.5, mouthY: 146 },
        top: 84,
        neck: 186,
        draw: (
          <>
            <g className="cc-steam" stroke={P.trim} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5">
              <path d="M78 76c-8-10 8-14 0-26" />
              <path d="M96 72c-8-10 8-14 0-26" />
              <path d="M114 76c-8-10 8-14 0-26" />
            </g>
            <path d="M138 104c22 0 22 40 0 40" stroke={P.body} strokeWidth="10" fill="none" />
            <path d="M50 92h88l-8 84c-1 8-8 14-16 14H74c-8 0-15-6-16-14z" fill={P.body} />
            <rect x="50" y="88" width="88" height="10" rx="5" fill={P.trim} opacity="0.3" />
          </>
        ),
      };
    case "rocket":
      return {
        face: { cx: 100, cy: 104, gap: 13, r: 4, mouthY: 120, window: true },
        top: 30,
        neck: 160,
        draw: (
          <>
            <path className="cc-flame" d="M88 168c0 14 6 24 12 30 6-6 12-16 12-30z" fill="#FFB020" />
            <path d="M74 136 52 168h26zM126 136l22 32h-26z" fill={P.trim} />
            <path d="M100 26c26 20 34 52 30 104l-6 34H76l-6-34c-4-52 4-84 30-104z" fill={P.body} />
            <circle cx="100" cy="104" r="22" fill="#fff" opacity="0.85" />
            <circle cx="100" cy="104" r="22" fill="none" stroke={P.trim} strokeWidth="5" />
          </>
        ),
      };
    case "dog":
      return {
        face: { cx: 100, cy: 104, gap: 17, r: 5, mouthY: 136, snout: true },
        top: 58,
        neck: 150,
        draw: (
          <>
            <path className="cc-tail" d="M146 170c22-4 30-22 24-38" stroke={P.body} strokeWidth="11" strokeLinecap="round" fill="none" />
            <ellipse cx="100" cy="172" rx="42" ry="24" fill={P.body} />
            <ellipse cx="100" cy="104" rx="46" ry="42" fill={P.body} />
            <ellipse className="cc-ear" cx="58" cy="100" rx="13" ry="30" fill={P.trim} opacity="0.75" />
            <ellipse className="cc-ear cc-ear-r" cx="142" cy="100" rx="13" ry="30" fill={P.trim} opacity="0.75" />
            <path className="cc-tongue" d="M95 137h10v7a5 5 0 0 1-10 0z" fill="#F08A7E" />
          </>
        ),
      };
    case "tooth":
      return {
        face: { cx: 100, cy: 100, gap: 17, r: 5, mouthY: 122 },
        top: 46,
        neck: 150,
        draw: (
          <>
            <path d="M58 70c0-22 18-30 30-24 8 4 16 4 24 0 12-6 30 2 30 24 0 26-8 40-10 66-2 26-8 46-18 46-12 0-10-36-14-36s-2 36-14 36c-10 0-16-20-18-46-2-26-10-40-10-66z" fill="#FBFAF7" stroke={P.body} strokeWidth="5" strokeLinejoin="round" />
            <path className="cc-sparkle" d="M146 52l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill={P.body} />
          </>
        ),
      };
    case "heart":
      return {
        face: { cx: 100, cy: 102, gap: 18, r: 5.5, mouthY: 124 },
        top: 54,
        neck: 160,
        draw: <path className="cc-beat" d="M100 178C58 150 34 124 34 94c0-22 16-38 36-38 14 0 24 8 30 18 6-10 16-18 30-18 20 0 36 16 36 38 0 30-24 56-66 84z" fill={P.body} />,
      };
    case "camera":
      return {
        face: { cx: 100, cy: 120, gap: 34, r: 5, mouthY: 160, lens: true },
        top: 62,
        neck: 176,
        draw: (
          <>
            <rect x="78" y="58" width="44" height="18" rx="6" fill={P.trim} />
            <rect className="cc-flash" x="132" y="64" width="16" height="10" rx="3" fill="#FFE27A" />
            <rect x="34" y="72" width="132" height="100" rx="22" fill={P.body} />
            <circle cx="100" cy="120" r="30" fill={P.trim} />
            <circle className="cc-lens" cx="100" cy="120" r="19" fill="#1d1a19" />
            <circle cx="93" cy="113" r="6" fill="#fff" opacity="0.6" />
          </>
        ),
      };
    case "laptop":
      return {
        face: { cx: 100, cy: 96, gap: 20, r: 5.5, mouthY: 118, screen: true },
        top: 50,
        neck: 160,
        draw: (
          <>
            <rect x="44" y="50" width="112" height="90" rx="12" fill={P.trim} />
            <rect x="52" y="58" width="96" height="74" rx="6" fill={P.body} />
            <path d="M28 146h144l-10 18H38z" fill={P.trim} />
            <rect x="84" y="148" width="32" height="5" rx="2.5" fill={P.body} opacity="0.6" />
            <rect className="cc-cursor" x="128" y="118" width="3" height="10" fill={P.trim} />
          </>
        ),
      };
    case "book":
      return {
        face: { cx: 100, cy: 104, gap: 18, r: 5, mouthY: 126 },
        top: 46,
        neck: 172,
        draw: (
          <>
            <rect x="46" y="44" width="108" height="128" rx="10" fill={P.body} />
            <rect x="46" y="44" width="16" height="128" rx="6" fill={P.trim} opacity="0.45" />
            <rect x="148" y="52" width="10" height="114" rx="3" fill="#FBFAF7" />
            <path className="cc-bookmark" d="M126 44v34l8-7 8 7V44z" fill="#E5484D" />
          </>
        ),
      };
    case "house":
      return {
        face: { cx: 100, cy: 124, gap: 18, r: 5, mouthY: 146 },
        top: 40,
        neck: 186,
        draw: (
          <>
            <rect x="126" y="44" width="16" height="34" fill={P.trim} />
            <g className="cc-smoke" fill="#9AA6B8" opacity="0.5">
              <circle cx="134" cy="34" r="6" />
              <circle cx="140" cy="22" r="5" />
            </g>
            <path d="M100 40 34 96h132z" fill={P.trim} />
            <rect x="46" y="94" width="108" height="88" rx="6" fill={P.body} />
            <rect x="122" y="140" width="20" height="42" rx="4" fill={P.trim} opacity="0.7" />
            <rect className="cc-window" x="58" y="148" width="20" height="18" rx="3" fill="#FFE27A" />
          </>
        ),
      };
    case "car":
      return {
        face: { cx: 100, cy: 122, gap: 26, r: 5, mouthY: 142, carEyes: true },
        top: 64,
        neck: 176,
        draw: (
          <>
            <path d="M58 104l14-30c4-8 10-12 18-12h20c8 0 14 4 18 12l14 30z" fill={P.body} />
            <path d="M74 102l10-24c2-4 5-6 9-6h14c4 0 7 2 9 6l10 24z" fill="#DCEBFF" opacity="0.9" />
            <rect x="30" y="100" width="140" height="58" rx="20" fill={P.body} />
            <g className="cc-wheels">
              <circle cx="62" cy="160" r="17" fill="#1d1a19" />
              <circle cx="138" cy="160" r="17" fill="#1d1a19" />
              <path d="M62 150v20M52 160h20M138 150v20M128 160h20" stroke="#9AA6B8" strokeWidth="3" />
            </g>
            <rect x="34" y="114" width="14" height="10" rx="4" fill="#FFE27A" />
            <rect x="152" y="114" width="14" height="10" rx="4" fill="#FFE27A" />
          </>
        ),
      };
    case "orb":
    default:
      return {
        face: { cx: 100, cy: 100, gap: 18, r: 5.5, mouthY: 122 },
        top: 52,
        neck: 150,
        draw: (
          <>
            <ellipse className="cc-ring-back" cx="100" cy="104" rx="80" ry="20" fill="none" stroke={P.trim} strokeWidth="6" opacity="0.4" />
            <circle cx="100" cy="100" r="50" fill={P.body} />
            <circle cx="80" cy="80" r="10" fill="#fff" opacity="0.25" />
            <path d="M20 104c0 11 36 20 80 20s80-9 80-20" fill="none" stroke={P.trim} strokeWidth="6" opacity="0.7" />
          </>
        ),
      };
  }
}

function Face({ f, def, P, eyes }) {
  const { cx, cy, gap, r } = f;
  const eyeFill = f.screen ? P.body : "#1d1a19";
  const wink = def.expression === "wink";
  return (
    <>
      {f.big && (
        <>
          <ellipse cx={cx - gap} cy={cy} rx={r * 1.7} ry={r * 2.1} fill="#1d1a19" />
          <ellipse cx={cx + gap} cy={cy} rx={r * 1.7} ry={r * 2.1} fill="#1d1a19" />
        </>
      )}
      <motion.g className="cc-eyes" style={eyes ? { x: eyes.x, y: eyes.y } : undefined}>
        {f.big ? (
          <>
            <circle cx={cx - gap + 2} cy={cy - 3} r={r * 0.6} fill="#fff" />
            <circle cx={cx + gap + 2} cy={cy - 3} r={r * 0.6} fill="#fff" />
          </>
        ) : (
          <>
            <ellipse cx={cx - gap} cy={cy} rx={r} ry={r * 1.2} fill={eyeFill} />
            {wink ? <path d={`M${cx + gap - r - 1} ${cy}q${r + 1} -${r + 2} ${2 * r + 2} 0`} stroke={eyeFill} strokeWidth="3" fill="none" strokeLinecap="round" /> : <ellipse cx={cx + gap} cy={cy} rx={r} ry={r * 1.2} fill={eyeFill} />}
          </>
        )}
      </motion.g>
      {f.snout && <ellipse cx={cx} cy={cy + 20} rx="18" ry="13" fill="#fff" opacity="0.45" />}
      {f.snout && <ellipse cx={cx} cy={cy + 14} rx="6" ry="4.5" fill="#1d1a19" />}
      {f.beak ? (
        <path d={`M${cx - 9} ${cy + 12}h18l-9 12z`} fill="#FFB020" />
      ) : def.expression === "wow" ? (
        <ellipse cx={cx} cy={f.mouthY} rx="5" ry="6.5" fill="#5B3326" />
      ) : def.expression === "grin" ? (
        <path d={`M${cx - 11} ${f.mouthY - 3}h22c0 9-5 14-11 14s-11-5-11-14z`} fill="#5B3326" />
      ) : (
        <path d={`M${cx - 10} ${f.mouthY - 2}c5 6 15 6 20 0`} stroke={f.screen ? P.body : "#5B3326"} strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      {!f.screen && !f.beak && (
        <>
          <circle cx={cx - gap - 8} cy={cy + 14} r="6" fill="#F08A7E" opacity="0.3" />
          <circle cx={cx + gap + 8} cy={cy + 14} r="6" fill="#F08A7E" opacity="0.3" />
        </>
      )}
      {f.whiskers && <path d={`M${cx - 30} ${cy + 16}h-18M${cx - 30} ${cy + 22}l-16 4M${cx + 30} ${cy + 16}h18M${cx + 30} ${cy + 22}l16 4`} stroke="#1d1a19" strokeWidth="2" opacity="0.5" strokeLinecap="round" />}
    </>
  );
}

function Accessory({ kind, f, top, neck, P }) {
  const { cx, cy, gap } = f;
  if (kind === "glasses")
    return (
      <g stroke="#1d1a19" strokeWidth="3" fill="#fff" fillOpacity="0.18">
        <circle cx={cx - gap} cy={cy} r="11" />
        <circle cx={cx + gap} cy={cy} r="11" />
        <path d={`M${cx - gap + 11} ${cy}h${2 * gap - 22}`} />
      </g>
    );
  if (kind === "hat")
    return (
      <g className="cc-hat">
        <rect x={cx - 30} y={top - 4} width="60" height="10" rx="5" fill="#1d1a19" />
        <rect x={cx - 20} y={top - 30} width="40" height="30" rx="6" fill="#1d1a19" />
        <rect x={cx - 20} y={top - 12} width="40" height="6" fill={P.trim === "#1d1a19" ? "#fff" : "#E5484D"} />
      </g>
    );
  if (kind === "headphones")
    return (
      <g>
        <path d={`M${cx - 46} ${cy}c0-44 92-44 92 0`} stroke="#1d1a19" strokeWidth="6" fill="none" />
        <rect x={cx - 54} y={cy - 8} width="14" height="26" rx="6" fill="#1d1a19" />
        <rect x={cx + 40} y={cy - 8} width="14" height="26" rx="6" fill="#1d1a19" />
      </g>
    );
  if (kind === "scarf")
    return (
      <g className="cc-scarf">
        <rect x={cx - 36} y={neck - 6} width="72" height="14" rx="7" fill="#E5484D" />
        <path d={`M${cx + 16} ${neck + 4}l6 26 12-4-6-24z`} fill="#E5484D" />
      </g>
    );
  if (kind === "chef")
    return (
      <g className="cc-hat">
        <path d={`M${cx - 26} ${top - 2}c-14 0-18-22-4-26 2-14 20-18 30-8 10-10 28-6 30 8 14 4 10 26-4 26z`} fill="#fff" stroke="#E2DED8" strokeWidth="2" />
        <rect x={cx - 26} y={top - 8} width="52" height="12" rx="3" fill="#fff" stroke="#E2DED8" strokeWidth="2" />
      </g>
    );
  if (kind === "cap")
    return (
      <g className="cc-hat">
        <path d={`M${cx - 32} ${top + 6}c0-22 14-34 32-34s32 12 32 34z`} fill="#E5484D" />
        <path d={`M${cx + 20} ${top + 2}h30c4 0 4 8 0 8H${cx + 20}z`} fill="#B8333A" />
        <circle cx={cx} cy={top - 26} r="4" fill="#B8333A" />
      </g>
    );
  if (kind === "bow")
    return (
      <g className="cc-scarf">
        <path d={`M${cx} ${neck}l-18-10v20zM${cx} ${neck}l18-10v20z`} fill="#E5484D" />
        <circle cx={cx} cy={neck} r="5" fill="#B8333A" />
      </g>
    );
  if (kind === "crown")
    return (
      <path className="cc-crown" d={`M${cx - 22} ${top + 2}l-2-22 12 10 12-16 12 16 12-10-2 22z`} fill="#F5B301" stroke="#B07D00" strokeWidth="2" strokeLinejoin="round" />
    );
  return null;
}

// A photoreal character from the real-life pack: a cut-out picture that idles like the
// drawn ones, leans toward the pointer when live and sits on a soft contact shadow.
function RealCharacter({ def, size, live, className, label }) {
  const reduce = useReducedMotion();
  const eyes = usePointerEyes(live && !reduce);
  const rotateY = useTransform(eyes.x, (v) => v * 2.2);
  const rotateX = useTransform(eyes.y, (v) => v * -1.6);
  return (
    <span className={`cc cc-real cc-idle-${def.idle} cc-fam-${def.family} ${className}`} style={{ "--cc-size": size + "px" }} role="img" aria-label={label || def.name}>
      <span className="cc-real-shadow" aria-hidden="true" />
      <motion.img className="cc-body" src={def.src} alt="" draggable={false} loading="lazy" decoding="async" style={live ? { rotateY, rotateX } : undefined} />
    </span>
  );
}

export function CastCharacter({ def, size = 160, live = false, className = "", label = "" }) {
  if (def && def.src) return <RealCharacter def={def} size={size} live={live} className={className} label={label} />;
  return <DrawnCharacter def={def} size={size} live={live} className={className} label={label} />;
}

function DrawnCharacter({ def, size, live, className, label }) {
  const reduce = useReducedMotion();
  const eyes = usePointerEyes(live && !reduce);
  if (!def) return null;
  const P = pal(def.palette);
  const b = body(def, P);
  return (
    <svg
      className={`cc cc-idle-${def.idle} cc-fam-${def.family} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={label || def.name}
    >
      <g className="cc-body">
        {b.draw}
        <Face f={b.face} def={def} P={P} eyes={live ? eyes : null} />
        <Accessory kind={def.accessory} f={b.face} top={b.top} neck={b.neck} P={P} />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- Widgets

function Line({ seed = 7 }) {
  const pts = Array.from({ length: 8 }, (_, i) => [i * 14, 34 - (((seed * (i + 3)) % 23) + (i * 2))]);
  const d = "M" + pts.map((p) => p.join(" ")).join(" L");
  return (
    <svg className="cw-line" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} pathLength="1" />
    </svg>
  );
}

function Icon({ d }) {
  return (
    <svg className="cw-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  pin: "M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5",
  play: "M8 5v14l11-7z",
  up: "M12 19V5M6 11l6-6 6 6",
  cal: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4",
  dish: "M3 15h18M5 15a7 7 0 0 1 14 0M12 6v2M2 19h20",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a7 7 0 0 1 14 0v1M16 3.5a4 4 0 0 1 0 7M18 14a6 6 0 0 1 4 6v1",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14 7 22l5-3 5 3-1.5-8",
};

// Fills a widget with the site's own words and numbers.
export function widgetText(kind, ctx) {
  const s0 = ctx.stats[0] || { value: "24", label: "Projects shipped" };
  const s1 = ctx.stats[1] || s0;
  const find = (re) => ctx.stats.find((x) => re.test(String(x.label) + " " + String(x.value)));
  switch (kind) {
    case "stat":
      return { title: s0.label, value: s0.value };
    case "line":
    case "bars":
      return { title: s1.label, value: s1.value };
    case "ring":
      return { title: ctx.stats[2] ? ctx.stats[2].label : "Happy clients", value: "92%" };
    case "chat":
      return { text: ctx.greeting };
    case "rating":
      return { value: ctx.rating || "5.0", title: ctx.ratingLabel || "Loved by clients" };
    case "status":
      return { text: ctx.status || "Available now" };
    case "tags":
      return { items: ctx.tags.slice(0, 4) };
    case "calendar":
      return { title: ctx.calendar || "Book a call", value: "Thu 14" };
    case "music":
      return { title: ctx.tags[0] || "Focus mode", value: ctx.name };
    case "weather":
      return { title: ctx.place || "Your city", value: "24°" };
    case "notify":
      return { title: "New message", text: ctx.notify || "Can we start next week?" };
    case "toggle":
      return { title: ctx.status || "Open for work" };
    case "slider":
      return { title: ctx.tags[1] || "Quality", value: 86 };
    case "avatars":
      return { title: ctx.team || "Trusted by teams" };
    case "code":
      return { text: `ship(${JSON.stringify(ctx.tags[0] || "idea")})` };
    case "pin":
      return { title: ctx.place || "Worldwide" };
    case "clock":
      return { title: ctx.place || "Local time" };
    case "todo":
      return { items: (ctx.steps.length ? ctx.steps : ["Plan", "Build", "Launch"]).slice(0, 3) };
    case "cursor":
      return { title: ctx.first || "You" };
    case "upload":
      return { title: ctx.tags[0] ? ctx.tags[0] + " project" : "New project" };
    case "search":
      return { text: ctx.search || ctx.tags[0] || "Find anything" };
    case "price":
      return { title: ctx.priceLabel || "Starting at", value: ctx.price || "Let's talk" };
    case "quote":
      return { text: ctx.quote || ctx.greeting, title: ctx.quoteBy || ctx.name };
    case "countdown":
      return { title: ctx.countdown || "Next opening" };
    case "appointment":
      return { title: ctx.calendar ? "Next " + String(ctx.calendar).toLowerCase() : "Next free slot", value: "Tue, 10:30" };
    case "menu":
      return { title: ctx.priceLabel || "Today's special", value: ctx.price || ctx.tags[0] || "Chef's choice" };
    case "pulse":
      return { title: s0.label, value: s0.value };
    case "followers": {
      const f = find(/follow|subscri|audience|reader|view/);
      return { title: f ? f.label : "New followers", value: f ? f.value : "+1,240" };
    }
    case "uptime": {
      const f = find(/%|uptime/);
      return { title: f ? f.label : "Uptime", value: f ? f.value : "99.9%" };
    }
    case "growth": {
      const f = find(/\+|growth|revenue|increase|up /);
      return { title: f ? f.label : s1.label, value: f ? f.value : s1.value };
    }
    case "badge":
    default:
      return { title: ctx.award || "Top rated", value: ctx.awardYear || String(new Date().getFullYear()) };
  }
}

function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return <strong className="cw-value pf-mono">{t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>;
}

function Count() {
  const [s, setS] = useState(5 * 3600 + 23 * 60 + 9);
  useEffect(() => {
    const i = setInterval(() => setS((x) => (x > 0 ? x - 1 : 5 * 3600)), 1000);
    return () => clearInterval(i);
  }, []);
  const p = (n) => String(n).padStart(2, "0");
  return <strong className="cw-value pf-mono">{`${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`}</strong>;
}

// On a live site every widget can be used: switches switch, sliders slide, stars can be
// set, to-dos ticked, music paused, chats answered. Anything else gives a small pop.
const REPLIES = ["Sure! What day suits you?", "Perfect, you're booked in.", "Thanks! Talk soon."];

function useLiveWidget(live, k, t) {
  const ref = useRef(null);
  const [user, setUser] = useState(false);
  const [on, setOn] = useState(false);
  const [level, setLevel] = useState(k === "rating" ? 5 : 0.86);
  const [done, setDone] = useState([]);
  const [msg, setMsg] = useState(0);
  const [bump, setBump] = useState(0);
  const drag = useRef(false);
  if (!live) return { props: {}, state: null };
  const fromX = (e) => {
    const tr = ref.current && ref.current.querySelector(".cw-track");
    if (!tr) return;
    const r = tr.getBoundingClientRect();
    setLevel(Math.max(0.04, Math.min(1, (e.clientX - r.left) / r.width)));
  };
  const act = (e) => {
    setUser(true);
    setBump((n) => n + 1);
    if (k === "toggle" || k === "music" || k === "followers") setOn((v) => !v);
    else if (k === "rating") {
      const star = e && e.target.closest && e.target.closest(".cw-stars span");
      const i = star ? [...star.parentNode.children].indexOf(star) : -1;
      if (i >= 0) setLevel(i + 1);
    } else if (k === "todo") {
      const li = e && e.target.closest && e.target.closest("li");
      const i = li ? [...li.parentNode.children].indexOf(li) : done.length % Math.max(1, t.items.length);
      setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
    } else if (k === "chat") setMsg((m) => (m + 1) % (REPLIES.length + 1));
  };
  const props = {
    ref,
    role: k === "toggle" ? "switch" : "button",
    tabIndex: 0,
    "aria-checked": k === "toggle" ? on : undefined,
    "aria-pressed": k === "music" || k === "followers" ? on : undefined,
    "aria-label": k === "music" ? (on ? "Play" : "Pause") : undefined,
    "data-on": on ? "1" : undefined,
    style: { "--lv": level },
    onClick: (e) => {
      if (drag.current) return;
      act(e);
    },
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        act(null);
      }
      if ((k === "slider" || k === "upload") && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        setUser(true);
        setLevel((v) => Math.max(0.04, Math.min(1, v + (e.key === "ArrowRight" ? 0.1 : -0.1))));
      }
    },
    onPointerDown: (e) => {
      if (k !== "slider" && k !== "upload") return;
      e.stopPropagation();
      drag.current = false;
      setUser(true);
      fromX(e);
      e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      if ((k === "slider" || k === "upload") && e.buttons) {
        drag.current = true;
        fromX(e);
      }
    },
    onPointerUp: () => setTimeout(() => (drag.current = false), 0),
  };
  return { props, state: { user, on, level, done, msg, bump } };
}

export function CastWidget({ def, ctx, className = "", live = false }) {
  const k = def ? def.kind : "";
  const t0 = def ? widgetText(k, ctx) : null;
  const L = useLiveWidget(live && !!def, k, t0 || {});
  if (!def) return null;
  const st = L.state;
  const t = st && k === "chat" && st.msg > 0 ? { ...t0, text: REPLIES[st.msg - 1] } : t0;
  return (
    <div {...L.props} className={`cw cw-k-${k} cw-skin-${def.skin} ${className}${live ? " cw-live" : ""}${st && st.user ? " is-user" : ""}`}>
      {st && st.bump > 0 && <span key={st.bump} className="cw-burst" aria-hidden="true" />}
      {k === "stat" && (
        <>
          <span className="cw-title">{t.title}</span>
          <strong className="cw-value cw-pop">{t.value}</strong>
        </>
      )}
      {k === "line" && (
        <>
          <span className="cw-title">{t.title}</span>
          <strong className="cw-value">{t.value}</strong>
          <Line seed={String(t.title).length + 5} />
        </>
      )}
      {k === "bars" && (
        <>
          <span className="cw-title">{t.title}</span>
          <div className="cw-bars">
            {[40, 70, 52, 88, 64, 96].map((h, i) => (
              <span key={i} style={{ height: h + "%", animationDelay: i * 0.12 + "s" }} />
            ))}
          </div>
        </>
      )}
      {k === "ring" && (
        <div className="cw-row">
          <svg className="cw-ring" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="16" className="cw-ring-bg" />
            <circle cx="20" cy="20" r="16" className="cw-ring-fg" pathLength="100" />
          </svg>
          <div>
            <strong className="cw-value">{t.value}</strong>
            <span className="cw-title">{t.title}</span>
          </div>
        </div>
      )}
      {k === "chat" && (
        <p className="cw-chat">
          <span className="cw-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="cw-chat-text" key={st ? st.msg : 0}>{t.text}</span>
        </p>
      )}
      {k === "rating" && (
        <>
          <span className="cw-stars" aria-label={t.value + " stars"}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={st && st.user && i < st.level ? "is-lit" : ""} style={{ animationDelay: i * 0.1 + "s" }}>★</span>
            ))}
          </span>
          <span className="cw-title">
            {st && st.user ? st.level + ".0" : t.value} · {t.title}
          </span>
        </>
      )}
      {k === "status" && (
        <span className="cw-row cw-strong">
          <span className="cw-pulse" />
          {t.text}
        </span>
      )}
      {k === "tags" && (
        <span className="cw-tags">
          {t.items.map((x, i) => (
            <span key={x} style={{ animationDelay: i * 0.15 + "s" }}>
              {x}
            </span>
          ))}
        </span>
      )}
      {k === "calendar" && (
        <div className="cw-row">
          <span className="cw-cal">
            <b>NOV</b>
            <i>{t.value.split(" ")[1]}</i>
          </span>
          <div>
            <span className="cw-title">{t.value.split(" ")[0]}, 10:00</span>
            <strong className="cw-strong">{t.title}</strong>
          </div>
        </div>
      )}
      {k === "music" && (
        <div className="cw-row">
          <span className="cw-art">
            <Icon d={ICONS.play} />
          </span>
          <div className="cw-grow">
            <strong className="cw-strong">{t.title}</strong>
            <span className="cw-title">{t.value}</span>
          </div>
          <span className="cw-eq">
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
      )}
      {k === "weather" && (
        <div className="cw-row">
          <span className="cw-sun">
            <Icon d={ICONS.sun} />
          </span>
          <div>
            <strong className="cw-value">{t.value}</strong>
            <span className="cw-title">{t.title}</span>
          </div>
        </div>
      )}
      {k === "notify" && (
        <div className="cw-row cw-slide">
          <span className="cw-art cw-bell">
            <Icon d={ICONS.bell} />
          </span>
          <div className="cw-grow">
            <strong className="cw-strong">{t.title}</strong>
            <span className="cw-title">{t.text}</span>
          </div>
        </div>
      )}
      {k === "toggle" && (
        <div className="cw-row cw-between">
          <strong className="cw-strong">{t.title}</strong>
          <span className="cw-switch">
            <i />
          </span>
        </div>
      )}
      {k === "slider" && (
        <>
          <span className="cw-title">{t.title}</span>
          <span className="cw-track">
            <i />
          </span>
        </>
      )}
      {k === "avatars" && (
        <>
          <span className="cw-faces">
            {["A", "M", "S", "R", "+"].map((x, i) => (
              <i key={i} style={{ animationDelay: i * 0.12 + "s" }}>
                {x}
              </i>
            ))}
          </span>
          <span className="cw-title">{t.title}</span>
        </>
      )}
      {k === "code" && (
        <pre className="cw-code">
          <span className="cw-code-k">const</span> next = <span className="cw-type">{t.text}</span>
          <span className="cw-caret" />
        </pre>
      )}
      {k === "pin" && (
        <div className="cw-row">
          <span className="cw-art cw-pin">
            <Icon d={ICONS.pin} />
          </span>
          <strong className="cw-strong">{t.title}</strong>
        </div>
      )}
      {k === "clock" && (
        <>
          <span className="cw-title">{t.title}</span>
          <Clock />
        </>
      )}
      {k === "todo" && (
        <ul className="cw-todo">
          {t.items.map((x, i) => (
            <li key={i} className={st && st.done.includes(i) ? "is-done" : ""} style={{ animationDelay: 0.4 + i * 0.5 + "s" }}>
              <span />
              {x}
            </li>
          ))}
        </ul>
      )}
      {k === "cursor" && (
        <div className="cw-cursor-box">
          <span className="cw-cursor">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 3l7 18 2.5-7.5L21 11z" />
            </svg>
            <b>{t.title}</b>
          </span>
        </div>
      )}
      {k === "upload" && (
        <>
          <div className="cw-row cw-between">
            <strong className="cw-strong">{t.title}</strong>
            <Icon d={ICONS.up} />
          </div>
          <span className="cw-track cw-progress">
            <i />
          </span>
        </>
      )}
      {k === "search" && (
        <div className="cw-row cw-search">
          <Icon d={ICONS.search} />
          <span className="cw-type">{t.text}</span>
          <span className="cw-caret" />
        </div>
      )}
      {k === "price" && (
        <>
          <span className="cw-title">{t.title}</span>
          <strong className="cw-value cw-pop">{t.value}</strong>
        </>
      )}
      {k === "quote" && (
        <>
          <p className="cw-quote">“{t.text}”</p>
          <span className="cw-title">{t.title}</span>
        </>
      )}
      {k === "countdown" && (
        <>
          <span className="cw-title">{t.title}</span>
          <Count />
        </>
      )}
      {k === "appointment" && (
        <div className="cw-row">
          <span className="cw-art">
            <Icon d={ICONS.cal} />
          </span>
          <div className="cw-grow">
            <span className="cw-title">{t.title}</span>
            <strong className="cw-strong">{t.value}</strong>
          </div>
          <span className="cw-pulse" />
        </div>
      )}
      {k === "menu" && (
        <div className="cw-row">
          <span className="cw-art cw-steam">
            <Icon d={ICONS.dish} />
          </span>
          <div className="cw-grow">
            <span className="cw-title">{t.title}</span>
            <strong className="cw-value cw-pop">{t.value}</strong>
          </div>
        </div>
      )}
      {k === "pulse" && (
        <>
          <div className="cw-row cw-between">
            <span className="cw-title">{t.title}</span>
            <span className="cw-heart">♥</span>
          </div>
          <strong className="cw-value">{t.value}</strong>
          <svg className="cw-ecg" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 15h30l6-10 8 22 6-18 4 6h66" pathLength="1" />
          </svg>
        </>
      )}
      {k === "followers" && (
        <div className="cw-row">
          <span className="cw-art">
            <Icon d={ICONS.users} />
          </span>
          <div>
            <strong className="cw-value cw-tick">{t.value}</strong>
            <span className="cw-title">{st && st.on ? "You followed" : t.title}</span>
          </div>
        </div>
      )}
      {k === "uptime" && (
        <>
          <div className="cw-row cw-between">
            <span className="cw-title">{t.title}</span>
            <strong className="cw-strong">{t.value}</strong>
          </div>
          <span className="cw-uptime">
            {Array.from({ length: 24 }, (_, i) => (
              <i key={i} className={i === 17 ? "is-warn" : ""} style={{ animationDelay: i * 0.06 + "s" }} />
            ))}
          </span>
        </>
      )}
      {k === "growth" && (
        <div className="cw-row">
          <div className="cw-grow">
            <span className="cw-title">{t.title}</span>
            <strong className="cw-value">{t.value}</strong>
          </div>
          <span className="cw-art cw-trend">
            <Icon d={ICONS.trend} />
          </span>
        </div>
      )}
      {k === "badge" && (
        <div className="cw-row">
          <span className="cw-art cw-award">
            <Icon d={ICONS.award} />
          </span>
          <div>
            <strong className="cw-strong">{t.title}</strong>
            <span className="cw-title">{t.value}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Site pieces built around the cast

// Collects what the widgets say from the site's content.
export function castContext(kind, c) {
  if (kind === "portfolio") {
    const h = c.hero || {};
    const first = (h.name || "").split(" ")[0];
    const tags = (c.skills || []).flatMap((g) => g.items || []);
    return {
      name: h.name || "",
      first,
      place: h.location || "",
      status: h.availability || "",
      greeting: first ? `Hi, I'm ${first}. ${h.role ? h.role + "." : ""}` : "Hi there!",
      stats: (c.stats || []).map((s) => ({ value: (s.value ?? "") + (s.suffix || ""), label: s.label })),
      tags,
      steps: (c.process || []).map((x) => x.title),
      quote: c.testimonials && c.testimonials[0] ? c.testimonials[0].quote : "",
      quoteBy: c.testimonials && c.testimonials[0] ? c.testimonials[0].name : "",
      price: c.services && c.services[0] && c.services[0].price,
      priceLabel: c.services && c.services[0] && c.services[0].name,
      award: c.awards && c.awards[0] && c.awards[0].name,
      awardYear: c.awards && c.awards[0] && c.awards[0].year,
      calendar: "Intro call",
      notify: "Loved your work. Are you free next week?",
      team: (c.experience || []).length ? "Worked with " + c.experience.length + " teams" : "",
      search: tags[0],
    };
  }
  const hl = c.highlights || [];
  const rating = hl.find((x) => /rating|stars|review/i.test(x.label));
  const open = c.visit && c.visit.hours && c.visit.hours[0];
  const place = c.visit && c.visit.address ? c.visit.address.split(",").slice(-1)[0].trim() : "";
  return {
    name: c.brand ? c.brand.name : "",
    first: c.brand ? c.brand.name : "",
    place,
    status: open ? `Open ${open.days}` : "Open today",
    greeting: `Hi! ${c.hero && c.hero.primaryCta ? c.hero.primaryCta + " in one tap." : "Message us any time."}`,
    stats: hl.filter((x) => x !== rating).map((x) => ({ value: x.value, label: x.label })),
    rating: rating ? rating.value : "",
    ratingLabel: rating ? rating.label : "",
    tags: (c.services || []).map((x) => x.name),
    steps: (c.process || []).map((x) => x.title),
    quote: c.testimonials && c.testimonials[0] ? c.testimonials[0].quote : "",
    quoteBy: c.testimonials && c.testimonials[0] ? c.testimonials[0].name : "",
    price: c.services && (c.services.find((x) => x.price) || {}).price,
    priceLabel: c.services && (c.services.find((x) => x.price) || {}).name,
    calendar: c.hero && c.hero.primaryCta,
    notify: "Do you have space this weekend?",
    team: (c.team || []).length ? `${c.team.length} people on the team` : "",
    countdown: open ? `Opens ${open.time.split(" to ")[0] || "soon"}` : "",
  };
}

// Tap or click the character: it hops and throws a few sparkles.
export function Poke({ children, className = "" }) {
  const [hop, setHop] = useState(0);
  const [sparks, setSparks] = useState([]);
  const reduce = useReducedMotion();
  const go = (e) => {
    setHop((n) => n + 1);
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX ? e.clientX - r.left : r.width / 2;
    const y = e.clientY ? e.clientY - r.top : r.height / 3;
    const id = Date.now();
    setSparks((s) => [...s.slice(-12), ...Array.from({ length: 7 }, (_, i) => ({ id: id + "-" + i, x, y, dx: Math.cos((i / 7) * Math.PI * 2) * (40 + Math.random() * 30), dy: Math.sin((i / 7) * Math.PI * 2) * (40 + Math.random() * 30) }))]);
    setTimeout(() => setSparks((s) => s.filter((p) => !String(p.id).startsWith(id + "-"))), 800);
  };
  return (
    <div
      className={"cs-poke " + className}
      role="button"
      tabIndex={0}
      aria-label="Say hello"
      onClick={go}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), go(e))}
    >
      <div key={hop} className={hop ? "cc-hop" : ""}>
        {children}
      </div>
      {sparks.map((p) => (
        <span key={p.id} className="cc-sparkle" style={{ left: p.x - 5, top: p.y - 5, "--dx": p.dx + "px", "--dy": p.dy + "px" }} />
      ))}
    </div>
  );
}

const SPOTS = [
  { left: "-6%", top: "6%", depth: 18 },
  { right: "-8%", top: "20%", depth: -24 },
  { left: "-10%", bottom: "14%", depth: -14 },
  { right: "-4%", bottom: "2%", depth: 22 },
];

function usePointer() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 100, damping: 20 });
  const sy = useSpring(y, { stiffness: 100, damping: 20 });
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const on = (e) => {
      x.set((e.clientX / window.innerWidth) * 2 - 1);
      y.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, [x, y]);
  return { x: sx, y: sy };
}

function Floating({ def, ctx, spot, i, p, still }) {
  const x = useTransform(p.x, (v) => v * spot.depth);
  const y = useTransform(p.y, (v) => v * spot.depth * 0.6);
  const { depth, ...pos } = spot;
  return (
    <motion.div className={"cs-float cs-float-" + i} style={{ ...pos, x, y }}>
      <motion.div
        className={still ? "" : "cs-drag"}
        initial={still ? false : { opacity: 0, scale: 0.85, y: 20, filter: "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        transition={{ type: "spring", visualDuration: 0.6, bounce: 0.28, delay: 0.5 + i * 0.14 }}
        drag={!still && def.kind !== "slider" && def.kind !== "upload"}
        dragSnapToOrigin
        dragElastic={0.5}
        dragTransition={{ bounceStiffness: 300, bounceDamping: 18 }}
        whileDrag={{ scale: 1.06, rotate: i % 2 ? 3 : -3, zIndex: 5 }}
      >
        <div className="cs-bob" style={{ animationDuration: 4.4 + i * 0.7 + "s", animationDelay: -i * 0.9 + "s" }}>
          <CastWidget def={def} ctx={ctx} live={!still} />
        </div>
      </motion.div>
    </motion.div>
  );
}

// Opening section centrepiece: the chosen character with the first four chosen widgets.
export function CastStage({ character, widgets, ctx, still }) {
  const reduce = useReducedMotion() || still;
  const p = usePointer();
  return (
    <div className="pf-stage cs-stage">
      <div className="pf-stage-ring">
        <span className="pf-stage-dot" />
      </div>
      <motion.div
        className="cs-hero-char"
        initial={reduce ? false : { opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", visualDuration: 0.8, bounce: 0.3, delay: 0.15 }}
      >
        <Poke>
          <CastCharacter def={character} size={300} live={!reduce} />
        </Poke>
      </motion.div>
      {widgets.slice(0, 4).map((w, i) => (
        <Floating key={w.id + i} def={w} ctx={ctx} spot={SPOTS[i]} i={i} p={p} still={reduce} />
      ))}
    </div>
  );
}

// A pinned scroll story: the character stays in view and turns, grows and moves while
// each chosen widget and a line of the site's own text arrive in turn.
export function CastStory({ character, widgets, ctx, steps, title }) {
  const ref = useRef(null);
  const progress = useMotionValue(0);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const n = Math.max(1, steps.length);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scroller = el.closest("[data-scroll-root]");
    const target = scroller || window;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = scroller ? scroller.getBoundingClientRect().height : window.innerHeight;
      const top = scroller ? r.top - scroller.getBoundingClientRect().top : r.top;
      const total = r.height - vh;
      const pr = total > 0 ? Math.min(1, Math.max(0, -top / total)) : 0;
      progress.set(pr);
      setActive(Math.min(n - 1, Math.floor(pr * n * 0.999)));
    };
    update();
    target.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      target.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [n, progress]);
  const rotate = useTransform(progress, [0, 1], reduce ? [0, 0] : [-8, 8]);
  const scale = useTransform(progress, [0, 0.5, 1], reduce ? [1, 1, 1] : [0.9, 1.08, 0.95]);
  const x = useTransform(progress, [0, 1], reduce ? ["0%", "0%"] : ["-6%", "6%"]);
  const bar = useTransform(progress, [0, 1], [0, 1]);
  return (
    <section id="pf-story" className="cs-story" ref={ref} style={{ height: `${Math.max(2, n) * 70 + 40}vh` }} aria-label={title}>
      <div className="cs-story-pin">
        <div className="pf-container cs-story-grid">
          <div className="cs-story-text">
            <p className="pf-kicker">{title}</p>
            <div className="cs-story-steps">
              {steps.map((s, i) => (
                <motion.div
                  key={i}
                  className={"cs-step" + (i === active ? " is-on" : "")}
                  animate={{ opacity: i === active ? 1 : 0.28, x: i === active ? 0 : -6 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="pf-mono pf-quiet">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="pf-h3">{s.title}</h3>
                  {s.text && <p className="pf-muted">{s.text}</p>}
                </motion.div>
              ))}
            </div>
            <div className="cs-story-bar">
              <motion.i style={{ scaleX: bar }} />
            </div>
          </div>
          <div className="cs-story-visual">
            <motion.div style={{ rotate, scale, x }} className="cs-story-char">
              <Poke>
                <CastCharacter def={character} size={320} live={!reduce} />
              </Poke>
            </motion.div>
            {widgets.length > 0 && (
              <motion.div
                key={active}
                className="cs-story-widget"
                initial={reduce ? false : { opacity: 0, y: 30, scale: 0.9, rotate: -4 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                transition={{ type: "spring", visualDuration: 0.5, bounce: 0.3 }}
              >
                <CastWidget def={widgets[active % widgets.length]} ctx={ctx} live />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// The character peeks up from the bottom edge of a section and waves.
export function Peek({ character }) {
  if (!character) return null;
  return (
    <motion.div
      className="cs-peek"
      aria-hidden="true"
      initial={{ y: "70%" }}
      whileInView={{ y: "16%" }}
      viewport={{ once: false, amount: "some" }}
      transition={{ type: "spring", visualDuration: 0.7, bounce: 0.35 }}
    >
      <CastCharacter def={character} size={120} />
    </motion.div>
  );
}

// The rest of the chosen widgets as a live wall.
export function WidgetWall({ widgets, ctx }) {
  if (!widgets.length) return null;
  return (
    <section id="pf-tiles" className="pf-section">
      <div className="pf-container">
        <div className="cs-wall">
          {widgets.map((w, i) => (
            <motion.div
              key={w.id + i}
              className="cs-wall-item"
              data-tilt=""
              initial={{ opacity: 0, y: 26, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ type: "spring", visualDuration: 0.6, bounce: 0.2, delay: i * 0.07 }}
            >
              <CastWidget def={w} ctx={ctx} live />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
