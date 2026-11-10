"use client";

import { useState } from "react";
// The exact same component that ships in the downloaded project.
import Portfolio from "@/template/src/Portfolio.jsx";
import type { Design, PortfolioContent } from "@/lib/types";

export default function Preview({ design, content, label }: { design: Design; content: PortfolioContent; label?: string }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return (
    <div className="preview-frame">
      <div className="preview-bar">
        <div className="row">
          <div className="dots">
            <span />
            <span />
            <span />
          </div>
          <span className="small muted">{label ?? "Live preview"}</span>
        </div>
        <div className="seg">
          <button className={device === "desktop" ? "is-on" : ""} onClick={() => setDevice("desktop")}>
            Desktop
          </button>
          <button className={device === "mobile" ? "is-on" : ""} onClick={() => setDevice("mobile")}>
            Phone
          </button>
        </div>
      </div>
      <div className={"preview-viewport " + (device === "mobile" ? "is-mobile" : "")}>
        <div className="preview-device">
          <Portfolio design={design} content={content} />
        </div>
      </div>
    </div>
  );
}
