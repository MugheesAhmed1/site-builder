// The living scenes as data. Each scene says which environment to paint, how it is lit and
// who is on stage doing what (see acts.js). resolve() mixes in a look (lifelike, particles,
// cartoon or ink silhouettes) and the person's own settings, and gives stage.js what to run.
// Everything here is original: creatures are modelled in code (models.js), the sky, the
// water and the jungle are shaders (shaders.js). No pictures are downloaded.
import { hexToRgb, mix3 } from "./gl.js";
import { foliage, walkLayer } from "./layers.js";

const H = (h) => hexToRgb(h);
const HS = (...l) => l.map(H);

// ---------------------------------------------------------------- shared settings
const WATER = {
  env: "deep",
  envColors: HS("#7fd0e6", "#1b6d94", "#04182c", "#bfeeff"),
  light: { dir: [0.25, 0.9, 0.35], sun: H("#e9f6ff"), ambTop: H("#3d7f9d"), ambBot: H("#0a2a44"), rim: H("#7fd4f0"), fogTop: H("#2b86a8"), fogBot: H("#06233b"), fog: 0.085, caustic: 0.55, tint: H("#ffb347") },
  dust: [
    { count: 260, drift: [0.004, -0.012, 0], size: 5, wobble: 0.012, col: H("#cfefff"), alpha: 0.45, box: [1.6, 1.6, 10] },
    { count: 36, drift: [0, 0.035, 0], size: 13, wobble: 0.02, col: H("#d9f4ff"), alpha: 0.5, ring: 1, box: [1.5, 1.5, 8], push: 0.08 },
  ],
  sparks: { col: H("#e6f8ff"), ring: 1, rise: 0.9 },
  camera: { px: 0.45, py: 0.25 },
  theme: "dark",
};
const NIGHTWATER = {
  ...WATER,
  envColors: HS("#163a6b", "#0a1d3c", "#020713", "#7fb6ff"),
  envA: 0.55,
  light: { ...WATER.light, sun: H("#9cc4ff"), ambTop: H("#1d3c6e"), ambBot: H("#040c1c"), rim: H("#9fd0ff"), fogTop: H("#0b2348"), fogBot: H("#020812"), fog: 0.11, caustic: 0.2, glow: 0.35 },
  dust: [{ count: 300, drift: [0.003, -0.01, 0], size: 6, wobble: 0.015, col: H("#9fd8ff"), alpha: 0.6, box: [1.6, 1.6, 10] }],
  sparks: { col: H("#bfe4ff"), ring: 0, rise: 0.5 },
};
const SKY = (o) => ({
  env: "sky",
  camera: { px: 0.35, py: 0.18 },
  light: { dir: [0.6, 0.55, 0.55], sun: H("#fff4dc"), ambTop: H("#b9cde6"), ambBot: H("#6d6a72"), rim: H("#fff1d0"), fogTop: H("#cfe0f0"), fogBot: H("#e9e0d4"), fog: 0.035 },
  sparks: { col: H("#fff7e0"), rise: 0.2, add: 1 },
  theme: "light",
  ...o,
});

const SCHOOL = (o = {}) => ({ model: "reefFish", act: "school", size: 0.022, sizeTall: 0.04, count: 46, spot: [0.62, 0.42], spotTall: [0.5, 0.3], tintAmt: 0.7, radius: 0.42, ...o });

