// Foliage for the walking scenes, painted once into small canvases (no picture files) and
// slid past the camera in depth layers by stage.js: far ones slow and misty, near ones
// fast, big and dark, like walking through a rainforest.

const TAU = Math.PI * 2;

function leafShape(g, w, h, kind, base, vein) {
  g.save();
  g.translate(w / 2, h);
  if (kind === "monstera") {
    // A heart-shaped leaf with deep slits and holes.
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-w * 0.55, -h * 0.25, -w * 0.5, -h * 0.85, 0, -h * 0.98);
    g.bezierCurveTo(w * 0.5, -h * 0.85, w * 0.55, -h * 0.25, 0, 0);
    g.fillStyle = base;
    g.fill();
    g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 7; i++) {
      const y = -h * (0.18 + i * 0.11);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * w * 0.06, y);
        g.quadraticCurveTo(s * w * 0.3, y - h * 0.02, s * w * 0.6, y + h * 0.04);
        g.lineWidth = w * 0.03;
        g.stroke();
        g.beginPath();
        g.ellipse(s * w * 0.14, y - h * 0.05, w * 0.025, h * 0.018, 0, 0, TAU);
        g.fill();
      }
    }
    g.globalCompositeOperation = "source-over";
  } else if (kind === "fern" || kind === "palm") {
    // A frond: a curved rib with many narrow leaflets.
    const n = kind === "fern" ? 22 : 14;
    g.strokeStyle = vein;
    g.lineWidth = w * 0.012;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(w * 0.15, -h * 0.6, -w * 0.05, -h);
    g.stroke();
    g.fillStyle = base;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = w * 0.15 * 2 * t * (1 - t) - w * 0.05 * t * t, y = -h * t;
      const len = w * 0.48 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (kind === "palm" ? 1 : 0.9);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.save();
        g.translate(x, y);
        g.rotate(s * (kind === "palm" ? 1.0 : 1.2) - 0.35 * t);
        g.ellipse(0, -len / 2, len * (kind === "palm" ? 0.07 : 0.12), len / 2, 0, 0, TAU);
        g.restore();
        g.fill();
      }
    }
  } else if (kind === "vine") {
    // Hanging vines with small leaves, from the top.
    g.translate(0, -h);
    for (let k = 0; k < 4; k++) {
      const x0 = (k - 1.5) * w * 0.22;
      const len = h * (0.55 + 0.4 * ((k * 37) % 10) / 10);
      g.strokeStyle = vein;
      g.lineWidth = w * 0.012;
      g.beginPath();
      g.moveTo(x0, 0);
      for (let y = 0; y <= len; y += h * 0.02) g.lineTo(x0 + Math.sin(y / h * 7 + k) * w * 0.035, y);
      g.stroke();
      g.fillStyle = base;
      for (let y = h * 0.05; y < len; y += h * 0.055) {
        const x = x0 + Math.sin(y / h * 7 + k) * w * 0.035;
        for (const s of [-1, 1]) {
          g.save();
          g.translate(x, y);
          g.rotate(s * 0.9 + 0.2);
          g.beginPath();
          g.ellipse(0, w * 0.035, w * 0.022, w * 0.045, 0, 0, TAU);
          g.fill();
          g.restore();
        }
      }
    }
  } else {
    // A banana leaf: long, torn into strips.
    g.rotate(-0.25);
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-w * 0.35, -h * 0.35, -w * 0.25, -h * 0.85, w * 0.05, -h);
    g.bezierCurveTo(w * 0.32, -h * 0.75, w * 0.3, -h * 0.3, 0, 0);
    g.fillStyle = base;
    g.fill();
    g.globalCompositeOperation = "destination-out";
    g.lineWidth = w * 0.012;
    for (let i = 0; i < 9; i++) {
      const y = -h * (0.15 + i * 0.085);
      g.beginPath();
      g.moveTo(w * 0.3, y - h * 0.05);
      g.lineTo(w * 0.04, y);
      g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = vein;
    g.lineWidth = w * 0.014;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(-w * 0.05, -h * 0.6, w * 0.05, -h);
    g.stroke();
  }
  g.restore();
}

/** A strip of several leaves side by side, as one texture. */
export function foliage(kinds, { w = 1024, h = 512, colors = ["#1f5a32", "#2f7d43", "#3f9a52"], vein = "#9fd38a", seed = 1, blur = 0, gap = 0 } = {}) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d");
  if (blur) g.filter = `blur(${blur}px)`;
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const n = kinds.length;
  for (let i = 0; i < n; i++) {
    const lw = (w / n) * (1 - gap);
    g.save();
    g.translate((i * w) / n + (r() - 0.5) * lw * 0.2, 0);
    const grad = g.createLinearGradient(0, 0, lw, h);
    const c = colors[i % colors.length];
    grad.addColorStop(0, c);
    grad.addColorStop(1, colors[(i + 1) % colors.length]);
    leafShape(g, lw * (0.9 + r() * 0.3), h * (0.75 + r() * 0.25), kinds[i], grad, vein);
    g.restore();
  }
  return cv;
}

/**
 * Layers sliding past: each band has a depth z (negative is far), a height share and a
 * speed. `front` bands sit in front of the cast. Returns a layer for stage.js.
 */
export function walkLayer(canvas, bands) {
  return {
    canvas,
    quads(S) {
      const out = [];
      for (const b of bands) {
        const wz = (7 - b.z) / 7;
        const tileW = b.w * S.W * 2 * wz;
        const tileH = b.h * S.H * 2 * wz;
        const go = (S.t * b.speed * (1 + S.scroll * 2) + (b.offset || 0)) % tileW;
        const left = -S.W * wz * 1.2;
        const n = Math.ceil((S.W * 2.4 * wz) / tileW) + 2;
        for (let i = 0; i < n; i++) {
          const x = left + i * tileW - go - tileW;
          const y = b.top ? S.H * wz - tileH + (b.lift || 0) * S.H : -S.H * wz + (b.lift || 0) * S.H - S.scroll * S.H * b.scroll;
          out.push({ x: x + tileW / 2, y, w: tileW * 1.02, h: tileH, z: b.z, fog: b.fog, ink: b.ink, alpha: b.alpha, sway: b.sway ?? 0.03 });
        }
      }
      return out;
    },
  };
}
