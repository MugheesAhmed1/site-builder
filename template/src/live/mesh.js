// Mesh building for the living scenes. Every creature is modelled in code from smooth
// parametric surfaces (no model files): a body is a "loft" of cross-sections along the
// spine, fins and wings are thin plates. Each vertex carries a colour and rig data so the
// vertex shader can make the body swim, flap or pulse.
//
// Model space: nose at +x, up is +y, the creature's left side is +z. Vertex layout:
//   aPos(3) aNor(3) aCol(3) aRig(4: s along spine 0..1, w along the limb 0..1, part, random) aPiv(3)

export const LAYOUT = [["aPos", 3], ["aNor", 3], ["aCol", 3], ["aRig", 4], ["aPiv", 3]];
const STRIDE = 16;

/** Smooth curve through [x, y] control points (Catmull-Rom on y, x must increase). */
export function curve(pts) {
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    const n = pts.length;
    if (x >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0;
    while (i < n - 2 && x > pts[i + 1][0]) i++;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const t = (x - p1[0]) / (p2[0] - p1[0]);
    const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0])) * (p2[0] - p1[0]);
    const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0])) * (p2[0] - p1[0]);
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const hex = (h) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
// Repeatable noise for colour patterns.
export const hash = (x, y = 0, z = 0) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return v - Math.floor(v);
};
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}

