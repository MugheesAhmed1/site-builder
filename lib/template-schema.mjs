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

// ---------------------------------------------------------------- the story around the character

const ICONS = ["bolt", "gauge", "clock", "clockfast", "battery", "seat", "wind", "weight", "shield", "star", "heart", "wave", "leaf", "spark", "globe", "check", "pulse", "down", "range", "layers", "chip", "sun", "flame", "pin", "phone", "mail", "calendar", "home", "key", "user", "users", "cup", "fork", "bed", "anchor", "camera", "tooth", "dumbbell", "trophy", "mountain", "droplet", "code", "map", "gift", "tag", "book", "snow", "scissors", "cart", "box", "chat"];
const ICON_OPTIONS = ICONS.map((v) => ({ value: v, label: v }));

/**
 * The story told around the character (docs/FILM.md): a pinned stretch of the page where the
 * model is the camera's subject and the words, chips and cards are placed around it. The same
 * fields in every template; the opening and closing scenes are only for a template that opens
 * with the story (Turntable) and are listed in its own schema.
 */
export const FILM_GROUPS = [
  {
    group: "Character story",
    fields: [
      { path: "film.on", label: "Tell the story around the character", type: "toggle", hint: "A stretch of the page where the character is the subject: the camera moves round it as you scroll and the words, chips and cards sit around it." },
      { path: "film.specs.on", label: "Scene: close up with spec chips", type: "toggle" },
      { path: "film.specs.eyebrow", label: "Small line above the title", type: "text" },
      { path: "film.specs.title", label: "Title", type: "textarea", hint: "One line per row of the title." },
      { path: "film.specs.text", label: "Words under the title", type: "textarea" },
      { path: "film.ring.on", label: "Scene: seen from every angle, cards around it", type: "toggle" },
      { path: "film.ring.eyebrow", label: "Small line above the title", type: "text" },
      { path: "film.ring.title", label: "Title", type: "text" },
      { path: "film.paint.on", label: "Scene: choose its colour", type: "toggle" },
      { path: "film.paint.eyebrow", label: "Small line above the title", type: "text" },
      { path: "film.paint.title", label: "Title", type: "textarea" },
      { path: "film.paint.text", label: "Words under the title", type: "textarea" },
      { path: "film.paint.hint", label: "Hint under the colours", type: "text" },
      { path: "film.voices.on", label: "Scene: what people say", type: "toggle" },
      { path: "film.voices.eyebrow", label: "Small line above the title", type: "text" },
      { path: "film.voices.title", label: "Title", type: "textarea" },
    ],
  },
  {
    group: "Character story: chips, cards and voices",
    fields: [
      { path: "film.chips", label: "Spec chips (up to 6)", type: "list", min: 0, max: 6, itemLabel: "label", fields: [{ path: "icon", label: "Icon", type: "select", options: ICON_OPTIONS }, { path: "label", label: "What it is", type: "text" }, { path: "value", label: "Its value", type: "text" }] },
      { path: "film.cards", label: "Cards around the character (up to 6)", type: "list", min: 0, max: 6, itemLabel: "title", fields: [{ path: "icon", label: "Icon", type: "select", options: ICON_OPTIONS }, { path: "title", label: "Title", type: "text" }, { path: "text", label: "Words", type: "textarea" }] },
      { path: "film.swatches", label: "Colours to choose from (the first is as made)", type: "list", min: 0, max: 6, itemLabel: "name", fields: [{ path: "name", label: "Name", type: "text" }, { path: "color", label: "Colour", type: "color" }] },
      { path: "film.quotes", label: "What people say (up to 3)", type: "list", min: 0, max: 3, itemLabel: "name", fields: [{ path: "text", label: "Words", type: "textarea" }, { path: "name", label: "Who", type: "text" }, { path: "role", label: "Their role or place", type: "text" }] },
    ],
  },
];

// ---------------------------------------------------------------- a template's own story
// (docs/FILM-TEMPLATES.md) A template can write its own plan of scenes: content.film.order lists
// them, each one a section of the page told around the central figure. The vocabulary below is
// the one library/character/plan.ts plays (a test keeps the two the same).

