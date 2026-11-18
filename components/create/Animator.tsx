"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildContent, localPlan, rankTemplates, type MasterPlan } from "@/lib/animator";
import { blockById } from "@/lib/library-blocks";
import { previewSrc, saveContent, templateById, templateZip, zipName, type Content } from "@/lib/templates";

// The animator engine's face (lib/animator.ts): one line in, a master prompt, then a whole
// moving site built from a template and library blocks, which opens in the studio for any change.

const EXAMPLES = ["dentist clinic in isb", "bakery in lhr", "portfolio for a 3D motion designer", "boutique hotel in murree", "law firm in karachi", "plant-based protein bar brand"];

const STEPS = ["Reading what the business is", "Writing the master prompt", "Choosing a template and blocks", "Writing every word", "Colour, type and motion"] as const;

type Phase = "idle" | "plan" | "write" | "done";

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/animate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "The engine did not answer.");
  return data as T;
}

export default function Animator() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<MasterPlan | null>(null);
  const [prompt, setPrompt] = useState("");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const run = useRef(0);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q");
    if (q) {
      setQuery(q);
      void create(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = plan ? templateById(plan.template) : undefined;
  const content: Content | null = useMemo(() => (t && plan ? buildContent(t, plan, { texts }) : null), [t, plan, texts]);
  const src = useMemo(() => (t && content ? previewSrc(t, content) : ""), [t, plan?.template]); // eslint-disable-line react-hooks/exhaustive-deps
  const latest = useRef(content);
  latest.current = content;
  const send = () => latest.current && frame.current?.contentWindow?.postMessage({ type: "xp-data", data: latest.current }, "*");

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source && e.source === frame.current?.contentWindow && e.data?.type === "xp-ready") send();
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  useEffect(() => void send(), [content]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / 1440));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);

  async function write(p: MasterPlan, id: number) {
    setPhase("write");
    setStep(3);
    setTexts({});
    try {
      const r = await post<{ texts: Record<string, string>; note?: string; written?: number; total?: number }>({ step: "write", plan: p });
      if (id !== run.current) return;
      setStep(4);
      setTexts(r.texts || {});
      if (r.note === "no-key") setNote("AI writing is not switched on here, so the opening and services are written by rules and the rest keep the template's words with your name. Change any of them in the studio.");
      else if (r.note) setNote("The writing service was busy, so some words are still the template's. Try Rewrite in a minute, or change them in the studio.");
      else setNote("");
    } catch (e) {
      if (id !== run.current) return;
      setNote(e instanceof Error ? e.message : "The words could not be written.");
    }
    if (id === run.current) {
      setTimeout(() => id === run.current && setPhase("done"), 500);
    }
  }

  async function create(q = query) {
    const words = q.trim();
    if (words.length < 3) return setError("Say what the business is, for example: dentist clinic in isb.");
    const id = ++run.current;
    setError("");
    setNote("");
    setBusy(true);
    setPhase("plan");
    setStep(0);
    setPlan(null);
    const u = new URL(location.href);
    u.searchParams.set("q", words);
    history.replaceState(null, "", u);
    const tick = setTimeout(() => id === run.current && setStep(1), 600);
    try {
      let p: MasterPlan;
      try {
        p = (await post<{ plan: MasterPlan }>({ step: "plan", query: words })).plan;
      } catch {
        p = localPlan(words);
      }
      if (id !== run.current) return;
      clearTimeout(tick);
      setStep(2);
      setPlan(p);
      setPrompt(p.prompt);
      await write(p, id);
    } finally {
      if (id === run.current) setBusy(false);
    }
  }

  async function change(next: Partial<MasterPlan>, rewrite: boolean) {
    if (!plan) return;
    const p = { ...plan, ...next };
    // Motion also decides the library effects: a scroll line when lively, a cursor too when bold.
    if (next.motion) p.blocks = [...plan.blocks.filter((b) => blockById(b)?.kind !== "effect"), ...(next.motion !== "calm" ? ["scroll-progress"] : []), ...(next.motion === "bold" ? ["custom-cursor"] : [])];
    setPlan(p);
    if (rewrite) {
      const id = ++run.current;
      setBusy(true);
      await write(p, id);
      if (id === run.current) setBusy(false);
    }
  }

  function openStudio() {
    if (!t || !content) return;
    saveContent(t.id, content);
    router.push(`/templates/${t.id}`);
  }

  async function download() {
    if (!t || !content) return;
    setError("");
    try {
      const blob = await templateZip(t, content, "site");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = zipName(t, content, "site");
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The download failed");
    }
  }

  const others = plan ? rankTemplates(plan.business, plan.kind) : [];

  return (
    <div className={"an an-" + phase}>
      <section className="an-hero" aria-labelledby="an-title">
        <p className="eyebrow">
          <span className="mono">Animator engine</span>
        </p>
        <h1 id="an-title">One line in. A moving site out.</h1>
        <p className="lede">Say what the business is. The engine writes a master prompt, chooses a template and blocks for it, then writes every word and sets the colour, type and motion. Everything stays editable.</p>
        <form
          className="an-form"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <label className="sr-only" htmlFor="an-q">
            What is the business?
          </label>
          <input id="an-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="dentist clinic in isb" autoComplete="off" maxLength={300} />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create"}
          </button>
        </form>
        <div className="an-examples" aria-label="Examples">
          {EXAMPLES.map((x) => (
            <button key={x} type="button" className="chip chip-sm" disabled={busy} onClick={() => (setQuery(x), void create(x))}>
              {x}
            </button>
          ))}
        </div>
        {error && (
          <p className="tpl-warn" role="alert">
            {error}
          </p>
        )}
      </section>

      {phase !== "idle" && (
        <section className="an-work" aria-live="polite">
          <ol className="an-steps">
            {STEPS.map((s, i) => (
              <li key={s} className={i < step || phase === "done" ? "is-done" : i === step ? "is-on" : ""}>
                <span className="an-dot" aria-hidden="true" />
                {s}
              </li>
            ))}
          </ol>

          {plan && (
            <div className="an-grid">
              <aside className="an-plan">
                <h2>{plan.name}</h2>
                <p className="muted small">
                  {plan.city ? `${plan.city} · ` : ""}
                  {plan.kind === "portfolio" ? "Portfolio" : "Website"} · master prompt by {plan.source === "gemini" ? "Gemini" : "the rules"}
                </p>
                <label className="lab-field">
                  <span>Master prompt</span>
                  <textarea rows={12} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                </label>
                <button type="button" className="btn btn-sm" disabled={busy || prompt.trim() === plan.prompt.trim()} onClick={() => change({ prompt: prompt.trim() }, true)}>
                  Rewrite the site from this prompt
                </button>

                <label className="lab-field">
                  <span>Template</span>
                  <select value={plan.template} disabled={busy} onChange={(e) => change({ template: e.target.value }, true)}>
                    {others.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}: {o.sector}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="lab-field">
                  <span>Accent</span>
                  <span className="tpl-row">
                    <input type="color" value={plan.accent} onChange={(e) => change({ accent: e.target.value }, false)} />
                    <code className="small">{plan.accent}</code>
                  </span>
                </div>
                <div className="lab-field">
                  <span>Motion</span>
                  <div className="seg" role="radiogroup" aria-label="Motion">
                    {(["calm", "lively", "bold"] as const).map((m) => (
                      <button key={m} type="button" role="radio" aria-checked={plan.motion === m} className={plan.motion === m ? "is-on" : ""} onClick={() => change({ motion: m }, false)}>
                        {m[0].toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="lab-field">
                  <span>Blocks from the library</span>
                  <ul className="xg-tags">
                    {plan.blocks.map((b) => (
                      <li key={b}>{blockById(b)?.name || b}</li>
                    ))}
                  </ul>
                </div>
                {plan.fonts.display && (
                  <p className="small muted">
                    Type: {plan.fonts.display}
                    {plan.fonts.body && plan.fonts.body !== plan.fonts.display ? ` and ${plan.fonts.body}` : ""}
                  </p>
                )}
                {note && <p className="small tpl-warn">{note}</p>}
                <div className="an-actions">
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={openStudio}>
                    Change anything in the studio
                  </button>
                  <button type="button" className="btn" disabled={busy} onClick={download}>
                    Download the site
                  </button>
                </div>
                <p className="small muted">
                  Built on <Link href={`/templates/${plan.template}`}>{t?.name}</Link> with blocks from the <Link href="/library">library</Link>.
                </p>
              </aside>

              <div className="an-view" ref={box}>
                <div className="an-fit" style={{ height: 900 * scale }}>
                  <div className="an-device" style={{ width: 1440, height: 900, transform: `scale(${scale})` }}>
                    {src && <iframe key={plan.template} ref={frame} src={src} title={`${plan.name} preview`} sandbox="allow-scripts allow-forms" allow="autoplay" onLoad={send} />}
                  </div>
                </div>
                {phase === "write" && <div className="an-veil" aria-hidden="true" />}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
