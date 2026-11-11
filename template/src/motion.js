// Animation styles for the site, played by Motion (Framer Motion, motion.dev).
// Each style is plain data: how sections enter as you scroll (the "reveal"), how they
// move (the "tempo": three eased curves and one soft spring) and how the big headline
// arrives (the "headline" effect). 18 reveals x 4 tempos x 2 headline effects = 144
// styles, plus "Still".
//
// Motion rules (Emil Kowalski, ui-ux-pro-max): animate transform, opacity, filter and
// clip-path only; ease-out curves, never ease-in; small offsets; springs stay soft
// (low bounce); reduced motion keeps fades and drops movement.

const REVEALS = [
  { id: "fade", name: "Fade", from: { opacity: 0 } },
  { id: "rise", name: "Rise", from: { opacity: 0, y: 18 } },
  { id: "lift", name: "Lift", from: { opacity: 0, y: 44 } },
  { id: "drop", name: "Drop", from: { opacity: 0, y: -18 } },
  { id: "left", name: "Slide left", from: { opacity: 0, x: 36 } },
  { id: "right", name: "Slide right", from: { opacity: 0, x: -36 } },
  { id: "zoom", name: "Zoom", from: { opacity: 0, scale: 0.94 } },
  { id: "settle", name: "Settle", from: { opacity: 0, scale: 1.06 } },
  { id: "blur", name: "Focus", from: { opacity: 0, filter: "blur(10px)" } },
  { id: "blurrise", name: "Focus rise", from: { opacity: 0, y: 16, filter: "blur(6px)" } },
  { id: "wipeup", name: "Wipe up", from: { clipPath: "inset(100% 0% 0% 0%)" } },
  { id: "wipedown", name: "Wipe down", from: { clipPath: "inset(0% 0% 100% 0%)" } },
  { id: "wiperight", name: "Wipe across", from: { clipPath: "inset(0% 100% 0% 0%)" } },
  { id: "curtain", name: "Curtain", from: { clipPath: "inset(0% 50% 0% 50%)" } },
  { id: "tilt", name: "Tilt", from: { opacity: 0, y: 20, rotate: 1.5 } },
  { id: "skew", name: "Skew", from: { opacity: 0, y: 16, skewY: 3 } },
  { id: "flip", name: "Flip", from: { opacity: 0, y: 12, rotateX: 18, transformPerspective: 900 } },
  { id: "swing", name: "Swing", from: { opacity: 0, x: -12, rotateY: -14, transformPerspective: 900 } },
];

// The resting value each animated property returns to.
export const REST = { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, skewY: 0, rotateX: 0, rotateY: 0, filter: "blur(0px)", clipPath: "inset(0% 0% 0% 0%)" };

const TEMPOS = [
  { id: "quick", name: "Quick", transition: { duration: 0.42, ease: [0.23, 1, 0.32, 1] }, stagger: 0.045 },
  { id: "smooth", name: "Smooth", transition: { duration: 0.68, ease: [0.16, 1, 0.3, 1] }, stagger: 0.075 },
  { id: "cinematic", name: "Cinematic", transition: { duration: 0.98, ease: [0.19, 1, 0.22, 1] }, stagger: 0.11 },
  { id: "spring", name: "Spring", transition: { type: "spring", visualDuration: 0.6, bounce: 0.2 }, stagger: 0.06 },
];

// Headline effects come in pairs so each reveal gets two distinct ones.
const HEADLINES = [
  [
    { id: "words", name: "word by word" },
    { id: "mask", name: "lines from a mask" },
  ],
  [
    { id: "letters", name: "letter by letter" },
    { id: "block", name: "all at once" },
  ],
];

const HOVERS = ["lift", "glow", "line"];

export const STILL = { id: "M-000", name: "Still", reveal: "none", tempo: "none", headline: "none", hover: "none", from: null, transition: null, stagger: 0 };

function build() {
  const out = [STILL];
  let n = 1;
  REVEALS.forEach((rv, ri) => {
    TEMPOS.forEach((tp, ti) => {
      HEADLINES[ri % 2].forEach((hl, hi) => {
        out.push({
          id: "M-" + String(n).padStart(3, "0"),
          name: `${tp.name} ${rv.name.toLowerCase()}, ${hl.name}`,
          reveal: rv.id,
          tempo: tp.id,
          headline: hl.id,
          hover: HOVERS[(ri + ti + hi) % HOVERS.length],
          from: rv.from,
          transition: tp.transition,
          stagger: tp.stagger,
        });
        n++;
      });
    });
  });
  return out;
}

export const MOTIONS = build();

export function motionById(id) {
  return MOTIONS.find((m) => m.id === id) || MOTIONS[2];
}

export const REVEAL_NAMES = REVEALS.map((r) => ({ id: r.id, name: r.name }));
export const TEMPO_NAMES = TEMPOS.map((t) => ({ id: t.id, name: t.name }));
