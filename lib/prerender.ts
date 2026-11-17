// Writes a downloaded site's page as finished HTML at download time, from the same template
// code the site runs. The visitor sees the real opening straight from the HTML (a fast first
// paint, readable without the script) and site.js then takes it over (hydrates) in place.
import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import Site from "@/template/src/Site";

type Data = { kind?: string; design: any; content: any; experience?: any };

export function prerender(data: Data): string {
  const w = typeof window !== "undefined" ? (window as any) : null;
  const before = w ? w.__ASSET_BASE__ : undefined;
  try {
    // Paths in the download are relative ("./scenes/..."), as site-data.js sets them.
    if (w) w.__ASSET_BASE__ = ".";
    const kind = data.kind === "website" ? "website" : "portfolio";
    return renderToString(createElement(StrictMode, null, createElement(Site, { kind, design: data.design, content: data.content, experience: data.experience })));
  } catch (e) {
    console.warn("prerender", e);
    return "";
  } finally {
    if (w) w.__ASSET_BASE__ = before;
  }
}

// Runs before site.js: turns the entrances on (unless the visitor asked for less motion),
// plays the opening scene's at once, and reveals the rest as it scrolls into view until the
// site takes over (useReveal in template/src/motion/runtime.ts disconnects it).
export const BOOT_SCRIPT = `(function(){var r=document.querySelector('.xp-root');if(!r||!r.querySelector('.xp-scene'))return;if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;var all=r.querySelectorAll('[data-enter]');r.setAttribute('data-anim','on');var mark=function(e){e.style.setProperty('--d',Math.min(8,+(e.style.getPropertyValue('--i')||0))*70+'ms');e.setAttribute('data-in','')};var top=document.getElementById('pf-top');if(top)top.querySelectorAll('[data-enter]').forEach(mark);if(!('IntersectionObserver' in window)){all.forEach(mark);return}var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){mark(x.target);io.unobserve(x.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:0.08});all.forEach(function(e){if(!e.hasAttribute('data-in'))io.observe(e)});window.__xpBoot=io})();`;
