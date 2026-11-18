// Shared helpers for library blocks (docs/LIBRARY.md). A block is a React component that gets its
// settings as `props`, every one of them described by the block's schema, so a person can change
// any part of it in the studio. Blocks inherit the page's font and size their text with clamp().
import { useEffect, useRef, useState } from 'react';

export type Props = Record<string, any>;
export interface BlockProps {
  props: Props;
}

/** Only http(s), mailto, tel and in-page links. */
export function safeHref(href: unknown): string {
  const h = String(href ?? '').trim();
  return /^(https?:|mailto:|tel:|#|\/|\.\/)/i.test(h) ? h : '';
}

/**
 * Pictures and video: https, uploads (data:), files next to the page, and the library's own
 * pictures written as lib:name.webp (they ship in the library's media folder).
 */
export function safeSrc(src: unknown): string {
  const s = String(src ?? '').trim();
  if (/^lib:[\w.-]+$/.test(s)) return new URL(`./media/${s.slice(4)}`, import.meta.url).href;
  return /^(https:|data:(image|video)\/|\.\/|\/)/i.test(s) ? s : '';
}

const HEX = /^#[0-9a-f]{3,8}$/i;
/** A colour from the settings, or the fallback when it is not a plain hex colour. */
export const color = (v: unknown, fallback: string) => (HEX.test(String(v ?? '').trim()) ? String(v).trim() : fallback);

/** A number from the settings, kept between min and max. */
export function num(v: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** Text with {year} filled in. */
export const text = (v: unknown) => String(v ?? '').replace(/\{year\}/g, String(new Date().getFullYear()));

/** A multi-line text as its lines (empty lines dropped). */
export const lines = (v: unknown) =>
  text(v)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/** Lines written as "left | right" as pairs. */
export const pairs = (v: unknown): [string, string][] =>
  lines(v).map((l) => {
    const i = l.indexOf('|');
    return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  });

/** A list setting as an array of items. */
export const items = (v: unknown): Props[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** True once the element has come within `margin` of the screen (and, with `keep` false, while it stays there). */
export function useInView<T extends Element>(margin = '0px', keep = true) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return setInView(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (keep) io.disconnect();
        } else if (!keep) setInView(false);
      },
      { rootMargin: margin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, keep]);
  return [ref, inView] as const;
}

/** How far the element has travelled through the screen: 0 as its top enters at the bottom, 1 as its bottom leaves at the top. */
export function useScrollProgress<T extends HTMLElement>(onProgress: (p: number) => void) {
  const ref = useRef<T | null>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height + window.innerHeight;
      cb.current(Math.min(1, Math.max(0, (window.innerHeight - r.top) / total)));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, []);
  return ref;
}

/** Progress through a tall section whose inside sticks to the screen: 0 when it reaches the top, 1 when its end does. */
export function useStickyProgress<T extends HTMLElement>(onProgress: (p: number) => void) {
  const ref = useRef<T | null>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const run = Math.max(1, r.height - window.innerHeight);
      cb.current(Math.min(1, Math.max(0, -r.top / run)));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, []);
  return ref;
}
