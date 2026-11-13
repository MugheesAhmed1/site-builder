// The living scenes as data: which environment, which light, who is on stage and what
// they do. resolve() turns a scene id, a look and the user's options into what stage.js runs.
import { hexToRgb, mix3 } from "./gl.js";

const H = (h) => hexToRgb(h);

const WATER = {
  env: "deep",
  envColors: ["#7fd0e6", "#1b6d94", "#04182c", "#bfeeff"].map(H),
  light: { dir: [0.25, 0.9, 0.35], sun: H("#e9f6ff"), ambTop: H("#3d7f9d"), ambBot: H("#0a2a44"), rim: H("#7fd4f0"), fogTop: H("#2b86a8"), fogBot: H("#06233b"), fog: 0.085, caustic: 0.55 },
  dust: [
    { count: 260, drift: [0.004, -0.012, 0], size: 5, wobble: 0.012, col: H("#cfefff"), alpha: 0.45, box: [1.6, 1.6, 10] },
    { count: 36, drift: [0, 0.035, 0], size: 13, wobble: 0.02, col: H("#d9f4ff"), alpha: 0.5, ring: 1, box: [1.5, 1.5, 8], push: 0.08 },
  ],
  sparks: { col: H("#e6f8ff"), ring: 1, rise: 0.9 },
  camera: { px: 0.45, py: 0.25, sy: -0.6 },
};

export const LIVE = {
  whale: { ...WATER, actors: [{ model: "whale", act: "cruise", size: 0.52, spot: [0.66, 0.5], spotTall: [0.52, 0.74], sizeTall: 0.95 }] },
};

export function resolve(id, look = "real", opts = {}) {
  const base = LIVE[id];
  if (!base) return null;
  const sc = { ...base, light: { ...base.light }, style: "solid", speed: opts.speed ?? 1, amount: opts.amount ?? 1 };
  void mix3;
  return sc;
}
