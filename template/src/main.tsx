import { StrictMode, startTransition } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import Site, { needsDark, prefersDark } from "./Site";
import data from "./site-data.json";
import { palette, resolveScheme } from "./theme.js";
import "./styles/site.css";

// site-data.json holds the experience (the scenes, the stage and the motion), the design
// system and every word on the page. kind is "portfolio" (a personal site) or "website".
const d = data as any;
const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const scheme = (d.design.mode === "auto" && prefersDark(d.experience)) || needsDark(d.experience) ? "dark" : resolveScheme(d.design, dark);
document.body.style.margin = "0";
// Match the page background to the site so overscroll never flashes white.
document.body.style.background = palette(d.design, scheme).bg;

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <Site kind={d.kind === "website" ? "website" : "portfolio"} design={d.design} content={d.content} experience={d.experience} />
  </StrictMode>
);
// A downloaded site arrives as finished HTML (written by the builder); React picks it up where
// it is instead of drawing it again. Anything that differs on this screen is quietly redrawn.
if (root.hasAttribute("data-prerendered")) startTransition(() => void hydrateRoot(root, app, { onRecoverableError() {} }));
else createRoot(root).render(app);