export const SCENE_TYPES = ["hero", "facts", "cards", "steps", "stats", "gallery", "plans", "people", "voices", "faq", "visit", "paint", "finale"];
/** How each kind of scene can be laid out; the first is the default. */
export const SCENE_COMPS = { hero: ["word", "center"], facts: ["side", "flip"], cards: ["flank", "stage"], steps: ["side", "flip"], stats: ["flank", "stage"], gallery: ["stage"], plans: ["stage"], people: ["flank", "stage"], voices: ["side", "flip"], faq: ["side", "flip"], visit: ["side", "flip"], paint: ["side", "flip"], finale: ["center", "side"] };
export const SCENE_LOGICS = ["turntable", "orbit", "drift", "flip", "rise", "descend", "still"];
export const SCENE_LOOKS = ["studio", "embers", "snow", "bubbles", "petals", "fireflies", "confetti", "sparks", "stars", "leaves", "none"];
export const SCENE_OPENINGS = ["lift", "drop", "spin", "zoom", "reveal"];
export const SCENE_MOTIONS = ["rise", "slide", "pop", "zoom", "drift"];
/** The most items a scene shows. */
export const SCENE_CAPS = { hero: 0, facts: 6, cards: 6, steps: 5, stats: 4, gallery: 5, plans: 3, people: 4, voices: 3, faq: 5, visit: 5, paint: 6, finale: 0 };
const SCENE_NAMES = { hero: "Opening", facts: "Facts beside it", cards: "Cards round it", steps: "Steps", stats: "Numbers", gallery: "Pictures", plans: "Plans and prices", people: "People", voices: "What people say", faq: "Questions", visit: "How to find it", paint: "Choose its colour", finale: "Closing" };
const LABELS = {
  comp: { word: "Words beside it, figure low and big", center: "Words under it, figure in the middle", side: "Words on the left, figure on the right", flip: "Words on the right, figure on the left", flank: "Cards on both sides of it", stage: "Cards in a row beneath it" },
  logic: { turntable: "Turntable: it turns to show a new side each scene", orbit: "Orbit: it keeps turning round the whole page", drift: "Drift: a slow sway from side to side", flip: "Flip: front, then back, then front", rise: "Rise: the camera climbs as you go", descend: "Descend: it starts above and settles down", still: "Still: it keeps its pose, the page moves around it" },
  look: { studio: "Clean studio", embers: "Embers rising", snow: "Snow falling", bubbles: "Bubbles rising", petals: "Petals drifting", fireflies: "Fireflies", confetti: "Confetti", sparks: "Sparks", stars: "Twinkling stars", leaves: "Leaves drifting", none: "Nothing" },
  opening: { lift: "Lifts off the floor", drop: "Drops in and lands", spin: "Spins into place", zoom: "Rushes in from far away", reveal: "Comes out of the dark" },
  motion: { rise: "Rise into place", slide: "Slide in from the side", pop: "Pop up", zoom: "Settle from slightly larger", drift: "Float up slowly" },
};
const opts = (list, labels) => list.map((v) => ({ value: v, label: labels[v] || v }));

/** The type of a scene from its name: the part before a dash, underscore or number ("steps", "steps2" and "steps-story" are all steps). */
export const sceneType = (id) => {
  const t = String(id).split(/[-_\d]/)[0];
  return SCENE_TYPES.includes(t) ? t : null;
};
/** The scene names a plan lists, in order, once each. */
export const sceneOrder = (film) => [...new Set(String(film?.order || "").split(/[\s,]+/).filter(Boolean))];
/** True when a template's content tells its own story (a plan) rather than the fixed one. */
export const hasPlan = (content) => typeof content?.film?.order === "string" && content.film.order.trim() !== "";

