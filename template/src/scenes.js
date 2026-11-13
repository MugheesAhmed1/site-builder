// Live scenes: interactive visuals that go beyond cartoons. Particles that form your name,
// fireflies that follow the pointer, rain you can shelter from, a globe you can spin, your
// own photo with a spotlight or a ripple, glossy orbs you can throw. Every scene reacts to
// the pointer, to clicks or taps, and most to scroll. Plain data here; drawn by Scenes.jsx.
import { REAL_FISH, REAL_PLATES, REAL_PROPS, REAL_SPRITES } from "./real.js";
import { CONCEPT_STYLES, CONCEPT_TYPES, conceptAssets, isConcept } from "./concepts.js";

export { CONCEPT_STYLES };

export const SCENE_GROUPS = [
  { id: "concept", name: "Scene concepts" },
  { id: "particles", name: "Particles" },
  { id: "nature", name: "Nature" },
  { id: "photo", name: "Your photo" },
  { id: "depth", name: "3D and physics" },
  { id: "real", name: "Real life" },
  { id: "three", name: "Real 3D" },
];

export const SCENE_TYPES = [
  { id: "swarm", group: "particles", name: "Name in particles", hint: "Your name made of dots. Point to push them, tap to scatter." },
  { id: "constellation", group: "particles", name: "Constellation", hint: "Linked stars. The pointer joins in; tap to add stars." },
  { id: "vortex", group: "particles", name: "Vortex", hint: "A swirl that follows the pointer." },
  { id: "flow", group: "particles", name: "Flow field", hint: "Streams that bend around the pointer." },
  { id: "globe", group: "particles", name: "Dot globe", hint: "A globe of dots. Drag to spin it." },
  { id: "dotgrid", group: "particles", name: "Magnetic dots", hint: "A dot grid that bends to the pointer. Tap to send a wave." },
  { id: "fireflies", group: "nature", name: "Fireflies", hint: "They gather near the pointer and scatter when tapped." },
  { id: "waves", group: "nature", name: "Ocean waves", hint: "Waves rise under the pointer. Tap to make a splash." },
  { id: "petals", group: "nature", name: "Falling petals", hint: "Petals drift with the wind of the pointer." },
  { id: "snow", group: "nature", name: "Snowfall", hint: "Snow that swirls away from the pointer." },
  { id: "meadow", group: "nature", name: "Meadow", hint: "Grass and flowers that bend as the pointer passes." },
  { id: "stars", group: "nature", name: "Night sky", hint: "Twinkling stars with depth. Tap for a shooting star." },
  { id: "rain", group: "nature", name: "Rain", hint: "The pointer is an umbrella. Tap to splash." },
  { id: "tree", group: "nature", name: "Living tree", hint: "A tree that sways in the pointer's wind. Tap to shake leaves." },
  { id: "aquarium", group: "nature", name: "Aquarium", hint: "Fish follow the pointer. Tap to feed them." },
  { id: "sky", group: "nature", name: "Sky and sun", hint: "Clouds drift and the sun follows the pointer." },
  { id: "tilt", group: "photo", name: "Photo tilt", hint: "Your photo tilts in 3D with a light glare." },
  { id: "reveal", group: "photo", name: "Colour spotlight", hint: "Black and white until the pointer brings colour." },
  { id: "pixels", group: "photo", name: "Photo particles", hint: "Your photo built from dots that scatter from the pointer." },
  { id: "ripple", group: "photo", name: "Water ripple", hint: "Your photo ripples like water as the pointer moves." },
  { id: "slices", group: "photo", name: "Photo slices", hint: "Your photo split into strips that slide apart." },
  { id: "orbs", group: "depth", name: "Glossy orbs", hint: "Shiny balls with gravity. Grab and throw them." },
  { id: "bubbles", group: "depth", name: "Word bubbles", hint: "Your services or skills as bubbles you can throw around." },
  { id: "liquid", group: "depth", name: "Liquid metal", hint: "Molten blobs that stretch toward the pointer." },
  { id: "glass", group: "depth", name: "Glass shapes", hint: "Frosted glass shapes that tilt and float." },
  { id: "charms", group: "depth", name: "Hanging charms", hint: "Charms on real chains. The pointer pushes them; grab one and let it swing." },
  // The real-life pack: photoreal sprites from public/real instead of drawn shapes.
  { id: "reef", group: "real", name: "Real aquarium", hint: "Real fish swim around and follow the pointer. Tap to feed them." },
  { id: "leaves", group: "real", name: "Autumn leaves", hint: "Real leaves tumble down and blow away from the pointer. Tap for a gust." },
  { id: "blossoms", group: "real", name: "Blossom petals", hint: "Cherry blossom and rose petals drift in the pointer's wind." },
  { id: "butterflies", group: "real", name: "Butterflies", hint: "Butterflies flutter after the pointer. Tap to scatter them." },
  { id: "flurry", group: "real", name: "Snowflakes", hint: "Real ice crystals that swirl away from the pointer." },
  { id: "drift", group: "real", name: "Floating seeds", hint: "Dandelion seeds, feathers and bubbles rise and dodge the pointer." },
  { id: "beans", group: "real", name: "Coffee beans", hint: "Roasted beans tumble down. Tap to toss them back up." },
  { id: "gold", group: "real", name: "Gold flakes", hint: "Shimmering gold leaf falls slowly. Tap for a burst." },
  { id: "seafloor", group: "real", name: "Under the sea", hint: "A real reef with swaying coral and fish that follow the pointer. Tap to feed them." },
  { id: "clouds", group: "real", name: "Drifting clouds", hint: "Clouds, birds and balloons drift across a real sky that shifts with the pointer." },
  { id: "moonlit", group: "real", name: "Moonlit night", hint: "A starry sky with a moon and a planet you can nudge around." },
  { id: "garden", group: "real", name: "Flower garden", hint: "Flowers sway in the pointer's wind while butterflies visit." },
  { id: "cafe", group: "real", name: "Café table", hint: "Pastries and coffee float in a warm café and dodge the pointer." },
  { id: "woodland", group: "real", name: "Forest light", hint: "Leaves fall through a sunlit forest. Tap for a gust." },
  { id: "winter", group: "real", name: "Snowy forest", hint: "Snow falls over quiet pines and swirls away from the pointer." },
  { id: "shore", group: "real", name: "Ocean breeze", hint: "Gulls glide over a calm sea at golden hour." },
  { id: "peaks", group: "real", name: "Misty peaks", hint: "Clouds and birds drift past layers of misty mountains." },
  { id: "dunes", group: "real", name: "Desert dunes", hint: "Hot air balloons float over golden dunes." },
  { id: "autumn", group: "real", name: "Autumn walk", hint: "Leaves and chestnuts tumble down an autumn path." },
  { id: "citylights", group: "real", name: "City lights", hint: "Gold flakes shimmer over a city at dusk." },
  { id: "tropics", group: "real", name: "Tropical leaves", hint: "Palm and monstera leaves sway as the pointer passes. Butterflies included." },
  { id: "treats", group: "real", name: "Floating treats", hint: "Croissants, berries and macarons float and dodge the pointer." },
  // Real 3D, drawn with three.js (react-three-fiber). Loaded only when one is on the page.
  { id: "orb", group: "three", name: "Living orb", hint: "A 3D orb that breathes and leans toward the pointer. Tap to send a ripple across it." },
  { id: "crystals", group: "three", name: "Floating crystals", hint: "Faceted 3D gems drift and slip away from the pointer. Tap to burst them apart." },
  { id: "terrain", group: "three", name: "Flowing landscape", hint: "Glide over glowing 3D hills. They rise under the pointer; tap for a shockwave." },
  { id: "galaxy", group: "three", name: "Spiral galaxy", hint: "Thousands of stars in 3D. Drag to turn it, tap for a burst, scroll to dive in." },
  { id: "ribbons", group: "three", name: "Silk ribbons", hint: "Satin ribbons twist in 3D and bow toward the pointer. Tap to send a wave." },
  { id: "knot", group: "three", name: "Pearl knot", hint: "A shimmering 3D sculpture. Drag to spin it, tap to tie a new knot." },
  { id: "name3d", group: "three", name: "Name in 3D blocks", hint: "Your name built from 3D blocks. The pointer pushes them; tap to blow them apart." },
  { id: "blocks", group: "three", name: "Block field", hint: "A 3D field of blocks that rise under the pointer. Tap to drop a ripple." },
  // Scene concepts: animated set pieces with a star (a parrot flies in, a whale swims past,
  // a walk through the jungle). Defined in concepts.js.
  ...CONCEPT_TYPES,
];