// The jungle's foliage, painted once per page. Far layers are pale with mist; the near one
// is soft and dark, framing the corners like leaves right in front of the lens.
let jungleTex = null;
const jungleLayers = (walk) => {
  if (!jungleTex) {
    jungleTex = {
      far: foliage(["fern", "palm", "fern", "monstera", "palm"], { colors: ["#3d7a55", "#4b8a5c", "#356f4c"], vein: "#7fb886", seed: 3, blur: 1.5 }),
      mid: foliage(["monstera", "banana", "fern", "palm"], { colors: ["#225d37", "#2e7340", "#1b4f2f"], vein: "#6fae6b", seed: 7, gap: 0.15 }),
      vine: foliage(["vine", "vine", "vine"], { w: 768, colors: ["#1f5432", "#2a6838"], vein: "#3d5a2a", seed: 11, gap: 0.3 }),
      near: foliage(["banana", "monstera"], { colors: ["#0a2213", "#0f2e1a"], vein: "#1a3d24", seed: 5, blur: 7, gap: 0.35 }),
    };
  }
  const k = walk ? 1 : 0.25;
  return [
    walkLayer(jungleTex.far, [{ z: -12, w: 1.1, h: 0.5, speed: 0.12 * k, fog: 0.72, scroll: 0.1, lift: -0.02 }]),
    walkLayer(jungleTex.mid, [{ z: -5, w: 1.6, h: 0.42, speed: 0.3 * k, fog: 0.42, scroll: 0.25, lift: -0.04 }]),
    walkLayer(jungleTex.vine, [{ z: -3, w: 1.4, h: 0.5, speed: 0.4 * k, fog: 0.35, top: true, lift: 0.06 }]),
    walkLayer(jungleTex.near, [{ z: 2.6, w: 2.4, h: 0.62, speed: 1.0 * k, fog: 0, scroll: 0.8, lift: -0.26, sway: 0.05, alpha: 0.96 }]),
  ];
};

