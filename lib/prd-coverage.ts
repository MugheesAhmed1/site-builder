import { blockSection, type Block } from "@/template/src/content/blocks";
import type { WebsiteContent } from "@/template/src/content/types";
import type { Experience } from "@/template/src/experiences/types";
import type { Prd } from "./prd";

// The coverage check: every section and every requirement of the approved PRD must be on the
// generated site. The AI and the person may change how a section looks, its layout and its
// words, but nothing in the PRD may silently disappear. It runs three ways:
//   checkCoverage(prd, content, experience)  the site's data (blocks, section order, hidden scenes)
//   markupCoverage(prd, html)                the rendered HTML (data-prd and data-req attributes)
//   domCoverage(prd, root)                   the live page in the studio (also catches hidden elements)
// Publish refuses to download a site that fails it.

export interface CoverageItem {
  id: string;
  label: string;
  section: string;
  ok: boolean;
  reason?: string;
}

export interface Coverage {
  ok: boolean;
  sections: CoverageItem[];
  requirements: CoverageItem[];
  /** Plain-language problems, one per missing thing. */
  problems: string[];
}

function finish(sections: CoverageItem[], requirements: CoverageItem[]): Coverage {
  const problems = [...sections, ...requirements].filter((x) => !x.ok).map((x) => `${x.id} "${x.label}": ${x.reason}`);
  return { ok: problems.length === 0, sections, requirements, problems };
}

export function checkCoverage(prd: Prd, content: WebsiteContent | null | undefined, experience?: Experience | null): Coverage {
  const blocks = new Map<string, Block>((content?.blocks ?? []).map((b) => [b.prd, b]));
  const order = new Set<string>((content?.sections ?? []) as string[]);
  const hidden = new Set((experience?.scenes ?? []).filter((s) => s.hidden).map((s) => s.section));
  const sections: CoverageItem[] = [];
  const requirements: CoverageItem[] = [];
  for (const s of prd.sections) {
    const b = blocks.get(s.id);
    const sid = b ? blockSection(b) : "";
    const reason = !b ? "no section on the site" : !order.has(sid) ? "removed from the page" : hidden.has(sid) ? "hidden on the page" : "";
    sections.push({ id: s.id, label: s.title, section: s.id, ok: !reason, reason: reason || undefined });
    for (const r of s.requirements) {
      const br = b?.reqs.find((x) => x.id === r.id);
      const why = reason ? "its section is " + (reason === "no section on the site" ? "missing" : reason.replace(" on the page", "").replace("removed from the page", "removed")) : !br ? "not carried by its section" : !br.text.trim() ? "its words were emptied" : "";
      requirements.push({ id: r.id, label: r.text, section: s.id, ok: !why, reason: why || undefined });
    }
  }
  return finish(sections, requirements);
}

const attrs = (html: string, name: string) => new Set([...html.matchAll(new RegExp(name + '="([^"]+)"', "g"))].map((m) => m[1]));

export function markupCoverage(prd: Prd, html: string): Coverage {
  const prds = attrs(html, "data-prd");
  const reqs = attrs(html, "data-req");
  for (const list of attrs(html, "data-reqs")) for (const id of list.split(/\s+/)) reqs.add(id);
  const sections = prd.sections.map((s) => ({ id: s.id, label: s.title, section: s.id, ok: prds.has(s.id), reason: prds.has(s.id) ? undefined : "not in the page's HTML" }));
  const requirements = prd.sections.flatMap((s) => s.requirements.map((r) => ({ id: r.id, label: r.text, section: s.id, ok: reqs.has(r.id), reason: reqs.has(r.id) ? undefined : "not in the page's HTML" })));
  return finish(sections, requirements);
}

/** The live page: present, and not hidden by an edit (display none, zero size or transparent). */
export function domCoverage(prd: Prd, root: ParentNode): Coverage {
  const shown = (el: Element | null) => {
    if (!el) return false;
    const h = el as HTMLElement;
    if (typeof getComputedStyle === "undefined") return true;
    for (let n: HTMLElement | null = h; n && n !== root; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0 && !n.closest("[data-enter]")) return false;
    }
    return true;
  };
  const sections = prd.sections.map((s) => {
    const el = root.querySelector(`[data-prd="${CSS.escape(s.id)}"]`);
    const ok = shown(el);
    return { id: s.id, label: s.title, section: s.id, ok, reason: ok ? undefined : el ? "hidden on the page" : "not on the page" };
  });
  const requirements = prd.sections.flatMap((s) =>
    s.requirements.map((r) => {
      const el = root.querySelector(`[data-req="${CSS.escape(r.id)}"], [data-reqs~="${CSS.escape(r.id)}"]`);
      const ok = shown(el);
      return { id: r.id, label: r.text, section: s.id, ok, reason: ok ? undefined : el ? "hidden on the page" : "not on the page" };
    }),
  );
  return finish(sections, requirements);
}
