"use client";

import { useEffect, useRef, useState } from "react";
import { answer, charactersFor, ruleStep, sectionsFor, summary, type Brief, type ChatStep, type ChatTurn } from "@/lib/journey/brief";

// Step 2: the AI asks about what the person wants to build, one question at a time, with answers to
// tap. Gemini runs it on the server (/api/chat); the rules finish it when there is no key.

async function ask(idea: string, brief: Brief | null, turns: ChatTurn[]): Promise<ChatStep & { note?: string }> {
  const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idea, brief, turns }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok || !data.step) throw new Error(data.error || "The interviewer did not answer.");
  return { ...(data.step as ChatStep), note: data.note };
}

const ROWS: [keyof Brief, string][] = [
  ["name", "Name"],
  ["what", "What it is"],
  ["audience", "For"],
  ["tone", "Feel"],
  ["sections", "Must have"],
  ["character", "The star"],
  ["colors", "Colours"],
];

export default function Interview({ idea, brief, turns, done, onChange, onNext }: { idea: string; brief: Brief | null; turns: ChatTurn[]; done: boolean; onChange: (b: Brief, t: ChatTurn[], done: boolean) => void; onNext: () => void }) {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const list = useRef<HTMLOListElement>(null);
  const started = useRef(false);
  const last = turns[turns.length - 1];
  const question = last && last.role === "ai" && !done ? last : null;

  // The first question comes as soon as the step opens.
  useEffect(() => {
    if (started.current || turns.length) return;
    started.current = true;
    // The brief so far goes too: it may already hold a character chosen on the home page.
    void step(brief, []);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    list.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [turns.length, busy]);

  async function step(b: Brief | null, t: ChatTurn[]) {
    setBusy(true);
    setError("");
    try {
      let s: ChatStep;
      try {
        s = await ask(idea, b, t);
      } catch {
        // Offline or the server is down: the same rules the server uses.
        const base = b ?? (await import("@/lib/journey/brief")).startBrief(idea);
        const lastAi = [...t].reverse().find((x) => x.role === "ai");
        const lastMe = t.length && t[t.length - 1].role === "me" ? t[t.length - 1] : null;
        s = ruleStep(lastAi && lastMe ? answer(base, lastAi.field, lastMe.text) : base, t);
      }
      const next: ChatTurn[] = [...t, { role: "ai", text: s.reply, chips: s.done ? undefined : s.chips, field: s.done ? undefined : s.field, multi: s.multi }];
      onChange(s.brief, next, s.done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function reply(words: string) {
    const t = words.trim();
    if (!t || busy || !question) return;
    const next: ChatTurn[] = [...turns, { role: "me", text: t }];
    setText("");
    setPicked([]);
    // Show the answer in the brief at once; the next question follows.
    const b = brief ? answer(brief, question.field, t) : brief;
    if (b) onChange(b, next, false);
    void step(b, next);
  }

  function skip() {
    if (!brief) return;
    let b = brief;
    if (!b.sections.length) b = { ...b, sections: sectionsFor(b).slice(0, 4) };
    if (!b.character) b = { ...b, character: charactersFor(b)[0] };
    onChange(b, [...turns, { role: "ai", text: summary(b) }], true);
  }

  return (
    <div className="jr-chat">
      <section className="jr-talk" aria-label="Questions about your site">
        <ol className="jr-bubbles" ref={list} aria-live="polite">
          <li className="jr-me">
            <p>{idea}</p>
          </li>
          {turns.map((t, i) => (
            <li key={i} className={t.role === "ai" ? "jr-ai" : "jr-me"}>
              {t.role === "ai" && <span className="jr-avatar" aria-hidden="true" />}
              <p>{t.text}</p>
            </li>
          ))}
          {busy && (
            <li className="jr-ai is-typing" aria-label="Thinking">
              <span className="jr-avatar" aria-hidden="true" />
              <p>
                <i />
                <i />
                <i />
              </p>
            </li>
          )}
        </ol>
        {error && (
          <p className="tpl-warn small" role="alert">
            {error}{" "}
            <button type="button" className="linklike" onClick={() => step(brief, turns)}>
              Try again
            </button>
          </p>
        )}
        {question && !busy && (
          <div className="jr-answer">
            {!!question.chips?.length && (
              <div className="jr-chips" role="group" aria-label={question.multi ? "Pick any" : "Pick one"}>
                {question.chips.map((c) => {
                  const on = picked.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`chip ${on ? "is-on" : ""}`}
                      aria-pressed={question.multi ? on : undefined}
                      onClick={() => (question.multi ? setPicked(on ? picked.filter((x) => x !== c) : [...picked, c]) : reply(c))}
                    >
                      {c}
                    </button>
                  );
                })}
                {question.multi && (
                  <button type="button" className="btn btn-primary btn-sm" disabled={!picked.length && !text.trim()} onClick={() => reply([...picked, text.trim()].filter(Boolean).join(", "))}>
                    {picked.length ? `Use these ${picked.length}` : "Use these"}
                  </button>
                )}
              </div>
            )}
            <form
              className="jr-type"
              onSubmit={(e) => {
                e.preventDefault();
                reply(question.multi ? [...picked, text.trim()].filter(Boolean).join(", ") : text);
              }}
            >
              <label className="sr-only" htmlFor="jr-say">
                Your answer
              </label>
              <input id="jr-say" value={text} onChange={(e) => setText(e.target.value)} placeholder="Or type your own answer" autoComplete="off" maxLength={200} />
              <button type="submit" className="btn" disabled={!text.trim() && !(question.multi && picked.length)}>
                Send
              </button>
            </form>
            <button type="button" className="linklike small jr-skip" onClick={skip}>
              Skip the questions, use what you know
            </button>
          </div>
        )}
        {done && !busy && (
          <div className="jr-next">
            <button type="button" className="btn btn-primary" onClick={onNext}>
              Next: your character and design
            </button>
          </div>
        )}
      </section>
      <aside className="jr-brief" aria-label="Your brief so far">
        <h2>Your brief</h2>
        <dl>
          {ROWS.map(([k, label]) => {
            const v = brief?.[k];
            const shown = Array.isArray(v) ? v.join(", ") : String(v || "");
            return (
              <div key={k} className={shown ? "is-set" : ""}>
                <dt>{label}</dt>
                <dd>{shown || (k === "colors" && done ? "From the character" : "…")}</dd>
              </div>
            );
          })}
        </dl>
      </aside>
    </div>
  );
}
