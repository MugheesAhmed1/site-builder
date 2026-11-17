// The Experience JSON (PRD sections 8, 13, 34 and 44).
//
// A generated website is a sequence of scenes, not a sequence of sections. This file is the
// contract between the generator (packages/experience-core), the studio, the renderer
// (src/Site.tsx, src/scenes, src/motion) and both downloads. The studio preview and the
// downloaded site read the same Experience JSON through the same renderer (PRD section 43).

/** PRD section 5: every website gets one primary experience mode. */
export type ExperienceMode = "editorial" | "cinematic" | "world" | "product" | "playful";

/** PRD section 38: Light has no WebGL, Medium is canvas or light WebGL, Heavy is 3D, Extreme a full world. */
export type PerformanceTier = "light" | "medium" | "heavy" | "extreme";

/** PRD section 42: the generator only installs what the experience uses. */
export type DependencyProfile = "basic" | "cinematic" | "webgl" | "physics";

/** PRD section 23: the motion language matches the brand. */
export type MotionLanguage = "restrained" | "precise" | "elastic" | "stable" | "fluid" | "bold";

/** PRD section 21: reusable visual concepts. */
export type Metaphor = "walk" | "build" | "dive" | "fly" | "follow" | "reveal" | "transform" | "orbit" | "journey" | "playground";

/** PRD section 14: what a scene is for. */
export type SceneKind =
  | "hero"
  | "story"
  | "product-reveal"
  | "feature-world"
  | "timeline"
  | "showcase"
  | "comparison"
  | "process"
  | "statistics"
  | "case-study"
  | "gallery"
  | "testimonial"
  | "faq"
  | "cta"
  | "contact";

/** PRD section 14: a section can be DOM only, or DOM plus a visual layer. */
export type SceneLayer = "dom" | "canvas" | "webgl" | "video" | "3d" | "object";

export type InteractionInput = "scroll" | "cursor" | "click" | "touch" | "hover" | "keyboard";

/** PRD section 25. Desktop only; turned off on touch screens automatically. */
export type CursorMode = "standard" | "dot" | "ring" | "magnetic" | "spotlight" | "label" | "distortion" | "follower" | "character";

/**
 * The visual stage engines. Each one is original code in src/scenes. The 3D engines live in
 * src/scenes/webgl and always name a 2D engine to fall back to (PRD section 39).
 */
export type StageEngine2D =
  | "landscape"
  | "depths"
  | "cosmos"
  | "brew"
  | "morph"
  | "grow"
  | "assemble"
  | "interface"
  | "ledger"
  | "kinetic"
  | "orbit"
  | "playground"
  | "character"
  | "progress"
  | "liquid";
export type StageEngine3D = "product3d" | "gallery3d" | "space3d" | "blob3d";
export type StageEngine = StageEngine2D | StageEngine3D;

export type Param = number | string | boolean;
export type Params = Record<string, Param>;

/** What the visual stage looks like at one scene. Values blend as the visitor scrolls between scenes. */
export type Beat = Params;

export interface StageSpec {
  /** The engine that draws the stage. */
  engine: StageEngine2D;
  /** A 3D engine that replaces it when the device, the intensity and the tier allow. */
  webgl?: StageEngine3D;
  /** Settings shared by every scene (the world, palette, density). */
  params: Params;
}

/** PRD section 10: behaviours that objects and characters can have. */
export type Behaviour =
  | "idle"
  | "lookAtCursor"
  | "followCursor"
  | "reactToClick"
  | "reactToScroll"
  | "wander"
  | "enterScene"
  | "exitScene"
  | "jump"
  | "bounce"
  | "hide"
  | "transform"
  | "orbit"
  | "drag"
  | "repel"
  | "attract";

export interface SceneObject {
  id: string;
  /** "anchor" is the visual object that carries the story from scene to scene. */
  role: "anchor" | "character" | "prop" | "particles" | "text";
  type: string;
  behaviours: Behaviour[];
}

/** PRD section 15: scroll is an input device. */
export interface ScrollMapping {
  source: "scene" | "page";
  target: "camera" | "object" | "rotation" | "scale" | "opacity" | "shader" | "video" | "environment" | "typography" | "progress";
  /** The object, layer or parameter the mapping drives. */
  ref: string;
}

