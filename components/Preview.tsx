"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import Inspector, { type Picked } from "@/components/Inspector";
import { cachedMediaUrl, mediaRefs, mediaUrl, swapMedia } from "@/lib/media";
// The exact same components that ship in the downloaded project.
import Portfolio from "@/template/src/Portfolio.jsx";
import Website from "@/template/src/Website.jsx";
import { findText, getAt, imageFromClipboard, imageToDataUrl, parsePath, setAt, type Path } from "@/lib/edit";
import { editFind, editKey, ownWords, patchEdits } from "@/template/src/edits.js";
import type { Design, ElementEdit, SiteContent, SiteKind } from "@/lib/types";

// Edit on page: click anything to change it. Words, pictures, icons and vectors, buttons,
// backgrounds, widgets, the live scene, page colours. Works like a page builder, on the real
// site: what changes here is exactly what the download ships.

const INLINE = /^(span|em|strong|b|i|u|small|mark|sup|sub)$/;
const SECTION_NAMES: Record<string, string> = { top: "opening", cta: "call to action", faq: "questions", visit: "address and hours" };

function sectionName(el: Element): string {
  const s = el.closest('[id^="pf-"]');
  if (!s) return el.closest("footer") ? "footer" : el.closest("header, nav") ? "top bar" : "";
  const id = s.id.slice(3);
  return SECTION_NAMES[id] || id.replace(/-\d+$/, "").replace(/-/g, " ");
}

// A plain name for an element, the way a person would call it.
function nameOf(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const cls = typeof el.className === "string" ? el.className : "";
  let what = "Box";
  if (el.classList.contains("pf")) return "Whole page";
  if (tag === "canvas" || el.classList.contains("sc")) what = "Live scene";
  else if (el.hasAttribute("data-video")) what = "Video";
  else if (tag === "img" || el.hasAttribute("data-img")) what = "Picture";
  else if (tag === "svg") what = "Icon or vector";
  else if (tag === "video") what = "Video";
  else if (/^h[1-6]$/.test(tag)) what = tag === "h1" ? "Headline" : "Heading";
  else if (tag === "button" || /\bbtn\b|pf-btn|-cta\b/.test(cls)) what = "Button";
  else if (tag === "a") what = "Link";
  else if (tag === "p" || tag === "blockquote" || tag === "figcaption") what = "Text";
  else if (tag === "li" || tag === "dt" || tag === "dd") what = "List item";
  else if (tag === "section") return "Section: " + (sectionName(el) || "page");
  else if (tag === "header" || tag === "nav") return "Top bar";
  else if (tag === "footer") return "Footer";
  else if (/card|tile|cell|panel|plan|widget|cw-/.test(cls)) what = /widget|cw-/.test(cls) ? "Widget" : "Card";
  else if (/badge|chip|tag|pill|kicker/.test(cls)) what = "Label";
  else if (/hero/.test(cls)) what = "Opening area";
  else if (INLINE.test(tag)) what = "Words";
  const where = sectionName(el);
  return where && what !== "Opening area" ? what + " in " + where : what;
}

type Snap = { content: SiteContent; edits: Design["edits"]; colors: Design["colors"]; scene: Design["scene"]; sceneMode: Design["sceneMode"]; heroStyle: Design["heroStyle"] };

