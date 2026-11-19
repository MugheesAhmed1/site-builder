// Dynamic sections (PRD journey). A site made from an approved PRD is a list of blocks, one
// for each PRD section. A block holds the words, pictures and requirements of its section
// (content) and a SectionSpec: the parameters the section is generated from (layout, hero
// asset, background, animation and the Director cut). The renderer (components/Block.tsx)
// draws the section from those parameters, so the same block can look completely different.

export type Layout = "fullscreen" | "split" | "centered" | "asymmetric" | "editorial";
export type HeroAssetType = "glb" | "image" | "video" | "illustration" | "particles" | "none";
export type BackgroundType = "solid" | "gradient" | "image" | "video" | "environment" | "particles";
export type SectionAnimation = "float" | "reveal" | "orbit" | "scroll" | "parallax" | "morph" | "particles";
export type DirectorId = "cinematic" | "luxury" | "editorial" | "documentary" | "futuristic" | "minimal" | "scientific" | "playful" | "immersive" | "product";
export type EnvironmentId = "lab" | "studio" | "space" | "ocean" | "forest" | "sunset" | "city" | "paper" | "aurora";
export type Lighting = "studio" | "lab" | "warm" | "dramatic" | "soft" | "neon";
export type CameraMove = "orbit" | "static" | "close" | "wide" | "scroll";
export type AssetMotion = "spin" | "float" | "none" | "scroll" | "pulse";
export type Illustration = "orbits" | "waves" | "blob" | "grid" | "rings";

export interface HeroAsset {
  type: HeroAssetType;
  /** A picture, video or GLB: a link, an uploaded data URL, or a "media:" reference to a browser-stored upload. */
  src?: string;
  /** A model from the asset library, when the GLB came from there. */
  assetId?: string;
  /** What the asset shows, in words ("realistic human heart"); used to find a library model. */
  subject?: string;
  alt?: string;
  illustration?: Illustration;
  /** 0.3 to 3, 1 is the designed size. */
  scale?: number;
  /** Degrees around x, y and z (3D) or z only (2D). */
  rotation?: [number, number, number];
  /** Offset from the designed place, in percent of the frame (x, y). */
  position?: [number, number];
  camera?: CameraMove;
  lighting?: Lighting;
  motion?: AssetMotion;
  /** Pictures: object position in percent and zoom inside the frame. */
  focus?: [number, number];
  zoom?: number;
  radius?: number;
}

export interface Background {
  type: BackgroundType;
  color?: string;
  /** Two colours and an angle. */
  gradient?: [string, string, number];
  src?: string;
  environment?: EnvironmentId;
  /** Darkens a picture, video or environment so words stay readable, 0 to 0.85. */
  dim?: number;
  /** "auto" takes the Director's tone; dark and light force the words' colours. */
  tone?: "auto" | "dark" | "light";
}

/** How a section's words look. Each value overrides the Director's. */
export type TextAlign = "start" | "center" | "end";
export type TextFace = "display" | "serif" | "body" | "mono" | "rounded";
export interface TextStyle {
  align?: TextAlign;
  /** Heading size against the Director's, 0.6 to 1.8. */
  size?: number;
  weight?: number;
  face?: TextFace;
  width?: "narrow" | "normal" | "wide";
  caps?: boolean;
}

/** How a section's list of things (steps, services, roles) is laid out. */
export type ItemStyle = "cards" | "grid" | "list" | "timeline" | "carousel";
export interface ItemsStyle {
  style?: ItemStyle;
  /** Columns for cards and grid, 1 to 4 (0 is automatic). */
  columns?: number;
  /** Show a picture on each item. */
  images?: boolean;
}

export interface SectionSpec {
  layout: Layout;
  hero: HeroAsset;
  background: Background;
  animation: SectionAnimation;
  /** The visual direction; a second one blends in its movement (transitions, camera and intensity). */
  director: DirectorId;
  secondary?: DirectorId;
  text?: TextStyle;
  items?: ItemsStyle;
}

export type Widget = "form" | "faq" | "pricing" | "gallery" | "map" | "search" | "video" | "stats" | "compare" | "explore" | "download" | "button" | "list";

