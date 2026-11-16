// The scene library: every living world a site (or the builder itself) can open in.
//
// Four families, one renderer each, all behind the same <Atmosphere> component:
//   plate     a cinematic still brought to life by our own WebGL pass (depth parallax, wind,
//             water, fog, light shafts, motes). The stills were generated for this library
//             with Pollinations.ai from original prompts.
//   shader    original GLSL scenes written for this builder (liquid chrome, noir light...).
//   paper     art-directed presets of Paper Shaders (Apache License 2.0).
//   okaybabe  shaders from @okaybabe/shaders (MIT), carried over unchanged.
//
// tone says whether words over it should be light or dark text. flat is the scene's own flat
// colour: scenes blend into it and out of it when they change. layout is where the words sit
// by default. The ids are stable: they are saved in designs and picked by Gemini or the local
// director.

import { PAPER_SCENES } from "./paper.js";
import { OKAYBABE } from "./vendor/okaybabe.js";
import { FLATS } from "./flats.js";
import { asset } from "../real.js";

// Living plates. horizon is where the far distance sits (0 top, 1 bottom); the rest switches
// the layers: sway (wind in the near ground), water, sky (breathing clouds), fog, rays and
// motes (0 fireflies, 1 dust, 2 bubbles, 3 petals, 4 snow).
const plate = (id, label, note, tone, moods, fx) => ({ id, label, note, tone, moods: moods.split(" "), family: "plate", group: "Living photos", face: "serif", layout: "center", plate: fx });
export const PLATES = [
  plate("night-meadow", "Night meadow", "Wildflowers under a violet sky, fireflies drifting through the grass.", "dark", "calm nature brand", { horizon: 0.55, sway: 1, sky: 0.6, fog: 0.15, fogCol: "#6b4fa8", motes: 1, moteKind: 0, moteCol: "#ffd27a" }),
  plate("ocean", "Open ocean", "Waves rolling in from above, the water always moving.", "dark", "fresh calm nature", { horizon: 0.25, water: 1, sky: 0.5, fogCol: "#cfe8f0" }),
  plate("sky-isle", "Sky isle", "A mossy island floating in cloud, mist sliding past.", "light", "nature calm fresh", { horizon: 0.75, sway: 0.4, sky: 1, fog: 0.35, fogCol: "#e8eef2", water: 0.4 }),
  plate("misty-valley", "Misty valley", "Pine ridges at blue hour, fog rolling through the valley.", "dark", "calm nature", { horizon: 0.45, sway: 0.5, sky: 0.8, fog: 0.55, fogCol: "#aebfca" }),
  plate("dunes", "Dunes", "Sand dunes at golden hour, warm haze and drifting dust.", "dark", "warm earthy calm", { horizon: 0.3, sky: 0.6, fog: 0.2, fogCol: "#f2c38a", motes: 0.6, moteKind: 1, moteCol: "#ffe2b8" }),
  plate("city-rain", "City rain", "Rain on a window at night, the city blurred into light.", "dark", "bold tech", { horizon: 0.0, sway: 0.2, water: 0.25, motes: 0.5, moteKind: 1, moteCol: "#ffb36b" }),
  plate("violet-studio", "Violet studio", "A soft grey studio with a slow violet light sweep.", "dark", "luxe brand tech", { horizon: 0.55, rays: 0.5, rayPos: [0.75, 0.15], fogCol: "#b9a2ff", motes: 0.35, moteKind: 1, moteCol: "#d9ccff" }),
  plate("morning-cafe", "Morning cafe", "An empty cafe in warm morning sun, dust in the light.", "dark", "warm calm", { horizon: 0.45, rays: 0.45, rayPos: [0.2, 0.0], fogCol: "#ffd8a8", motes: 0.7, moteKind: 1, moteCol: "#ffe9c9" }),
  plate("spa", "Spa stones", "Still water, smooth stones and soft candle light.", "dark", "calm luxe", { horizon: 0.45, water: 0.8, fog: 0.25, fogCol: "#f5e6d3", motes: 0.4, moteKind: 1, moteCol: "#fff1dc" }),
  plate("alpenglow", "Alpenglow", "Snow peaks turning pink at sunrise, thin clouds drifting.", "dark", "calm nature fresh", { horizon: 0.8, sky: 1, fog: 0.3, fogCol: "#f3d6e0", motes: 0.35, moteKind: 4, moteCol: "#ffffff" }),
  plate("lavender", "Lavender", "Endless lavender at sunset, swaying in a warm breeze.", "dark", "warm calm nature brand", { horizon: 0.4, sway: 1, sky: 0.6, fog: 0.15, fogCol: "#e9b9d9", motes: 0.5, moteKind: 1, moteCol: "#ffe3c4" }),
  plate("aurora-lake", "Aurora lake", "Northern lights over a mirror lake, stars turning.", "dark", "calm nature tech", { horizon: 0.68, water: 0.7, sky: 1, motes: 0.3, moteKind: 0, moteCol: "#c8ffe8" }),
  plate("sunbeam-forest", "Sunbeam forest", "Light shafts through a misty pine forest.", "dark", "nature calm", { horizon: 0.7, sway: 0.4, fog: 0.4, fogCol: "#d8e6c8", rays: 0.6, rayPos: [0.55, -0.05], motes: 0.5, moteKind: 1, moteCol: "#fff6d8" }),
  plate("concrete", "Concrete", "Brutalist concrete and long shadows, quiet and exact.", "light", "mono luxe calm", { horizon: 0.6, rays: 0.25, rayPos: [0.9, 0.0], fogCol: "#ffffff" }),
  plate("golden-wheat", "Golden wheat", "A wheat field at sunset, every stalk moving in the wind.", "dark", "warm nature earthy", { horizon: 0.62, sway: 1.2, sky: 0.6, fog: 0.15, fogCol: "#ffd28a", motes: 0.6, moteKind: 1, moteCol: "#fff0c8" }),
  plate("nebula", "Nebula", "A violet nebula with stars drifting toward you.", "dark", "bold tech brand", { horizon: 0.0, sky: 0.6, motes: 0.8, moteKind: 1, moteCol: "#e6dcff" }),
  plate("reef", "Sunlit reef", "Sun rays piercing blue water, particles floating up.", "dark", "fresh calm nature", { horizon: 0.0, water: 0.6, rays: 0.5, rayPos: [0.5, -0.1], fogCol: "#bff0ff", motes: 0.7, moteKind: 2, moteCol: "#d8f6ff" }),
  plate("blossom", "Blossom path", "Cherry blossom in spring, petals falling.", "light", "calm fresh warm", { horizon: 0.6, sway: 0.6, motes: 0.8, moteKind: 3, moteCol: "#ffd0e0" }),
  plate("library", "Library", "Tall shelves, soft window light and dust in the beams.", "dark", "warm calm earthy", { horizon: 0.5, rays: 0.5, rayPos: [0.85, 0.0], fogCol: "#ffe2b0", motes: 0.6, moteKind: 1, moteCol: "#ffefd0" }),
  plate("workshop", "Workshop", "A woodworking bench in warm light, sawdust in the air.", "dark", "warm earthy", { horizon: 0.5, rays: 0.4, rayPos: [0.15, 0.0], fogCol: "#ffd7a0", motes: 0.6, moteKind: 1, moteCol: "#ffe8c4" }),
  plate("clinic", "Bright clinic", "A calm white interior with plants and soft daylight.", "light", "fresh calm light", { horizon: 0.5, rays: 0.25, rayPos: [0.85, 0.0], fogCol: "#ffffff", motes: 0.25, moteKind: 1, moteCol: "#ffffff" }),
  plate("gym", "Night gym", "A dark gym, rim light and haze rolling across the floor.", "dark", "bold", { horizon: 0.55, fog: 0.45, fogCol: "#9aa4b8", rays: 0.35, rayPos: [0.5, -0.1], motes: 0.4, moteKind: 1, moteCol: "#dfe6ff" }),
  plate("vineyard", "Vineyard", "Rolling vines at golden hour under a soft haze.", "dark", "warm nature earthy", { horizon: 0.35, sway: 0.7, sky: 0.7, fog: 0.2, fogCol: "#f6d29c", motes: 0.4, moteKind: 1, moteCol: "#fff0c8" }),
  plate("tropic", "Tropic", "Palms and turquoise water at sunset, the tide moving.", "dark", "fresh warm nature", { horizon: 0.62, sway: 0.6, water: 0.8, sky: 0.7, motes: 0.3, moteKind: 1, moteCol: "#ffe3c0" }),
];

