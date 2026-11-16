// Writes a downloaded site's page as finished HTML at download time, from the same template
// code the site runs. The visitor sees the real opening straight from the HTML (a fast first
// paint, readable without the script) and site.js then takes it over (hydrates) in place.
import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import Portfolio from "@/template/src/Portfolio.jsx";
import Website from "@/template/src/Website.jsx";

type Data = { kind?: string; design: any; content: any };

export function prerender(data: Data): string {
  const w = typeof window !== "undefined" ? (window as any) : null;
  const before = w ? w.__ASSET_BASE__ : undefined;
  try {
    // Paths in the download are relative ("./scenes/..."), as site-data.js sets them.
    if (w) w.__ASSET_BASE__ = ".";
    const Site = (data.kind === "website" ? Website : Portfolio) as any;
    return renderToString(createElement(StrictMode, null, createElement(Site, { design: data.design, content: data.content })));
  } catch (e) {
    console.warn("prerender", e);
    return "";
  } finally {
    if (w) w.__ASSET_BASE__ = before;
  }
}

// Runs before site.js: marks what is on screen so CSS plays its entrance at once, and reveals
// the rest as it scrolls into view until Motion takes over (see useReveal in shared.jsx).
export const BOOT_SCRIPT = `(function(){var r=document.querySelector('.pf[data-anim="on"]');if(!r)return;var mark=function(e,d){e.setAttribute('data-in','');e.style.setProperty('--pf-d',d+'ms')};var top=document.getElementById('pf-top');if(top){top.querySelectorAll('.pf-hl-part').forEach(function(e,j){mark(e,40+Math.min(j,24)*35)});top.querySelectorAll('.pf-enter,.pf-reveal').forEach(function(e){mark(e,120+(+(e.style.getPropertyValue('--i')||0))*80)})}var rest=r.querySelectorAll('.pf-enter:not([data-in]),.pf-reveal:not([data-in])');if(!('IntersectionObserver' in window)){rest.forEach(function(e){mark(e,0)});return}var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){mark(x.target,Math.min(6,+(x.target.style.getPropertyValue('--i')||0))*70);io.unobserve(x.target)}})},{rootMargin:'0px 0px -6% 0px',threshold:0.12});rest.forEach(function(e){io.observe(e)});window.__pfBoot=io})();`;