// ---------------------------------------------------------------- the scenes
export const LIVE = {
  whale: {
    name: "Humpback whale", hint: "A humpback whale glides out of the deep and holds beside your headline, turning to follow the pointer. Tap it for a slow roll and a stream of bubbles; scroll and it dives.",
    ...WATER,
    actors: [{ model: "whale", act: "cruise", size: 0.5, sizeTall: 0.85, spot: [0.68, 0.5], spotTall: [0.5, 0.74] }, SCHOOL({ spot: [0.4, 0.75], count: 30 })],
  },
  orca: {
    name: "Orca", hint: "An orca sweeps in fast from the dark and patrols beside your words. Point and it turns its head; tap for a roll.",
    ...WATER, envColors: HS("#6cbfd8", "#13577d", "#020f1f", "#bfeeff"),
    actors: [{ model: "orca", act: "cruise", size: 0.32, sizeTall: 0.6, spot: [0.68, 0.48], spotTall: [0.5, 0.74], tempo: 1.1 }],
  },
  dolphins: {
    name: "Dolphin pod", hint: "Three dolphins swim together in bright blue water, each with its own rhythm. Tap one and it spins.",
    ...WATER, envColors: HS("#a8ecf5", "#2a9cc2", "#08385e", "#e8fbff"), envA: 1.2,
    actors: [
      { model: "dolphin", act: "cruise", size: 0.2, sizeTall: 0.36, spot: [0.7, 0.42], spotTall: [0.55, 0.68], seed: 1 },
      { model: "dolphin", act: "cruise", size: 0.18, sizeTall: 0.32, spot: [0.6, 0.62], spotTall: [0.38, 0.8], seed: 4, offset: [-0.3, 0, -1.4], delay: 0.6 },
      { model: "dolphin", act: "cruise", size: 0.17, sizeTall: 0.3, spot: [0.84, 0.66], spotTall: [0.7, 0.86], seed: 7, offset: [0.2, 0, -2.6], delay: 1.1 },
    ],
  },
  manta: {
    name: "Manta ray", hint: "A giant manta ray flies through open water on slow, wide wingbeats and banks toward the pointer. Scroll and it rises to the light.",
    ...WATER,
    actors: [{ model: "manta", act: "cruise", size: 0.34, sizeTall: 0.6, spot: [0.68, 0.48], spotTall: [0.5, 0.72], face: [-0.6, 0, 0.8], exit: "climb", pitch: -0.25, roll: false, bend: 0.5 }],
  },
  turtle: {
    name: "Sea turtle", hint: "A green sea turtle rows past on long flippers, looking around at the pointer. Tap and it gives a few quick strokes.",
    ...WATER, envColors: HS("#9fe3e8", "#2193a3", "#05304a", "#e0fbff"),
    actors: [{ model: "turtle", act: "cruise", size: 0.26, sizeTall: 0.48, spot: [0.68, 0.5], spotTall: [0.5, 0.72], face: [-0.8, 0.0, 0.55], roll: false, bend: 0.3 }, SCHOOL({ spot: [0.75, 0.25], count: 22 })],
  },
  shark: {
    name: "Whale shark", hint: "A spotted whale shark, the gentlest giant, cruises slowly with a school of small fish.",
    ...WATER, envColors: HS("#86d6e2", "#16698a", "#03182a", "#c9f3ff"),
    actors: [{ model: "shark", act: "cruise", size: 0.44, sizeTall: 0.8, spot: [0.66, 0.5], spotTall: [0.5, 0.72], roll: false, tempo: 0.8 }, SCHOOL({ spot: [0.62, 0.6], count: 40, radius: 0.32 })],
  },
  jelly: {
    name: "Jellyfish bloom", hint: "Glowing jellyfish pulse up through the dark water. The pointer nudges them aside; tap one and it flares.",
    ...NIGHTWATER,
    light: { ...NIGHTWATER.light, glow: 0.9, sun: H("#c9a8ff"), ambTop: H("#6b4fb0") },
    actors: [{ model: "jelly", act: "drift", size: 0.12, sizeTall: 0.2, count: 8, pulse: true, rise: 0.2, zFar: -6, zNear: 1.5, spread: [0.38, 1.02], spreadTall: [0, 1] }],
  },
  koi: {
    name: "Koi pond", hint: "Koi glide around a sunlit pond seen from above. Point and they come to you; tap the water and they dart off as rings spread.",
    env: "pond", envColors: HS("#5d9a86", "#1d4c43", "#0a201d", "#fff6d6"), envA: 0.6,
    light: { dir: [0.2, 0.35, 0.9], sun: H("#fff4d6"), ambTop: H("#9cc7b4"), ambBot: H("#2a4a40"), rim: H("#ffffff"), fogTop: H("#2f6b5c"), fogBot: H("#2f6b5c"), fog: 0, caustic: 0.35 },
    camera: { px: 0.08, py: 0.05 },
    actors: [
      { model: "koi1", act: "pond", size: 0.17, sizeTall: 0.3, seed: 1, depth: -0.4 },
      { model: "koi2", act: "pond", size: 0.15, sizeTall: 0.28, seed: 2, depth: -0.8 },
      { model: "koi3", act: "pond", size: 0.14, sizeTall: 0.26, seed: 3, depth: -1.2 },
      { model: "koi1", act: "pond", size: 0.12, sizeTall: 0.22, seed: 4, depth: -1.6 },
      { model: "koi2", act: "pond", size: 0.11, sizeTall: 0.2, seed: 5, depth: -2 },
      { model: "lily", act: "still", float: true, yaw: 0, places: [{ spot: [0.88, 0.2], size: 0.09, z: 0.6 }, { spot: [0.94, 0.38], size: 0.06, z: 0.6, rot: 2 }, { spot: [0.12, 0.88], size: 0.08, z: 0.6, rot: 4 }, { spot: [0.78, 0.9], size: 0.07, z: 0.6, rot: 1 }], scroll: 0.6 },
    ],
    dust: [{ count: 40, drift: [0.01, 0.004, 0], size: 4, wobble: 0.02, col: H("#fff2c2"), alpha: 0.35, box: [1.3, 1.3, 1] }],
    sparks: { col: H("#e9fff4"), ring: 1, rise: 0 },
    theme: "dark",
  },
  parrot: {
    name: "Macaw lands", hint: "A scarlet macaw flies in out of the rainforest, flares its wings and lands on a branch beside your headline. It watches the pointer; tap and it takes a lap and lands again. Scroll away and it flies off.",
    env: "jungle", envColors: HS("#d6efc2", "#2f7a4a", "#0a2516", "#fff1b8", "#15402a"), envA: 1,
    light: { dir: [0.5, 0.75, 0.6], sun: H("#fff1d4"), ambTop: H("#8fc39a"), ambBot: H("#2a3a26"), rim: H("#e9ffd8"), fogTop: H("#a6cfa0"), fogBot: H("#3a6a48"), fog: 0.05 },
    camera: { px: 0.4, py: 0.2 },
    actors: [
      { model: "branch", act: "still", spot: [0.8, 0.64], spotTall: [0.6, 0.78], size: 0.2, sizeTall: 0.38, z: 0, bob: 0.004, scroll: 0.35 },
      { model: "macaw", act: "perch", size: 0.17, sizeTall: 0.3, spot: [0.74, 0.64], spotTall: [0.52, 0.78], foot: [0, 0.3], z: 0.05 },
      { model: "morpho", act: "swarm", size: 0.05, count: 3, zFar: -4, zNear: 0, follow: 0.2, flutter: 0.2 },
    ],
    dust: [{ count: 120, drift: [0.005, -0.004, 0], size: 5, wobble: 0.03, col: H("#fff4c4"), alpha: 0.5, box: [1.5, 1.5, 8] }],
    sparks: { col: H("#ffe9a0"), rise: -0.4 },
    layers: "jungle",
    theme: "dark",
  },
  jungle: {
    name: "Rainforest walk", hint: "Walk through a rainforest: ferns, giant leaves and vines slide past in depth, faster as you scroll, while blue morpho butterflies keep you company.",
    env: "jungle", envColors: HS("#cfe9bc", "#2a6f45", "#081f12", "#fff1b8", "#13402a"), envA: 1.1, go: 1,
    light: { dir: [0.5, 0.75, 0.6], sun: H("#fff1d4"), ambTop: H("#8fc39a"), ambBot: H("#2a3a26"), rim: H("#e9ffd8"), fogTop: H("#a6cfa0"), fogBot: H("#3a6a48"), fog: 0.05 },
    actors: [{ model: "morpho", act: "swarm", size: 0.07, sizeTall: 0.12, count: 6, zFar: -3, zNear: 1, follow: 0.45, flutter: 0.25 }],
    dust: [{ count: 160, drift: [-0.02, -0.004, 0], size: 5, wobble: 0.03, col: H("#fff4c4"), alpha: 0.5, box: [1.5, 1.5, 8] }],
    sparks: { col: H("#cfe6ff"), rise: 0.2 },
    layers: "jungle",
    theme: "dark",
  },
  eagle: SKY({
    name: "Eagle over the ridges", hint: "A bald eagle circles in wide, banked loops over layered blue mountains. The circle leans toward the pointer; tap for a few strong wingbeats.",
    envColors: HS("#7fa8d8", "#f3d9b8", "#fff3d6", "#9fb4cf", "#2f425d"), envA: 0.78, envB: 0.62, envP: [1, 0.6, 0, 0],
    actors: [{ model: "eagle", act: "soar", size: 0.19, sizeTall: 0.34, spot: [0.6, 0.38], spotTall: [0.5, 0.3], rx: 0.4, rz: 5, ry: 0.12 }],
  }),
  flamingos: SKY({
    name: "Flamingo dawn", hint: "A line of flamingos flies over still water at dawn, necks out and legs trailing. Tap the water and rings spread.",
    envColors: HS("#f7b9c8", "#ffe1c2", "#fff1d6", "#d99aae", "#7d4a68"), envA: 0.64, envB: 0.5, envP: [0.55, 0.45, 0, 0.3],
    light: { dir: [-0.6, 0.6, 0.5], sun: H("#ffe7d2"), ambTop: H("#f4c9d2"), ambBot: H("#9a6a7a"), rim: H("#fff1e0"), fogTop: H("#f7d0d6"), fogBot: H("#ffe1c8"), fog: 0.045 },
    actors: [0, 1, 2, 3, 4].map((i) => ({ model: "flamingo", act: "cruise", size: 0.075, sizeTall: 0.14, spot: [0.62 + i * 0.07, 0.36 + i * 0.045], spotTall: [0.3 + i * 0.12, 0.5 + i * 0.04], face: [-1, 0, 0.25], seed: i * 1.7, delay: i * 0.35, wander: 0.4, roll: false, bend: 0, effort: 1, tempo: 0.9 + i * 0.04, introFar: 12, introRise: 0.3 })),
  }),
  owl: SKY({
    name: "Night owl", hint: "A barn owl glides on silent wings across a moonlit sky full of stars, turning its face toward the pointer.",
    envColors: HS("#0a1430", "#2a3a66", "#f4ecd2", "#1c2a4a", "#070d1f"), envA: 0.74, envB: 0.76, envP: [0.8, 0.25, 1, 0],
    light: { dir: [0.4, 0.6, 0.6], sun: H("#c9d6f0"), ambTop: H("#3e5486"), ambBot: H("#141a2c"), rim: H("#dfe8ff"), fogTop: H("#1d2c52"), fogBot: H("#0b1430"), fog: 0.05 },
    actors: [{ model: "owl", act: "soar", size: 0.2, sizeTall: 0.34, spot: [0.62, 0.4], spotTall: [0.5, 0.32], rx: 0.36, rz: 1.8, ry: 0.1, pace: 0.24, bank: 0.35 }],
    dust: [{ count: 30, drift: [0.01, 0.006, 0], size: 7, wobble: 0.05, col: H("#ffe9a0"), alpha: 0.8, box: [1.4, 1.2, 6] }],
    theme: "dark",
  }),
  balloons: SKY({
    name: "Balloon sunrise", hint: "Hot air balloons rise slowly into a golden sunrise over misty hills. Push them aside with the pointer; tap one to give it a lift.",
    envColors: HS("#86b4e0", "#ffd9a8", "#fff1c8", "#c9a8a8", "#6b5266"), envA: 0.72, envB: 0.42, envP: [0.75, 0.55, 0, 0],
    light: { dir: [-0.5, 0.5, 0.6], sun: H("#ffe8c4"), ambTop: H("#bcd0ea"), ambBot: H("#8a6a62"), rim: H("#ffe9c8"), fogTop: H("#dbe6f2"), fogBot: H("#f2d8c0"), fog: 0.06 },
    actors: [{ model: "balloonA", act: "drift", size: 0.1, sizeTall: 0.16, count: 3, rise: 0.08, zFar: -7, zNear: 1, spread: [0.45, 0.98], tilt: 0.05, far: true }, { model: "balloonB", act: "drift", size: 0.09, sizeTall: 0.15, count: 2, rise: 0.08, zFar: -9, zNear: -1, spread: [0.5, 0.95], tilt: 0.05, far: true }, { model: "balloonC", act: "drift", size: 0.09, sizeTall: 0.15, count: 2, rise: 0.07, zFar: -11, zNear: -3, spread: [0.3, 0.9], tilt: 0.05, far: true }],
  }),
  lanterns: SKY({
    name: "Lantern night", hint: "Warm paper lanterns rise over a still lake at night and glow on the water. Tap one and it flares.",
    envColors: HS("#0d1430", "#3a2a4a", "#ffd9a0", "#2a2140", "#0c0a1a"), envA: 0.78, envB: 0.82, envP: [0.4, 0.15, 0.8, 0.28],
    light: { dir: [0, -0.3, 0.9], sun: H("#ffb35a"), ambTop: H("#ffcf87"), ambBot: H("#ff8c3a"), rim: H("#ffdca0"), fogTop: H("#2a2140"), fogBot: H("#3a2a4a"), fog: 0.06, glow: 0.9 },
    actors: [{ model: "lantern", act: "drift", size: 0.03, sizeTall: 0.05, count: 26, rise: 0.12, zFar: -14, zNear: 2.5, spread: [0.02, 0.98], flicker: true, tilt: 0.08 }],
    dust: [{ count: 60, drift: [0.004, 0.02, 0], size: 6, wobble: 0.03, col: H("#ffcc7a"), alpha: 0.7, box: [1.4, 1.2, 8] }],
    sparks: { col: H("#ffcf7a"), rise: 0.4 },
    theme: "dark",
  }),
  plane: SKY({
    name: "Paper plane", hint: "A paper plane loops through the clouds in long glides and leans toward the pointer. Tap for a faster lap.",
    envColors: HS("#6aa8e8", "#d8ebf8", "#fffaf0", "#b9cfe6", "#8aa6c6"), envA: 0.8, envB: 0.82, envP: [0, 1, 0, 0],
    actors: [{ model: "plane", act: "soar", size: 0.17, sizeTall: 0.26, spot: [0.6, 0.45], spotTall: [0.5, 0.4], rx: 0.45, rz: 4, ry: 0.2, pace: 0.42, bank: 0.6 }],
  }),
  butterflies: {
    name: "Butterfly garden", hint: "Monarch and morpho butterflies flutter through a soft-focus garden and gather around the pointer. Tap and they scatter.",
    env: "bokeh", envColors: HS("#f6efe2", "#d9e4c8", "#ffd7a0", "#f4b8c8", "#b8d8a0"), envA: 1,
    light: { dir: [0.4, 0.8, 0.5], sun: H("#fff6e4"), ambTop: H("#e7ecd8"), ambBot: H("#8a8a72"), rim: H("#ffffff"), fogTop: H("#eef0e2"), fogBot: H("#e2e6cf"), fog: 0.04 },
    actors: [{ model: "monarch", act: "swarm", size: 0.085, sizeTall: 0.14, count: 7, zFar: -4, zNear: 1.5, follow: 0.6, flutter: 0.25 }, { model: "morpho", act: "swarm", size: 0.085, sizeTall: 0.14, count: 4, zFar: -4, zNear: 1.5, follow: 0.6, flutter: 0.25 }],
    dust: [{ count: 80, drift: [0.004, 0.006, 0], size: 6, wobble: 0.04, col: H("#fff8e0"), alpha: 0.6, box: [1.4, 1.3, 7] }],
    sparks: { col: H("#fff2c4"), rise: 0.3 },
    theme: "light",
  },
  hummingbird: {
    name: "Hummingbird", hint: "A ruby-throated hummingbird hovers on a blur of wings and follows the pointer like a tiny helper, darting when you tap.",
    env: "bokeh", envColors: HS("#fbe9ef", "#e7d4ea", "#ff9fb8", "#ffd27a", "#a8d8b0"), envA: 1,
    light: { dir: [0.4, 0.8, 0.5], sun: H("#fff4ea"), ambTop: H("#ecdcee"), ambBot: H("#8a7484"), rim: H("#ffffff"), fogTop: H("#f4e6ee"), fogBot: H("#efe0ea"), fog: 0.03 },
    actors: [{ model: "hummingbird", act: "swarm", size: 0.13, sizeTall: 0.22, count: 1, zFar: 0, zNear: 0, spot: [0.7, 0.45], spotTall: [0.5, 0.65], snap: 6, damp: 5, pitch: 0.15, flutter: 0.04 }],
    dust: [{ count: 60, drift: [0.004, 0.006, 0], size: 6, wobble: 0.04, col: H("#fff8e0"), alpha: 0.6, box: [1.4, 1.3, 7] }],
    theme: "light",
  },
};