export interface BlockRequirement {
  /** The PRD requirement id it carries (R1, R2...). */
  id: string;
  kind: "content" | "functional";
  text: string;
  /** How a functional requirement works on the page. */
  widget?: Widget;
  /** Form fields, when the widget is a form. */
  fields?: string[];
  /** The button words, when the widget has one. */
  action?: string;
  /** A video, file or link the widget uses. */
  src?: string;
}

export interface BlockItem {
  title: string;
  text: string;
  imageUrl?: string;
  /** Pricing cards, stats and other small values. */
  value?: string;
}

export interface Block {
  id: string;
  /** The PRD section this block presents. */
  prd: string;
  /** Opening block of the site (shown first, as the hero). */
  lead?: boolean;
  kicker: string;
  heading: string;
  body: string;
  items: BlockItem[];
  reqs: BlockRequirement[];
  cta?: { label: string; href: string };
  spec: SectionSpec;
  /** The asset kind the PRD asked for when the block was built (so a PRD change can win over it). */
  prdAsset?: HeroAssetType;
}

export const TEXT_ALIGNS: { id: TextAlign; label: string }[] = [
  { id: "start", label: "Left" },
  { id: "center", label: "Centre" },
  { id: "end", label: "Right" },
];
export const TEXT_FACES: { id: TextFace; label: string }[] = [
  { id: "display", label: "Display" },
  { id: "serif", label: "Serif" },
  { id: "body", label: "Sans" },
  { id: "rounded", label: "Rounded" },
  { id: "mono", label: "Mono" },
];
export const ITEM_STYLES: { id: ItemStyle; label: string }[] = [
  { id: "cards", label: "Cards" },
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
  { id: "timeline", label: "Timeline" },
  { id: "carousel", label: "Carousel" },
];

export const LAYOUTS: { id: Layout; label: string }[] = [
  { id: "fullscreen", label: "Fullscreen" },
  { id: "split", label: "Split screen" },
  { id: "centered", label: "Centered" },
  { id: "asymmetric", label: "Asymmetric" },
  { id: "editorial", label: "Editorial" },
];

export const HERO_TYPES: { id: HeroAssetType; label: string }[] = [
  { id: "glb", label: "3D GLB" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "illustration", label: "Animated illustration" },
  { id: "particles", label: "Particle system" },
  { id: "none", label: "No asset" },
];

export const BACKGROUNDS: { id: BackgroundType; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "gradient", label: "Gradient" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "environment", label: "3D environment" },
  { id: "particles", label: "Animated particles" },
];

export const ANIMATIONS: { id: SectionAnimation; label: string }[] = [
  { id: "float", label: "Float" },
  { id: "reveal", label: "Reveal" },
  { id: "orbit", label: "Camera orbit" },
  { id: "scroll", label: "Scroll-driven" },
  { id: "parallax", label: "Parallax" },
  { id: "morph", label: "Morph" },
  { id: "particles", label: "Particle transition" },
];

export const ENVIRONMENTS: { id: EnvironmentId; label: string; dark: boolean }[] = [
  { id: "lab", label: "Laboratory", dark: true },
  { id: "studio", label: "Photo studio", dark: false },
  { id: "space", label: "Deep space", dark: true },
  { id: "ocean", label: "Under water", dark: true },
  { id: "forest", label: "Forest light", dark: true },
  { id: "sunset", label: "Golden hour", dark: false },
  { id: "city", label: "Night city", dark: true },
  { id: "paper", label: "Paper", dark: false },
  { id: "aurora", label: "Aurora", dark: true },
];

export const ILLUSTRATIONS: { id: Illustration; label: string }[] = [
  { id: "orbits", label: "Orbits" },
  { id: "waves", label: "Waves" },
  { id: "blob", label: "Blob" },
  { id: "grid", label: "Grid" },
  { id: "rings", label: "Rings" },
];

/** The section id a block uses in content.sections and on the page (pf-b-<id>). */
export const blockSection = (b: { id: string }) => "b-" + b.id;
export const isBlockSection = (s: string) => s.startsWith("b-");
