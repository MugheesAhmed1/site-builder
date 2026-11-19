"use client";

import { Reorder, useDragControls } from "motion/react";
import { useState } from "react";
import FieldsEditor from "@/components/FieldsEditor";
import Icon from "@/components/Icon";
import { PORTFOLIO_SECTIONS, WEBSITE_SECTIONS } from "@/components/Steps";
import {
  hasHandEdits,
  restoreVersion,
  rewriteFromDetails,
} from "@/lib/project";
import { briefInput } from "@/lib/experience";
import type { Project, SiteContent } from "@/lib/types";
import { generateExperience, optionsOf } from "@/packages/experience-core";

// Page (PRD section 30): reorder, add, remove, hide and show sections, every word in a form,
// and earlier versions.

type Update = (fn: (prev: Project) => Project) => void;

function SectionRow({
  id,
  label,
  empty,
  hidden,
  onHide,
  onOff,
  onMove,
  first,
  last,
}: {
  id: string;
  label: string;
  empty: boolean;
  hidden: boolean;
  onHide?: () => void;
  onOff?: () => void;
  onMove: (d: number) => void;
  first: boolean;
  last: boolean;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      className="pn-section"
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 14px 34px -14px rgb(0 0 0 / 0.45)",
      }}
    >
      <button
        type="button"
        className="pn-grip"
        aria-label={`Drag ${label} to reorder`}
        onPointerDown={(e) => controls.start(e)}
      >
        <Icon name="drag" size={16} />
      </button>
      <span className={"grow" + (hidden ? " muted" : "")}>
        {label}
        {empty && <span className="small muted"> · empty</span>}
        {hidden && <span className="small muted"> · hidden</span>}
      </span>
      {onHide && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-pressed={hidden}
          aria-label={
            hidden ? `Show ${label}` : `Hide ${label} but keep its words`
          }
          title={
            hidden ? "Show it again" : "Hide it but keep its words and place"
          }
          onClick={onHide}
        >
          {hidden ? "Show" : "Hide"}
        </button>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon"
        aria-label={`Move ${label} up`}
        disabled={first}
        onClick={() => onMove(-1)}
      >
        <Icon name="up" size={15} />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon"
        aria-label={`Move ${label} down`}
        disabled={last}
        onClick={() => onMove(1)}
      >
        <Icon name="down" size={15} />
      </button>
      {onOff ? (
        <button
          type="button"
          className="pn-switch is-on"
          role="switch"
          aria-checked="true"
          aria-label={`Remove ${label} from the page`}
          title="Remove from the page"
          onClick={onOff}
        >
          <span />
        </button>
      ) : (
        <span className="small muted" title="This section is in your PRD. Remove it from the PRD to take it off the site.">
          PRD
        </span>
      )}
    </Reorder.Item>
  );
}

