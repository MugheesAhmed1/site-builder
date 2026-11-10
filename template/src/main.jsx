import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Portfolio from "./Portfolio.jsx";
import data from "./portfolio-data.json";
import { palette, resolveScheme } from "./theme.js";
import "./portfolio.css";

// Match the page background to the portfolio so overscroll never flashes white.
const scheme = resolveScheme(data.design, window.matchMedia("(prefers-color-scheme: dark)").matches);
document.body.style.margin = "0";
document.body.style.background = palette(data.design, scheme).bg;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Portfolio design={data.design} content={data.content} />
  </StrictMode>
);
