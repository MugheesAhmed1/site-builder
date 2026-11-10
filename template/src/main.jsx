import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Portfolio from "./Portfolio.jsx";
import data from "./portfolio-data.json";
import "./portfolio.css";

document.body.style.margin = "0";
document.body.style.background = data.design.colors.bg;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Portfolio design={data.design} content={data.content} />
  </StrictMode>
);
