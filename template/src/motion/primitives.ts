// The motion primitive registry (PRD sections 8 and 9). Every animation the generator can use
// is one of these, with its cost and how it behaves on phones and with reduced motion. The
// generator picks from here, the performance pass reads the costs, the QA engine checks the
// fallbacks, and the renderer (src/motion/runtime.ts) implements each id.

export type PrimitiveCategory =
  | "entrance"
  | "scroll"
  | "cursor"
  | "click"
  | "hover"
  | "transition"
  | "environment"
  | "character"
  | "camera"
  | "text"
  | "physics"
  | "touch";

export interface MotionPrimitive {
  id: string;
  category: PrimitiveCategory;
  name: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  performance: "light" | "medium" | "heavy";
  mobileSupport: boolean;
  reducedMotionSupport: boolean;
  /** The lowest experience intensity (1 to 10) it is allowed at. */
  minLevel: number;
  /** What a phone gets instead, when mobileSupport is false. */
  mobile?: string;
  /** What reduced motion gets instead: another primitive id, or "none" (the end state, shown at once). */
  reduced: string;
}

type Row = [id: string, name: string, intensity: MotionPrimitive["intensity"], perf: MotionPrimitive["performance"], minLevel: number, mobile: string | true, reduced: string];

const rows = (category: PrimitiveCategory, list: Row[]): MotionPrimitive[] =>
  list.map(([id, name, intensity, performance, minLevel, mobile, reduced]) => ({
    id: category + "." + id,
    category,
    name,
    intensity,
    performance,
    mobileSupport: mobile === true,
    mobile: mobile === true ? undefined : mobile,
    reducedMotionSupport: reduced !== "none",
    reduced,
    minLevel,
  }));

