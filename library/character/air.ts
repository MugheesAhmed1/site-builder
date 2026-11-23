// The air round the figure (docs/FILM-TEMPLATES.md): what a template fills the room with. Embers
// for a forge, snow for a mountain, bubbles for water, petals, fireflies, confetti, sparks. One
// small canvas behind the model, a few dozen soft sprites, and nothing at all while the story is
// off screen or the visitor asked for calm.
import { clamp } from "./scene-kit";

export const AIR_LOOKS = ["studio", "embers", "snow", "bubbles", "petals", "fireflies", "confetti", "sparks", "stars", "leaves", "none"] as const;
export type AirLook = (typeof AIR_LOOKS)[number];

export interface Air {
  readonly canvas: HTMLCanvasElement;
  /** Another look (or the same one with new colours). */
  set(look: string, accent: string, ink: string, dark: boolean): void;
  /** The track is near the screen: run, or rest. */
  active(on: boolean): void;
  resize(w: number, h: number): void;
  dispose(): void;
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  ph: number;
  a: number;
  life: number;
  c: number;
  rot: number;
  vr: number;
}

/** A small seeded random, so the same page always begins with the same air. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (h: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
};
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: [number, number, number], a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

/** A soft round sprite in a colour: a bright core fading to nothing. */
function sprite(doc: Document, c: [number, number, number], core = 0.35): HTMLCanvasElement {
  const n = 64;
  const cv = doc.createElement("canvas");
  cv.width = cv.height = n;
  const g = cv.getContext("2d");
  if (g) {
    const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    r.addColorStop(0, css(mix(c, [255, 255, 255], 0.55), 1));
    r.addColorStop(core, css(c, 0.8));
    r.addColorStop(1, css(c, 0));
    g.fillStyle = r;
    g.fillRect(0, 0, n, n);
  }
  return cv;
}

const COUNT: Record<string, number> = { embers: 46, snow: 70, bubbles: 28, petals: 22, fireflies: 24, confetti: 48, sparks: 40, stars: 90, leaves: 24 };