// Looks. Not every scene has every look; LOOKS_FOR lists what each one supports.
export const LOOKS = [
  { id: "real", name: "Lifelike" },
  { id: "particle", name: "Particles" },
  { id: "nature", name: "Silhouette" },
  { id: "cartoon", name: "Cartoon" },
];
export const LOOKS_FOR = {
  whale: ["real", "particle", "nature", "cartoon"], orca: ["real", "particle", "cartoon"], dolphins: ["real", "nature", "cartoon"], manta: ["real", "particle", "nature"],
  turtle: ["real", "particle", "cartoon"], shark: ["real", "particle"], jelly: ["real", "particle", "cartoon"], koi: ["real", "particle", "cartoon"],
  parrot: ["real", "particle", "cartoon"], jungle: ["real"], eagle: ["real", "particle", "nature"], flamingos: ["real", "nature", "cartoon"], owl: ["real", "nature"],
  balloons: ["real", "nature", "cartoon"], lanterns: ["real"], plane: ["real", "particle", "cartoon"], butterflies: ["real", "particle", "cartoon"], hummingbird: ["real", "particle"],
};

// Painted skies for the silhouette look: a sunset behind dark shapes, or a moonlit sea.
const INK_SKY = {
  env: "sky", envColors: HS("#2a2d5e", "#f59a62", "#ffe2a8", "#a35a76", "#2c1c3c"), envA: 0.62, envB: 0.42, envP: [0.9, 0.35, 0.6, 0],
  light: { dir: [0, 1, 0], sun: [0, 0, 0], ambTop: [0, 0, 0], ambBot: [0, 0, 0], rim: H("#ffb27a"), fogTop: H("#8a4f7d"), fogBot: H("#f08a5d"), fog: 0.04, ink: H("#1b1029") },
  theme: "dark",
};
const INK_SEA = {
  env: "sky", envColors: HS("#070d26", "#1d3566", "#f4f0dc", "#13244d", "#020713"), envA: 0.74, envB: 0.8, envP: [0, 0.2, 1, 0.42],
  light: { dir: [0, 1, 0], sun: [0, 0, 0], ambTop: [0, 0, 0], ambBot: [0, 0, 0], rim: H("#9fbfff"), fogTop: H("#13244d"), fogBot: H("#1d3566"), fog: 0.03, ink: H("#020713") },
  theme: "dark",
};

