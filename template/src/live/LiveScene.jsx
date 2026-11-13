// React wrapper for the living scenes. A full scene runs its own WebGL canvas; picker
// thumbnails share one renderer that paints a still for each (browsers allow only a few
// WebGL canvases at once) and come alive while the pointer is over them.
import { useEffect, useRef, useState } from "react";
import { mountLive, canMount } from "./stage.js";
import { resolve } from "./catalog.js";

function cssColor(el, name, fb) {
  try {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    if (!v) return fb;
    // Turn any CSS colour (oklch, color-mix...) into hex through a 1px canvas.
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#000";
    g.fillStyle = v;
    g.fillRect(0, 0, 1, 1);
    const [r, gg, b] = g.getImageData(0, 0, 1, 1).data;
    return "#" + [r, gg, b].map((n) => n.toString(16).padStart(2, "0")).join("");
  } catch {
    return fb;
  }
}
export function themeOf(el) {
  return { bg: cssColor(el, "--pf-bg", "#0d1117"), accent: cssColor(el, "--pf-accent", "#4f8cff"), text: cssColor(el, "--pf-text", "#f2f4f8") };
}

// A soft gradient in the scene's colours, shown before WebGL starts or where it cannot run.
function fallbackStyle(sc) {
  if (!sc || !sc.envColors) return { background: "#0d2238" };
  const c = (v) => `rgb(${v.map((x) => Math.round(x * 255)).join(",")})`;
  const [a, b, d] = sc.envColors;
  return sc.env === "deep" ? { background: `linear-gradient(180deg, ${c(a)} 0%, ${c(b)} 45%, ${c(d)} 100%)` } : { background: `linear-gradient(180deg, ${c(a)} 0%, ${c(b)} 70%, ${c(d)} 100%)` };
}

/** A running scene that fills its parent. */
export function LiveScene({ scene, look = "real", opts, className = "" }) {
  const ref = useRef(null);
  const key = JSON.stringify(opts || {});
  const [failed, setFailed] = useState(false);
  const [sc, setSc] = useState(() => resolve(scene, look, opts || {}));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const def = resolve(scene, look, opts || {}, themeOf(el));
    setSc(def);
    if (!def) return;
    let stage = null;
    const go = () => {
      stage = mountLive(el, def, { onFail: () => setFailed(true) });
      if (!stage) setFailed(true);
      else setFailed(false);
    };
    // Wait until it is near the screen before taking a WebGL canvas.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !stage) {
          go();
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stage && stage.destroy();
    };
  }, [scene, look, key]);
  return <div ref={ref} className={"lv " + className + (failed ? " lv-still" : "")} style={fallbackStyle(sc)} data-live={scene} />;
}

// ---------------------------------------------------------------- thumbnails
const stills = new Map();
const queue = [];
let busy = false;
function pump() {
  if (busy || !queue.length) return;
  const job = queue.shift();
  if (stills.has(job.key)) {
    job.done(stills.get(job.key));
    return pump();
  }
  busy = true;
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${job.w}px;height:${job.h}px;overflow:hidden;pointer-events:none`;
  document.body.appendChild(host);
  let url = "";
  try {
    const st = canMount() ? mountLive(host, job.def, { still: true }) : null;
    if (st) {
      st.settle(job.def.actors && job.def.actors.some((a) => a.act === "perch") ? 9 : 7);
      url = st.canvas.toDataURL("image/jpeg", 0.82);
      st.destroy();
    }
  } catch {
    url = "";
  }
  host.remove();
  stills.set(job.key, url);
  busy = false;
  job.done(url);
  setTimeout(pump, 16);
}
function stillOf(def, key, w, h) {
  return new Promise((done) => {
    if (stills.has(key)) return done(stills.get(key));
    queue.push({ def, key, w, h, done });
    pump();
  });
}

/** A picker thumbnail: a still picture of the scene, live while hovered or focused. */
export function LiveThumb({ scene, look = "real", opts, className = "" }) {
  const ref = useRef(null);
  const [url, setUrl] = useState("");
  const [live, setLive] = useState(false);
  const key = scene + "|" + look + "|" + JSON.stringify(opts || {});
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let off = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const def = resolve(scene, look, opts || {}, themeOf(el));
        if (!def) return;
        const r = el.getBoundingClientRect();
        const w = Math.max(160, Math.min(480, Math.round(r.width))) || 320;
        const h = Math.round(w * Math.max(0.4, Math.min(1.2, r.height / Math.max(1, r.width) || 0.56)));
        stillOf(def, key + "|" + w + "x" + h, w, h).then((u) => !off && setUrl(u));
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    // Come alive on hover (real pointers only), stop when the pointer leaves.
    const fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const card = el.closest("button, a, [role=button], .lv-hover") || el;
    const on = () => fine && setLive(true);
    const offf = () => setLive(false);
    card.addEventListener("pointerenter", on);
    card.addEventListener("pointerleave", offf);
    return () => {
      off = true;
      io.disconnect();
      card.removeEventListener("pointerenter", on);
      card.removeEventListener("pointerleave", offf);
    };
  }, [key]);
  const sc = resolve(scene, look, opts || {});
  return (
    <div ref={ref} className={"lv lv-thumb " + className} style={fallbackStyle(sc)} data-live={scene}>
      {url ? <img src={url} alt="" draggable={false} /> : null}
      {live ? <LiveScene scene={scene} look={look} opts={opts} className="lv-over" /> : null}
    </div>
  );
}
