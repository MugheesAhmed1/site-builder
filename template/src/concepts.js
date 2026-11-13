// Scene concepts: living set pieces with a star. A humpback whale glides out of the deep
// and holds beside your headline, a macaw flies in and lands on a branch, koi gather where
// you point, an eagle circles over the ridges. Every concept is a real-time 3D scene drawn by
// the engine in ./live (WebGL, original code, no picture files and no libraries): creatures
// are modelled in code and animated with a swimming spine, flapping wings or a pulsing bell,
// they follow the pointer, react to taps and leave as the page scrolls.
//
// Each scene comes in up to four looks: lifelike, particles (the creature made of points of
// light in the site's own colours), silhouette (a painted sky) and cartoon. The look is part
// of the concept id: "whale" is lifelike, "p-whale" particles, "n-whale" silhouette and
// "c-whale" cartoon.
import { LIVE, LOOKS, LOOKS_FOR } from "./live/catalog.js";

export const CONCEPT_STYLES = LOOKS;

const PREFIX = { real: "", particle: "p-", nature: "n-", cartoon: "c-" };

// Which kinds of site each scene suits, best first (category ids from lib/categories.ts and
// role ids from lib/fit.ts).
const FITS = {
  whale: "consulting law hotel nonprofit health hospital general portfolio role-ceo role-finance role-pm role-data",
  orca: "law consulting agency auto role-ceo role-finance role-engineer role-sales general",
  dolphins: "hotel events fitness school pets nonprofit dentist general",
  manta: "product agency design photo role-designer role-dev role-creator general portfolio",
  turtle: "nonprofit health hotel school pets dentist hospital role-teacher general",
  shark: "agency product consulting role-ceo role-sales role-it general",
  jelly: "beauty creator events agency role-designer role-creator general portfolio",
  koi: "food hotel beauty health shop nonprofit role-writer role-hr general",
  parrot: "food hotel pets events nonprofit school creator shop agency role-marketer role-student general portfolio",
  jungle: "nonprofit hotel school pets events creator health role-teacher role-student general portfolio",
  eagle: "consulting law finance property auto trades role-ceo role-it role-engineer role-finance general portfolio",
  flamingos: "beauty hotel events shop property role-designer role-hr general",
  owl: "law school writer events role-writer role-dev role-data role-teacher general",
  balloons: "hotel events property consulting nonprofit role-ceo role-pm general",
  lanterns: "events food hotel nonprofit beauty creator general",
  plane: "agency product consulting school role-pm role-marketer role-student role-dev general portfolio",
  butterflies: "beauty health nonprofit school shop role-hr role-designer general",
  hummingbird: "beauty health food shop role-designer role-writer general",
};

// Old concepts from before the 3D engine, and where each one now leads.
const ALIAS = {
  shark: "shark", bigfish: "koi", safari: "flamingos", tiger: "jungle", monkey: "jungle", wolf: "eagle", fox: "owl", horses: "eagle",
  monarchs: "butterflies", sail: "dolphins", biplane: "plane", launch: "plane", lagoon: "parrot", bamboo: "jungle", lavender: "butterflies",
  "p-elephant": "p-whale", "p-fish": "p-koi", "p-horse": "p-eagle", "p-butterfly": "p-butterflies", "p-dolphin": "p-whale", "p-dragon": "p-eagle",
  "n-hills": "n-flamingos", "n-moonwhale": "n-whale", "n-savanna": "n-flamingos", "n-jungle": "jungle", "n-ridge": "n-eagle", "n-fox": "n-eagle",
  "n-flamingo": "n-flamingos", "n-parrot": "n-eagle", "n-turtle": "n-whale", "n-butterflies": "n-flamingos", "n-gulls": "n-flamingos", "n-dino": "n-flamingos", "n-kite": "n-balloons",
  "c-spout": "c-whale", "c-fish": "c-koi", "c-shark": "c-orca", "c-octopus": "c-jelly", "c-crab": "c-turtle", "c-rocket": "c-plane", "c-ufo": "c-plane", "c-astronaut": "c-plane",
  "c-bee": "c-butterflies", "c-monkey": "c-parrot", "c-dino": "c-parrot", "c-tiger": "c-parrot", "c-elephant": "c-balloons", "c-horse": "c-balloons", "c-dragon": "c-plane",
  "c-eagle": "c-plane", "c-doves": "c-flamingos", "c-kite": "c-plane", "c-lanterns": "c-balloons", "c-sail": "c-dolphins", "c-duck": "c-koi", "c-robot": "c-plane",
  "c-plushocto": "c-jelly", "c-birds": "c-flamingos", "c-jelly": "c-jelly", "p-jelly": "p-jelly", "p-plane": "p-plane",
};

const LIST = [];
for (const look of LOOKS.map((l) => l.id))
  for (const [scene, def] of Object.entries(LIVE)) {
    if (!(LOOKS_FOR[scene] || ["real"]).includes(look)) continue;
    const id = PREFIX[look] + scene;
    const name = look === "real" ? def.name : `${def.name}, ${look === "particle" ? "particles" : look === "nature" ? "silhouette" : "cartoon"}`;
    const hint = look === "particle" ? def.hint + " Drawn in points of light in your site's colours; the pointer parts them like water." : look === "nature" ? def.hint + " Shown in silhouette against a painted sky." : look === "cartoon" ? def.hint + " Drawn in bright cartoon colours." : def.hint;
    LIST.push({ id, scene, look, name, hint, fits: (FITS[scene] || "general").split(" "), dark: def.theme !== "light" || look === "nature" });
  }

export const CONCEPTS = Object.fromEntries(LIST.map((c) => [c.id, c]));
export const CONCEPT_IDS = LIST.map((c) => c.id);

// Scene types for the picker (scenes.js adds these to its list).
export const CONCEPT_TYPES = LIST.map((c) => ({ id: c.id, group: "concept", style: c.look, name: c.name, hint: c.hint, fits: c.fits }));

/** The current id for a concept id, following renames from older versions. */
export function conceptAlias(type) {
  if (Object.prototype.hasOwnProperty.call(CONCEPTS, type)) return type;
  const to = ALIAS[type];
  return to && Object.prototype.hasOwnProperty.call(CONCEPTS, to) ? to : null;
}

export function isConcept(type) {
  return !!conceptAlias(type);
}

/** The scene and look a concept id stands for. */
export function conceptInfo(type) {
  const id = conceptAlias(type);
  return id ? CONCEPTS[id] : null;
}

// Concepts draw everything in code, so a download needs no picture files for them.
export function conceptAssets() {
  return [];
}

// Concepts that suit a category, best first (fits lists are written best first).
export function conceptsFor(category) {
  const rank = (t) => t.fits.indexOf(category);
  const hit = CONCEPT_TYPES.filter((t) => t.fits.includes(category)).sort((a, b) => rank(a) - rank(b));
  return (hit.length ? hit : CONCEPT_TYPES.filter((t) => t.fits.includes("general"))).map((t) => t.id);
}
