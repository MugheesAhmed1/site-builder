"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import Icon from "@/components/Icon";
import type { PortfolioInput } from "@/lib/types";

// The portfolio form: plain fields and repeatable groups for everything a professional
// portfolio needs. Every section on the finished site comes from one group here, and a
// group left empty simply doesn't appear.

type Field = { key: string; label: string; placeholder?: string; long?: boolean; list?: "lines" | "commas"; half?: boolean };

const ease = [0.23, 1, 0.32, 1] as const;

function TextInput({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: unknown) => void }) {
  const id = useId();
  const text = Array.isArray(value) ? value.join(f.list === "commas" ? ", " : "\n") : String(value ?? "");
  const parse = (t: string) => (f.list === "commas" ? t.split(",").map((x) => x.trimStart()) : f.list === "lines" ? t.split("\n") : t);
  return (
    <div className={"pf-field" + (f.half ? " is-half" : "")}>
      <label className="lbl" htmlFor={id}>
        {f.label}
      </label>
      {f.long || f.list === "lines" ? (
        <textarea id={id} rows={f.list === "lines" ? 4 : 3} value={text} placeholder={f.placeholder} onChange={(e) => onChange(parse(e.target.value))} />
      ) : (
        <input id={id} type="text" value={text} placeholder={f.placeholder} onChange={(e) => onChange(parse(e.target.value))} />
      )}
    </div>
  );
}

function clean(f: Field, v: unknown) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return v;
}

