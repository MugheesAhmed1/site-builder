// The template content contract (docs/TEMPLATES.md). A template reads everything it shows from
// one content object (content.json, shipped as xp-content.js). Its template.json lists a schema:
// groups of fields, each pointing at one place in that object. The build checks the two match
// and that every value in the content has a field, so nothing in a template is left uneditable.

export const FIELD_TYPES = ["text", "textarea", "image", "video", "model", "url", "color", "colors", "font", "number", "toggle", "select", "list", "blocks"];

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** A copy of obj with the value at path replaced. */
export function setPath(obj, path, value) {
  const [k, ...rest] = path.split(".");
  const base = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  base[k] = rest.length ? setPath(base[k], rest.join("."), value) : value;
  return base;
}

export const clone = (v) => JSON.parse(JSON.stringify(v));

const LS = new RegExp(String.fromCharCode(0x2028), "g");
const PS = new RegExp(String.fromCharCode(0x2029), "g");
const COLOR = /^#[0-9a-fA-F]{6}$/;

function checkValue(f, v, where) {
  const errs = [];
  const want = (ok, what) => ok || errs.push(`${where}: ${f.type} field needs ${what}, found ${JSON.stringify(v)?.slice(0, 60)}`);
  switch (f.type) {
    case "text":
    case "textarea":
    case "image":
    case "video":
    case "model":
    case "url":
    case "font":
      want(typeof v === "string", "a string");
      break;
    case "color":
      want(typeof v === "string" && COLOR.test(v), "a #rrggbb colour");
      break;
    case "colors":
      want(Array.isArray(v) && v.every((c) => typeof c === "string" && COLOR.test(c)), "a list of #rrggbb colours");
      break;
    case "number":
      want(typeof v === "number" && isFinite(v), "a number");
      if (typeof v === "number" && ((f.min != null && v < f.min) || (f.max != null && v > f.max))) errs.push(`${where}: ${v} is outside ${f.min} to ${f.max}`);
      break;
    case "toggle":
      want(typeof v === "boolean", "true or false");
      break;
    case "select":
      want((f.options || []).some((o) => o.value === v), `one of ${(f.options || []).map((o) => o.value).join(", ")}`);
      break;
    case "blocks":
      if (!want(Array.isArray(v), "a list of library blocks")) break;
      v.forEach((b, i) => {
        if (!isObj(b) || typeof b.block !== "string" || !isObj(b.props)) errs.push(`${where}[${i}] must be { block, props }`);
      });
      break;
    case "list":
      if (!want(Array.isArray(v), "a list")) break;
      v.forEach((item, i) => {
        if (!isObj(item)) return void errs.push(`${where}[${i}] must be an object`);
        for (const sub of f.fields || []) errs.push(...checkValue(sub, item[sub.path], `${where}[${i}].${sub.path}`));
        const known = new Set((f.fields || []).map((s) => s.path));
        for (const k of Object.keys(item)) if (!known.has(k)) errs.push(`${where}[${i}].${k} has no field, so it cannot be edited`);
      });
      break;
  }
  return errs;
}

/** Problems with a schema against its content; an empty list means they match. */
export function schemaProblems(schema, content) {
  const errs = [];
  if (!Array.isArray(schema) || !schema.length) return ["schema is missing or empty"];
  if (!isObj(content)) return ["content.json is not an object"];
  const paths = new Set();
  for (const g of schema) {
    if (!g.group || !Array.isArray(g.fields)) errs.push(`schema group ${JSON.stringify(g).slice(0, 60)} needs group and fields`);
    for (const f of g.fields || []) {
      if (!f.path || !f.label) errs.push(`field ${JSON.stringify(f).slice(0, 60)} needs path and label`);
      if (!FIELD_TYPES.includes(f.type)) errs.push(`${f.path}: unknown field type ${f.type}`);
      if (paths.has(f.path)) errs.push(`${f.path} has two fields`);
      paths.add(f.path);
      if (f.type === "list") for (const s of f.fields || []) if (s.type === "list") errs.push(`${f.path}.${s.path}: lists inside lists are not supported`);
      const v = getPath(content, f.path);
      if (v === undefined) errs.push(`${f.path} is not in content.json`);
      else errs.push(...checkValue(f, v, f.path));
    }
  }
  // Every value in the content must be reachable from a field.
  const walk = (v, path) => {
    if (paths.has(path)) return;
    if (isObj(v)) for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
    else errs.push(`${path} is in content.json but has no field, so it cannot be edited`);
  };
  walk(content, "");
  return errs;
}

