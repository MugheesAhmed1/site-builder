// The atmosphere library: every living background a site (or the builder itself) can open on.
// tone says whether words over it should be light or dark. face is the headline style that
// suits it. layout is where the words sit by default. The ids are stable: they are saved in
// designs and chosen by Gemini or the local director.

export const ATMOSPHERES = [
  { id: "meadow", label: "Meadow", note: "A night valley of flowers through a long lens, fireflies drifting.", tone: "dark", face: "condensed", layout: "center", swatch: ["#060906", "#f2a85a", "#9c7cff"] },
  { id: "chrome", label: "Liquid chrome", note: "An iridescent ribbon turning slowly in the dark.", tone: "dark", face: "serif", layout: "center", swatch: ["#08060c", "#a785ff", "#ffc9b0"] },
  { id: "dust", label: "Dust wave", note: "A sheet woven from glowing dust, folding over itself.", tone: "dark", face: "serif-accent", layout: "low", swatch: ["#050505", "#d8d8d8", "#7a7a7a"] },
  { id: "noir", label: "Noir light", note: "Black and white studio, a spotlight, glass slabs and raking light.", tone: "dark", face: "condensed", layout: "center", swatch: ["#0a0a0a", "#bdbdbd", "#ffffff"] },
  { id: "garden", label: "Glow garden", note: "A field of glowing flowers the camera glides over.", tone: "dark", face: "serif", layout: "high", swatch: ["#0c040a", "#ff5a4a", "#7a6bff"], points: "garden" },
  { id: "constellation", label: "Constellation", note: "Thousands of tiny glyphs form a living shape, then scatter as you scroll.", tone: "dark", face: "sans", layout: "center", swatch: ["#050508", "#f5b73a", "#9d7bff"], points: "constellation" },
  { id: "summit", label: "Summit", note: "A sepia mountain range layered into haze, clouds drifting through.", tone: "dark", face: "serif", layout: "high", swatch: ["#3b322b", "#c9b59a", "#efe6d8"] },
  { id: "horizon", label: "Horizon", note: "A vast glowing planet rising behind the page, warm grain.", tone: "dark", face: "serif", layout: "center", swatch: ["#120c0c", "#ff6b56", "#ffb59f"] },
  { id: "isles", label: "Sky isles", note: "Bright clouds and mossy islands floating at several depths.", tone: "light", face: "sans", layout: "high", swatch: ["#e8edf2", "#6f9a3a", "#c7d64a"] },
  { id: "nocturne", label: "Nocturne", note: "A night forest in blue and violet, mist and glowing flowers.", tone: "dark", face: "sans", layout: "panel", swatch: ["#0d1030", "#6d74ff", "#c39bff"] },
  { id: "caustics", label: "Caustics", note: "Sunlight dancing on the floor of a pool, seen from above.", tone: "dark", face: "serif", layout: "center", swatch: ["#06303f", "#3fb6c4", "#d9f6ff"] },
  { id: "rainglass", label: "Rain glass", note: "A window at night, drops running over soft city lights.", tone: "dark", face: "serif", layout: "center", swatch: ["#08080f", "#ff9a4d", "#6f8dff"] },
  { id: "topo", label: "Contours", note: "Slowly shifting contour lines, like a survey map in light.", tone: "light", face: "sans", layout: "center", swatch: ["#f3f2ee", "#7c8088", "#2d3138"] },
  { id: "studio", label: "Studio", note: "A soft grey showroom, a slow light sweep and a giant debossed word.", tone: "dark", face: "sans", layout: "wordmark", swatch: ["#4c5156", "#9aa0a6", "#e7ff3a"] },
];