// Original shader scenes.
const sh = (id, label, note, tone, moods, extra = {}) => ({ id, label, note, tone, moods: moods.split(" "), family: "shader", group: "Signature", face: "serif", layout: "center", ...extra });
export const SIGNATURE = [
  sh("chrome", "Liquid chrome", "An iridescent violet ribbon turning slowly in the dark.", "dark", "brand bold luxe tech"),
  sh("dust", "Dust wave", "A sheet woven from glowing dust, folding over itself.", "dark", "mono tech calm", { layout: "low" }),
  sh("noir", "Noir light", "A black and white studio, a spotlight, glass slabs and raking light.", "dark", "mono bold luxe", { face: "condensed" }),
  sh("nocturne", "Nocturne", "A night forest in blue and violet, mist and glowing flowers.", "dark", "calm nature brand", { face: "sans", layout: "panel" }),
  sh("caustics", "Caustics", "Sunlight dancing on the floor of a pool, seen from above.", "dark", "fresh calm"),
  sh("rainglass", "Rain glass", "A window at night, drops running over soft city lights.", "dark", "calm bold"),
  sh("topo", "Contours", "Slowly shifting contour lines, like a survey map in light.", "light", "mono light calm", { face: "sans" }),
];

const PAPER_GROUP = { meshGradient: "Gradients", staticMeshGradient: "Gradients", grainGradient: "Gradients", staticRadialGradient: "Gradients", warp: "Ink and texture", neuroNoise: "Ink and texture", liquidMetal: "Light and glass", godRays: "Light and glass", smokeRing: "Light and glass", colorPanels: "Light and glass", pulsingBorder: "Light and glass", dotOrbit: "Light and glass" };
export const PAPER = PAPER_SCENES.map((s) => ({ id: s.id, label: s.label, note: s.note, tone: s.tone, moods: s.moods, family: "paper", group: PAPER_GROUP[s.shader] || "Play and retro", face: "sans", layout: "center", credit: "Paper Shaders", paper: s }));

