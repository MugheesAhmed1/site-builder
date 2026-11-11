// Live scenes: interactive visuals that go beyond cartoons. Particles that form your name,
// fireflies that follow the pointer, rain you can shelter from, a globe you can spin, your
// own photo with a spotlight or a ripple, glossy orbs you can throw. Every scene reacts to
// the pointer, to clicks or taps, and most to scroll. Plain data here; drawn by Scenes.jsx.

export const SCENE_GROUPS = [
  { id: "particles", name: "Particles" },
  { id: "nature", name: "Nature" },
  { id: "photo", name: "Your photo" },
  { id: "depth", name: "3D and physics" },
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
];

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
  for (const t of SCENE_TYPES)
    for (const p of SCENE_PALETTES)
      out.push({ id: "S-" + String(n++).padStart(3, "0"), type: t.id, group: t.group, palette: p.id, name: `${t.name}, ${p.name.toLowerCase()}` });
  return out;
}

export const SCENES = build();

export function sceneById(id, list = SCENES) {
  return list.find((s) => s.id === id) || null;
}
export function sceneType(id) {
  return SCENE_TYPES.find((t) => t.id === id) || SCENE_TYPES[0];
}
