// Settings that individual scenes offer in the builder's Scenes panel, saved per site in
// design.sceneProps[sceneId]. range: a slider; toggle: on or off.
const range = (key, label, min, max, step, def) => ({ key, label, type: "range", min, max, step, def });
const toggle = (key, label, def = true) => ({ key, label, type: "toggle", def });
const color = (key, label, def) => ({ key, label, type: "color", def });
const TOUCH = toggle("interactive", "Reacts to the pointer");

/** The settings each Kokonut scene offers, with Kokonut's own defaults. */
export const KK_CONTROLS = {
  "kk-paths": [range("count", "Lines", 8, 80, 1, 42), range("spread", "Spread", 0.3, 2, 0.05, 1), range("angle", "Tilt", -45, 45, 1, -8), range("speed", "Speed", 0, 3, 0.05, 1), TOUCH],
  "kk-dots": [range("spacing", "Dot spacing", 8, 40, 1, 16), range("seed", "Pattern", 1, 99, 1, 7), TOUCH],
  "kk-flow": [range("density", "Particles", 0.2, 3, 0.1, 1), range("speed", "Wind", 0, 3, 0.05, 1), TOUCH],
  "kk-topo": [range("interval", "Contour gap", 0.03, 0.2, 0.005, 0.07), range("speed", "Drift", 0, 3, 0.05, 1), range("seed", "Terrain", 1, 99, 1, 26), toggle("labels", "Elevation labels"), TOUCH],
  "kk-halftone": [range("cell", "Dot size", 4, 24, 1, 9), range("angle", "Screen angle", 0, 90, 1, 45), toggle("loupe", "Loupe under the pointer")],
  "kk-drape": [range("wind", "Breeze", 0, 3, 0.05, 1), range("pleat", "Pleat depth", 0, 80, 1, 34), TOUCH],
  "kk-caustics": [TOUCH],
  "kk-rain": [range("rain", "Rain", 0, 1, 0.05, 0.6), TOUCH],
  "kk-ink": [TOUCH],
  "kk-shapes": [range("fill", "How full the pile is", 0.1, 0.6, 0.02, 0.3)],
};
export const kkDefaults = (id) => Object.fromEntries((KK_CONTROLS[id] || []).map((c) => [c.key, c.def]));

/** The settings a scene offers in the builder: Kokonut components by component id. */
export const sceneControls = (s) => (s && s.kk ? KK_CONTROLS[s.kk] || [] : (s && SHADER_CONTROLS[s.id]) || []);


// Studio shaders (studio.js) read their first four settings, in order, as the uKnob uniform.
// Motion Primitives shaders take theirs by uniform name; colours are hex strings.
const SPEED = (def = 1) => range("speed", "Speed", 0, 3, 0.05, def);
export const SHADER_CONTROLS = {
  "st-aurora": [SPEED(), range("height", "Height", 0, 1, 0.02, 0.5), range("brand", "Brand colour", 0, 1, 0.05, 0.4)],
  "st-beams": [range("count", "Beams", 2, 16, 1, 6), SPEED(), range("angle", "Lean", -0.8, 0.8, 0.02, 0.35)],
  "st-dotgrid": [range("spacing", "Spacing", 10, 48, 1, 22), range("reach", "Pointer reach", 0.05, 0.6, 0.01, 0.22), SPEED(1.2)],
  "st-galaxy": [range("density", "Stars", 0.5, 2, 0.05, 1), range("spin", "Spin", 0, 4, 0.05, 1), range("twinkle", "Twinkle", 0, 6, 0.1, 2)],
  "st-iridescence": [SPEED(), range("scale", "Scale", 0.5, 3, 0.05, 1.2), range("hue", "Hue shift", 0, 1, 0.01, 0)],
  "st-lightning": [range("speed", "Storm pace", 0.2, 3, 0.05, 1), range("glow", "Brightness", 0.2, 2, 0.05, 1)],
  "st-rays": [range("count", "Ray detail", 0.5, 4, 0.05, 1.5), SPEED(), range("length", "Ray length", 0, 1, 0.02, 0.6)],
  "st-prism": [range("rays", "Rays", 3, 24, 1, 9), SPEED(), range("reach", "Reach", 0, 1, 0.02, 0.4)],
  "st-ripple": [range("grid", "Grid size", 6, 40, 1, 16), SPEED(), range("strength", "Ripple", 0, 3, 0.05, 1)],
  "st-silk": [SPEED(), range("scale", "Scale", 0.4, 3, 0.05, 1), range("twist", "Twist", 0, 3, 0.05, 1)],
  "st-threads": [range("count", "Threads", 4, 48, 1, 22), range("wave", "Wave", 0, 3, 0.05, 1), SPEED()],
  "st-hyperspeed": [range("speed", "Speed", 0.1, 3, 0.05, 1), range("density", "Lanes", 0.3, 2, 0.05, 1)],
  "st-orb": [range("size", "Size", 0.4, 2, 0.05, 1), range("follow", "Follows pointer", 0, 1, 0.05, 0.6), range("hue", "Hue shift", 0, 1, 0.01, 0)],
  "st-dither": [range("pixel", "Pixel size", 2, 12, 1, 4), SPEED(), range("levels", "Colour steps", 2, 8, 1, 3)],
  "st-terminal": [range("cell", "Glyph size", 10, 32, 1, 16), range("glitch", "Glitch", 0, 1, 0.02, 0.3), range("scan", "Scan lines", 0, 1, 0.02, 0.6)],
  "st-squares": [range("size", "Square size", 16, 80, 1, 40), SPEED(0.6), range("dir", "Direction", 0, 6.28, 0.05, 0.8)],
  "st-swirl": [range("spin", "Spin", 0, 4, 0.05, 1.6), range("contrast", "Contrast", 0.4, 3, 0.05, 1)],
  "st-retrogrid": [SPEED(), range("line", "Line weight", 0.3, 3, 0.05, 1)],
  "mp-noise": [color("uColor1", "Colour one", "#4f46e5"), color("uColor2", "Colour two", "#7c3aed"), color("uColor3", "Colour three", "#ec4899"), range("uNoiseScale", "Scale", 0.5, 8, 0.1, 3), range("uSpeed", "Speed", 0, 1.5, 0.02, 0.3)],
  "mp-liquid-metal": [color("uBaseColor", "Metal colour", "#1a1a2e"), range("uReflectivity", "Shine", 0, 1.5, 0.02, 0.8)],
  "mp-waves": [color("uColor1", "Deep colour", "#0f0f23"), color("uColor2", "Wave colour", "#2d1b69"), range("uWaveFrequency", "Frequency", 2, 30, 0.5, 10), range("uWaveAmplitude", "Amplitude", 0, 0.4, 0.01, 0.1)],
  "mp-plasma": [color("uColor1", "Colour one", "#ff006e"), color("uColor2", "Colour two", "#8338ec"), color("uColor3", "Colour three", "#3a86ff")],
  "mp-blobs": [color("uBlobColor", "Blob colour", "#8b5cf6"), color("uBackgroundColor", "Background", "#0f0f0f"), range("uBlobCount", "Blobs", 1, 10, 1, 5)],
  "mp-glitch": [color("uColor1", "Colour one", "#0a0a0a"), color("uColor2", "Colour two", "#1a1a2e"), range("uIntensity", "Glitch", 0, 1, 0.02, 0.5)],
};