export class Builder {
  constructor() {
    this.v = [];
    this.i = [];
    this.n = 0;
  }
  /**
   * A grid surface: fn(u, v) gives the position, col(u, v, p) the colour and rig(u, v, p) =
   * [w, part, pivot] the limb data. wrapV joins the last column to the first (closed tube).
   */
  surface(nu, nv, fn, { col, rig, wrapV = false, flip = false } = {}) {
    const base = this.n;
    const cols = wrapV ? nv : nv + 1;
    for (let a = 0; a <= nu; a++)
      for (let b = 0; b < cols; b++) {
        const u = a / nu, v = b / nv;
        const p = fn(u, v);
        const c = col ? col(u, v, p) : [0.6, 0.6, 0.6];
        const r = rig ? rig(u, v, p) : null;
        const piv = (r && r[2]) || [0, 0, 0];
        this.v.push(p[0], p[1], p[2], 0, 0, 0, c[0], c[1], c[2], 0, r ? r[0] : 0, r ? r[1] : 0, hash(a * 1.31 + base, b * 2.17), piv[0], piv[1], piv[2]);
        this.n++;
      }
    for (let a = 0; a < nu; a++)
      for (let b = 0; b < nv; b++) {
        const b2 = wrapV ? (b + 1) % nv : b + 1;
        const i0 = base + a * cols + b, i1 = base + a * cols + b2, i2 = base + (a + 1) * cols + b, i3 = base + (a + 1) * cols + b2;
        if (flip) this.i.push(i0, i1, i2, i1, i3, i2);
        else this.i.push(i0, i2, i1, i1, i2, i3);
      }
    return this;
  }
  /**
   * A body lofted along x. x(u) is the spine position, cy(u) its height, hw/ht/hb the half
   * width and the heights above and below the spine. exp < 1 makes a boxier cross-section.
   */
  loft({ nu = 56, nv = 28, x, cy = () => 0, cz = () => 0, hw, ht, hb = ht, exp = 1, col, rig }) {
    const sp = (c) => Math.sign(c) * Math.pow(Math.abs(c), exp);
    return this.surface(
      nu,
      nv,
      (u, v) => {
        const a = v * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        return [x(u), cy(u) + (s > 0 ? ht(u) : hb(u)) * sp(s), cz(u) + hw(u) * sp(c)];
      },
      { col, rig, wrapV: true, flip: true },
    );
  }
  /** A ball (eyes, heads, baskets). */
  ball(c, r, colr, { nu = 10, nv = 12, sx = 1, sy = 1, sz = 1, rig } = {}) {
    return this.surface(
      nu,
      nv,
      (u, v) => {
        const th = u * Math.PI, ph = v * Math.PI * 2;
        return [c[0] + Math.cos(th) * r * sx, c[1] + Math.sin(th) * Math.sin(ph) * r * sy, c[2] + Math.sin(th) * Math.cos(ph) * r * sz];
      },
      { col: typeof colr === "function" ? colr : () => colr, wrapV: true, rig, flip: true },
    );
  }
  /**
   * A thin plate (fin, wing, fluke, leaf) with a top and an underside. fn(u, v) gives the
   * mid surface; u runs root to tip, v leading edge to trailing edge. bulge gives it body.
   */
  plate(nu, nv, fn, { top, under, rig, bulge = 0.012, up = [0, 1, 0] } = {}) {
    const thick = (u, v) => bulge * Math.sin(Math.PI * Math.min(1, v * 1.15)) * (1 - u * 0.7);
    const side = (sgn) => (u, v) => {
      const p = fn(u, v);
      const t = thick(u, v) * sgn;
      return [p[0] + up[0] * t, p[1] + up[1] * t, p[2] + up[2] * t];
    };
    // Which winding faces "up"? Check the surface normal in the middle of the plate.
    const a = fn(0.5, 0.5), b = fn(0.52, 0.5), c = fn(0.5, 0.52);
    const du = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dv = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const nrm = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
    const facing = nrm[0] * up[0] + nrm[1] * up[1] + nrm[2] * up[2] > 0;
    this.surface(nu, nv, side(1), { col: top, rig, flip: !facing });
    this.surface(nu, nv, side(-1), { col: under || top, rig, flip: facing });
    return this;
  }
  /** Mirror everything added by fn across the x-y plane (the other fin or wing). */
  mirror(fn) {
    const v0 = this.n, i0 = this.i.length;
    fn(this);
    const v1 = this.n, i1 = this.i.length;
    const vs = this.v.slice(v0 * STRIDE, v1 * STRIDE);
    for (let k = 0; k < vs.length; k += STRIDE) {
      vs[k + 2] = -vs[k + 2];
      vs[k + 15] = -vs[k + 15];
    }
    for (let k = 0; k < vs.length; k++) this.v.push(vs[k]);
    const off = v1 - v0;
    for (let k = i0; k < i1; k += 3) this.i.push(this.i[k] + off, this.i[k + 2] + off, this.i[k + 1] + off);
    this.n += off;
    return this;
  }
  /** Finish: spine coordinate from x, smooth normals, typed arrays and a set of surface points. */
  build({ head, tail, points = 9000 } = {}) {
    const v = this.v, idx = this.i, n = this.n;
    let xmin = Infinity, xmax = -Infinity;
    for (let k = 0; k < n; k++) {
      xmin = Math.min(xmin, v[k * STRIDE]);
      xmax = Math.max(xmax, v[k * STRIDE]);
    }
    const xh = head ?? xmax, xt = tail ?? xmin;
    for (let k = 0; k < n; k++) v[k * STRIDE + 9] = Math.max(0, Math.min(1, (xh - v[k * STRIDE]) / (xh - xt)));
    // Normals: sum of face normals, shared between vertices that sit at the same place.
    const acc = new Float32Array(n * 3);
    const areas = new Float32Array(idx.length / 3);
    let total = 0;
    for (let f = 0; f < idx.length; f += 3) {
      const a = idx[f] * STRIDE, b = idx[f + 1] * STRIDE, c = idx[f + 2] * STRIDE;
      const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2];
      const wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      for (const k of [idx[f], idx[f + 1], idx[f + 2]]) {
        acc[k * 3] += nx;
        acc[k * 3 + 1] += ny;
        acc[k * 3 + 2] += nz;
      }
      areas[f / 3] = Math.hypot(nx, ny, nz) / 2;
      total += areas[f / 3];
    }
    for (let k = 0; k < n; k++) {
      const l = Math.hypot(acc[k * 3], acc[k * 3 + 1], acc[k * 3 + 2]) || 1;
      v[k * STRIDE + 3] = acc[k * 3] / l;
      v[k * STRIDE + 4] = acc[k * 3 + 1] / l;
      v[k * STRIDE + 5] = acc[k * 3 + 2] / l;
    }
    const data = new Float32Array(v);
    // Points spread evenly over the surface, for the particle look.
    const pts = new Float32Array(points * STRIDE);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    let f = 0, run = areas[0] || 0;
    for (let k = 0; k < points; k++) {
      const target = ((k + rand()) / points) * total;
      while (run < target && f < areas.length - 1) run += areas[++f];
      let r1 = rand(), r2 = rand();
      if (r1 + r2 > 1) {
        r1 = 1 - r1;
        r2 = 1 - r2;
      }
      const a = idx[f * 3] * STRIDE, b = idx[f * 3 + 1] * STRIDE, c = idx[f * 3 + 2] * STRIDE;
      for (let q = 0; q < STRIDE; q++) pts[k * STRIDE + q] = data[a + q] + (data[b + q] - data[a + q]) * r1 + (data[c + q] - data[a + q]) * r2;
      pts[k * STRIDE + 12] = rand();
      // Limb data must not blend across parts.
      pts[k * STRIDE + 11] = data[a + 11];
      for (let q = 13; q < 16; q++) pts[k * STRIDE + q] = data[a + q];
    }
    return { data, index: n > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), points: pts, verts: n };
  }
}