// The okaybabe tier: calm, texture-like surfaces that sit well behind words.
const OB_TONE = { halation: "light", vellum: "light" };
export const ADVANCED = OKAYBABE.filter((v) => !["chroma-bleed", "hessian", "ink-run", "membrane", "quarry"].includes(v.id.replace(/^ob-/, ""))).map((v) => ({
  id: v.id,
  label: v.label,
  note: v.note,
  tone: OB_TONE[v.id.replace(/^ob-/, "")] || "dark",
  moods: ["calm", "luxe"],
  family: "okaybabe",
  group: "Advanced shaders",
  face: "sans",
  layout: "center",
  credit: "okaybabe",
}));

export const SCENES = [...PLATES, ...SIGNATURE, ...PAPER, ...ADVANCED].map((s) => ({ ...s, flat: FLATS[s.id] || (s.tone === "light" ? "#e9e6ef" : "#0d0a14") }));
export const SCENE_GROUPS = ["Living photos", "Signature", "Gradients", "Light and glass", "Ink and texture", "Play and retro", "Advanced shaders"];
export const MOODS = ["calm", "bold", "warm", "fresh", "nature", "luxe", "tech", "play", "retro", "mono", "light", "brand"];

// Older names for the same lists, kept for code that still uses them.
export const ATMOSPHERES = SCENES;
export const ALL_ATMOSPHERES = SCENES;
export const ATMOS_IDS = SCENES.map((a) => a.id);
const BY_ID = new Map(SCENES.map((s) => [s.id, s]));
export const atmosById = (id) => BY_ID.get(id) || BY_ID.get("chrome");
export const sceneHasMood = (s, m) => (m === "light" ? s.tone === "light" : (s.moods || []).includes(m));

/** The small picture of a scene, for pickers. */
export const thumbOf = (id) => asset("/scenes/thumbs/" + atmosById(id).id + ".webp");
/** The files a scene needs next to the site (the picture of a living plate). */
// A still picture of the scene, shown where live WebGL is not worth it (no graphics card).
const posterPath = (s) => (s.family === "plate" ? "/scenes/plates/" : "/scenes/posters/") + s.id + ".webp";
export const posterOf = (id) => asset(posterPath(atmosById(id)));
export function sceneFiles(id) {
  const s = atmosById(id);
  return [posterPath(s)];
}
export const plateSrc = (id) => asset("/scenes/plates/" + id + ".webp");