// Cartoon versions: brighter, simpler colours.
const TOON = {
  deep: HS("#9fe9ff", "#2fb3e6", "#0c5aa6", "#ffffff"),
  pond: HS("#6fd3b8", "#2c9c86", "#13574d", "#ffffff"),
  jungle: HS("#e9ffd0", "#5fc06a", "#1f6e3a", "#fffbd0", "#2a8a4a"),
  sky: null,
  bokeh: HS("#fff4e0", "#ffe0ec", "#ffd36b", "#ff9fc2", "#9fe0a8"),
};

function brandOf(theme) {
  const t = theme || {};
  return { bg: H(t.bg || "#0d1117"), accent: H(t.accent || "#4f8cff"), text: H(t.text || "#f2f4f8"), dark: t.dark ?? true };
}

/**
 * The scene to run. id is a scene key from LIVE, look one of LOOKS, opts the person's own
 * settings (see SCENE_OPTIONS in scenes.js) and theme the site's colours.
 */
export function resolve(id, look = "real", opts = {}, theme = null) {
  const base = id.startsWith("view:") ? viewer(id.slice(5), opts) : LIVE[id];
  if (!base) return null;
  let sc = {
    ...base,
    light: { ...base.light },
    actors: (base.actors || []).map((a) => ({ ...a })),
    style: "solid",
    speed: clamp(num(opts.speed, 1), 0.25, 3),
    amount: clamp(num(opts.amount, 1), 0.2, 2.5),
  };
  const looks = LOOKS_FOR[id] || ["real"];
  if (!looks.includes(look)) look = "real";
  if (look === "particle") {
    const b = brandOf(theme);
    const accent = isHex(opts.accent) ? H(opts.accent) : b.accent;
    const dark = (b.bg[0] + b.bg[1] + b.bg[2]) / 3 < 0.5;
    const glowA = mix3(accent, [1, 1, 1], dark ? 0.15 : 0);
    sc = {
      ...sc,
      env: "studio", envColors: [isHex(opts.sky) ? H(opts.sky) : b.bg, accent, mix3(accent, b.text, 0.5), accent, accent], envA: dark ? 1 : 0.7,
      style: "points", point: dark ? 6 : 7,
      light: { ...sc.light, tint: glowA, ink: dark ? mix3(accent, [1, 1, 1], 0.6) : mix3(accent, [0, 0, 0], 0.55), tintAmt: 0.85, glow: dark ? 0.35 : 0, fog: 0.06 },
      dust: [{ count: 140, drift: [0.004, 0.008, 0], size: 5, wobble: 0.02, col: dark ? glowA : mix3(accent, b.bg, 0.3), alpha: dark ? 0.5 : 0.6, add: dark ? 1 : 0, box: [1.6, 1.6, 9] }],
      sparks: { col: glowA, rise: 0.3, add: dark ? 1 : 0 },
      layers: null, ptrPush: 0.16, ptrRadius: 0.32,
      theme: dark ? "dark" : "light",
      actors: sc.actors.filter((a) => !["branch", "lily", "reefFish"].includes(a.model)),
    };
    // Without its branch the parrot hovers in place instead of landing.
    sc.actors = sc.actors.map((a) => (a.act === "perch" ? { ...a, act: "cruise", face: [-1, 0, 0.3], size: a.size * 1.6, sizeTall: a.sizeTall * 1.5, spot: [0.7, 0.45], roll: false, effort: 0.8, wander: 0.6 } : a));
  } else if (look === "nature") {
    const ink = sc.env === "deep" || id === "owl" ? INK_SEA : INK_SKY;
    sc = { ...sc, ...ink, light: { ...ink.light }, style: "ink", dust: id === "owl" ? sc.dust : [], layers: null, sparks: { col: H("#ffe2b8"), rise: 0.2 } };
    sc.actors = sc.actors.filter((a) => a.model !== "reefFish").map((a) => (ink === INK_SEA && sc.actors.length && ["whale", "dolphin", "manta", "orca"].includes(a.model) ? { ...a, spot: [a.spot?.[0] ?? 0.68, 0.72], spotTall: [0.5, 0.8], exit: a.exit } : a));
  } else if (look === "cartoon") {
    const cols = TOON[sc.env];
    sc = { ...sc, style: "toon", envColors: cols || sc.envColors, light: { ...sc.light, ink: H("#14202c"), fog: (sc.light.fog || 0) * 0.5, caustic: 0.15 } };
  }
  // Options that apply to every look.
  if (isHex(opts.tint) && look !== "particle") {
    sc.light.tint = H(opts.tint);
    sc.light.tintAmt = 0.45;
  }
  if (isHex(opts.sky) && look !== "particle" && sc.envColors) {
    const c = H(opts.sky);
    sc.envColors = sc.envColors.map((e, i) => (i < 3 ? mix3(e, c, i === 0 ? 0.6 : 0.4) : e));
  }
  if (opts.side === "left") sc.actors = sc.actors.map((a) => mirrorSide(a));
  if (sc.layers === "jungle") {
    const walk = !!sc.go;
    sc.layers = () => jungleLayers(walk);
  }
  else sc.layers = null;
  sc.look = look;
  sc.id = id;
  return sc;
}

