import { useEffect } from "react";
import type { Bus } from "../Stage";
import { anchorBox, clamp, lerp, type Frame } from "../frame";

// Shared bits for the DOM engines: subscribe to the stage loop, and blend layouts.

export function useFrame(bus: Bus, fn: (f: Frame) => void) {
  useEffect(() => {
    bus.on.add(fn);
    if (bus.frame) fn(bus.frame);
    return () => void bus.on.delete(fn);
  }, [bus, fn]);
}

export interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  o?: number;
  s?: number;
}

/** The layout at a fractional step, blended between whole steps. */
export function blend(layouts: Slot[][], step: number, i: number): Slot {
  const k = clamp(step, 0, layouts.length - 1);
  const a = Math.floor(k);
  const b = Math.min(layouts.length - 1, a + 1);
  const t = k - a;
  const A = layouts[a][i];
  const B = layouts[b][i];
  const ease = t * t * (3 - 2 * t);
  return {
    x: lerp(A.x, B.x, ease),
    y: lerp(A.y, B.y, ease),
    w: lerp(A.w, B.w, ease),
    h: lerp(A.h, B.h, ease),
    r: lerp(A.r ?? 0, B.r ?? 0, ease),
    o: lerp(A.o ?? 1, B.o ?? 1, ease),
    s: lerp(A.s ?? 1, B.s ?? 1, ease),
  };
}

/** The box the object lives in, in pixels: beside the words on wide screens, above them on phones. */
export function objectBox(f: Frame) {
  const a = anchorBox(f);
  const w = f.mobile ? f.w * 0.86 : Math.min(f.w * 0.42, a.size * 1.35);
  const h = f.mobile ? f.h * 0.34 : w * 0.72;
  return { x: a.x - w / 2, y: (f.mobile ? f.h * 0.12 : a.y - h / 2), w, h, alpha: a.alpha };
}

/** Writes a slot (in 0..1 of the box) to an element as a transform. */
export function place(el: HTMLElement | null, box: { x: number; y: number; w: number; h: number }, s: Slot) {
  if (!el) return;
  const w = s.w * box.w;
  const h = s.h * box.h;
  el.style.width = w.toFixed(1) + "px";
  el.style.height = h.toFixed(1) + "px";
  el.style.transform = `translate3d(${(box.x + s.x * box.w - w / 2).toFixed(1)}px,${(box.y + s.y * box.h - h / 2).toFixed(1)}px,0) rotate(${(s.r ?? 0).toFixed(2)}deg) scale(${(s.s ?? 1).toFixed(3)})`;
  el.style.opacity = String(clamp(s.o ?? 1));
}
