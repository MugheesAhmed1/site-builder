// Animation styles for the site, played by Motion (Framer Motion, motion.dev).
// Each style is plain data: how sections enter as you scroll (the "reveal"), how they
// move (the "tempo") and how the big headline arrives (the "headline" effect).
// The first 144 (M-001 to M-144) are the original set: 18 reveals x 4 tempos x 2 headline
// effects. The rest add 8 reveals, 3 tempos and every headline effect: 728 styles in all,
// plus "Still". Each reveal has a "feel" (calm, bold, playful, tech) so the builder can
// suggest styles that fit a restaurant, a dentist, a CEO or a designer.
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

// Added later; kept separate so the original 144 keep their numbers.
const MORE_REVEALS = [
  { id: "pop", name: "Pop", from: { opacity: 0, scale: 0.88 } },
  { id: "drift", name: "Drift", from: { opacity: 0, x: -24, y: 16 } },
  { id: "glide", name: "Glide", from: { opacity: 0, x: 24, filter: "blur(6px)" } },
  { id: "corner", name: "Corner wipe", from: { clipPath: "inset(0% 100% 100% 0%)" } },
  { id: "split", name: "Split open", from: { clipPath: "inset(50% 0% 50% 0%)" } },
  { id: "turn", name: "Turn", from: { opacity: 0, rotate: -4, scale: 0.96 } },
  { id: "stretch", name: "Stretch", from: { opacity: 0, scale: 0.97, y: 26, skewY: -2 } },
  { id: "unfold", name: "Unfold", from: { opacity: 0, rotateX: -24, y: -8, transformPerspective: 900 } },
];

const FEEL = {
  fade: "calm", rise: "calm", settle: "calm", blur: "calm", blurrise: "calm",
  lift: "bold", zoom: "bold", wipeup: "bold", wipedown: "bold", curtain: "bold", skew: "bold", split: "bold", corner: "bold",
  tilt: "playful", flip: "playful", swing: "playful", pop: "playful", turn: "playful", stretch: "playful", unfold: "playful",
  drop: "tech", left: "tech", right: "tech", wiperight: "tech", drift: "tech", glide: "tech",
};
export const FEELS = [
  { id: "calm", name: "Calm" },
  { id: "bold", name: "Bold" },
  { id: "playful", name: "Playful" },
  { id: "tech", name: "Precise" },
];

// The resting value each animated property returns to.
export const REST = { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, skewY: 0, rotateX: 0, rotateY: 0, filter: "blur(0px)", clipPath: "inset(0% 0% 0% 0%)" };

const TEMPOS = [
  { id: "quick", name: "Quick", transition: { duration: 0.42, ease: [0.23, 1, 0.32, 1] }, stagger: 0.045 },
  { id: "smooth", name: "Smooth", transition: { duration: 0.68, ease: [0.16, 1, 0.3, 1] }, stagger: 0.075 },
  { id: "cinematic", name: "Cinematic", transition: { duration: 0.98, ease: [0.19, 1, 0.22, 1] }, stagger: 0.11 },
  { id: "spring", name: "Spring", transition: { type: "spring", visualDuration: 0.6, bounce: 0.2 }, stagger: 0.06 },
];
const MORE_TEMPOS = [
  { id: "snappy", name: "Snappy", transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] }, stagger: 0.035 },
  { id: "gentle", name: "Gentle", transition: { duration: 1.25, ease: [0.22, 1, 0.36, 1] }, stagger: 0.14 },
  { id: "bouncy", name: "Bouncy", transition: { type: "spring", visualDuration: 0.55, bounce: 0.32 }, stagger: 0.07 },
];
const ALL_HEADLINES = [...HEADLINES_FLAT()];
function HEADLINES_FLAT() {
  return [
    { id: "words", name: "word by word" },
    { id: "mask", name: "lines from a mask" },
    { id: "letters", name: "letter by letter" },
    { id: "block", name: "all at once" },
  ];
}

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
          feel: FEEL[rv.id],
          from: rv.from,
          transition: tp.transition,
          stagger: tp.stagger,
        });
        n++;
      });
    });
  });
  // Every other combination of all reveals, tempos and headline effects.
  const reveals = [...REVEALS, ...MORE_REVEALS];
  const tempos = [...TEMPOS, ...MORE_TEMPOS];
  const done = new Set(out.map((m) => m.reveal + "|" + m.tempo + "|" + m.headline));
  tempos.forEach((tp, ti) => {
    reveals.forEach((rv, ri) => {
      ALL_HEADLINES.forEach((hl, hi) => {
        const key = rv.id + "|" + tp.id + "|" + hl.id;
        if (done.has(key)) return;
        done.add(key);
        out.push({
          id: "M-" + String(n).padStart(3, "0"),
          name: `${tp.name} ${rv.name.toLowerCase()}, ${hl.name}`,
          reveal: rv.id,
          tempo: tp.id,
          headline: hl.id,
          hover: HOVERS[(ri + ti + hi) % HOVERS.length],
          feel: FEEL[rv.id],
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

export const REVEAL_NAMES = [...REVEALS, ...MORE_REVEALS].map((r) => ({ id: r.id, name: r.name }));
export const TEMPO_NAMES = [...TEMPOS, ...MORE_TEMPOS].map((t) => ({ id: t.id, name: t.name }));