function Repeater<T extends Record<string, unknown>>({ items, fields, blank, onChange, noun, title }: { items: T[]; fields: Field[]; blank: T; onChange: (v: T[]) => void; noun: string; title: (x: T, i: number) => string }) {
  const [open, setOpen] = useState<number>(items.length ? -1 : -1);
  const set = (i: number, patch: Partial<T>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const out = items.slice();
    [out[i], out[j]] = [out[j], out[i]];
    onChange(out);
  };
  return (
    <div className="rep">
      <AnimatePresence initial={false}>
        {items.map((x, i) => (
          <motion.div
            className={"rep-item" + (open === i ? " is-open" : "")}
            key={i}
            layout="position"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease }}
          >
            <div className="rep-head">
              <button type="button" className="rep-toggle" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                <span className="rep-num mono">{String(i + 1).padStart(2, "0")}</span>
                <span className="rep-title">{title(x, i) || `New ${noun}`}</span>
                <Icon name={open === i ? "up" : "down"} size={16} />
              </button>
              <div className="row" style={{ gap: 2 }}>
                <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={`Move ${noun} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <Icon name="up" size={15} />
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={`Move ${noun} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  <Icon name="down" size={15} />
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-icon btn-danger" aria-label={`Remove ${noun}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                  <Icon name="x" size={15} />
                </button>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div className="rep-body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24, ease }}>
                  <div className="rep-fields">
                    {fields.map((f) => (
                      <TextInput key={f.key} f={f} value={x[f.key]} onChange={(v) => set(i, { [f.key]: v } as Partial<T>)} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        type="button"
        className="btn btn-sm rep-add"
        onClick={() => {
          onChange([...items, { ...blank }]);
          setOpen(items.length);
        }}
      >
        <Icon name="plus" size={15} />
        Add {noun}
      </button>
    </div>
  );
}

const GOALS = ["Get hired full time", "Win freelance clients", "Both", "Show my work"];
const AVAIL = ["Open to new roles", "Taking freelance projects", "Not looking right now"];
const TONES = ["Calm and minimal", "Warm and friendly", "Bold and loud", "Classic and editorial", "Modern and technical"];

export const GROUPS = [
  { id: "basics", title: "Basics", hint: "Your name, title and how to reach you." },
  { id: "about", title: "About and goal", hint: "What the site is for and the story behind you." },
  { id: "results", title: "Results", hint: "Numbers become counters at the top." },
  { id: "experience", title: "Experience", hint: "Jobs, freelance or volunteering." },
  { id: "projects", title: "Projects", hint: "Your best work, shown as cards or case studies." },
  { id: "skills", title: "Skills", hint: "Grouped, so visitors scan them fast." },
  { id: "services", title: "Services", hint: "What clients can hire you for." },
  { id: "testimonials", title: "Testimonials", hint: "Kind words from people you worked with." },
  { id: "credentials", title: "Education and awards", hint: "Degrees, certificates, awards, languages." },
  { id: "custom", title: "Your own sections", hint: "Speaking, writing, volunteering, anything." },
] as const;

export function groupCount(inp: PortfolioInput, id: string): number {
  switch (id) {
    case "basics":
      return [inp.name, inp.role, inp.email].filter(Boolean).length;
    case "about":
      return inp.about ? 1 : 0;
    case "credentials":
      return inp.education.length + inp.certifications.length + inp.awards.length + inp.languages.length;
    default:
      return ((inp as unknown as Record<string, unknown[]>)[id] ?? []).length;
  }
}

function Chips({ value, options, onChange, label }: { value: string; options: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className="choices" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o} role="radio" aria-checked={value === o} className={"chip" + (value === o ? " is-on" : "")} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export default function PortfolioForm({ value, onChange, group }: { value: PortfolioInput; onChange: (v: PortfolioInput) => void; group: string }) {
  const v = value;
  const set = (patch: Partial<PortfolioInput>) => onChange({ ...v, ...patch });
  const field = (f: Field) => <TextInput key={f.key} f={f} value={(v as unknown as Record<string, unknown>)[f.key]} onChange={(x) => set({ [f.key]: clean(f, x) } as Partial<PortfolioInput>)} />;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={group} className="pf-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease }}>
        {group === "basics" && (
          <>
            <div className="rep-fields">
              {field({ key: "name", label: "Full name", placeholder: "Sara Malik", half: true })}
              {field({ key: "role", label: "What you do", placeholder: "Product manager", half: true })}
              {field({ key: "tagline", label: "Your headline, under 12 words", placeholder: "I turn messy payment flows into products people trust" })}
              {field({ key: "location", label: "Where you're based", placeholder: "Lahore, Pakistan", half: true })}
              {field({ key: "email", label: "Email", placeholder: "you@example.com", half: true })}
              {field({ key: "phone", label: "Phone (optional)", placeholder: "+92 300 0000000", half: true })}
              {field({ key: "photoUrl", label: "Photo link (optional)", placeholder: "https://...", half: true })}
              {field({ key: "resumeUrl", label: "CV file link (adds a Download CV button)", placeholder: "https://drive.google.com/..." })}
            </div>
            <h3 className="pf-form-sub">Profile links</h3>
            <Repeater
              items={v.links}
              noun="link"
              blank={{ label: "", url: "" }}
              title={(x) => x.label || x.url}
              fields={[
                { key: "label", label: "Label", placeholder: "LinkedIn", half: true },
                { key: "url", label: "Link", placeholder: "https://linkedin.com/in/you", half: true },
              ]}
              onChange={(links) => set({ links })}
            />
          </>
        )}

        {group === "about" && (
          <div className="stack" style={{ gap: 22 }}>
            <div>
              <span className="lbl">What should this site help you do?</span>
              <Chips label="Goal" value={v.goal} options={GOALS} onChange={(goal) => set({ goal })} />
              <p className="hint" style={{ marginTop: 6 }}>
                This changes the section order. Clients see services and work first; recruiters see results and experience first.
              </p>
            </div>
            <div>
              <span className="lbl">Are you available?</span>
              <Chips label="Availability" value={v.availability} options={AVAIL} onChange={(availability) => set({ availability })} />
            </div>
            <div>
              <span className="lbl">How should it feel?</span>
              <Chips label="Feel" value={v.tone} options={TONES} onChange={(tone) => set({ tone })} />
            </div>
            {field({ key: "about", label: "About you", long: true, placeholder: "Two to four sentences: what you do, who for, and what you care about." })}
          </div>
        )}

        {group === "results" && (
          <Repeater
            items={v.results}
            noun="result"
            blank={{ value: "", label: "" }}
            title={(x) => [x.value, x.label].filter(Boolean).join(" ")}
            fields={[
              { key: "value", label: "Number", placeholder: "40%", half: true },
              { key: "label", label: "What it means", placeholder: "More signups in 6 months", half: true },
            ]}
            onChange={(results) => set({ results })}
          />
        )}

        {group === "experience" && (
          <Repeater
            items={v.experience}
            noun="job"
            blank={{ company: "", role: "", start: "", end: "", location: "", bullets: [] }}
            title={(x) => [x.role, x.company].filter(Boolean).join(" at ")}
            fields={[
              { key: "role", label: "Role", placeholder: "Senior product manager", half: true },
              { key: "company", label: "Company", placeholder: "Paylane", half: true },
              { key: "start", label: "Started", placeholder: "2021", half: true },
              { key: "end", label: "Ended", placeholder: "Present", half: true },
              { key: "location", label: "Location", placeholder: "Remote" },
              { key: "bullets", label: "What you did, one per line", list: "lines", placeholder: "Led checkout rebuild, cut drop off by 30%" },
            ]}
            onChange={(experience) => set({ experience })}
          />
        )}

        {group === "projects" && (
          <Repeater
            items={v.projects}
            noun="project"
            blank={{ name: "", role: "", description: "", outcome: "", tags: [], link: "", imageUrl: "" }}
            title={(x) => x.name}
            fields={[
              { key: "name", label: "Project name", placeholder: "Payments app", half: true },
              { key: "role", label: "Your role", placeholder: "Lead PM", half: true },
              { key: "description", label: "What it was and what you did", long: true, placeholder: "Rebuilt checkout for 2M users across web and mobile." },
              { key: "outcome", label: "The result", placeholder: "Cut drop off by 30% in one quarter" },
              { key: "tags", label: "Tags, separated by commas", list: "commas", placeholder: "Fintech, Mobile, Research" },
              { key: "link", label: "Link (optional)", placeholder: "https://...", half: true },
              { key: "imageUrl", label: "Image link (optional)", placeholder: "https://...", half: true },
            ]}
            onChange={(projects) => set({ projects })}
          />
        )}

        {group === "skills" && (
          <Repeater
            items={v.skills}
            noun="skill group"
            blank={{ group: "", items: [] }}
            title={(x) => x.group || x.items.slice(0, 3).join(", ")}
            fields={[
              { key: "group", label: "Group name", placeholder: "Tools" },
              { key: "items", label: "Skills, separated by commas", list: "commas", placeholder: "Figma, Jira, SQL" },
            ]}
            onChange={(skills) => set({ skills })}
          />
        )}

        {group === "services" && (
          <Repeater
            items={v.services}
            noun="service"
            blank={{ name: "", description: "", price: "" }}
            title={(x) => x.name}
            fields={[
              { key: "name", label: "Service", placeholder: "Product strategy sprint", half: true },
              { key: "price", label: "Price (optional)", placeholder: "From $2,000", half: true },
              { key: "description", label: "What's included", long: true, placeholder: "Two weeks of research and a clear roadmap." },
            ]}
            onChange={(services) => set({ services })}
          />
        )}

        {group === "testimonials" && (
          <Repeater
            items={v.testimonials}
            noun="testimonial"
            blank={{ quote: "", name: "", role: "" }}
            title={(x) => x.name || x.quote.slice(0, 40)}
            fields={[
              { key: "quote", label: "What they said", long: true, placeholder: "Sara made the hard calls easy." },
              { key: "name", label: "Their name", placeholder: "Ali Khan", half: true },
              { key: "role", label: "Their role", placeholder: "CTO at Paylane", half: true },
            ]}
            onChange={(testimonials) => set({ testimonials })}
          />
        )}

        {group === "credentials" && (
          <div className="stack" style={{ gap: 26 }}>
            <div>
              <h3 className="pf-form-sub">Education</h3>
              <Repeater
                items={v.education}
                noun="degree"
                blank={{ school: "", degree: "", year: "" }}
                title={(x) => x.degree || x.school}
                fields={[
                  { key: "degree", label: "Degree", placeholder: "BS Computer Science", half: true },
                  { key: "school", label: "School", placeholder: "LUMS", half: true },
                  { key: "year", label: "Year", placeholder: "2018", half: true },
                ]}
                onChange={(education) => set({ education })}
              />
            </div>
            <div>
              <h3 className="pf-form-sub">Certifications</h3>
              <Repeater
                items={v.certifications}
                noun="certificate"
                blank={{ name: "", issuer: "", year: "", link: "" }}
                title={(x) => x.name}
                fields={[
                  { key: "name", label: "Name", placeholder: "Certified Scrum Product Owner", half: true },
                  { key: "issuer", label: "Issued by", placeholder: "Scrum Alliance", half: true },
                  { key: "year", label: "Year", placeholder: "2022", half: true },
                  { key: "link", label: "Link (optional)", placeholder: "https://...", half: true },
                ]}
                onChange={(certifications) => set({ certifications })}
              />
            </div>
            <div>
              <h3 className="pf-form-sub">Awards</h3>
              <Repeater
                items={v.awards}
                noun="award"
                blank={{ name: "", issuer: "", year: "" }}
                title={(x) => x.name}
                fields={[
                  { key: "name", label: "Award", placeholder: "Product of the Year", half: true },
                  { key: "issuer", label: "From", placeholder: "P@SHA", half: true },
                  { key: "year", label: "Year", placeholder: "2023", half: true },
                ]}
                onChange={(awards) => set({ awards })}
              />
            </div>
            <div>
              <h3 className="pf-form-sub">Languages</h3>
              <Repeater
                items={v.languages}
                noun="language"
                blank={{ name: "", level: "" }}
                title={(x) => [x.name, x.level].filter(Boolean).join(", ")}
                fields={[
                  { key: "name", label: "Language", placeholder: "Urdu", half: true },
                  { key: "level", label: "Level", placeholder: "Native", half: true },
                ]}
                onChange={(languages) => set({ languages })}
              />
            </div>
          </div>
        )}

        {group === "custom" && (
          <>
            <p className="hint" style={{ marginBottom: 14 }}>
              Each one becomes its own section, for example Speaking, Writing, Volunteering or Open source. Write each point as title | text.
            </p>
            <Repeater
              items={v.custom.map((c) => ({ title: c.title, points: c.items.map((i) => [i.title, i.text].filter(Boolean).join(" | ")) }))}
              noun="section"
              blank={{ title: "", points: [] as string[] }}
              title={(x) => x.title}
              fields={[
                { key: "title", label: "Section title", placeholder: "Speaking" },
                { key: "points", label: "Points, one per line: title | text", list: "lines", placeholder: "Design Week Lahore | Talk on payment UX, 400 people" },
              ]}
              onChange={(list) =>
                set({
                  custom: list.map((c) => ({
                    title: String(c.title ?? ""),
                    items: ((c.points as string[]) ?? []).map((line) => {
                      const [t, ...rest] = line.split("|");
                      return { title: (t ?? "").trim(), text: rest.join("|").trim() };
                    }),
                  })),
                })
              }
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
