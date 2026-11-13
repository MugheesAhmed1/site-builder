import { Component, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { readColors, stepInput, useInput } from "./kit.jsx";
import { Orb } from "./orb.jsx";
import { Crystals } from "./crystals.jsx";
import { Terrain } from "./terrain.jsx";
import { Galaxy } from "./galaxy.jsx";
import { Ribbons } from "./ribbons.jsx";
import { Knot } from "./knot.jsx";
import { NameBlocks } from "./name.jsx";
import { Blocks } from "./blocks.jsx";

// Real 3D scenes drawn with three.js through react-three-fiber. Scenes.jsx loads this file
// lazily, so pages without a 3D scene never download three.js. Each scene follows the
// pointer, reacts to taps and moves with scroll, pauses when off screen and shows one still
// frame for people who prefer reduced motion. Small tiles in a picker show a still poster
// (rendered once, then the WebGL context is handed back) and come alive on hover, because
// browsers only allow a handful of live WebGL canvases on a page.

export const THREE_SCENES = {
  orb: { C: Orb, camera: [0, 0, 6] },
  crystals: { C: Crystals, camera: [0, 0, 8] },
  terrain: { C: Terrain, camera: [0, 1.5, 5], fov: 55 },
  galaxy: { C: Galaxy, camera: [0, 0, 7] },
  ribbons: { C: Ribbons, camera: [0, 0, 7] },
  knot: { C: Knot, camera: [0, 0, 6.5] },
  name3d: { C: NameBlocks, camera: [0, 0, 8] },
  blocks: { C: Blocks, camera: [8, 8.5, 8], fov: 30 },
};

let webgl = null;
function hasWebGL() {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return webgl;
}

// Posters are made one at a time, so a picker full of tiles never holds many contexts.
const posters = new Map();
const queue = [];
let busy = false;
function take(fn) {
  queue.push(fn);
  pump();
}
function pump() {
  if (busy || !queue.length) return;
  busy = true;
  let once = false;
  queue.shift()(() => {
    if (once) return;
    once = true;
    busy = false;
    setTimeout(pump, 30);
  });
}

class Guard extends Component {
  constructor(p) {
    super(p);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Still() {
  return <div className="sc3-still" aria-hidden="true" />;
}

// Runs every scene's input step once per frame, and pauses the loop off screen.
function Driver({ input, visible, reduce }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    setFrameloop(reduce ? "demand" : visible ? "always" : "never");
    if (reduce) invalidate();
  }, [visible, reduce, setFrameloop, invalidate]);
  useFrame((_, dt) => stepInput(input.current, Math.min(dt, 0.05)));
  return null;
}

// Grabs one frame once the scene has settled, then gives the poster back.
function Snap({ onShot }) {
  const gl = useThree((s) => s.gl);
  const n = useRef(0);
  useFrame(() => {
    n.current += 1;
    if (n.current === 14) {
      let url = "";
      try {
        url = gl.domElement.toDataURL("image/webp", 0.82);
      } catch {
        url = "";
      }
      onShot(url);
    }
  });
  return null;
}

/** @param {{ type: string, palette?: string, colors?: string[], text?: string, words?: string[], thumb?: boolean, opts?: Record<string, any> }} props */
export default function ThreeScene({ type, palette = "brand", colors, text = "", words = [], thumb = false, opts = {} }) {
  const wrap = useRef(null);
  const input = useInput(wrap);
  const [ready, setReady] = useState(false);
  const [look, setLook] = useState(null);
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [poster, setPoster] = useState("");
  const [shooting, setShooting] = useState(false);
  const release = useRef(null);
  const def = THREE_SCENES[type] || THREE_SCENES.orb;
  const fixed = (colors || []).join(",");
  // Settings from the scene panel (see SCENE_OPTIONS in scenes.js).
  const tint = typeof opts.tint === "string" ? opts.tint : "";
  const side = typeof opts.side === "string" ? opts.side : "right";
  input.current.speed = Math.max(0.1, Math.min(3, Number(opts.speed) || 1));

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    setReady(hasWebGL());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onMq = () => setReduce(mq.matches);
    mq.addEventListener?.("change", onMq);
    // The page's colours change with the light or dark switch, so check now and then.
    let last = "";
    const read = () => {
      const c = readColors(el, palette, fixed ? fixed.split(",") : null, tint);
      if (c.key !== last) {
        last = c.key;
        setLook(c);
      }
    };
    read();
    const timer = setInterval(read, 1200);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => {
      clearInterval(timer);
      io.disconnect();
      mq.removeEventListener?.("change", onMq);
    };
  }, [palette, fixed, tint]);

  const key = look ? [type, look.key, text, (words || []).join("|")].join("/") : "";
  useEffect(() => {
    if (!thumb || !ready || !look || !visible) return;
    if (posters.has(key)) {
      setPoster(posters.get(key));
      return;
    }
    let live = true;
    take((done) => {
      if (!live) return done();
      release.current = done;
      setShooting(true);
    });
    return () => {
      live = false;
      if (release.current) release.current();
      release.current = null;
      setShooting(false);
    };
  }, [thumb, ready, look, visible, key]);

  const shot = (url) => {
    if (url) posters.set(key, url);
    setPoster(url);
    setShooting(false);
    // The queue moves on once this canvas has gone and handed its context back.
    const r = release.current;
    release.current = null;
    if (r) r();
  };

  // Tiles: a still poster until hovered. Full scenes: live while on screen.
  const live = ready && look && (thumb ? (hover && !reduce) || shooting : true);
  const S = def.C;
  return (
    <div
      ref={wrap}
      className={"sc3 sc3-" + type + (look && look.dark ? " is-dark" : "")}
      onPointerEnter={thumb ? () => setHover(true) : undefined}
      onPointerLeave={thumb ? () => setHover(false) : undefined}
    >
      {!live && (poster ? <img className="sc3-poster" src={poster} alt="" draggable={false} /> : <Still />)}
      {live && (
        <Guard fallback={<Still />}>
          <Canvas
            key={shooting ? "shot" : "live"}
            className="sc3-canvas"
            flat
            dpr={thumb ? [1, 1.25] : [1, 1.75]}
            gl={{ alpha: true, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: shooting }}
            camera={{ position: def.camera, fov: def.fov || 45, near: 0.1, far: 80 }}
            frameloop={reduce && !shooting ? "demand" : "always"}
            aria-hidden="true"
          >
            <Driver input={input} visible={visible || shooting} reduce={reduce && !shooting} />
            <S input={input} look={look} text={text} words={words} thumb={thumb} reduce={reduce} side={side} />
            {shooting && <Snap onShot={shot} />}
          </Canvas>
        </Guard>
      )}
    </div>
  );
}