// Library blocks (content.extras) need the library runtime and a 3D character (content.character)
// needs the character runtime; each loads only when a page uses it (and always in the preview).
const LOADER = `(function () {
  var x = window.__XP_HASH__ || window.__XP__ || {};
  var lib = window.__XP_PREVIEW__ || (x.extras && x.extras.length);
  var char = window.__XP_PREVIEW__ || (x.character && x.character.src);
  if (!lib && !char) return;
  var me = document.currentScript;
  var base = me ? me.src : location.href;
  function load(file, at) {
    var s = document.createElement("script");
    s.type = "module";
    s.src = at || new URL("./xp-lib/" + file, base).href;
    document.head.appendChild(s);
  }
  if (lib) load("xp-library.js", window.__XP_LIB__);
  if (char) load("xp-character.js", window.__XP_CHAR__);
})();`;

/** The xp-content.js file a template loads before its own code. */
export function contentScript(content) {
  const json = JSON.stringify(content, null, 2).replace(/</g, "\\u003c").replace(LS, "\\u2028").replace(PS, "\\u2029");
  return `// Everything this site says and shows. Change it here; no code change needed.\nwindow.__XP__ = ${json};\n\n${LOADER}\n`;
}

const EXT = { "model/gltf-binary": "glb", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/svg+xml": "svg", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

/** Uploaded pictures and video (data: addresses) moved out into media/ files. */
export function extractMedia(content) {
  const files = [];
  const seen = new Map();
  const walk = (v) => {
    if (typeof v === "string") {
      const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,/i.exec(v);
      if (!m) return v;
      if (seen.has(v)) return seen.get(v);
      const name = `media/upload-${files.length + 1}.${EXT[m[1].toLowerCase()] || "bin"}`;
      files.push({ path: name, type: m[1], base64: v.slice(m[0].length) });
      seen.set(v, `./${name}`);
      return `./${name}`;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { content: walk(content), files };
}

/** How many values differ from the defaults (for "3 changes"). */
export function countChanges(a, b) {
  if (JSON.stringify(a) === JSON.stringify(b)) return 0;
  if (isObj(a) && isObj(b)) return [...new Set([...Object.keys(a), ...Object.keys(b)])].reduce((n, k) => n + countChanges(a[k], b[k]), 0);
  return 1;
}

// ---------------------------------------------------------------- the 3D character, in every template

/** The character's settings, the same in every template (docs/CHARACTER-JOURNEY.md). */
export const CHARACTER_GROUPS = [
  {
    group: "3D character",
    fields: [
      { path: "character.src", label: "3D model", type: "model", hint: "Pick one from the library, upload a GLB, or make one from a photo. Empty: no character." },
      { path: "character.poster", label: "Its picture (shown while it loads)", type: "image" },
      { path: "character.name", label: "Its name", type: "text" },
      { path: "character.motion", label: "Idle motion", type: "select", options: [{ value: "float", label: "Floats gently" }, { value: "sway", label: "Sways side to side" }, { value: "spin", label: "Turns slowly" }, { value: "still", label: "Holds still" }] },
      { path: "character.clip", label: "Its own animation", type: "text", hint: "A clip name from the model. Empty plays its idle; none plays nothing." },
      { path: "character.react", label: "Visitors can", type: "select", options: [{ value: "both", label: "Drag it, tap it, and it looks at the pointer" }, { value: "follow", label: "It looks at the pointer" }, { value: "drag", label: "Drag it round and tap it" }, { value: "none", label: "Nothing: it stays put" }] },
      { path: "character.scroll", label: "As the page scrolls", type: "select", options: [{ value: "film", label: "It travels with you: a camera move for every section" }, { value: "turn", label: "It turns" }, { value: "rise", label: "It rises and shrinks away" }, { value: "zoom", label: "It comes closer" }, { value: "none", label: "Nothing" }] },
      { path: "character.scale", label: "Size", type: "number", min: 0.4, max: 1.8, step: 0.05 },
      { path: "character.turn", label: "Turn (degrees)", type: "number", min: -180, max: 180, step: 1 },
      { path: "character.tilt", label: "Tilt (degrees)", type: "number", min: -40, max: 40, step: 1 },
      { path: "character.lift", label: "Up or down in its space", type: "number", min: -1, max: 1, step: 0.05 },
      { path: "character.speed", label: "Motion speed", type: "number", min: 0.2, max: 2, step: 0.1 },
      { path: "character.finish", label: "Finish", type: "select", options: [{ value: "original", label: "As made" }, { value: "paint", label: "Painted in the colour below" }, { value: "clay", label: "Soft clay in the colour below" }, { value: "chrome", label: "Chrome, tinted" }] },
      { path: "character.paint", label: "Paint colour", type: "color" },
      { path: "character.parts", label: "Parts to paint", type: "text", hint: "Material names, comma separated. Empty paints the whole model." },
      { path: "character.screen", label: "Screens that show your gradient", type: "text", hint: "Material names, comma separated (a phone's screen, a sign)." },
      { path: "character.shadow", label: "Soft shadow under it", type: "toggle" },
      { path: "character.studio", label: "Studio set while it travels (wet floor, light ring, dust)", type: "toggle" },
      { path: "character.wordmark", label: "Big outlined word behind it at the start", type: "text", hint: "Usually your name. Empty: none. Shown while it travels with you." },
      { path: "character.echo", label: "Show it again near the end of the page", type: "toggle" },
      { path: "character.credit", label: "Credit line for the model", type: "text", hint: "Shown small near the end of the page. Models under CC BY need it; it is filled in for you." },
    ],
  },
  {
    group: "Character background",
    fields: [
      { path: "design.stops", label: "Gradient colours (base, glow, second)", type: "colors", min: 3, max: 3 },
      { path: "design.style", label: "Gradient style", type: "select", options: [{ value: "glow", label: "Glow behind the character" }, { value: "aurora", label: "Aurora (moves slowly)" }, { value: "radial", label: "Spotlight" }, { value: "linear", label: "Straight blend" }, { value: "solid", label: "One colour" }] },
      { path: "design.angle", label: "Gradient angle", type: "number", min: 0, max: 360, step: 5 },
      { path: "design.light", label: "Light on the character", type: "color" },
      { path: "design.image", label: "Background picture instead of the gradient", type: "image" },
      { path: "design.imageTone", label: "That picture is mostly", type: "select", options: [{ value: "dark", label: "Dark (light words on it)" }, { value: "light", label: "Light (dark words on it)" }] },
    ],
  },
];

const HEX6 = /^#[0-9a-f]{6}$/i;

/** Relative luminance of a #rrggbb colour (WCAG). */
function lum(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const darkHex = (hex) => lum(hex) < 0.179;

/**
 * A starting gradient for a template, from its own colours: a base, its accent as the glow and a
 * second colour. `tone` is the stage the template's words expect: "dark" takes its darkest base
 * (light words stay readable), "light" its page.
 */
export function defaultStops(colors = {}, tone) {
  const hexes = (keys) => keys.map((k) => colors[k]).filter((c) => typeof c === "string" && HEX6.test(c));
  const page = hexes(["page", "bg", "background", "paper", "mist", "cream"]);
  const deep = hexes(["dark", "deep", "sea", "ink", "page", "bg", "background", "panel", "surface"]).filter(darkHex);
  const base = (tone === "dark" ? deep[0] : tone === "light" ? page.find((c) => !darkHex(c)) : page[0]) || page[0] || deep[0] || "#111114";
  const glow = hexes(["accent", "hot", "accent2", "highlight", "grad2", "positive", "glow"])[0] || "#7c5cff";
  const want = darkHex(base);
  const second = hexes(["surface", "panel", "deep", "sea", "mist", "grad3", "cream", "surface2", "dark"]).find((c) => darkHex(c) === want && c.toLowerCase() !== base.toLowerCase()) || base;
  return [base.toLowerCase(), glow.toLowerCase(), second.toLowerCase()];
}

/** The character's content when a template has none yet: no model, so the template looks as made. */
export function characterDefaults(colors = {}, tone) {
  const stops = defaultStops(colors, tone);
  return {
    character: { src: "", poster: "", name: "", motion: "float", clip: "", react: "both", scroll: "film", studio: true, wordmark: "", scale: 1, turn: -18, tilt: 0, lift: 0, speed: 1, finish: "original", paint: stops[1], parts: "", screen: "", shadow: true, echo: true, credit: "" },
    design: { stops, style: "glow", angle: 160, light: stops[1], image: "", imageTone: "dark" },
  };
}

/**
 * A template's schema and content with the character groups in place (right after its first
 * group), and the character's defaults filled in where the content has none. `roles` is the
 * template's own (template.json), whose stage tone picks the default gradient.
 */
export function withCharacter(schema, content, roles) {
  const has = new Set((schema || []).flatMap((g) => (g.fields || []).map((f) => f.path)));
  const groups = CHARACTER_GROUPS.map((g) => ({ ...g, fields: g.fields.filter((f) => !has.has(f.path)) })).filter((g) => g.fields.length);
  const nextSchema = groups.length ? [...schema.slice(0, 1), ...groups, ...schema.slice(1)] : schema;
  const d = characterDefaults(content?.theme?.colors || {}, roles?.stage);
  const nextContent = { ...content, character: { ...d.character, ...(content?.character || {}) }, design: { ...d.design, ...(content?.design || {}) } };
  return { schema: nextSchema, content: nextContent };
}