// Which pictures each real-life scene uses. A downloaded site copies just these files.
const S = (...ids) => ids.map((id) => REAL_SPRITES[id] || REAL_PROPS[id]).filter(Boolean);
const FISH = REAL_FISH.map((f) => f.src);
// A few real-animal characters double as sprites (the butterfly flutters in the garden).
const REAL_CHARACTERS_SRC = (...ids) => ids.map((id) => `/real/animals/${id}.webp`);
const LEAVES = ["maple", "oak", "ginkgo", "green-leaf"];
const BIRDS = { mode: "drift", sprites: S("sparrow", "gull", "dove"), count: 3, size: [30, 52], speed: 2.4, flap: true, band: [0.08, 0.45] };
const CLOUDS = { mode: "drift", sprites: S("cloud-3"), count: 6, size: [140, 300], speed: 0.45, band: [0.02, 0.55], alpha: 0.95 };
const FLUTTER = { mode: "fly", sprites: [...S("butterfly-blue"), ...REAL_CHARACTERS_SRC("butterfly")], count: 5, size: [30, 50] };
export const REAL_SCENES = {
  reef: { mode: "swim", sprites: FISH, count: 12, size: [54, 96] },
  leaves: { mode: "fall", sprites: S(...LEAVES), count: 30, size: [26, 50] },
  blossoms: { mode: "fall", sprites: S("petal-pink", "rose-petal", "petal-pink", "daisy-petal", "lavender"), count: 42, size: [16, 32] },
  butterflies: { mode: "fly", sprites: [...S("butterfly-blue", "ladybug"), ...REAL_CHARACTERS_SRC("butterfly")], count: 10, size: [34, 58] },
  flurry: { mode: "fall", sprites: S("snowflake"), count: 46, size: [12, 34], speed: 0.6 },
  drift: { mode: "rise", sprites: S("feather", "bubble", "bubble", "daisy-petal"), count: 26, size: [22, 46] },
  beans: { mode: "fall", sprites: S("coffee-bean", "coffee-bean", "star-anise"), count: 26, size: [16, 28], speed: 1.3 },
  gold: { mode: "fall", sprites: S("confetti-gold"), count: 40, size: [10, 26], speed: 0.5, shimmer: true },
  seafloor: { plate: REAL_PLATES.reef, veil: 0.18, layers: [{ mode: "swim", sprites: FISH, count: 10, size: [50, 90] }, { mode: "sway", sprites: S("seaweed", "coral-pink", "anemone", "coral-orange", "seaweed", "starfish"), count: 7, size: [70, 150] }] },
  clouds: { plate: REAL_PLATES.sky, veil: 0.2, layers: [CLOUDS, BIRDS, { mode: "drift", sprites: S("balloon", "party-balloon"), count: 2, size: [50, 90], speed: 0.4, bob: 3, band: [0.15, 0.7] }] },
  moonlit: { plate: REAL_PLATES.night, veil: 0.12, layers: [{ mode: "float", sprites: S("moon", "planet"), count: 2, size: [80, 130] }] },
  garden: { plate: REAL_PLATES.blossom, veil: 0.32, layers: [{ mode: "sway", sprites: S("sunflower", "tulip", "daisy", "fern", "lotus", "orchid"), count: 9, size: [120, 220] }, FLUTTER] },
  cafe: { plate: REAL_PLATES.cafe, veil: 0.3, layers: [{ mode: "float", sprites: S("croissant", "coffee-cup", "macaron", "strawberry", "cherry", "chocolate", "lemon", "mint"), count: 8, size: [50, 95] }, { mode: "fall", sprites: S("coffee-bean"), count: 12, size: [14, 24], speed: 1.2 }] },
  woodland: { plate: REAL_PLATES.forest, veil: 0.22, layers: [{ mode: "fall", sprites: S(...LEAVES), count: 18, size: [24, 46] }] },
  winter: { plate: REAL_PLATES.snow, veil: 0.2, layers: [{ mode: "fall", sprites: S("snowflake"), count: 40, size: [10, 30], speed: 0.6 }] },
  shore: { plate: REAL_PLATES.ocean, veil: 0.18, layers: [{ ...BIRDS, count: 4, size: [34, 62] }, { ...CLOUDS, count: 3, alpha: 0.7 }] },
  peaks: { plate: REAL_PLATES.mountains, veil: 0.18, layers: [{ ...CLOUDS, count: 4, alpha: 0.75, band: [0.1, 0.6] }, BIRDS] },
  dunes: { plate: REAL_PLATES.dunes, veil: 0.2, layers: [{ mode: "drift", sprites: S("balloon"), count: 3, size: [44, 90], speed: 0.35, bob: 3, band: [0.08, 0.55] }] },
  autumn: { plate: REAL_PLATES.autumn, veil: 0.22, layers: [{ mode: "fall", sprites: S("maple", "oak", "chestnut", "maple", "pinecone"), count: 20, size: [20, 44] }] },
  citylights: { plate: REAL_PLATES.city, veil: 0.15, layers: [{ mode: "fall", sprites: S("confetti-gold"), count: 30, size: [10, 24], speed: 0.45, shimmer: true }] },
  tropics: { layers: [{ mode: "sway", sprites: S("palm-leaf", "monstera", "fern", "monstera"), count: 8, size: [110, 210] }, FLUTTER] },
  treats: { layers: [{ mode: "float", sprites: S("croissant", "macaron", "strawberry", "cherry", "lemon", "chocolate", "donut", "cupcake", "blueberries", "watermelon", "coffee-cup"), count: 10, size: [50, 95] }] },
};