const mirrorSide = (a) => {
  const flip = (s) => (s ? [1 - s[0], s[1]] : s);
  const out = { ...a, spot: flip(a.spot) };
  if (a.face) out.face = [-a.face[0], a.face[1], a.face[2]];
  else if (a.act === "cruise") out.face = [1, 0, 0.42];
  if (a.places) out.places = a.places.map((p) => ({ ...p, spot: flip(p.spot) }));
  if (a.act === "perch") out.sitYaw = -0.7;
  if (a.model === "branch") out.yaw = Math.PI;
  if (a.foot) out.foot = [-a.foot[0], a.foot[1]];
  if (a.spread) out.spread = [1 - a.spread[1], 1 - a.spread[0]];
  return out;
};
const isHex = (v) => typeof v === "string" && /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(+v) ? +v : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// A turntable for checking a model while building (not offered to people).
function viewer(model, opts) {
  return { ...WATER, envColors: HS("#d9dde3", "#aab3bf", "#59616d", "#ffffff"), dust: [], light: { ...WATER.light, caustic: 0, fog: 0, fogTop: H("#aab3bf"), fogBot: H("#59616d"), sun: H("#ffffff"), ambTop: H("#8a96a6"), ambBot: H("#30363f") }, actors: [{ model, act: "turn", size: 0.3, spot: [0.5, 0.5], yaw: num(opts.yaw, NaN), pitch: num(opts.pitch, 0), fold: num(opts.fold, 0), freeze: opts.freeze }] };
}
