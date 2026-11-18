import { BITS, FLAVOURS, FONTS, PACK, SH, SW, mixHex } from './strideData';

/**
 * A pack sheet drawn from the content: one wrapper per flavour (in its colour, with the brand and
 * flavour name) at that flavour's box, and a cluster of ingredient pieces at each bit's box.
 * Used when no sheet picture is set or the picture fails to load, so packs are never blank.
 */
export function drawSheet(): Promise<string> {
  const c = document.createElement('canvas');
  c.width = SW;
  c.height = SH;
  const ctx = c.getContext('2d');
  if (!ctx) return Promise.resolve('');

  for (const f of FLAVOURS) drawWrapper(ctx, f.box, f.color, f.lines);
  BITS.forEach((box, i) => {
    const owner = FLAVOURS.find((f) => f.bit === i) || FLAVOURS[i % FLAVOURS.length];
    drawBits(ctx, box, owner ? owner.color : '#b79474', i);
  });
  // A blob address, not a data: one: browsers refuse data: addresses this large in CSS.
  return new Promise((resolve) => c.toBlob((b) => resolve(b ? URL.createObjectURL(b) : ''), 'image/png'));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWrapper(
  ctx: CanvasRenderingContext2D,
  [x, y, w, h]: [number, number, number, number],
  color: string,
  name: [string, string?]
) {
  const seal = h * 0.075;
  ctx.save();
  // Crimped seals top and bottom
  ctx.fillStyle = mixHex(color, '#ffffff', 0.25);
  for (const sy of [y, y + h - seal]) {
    ctx.fillRect(x, sy, w, seal);
    ctx.fillStyle = mixHex(color, '#000000', 0.12);
    for (let i = 0; i < w; i += w / 22) ctx.fillRect(x + i, sy, w / 60, seal);
    ctx.fillStyle = mixHex(color, '#ffffff', 0.25);
  }
  // Body with a soft sheen
  roundRect(ctx, x, y + seal * 0.9, w, h - seal * 1.8, w * 0.04);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, mixHex(color, '#000000', 0.12));
  g.addColorStop(0.3, mixHex(color, '#ffffff', 0.22));
  g.addColorStop(0.55, color);
  g.addColorStop(1, mixHex(color, '#000000', 0.18));
  ctx.fillStyle = g;
  ctx.fill();

  const ink = mixHex(color, '#1c1a1f', 0.8);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Brand
  const brand = PACK.brand || '';
  let size = w * 0.2;
  ctx.font = `400 ${size}px "${FONTS.display}", "Arial Black", sans-serif`;
  while (size > 12 && ctx.measureText(brand).width > w * 0.82) {
    size -= 2;
    ctx.font = `400 ${size}px "${FONTS.display}", "Arial Black", sans-serif`;
  }
  ctx.fillText(brand, x + w / 2, y + h * 0.2);
  // Flavour name, big and stacked
  const words = [name[0], name[1]].filter(Boolean) as string[];
  let fs = w * 0.17;
  ctx.font = `400 ${fs}px "${FONTS.display}", "Arial Black", sans-serif`;
  while (fs > 12 && words.some((l) => ctx.measureText(l).width > w * 0.84)) {
    fs -= 2;
    ctx.font = `400 ${fs}px "${FONTS.display}", "Arial Black", sans-serif`;
  }
  ctx.fillStyle = '#ffffff';
  words.forEach((l, i) => ctx.fillText(l, x + w / 2, y + h * 0.5 + (i - (words.length - 1) / 2) * fs * 1.05));
  // Weight and slogan
  ctx.fillStyle = ink;
  ctx.font = `500 ${w * 0.055}px "${FONTS.mono}", monospace`;
  if (PACK.weight) ctx.fillText(PACK.weight, x + w / 2, y + h * 0.74);
  if (PACK.slogan) {
    ctx.globalAlpha = 0.75;
    ctx.font = `400 ${w * 0.045}px "${FONTS.mono}", monospace`;
    ctx.fillText(PACK.slogan, x + w / 2, y + h * 0.8);
  }
  ctx.restore();
}

function drawBits(ctx: CanvasRenderingContext2D, [x, y, w, h]: [number, number, number, number], color: string, seed: number) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const tones = [mixHex(color, '#3b2414', 0.35), mixHex(color, '#ffffff', 0.15), mixHex(color, '#5a2a1a', 0.55), color];
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const r = Math.min(w, h) * (0.14 + rnd() * 0.12);
    const cx = x + r + rnd() * (w - 2 * r);
    const cy = y + r + rnd() * (h - 2 * r);
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const rr = r * (0.82 + rnd() * 0.25);
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr * 0.86;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    const t = tones[i % tones.length];
    g.addColorStop(0, mixHex(t, '#ffffff', 0.35));
    g.addColorStop(1, mixHex(t, '#000000', 0.25));
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}
