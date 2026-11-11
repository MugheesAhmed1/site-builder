import { CATEGORIES } from "./categories";
import { CHARACTERS, SKINS, WIDGETS, type CharacterDef, type WidgetDef } from "@/template/src/cast.js";
import { MOTIONS, type MotionStyle } from "@/template/src/motion.js";
import { SCENES } from "@/template/src/scenes.js";

// Categories for both kinds of site: business types (restaurant, dentist, hospital, agency,
// creator and so on) and portfolio roles (product manager, IT manager, CEO and so on).
// Each one has a "fit": the character families, widget types, animation feel and speeds
// that suit it. The pickers show the fitting ones first and can show everything.

export interface Role {
  id: string;
  label: string;
  keywords: string[];
}

export const ROLES: Role[] = [
  { id: "role-pm", label: "Product manager", keywords: ["product manager", "product owner", "pm ", "product lead", "head of product"] },
  { id: "role-it", label: "IT manager", keywords: ["it manager", "it director", "it head", "head of it", "sysadmin", "system administrator", "network engineer", "it support", "cto"] },
  { id: "role-ceo", label: "CEO or founder", keywords: ["ceo", "founder", "co-founder", "cofounder", "managing director", "chief executive", "entrepreneur", "business owner"] },
  { id: "role-designer", label: "Designer", keywords: ["designer", "ux", "ui", "product designer", "graphic designer", "art director", "illustrator"] },
  { id: "role-dev", label: "Software developer", keywords: ["developer", "software engineer", "programmer", "frontend", "backend", "full stack", "full-stack", "web developer", "mobile developer"] },
  { id: "role-marketer", label: "Marketer", keywords: ["marketer", "marketing manager", "growth", "seo specialist", "social media manager", "brand manager", "digital marketing"] },
  { id: "role-data", label: "Data analyst or scientist", keywords: ["data analyst", "data scientist", "analyst", "machine learning", "ml engineer", "bi developer", "statistician"] },
  { id: "role-engineer", label: "Engineer", keywords: ["civil engineer", "mechanical engineer", "electrical engineer", "engineer", "architect"] },
  { id: "role-sales", label: "Sales leader", keywords: ["sales", "account executive", "business development", "bdm", "account manager"] },
  { id: "role-hr", label: "HR and people", keywords: ["hr", "human resources", "recruiter", "talent", "people partner", "people operations"] },
  { id: "role-finance", label: "Finance and accounting", keywords: ["finance", "accountant", "cfo", "auditor", "financial analyst", "investment", "banker"] },
  { id: "role-teacher", label: "Teacher or trainer", keywords: ["teacher", "lecturer", "professor", "trainer", "tutor", "educator"] },
  { id: "role-doctor", label: "Doctor or nurse", keywords: ["doctor", "physician", "surgeon", "nurse", "dentist", "pharmacist", "medical"] },
  { id: "role-writer", label: "Writer or journalist", keywords: ["writer", "journalist", "copywriter", "editor", "author", "content writer"] },
  { id: "role-photo", label: "Photographer or filmmaker", keywords: ["photographer", "filmmaker", "videographer", "cinematographer", "video editor"] },
  { id: "role-creator", label: "Digital creator", keywords: ["creator", "youtuber", "influencer", "streamer", "podcaster", "content creator"] },
  { id: "role-student", label: "Student or graduate", keywords: ["student", "graduate", "intern", "fresh graduate", "fresher"] },
];

export function roleById(id: string) {
  return ROLES.find((r) => r.id === id);
}

