// The template content contract (docs/TEMPLATES.md). A template reads everything it shows from
// one content object (content.json, shipped as xp-content.js). Its template.json lists a schema:
// groups of fields, each pointing at one place in that object. The build checks the two match
// and that every value in the content has a field, so nothing in a template is left uneditable.

export const FIELD_TYPES = ["text", "textarea", "image", "video", "url", "color", "colors", "font", "number", "toggle", "select", "list"];

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

/** The xp-content.js file a template loads before its own code. */
export function contentScript(content) {
  const json = JSON.stringify(content, null, 2).replace(/</g, "\\u003c").replace(LS, "\\u2028").replace(PS, "\\u2029");
  return `// Everything this site says and shows. Change it here; no code change needed.\nwindow.__XP__ = ${json};\n`;
}

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/svg+xml": "svg", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

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