export default function Preview({
  kind,
  design,
  content,
  compact,
  replayKey,
  onContentChange,
  onDesignChange,
}: {
  kind: SiteKind;
  design: Design;
  content: SiteContent;
  compact?: boolean;
  replayKey?: string | number;
  onContentChange?: (c: SiteContent) => void;
  onDesignChange?: (patch: Partial<Design>) => void;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [run, setRun] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const hoverBox = useRef<HTMLDivElement>(null);
  const pickBox = useRef<HTMLDivElement>(null);
  const [scheme, setScheme] = useState<"light" | "dark">(design.mode === "dark" ? "dark" : "light");
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [panel, setPanel] = useState(false); // the inspector is open (page settings when nothing is picked)
  const [note, setNote] = useState("");
  const hoverEl = useRef<Element | null>(null);
  const pickEl = useRef<Element | null>(null);
  const live = useRef(content);
  live.current = content;
  const liveDesign = useRef(design);
  liveDesign.current = design;
  // Follow the design's starting theme when it changes (a new system, for example).
  useEffect(() => {
    if (design.mode !== "auto") setScheme(design.mode);
  }, [design.mode]);
  const Site = (kind === "website" ? Website : Portfolio) as React.ComponentType<{ design: Design; content: SiteContent; preview: boolean; scheme: string; editing?: boolean }>;

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

  // ---------------------------------------------------------------- undo and redo
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const lastPush = useRef({ at: 0, tag: "" });
  const [, setTick] = useState(0);
  const snap = (): Snap => ({ content: live.current, edits: liveDesign.current.edits, colors: liveDesign.current.colors, scene: liveDesign.current.scene, sceneMode: liveDesign.current.sceneMode, heroStyle: liveDesign.current.heroStyle });
  // Typing or dragging a slider is one step, not one per keystroke.
  const remember = (tag: string) => {
    const now = Date.now();
    if (tag === lastPush.current.tag && now - lastPush.current.at < 900) {
      lastPush.current.at = now;
      return;
    }
    lastPush.current = { at: now, tag };
    past.current = [...past.current.slice(-49), snap()];
    future.current = [];
    setTick((n) => n + 1);
  };
  const restore = (s: Snap) => {
    lastPush.current = { at: 0, tag: "" };
    if (s.content !== live.current) onContentChange?.(s.content);
    onDesignChange?.({ edits: s.edits, colors: s.colors, scene: s.scene, sceneMode: s.sceneMode, heroStyle: s.heroStyle });
  };
  const undo = () => {
    const s = past.current.pop();
    if (!s) return;
    future.current.push(snap());
    restore(s);
    setTick((n) => n + 1);
  };
  const redo = () => {
    const s = future.current.pop();
    if (!s) return;
    past.current.push(snap());
    restore(s);
    setTick((n) => n + 1);
  };

  const setValue = (path: Path, v: unknown) => {
    if (!onContentChange) return;
    remember("c:" + path.join("."));
    onContentChange(setAt(live.current, path, v));
  };
  const setEdit = (key: string, patch: Partial<ElementEdit> | null) => {
    if (!onDesignChange || !key) return;
    remember("e:" + key + ":" + (patch ? Object.keys(patch).join(",") : "reset"));
    const cur = liveDesign.current.edits || {};
    let next: Record<string, ElementEdit>;
    if (patch === null) {
      next = { ...cur };
      delete next[key];
    } else next = patchEdits(cur, key, patch) as Record<string, ElementEdit>;
    onDesignChange({ edits: Object.keys(next).length ? next : undefined });
  };
  const setDesign = (patch: Partial<Design>) => {
    if (!onDesignChange) return;
    remember("d:" + Object.keys(patch).join(","));
    onDesignChange(patch);
  };

  const root = () => viewport.current?.querySelector(".pf") as HTMLElement | null;

  // Everything the inspector needs to know about an element.
  const describe = (el: Element, at?: { x: number; y: number }): Picked | null => {
    const r = root();
    if (!r || !r.contains(el)) return null;
    const tag = el.tagName.toLowerCase();
    const h = el as HTMLElement;
    const videoPath = h.dataset?.video || "";
    const imgPath = videoPath || h.dataset?.img || "";
    const media = /^(img|svg|canvas|video)$/.test(tag);
    const isScene = tag === "canvas" || el.classList.contains("sc") || el.classList.contains("sc-canvas");
    let contentPath = "";
    const shownText = media ? "" : (h.innerText || "").trim();
    if (shownText && shownText.length <= 600 && !imgPath) {
      const f = findText(live.current, shownText);
      const same = (a: string, b: string) => a.replace(/\s+/g, " ").replace(/[“”"]/g, "").trim().toLowerCase() === b.replace(/\s+/g, " ").replace(/[“”"]/g, "").trim().toLowerCase();
      if (f && same(f.text, shownText)) contentPath = f.path.join(".");
    }
    const own = media ? "" : ownWords(el);
    const chain: Picked["chain"] = [];
    for (let n: Element | null = el, i = 0; n && i < 7; n = n === r ? null : n.parentElement) {
      const k = editKey(n, r);
      if (k && (n === el || !INLINE.test(n.tagName.toLowerCase()))) {
        chain.push({ key: k, label: nameOf(n) });
        i++;
      }
    }
    const under: Picked["under"] = [];
    if (at) {
      const seen = new Set(chain.map((c) => c.key));
      // Scenes and backdrops often let clicks pass through, so pictures are also found by where they sit.
      const stacked: Element[] = [...document.elementsFromPoint(at.x, at.y)];
      r.querySelectorAll("canvas, img, video").forEach((m) => {
        const b = m.getBoundingClientRect();
        if (b.width > 40 && b.height > 40 && at.x >= b.left && at.x <= b.right && at.y >= b.top && at.y <= b.bottom && !stacked.includes(m) && getComputedStyle(m).visibility !== "hidden") stacked.push(m);
      });
      for (const u of stacked) {
        if (!r.contains(u) || u === r || u.contains(el) || el.contains(u)) continue;
        const t = u.tagName.toLowerCase();
        // Only things worth reaching: scenes, pictures, vectors and areas with a background of their own.
        const cs = getComputedStyle(u);
        const painted = /^(canvas|img|svg|video)$/.test(t) || cs.backgroundImage !== "none" || (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent");
        if (!painted) continue;
        const k = editKey(t === "path" ? u.closest("svg") : u, r);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        under.push({ key: k, label: nameOf(u) });
        if (under.length >= 5) break;
      }
    }
    return { key: editKey(el, r), label: nameOf(el), tag, media, hasText: !!own || !!contentPath, ownText: own, contentPath, imgPath: videoPath ? "" : imgPath, videoPath, isLink: tag === "a", isScene, chain, under };
  };

  // What a click means: the picture slot, the whole vector, or the words (walking up from a
  // single letter or word to the line that holds the person's text).
  const resolve = (t: EventTarget | null): Element | null => {
    let n = t as Element | null;
    const r = root();
    if (!n || !r || !n.closest || !r.contains(n)) return null;
    const own = n.closest("[data-pe-own]");
    if (own) return own.previousElementSibling;
    const vid = n.closest("[data-video]");
    if (vid) return vid;
    const slot = n.closest("[data-img]");
    if (slot) return slot;
    const svg = n.closest("svg");
    if (svg) return svg;
    // Climb out of split letters and words to the element that holds the person's whole line.
    const same = (x: string, y: string) => x.replace(/\s+/g, " ").replace(/[“”"]/g, "").trim().toLowerCase() === y.replace(/\s+/g, " ").replace(/[“”"]/g, "").trim().toLowerCase();
    const holds = (el: Element) => {
      const t = ((el as HTMLElement).innerText || "").trim();
      const f = t && t.length <= 600 ? findText(live.current, t) : null;
      return !!f && same(f.text, t);
    };
    if (INLINE.test(n.tagName.toLowerCase()) && !holds(n)) {
      for (let up = n.parentElement, i = 0; up && up !== r && i < 4; up = up.parentElement, i++) {
        if (holds(up)) {
          n = up;
          break;
        }
        if (!INLINE.test(up.tagName.toLowerCase()) && ownWords(up)) break;
      }
    }
    // A line wrapped in one span (split headlines) means the heading itself.
    for (let i = 0; i < 3 && n && INLINE.test(n.tagName.toLowerCase()) && n.parentElement && n.parentElement !== r; i++) {
      const up: Element = n.parentElement;
      if (((up as HTMLElement).innerText || "").trim() !== ((n as HTMLElement).innerText || "").trim()) break;
      n = up;
    }
    // A wrapper that holds nothing but one picture, vector or scene means that thing.
    for (let d: Element | null = n, i = 0; d && i < 4; i++) {
      if (/^(svg|img|canvas|video)$/.test(d.tagName.toLowerCase())) return d;
      if (d.children.length !== 1 || ownWords(d)) break;
      d = d.children[0];
    }
    return n;
  };

  const select = (el: Element | null, at?: { x: number; y: number }) => {
    const d = el ? describe(el, at) : null;
    pickEl.current = d ? el : null;
    setPicked(d);
    if (d) setPanel(true);
  };
  const selectKey = (key: string) => {
    const el = editFind(root(), key);
    if (el) {
      select(el);
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  // Hover outline, click to select, paste a picture straight onto a slot, undo with the keyboard.
  useEffect(() => {
    const vp = viewport.current;
    if (!vp || !editing) return;
    const over = (e: PointerEvent) => {
      hoverEl.current = resolve(e.target);
    };
    const out = () => (hoverEl.current = null);
    const click = (e: MouseEvent) => {
      if ((e.target as Element).closest?.(".pe-boxes")) return;
      let el = resolve(e.target);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      // A click on the see-through corner of a vector or picture lands on the box around it.
      // If exactly one picture, vector or scene inside that box sits under the pointer, it is meant.
      if (!/^(svg|img|canvas|video)$/i.test(el.tagName) && !ownWords(el) && !(el as HTMLElement).dataset?.img) {
        const hits = [...el.querySelectorAll("svg, img, canvas, video")].filter((m) => {
          const b = m.getBoundingClientRect();
          return !m.closest("[data-pe-own]") && e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
        });
        if (hits.length === 1) el = hits[0];
      }
      select(el, { x: e.clientX, y: e.clientY });
    };
    const stop = (e: Event) => {
      // Links, forms and live widgets stay still while editing.
      if (resolve(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const paste = async (e: ClipboardEvent) => {
      const el = (pickEl.current || hoverEl.current) as HTMLElement | null;
      const path = el?.dataset?.video ? "" : el?.dataset?.img;
      if (!path || (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) return;
      const f = imageFromClipboard(e);
      if (!f) return;
      e.preventDefault();
      setValue(parsePath(path), await imageToDataUrl(f));
    };
    const key = (e: KeyboardEvent) => {
      const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "Escape") {
        if (typing) (document.activeElement as HTMLElement).blur();
        else {
          pickEl.current = null;
          setPicked(null);
        }
      }
    };
    vp.addEventListener("pointerover", over);
    vp.addEventListener("pointerleave", out);
    vp.addEventListener("click", click, true);
    vp.addEventListener("submit", stop, true);
    vp.addEventListener("pointerdown", stop, true);
    window.addEventListener("paste", paste);
    window.addEventListener("keydown", key);
    return () => {
      hoverEl.current = null;
      vp.removeEventListener("pointerover", over);
      vp.removeEventListener("pointerleave", out);
      vp.removeEventListener("click", click, true);
      vp.removeEventListener("submit", stop, true);
      vp.removeEventListener("pointerdown", stop, true);
      window.removeEventListener("paste", paste);
      window.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // The outlines are drawn over the page instead of on its elements, so the site's own
  // markup is never touched. They follow scrolling, animation and resizing.
  useEffect(() => {
    if (!editing) return;
    let raf = 0;
    const place = (box: HTMLDivElement | null, el: Element | null) => {
      const vp = viewport.current;
      if (!box || !vp) return;
      if (!el || !el.isConnected) {
        box.style.display = "none";
        return;
      }
      const a = vp.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      if (b.width < 1 && b.height < 1) {
        box.style.display = "none";
        return;
      }
      box.style.display = "block";
      box.style.left = b.left - a.left + vp.scrollLeft + "px";
      box.style.top = b.top - a.top + vp.scrollTop + "px";
      box.style.width = b.width + "px";
      box.style.height = b.height + "px";
    };
    const frame = () => {
      place(pickBox.current, pickEl.current);
      place(hoverBox.current, hoverEl.current && hoverEl.current !== pickEl.current ? hoverEl.current : null);
      if (hoverBox.current && hoverEl.current) hoverBox.current.dataset.name = nameOf(hoverEl.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [editing]);

  // After the page re-renders, find the selected element again by its key (or let go of it).
  useEffect(() => {
    if (!picked) return;
    const t = setTimeout(() => {
      const el = pickEl.current;
      if (el && el.isConnected) {
        const d = describe(el);
        if (d && (d.contentPath !== picked.contentPath || d.ownText !== picked.ownText || d.key !== picked.key || d.hasText !== picked.hasText)) setPicked({ ...d, under: picked.under });
        return;
      }
      const again = picked.key ? editFind(root(), picked.key) : null;
      pickEl.current = again;
      setPicked(again ? describe(again) : null);
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, design, run, device, scheme]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 4200);
    return () => clearTimeout(t);
  }, [note]);

  const edits = design.edits || {};
  const contentValue = picked ? String(getAt(content, parsePath(picked.videoPath || picked.imgPath || picked.contentPath || "~")) ?? "") : "";
  const [labels, setLabels] = useState<{ key: string; label: string; missing: boolean }[]>([]);
  const editSig = Object.keys(edits).join("\n");
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(() => {
      const r = root();
      setLabels(
        Object.keys(edits).map((key) => {
          const el = editFind(r, key);
          return { key, label: el ? nameOf(el) : key.split("|")[1] || "Element", missing: !el };
        })
      );
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSig, editing, run, device, panel]);

  const canEdit = !!onContentChange;
  const inspecting = editing && panel;

  return (
    <div ref={shell} className={"preview" + (compact ? " is-compact" : "") + (inspecting ? " is-inspecting" : "")}>
      <div className="preview-bar">
        <span className="small muted preview-live">
          <span className="live-dot" aria-hidden="true" />
          {editing ? "Click anything on the page to change it" : "Live preview"}
        </span>
        <div className="row wrap" style={{ gap: 6, justifyContent: "flex-end" }}>
          {canEdit && editing && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={undo} disabled={!past.current.length} title="Undo (Ctrl or Cmd + Z)">
                <Icon name="undo" size={15} />
                Undo
              </button>
              <button className="btn btn-ghost btn-sm" onClick={redo} disabled={!future.current.length} title="Redo (Ctrl or Cmd + Shift + Z)">
                Redo
              </button>
              <button
                className={"btn btn-sm" + (panel && !picked ? " is-on" : "")}
                aria-pressed={panel && !picked}
                onClick={() => {
                  pickEl.current = null;
                  setPicked(null);
                  setPanel((v) => (picked ? true : !v));
                }}
                title="Page colours, the live scene and a list of everything you changed"
              >
                <Icon name="settings" size={15} />
                Page settings
              </button>
            </>
          )}
          {canEdit && (
            <button
              className={"btn btn-sm" + (editing ? " btn-primary" : "")}
              aria-pressed={editing}
              onClick={() => {
                setEditing((v) => !v);
                setPanel(!editing);
                pickEl.current = null;
                setPicked(null);
              }}
              title="Click words, pictures, icons, buttons and backgrounds on the page to change them"
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
      <div className="preview-work">
        <div ref={viewport} data-scroll-root="" className={"preview-viewport" + (device === "mobile" ? " is-mobile" : "") + (editing ? " is-editing" : "")}>
          <div className="preview-device">
            {/* A new key remounts the site so every entrance animation plays again. */}
            <Site key={`${run}-${device}-${replayKey ?? ""}`} design={shownDesign} content={shown} preview scheme={scheme} editing={editing} />
          </div>
          {editing && (
            <div className="pe-boxes" aria-hidden="true">
              <div ref={hoverBox} className="pe-box pe-box-hover" />
              <div ref={pickBox} className="pe-box pe-box-pick" data-name={picked?.label || ""} />
            </div>
          )}
        </div>
        {inspecting && (
          <Inspector
            picked={picked}
            design={design}
            scheme={scheme}
            edit={(picked && picked.key && edits[picked.key]) || {}}
            contentValue={contentValue}
            editLabels={labels}
            onEdit={setEdit}
            onContent={(path, v) => setValue(parsePath(path), v)}
            onDesign={setDesign}
            onSelect={selectKey}
            onClose={() => {
              if (picked) {
                pickEl.current = null;
                setPicked(null);
              } else setPanel(false);
            }}
            onResetAll={() => {
              if (confirm("Put every element and page colour back as designed? Your words and photos stay.")) setDesign({ edits: undefined, colors: undefined });
            }}
          />
        )}
      </div>
      {note && (
        <p className="pe-note small" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
