import { useEffect, useLayoutEffect, useState } from "react";

// The motion runtime: how the primitives in primitives.ts are played on a real page.
// Entrances and text primitives are CSS (styles/site.css), keyed by data-enter and data-text;
// this file decides when they play, and adds the pointer moments (magnetic, ripple, cursor).
// Everything here switches off for reduced motion and on touch screens where it adds nothing
// (PRD sections 19, 25 and 39).

export const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function prefersReduced(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(mq.matches);
    const on = (e: MediaQueryListEvent) => setR(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return r;
}

export function useSystemDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return dark;
}

export interface Caps {
  touch: boolean;
  finePointer: boolean;
  lowPower: boolean;
  reduced: boolean;
}

export function deviceCaps(): Caps {
  if (typeof window === "undefined") return { touch: false, finePointer: true, lowPower: false, reduced: false };
  const mq = (q: string) => !!window.matchMedia && window.matchMedia(q).matches;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const lowPower = (nav.hardwareConcurrency || 8) <= 4 && (nav.deviceMemory || 8) <= 4 ? true : !!nav.connection?.saveData;
  return { touch: mq("(pointer: coarse)"), finePointer: mq("(hover: hover) and (pointer: fine)"), lowPower, reduced: mq("(prefers-reduced-motion: reduce)") };
}

/** Plays entrances as elements scroll into view. Marks what is already on screen at once. */
export function useReveal(root: { current: HTMLElement | null }, key: string, on: boolean) {
  useIso(() => {
    const el = root.current;
    if (!el) return;
    if (!on) {
      el.removeAttribute("data-anim");
      return;
    }
    el.setAttribute("data-anim", "on");
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-enter]"));
    const scroller = el.closest("[data-scroll-root]") as HTMLElement | null;
    const mark = (x: HTMLElement) => {
      const i = Math.min(8, Number(x.style.getPropertyValue("--i") || 0));
      x.style.setProperty("--d", i * 70 + "ms");
      x.setAttribute("data-in", "");
      x.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
    };
    if (typeof IntersectionObserver === "undefined") {
      items.forEach(mark);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            mark(e.target as HTMLElement);
            io.unobserve(e.target);
          }
      },
      { root: scroller, rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    for (const x of items) if (!x.hasAttribute("data-in")) io.observe(x);
    // The boot script of a downloaded site may already be watching; it is no longer needed.
    const w = window as Window & { __xpBoot?: IntersectionObserver };
    w.__xpBoot?.disconnect();
    return () => io.disconnect();
  }, [key, on]);
}

/** text.counter: a number counts up to its value once, keeping any words around it ("120+ clients"). */
export function countUp(el: HTMLElement) {
  const full = el.getAttribute("data-count") || "";
  const m = /^(\D*)([\d.,]+)(.*)$/.exec(full);
  if (!m || el.hasAttribute("data-counted") || prefersReduced()) return;
  el.setAttribute("data-counted", "");
  const n = parseFloat(m[2].replace(/,/g, ""));
  if (!Number.isFinite(n)) return;
  const dec = (m[2].split(".")[1] || "").length;
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / 1200);
    const v = n * (1 - Math.pow(1 - k, 3));
    el.textContent = m[1] + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en")) + m[3];
    if (k < 1) requestAnimationFrame(step);
    else el.textContent = full;
  };
  requestAnimationFrame(step);
}

/** Buttons that lean toward the pointer (hover.magnetic). Fine pointers only. */
export function useMagnetic(root: { current: HTMLElement | null }, on: boolean, key: string) {
  useEffect(() => {
    const el = root.current;
    if (!el || !on || !deviceCaps().finePointer || prefersReduced()) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-magnetic]"));
    const move = (e: PointerEvent) => {
      for (const b of items) {
        const r = b.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const d = Math.hypot(dx, dy);
        const reach = Math.max(r.width, r.height) * 1.1;
        const k = d < reach ? (1 - d / reach) * 0.35 : 0;
        b.style.transform = k ? `translate(${(dx * k).toFixed(1)}px, ${(dy * k).toFixed(1)}px)` : "";
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      items.forEach((b) => (b.style.transform = ""));
    };
  }, [on, key]);
}

/** click.ripple on every button: a ring from the press point. */
export function useRipple(root: { current: HTMLElement | null }, on: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !on) return;
    const down = (e: PointerEvent) => {
      const b = (e.target as HTMLElement).closest?.(".xp-btn") as HTMLElement | null;
      if (!b || prefersReduced()) return;
      const r = b.getBoundingClientRect();
      const s = document.createElement("span");
      s.className = "xp-ripple";
      s.style.left = e.clientX - r.left + "px";
      s.style.top = e.clientY - r.top + "px";
      b.appendChild(s);
      setTimeout(() => s.remove(), 650);
    };
    el.addEventListener("pointerdown", down);
    return () => el.removeEventListener("pointerdown", down);
  }, [on]);
}

/** A tiny tone for sound cues, only ever after the visitor turned sound on (PRD section 26). */
let audio: AudioContext | null = null;
export function tone(freq = 520, ms = 120, gain = 0.04) {
  try {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
    audio = audio || new AC();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + ms / 1000);
  } catch {
    /* no audio on this device */
  }
}
