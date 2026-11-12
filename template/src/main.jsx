import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Portfolio from "./Portfolio.jsx";
import Website from "./Website.jsx";
import data from "./site-data.json";
import { palette, resolveScheme } from "./theme.js";
import "./portfolio.css";
import "./cast.css";
import "./studio.css";
import "./showpiece.css";

// site-data.json holds the design system and every word on the page.
// kind is "portfolio" (a personal site) or "website" (a business site).
const scheme = resolveScheme(data.design, window.matchMedia("(prefers-color-scheme: dark)").matches);
document.body.style.margin = "0";
// Match the page background to the site so overscroll never flashes white.
document.body.style.background = palette(data.design, scheme).bg;

const Site = data.kind === "website" ? Website : Portfolio;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Site design={data.design} content={data.content} />
  </StrictMode>
);
