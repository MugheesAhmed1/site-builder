"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { TONES, applyCopy, collectCopy, diffCopy, fieldLabel, localPolish, siteBrief, type RefineResult, type RefineTask, type RefineTone } from "@/lib/refine";
import type { Project, SiteContent, WebsiteContent } from "@/lib/types";

// Wording tools in the Content panel: polish every word, new openings, suggested questions.
// The words go to this builder's own server route, which holds any service key; nothing is
// sent until the person presses a button, and every change is shown for review before it is
// applied. Without the server service the panel offers a local tidy-up. The product never
// names how the words are written (PRD section 27).

type Update = (fn: (prev: Project) => Project) => void;
type Change = { key: string; from: string; to: string; on: boolean };

const ease = [0.23, 1, 0.32, 1] as const;

async function ask(task: RefineTask, p: Project, tone: RefineTone, note: string): Promise<RefineResult> {
  const content = p.content!;
  const copy = collectCopy(content);
  try {
    const res = await fetch("/api/refine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task, tone, note: note || undefined, kind: p.kind, brief: siteBrief(content, p.kind), copy }),
    });
    const data = (await res.json()) as RefineResult;
    return data;
  } catch {
    return { ok: false, source: "local", error: "The refine service could not be reached." };
  }
}

export default function RefinePanel({ p, update }: { p: Project; update: Update }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [tone, setTone] = useState<RefineTone>("keep");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<RefineTask | "local" | null>(null);
  const [error, setError] = useState("");
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [source, setSource] = useState<"server" | "local">("server");
  const [headlines, setHeadlines] = useState<{ headline: string; sub: string }[] | null>(null);
  const [faq, setFaq] = useState<{ question: string; answer: string; on: boolean }[] | null>(null);
  const [done, setDone] = useState("");

  useEffect(() => {
    let on = true;
    fetch("/api/refine", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => on && setEnabled(!!d.enabled))
      .catch(() => on && setEnabled(false));
    return () => {
      on = false;
    };
  }, []);

  const content = p.content!;
  const copy = useMemo(() => collectCopy(content), [content]);
  const isPortfolio = p.kind === "portfolio";

  const reset = () => (setChanges(null), setHeadlines(null), setFaq(null), setError(""), setDone(""));

  const runLocal = () => {
    reset();
    const list = diffCopy(copy, localPolish(copy)).map((c) => ({ ...c, on: true }));
    setSource("local");
    setChanges(list);
    if (!list.length) setDone("Everything already reads cleanly. Nothing to tidy.");
  };

  const run = async (task: RefineTask) => {
    reset();
    setBusy(task);
    const r = await ask(task, p, tone, note);
    setBusy(null);
    if (!r.ok) {
      if (r.error === "no-key") {
        setEnabled(false);
        if (task === "polish") runLocal();
        else setError("New openings and questions are not switched on for this builder yet. The local tidy-up still works.");
      } else setError(r.error || "Something went wrong. Your words are unchanged.");
      return;
    }
    setSource("server");
    if (task === "polish" && r.copy) {
      const list = diffCopy(copy, r.copy).map((c) => ({ ...c, on: true }));
      setChanges(list);
      if (!list.length) setDone("Nothing to improve. Your words are already in good shape.");
    }
    if (task === "headline") setHeadlines(r.headlines?.length ? r.headlines : null);
    if (task === "faq") setFaq(r.faq?.length ? r.faq.map((f) => ({ ...f, on: true })) : null);
  };

  const applyChanges = () => {
    if (!changes) return;
    const picked = Object.fromEntries(changes.filter((c) => c.on).map((c) => [c.key, c.to]));
    if (!Object.keys(picked).length) return;
    update((prev) => (prev.content ? { ...prev, content: applyCopy(prev.content, picked) } : prev));
    setDone(`${Object.keys(picked).length} ${Object.keys(picked).length === 1 ? "change" : "changes"} applied. Undo (Ctrl+Z) takes them back.`);
    setChanges(null);
  };

  const pickHeadline = (h: { headline: string; sub: string }) => {
    update((prev) => {
      if (!prev.content) return prev;
      const hero = { ...prev.content.hero } as Record<string, unknown>;
      if (prev.kind === "portfolio") {
        hero.tagline = h.headline;
        if (h.sub) hero.intro = h.sub;
      } else {
        hero.headline = h.headline;
        if (h.sub) hero.sub = h.sub;
      }
      return { ...prev, content: { ...prev.content, hero } as unknown as SiteContent };
    });
    setDone("New opening applied. Undo (Ctrl+Z) brings the old one back.");
    setHeadlines(null);
  };

  const addFaq = () => {
    if (!faq) return;
    const picked = faq.filter((f) => f.on).map(({ question, answer }) => ({ question, answer }));
    if (!picked.length) return;
    update((prev) => {
      if (!prev.content || prev.kind !== "website") return prev;
      const c = prev.content as WebsiteContent;
      const sections = c.sections.includes("faq") ? c.sections : ([...c.sections.filter((s) => s !== "contact"), "faq", ...(c.sections.includes("contact") ? ["contact"] : [])] as WebsiteContent["sections"]);
      return { ...prev, content: { ...c, faq: [...c.faq, ...picked], sections } };
    });
    setDone(`${picked.length} ${picked.length === 1 ? "question" : "questions"} added to your FAQ. Check the answers in Page, Words.`);
    setFaq(null);
  };

  return (
    <div className="rf">
      <div className="card rf-card">
        <h2 className="rf-h">How should it sound?</h2>
        <div className="rf-tones" role="radiogroup" aria-label="Tone">
          {TONES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={tone === t.id} className={"chip" + (tone === t.id ? " is-on" : "")} onClick={() => setTone(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="rf-note">
          <span className="small muted">Anything the writer should know? (optional)</span>
          <input type="text" value={note} maxLength={300} placeholder="We are family run since 1998, keep it simple" onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>

      <div className="rf-actions">
        <button type="button" className="rf-action" disabled={!!busy} onClick={() => (enabled ? run("polish") : runLocal())}>
          <Icon name="sparkle" size={20} />
          <span>
            <b>{enabled ? "Polish every word" : "Tidy every word"}</b>
            <span className="small muted">{enabled ? `Sends ${Object.keys(copy).length} lines of copy. Links, prices and contact details stay here.` : "Fixes spacing, capitals, doubled words and long buttons on this device."}</span>
          </span>
          {busy === "polish" && <span className="rf-spin" aria-label="Working" />}
        </button>
        <button type="button" className="rf-action" disabled={!!busy || !enabled} onClick={() => run("headline")}>
          <Icon name="edit" size={20} />
          <span>
            <b>Three new openings</b>
            <span className="small muted">Fresh headline and sub line options. Pick one or keep yours.</span>
          </span>
          {busy === "headline" && <span className="rf-spin" aria-label="Working" />}
        </button>
        {!isPortfolio && (
          <button type="button" className="rf-action" disabled={!!busy || !enabled} onClick={() => run("faq")}>
            <Icon name="plus" size={20} />
            <span>
              <b>Suggest questions</b>
              <span className="small muted">Questions visitors ask that your site does not answer yet.</span>
            </span>
            {busy === "faq" && <span className="rf-spin" aria-label="Working" />}
          </button>
        )}
        {enabled && (
          <button type="button" className="btn btn-ghost btn-sm rf-local" disabled={!!busy} onClick={runLocal}>
            Or tidy on this device only
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p key="err" className="rf-msg is-error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }}>
            {error}
          </motion.p>
        )}
        {done && (
          <motion.p key="done" className="rf-msg" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }}>
            <Icon name="check" size={16} /> {done}
          </motion.p>
        )}
      </AnimatePresence>

      {changes && changes.length > 0 && (
        <section className="rf-review" aria-label="Suggested changes">
          <header className="row between">
            <h2 className="rf-h">
              {changes.filter((c) => c.on).length} of {changes.length} changes {source === "server" ? "suggested" : "from the tidy-up"}
            </h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChanges(changes.map((c) => ({ ...c, on: !changes.every((x) => x.on) })))}>
              {changes.every((c) => c.on) ? "None" : "All"}
            </button>
          </header>
          <ul>
            {changes.map((c, i) => (
              <motion.li key={c.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease, delay: Math.min(i * 0.03, 0.4) }}>
                <label className={"rf-change" + (c.on ? " is-on" : "")}>
                  <input type="checkbox" checked={c.on} onChange={() => setChanges(changes.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
                  <span>
                    <span className="rf-field">{fieldLabel(c.key)}</span>
                    <del>{c.from}</del>
                    <ins>{c.to}</ins>
                  </span>
                </label>
              </motion.li>
            ))}
          </ul>
          <div className="row rf-apply">
            <button type="button" className="btn btn-primary" onClick={applyChanges} disabled={!changes.some((c) => c.on)}>
              Apply {changes.filter((c) => c.on).length} changes
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setChanges(null)}>
              Discard
            </button>
          </div>
        </section>
      )}

      {headlines && (
        <section className="rf-review" aria-label="Opening options">
          <h2 className="rf-h">Pick an opening</h2>
          <div className="rf-heads">
            {headlines.map((h, i) => (
              <motion.button key={i} type="button" className="rf-head" onClick={() => pickHeadline(h)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease, delay: i * 0.06 }}>
                <b>{h.headline}</b>
                <span className="small muted">{h.sub}</span>
                <span className="rf-use small">
                  Use this <Icon name="arrow" size={14} />
                </span>
              </motion.button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHeadlines(null)}>
            Keep mine
          </button>
        </section>
      )}

      {faq && (
        <section className="rf-review" aria-label="Suggested questions">
          <h2 className="rf-h">Suggested questions</h2>
          <p className="small muted">Check each answer is true for you before adding it.</p>
          <ul>
            {faq.map((f, i) => (
              <li key={i}>
                <label className={"rf-change" + (f.on ? " is-on" : "")}>
                  <input type="checkbox" checked={f.on} onChange={() => setFaq(faq.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
                  <span>
                    <b>{f.question}</b>
                    <span className="small">{f.answer}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="row rf-apply">
            <button type="button" className="btn btn-primary" onClick={addFaq} disabled={!faq.some((f) => f.on)}>
              Add {faq.filter((f) => f.on).length} to my FAQ
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setFaq(null)}>
              Discard
            </button>
          </div>
        </section>
      )}

      <p className="small muted rf-fine">
        Polishing is optional. Only the words listed above go to this builder&apos;s server, never your contact details, links or pictures.
      </p>
    </div>
  );
}