// Which scene suits which kind of business or person, for the local director.
const FIT = [
  [/landscap|botanic|garden cent|nurser/, "sunbeam-forest"],
  [/flower|florist|wedding|perfume|candle/, "night-meadow"],
  [/lavender|soap|aroma/, "lavender"],
  [/spa|massage|sauna|retreat/, "spa"],
  [/beauty|salon|nail|lash|skin/, "pp-velvet"],
  [/bakery|bread|cafe|coffee|tea|brunch/, "morning-cafe"],
  [/restaurant|food|kitchen|catering|bistro|pizza|grill|chef/, "pp-nectar"],
  [/wine|vineyard|winery|olive/, "vineyard"],
  [/farm|organic|grain|harvest|agri/, "golden-wheat"],
  [/pool|swim|surf|dive|marine|boat|yacht|sail|fish/, "reef"],
  [/hotel|resort|villa|beach|holiday|tour|travel/, "tropic"],
  [/hike|hiking|outdoor|camp|adventure|ski|mountain|climb/, "alpenglow"],
  [/eco|climate|green|nature|environment|solar|energy/, "misty-valley"],
  [/\bbar\b|lounge|cocktail|jazz|nightlife|taxi|\bcity\b|urban|novel|poet/, "city-rain"],
  [/law|legal|notary|account|audit|tax/, "concrete"],
  [/architect|interior|construction|property|real ?estate|realty/, "concrete"],
  [/finance|bank|invest|insurance|wealth|fund/, "pp-ink-violet"],
  [/consult|coach|strategy|advis/, "pp-violet-mesh"],
  [/school|tutor|academy|course|university|teacher|library|book|author|writer|editor|journal/, "library"],
  [/carpent|wood|furnitur|trades|plumb|electric|repair|builder|handyman|craft/, "workshop"],
  [/dent|clinic|doctor|medical|hospital|health|therapy|physio|pharm|vet/, "clinic"],
  [/gym|fitness|trainer|boxing|crossfit|sport|athlet/, "gym"],
  [/yoga|pilates|wellness|meditat|sleep|care/, "sky-isle"],
  [/photo|film|video|cinema|tattoo|barber/, "noir"],
  [/fashion|cloth|apparel|jewel|sneaker|luxury|watch/, "violet-studio"],
  [/shop|store|retail|product|brand/, "violet-studio"],
  [/space|aero|astro|launch|crypto|web3/, "nebula"],
  [/\bai\b|data|research|science|analytics|machine/, "pp-synapse"],
  [/event|festival|party|club|dj|music|concert/, "pp-stage"],
  [/kids|toy|play|game|candy|sweet/, "pp-candy"],
  [/design|agency|creative|marketing|portfolio|freelance|artist|illustrat/, "chrome"],
  [/saas|software|app|startup|tech|cloud|platform|automation|engineer|developer|devops|it\b/, "pp-rays"],
  [/product manager|manager|ceo|founder|director|lead/, "pp-violet-mesh"],
];

/** The local director: a scene from the category and the site's words, with no AI. */
export function pickAtmos(category, words) {
  const text = (String(category || "") + " " + String(words || "")).toLowerCase();
  const hit = FIT.find(([re]) => re.test(text));
  return hit ? hit[1] : "chrome";
}

// Older designs saved a simple backdrop, a 3D journey world or a scene that was retired.
export const LEGACY = { summit: "alpenglow", isles: "sky-isle", horizon: "nebula", studio: "violet-studio", "pp-olive": "pp-sunset", "pp-ripple": "pp-grain-violet", "pp-lava": "pp-candy", "pp-pixel-orb": "pp-pixel-swirl", "pp-pool": "pp-bubbles", "ob-ink-run": "ob-vellum", "ob-membrane": "ob-vellum", "ob-quarry": "ob-foxglove", silk: "chrome", particles: "nebula", mesh: "pp-violet-mesh", aurora: "aurora-lake", grid: "dust", ocean: "ocean", jungle: "sunbeam-forest", cosmos: "nebula", meadow: "night-meadow", garden: "night-meadow", constellation: "nebula" };
export const atmosOf = (v) => (BY_ID.has(v) ? v : LEGACY[v] || "");

/** The scene a saved design opens in: its own pick, else the local director's for its kind. */
export function siteAtmos(d, category, words) {
  const s = d || {};
  return atmosOf(s.atmos) || pickAtmos(category, words);
}