export function classifyRole(query: string): string {
  const q = " " + query.toLowerCase() + " ";
  let best = { id: "portfolio", score: 0 };
  for (const r of ROLES) {
    const score = r.keywords.reduce((n, k) => n + (new RegExp("\\b" + k.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(q) ? k.length : 0), 0);
    if (score > best.score) best = { id: r.id, score };
  }
  return best.id;
}

export interface Fit {
  families: string[];
  widgets: string[];
  feels: string[];
  tempos: string[];
}

const F = (families: string, widgets: string, feels: string, tempos: string): Fit => ({ families: families.split(" "), widgets: widgets.split(" "), feels: feels.split(" "), tempos: tempos.split(" ") });

export const FITS: Record<string, Fit> = {
  // Businesses
  food: F("cup bear blob plant person cat", "menu rating status countdown pin chat clock price", "playful calm", "spring bouncy smooth"),
  beauty: F("plant cat blob person heart", "appointment rating price calendar quote status", "calm", "smooth gentle cinematic"),
  fitness: F("bear rocket person heart blob", "pulse growth countdown todo ring bars", "bold playful", "snappy quick bouncy"),
  health: F("heart plant blob bear person", "appointment pulse status rating calendar chat", "calm", "smooth gentle"),
  dentist: F("tooth blob heart bear person", "appointment rating price calendar status chat", "calm playful", "smooth spring"),
  hospital: F("heart robot person plant blob", "pulse status appointment clock pin avatars", "calm tech", "smooth gentle quick"),
  agency: F("rocket alien blob ghost camera laptop", "growth line cursor avatars quote followers", "bold playful", "cinematic snappy quick"),
  creator: F("camera alien ghost cat blob orb", "followers music chat notify growth bars", "playful bold", "bouncy spring snappy"),
  consulting: F("person book orb bear", "calendar quote growth stat price chat", "calm tech", "smooth cinematic"),
  law: F("book person house orb", "calendar quote rating status badge chat", "calm", "gentle cinematic smooth"),
  photo: F("camera cat bird ghost person", "rating quote calendar pin upload music", "calm bold", "cinematic gentle"),
  property: F("house plant bear orb person", "pin price growth calendar rating avatars", "calm bold", "cinematic smooth"),
  product: F("robot laptop rocket alien orb", "uptime growth code line toggle notify", "tech bold", "quick snappy spring"),
  shop: F("cat blob bear cup heart", "price rating notify tags countdown menu", "playful bold", "spring bouncy quick"),
  nonprofit: F("heart plant bird blob bear", "growth ring avatars quote countdown stat", "calm playful", "smooth gentle"),
  events: F("ghost bird blob orb heart", "countdown calendar avatars music pin rating", "playful bold", "bouncy cinematic"),
  school: F("book bird orb robot person", "todo calendar ring badge avatars quote", "playful calm", "spring smooth"),
  hotel: F("house bird cup plant orb", "weather calendar rating pin price clock", "calm", "gentle cinematic"),
  trades: F("house robot bear car", "price todo rating calendar pin upload", "bold tech", "quick snappy"),
  auto: F("car robot rocket bear", "appointment price todo rating clock pin", "tech bold", "snappy quick"),
  pets: F("dog cat bird bear heart", "appointment rating chat calendar status menu", "playful", "bouncy spring"),
  general: F("blob robot bear plant orb", "rating chat status tags bars pin clock price", "calm bold playful tech", "smooth quick spring"),
  // Portfolios
  portfolio: F("person robot blob orb alien laptop", "stat chat status tags line code calendar quote", "calm bold playful tech", "smooth quick spring"),
  "role-pm": F("person laptop rocket robot", "growth line todo stat chat quote", "tech calm", "smooth quick"),
  "role-it": F("robot laptop alien person", "uptime code status toggle bars notify", "tech", "quick snappy"),
  "role-ceo": F("person rocket orb book", "growth stat quote avatars badge calendar", "bold calm", "cinematic gentle"),
  "role-designer": F("blob ghost cat camera person", "cursor tags quote upload slider music", "playful bold", "spring bouncy cinematic"),
  "role-dev": F("robot laptop alien ghost", "code uptime toggle search line status", "tech", "snappy quick"),
  "role-marketer": F("rocket camera blob person", "growth followers line notify bars quote", "bold playful", "quick spring"),
  "role-data": F("robot orb laptop alien", "bars line ring stat growth search", "tech calm", "smooth quick"),
  "role-engineer": F("robot rocket car house", "uptime ring todo code stat badge", "tech", "quick smooth"),
  "role-sales": F("person rocket bear", "growth stat calendar notify avatars quote", "bold", "snappy quick"),
  "role-hr": F("person heart bear plant", "avatars calendar chat quote todo status", "calm", "smooth gentle"),
  "role-finance": F("orb book person robot", "growth line ring stat bars badge", "calm tech", "smooth cinematic"),
  "role-teacher": F("book bird person orb", "todo calendar badge quote avatars ring", "playful calm", "spring smooth"),
  "role-doctor": F("heart person plant tooth", "pulse appointment badge quote calendar status", "calm", "gentle smooth"),
  "role-writer": F("book cup cat ghost", "quote tags music todo calendar chat", "calm", "gentle cinematic"),
  "role-photo": F("camera bird cat ghost", "upload rating quote pin calendar music", "calm bold", "cinematic gentle"),
  "role-creator": F("camera alien ghost blob", "followers music chat growth notify bars", "playful", "bouncy spring"),
  "role-student": F("person book blob rocket", "todo badge tags calendar chat ring", "playful calm", "spring smooth"),
};

export function fitFor(category: string): Fit {
  return FITS[category] ?? FITS.general;
}
const FIT_ID = new Map(Object.entries(FITS).map(([k, v]) => [v, k]));

export function categoryLabel(kind: string, category: string): string {
  if (kind === "portfolio") return roleById(category)?.label ?? "Any role";
  return CATEGORIES.find((c) => c.id === category)?.label ?? "Something else";
}

// Every category, grouped, for menus and the home page.
export const CATEGORY_GROUPS = [
  { kind: "website" as const, title: "Businesses", items: CATEGORIES.map((c) => ({ id: c.id, label: c.label })) },
  { kind: "portfolio" as const, title: "Individuals", items: [...ROLES.map((r) => ({ id: r.id, label: r.label })), { id: "portfolio", label: "Any role" }] },
];

export function fitsCharacter(c: CharacterDef, fit: Fit) {
  // Real-life characters each list the categories they suit (a chef for food, a dentist for dentists).
  if (c.fits) return c.fits.includes(FIT_ID.get(fit) ?? "general");
  return fit.families.includes(c.family);
}
export function fitsWidget(w: WidgetDef, fit: Fit) {
  return fit.widgets.includes(w.kind);
}
export function fitsMotion(m: MotionStyle, fit: Fit) {
  return m.id === "M-000" || (fit.feels.includes(m.feel ?? "") && fit.tempos.includes(m.tempo));
}

// A starting cast for a category, stable per project.
export function castFor(category: string, seed: number, strict = false): { character: CharacterDef; widgets: WidgetDef[] } {
  const fit = fitFor(category);
  const family = strict ? fit.families[0] : fit.families[(seed >>> 0) % Math.min(3, fit.families.length)];
  const all = CHARACTERS.filter((c) => c.family === family);
  // The darkest palettes hide the face on a dark page, so the showcase skips them.
  const pool = strict ? all.filter((c) => c.palette !== "ink" && c.palette !== "slate") : all;
  const character = pool[(seed >>> 3) % pool.length];
  const skin = SKINS[(seed >>> 5) % SKINS.length].id;
  const widgets = fit.widgets.slice(0, 6).map((k) => WIDGETS.find((w) => w.kind === k && w.skin === skin) ?? WIDGETS.find((w) => w.kind === k)!);
  return { character, widgets };
}

// An animation style that suits the category, stable per seed.
export function motionFor(category: string, seed: number): string {
  const fit = fitFor(category);
  const pool = MOTIONS.filter((m) => m.id !== "M-000" && fitsMotion(m, fit));
  return pool.length ? pool[(seed >>> 2) % pool.length].id : "M-002";
}

// The face of a category, for menus and the home page.
export function iconFor(category: string) {
  let h = 0;
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return castFor(category, h, true).character;
}

// Live scenes (particles, nature, photo, 3D) that suit each category, best first.
const SCENE_FIT: Record<string, string> = {
  food: "petals fireflies sky bubbles reveal beans blossoms", beauty: "petals liquid glass reveal fireflies blossoms butterflies", fitness: "orbs vortex dotgrid swarm leaves", health: "meadow sky waves bubbles drift butterflies",
  dentist: "bubbles sky glass waves drift", hospital: "constellation dotgrid sky bubbles drift", agency: "swarm charms liquid flow orbs glass gold", creator: "swarm charms vortex orbs stars pixels butterflies",
  consulting: "constellation flow globe glass leaves", law: "constellation stars glass flow leaves", photo: "reveal tilt ripple slices pixels leaves", property: "sky tree glass tilt leaves",
  product: "globe charms constellation dotgrid flow swarm drift", shop: "charms bubbles orbs petals glass gold blossoms", nonprofit: "tree meadow fireflies sky butterflies leaves", events: "stars fireflies swarm vortex gold butterflies",
  school: "tree bubbles stars meadow butterflies", hotel: "waves sky aquarium petals reef blossoms", trades: "dotgrid orbs sky rain leaves", auto: "flow vortex dotgrid rain leaves", pets: "aquarium meadow fireflies bubbles reef butterflies",
  general: "constellation fireflies bubbles sky butterflies", portfolio: "swarm constellation fireflies tilt drift", "role-pm": "constellation bubbles flow drift", "role-it": "globe dotgrid constellation drift",
  "role-ceo": "globe stars glass gold", "role-designer": "liquid charms swarm petals glass butterflies blossoms", "role-dev": "dotgrid flow constellation swarm drift", "role-marketer": "bubbles orbs vortex gold",
  "role-data": "globe constellation flow drift", "role-engineer": "dotgrid globe flow leaves", "role-sales": "orbs bubbles vortex gold", "role-hr": "bubbles meadow fireflies butterflies", "role-finance": "globe constellation glass gold",
  "role-teacher": "tree stars bubbles leaves", "role-doctor": "waves sky meadow drift", "role-writer": "rain petals snow stars leaves flurry", "role-photo": "reveal tilt ripple pixels leaves", "role-creator": "swarm vortex stars orbs butterflies", "role-student": "stars bubbles tree leaves",
};
export function scenesFor(category: string): string[] {
  return (SCENE_FIT[category] ?? SCENE_FIT.general).split(" ");
}

// A starting scene for a category, stable per seed. Photo scenes wait for a photo, so the
// starting pick skips them; people can choose one in the Characters step.
export function sceneFor(category: string, seed: number) {
  const types = scenesFor(category).filter((t) => !["tilt", "reveal", "pixels", "ripple", "slices"].includes(t));
  const type = types[(seed >>> 4) % Math.min(2, types.length)] ?? "constellation";
  return SCENES.find((s) => s.type === type && s.palette === "brand") ?? SCENES[0];
}