export const PRIMITIVES: MotionPrimitive[] = [
  ...rows("entrance", [
    ["fade", "Fade", 1, "light", 1, true, "entrance.fade"],
    ["rise", "Rise", 1, "light", 1, true, "entrance.fade"],
    ["slide", "Slide", 2, "light", 1, true, "entrance.fade"],
    ["reveal", "Reveal", 2, "light", 1, true, "entrance.fade"],
    ["clip", "Clip reveal", 2, "light", 2, true, "entrance.fade"],
    ["mask", "Mask reveal", 3, "light", 3, true, "entrance.fade"],
    ["blur", "Blur reveal", 2, "medium", 2, true, "entrance.fade"],
    ["scale", "Scale reveal", 2, "light", 2, true, "entrance.fade"],
    ["rotate", "Rotate reveal", 3, "light", 4, true, "entrance.fade"],
    ["split", "Split text", 3, "light", 3, true, "entrance.fade"],
    ["stagger", "Stagger", 2, "light", 1, true, "entrance.fade"],
    ["depth", "Depth reveal", 4, "medium", 5, true, "entrance.fade"],
  ]),
  ...rows("scroll", [
    ["parallax", "Parallax", 2, "light", 1, true, "none"],
    ["scrub", "Scrub", 3, "light", 3, true, "none"],
    ["pin", "Pin", 3, "light", 5, true, "none"],
    ["horizontal", "Horizontal travel", 4, "medium", 5, "scroll.scrub", "none"],
    ["camera", "Camera travel", 4, "medium", 5, true, "none"],
    ["zoom", "Zoom", 3, "light", 3, true, "none"],
    ["rotate", "Rotate", 3, "light", 3, true, "none"],
    ["scale", "Scale", 2, "light", 2, true, "none"],
    ["morph", "Morph", 4, "medium", 4, true, "none"],
    ["scene", "Scene transition", 4, "medium", 5, true, "none"],
    ["sequence", "Image sequence", 4, "heavy", 6, true, "none"],
    ["video", "Video scrub", 4, "heavy", 6, true, "none"],
    ["path", "Object path", 4, "medium", 5, true, "none"],
  ]),
  ...rows("cursor", [
    ["magnetic", "Magnetic", 2, "light", 3, "none", "none"],
    ["follow", "Follow", 3, "light", 4, "touch.tap-follow", "none"],
    ["repel", "Repel", 3, "medium", 4, "touch.tap-burst", "none"],
    ["attract", "Attract", 3, "medium", 4, "touch.tap-burst", "none"],
    ["spotlight", "Spotlight", 2, "light", 3, "none", "none"],
    ["distortion", "Distortion", 4, "heavy", 7, "none", "none"],
    ["tilt", "Tilt", 2, "light", 3, "none", "none"],
    ["orbit", "Orbit", 3, "medium", 5, "touch.drag", "none"],
    ["track", "Character tracking", 3, "light", 5, "touch.tap-follow", "none"],
    ["particles", "Particle response", 3, "medium", 4, "touch.tap-burst", "none"],
    ["light", "Light direction", 2, "light", 3, "none", "none"],
  ]),
  ...rows("click", [
    ["ripple", "Ripple", 1, "light", 1, true, "none"],
    ["burst", "Burst", 2, "light", 3, true, "none"],
    ["explode", "Particle explosion", 3, "medium", 5, true, "none"],
    ["transform", "Object transformation", 3, "medium", 4, true, "click.transform"],
    ["react", "Character reaction", 3, "light", 5, true, "click.react"],
    ["scene", "Scene transition", 4, "medium", 6, true, "none"],
    ["sound", "Sound trigger", 1, "light", 3, true, "click.sound"],
    ["impulse", "Physics impulse", 4, "medium", 8, true, "none"],
  ]),
  ...rows("hover", [
    ["magnetic", "Magnetic", 2, "light", 3, "none", "none"],
    ["distortion", "Distortion", 3, "medium", 6, "none", "none"],
    ["image", "Image reveal", 2, "light", 2, "none", "none"],
    ["tilt", "Tilt", 2, "light", 3, "none", "none"],
    ["scale", "Scale", 1, "light", 1, "none", "none"],
    ["color", "Colour shift", 1, "light", 1, "none", "hover.color"],
    ["liquid", "Liquid effect", 3, "medium", 6, "none", "none"],
    ["scramble", "Text scramble", 2, "light", 4, "none", "none"],
    ["move", "Object movement", 2, "light", 3, "none", "none"],
  ]),
  ...rows("transition", [
    ["crossfade", "Crossfade", 1, "light", 1, true, "none"],
    ["morph", "Environment morph", 3, "medium", 5, true, "none"],
    ["depth", "Depth transition", 4, "medium", 6, true, "none"],
    ["wipe", "Wipe", 2, "light", 3, true, "none"],
    ["warp", "Warp", 4, "heavy", 8, true, "none"],
    ["continue", "Object continues", 3, "light", 4, true, "none"],
  ]),
  ...rows("environment", [
    ["drift", "Ambient drift", 1, "light", 1, true, "none"],
    ["weather", "Weather and particles", 2, "medium", 3, true, "none"],
    ["daylight", "Light changes over the journey", 2, "light", 2, true, "none"],
    ["fog", "Fog reacts to the cursor", 3, "medium", 5, "none", "none"],
    ["water", "Water and caustics", 3, "medium", 5, true, "none"],
  ]),
  ...rows("character", [
    ["idle", "Idle", 1, "light", 1, true, "none"],
    ["look", "Looks at the cursor", 2, "light", 5, "character.idle", "none"],
    ["follow", "Follows the cursor", 3, "light", 6, "character.idle", "none"],
    ["react", "Reacts to a click or tap", 3, "light", 5, true, "none"],
    ["scroll", "Moves with the scroll", 3, "light", 5, true, "none"],
    ["wander", "Wanders", 2, "light", 5, true, "none"],
    ["travel", "Appears in the next scene", 3, "light", 6, true, "none"],
  ]),
  ...rows("camera", [
    ["forward", "Camera moves forward", 3, "medium", 5, true, "none"],
    ["dive", "Dive", 4, "medium", 5, true, "none"],
    ["orbit", "Orbit", 3, "medium", 5, true, "none"],
    ["pan", "Pan", 2, "light", 3, true, "none"],
    ["rise", "Rise", 2, "light", 3, true, "none"],
  ]),
  ...rows("text", [
    ["split", "Split text", 2, "light", 2, true, "text.plain"],
    ["words", "Word reveal", 2, "light", 1, true, "text.plain"],
    ["chars", "Character reveal", 3, "light", 3, true, "text.plain"],
    ["blur", "Blur", 2, "medium", 3, true, "text.plain"],
    ["scramble", "Scramble", 3, "light", 5, true, "text.plain"],
    ["scale", "Scale", 3, "light", 4, true, "text.plain"],
    ["depth", "Depth", 4, "light", 6, true, "text.plain"],
    ["mask", "Masking", 3, "light", 3, true, "text.plain"],
    ["kinetic", "Kinetic typography", 4, "medium", 6, true, "text.plain"],
    ["plain", "Plain", 1, "light", 1, true, "text.plain"],
  ]),
  // What a phone gets in place of a cursor effect (PRD sections 19 and 25).
  ...rows("touch", [
    ["tap-follow", "Tap to call it over", 2, "light", 1, true, "none"],
    ["tap-burst", "Tap to burst", 2, "light", 1, true, "none"],
    ["drag", "Drag to turn", 2, "light", 1, true, "none"],
    ["tilt", "Tilt with the phone", 2, "light", 6, true, "none"],
  ]),
  ...rows("physics", [
    ["gravity", "Gravity and bounce", 3, "medium", 8, true, "none"],
    ["drag", "Drag and throw", 3, "medium", 8, true, "none"],
    ["collide", "Collisions", 3, "medium", 9, true, "none"],
  ]),
];

const BY_ID = new Map(PRIMITIVES.map((p) => [p.id, p]));

export function primitive(id: string): MotionPrimitive | undefined {
  return BY_ID.get(id);
}

export function primitivesIn(category: PrimitiveCategory): MotionPrimitive[] {
  return PRIMITIVES.filter((p) => p.category === category);
}

/** The id itself when it suits this intensity, otherwise the strongest allowed one of its category. */
export function allowedAt(id: string, level: number): string {
  const p = BY_ID.get(id);
  if (!p) return id;
  if (p.minLevel <= level) return id;
  const alt = PRIMITIVES.filter((x) => x.category === p.category && x.minLevel <= level).sort((a, b) => b.intensity - a.intensity)[0];
  return alt ? alt.id : id;
}