const IT = {
  icon: { path: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
  title: { path: "title", label: "Title", type: "text" },
  text: { path: "text", label: "Words", type: "textarea" },
  label: { path: "label", label: "What it is", type: "text" },
  value: { path: "value", label: "Its value", type: "text" },
  image: { path: "image", label: "Picture", type: "image" },
  name: { path: "name", label: "Name", type: "text" },
  role: { path: "role", label: "Role or place", type: "text" },
};

/** The fields of one scene, by type. */
function sceneFields(id, type) {
  const f = (path, label, t, extra = {}) => ({ path: `film.${id}.${path}`, label, type: t, ...extra });
  const common = () => [
    f("on", "Show this scene", "toggle"),
    f("eyebrow", "Small line above the title", "text"),
    f("title", "Title", "textarea", { hint: "One line per row." }),
    f("text", "Words under the title", "textarea"),
  ];
  const tail = () => [f("comp", "Layout", "select", { options: opts(SCENE_COMPS[type], LABELS.comp) }), f("plate", "Picture behind this scene", "image", { hint: "Shown faded behind the figure while this scene plays. Empty: none." })];
  const list = (label, itemLabel, fields) => f("items", `${label} (up to ${SCENE_CAPS[type]})`, "list", { min: 0, max: SCENE_CAPS[type], itemLabel, fields });
  switch (type) {
    case "hero":
      return [f("title", "Headline", "textarea", { hint: "One line per row." }), f("text", "Words under it", "textarea"), f("cta", "Button", "text"), f("ctaHref", "Button goes to", "text"), ...tail()];
    case "facts":
      return [...common(), list("Facts", "label", [IT.icon, IT.label, IT.value]), ...tail()];
    case "cards":
      return [...common(), list("Cards", "title", [IT.icon, IT.title, IT.text]), ...tail()];
    case "steps":
      return [...common(), list("Steps", "title", [IT.title, IT.text]), ...tail()];
    case "stats":
      return [...common(), list("Numbers", "label", [IT.value, IT.label]), ...tail()];
    case "gallery":
      return [...common(), list("Pictures", "title", [IT.image, IT.title, IT.text]), ...tail()];
    case "plans":
      return [
        ...common(),
        f("hint", "Tag on the plan to take", "text"),
        f("featured", "Which plan to take (0 for none)", "number", { min: 0, max: 3, step: 1 }),
        list("Plans", "name", [{ path: "name", label: "Name", type: "text" }, { path: "price", label: "Price", type: "text" }, { path: "per", label: "Per", type: "text" }, IT.text, { path: "features", label: "What it includes (one per line)", type: "textarea" }, { path: "cta", label: "Button", type: "text" }, { path: "ctaHref", label: "Button goes to", type: "text" }]),
        ...tail(),
      ];
    case "people":
      return [...common(), list("People", "name", [IT.image, IT.name, IT.role, IT.text]), ...tail()];
    case "voices":
      return [...common(), list("What people say", "name", [{ path: "text", label: "Words", type: "textarea" }, IT.name, IT.role]), ...tail()];
    case "faq":
      return [...common(), list("Questions", "q", [{ path: "q", label: "Question", type: "text" }, { path: "a", label: "Answer", type: "textarea" }]), ...tail()];
    case "visit":
      return [...common(), f("cta", "Button", "text"), f("ctaHref", "Button goes to", "text"), list("Lines", "label", [IT.icon, IT.label, IT.value]), ...tail()];
    case "paint":
      return [...common(), f("hint", "Hint under the colours", "text"), list("Colours (the first is as made)", "title", [{ path: "title", label: "Name", type: "text" }, { path: "color", label: "Colour", type: "color" }]), ...tail()];
    case "finale":
      return [f("on", "Show the closing scene", "toggle"), f("title", "Title", "textarea", { hint: "One line per row." }), f("text", "Words under it", "textarea"), f("cta", "Button", "text"), f("ctaHref", "Button goes to", "text"), ...tail()];
    default:
      return [];
  }
}

const blank = (f) => (f.type === "toggle" ? true : f.type === "number" ? (f.min ?? 0) : f.type === "select" ? (f.options?.[0]?.value ?? "") : f.type === "list" || f.type === "colors" ? [] : "");

/**
 * A plan with every value its fields edit in place: a template's content.json lists only what it
 * says (a scene's title and items), and the rest starts empty (or on), so the studio has a field
 * with a value for everything.
 */
export function normalizeFilm(film) {
  const out = { ...(film || {}) };
  const globals = { on: true, order: "", logic: "orbit", look: "studio", opening: "lift", motion: "rise" };
  for (const [k, v] of Object.entries(globals)) if (out[k] === undefined) out[k] = v;
  for (const id of sceneOrder(out)) {
    const type = sceneType(id);
    if (!type || !out[id] || typeof out[id] !== "object") continue;
    const sc = { ...out[id] };
    for (const f of sceneFields(id, type)) {
      const key = f.path.slice(`film.${id}.`.length);
      if (sc[key] === undefined) sc[key] = blank(f);
      if (f.type === "list")
        sc[key] = (Array.isArray(sc[key]) ? sc[key] : []).map((it) => {
          const o = { ...it };
          for (const sub of f.fields || []) if (o[sub.path] === undefined) o[sub.path] = blank(sub);
          return o;
        });
    }
    out[id] = sc;
  }
  return out;
}

/**
 * The editing fields for a template's own story, written from the plan in its content: the page's
 * motion and mood, then one group for each scene it lists, in order. Every value the plan holds
 * has a field here, so nothing in it is left uneditable.
 */
export function filmSchema(film) {
  const out = [
    {
      group: "Story: the whole page",
      fields: [
        { path: "film.on", label: "Tell the story around the character", type: "toggle", hint: "Off: the page is plain sections, without the camera moves." },
        { path: "film.order", label: "Scenes, in order", type: "text", hint: "The names of the scenes below, separated by spaces. Leave one out to drop it; repeat a kind with a number (steps2)." },
        { path: "film.logic", label: "How the camera moves", type: "select", options: opts(SCENE_LOGICS, LABELS.logic) },
        { path: "film.look", label: "What fills the air", type: "select", options: opts(SCENE_LOOKS, LABELS.look) },
        { path: "film.opening", label: "How it arrives", type: "select", options: opts(SCENE_OPENINGS, LABELS.opening) },
        { path: "film.motion", label: "How the words arrive", type: "select", options: opts(SCENE_MOTIONS, LABELS.motion) },
      ],
    },
  ];
  const seen = {};
  for (const id of sceneOrder(film)) {
    const type = sceneType(id);
    if (!type || !film?.[id] || typeof film[id] !== "object") continue;
    seen[type] = (seen[type] || 0) + 1;
    const tag = id.slice(type.length).replace(/^[-_]/, "");
    out.push({ group: `Scene: ${SCENE_NAMES[type]}${tag ? ` (${tag})` : seen[type] > 1 ? ` ${seen[type]}` : ""}`, fields: sceneFields(id, type) });
  }
  return out;
}

/** The story's words when a template has none yet. The journey writes real ones from the plan. */
export function filmDefaults() {
  return {
    on: true,
    specs: { on: true, eyebrow: "Up close", title: "Made to be\nnoticed", text: "Everything about it, in a few honest numbers." },
    chips: [
      { icon: "bolt", label: "Ready", value: "in minutes" },
      { icon: "globe", label: "Works on", value: "every screen" },
      { icon: "heart", label: "Loved by", value: "thousands" },
      { icon: "shield", label: "Built to", value: "last" },
      { icon: "clock", label: "Support", value: "every day" },
    ],
    ring: { on: true, eyebrow: "From every side", title: "Built to be seen from every angle" },
    cards: [
      { icon: "spark", title: "Made for you", text: "Shaped around what you actually need, not a template." },
      { icon: "layers", title: "Built properly", text: "Careful details you only notice when they are missing." },
      { icon: "bolt", title: "Quick to use", text: "Simple from the first minute, fast every time after." },
      { icon: "shield", title: "Looks after itself", text: "Safe, steady and ready when you are." },
      { icon: "globe", title: "Works everywhere", text: "Sharp on every phone, tablet and screen." },
      { icon: "star", title: "Always improving", text: "Small upgrades arrive without any fuss." },
    ],
    paint: { on: false, eyebrow: "Make it yours", title: "Pick the finish", text: "Tap a colour and watch it change.", hint: "Tap a colour" },
    swatches: [
      { name: "As made", color: "#9aa0ad" },
      { name: "Midnight", color: "#17181f" },
      { name: "Signal red", color: "#d62839" },
      { name: "Cobalt", color: "#2455e6" },
      { name: "Sunrise", color: "#ffb000" },
    ],
    voices: { on: false, eyebrow: "Reviews", title: "Heard from\nthe people who use it" },
    quotes: [
      { text: "It feels like it was made for us.", name: "A happy customer", role: "" },
    ],
  };
}

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
  // The story's fields come with the character's; a template that opens with the story lists
  // its opening and closing scenes itself and takes the rest from here.
  // A template with a plan of its own (content.film.order) takes its story's fields from that plan.
  const story = hasPlan(content) ? filmSchema(content.film) : FILM_GROUPS;
  const groups = [...CHARACTER_GROUPS, ...story].map((g) => ({ ...g, fields: g.fields.filter((f) => !has.has(f.path)) })).filter((g) => g.fields.length);
  const nextSchema = groups.length ? [...schema.slice(0, 1), ...groups, ...schema.slice(1)] : schema;
  const d = characterDefaults(content?.theme?.colors || {}, roles?.stage);
  const nextContent = { ...content, character: { ...d.character, ...(content?.character || {}) }, design: { ...d.design, ...(content?.design || {}) } };
  if (!content?.film) nextContent.film = filmDefaults();
  else if (hasPlan(content)) nextContent.film = normalizeFilm(content.film);
  return { schema: nextSchema, content: nextContent };
}