// The advanced tier: eleven of the thirteen MIT-licensed shaders from @okaybabe/shaders (see vendor/okaybabe.js
// for the licence). Calm, texture-like surfaces that sit well behind words.
const ob = (slug, label, note, hue, tone = "dark") => {
  const c = `hsl(${hue} 70% 55%)`;
  return { id: "ob-" + slug, label, note, tone, face: "sans", layout: "center", tier: "advanced", credit: "okaybabe", swatch: ["#0b0912", c, "#f4efe6"] };
};
export const ADVANCED = [
  ob("aperture-bloom", "Aperture bloom", "A prismatic radial bloom with five soft blades.", 293),
  ob("prism-stop", "Prism stop", "Six prismatic bands, slowly turning.", 293),
  ob("optic", "Optic", "Concentric rings of refraction that follow the pointer.", 293),
  ob("halation", "Halation", "A subtle chromatic glow, made for product pages.", 293, "light"),
  ob("ink-run", "Ink run", "Ink bleeding slowly into warm paper.", 280, "light"),
  ob("foxglove", "Foxglove", "A soft pink and violet breath.", 310),
  ob("twilight-run", "Twilight run", "A warm-to-cool dusk drifting by.", 20),
  ob("sirocco", "Sirocco", "Warm wind and drifting dust.", 25),
  ob("quarry", "Quarry", "Layered stone with light moving across it.", 280),
  ob("membrane", "Membrane", "Cellular outlines on a warm ground.", 280, "light"),
  ob("vellum", "Vellum", "Premium paper, almost still.", 35, "light"),
];

export const ALL_ATMOSPHERES = [...ATMOSPHERES, ...ADVANCED];
export const ATMOS_IDS = ALL_ATMOSPHERES.map((a) => a.id);
export const atmosById = (id) => ALL_ATMOSPHERES.find((a) => a.id === id) || ATMOSPHERES[0];

// Which atmosphere suits which kind of business or person, for the local director.
const FIT = [
  [/landscap|botanic|garden cent/, "garden"],
  [/flower|florist|garden|plant|wedding|perfume|candle|tea|wine|spa|beauty|salon|bakery|cafe|coffee|restaurant|food/, "meadow"],
  [/pool|swim|spa|surf|dive|beach|marine|boat|yacht|hotel|resort/, "caustics"],
  [/\bbar\b|lounge|cocktail|jazz|nightlife|taxi|\bcity\b|urban|novel|poet/, "rainglass"],
  [/survey|\bmaps?\b|geolog|civil eng|\bland\b|cartograph|minimal|notary/, "topo"],
  [/farm|organic|eco|climate|green|nature|environment|outdoor|camp|hiking|travel|tour|kids|school|pet|vet/, "isles"],
  [/law|legal|account|finance|bank|invest|insurance|consult|real ?estate|property|architect|construction|mountain|adventure/, "summit"],
  [/photo|film|video|writer|author|journal|editor|press|podcast|tattoo|barber/, "noir"],
  [/fashion|cloth|apparel|shop|store|retail|furniture|sneaker|jewel/, "studio"],
  [/\bai\b|data|research|science|knowledge|education|university|tutor|course|analytics/, "constellation"],
  [/design|agency|creative|brand|marketing|web|portfolio|freelance|artist|music|dj/, "chrome"],
  [/saas|software|app|startup|tech|cloud|platform|automation|engineer|developer|product manager/, "dust"],
  [/health|clinic|dental|doctor|medical|therapy|wellness|yoga|fitness|gym|sleep|care/, "nocturne"],
  [/space|aero|energy|solar|launch|venture|fund|crypto|web3|event|festival|night|club/, "horizon"],
];

/** The local director: an atmosphere from the category and the site's words, with no AI. */
export function pickAtmos(category, words) {
  const text = (String(category || "") + " " + String(words || "")).toLowerCase();
  const hit = FIT.find(([re]) => re.test(text));
  return hit ? hit[1] : "chrome";
}

// Older designs saved a simple backdrop or a 3D journey world. They open on the nearest atmosphere.
export const LEGACY = { silk: "chrome", particles: "constellation", mesh: "nocturne", aurora: "horizon", grid: "dust", ocean: "nocturne", jungle: "meadow", cosmos: "constellation" };
export const atmosOf = (v) => (ATMOS_IDS.includes(v) ? v : LEGACY[v] || "");

/** The atmosphere a saved design opens on: its own pick, else the local director's for its kind of business. */
export function siteAtmos(d, category, words) {
  const s = d || {};
  return atmosOf(s.atmos) || pickAtmos(category, words);
}
