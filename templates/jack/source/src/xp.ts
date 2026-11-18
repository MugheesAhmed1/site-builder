// Template content contract (Site Builder, docs/TEMPLATES.md). Everything this site shows or
// does is read from window.__XP__, which xp-content.js (next to index.html) sets. Edit that
// file to change words, pictures, colours, fonts, sections and motion; no code change needed.
// In the builder's preview the page also listens for new content and redraws.
// This file is shared by every template: edit templates/_kit/xp.ts, not a copy.
import { useEffect, useSyncExternalStore } from 'react';

export type XP = Record<string, any>;

declare global {
  interface Window {
    __XP__?: XP;
    __XP_HASH__?: XP;
    __XP_PREVIEW__?: boolean;
  }
}

let current: XP = (typeof window !== 'undefined' && (window.__XP_HASH__ || window.__XP__)) || {};
const listeners = new Set<() => void>();
let listening = false;

function listen() {
  if (listening || typeof window === 'undefined' || !window.__XP_PREVIEW__) return;
  listening = true;
  window.addEventListener('message', (e: MessageEvent) => {
    if (e.source !== window.parent || !e.data || e.data.type !== 'xp-data') return;
    current = e.data.data || {};
    listeners.forEach((l) => l());
  });
  window.parent.postMessage({ type: 'xp-ready' }, '*');
}

export function initialContent(): XP {
  return current;
}

/** The current content, kept up to date in the builder's preview. */
export function useXP(): XP {
  useEffect(listen, []);
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
    () => current
  );
}

/** Older name for useXP. */
export const useContent = useXP;

/** Text with {name} filled in with the business name and {year} with this year. */
export function fill(text: unknown, data: XP = current): string {
  return String(text ?? '')
    .replace(/\{name\}/g, String(data?.brand?.name ?? ''))
    .replace(/\{year\}/g, String(new Date().getFullYear()));
}

/** A multi-line text as its lines (empty lines dropped). */
export function lines(text: unknown, data: XP = current): string[] {
  return fill(text, data)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Lines written as "left | right" as pairs. */
export function pairs(text: unknown, data: XP = current): [string, string][] {
  return lines(text, data).map((l) => {
    const i = l.indexOf('|');
    return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  });
}

const loadedFonts = new Set<string>();
const SAFE_FONT = /^[A-Za-z0-9 ]{2,40}$/;

/** Colours become --c-<name>, fonts --f-<role>, numbers --n-<name>; Google Fonts load on demand. */
export function applyTheme(theme: XP | undefined): void {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme?.colors || {})) root.style.setProperty(`--c-${k}`, String(v));
  for (const [k, v] of Object.entries(theme?.fonts || {})) {
    const family = String(v);
    if (!SAFE_FONT.test(family)) continue;
    root.style.setProperty(`--f-${k}`, `"${family}"`);
    if (!loadedFonts.has(family)) {
      loadedFonts.add(family);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500&display=swap`;
      document.head.appendChild(link);
    }
  }
  for (const [k, v] of Object.entries(theme || {})) {
    if (typeof v === 'number') root.style.setProperty(`--n-${k}`, String(v));
  }
}

/** Page title and description from content.seo. */
export function applySeo(data: XP = current): void {
  document.title = fill(data.seo?.title || data.brand?.name, data);
  const d = fill(data.seo?.description, data);
  for (const sel of ['meta[name="description"]', 'meta[property="og:description"]']) document.querySelector(sel)?.setAttribute('content', d);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
}

/** Theme and SEO, kept in step with the content. Call once in App. */
export function useTheme(data: XP): void {
  useEffect(() => {
    applyTheme(data.theme);
    applySeo(data);
  });
}

/** Only http(s), mailto, tel and in-page links leave the template. */
export function safeHref(href: unknown): string {
  const h = String(href ?? '').trim();
  return /^(https?:|mailto:|tel:|#|\/|\.\/)/i.test(h) ? h : '';
}

/** Pictures and video: https, uploads (data:) and files next to the page. */
export function safeSrc(src: unknown): string {
  const s = String(src ?? '').trim();
  return /^(https:|data:(image|video)\/|\.\/|\/)/i.test(s) ? s : '';
}

/** A section is shown unless content.sections switches it off. */
export function on(key: string, data: XP = current): boolean {
  return data.sections?.[key] !== false;
}
