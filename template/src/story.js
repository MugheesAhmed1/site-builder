// The animation engine's scene spec. A site's motion is described as data, not code:
//
//   { intensity: "simple" | "creative" | "insane",
//     scene: "ocean" | "jungle" | "cosmos",          (environment primitive)
//     character: "whale" | "parrot",                 (character primitive)
//     scrollBehavior: "camera-dive" | ...,           (scroll primitive)
//     characterBehavior: ["lookAtCursor", "reactToClick", ...],
//     transition: "depth-morph" | ...,
//     sectionFx: "rise" | "curtain" | ... }          (how later sections arrive)
//
// The builder writes it (by rules, or with Gemini on the server) and the renderer in
// Website.jsx / Portfolio.jsx and three/journey.jsx turns it into the site.

export const ENVIRONMENTS = [
  { id: "ocean", label: "Ocean dive", aliases: ["underwater", "sea", "coral-reef", "reef"], character: "whale" },
  { id: "jungle", label: "Jungle path", aliases: ["forest", "rainforest", "garden"], character: "parrot" },
  { id: "cosmos", label: "Deep space", aliases: ["space", "galaxy", "stars", "night"], character: "whale" },
];

export const CHARACTERS = [
  { id: "whale", label: "Whale", behaviours: ["lookAtCursor", "reactToClick", "swimAcrossScreen", "reactToScroll", "reactToSound"] },
  { id: "parrot", label: "Parrot", behaviours: ["lookAtCursor", "reactToClick", "flyAcrossScreen", "reactToScroll", "reactToSound"] },
];

export const BEHAVIOURS = ["lookAtCursor", "followCursor", "reactToClick", "reactToScroll", "reactToSound", "swimAcrossScreen", "flyAcrossScreen", "bounce", "jump"];
export const SCROLL_BEHAVIOURS = ["camera-dive", "zoomIn", "cameraPan", "parallax", "pinSection", "depthTransition"];
export const TRANSITIONS = ["depth-morph", "fade", "reveal"];
export const INTENSITIES = [
  { id: "simple", label: "Simple", text: "Gentle fades and slides, hover states and small touches. Fast and calm." },
  { id: "creative", label: "Creative", text: "Sections that curtain open, drifting headings, magnetic buttons and animated type." },
  { id: "insane", label: "Insane", text: "A 3D world you fly through as you scroll, a creature that reacts to every move, sound and tap." },
];

const ENV_IDS = ENVIRONMENTS.map((e) => e.id);

export function envId(v) {
  const s = String(v || "").toLowerCase();
  if (ENV_IDS.includes(s)) return s;
  const hit = ENVIRONMENTS.find((e) => e.aliases.includes(s));
  return hit ? hit.id : "ocean";
}

/** A clean, complete spec from anything (a design field, Gemini's answer, nothing). */
export function normalizeStory(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const scene = envId(r.scene);
  const env = ENVIRONMENTS.find((e) => e.id === scene);
  const character = CHARACTERS.some((c) => c.id === r.character) ? r.character : env.character;
  const intensity = INTENSITIES.some((i) => i.id === r.intensity) ? r.intensity : "insane";
  const behaviour = Array.isArray(r.characterBehavior) ? r.characterBehavior.filter((b) => BEHAVIOURS.includes(b)) : [];
  return {
    intensity,
    scene,
    character,
    scrollBehavior: SCROLL_BEHAVIOURS.includes(r.scrollBehavior) ? r.scrollBehavior : "camera-dive",
    // Watching the cursor and answering a tap are the heart of every character; the spec adds to them.
    characterBehavior: [...new Set(["lookAtCursor", "reactToClick", ...(behaviour.length ? behaviour : ["reactToScroll", "reactToSound"])])],
    transition: TRANSITIONS.includes(r.transition) ? r.transition : "depth-morph",
  };
}

const short = (s, n = 160) => {
  const t = String(s || "").trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (end > 60 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "") + "…").trim();
};

/** The words of each chapter of the journey, from the site's own content. */
export function storyChapters(kind, c) {
  if (!c) return [];
  const out = [];
  const h = c.hero || {};
  if (kind === "portfolio") {
    out.push({ kicker: [h.name, h.role].filter(Boolean).join(" · "), title: h.tagline || h.name || "", text: short(h.intro) });
    if (c.about && c.about.paragraphs && c.about.paragraphs[0]) out.push({ kicker: c.about.heading || "About", title: short(c.about.paragraphs[0], 90), text: short(c.about.paragraphs[1] || "") });
    const p = (c.projects || []).slice(0, 2);
    if (p.length) out.push({ kicker: "Selected work", title: p.map((x) => x.name).join(" and "), text: short(p[0].summary) });
    if (c.cta && c.cta.heading) out.push({ kicker: "Next", title: c.cta.heading, text: short(c.cta.text) });
    return out.filter((x) => x.title);
  }
  out.push({ kicker: h.kicker || "", title: h.headline || (c.brand && c.brand.name) || "", text: short(h.sub) });
  const s = (c.services || []).slice(0, 3);
  if (s.length) out.push({ kicker: "What we do", title: s.map((x) => x.name).join(", "), text: short(s[0].description) });
  if (c.about && c.about.paragraphs && c.about.paragraphs[0]) out.push({ kicker: c.about.heading || "About us", title: short(c.about.paragraphs[0], 96), text: "" });
  const hl = (c.highlights || []).slice(0, 3);
  if (hl.length) out.push({ kicker: "In numbers", title: hl.map((x) => x.value + " " + x.label).join(" · "), text: "" });
  else if (c.cta && c.cta.heading) out.push({ kicker: "", title: c.cta.heading, text: short(c.cta.text) });
  return out.filter((x) => x.title).slice(0, 4);
}

// Which world suits which kind of business or role, for the local director.
const FIT = [
  [/sea|ocean|fish|dive|surf|boat|marine|water|pool|swim|spa|travel|hotel|beach|clinic|dental|health/, "ocean"],
  [/garden|plant|flower|florist|farm|organic|food|restaurant|cafe|bakery|pet|vet|school|kid|nature|yoga|coffee|tea/, "jungle"],
  [/tech|app|saas|software|startup|developer|engineer|data|ai|crypto|game|agency|design|music|photo|film|creator|night|event/, "cosmos"],
];

/** The local director: a spec from the category and the site's words, with no AI. */
export function directStory(category, words, intensity) {
  const text = (String(category || "") + " " + String(words || "")).toLowerCase();
  const hit = FIT.find(([re]) => re.test(text));
  const scene = hit ? hit[1] : "ocean";
  return normalizeStory({ scene, intensity: intensity || "insane" });
}