// The picture files a scene needs, so a download can include them.
export function sceneAssets(def) {
  if (def && isConcept(def.type)) return conceptAssets(def.type);
  const r = def && REAL_SCENES[def.type];
  if (!r) return [];
  return [...new Set([r.plate, ...(r.layers || [r]).flatMap((l) => l.sprites)].filter(Boolean))];
}

export const SCENE_PALETTES = [
  { id: "brand", name: "Your colours" },
  { id: "forest", name: "Forest", colors: ["#2f7d4f", "#a7d98b", "#f4e8a1"] },
  { id: "ocean", name: "Ocean", colors: ["#1b6ca8", "#5ec8e5", "#d6f3ff"] },
  { id: "sunset", name: "Sunset", colors: ["#ff7a59", "#ffc15e", "#e2446c"] },
  { id: "night", name: "Night", colors: ["#c9d6ff", "#ffe9a8", "#7aa2ff"] },
  { id: "mono", name: "Mono" },
];

function build() {
  const out = [];
  let n = 1;
  // Concepts get their own numbers (SC-01...) so the older scene ids stay the same.
  let k = 1;
  for (const t of SCENE_TYPES) {
    if (t.group === "concept") {
      out.push({ id: "SC-" + String(k++).padStart(2, "0"), type: t.id, group: t.group, style: t.style, palette: "brand", name: t.name });
      continue;
    }
    // Real-life scenes are photographs, so they come in one version instead of six palettes.
    for (const p of t.group === "real" ? SCENE_PALETTES.slice(0, 1) : SCENE_PALETTES)
      if (t.group === "real") out.push({ id: "S-" + String(n++).padStart(3, "0"), type: t.id, group: t.group, palette: p.id, name: t.name });
      else out.push({ id: "S-" + String(n++).padStart(3, "0"), type: t.id, group: t.group, palette: p.id, name: `${t.name}, ${p.name.toLowerCase()}` });
  }
  return out;
}

export const SCENES = build();

export function sceneById(id, list = SCENES) {
  return list.find((s) => s.id === id) || null;
}
export function sceneType(id) {
  return SCENE_TYPES.find((t) => t.id === id) || SCENE_TYPES[0];
}
