"use client";

import { useEffect, useState } from "react";
// The exact same component that ships in the downloaded project.
import Portfolio from "@/template/src/Portfolio.jsx";
import type { Design, PortfolioContent } from "@/lib/types";

export default function Preview({ design, content }: { design: Design; content: PortfolioContent }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [scheme, setScheme] = useState<"light" | "dark">(design.mode === "dark" ? "dark" : "light");
  // Follow the design's starting theme when it changes (e.g. a new preset).
  useEffect(() => {
    if (design.mode !== "auto") setScheme(design.mode);
  }, [design.mode]);
  return (
    <div className="preview">
      <div className="preview-bar">
        <span className="small muted">Preview</span>
        <div className="row" style={{ gap: 6 }}>
          <div className="seg" role="group" aria-label="Theme">
            <button aria-pressed={scheme === "light"} className={scheme === "light" ? "is-on" : ""} onClick={() => setScheme("light")}>
              Light
            </button>
            <button aria-pressed={scheme === "dark"} className={scheme === "dark" ? "is-on" : ""} onClick={() => setScheme("dark")}>
              Dark
            </button>
          </div>
          <div className="seg" role="group" aria-label="Screen size">
            <button aria-pressed={device === "desktop"} className={device === "desktop" ? "is-on" : ""} onClick={() => setDevice("desktop")}>
              Desktop
            </button>
            <button aria-pressed={device === "mobile"} className={device === "mobile" ? "is-on" : ""} onClick={() => setDevice("mobile")}>
              Phone
            </button>
          </div>
        </div>
      </div>
      <div className={"preview-viewport" + (device === "mobile" ? " is-mobile" : "")}>
        <div className="preview-device">
          <Portfolio design={design} content={content} preview scheme={scheme} />
        </div>
      </div>
    </div>
  );
}
