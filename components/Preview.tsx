"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import ImageField from "@/components/ImageField";
import VideoField from "@/components/VideoField";
import { cachedMediaUrl, mediaRefs, mediaUrl, swapMedia } from "@/lib/media";
// The exact same components that ship in the downloaded project.
import Portfolio from "@/template/src/Portfolio.jsx";
import Website from "@/template/src/Website.jsx";
import { findText, getAt, imageFromClipboard, imageToDataUrl, parsePath, setAt, type Path } from "@/lib/edit";
import type { Design, SiteContent, SiteKind } from "@/lib/types";

// Edit on page: click any words to change them, click any picture or empty photo slot to
// upload, drop or paste a new one. Works like a page builder, on the real site.

type Pop = { kind: "text" | "image" | "video"; path: Path; x: number; y: number; label: string } | null;

const TEXT_TAGS = "h1, h2, h3, h4, h5, p, li, dt, dd, blockquote, figcaption, small, strong, b, em, a, button, span, label";

function pretty(path: Path) {
  return path
    .filter((x) => typeof x === "string")
    .map((x) => String(x).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/Url$/, ""))
    .join(", ")
    .toLowerCase();
}

export default function Preview({
  kind,
  design,
  content,
  compact,
  replayKey,
  onContentChange,
}: {
  kind: SiteKind;
  design: Design;
  content: SiteContent;
  compact?: boolean;
  replayKey?: string | number;
  onContentChange?: (c: SiteContent) => void;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [run, setRun] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [scheme, setScheme] = useState<"light" | "dark">(design.mode === "dark" ? "dark" : "light");
  const [editing, setEditing] = useState(false);
  const [pop, setPop] = useState<Pop>(null);
  const [note, setNote] = useState("");
  const hoverEl = useRef<HTMLElement | null>(null);
  const live = useRef(content);
  live.current = content;
  // Follow the design's starting theme when it changes (a new system, for example).
  useEffect(() => {
    if (design.mode !== "auto") setScheme(design.mode);
  }, [design.mode]);
  const Site = (kind === "website" ? Website : Portfolio) as React.ComponentType<{ design: Design; content: SiteContent; preview: boolean; scheme: string }>;

  // Uploaded videos live in the browser's own storage; swap their references for playable links.
  const [, setLoaded] = useState(0);
  const refs = [...mediaRefs([content, design.video])];
  useEffect(() => {
    let on = true;
    const missing = refs.filter((r) => !cachedMediaUrl(r));
    if (missing.length) Promise.all(missing.map(mediaUrl)).then(() => on && setLoaded((n) => n + 1));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs.join("|")]);
  const shown = refs.length ? swapMedia(content, (r) => cachedMediaUrl(r) || "") : content;
  const shownDesign = design.video?.startsWith("media:") ? { ...design, video: cachedMediaUrl(design.video) || "" } : design;

  const setValue = (path: Path, v: unknown) => onContentChange && onContentChange(setAt(live.current, path, v));

  // Hover outline, click to edit and paste a picture straight onto a slot.
  useEffect(() => {
    const vp = viewport.current;
    if (!vp || !editing) return;
    const pick = (t: EventTarget | null): { el: HTMLElement; img?: string; video?: string } | null => {
      const n = t as HTMLElement | null;
      if (!n || !n.closest || !n.closest(".pf")) return null;
      const vid = n.closest("[data-video]") as HTMLElement | null;
      if (vid && vid.dataset.video) return { el: vid, img: vid.dataset.video, video: vid.dataset.video };
      const img = n.closest("[data-img]") as HTMLElement | null;
      if (img && img.dataset.img) return { el: img, img: img.dataset.img };
      const el = n.closest(TEXT_TAGS) as HTMLElement | null;
      return el ? { el } : null;
    };
    const clear = () => {
      hoverEl.current?.classList.remove("pe-hover", "pe-hover-img");
      hoverEl.current = null;
    };
    const over = (e: PointerEvent) => {
      const p = pick(e.target);
      if (p?.el === hoverEl.current) return;
      clear();
      if (p) {
        p.el.classList.add(p.img ? "pe-hover-img" : "pe-hover");
        hoverEl.current = p.el;
      }
    };
    const click = (e: MouseEvent) => {
      const p = pick(e.target);
      if (!p) return;
      e.preventDefault();
      e.stopPropagation();
      const box = shell.current!.getBoundingClientRect();
      const x = Math.min(Math.max(12, e.clientX - box.left - 20), box.width - 352);
      const y = Math.max(60, Math.min(e.clientY - box.top + 14, box.height - (p.img ? 470 : 230)));
      if (p.video) {
        setPop({ kind: "video", path: parsePath(p.video), x, y, label: "film video" });
        return;
      }
      if (p.img) {
        setPop({ kind: "image", path: parsePath(p.img), x, y, label: pretty(parsePath(p.img)) });
        return;
      }
      // Try the clicked words, then their parents, so a word inside a headline finds the whole headline.
      let hit = null;
      let el: HTMLElement | null = p.el;
      for (let i = 0; i < 4 && el && !hit; i++, el = el.parentElement) {
        const t = el.innerText || "";
        if (t.length > 600) break;
        const f = findText(live.current, t);
        if (f && f.text.replace(/\s+/g, " ").trim().toLowerCase() === t.replace(/\s+/g, " ").replace(/[“”"]/g, "").trim().toLowerCase()) hit = f;
      }
      if (!hit) hit = findText(live.current, p.el.innerText || "");
      if (!hit) {
        setPop(null);
        setNote("That part comes from your design or widgets, not your words. Change it in the Design or Characters step.");
        return;
      }
      setNote("");
      setPop({ kind: "text", path: hit.path, x, y, label: pretty(hit.path) });
    };
    const paste = async (e: ClipboardEvent) => {
      const el = hoverEl.current;
      const path = el?.dataset.video ? "" : el?.dataset.img;
      if (!path || (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) return;
      const f = imageFromClipboard(e);
      if (!f) return;
      e.preventDefault();
      setValue(parsePath(path), await imageToDataUrl(f));
    };
    vp.addEventListener("pointerover", over);
    vp.addEventListener("click", click, true);
    window.addEventListener("paste", paste);
    return () => {
      clear();
      vp.removeEventListener("pointerover", over);
      vp.removeEventListener("click", click, true);
      window.removeEventListener("paste", paste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 4200);
    return () => clearTimeout(t);
  }, [note]);

  const value = pop ? getAt(content, pop.path) : "";

  return (
    <div ref={shell} className={"preview" + (compact ? " is-compact" : "")}>
      <div className="preview-bar">
        <span className="small muted preview-live">
          <span className="live-dot" aria-hidden="true" />
          {editing ? "Click any words or picture to change it" : "Live preview"}
        </span>
        <div className="row wrap" style={{ gap: 6, justifyContent: "flex-end" }}>
          {onContentChange && (
            <button
              className={"btn btn-sm" + (editing ? " btn-primary" : "")}
              aria-pressed={editing}
              onClick={() => {
                setEditing((v) => !v);
                setPop(null);
              }}
              title="Click words and pictures on the page to change them"
            >
              <Icon name={editing ? "check" : "edit"} size={15} />
              {editing ? "Done editing" : "Edit on page"}
            </button>
          )}
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
      <div ref={viewport} data-scroll-root="" className={"preview-viewport" + (device === "mobile" ? " is-mobile" : "") + (editing ? " is-editing" : "")}>
        <div className="preview-device">
          {/* A new key remounts the site so every entrance animation plays again. */}
          <Site key={`${run}-${device}-${replayKey ?? ""}`} design={shownDesign} content={shown} preview scheme={scheme} />
        </div>
      </div>
      {note && (
        <p className="pe-note small" role="status">
          {note}
        </p>
      )}
      {pop && (
        <div className="pe-pop panel" style={{ left: pop.x, top: pop.y }} role="dialog" aria-label={"Edit " + pop.label}>
          <div className="row" style={{ justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <span className="lbl" style={{ margin: 0, textTransform: "capitalize" }}>{pop.label || "Text"}</span>
            <button className="btn btn-ghost btn-sm btn-icon" aria-label="Close" onClick={() => setPop(null)}>
              <Icon name="x" size={15} />
            </button>
          </div>
          {pop.kind === "video" ? (
            <VideoField value={String(value ?? "")} onChange={(v) => setValue(pop.path, v)} autoFocus />
          ) : pop.kind === "image" ? (
            <ImageField value={String(value ?? "")} onChange={(v) => setValue(pop.path, v)} autoFocus />
          ) : (
            <textarea
              autoFocus
              rows={Math.min(8, Math.max(2, Math.ceil(String(value ?? "").length / 42)))}
              value={String(value ?? "")}
              onChange={(e) => setValue(pop.path, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) setPop(null);
              }}
            />
          )}
          <p className="small muted" style={{ marginTop: 8 }}>
            {pop.kind !== "text" ? "Changes show on the page straight away." : "Changes show as you type. Press Esc when done."}
          </p>
        </div>
      )}
    </div>
  );
}
