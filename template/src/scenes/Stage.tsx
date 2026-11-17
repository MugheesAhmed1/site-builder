import { useEffect, useRef, type ComponentType } from "react";
import type { Experience } from "../experiences/types";
import type { Conductor } from "../motion/scroll";
import { deviceCaps, tone } from "../motion/runtime";
import { beatAt, clamp, lerp, sideOf, type Engine2D, type Frame, type Palette, type Tap } from "./frame";
import { ENGINES } from "./engines";

// The stage: the visual world that stays on screen behind the scenes and carries the concept
// from the hero to the call to action (PRD sections 4.1, 12 and 13). One loop per page drives
// it from the scroll conductor, the pointer and taps. Canvas engines draw into a canvas; DOM
// engines receive the same frame and move their own elements.
//
// Fallbacks (PRD section 39): reduced motion draws each scene's finished state with time
// frozen; a weak device drops to 30 frames a second, then to a still; without JavaScript the
// stage shows its poster colours from CSS.

export interface Bus {
  frame: Frame | null;
  on: Set<(f: Frame) => void>;
}

export interface DomEngineProps {
  bus: Bus;
  pal: Palette;
  labels: string[];
  params: Experience["stage"]["params"];
  mobile: boolean;
}

export type StageEngineDef = { kind: "canvas"; draw: Engine2D } | { kind: "dom"; Component: ComponentType<DomEngineProps> };

const INTERACTIVE = "a,button,input,textarea,select,label,summary,[contenteditable],[role=button],.xp-nav,.xp-btn";

