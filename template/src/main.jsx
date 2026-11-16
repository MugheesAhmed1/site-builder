import { StrictMode, startTransition } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import Portfolio from "./Portfolio.jsx";
import Website from "./Website.jsx";
import data from "./site-data.json";
import { palette, resolveScheme } from "./theme.js";
import "./portfolio.css";
import "./studio.css";
import "./showpiece.css";
import "./cinema.css";
import "./flow.css";

// site-data.json holds the design system and every word on the page.
// kind is "portfolio" (a personal site) or "website" (a business site).
const scheme = resolveScheme(data.design, window.matchMedia("(prefers-color-scheme: dark)").matches);
document.body.style.margin = "0";
// Match the page background to the site so overscroll never flashes white.
document.body.style.background = palette(data.design, scheme).bg;

const Site = data.kind === "website" ? Website : Portfolio;

const root = document.getElementById("root");
const app = (
  <StrictMode>
    <Site design={data.design} content={data.content} />
  </StrictMode>
);
// A downloaded site arrives as finished HTML (written by the builder); React picks it up where
// it is instead of drawing it again, in small slices so the page never stops answering.
// Anything that differs on this screen (a phone, dark mode) is quietly redrawn by React.
if (root.hasAttribute("data-prerendered")) startTransition(() => void hydrateRoot(root, app, { onRecoverableError() {} }));
else createRoot(root).render(app);
