"use client";

import { useEffect, useState } from "react";
// The exact same components that ship in the downloaded project.
import Portfolio from "@/template/src/Portfolio.jsx";
import Website from "@/template/src/Website.jsx";
import type { Design, SiteContent, SiteKind } from "@/lib/types";

export default function Preview({ kind, design, content, compact }: { kind: SiteKind; design: Design; content: SiteContent; compact?: boolean }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [scheme, setScheme] = useState<"light" | "dark">(design.mode === "dark" ? "dark" : "light");
  // Follow the design's starting theme when it changes (a new system, for example).
  useEffect(() => {
    if (design.mode !== "auto") setScheme(design.mode);
  }, [design.mode]);
  const Site = (kind === "website" ? Website : Portfolio) as React.ComponentType<{ design: Design; content: SiteContent; preview: boolean; scheme: string }>;
  return (
    <div className={"preview" + (compact ? " is-compact" : "")}>
      <div className="preview-bar">
        <span className="small muted">Live preview</span>
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
          <Site design={design} content={content} preview scheme={scheme} />
        </div>
      </div>
    </div>
  );
}
