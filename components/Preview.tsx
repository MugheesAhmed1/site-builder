"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
// The exact same components that ship in the downloaded project.
import Portfolio from "@/template/src/Portfolio.jsx";
import Website from "@/template/src/Website.jsx";
import type { Design, SiteContent, SiteKind } from "@/lib/types";

export default function Preview({ kind, design, content, compact, replayKey }: { kind: SiteKind; design: Design; content: SiteContent; compact?: boolean; replayKey?: string | number }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [run, setRun] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const [scheme, setScheme] = useState<"light" | "dark">(design.mode === "dark" ? "dark" : "light");
  // Follow the design's starting theme when it changes (a new system, for example).
  useEffect(() => {
    if (design.mode !== "auto") setScheme(design.mode);
  }, [design.mode]);
  const Site = (kind === "website" ? Website : Portfolio) as React.ComponentType<{ design: Design; content: SiteContent; preview: boolean; scheme: string }>;
  return (
    <div className={"preview" + (compact ? " is-compact" : "")}>
      <div className="preview-bar">
        <span className="small muted preview-live">
          <span className="live-dot" aria-hidden="true" />
          Live preview
        </span>
        <div className="row wrap" style={{ gap: 6, justifyContent: "flex-end" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setRun((r) => r + 1);
              viewport.current?.scrollTo({ top: 0 });
            }}
            title="Play the animations again from the top"
          >
            <Icon name="undo" size={15} />
            Replay
          </button>
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
      <div ref={viewport} data-scroll-root="" className={"preview-viewport" + (device === "mobile" ? " is-mobile" : "")}>
        <div className="preview-device">
          {/* A new key remounts the site so every entrance animation plays again. */}
          <Site key={`${run}-${device}-${replayKey ?? ""}`} design={design} content={content} preview scheme={scheme} />
        </div>
      </div>
    </div>
  );
}
