// The cast: pre-animated characters and widgets a site is built around.
// 12 character families x 18 variants = 216 characters; 26 widget kinds x 8 skins = 208
// widgets. Each one is plain data, so the builder can load more from the library on GitHub
// and a downloaded site carries the exact ones it uses inside site-data.json.
// All artwork is original, drawn in SVG by src/Cast.jsx.

export const FAMILIES = [
  { id: "person", name: "Person" },
  { id: "blob", name: "Blob" },
  { id: "robot", name: "Robot" },
  { id: "cat", name: "Cat" },
  { id: "bear", name: "Bear" },
  { id: "bird", name: "Bird" },
  { id: "ghost", name: "Ghost" },
  { id: "alien", name: "Alien" },
  { id: "plant", name: "Plant" },
  { id: "cup", name: "Coffee cup" },
  { id: "rocket", name: "Rocket" },
  { id: "orb", name: "Planet" },
];

export const PALETTES = [
  { id: "brand", name: "Brand", body: "var(--pf-accent)", trim: "var(--pf-on-accent)" },
  { id: "mint", name: "Mint", body: "#7FD8BE", trim: "#1F5F4E" },
  { id: "peach", name: "Peach", body: "#FFB38A", trim: "#7A3B1D" },
  { id: "lilac", name: "Lilac", body: "#B9A6FF", trim: "#3E2E8C" },
  { id: "sky", name: "Sky", body: "#8CC8FF", trim: "#18467A" },
  { id: "lemon", name: "Lemon", body: "#FFE27A", trim: "#6E5A0B" },
  { id: "coral", name: "Coral", body: "#FF8A80", trim: "#7A1F1A" },
  { id: "slate", name: "Slate", body: "#9AA6B8", trim: "#2A3342" },
  { id: "ink", name: "Ink", body: "#2E3350", trim: "#E8EAFF" },
];

export const EXPRESSIONS = ["smile", "grin", "wink", "wow"];
export const ACCESSORIES = ["none", "glasses", "hat", "headphones", "scarf", "crown"];
export const IDLES = ["bob", "sway", "bounce", "float", "wiggle"];

const ACC_NAME = { none: "", glasses: "with glasses", hat: "in a hat", headphones: "with headphones", scarf: "in a scarf", crown: "with a crown" };

function buildCharacters() {
  const out = [];
  let n = 1;
  FAMILIES.forEach((f, fi) => {
    for (let v = 0; v < 18; v++) {
      const palette = PALETTES[(v * 7 + fi * 3) % PALETTES.length];
      const accessory = ACCESSORIES[(v * 5 + fi) % ACCESSORIES.length];
      const expression = EXPRESSIONS[(v + fi) % EXPRESSIONS.length];
      const idle = IDLES[(v * 3 + fi) % IDLES.length];
      out.push({
        id: "C-" + String(n++).padStart(3, "0"),
        family: f.id,
        name: [palette.name, f.name.toLowerCase(), ACC_NAME[accessory]].filter(Boolean).join(" "),
        palette: palette.id,
        accessory,
        expression,
        idle,
        variant: v,
      });
    }
  });
  return out;
}

export const WIDGET_KINDS = [
  { id: "stat", name: "Big number" },
  { id: "line", name: "Line chart" },
  { id: "bars", name: "Bar chart" },
  { id: "ring", name: "Progress ring" },
  { id: "chat", name: "Chat bubble" },
  { id: "rating", name: "Star rating" },
  { id: "status", name: "Live status" },
  { id: "tags", name: "Skill tags" },
  { id: "calendar", name: "Calendar" },
  { id: "music", name: "Now playing" },
  { id: "weather", name: "Weather" },
  { id: "notify", name: "Notification" },
  { id: "toggle", name: "Toggle" },
  { id: "slider", name: "Slider" },
  { id: "avatars", name: "Team faces" },
  { id: "code", name: "Code snippet" },
  { id: "pin", name: "Map pin" },
  { id: "clock", name: "Clock" },
  { id: "todo", name: "Checklist" },
  { id: "cursor", name: "Live cursor" },
  { id: "upload", name: "Upload progress" },
  { id: "search", name: "Search bar" },
  { id: "price", name: "Price tag" },
  { id: "quote", name: "Quote card" },
  { id: "countdown", name: "Countdown" },
  { id: "badge", name: "Award badge" },
];

export const SKINS = [
  { id: "glass", name: "Glass" },
  { id: "solid", name: "Solid" },
  { id: "outline", name: "Outline" },
  { id: "neon", name: "Neon" },
  { id: "paper", name: "Paper" },
  { id: "gradient", name: "Gradient" },
  { id: "dark", name: "Midnight" },
  { id: "pastel", name: "Pastel" },
];

function buildWidgets() {
  const out = [];
  let n = 1;
  for (const k of WIDGET_KINDS)
    for (const s of SKINS) out.push({ id: "W-" + String(n++).padStart(3, "0"), kind: k.id, skin: s.id, name: `${s.name} ${k.name.toLowerCase()}` });
  return out;
}

export const CHARACTERS = buildCharacters();
export const WIDGETS = buildWidgets();

export function characterById(id, list = CHARACTERS) {
  return list.find((c) => c.id === id) || null;
}
export function widgetById(id, list = WIDGETS) {
  return list.find((w) => w.id === id) || null;
}

// A good starting cast for a kind of site, picked from a seed so it's stable per person.
const FAMILY_FOR = {
  portfolio: ["person", "person", "robot", "blob", "orb", "alien"],
  food: ["cup", "bear", "blob", "plant"],
  beauty: ["plant", "cat", "blob", "person"],
  fitness: ["bear", "rocket", "person", "blob"],
  health: ["blob", "plant", "bear", "person"],
  education: ["bird", "orb", "robot", "person"],
  tech: ["robot", "alien", "rocket", "orb"],
  saas: ["robot", "rocket", "alien", "blob"],
  photo: ["cat", "bird", "ghost", "person"],
  events: ["ghost", "bird", "blob", "orb"],
  property: ["plant", "bear", "orb", "person"],
  shop: ["cat", "blob", "bear", "cup"],
};
const WIDGETS_FOR = {
  portfolio: ["stat", "chat", "status", "tags", "line", "code", "calendar", "quote"],
  default: ["rating", "chat", "status", "tags", "bars", "pin", "clock", "price"],
};

export function defaultCast(kind, category, seed) {
  const fam = FAMILY_FOR[kind === "portfolio" ? "portfolio" : category] || ["blob", "robot", "bear", "plant"];
  const family = fam[(seed >>> 0) % fam.length];
  const pool = CHARACTERS.filter((c) => c.family === family);
  const character = pool[(seed >>> 3) % pool.length];
  const kinds = WIDGETS_FOR[kind === "portfolio" ? "portfolio" : "default"];
  const skin = SKINS[(seed >>> 5) % SKINS.length].id;
  const widgets = kinds.slice(0, 6).map((k) => WIDGETS.find((w) => w.kind === k && w.skin === skin));
  return { character, widgets };
}