export function mountAir(doc: Document, host: HTMLElement): Air {
  const win = doc.defaultView || window;
  const canvas = doc.createElement("canvas");
  canvas.className = "xp-air";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  const g = canvas.getContext("2d");
  let W = 1;
  let H = 1;
  let dpr = 1;
  let look: AirLook = "none";
  let ps: P[] = [];
  let sprites: HTMLCanvasElement[] = [];
  let palette: [number, number, number][] = [];
  let ink: [number, number, number] = [255, 255, 255];
  let dark = true;
  let running = false;
  let raf = 0;
  let last = 0;
  let rand = rng(7);
  const calm = () => !!win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const seed = (p: P, first: boolean) => {
    const r = rand;
    p.c = Math.floor(r() * 4);
    p.ph = r() * 6.283;
    p.rot = r() * 6.283;
    p.vr = (r() - 0.5) * 3;
    p.a = 0.4 + r() * 0.6;
    p.life = 0;
    switch (look) {
      case "embers":
        p.x = r() * W;
        p.y = first ? r() * H : H + 10;
        p.vx = (r() - 0.5) * 14;
        p.vy = -(18 + r() * 52);
        p.s = 1.2 + r() * 3.2;
        break;
      case "snow":
        p.x = r() * W;
        p.y = first ? r() * H : -10;
        p.vx = (r() - 0.5) * 12;
        p.vy = 18 + r() * 46;
        p.s = 1 + r() * 3.4;
        break;
      case "bubbles":
        p.x = r() * W;
        p.y = first ? r() * H : H + 30;
        p.vx = (r() - 0.5) * 8;
        p.vy = -(14 + r() * 36);
        p.s = 4 + r() * 18;
        break;
      case "stars":
        p.x = r() * W;
        p.y = r() * H;
        p.vx = -(1.5 + r() * 6);
        p.vy = 0;
        p.s = 0.5 + r() * r() * 2.2;
        break;
      case "leaves":
      case "petals":
        p.x = (r() * 1.05 - 0.1) * W;
        p.y = first ? r() * H : -20;
        p.vx = 6 + r() * 22;
        p.vy = 20 + r() * 38;
        p.s = 5 + r() * 7;
        break;
      case "fireflies":
        p.x = r() * W;
        p.y = H * (0.25 + r() * 0.7);
        p.vx = 0;
        p.vy = 0;
        p.s = 2.5 + r() * 4;
        break;
      case "confetti":
        p.x = r() * W;
        p.y = first ? r() * H : -14;
        p.vx = (r() - 0.5) * 30;
        p.vy = 44 + r() * 80;
        p.s = 4 + r() * 5;
        break;
      case "sparks":
        p.x = W * (0.2 + r() * 0.6);
        p.y = first ? H * (0.4 + r() * 0.6) : H + 6;
        p.vx = (r() - 0.5) * 110;
        p.vy = -(120 + r() * 260);
        p.s = 0.8 + r() * 1.6;
        p.life = first ? r() : 0;
        break;
    }
  };

  const rebuild = () => {
    rand = rng(look.length * 131 + Math.round(W));
    const area = (W * H) / (1440 * 900);
    const n = look === "none" || look === "studio" ? 0 : Math.max(10, Math.round((COUNT[look] || 30) * clamp(area, 0.45, 1.3)));
    ps = Array.from({ length: n }, () => {
      const p = { x: 0, y: 0, vx: 0, vy: 0, s: 1, ph: 0, a: 1, life: 0, c: 0, rot: 0, vr: 0 };
      seed(p, true);
      return p;
    });
  };

  const draw = (dt: number, time: number) => {
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!ps.length) return;
    g.globalCompositeOperation = dark ? "lighter" : "source-over";
    for (const p of ps) {
      p.life += dt;
      switch (look) {
        case "embers": {
          p.x += (p.vx + Math.sin(time * 0.9 + p.ph) * 16) * dt;
          p.y += p.vy * dt;
          const fl = 0.55 + 0.45 * Math.sin(time * 7 + p.ph * 3);
          const fade = clamp(p.y / (H * 0.35)) * clamp((H - p.y) / 60);
          g.globalAlpha = p.a * fl * fade * (dark ? 0.9 : 0.75);
          const sz = p.s * 7 * (0.7 + 0.3 * fl);
          g.drawImage(sprites[p.c % sprites.length], p.x - sz / 2, p.y - sz / 2, sz, sz);
          if (p.y < -10) seed(p, false);
          break;
        }
        case "snow": {
          p.x += (p.vx + Math.sin(time * 0.6 + p.ph) * 14) * dt;
          p.y += p.vy * dt;
          g.globalAlpha = p.a * (dark ? 0.75 : 0.9);
          const sz = p.s * 4.2;
          g.drawImage(sprites[0], p.x - sz / 2, p.y - sz / 2, sz, sz);
          if (p.y > H + 10) seed(p, false);
          break;
        }
        case "bubbles": {
          p.x += (p.vx + Math.sin(time * 0.8 + p.ph) * 12) * dt;
          p.y += p.vy * dt;
          const fade = clamp(p.y / (H * 0.25)) * clamp((H + 30 - p.y) / 60);
          g.globalAlpha = p.a * 0.7 * fade;
          g.globalCompositeOperation = "source-over";
          g.lineWidth = 1.2;
          g.strokeStyle = css(mix(palette[0], ink, 0.5), 0.9);
          g.fillStyle = css(mix(palette[0], ink, 0.5), 0.08);
          g.beginPath();
          g.arc(p.x, p.y, p.s, 0, 6.283);
          g.fill();
          g.stroke();
          g.fillStyle = css(ink, 0.7);
          g.beginPath();
          g.arc(p.x - p.s * 0.35, p.y - p.s * 0.35, Math.max(1, p.s * 0.16), 0, 6.283);
          g.fill();
          if (p.y < -p.s * 2) seed(p, false);
          break;
        }
        case "stars": {
          p.x += p.vx * dt;
          if (p.x < -4) p.x = W + 4;
          const tw = 0.45 + 0.55 * Math.sin(time * (0.8 + p.a * 1.6) + p.ph * 4);
          g.globalAlpha = clamp(p.a * (0.25 + 0.75 * tw)) * (dark ? 0.95 : 0.6);
          g.fillStyle = css(ink);
          g.beginPath();
          g.arc(p.x, p.y, p.s, 0, 6.283);
          g.fill();
          if (p.s > 1.7) {
            g.globalAlpha *= 0.35;
            const sz = p.s * 9;
            g.drawImage(sprites[0], p.x - sz / 2, p.y - sz / 2, sz, sz);
          }
          break;
        }
        case "leaves":
        case "petals": {
          p.x += (p.vx + Math.sin(time * 0.7 + p.ph) * 22) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          g.globalAlpha = p.a * 0.85;
          g.globalCompositeOperation = "source-over";
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.rot);
          g.scale(1, 0.45 + 0.55 * Math.abs(Math.cos(time * 1.3 + p.ph)));
          g.fillStyle = css(palette[p.c % palette.length]);
          g.beginPath();
          if (look === "leaves") {
            g.moveTo(-p.s * 1.1, 0);
            g.quadraticCurveTo(0, -p.s * 0.8, p.s * 1.1, 0);
            g.quadraticCurveTo(0, p.s * 0.8, -p.s * 1.1, 0);
          } else g.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.283);
          g.fill();
          g.restore();
          if (p.y > H + 20 || p.x > W + 20) seed(p, false);
          break;
        }
        case "fireflies": {
          const t = time * 0.18 + p.ph * 3;
          const x = p.x + Math.sin(t * 1.3 + p.ph) * 70 + Math.sin(t * 0.37) * 40;
          const y = p.y + Math.cos(t * 1.1 + p.ph * 2) * 46;
          const glow = Math.max(0, Math.sin(time * 1.1 + p.ph * 5));
          g.globalAlpha = p.a * (0.12 + 0.88 * glow);
          const sz = p.s * 9;
          g.drawImage(sprites[p.c % sprites.length], x - sz / 2, y - sz / 2, sz, sz);
          break;
        }
        case "confetti": {
          p.x += (p.vx + Math.sin(time * 0.9 + p.ph) * 18) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          g.globalAlpha = p.a;
          g.globalCompositeOperation = "source-over";
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.rot);
          g.scale(1, Math.cos(time * 3 + p.ph));
          g.fillStyle = css(palette[p.c % palette.length]);
          g.fillRect(-p.s / 2, -p.s * 0.8, p.s, p.s * 1.6);
          g.restore();
          if (p.y > H + 14) seed(p, false);
          break;
        }
        case "sparks": {
          p.vy += 230 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          const k = clamp(1 - p.life / 1.7);
          g.globalAlpha = p.a * k;
          g.strokeStyle = css(mix(palette[p.c % palette.length], [255, 240, 200], 1 - k), 1);
          g.lineWidth = p.s;
          g.lineCap = "round";
          g.beginPath();
          g.moveTo(p.x, p.y);
          g.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
          g.stroke();
          if (p.life > 1.7 || p.y > H + 10) seed(p, false);
          break;
        }
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  };

  const loop = (now: number) => {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    draw(dt, now / 1000);
    raf = win.requestAnimationFrame(loop);
  };

  const start = () => {
    if (running || !ps.length) return;
    if (calm()) {
      draw(0.016, 3);
      return;
    }
    running = true;
    last = 0;
    raf = win.requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
  };

  let wanted = false;
  return {
    canvas,
    set(l, accent, inkHex, isDark) {
      const nextLook = (AIR_LOOKS as readonly string[]).includes(l) ? (l as AirLook) : "none";
      const a = hex(accent);
      ink = hex(inkHex);
      dark = isDark;
      const warm: [number, number, number] = [255, 138, 61];
      switch (nextLook) {
        case "embers":
          palette = [mix(a, warm, 0.6), warm, [255, 190, 90], mix(a, [255, 220, 150], 0.4)];
          break;
        case "snow":
          palette = [dark ? [235, 242, 255] : [255, 255, 255]];
          break;
        case "bubbles":
          palette = [mix(a, [160, 220, 255], 0.5)];
          break;
        case "petals":
          palette = [mix(a, [255, 194, 209], 0.55), [255, 214, 224], mix(a, [255, 255, 255], 0.3), [255, 176, 196]];
          break;
        case "fireflies":
          palette = [mix(a, [214, 255, 122], 0.65), [214, 255, 122], [255, 240, 150], mix(a, [150, 255, 200], 0.4)];
          break;
        case "confetti":
          palette = [a, [255, 209, 102], [239, 71, 111], [6, 214, 160], [255, 255, 255], [76, 201, 240]];
          break;
        case "sparks":
          palette = [[255, 160, 60], [255, 200, 100], [255, 120, 40], [255, 236, 190]];
          break;
        case "stars":
          palette = [[255, 255, 255]];
          break;
        case "leaves":
          palette = [mix(a, [120, 200, 120], 0.5), [96, 170, 96], mix(a, [255, 255, 255], 0.2), [64, 128, 80]];
          break;
        default:
          palette = [a];
      }
      sprites = palette.map((c) => sprite(doc, c));
      const changed = nextLook !== look;
      look = nextLook;
      if (changed || !ps.length) rebuild();
      canvas.style.display = ps.length ? "block" : "none";
      if (wanted) {
        stop();
        start();
      }
    },
    active(on) {
      wanted = on;
      if (on) start();
      else stop();
    },
    resize(w, h) {
      const nw = Math.max(1, Math.round(w));
      const nh = Math.max(1, Math.round(h));
      dpr = Math.min(1.5, win.devicePixelRatio || 1);
      if (nw === W && nh === H && canvas.width === Math.round(nw * dpr)) return;
      W = nw;
      H = nh;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      rebuild();
      if (!running && ps.length && calm()) draw(0.016, 3);
    },
    dispose() {
      stop();
      canvas.remove();
    },
  };
}
