// Template content contract (Site Builder, docs/TEMPLATES.md). Everything this site shows or
// does is read from window.__XP__, which xp-content.js (next to index.html) sets. Edit that
// file to change words, pictures, colours, fonts, sections and motion; no code change needed.
// In the builder's preview the page also listens for new content and redraws.
import { useEffect, useState } from 'react';

export type XP = Record<string, any>;

declare global {
  interface Window {
    __XP__?: XP;
    __XP_HASH__?: XP;
    __XP_PREVIEW__?: boolean;
  }
}

export function initialContent(): XP {
  return window.__XP_HASH__ || window.__XP__ || {};
}

/** The current content, kept up to date in the builder's preview. */
export function useContent(): XP {
  const [data, setData] = useState<XP>(initialContent);
  useEffect(() => {
    if (!window.__XP_PREVIEW__) return;
    const on = (e: MessageEvent) => {
      if (e.source === window.parent && e.data && e.data.type === 'xp-data') setData(e.data.data);
    };
    window.addEventListener('message', on);
    window.parent.postMessage({ type: 'xp-ready' }, '*');
    return () => window.removeEventListener('message', on);
  }, []);
  return data;
}

/** Text with {name} filled in with the business name. */
export function fill(text: unknown, data: XP): string {
  return String(text ?? '').replace(/\{name\}/g, String(data?.brand?.name ?? ''));
}

const loadedFonts = new Set<string>();
const SAFE_FONT = /^[A-Za-z0-9 ]{2,40}$/;

/** Colours become --c-<name>, fonts --f-<role>; Google Fonts load on demand. */
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
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
  }
  for (const [k, v] of Object.entries(theme || {})) {
    if (typeof v === 'number') root.style.setProperty(`--n-${k}`, String(v));
  }
}

/** Only http(s), mailto and in-page links leave the template. */
export function safeHref(href: unknown): string {
  const h = String(href ?? '').trim();
  return /^(https?:|mailto:|tel:|#|\/|\.\/)/i.test(h) ? h : '';
}