export default function PagePanel({
  p,
  update,
}: {
  p: Project;
  update: Update;
}) {
  const [tab, setTab] = useState<"sections" | "words" | "versions">("sections");
  const c = p.content;
  if (!c) return null;
  const labels = p.kind === "portfolio" ? PORTFOLIO_SECTIONS : WEBSITE_SECTIONS;
  const sections = c.sections as string[];
  // Sections that carry the PRD cannot be removed or hidden here: the PRD says they are on the site.
  const blocks = ((c as { blocks?: { id: string; heading: string }[] }).blocks ?? []);
  const blockLabel = (sid: string) => blocks.find((b) => "b-" + b.id === sid)?.heading;
  const inPrd = (sid: string) => !!p.prd && sid.startsWith("b-") && p.prd.sections.some((s) => "b-" + s.id === sid);
  const off = Object.keys(labels).filter((s) => !sections.includes(s));
  const setContent = (content: SiteContent) =>
    update((prev) => ({ ...prev, content }));
  const setSections = (s: string[]) =>
    setContent({ ...c, sections: s } as SiteContent);
  const isEmpty = (sid: string) => {
    const v = (c as unknown as Record<string, unknown>)[sid];
    return Array.isArray(v) && v.length === 0;
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= sections.length) return;
    const out = sections.slice();
    [out[i], out[j]] = [out[j], out[i]];
    setSections(out);
  };
  const edited = hasHandEdits(p);
  // Hide keeps a section's words and place but leaves it off the page (PRD section 30, Page).
  const withScene = new Set((p.experience?.scenes ?? []).map((s) => s.section));
  const hiddenSet = new Set(
    (p.experience?.scenes ?? []).filter((s) => s.hidden).map((s) => s.section),
  );
  const toggleHidden = (sid: string) =>
    update((prev) => {
      if (!prev.experience) return prev;
      const hidden = new Set(
        prev.experience.scenes.filter((s) => s.hidden).map((s) => s.section),
      );
      if (hidden.has(sid)) hidden.delete(sid);
      else hidden.add(sid);
      const next = generateExperience(briefInput(prev), {
        ...optionsOf(prev.experience),
        hidden: [...hidden],
        channels:
          prev.experience.control === "custom"
            ? prev.experience.channels
            : undefined,
      });
      return {
        ...prev,
        experience: { ...next, directions: prev.experience.directions },
      };
    });

  return (
    <div className="pn-stack">
      <div className="seg pn-seg-fill" role="tablist" aria-label="Page tools">
        {(["sections", "words", "versions"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "is-on" : ""}
            onClick={() => setTab(t)}
          >
            {t === "sections"
              ? "Sections"
              : t === "words"
                ? "Words"
                : "Versions"}
          </button>
        ))}
      </div>

      {tab === "sections" && (
        <>
          <section className="pn-card">
            <div className="pn-card-head">
              <h3>On the page</h3>
              <p className="small muted">
                Drag to reorder. Hide keeps a section for later; the switch
                removes it.
              </p>
            </div>
            <Reorder.Group
              axis="y"
              values={sections}
              onReorder={setSections}
              className="pn-sections"
            >
              {sections.map((sid, i) => (
                <SectionRow
                  key={sid}
                  id={sid}
                  label={labels[sid] ?? blockLabel(sid) ?? sid}
                  empty={isEmpty(sid)}
                  hidden={hiddenSet.has(sid)}
                  onHide={
                    withScene.has(sid) && !(inPrd(sid) && !hiddenSet.has(sid)) ? () => toggleHidden(sid) : undefined
                  }
                  first={i === 0}
                  last={i === sections.length - 1}
                  onMove={(d) => move(i, d)}
                  onOff={inPrd(sid) ? undefined : () => setSections(sections.filter((x) => x !== sid))}
                />
              ))}
            </Reorder.Group>
          </section>
          {off.length > 0 && (
            <section className="pn-card">
              <div className="pn-card-head">
                <h3>Switched off</h3>
              </div>
              <ul className="pn-sections">
                {off.map((sid) => (
                  <li key={sid} className="pn-section is-off">
                    <span className="grow">
                      {labels[sid] ?? sid}
                      {isEmpty(sid) && (
                        <span className="small muted">
                          {" "}
                          · empty, add words first
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="pn-switch"
                      role="switch"
                      aria-checked="false"
                      aria-label={`Show ${labels[sid] ?? sid}`}
                      onClick={() =>
                        setSections([
                          ...sections.filter((x) => x !== "contact"),
                          sid,
                          ...(sections.includes("contact") ? ["contact"] : []),
                        ])
                      }
                    >
                      <span />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {tab === "words" && (
        <section className="pn-card">
          <div className="pn-card-head">
            <h3>Every word</h3>
            <p className="small muted">
              Or press Edit on page above the preview and click what you want to
              change.
            </p>
          </div>
          <FieldsEditor value={c} onChange={setContent} skip={["sections"]} />
        </section>
      )}

      {tab === "versions" && (
        <>
          <section className="pn-card">
            <div className="pn-card-head">
              <h3>Write it again from your details</h3>
              <p className="small muted">
                {edited
                  ? "Your page has words or pictures you changed by hand. Rewriting replaces them; this version is kept below."
                  : "Your page matches your details. There is nothing to rewrite."}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!edited}
              onClick={() =>
                confirm(
                  "Rewrite the page from your details? Hand edits are replaced. You can restore this version afterwards.",
                ) && update(rewriteFromDetails)
              }
            >
              <Icon name="undo" size={15} />
              Rewrite from details
            </button>
          </section>
          <section className="pn-card">
            <div className="pn-card-head">
              <h3>Earlier versions</h3>
            </div>
            {p.history.length === 0 ? (
              <p className="small muted">
                Nothing yet. A version is kept each time the page is rewritten
                or restored. For small slips, use Undo in the top bar.
              </p>
            ) : (
              <ul className="pn-versions">
                {p.history.map((h, i) => (
                  <li key={h.at + i}>
                    <span>
                      <b>{h.label}</b>
                      <span className="small muted">
                        {" "}
                        {new Date(h.at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => update((prev) => restoreVersion(prev, i))}
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