export function Stage({
  experience: e,
  scenes,
  pal,
  labels,
  conductor,
  reduced,
  editing,
  sound,
}: {
  experience: Experience;
  /** The scenes on the page, in order (hidden ones left out). */
  scenes: Experience["scenes"];
  pal: Palette;
  labels: string[];
  conductor: { current: Conductor | null };
  reduced: boolean;
  editing: boolean;
  sound: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bus = useRef<Bus>({ frame: null, on: new Set() }).current;
  const def = ENGINES[e.stage.engine];
  const live = useRef({ e, pal, labels, reduced, editing, sound, scenes });
  live.current = { e, pal, labels, reduced, editing, sound, scenes };

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const caps = deviceCaps();
    const state: Record<string, any> = {};
    const taps: Tap[] = [];
    let px = -1;
    let py = -1;
    let pointer = false;
    let raf = 0;
    let t0 = performance.now();
    let last = t0;
    let slow = 0;
    // Frames whose drawing alone took too long: the device cannot keep up with this stage.
    let cost = 0;
    let heavy = false;
    // Phones start at 30 frames a second: smooth enough for a moving world, half the battery.
    let fps = caps.lowPower || caps.touch ? 30 : 60;
    let still = false;
    let visible = true;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let side = 0.5;
    let presence = 1;
    let drawn = false;
    const g = canvas.current?.getContext("2d", { alpha: true }) ?? null;

    const size = () => {
      const r = el.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      const { e } = live.current;
      // Phones fill a lot of pixels; 1.5 looks sharp on them and costs half of 2.
      dpr = Math.min(window.devicePixelRatio || 1, caps.lowPower || heavy ? 1 : w < 760 ? Math.min(1.5, e.budget.dpr) : e.budget.dpr);
      if (canvas.current) {
        canvas.current.width = Math.round(w * dpr);
        canvas.current.height = Math.round(h * dpr);
      }
      drawn = false;
    };
    size();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(size) : null;
    ro?.observe(el);

    const move = (ev: PointerEvent) => {
      if (ev.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      px = ev.clientX - r.left;
      py = ev.clientY - r.top;
      pointer = px >= 0 && py >= 0 && px <= r.width && py <= r.height;
    };
    const leave = () => (pointer = false);
    const down = (ev: PointerEvent) => {
      const { editing, sound, e } = live.current;
      if (editing || e.channels.click <= 0) return;
      const target = ev.target as HTMLElement | null;
      if (target?.closest?.(INTERACTIVE)) return;
      const root = el.closest(".xp-root");
      if (root && !root.contains(target)) return;
      const r = el.getBoundingClientRect();
      taps.push({ x: ev.clientX - r.left, y: ev.clientY - r.top, t: (performance.now() - t0) / 1000 });
      if (taps.length > 8) taps.shift();
      if (sound) tone(380 + Math.random() * 300, 160);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    document.addEventListener("pointerleave", leave);
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => (visible = es[0]?.isIntersecting ?? true)) : null;
    io?.observe(el);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const { e, pal, labels, reduced, scenes } = live.current;
      if (!visible || document.hidden) return;
      const dt = (now - last) / 1000;
      if (dt < 1 / fps - 0.002) return;
      last = now;
      // The performance pass at run time: sustained slow frames step down, then stop.
      if (dt > 0.05 && !reduced) {
        slow++;
        if (slow > 40 && fps === 60) (fps = 30), (slow = 0);
        else if (slow > 60 && fps === 30) still = true;
      } else slow = Math.max(0, slow - 1);
      if (cost > 2) {
        // Drawing itself is slow: first fewer pixels, then half the frames, then a still.
        cost = 0;
        if (!heavy) (heavy = true), size();
        else if (fps === 60) fps = 30;
        else still = true;
      }
      const c = conductor.current;
      const pos = c ? c.state.pos : 0;
      if ((reduced || still) && drawn && bus.frame && Math.abs(bus.frame.pos - pos) < 0.001) return;
      const i = Math.min(scenes.length - 1, Math.max(0, Math.round(pos)));
      const [sx, sp] = sideOf(scenes[i]?.composition ?? "center");
      // The object glides across the screen between compositions instead of jumping.
      side = lerp(side, sx, reduced ? 1 : 0.06);
      presence = lerp(presence, sp, reduced ? 1 : 0.06);
      const mobile = w < 760;
      const frame: Frame = {
        t: reduced || still ? 2 : (now - t0) / 1000,
        dt: Math.min(0.05, dt),
        pos,
        beat: beatAt(scenes.map((s) => s.beat), pos),
        params: e.stage.params,
        w,
        h,
        px: pointer ? px : w * 0.5,
        py: pointer ? py : h * 0.4,
        nx: pointer ? clamp((px / w) * 2 - 1, -1, 1) : 0,
        ny: pointer ? clamp((py / h) * 2 - 1, -1, 1) : 0,
        pointer: pointer && !reduced && e.channels.cursor > 0 && !caps.touch,
        taps: reduced ? [] : taps,
        side,
        presence,
        pal,
        mobile,
        reduced,
        energy: clamp(e.intensity / 10, 0.1, 1),
        budget: { ...e.budget, particles: Math.round(e.budget.particles * (mobile ? 0.45 : 1) * (caps.lowPower ? 0.6 : 1)) },
        ch: e.channels,
        speed: c ? c.state.velocity : 0,
        labels,
        seed: e.seed,
      };
      bus.frame = frame;
      if (def?.kind === "canvas" && g) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        const t1 = performance.now();
        def.draw(g, frame, state);
        const took = performance.now() - t1;
        // A phone budget is tighter: the same drawing takes about four times as long there.
        const limit = w < 760 ? 10 : 20;
        if (took > limit) cost++;
        else if (took < limit / 2) cost = Math.max(0, cost - 0.25);
      }
      for (const fn of bus.on) fn(frame);
      if (!drawn) {
        drawn = true;
        el.setAttribute("data-live", "");
      }
    };
    // The words come first: the stage starts once the page has painted and gone quiet.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      t0 = last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const kick = setTimeout(() => (idle ? idle(begin, { timeout: 1200 }) : begin()), document.readyState === "complete" ? 60 : 400);
    return () => {
      clearTimeout(kick);
      started = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerleave", leave);
    };
  }, [e.stage.engine]); // eslint-disable-line react-hooks/exhaustive-deps

  const Dom = def?.kind === "dom" ? def.Component : null;
  return (
    <div ref={wrap} className={"xp-stage xp-stage-" + e.stage.engine} data-engine={e.stage.engine} aria-hidden="true">
      {def?.kind === "canvas" && <canvas ref={canvas} className="xp-canvas" />}
      {Dom && <Dom bus={bus} pal={pal} labels={labels} params={e.stage.params} mobile={false} />}
    </div>
  );
}