export interface CameraConfig {
  travel: "none" | "forward" | "dive" | "orbit" | "pan" | "rise" | "push";
  /** Where the camera is at the start and the end of the scene, 0 to 1 along the journey. */
  from: number;
  to: number;
}

export interface Interaction {
  input: InteractionInput;
  /** An object id, "stage", "headline" or "cta". */
  target: string;
  /** A motion primitive id from src/motion/primitives.ts. */
  primitive: string;
  /** What the visitor sees, in plain words (used by the studio and the QA engine). */
  response: string;
  /** How the same moment works on a touch screen. Empty means it is desktop only and decorative. */
  touch?: string;
}

export interface Transition {
  /** A motion primitive id, category "transition" or "scroll". */
  primitive: string;
  mechanic: string;
  to?: string;
}

export interface ExperienceScene {
  id: string;
  /** The content section this scene presents (hero, services, about, contact...). */
  section: string;
  kind: SceneKind;
  /** The storyboard name of this moment ("Roasting", "Camera reaches the cabin"). */
  title: string;
  /** What happens, in one line. The studio shows it; the QA engine reads it. */
  note: string;
  /** Scroll length of the scene in viewport heights. Above 1 the scene is pinned while the stage moves. */
  duration: number;
  layer: SceneLayer;
  /** Where the words sit, leaving room for the stage. */
  composition: "left" | "right" | "center" | "wide";
  environment?: { id: string; state: string };
  beat: Beat;
  objects: SceneObject[];
  camera?: CameraConfig;
  scroll: ScrollMapping[];
  interactions: Interaction[];
  transitions: Transition[];
  /** Motion primitive ids for how the scene's words arrive. */
  entrance: string;
  text: string;
  hidden?: boolean;
}

/** PRD section 30 (Motion): each channel can be switched or tuned on its own. */
export interface MotionChannels {
  scroll: number; // 0 off, 1 to 3 how strongly scroll drives the stage
  cursor: number;
  hover: number;
  click: number;
  transitions: number;
  typography: number;
  characters: number;
  environment: number;
}

/** PRD section 7, stage 6: what the performance pass allows. */
export interface Budget {
  particles: number;
  dpr: number;
  timelines: number;
  texture: number;
  /** Frames per second the stage aims for when the device is weak. */
  lowFps: number;
}

export interface Direction {
  /** "A" editorial, "B" cinematic, "C" interactive (PRD section 57). */
  label: "A" | "B" | "C";
  mode: ExperienceMode;
  concept: string;
  name: string;
  pitch: string;
  score: number;
}

export interface Experience {
  version: 2;
  seed: number;
  mode: ExperienceMode;
  /** A concept id from the concept library, and its name in plain words. */
  concept: string;
  name: string;
  pitch: string;
  metaphor: Metaphor;
  preset?: string;
  pack?: string;
  /** An environment id from the environment library. */
  world: string;
  /** PRD section 6: 1 Calm to 10 Showpiece. It sets complexity, not the number of animations. */
  intensity: number;
  interactionLevel: number;
  primaryInteraction: InteractionInput;
  secondaryInteraction: InteractionInput;
  heroMechanic: string;
  transitionMechanic: string;
  visualAnchor: string;
  motionLanguage: MotionLanguage;
  tier: PerformanceTier;
  profile: DependencyProfile;
  /** The smallest set of systems this experience needs (PRD section 7, stage 4). */
  technologies: string[];
  stage: StageSpec;
  scenes: ExperienceScene[];
  channels: MotionChannels;
  cursor: CursorMode;
  smooth: boolean;
  /** Sound only ever plays after the visitor turns it on (PRD section 26). */
  sound: boolean;
  budget: Budget;
  fallbacks: { mobile: string; reducedMotion: string; lowPower: string };
  /** The three creative directions considered, for compare and restore. */
  directions: Direction[];
  /** The person turned 3D off; the stage stays 2D at every intensity. */
  noWebgl?: boolean;
  /** PRD section 65: Smart by default, Creative or Custom for people who want more. */
  control: "smart" | "creative" | "custom";
}
