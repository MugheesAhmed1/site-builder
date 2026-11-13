import { useEffect, useRef } from "react";
import { Color, SRGBColorSpace } from "three";

// Shared pieces for the three.js scenes: the site's colours as THREE colours, one input
// object fed by window listeners (the words sit on top of the canvas, so it never gets
// pointer events of its own), scroll progress and a little maths.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const damp = (cur, to, k, dt) => cur + (to - cur) * (1 - Math.exp(-k * dt));

// A seeded random, so posters and live scenes start from the same layout.
export function seeded(seed = 7) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

let probe = null;
function cssColor(el, value, fallback) {
  const v = (value || "").trim() || fallback;
  try {
    if (!probe) {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      probe = cv.getContext("2d", { willReadFrequently: true });
    }
    // Resolve var() and color-mix() through the page, then paint one pixel and read it.
    const span = document.createElement("span");
    span.style.color = v;
    el.appendChild(span);
    const computed = getComputedStyle(span).color;
    span.remove();
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = fallback;
    probe.fillStyle = computed;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return new Color().setRGB(d[0] / 255, d[1] / 255, d[2] / 255, SRGBColorSpace);
  } catch {
    return new Color(fallback);
  }
}

// The three scene colours (a, b, c) plus the page background and text, so a scene can tell
// a light page from a dark one and blend into it.
// `fixed` is the palette's own three colours, if it has them (Forest, Ocean...); `tint`
// is a main colour picked in the scene's settings.
export function readColors(el, palette, fixed, tint) {
  const cs = getComputedStyle(el);
  const get = (n, fb) => cssColor(el, cs.getPropertyValue(n), fb);
  const bg = get("--pf-bg", "#ffffff");
  const text = get("--pf-text", "#1d1a19");
  const muted = get("--pf-muted", "#6b6560");
  const accent = get("--pf-accent", "#2f5bea");
  let a, b, c;
  if (fixed && fixed.length >= 3) [a, b, c] = fixed.map((x) => new Color(x));
  else if (palette === "mono") [a, b, c] = [text.clone(), muted.clone(), text.clone().lerp(bg, 0.5)];
  else [a, b, c] = [accent.clone(), accent.clone().lerp(new Color("#ffffff"), 0.5), accent.clone().lerp(muted, 0.6)];
  if (tint) a = cssColor(el, tint, "#2f5bea");
  // Colours are in three's linear working space; shaders end with colorspace_fragment.
  const lum = bg.r * 0.2126 + bg.g * 0.7152 + bg.b * 0.0722;
  const font = cs.getPropertyValue("--pf-font-display").trim() || "system-ui, sans-serif";
  return { a, b, c, bg, text, font, dark: lum < 0.2, key: [a, b, c, bg].map((x) => x.getHexString()).join("") + font };
}

// One input object per scene. Coordinates run -1..1 across the scene box (y up), so a
// scene maps them onto its own world. `tap` jumps to 1 on a press and fades; `drag` adds up
// pointer travel while pressed, for spinning things.
export function useInput(ref) {
  const input = useRef({ x: 0, y: 0, sx: 0, sy: 0, inside: false, down: false, tap: 0, tapX: 0, tapY: 0, taps: 0, dragX: 0, dragY: 0, scroll: 0.5, speed: 1, time: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s = input.current;
    let lastX = 0;
    let lastY = 0;
    const at = (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
      const y = -(((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1);
      return [x, y, x >= -1 && x <= 1 && y >= -1 && y <= 1];
    };
    const move = (e) => {
      const [x, y, inside] = at(e);
      s.inside = inside;
      if (inside) {
        s.x = x;
        s.y = y;
      }
      if (s.down) {
        s.dragX += x - lastX;
        s.dragY += y - lastY;
      }
      lastX = x;
      lastY = y;
    };
    const down = (e) => {
      const [x, y, inside] = at(e);
      if (!inside || (e.target && e.target.closest && e.target.closest("a, button, input, textarea, select, label, [contenteditable]"))) return;
      s.down = true;
      s.tap = 1;
      s.taps += 1;
      s.tapX = x;
      s.tapY = y;
      lastX = x;
      lastY = y;
    };
    const up = () => (s.down = false);
    const leave = () => (s.inside = false);
    const scroll = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      s.scroll = clamp((vh - r.top) / (vh + r.height), 0, 1);
    };
    scroll();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true, capture: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("scroll", scroll, { capture: true });
      document.removeEventListener("pointerleave", leave);
    };
  }, [ref]);
  return input;
}

// Called once per frame by every scene: eases the pointer and fades the tap.
export function stepInput(s, dt) {
  s.time += dt * (s.speed || 1);
  s.sx = damp(s.sx, s.inside ? s.x : 0, 3.5, dt);
  s.sy = damp(s.sy, s.inside ? s.y : 0, 3.5, dt);
  s.tap = Math.max(0, s.tap - dt * 1.1);
}

// Simplex noise for the shaders (Ashima Arts / Stefan Gustavson, MIT licence).
export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;
