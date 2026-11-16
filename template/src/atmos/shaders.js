// Atmospheres: full-bleed living backgrounds, each one fragment shader (plus a point pass for
// the particle ones). Original GLSL written for this builder. They take the same uniforms:
//   uTime     seconds
//   uRes      drawing-buffer size in pixels
//   uPointer  smoothed pointer, -1..1 on both axes
//   uScroll   0 at the top of the opening, 1 once it has scrolled away
//   uAccent   the site's accent colour (used lightly, so every scene keeps its own mood)
//   uAmount   0..1 from the intensity dial: density and movement

export const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const HEAD = `
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec2 uPointer; uniform float uScroll; uniform vec3 uAccent; uniform float uAmount;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++){ v += a * noise(p); p = m * p; a *= 0.5; } return v; }
float fbm3(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 3; i++){ v += a * noise(p); p = m * p; a *= 0.5; } return v; }
float grain(){ return hash(gl_FragCoord.xy + fract(uTime * 7.13) * 91.7) - 0.5; }
vec2 P(){ return (gl_FragCoord.xy - 0.5 * uRes) / uRes.y; }
vec3 finish(vec3 c, float g, float vig){
  c += grain() * g;
  float d = length(vUv - 0.5);
  c *= 1.0 - vig * smoothstep(0.3, 0.9, d);
  return clamp(c, 0.0, 1.0);
}
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
`;

// Meadow: a night valley of flowers seen through a long lens. Bokeh discs at six depths,
// fireflies that pulse, the in-focus band in the middle distance.
const meadow = `${HEAD}
vec3 petal(float h){
  if (h < 0.22) return vec3(1.0, 0.72, 0.28);
  if (h < 0.42) return vec3(1.0, 0.42, 0.55);
  if (h < 0.6) return vec3(0.62, 0.48, 1.0);
  if (h < 0.78) return vec3(1.0, 0.5, 0.22);
  return vec3(0.95, 0.92, 0.78);
}
void main(){
  vec2 p = P();
  float zoom = 1.0 + uScroll * 0.6;
  p /= zoom;
  vec3 col = vec3(0.006, 0.009, 0.007);
  // The valley: two banks of foliage rising to the sides, a darker path down the middle.
  float bank = smoothstep(-0.05, 0.55, abs(p.x) * 0.75 - p.y * 0.9 - 0.12);
  float floorMask = smoothstep(0.35, -0.45, p.y) * 0.6 + bank * 0.7;
  col += vec3(0.018, 0.04, 0.022) * fbm(p * 5.0 + uTime * 0.02) * floorMask * 2.0;
  // The valley floor seen through a tilt-shift lens: blossoms on a ground plane, sharp in the
  // middle distance, soft near and far. Uniform scaling with distance keeps them round.
  float bankMask = clamp(smoothstep(-0.08, 0.45, abs(p.x) * 0.95 - p.y * 1.05 - 0.1) * smoothstep(0.32, 0.0, p.y) + smoothstep(-0.22, -0.6, p.y) * 0.85, 0.0, 1.0);
  float persp = clamp(0.3 - p.y, 0.05, 1.2);
  for (int k = 0; k < 3; k++){
    float fk = float(k);
    vec2 cq = vec2((p.x + uPointer.x * 0.03) / persp, 1.0 / persp - uTime * 0.04 - uScroll * 2.0) * (5.0 + fk * 2.5) + fk * 11.3;
    vec2 ci = floor(cq); vec2 cf = fract(cq) - 0.5;
    float ch = hash(ci + fk * 5.0);
    float rr = mix(0.18, 0.36, hash(ci + 8.1));
    float soft = 0.03 + 0.6 * pow(abs(persp - 0.32), 1.2);
    float bloom = smoothstep(rr, rr - soft, length(cf - (vec2(hash(ci + 1.7), hash(ci + 2.9)) - 0.5) * 0.4)) * step(0.48, ch);
    col += petal(hash(ci + 6.1 + fk)) * bloom * bankMask * (0.4 - fk * 0.08) * (0.45 + 0.55 * smoothstep(0.25, -0.35, p.y));
  }
  col += vec3(0.03, 0.07, 0.035) * bankMask * fbm(p / persp * 3.0);
  for (int L = 0; L < 6; L++){
    float fl = float(L);
    float scale = 2.6 + fl * 2.4;
    vec2 drift = vec2(uTime * 0.012 * (1.0 + fl * 0.25), -uTime * 0.008);
    vec2 q = p * scale + drift + uPointer * (0.24 * (6.0 - fl)) * vec2(1.0, 0.5) + fl * 7.31;
    vec2 id = floor(q); vec2 f = fract(q) - 0.5;
    float h = hash(id + fl * 17.0);
    vec2 off = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.55;
    float r = mix(0.1, 0.34, hash(id + 1.3)) * (1.0 - fl * 0.05);
    float focus = abs(fl - 3.0) / 3.0;
    float blur = 0.015 + focus * focus * 0.3 + (fl < 0.5 ? 0.12 : 0.0);
    float d = length(f - off);
    float disc = smoothstep(r, r - blur, d);
    disc *= fl < 0.5 ? 0.45 : 1.0;
    disc *= 0.75 + 0.25 * smoothstep(r - blur * 1.6, r - blur * 0.3, d);
    vec2 cellPos = (id + 0.5 - drift - fl * 7.31) / scale;
    float valley = smoothstep(-0.05, 0.5, abs(cellPos.x) * 0.9 - cellPos.y * 1.1 - 0.12) * smoothstep(0.42, 0.05, cellPos.y) + smoothstep(-0.15, -0.55, cellPos.y);
    float live = step(1.0 - (0.08 + 0.14 * uAmount) * clamp(valley, 0.0, 1.0) * (0.6 + fl * 0.08), h);
    float fire = step(0.93, hash(id + 9.9));
    float tw = fire > 0.5 ? 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.2 + h * 2.5) + h * 40.0), 3.0) : 0.85 + 0.15 * sin(uTime * 0.7 + h * 9.0);
    vec3 c = fire > 0.5 ? vec3(1.0, 0.86, 0.45) : petal(hash(id + 4.2));
    c = mix(c, uAccent, 0.12);
    float gain = (fire > 0.5 ? 1.4 : 0.85) / (1.0 + focus * 1.3);
    float halo = exp(-d * d / (r * r) * 2.5) * 0.35;
    col += c * (disc * 0.8 + halo) * tw * live * gain;
  }
  // Floating motes in the air above.
  vec2 m = p * 9.0 + vec2(0.0, uTime * 0.05);
  vec2 mi = floor(m); vec2 mf = fract(m) - 0.5;
  float mh = hash(mi);
  float mote = smoothstep(0.05, 0.0, length(mf - (vec2(hash(mi + 2.0), hash(mi + 5.0)) - 0.5) * 0.7)) * step(0.9, mh);
  col += vec3(1.0, 0.8, 0.45) * mote * (0.5 + 0.5 * sin(uTime * 2.0 + mh * 30.0)) * smoothstep(-0.2, 0.5, p.y);
  col = aces(col * 1.15);
  gl_FragColor = vec4(finish(col, 0.045, 0.75), 1.0);
}`;

// Noir: black and white studio. A spotlight on the back wall, beams of light raking across,
// two slabs of glass catching the light, and film grain.
const noir = `${HEAD}
float box(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float slab(vec2 p, vec2 c, vec2 s, float a, out float edge, out float inside){
  vec2 q = rot(a) * (p - c);
  float d = box(q, s);
  inside = smoothstep(0.004, -0.004, d);
  edge = smoothstep(0.006, 0.0, abs(d)) * (0.5 + 0.5 * sin(q.y * 5.0 + uTime * 0.6));
  return d;
}
void main(){
  vec2 p = P();
  vec2 par = uPointer * 0.03;
  vec3 col = vec3(0.025);
  // The pool of light on the wall.
  vec2 sc = vec2(-0.48, 0.32) + par * 0.5;
  float spot = smoothstep(0.62, 0.0, length((p - sc) * vec2(0.9, 1.0)));
  col += vec3(0.75) * pow(spot, 2.2);
  // Beams from the top left, slowly breathing.
  vec2 d = p - vec2(-1.1, 0.95);
  float ang = atan(d.y, d.x);
  float beams = fbm3(vec2(ang * 9.0, uTime * 0.08)) * smoothstep(1.9, 0.2, length(d));
  col += vec3(0.16) * pow(beams, 2.0) * 1.6;
  // Light streaks raking across the lower half.
  float sy = p.y + 0.12;
  float streak = fbm(vec2(p.x * 0.35 - uTime * 0.18 * (0.4 + uAmount), p.y * 16.0));
  streak = pow(streak, 5.0) * smoothstep(0.26, 0.0, abs(sy)) * smoothstep(1.2, 0.0, abs(p.x + 0.2)) * 5.0;
  col += vec3(streak);
  // The floor: a soft reflection of everything above.
  float fl = smoothstep(-0.2, -0.5, p.y);
  col += fl * vec3(0.06) * fbm(vec2(p.x * 3.0 - uTime * 0.1, p.y * 20.0));
  // Glass slabs.
  float e1, i1, e2, i2;
  slab(p, vec2(-0.82, -0.2) + par, vec2(0.17, 0.42), 0.18, e1, i1);
  slab(p, vec2(0.86, 0.02) - par, vec2(0.16, 0.6), -0.12, e2, i2);
  float refr = fbm(vec2(p.y * 6.0, p.x * 2.0 + uTime * 0.05));
  vec3 g1 = vec3(0.1) + vec3(0.3) * refr * smoothstep(-0.7, 0.3, p.y) + vec3(0.35) * spot;
  vec3 g2 = vec3(0.07) + vec3(0.28) * refr * smoothstep(-0.6, 0.6, p.y) + vec3(0.12) * smoothstep(0.3, -0.3, p.y);
  col = mix(col, col * 0.4 + g1, i1 * 0.85);
  col = mix(col, col * 0.4 + g2, i2 * 0.85);
  col += vec3(0.55) * (e1 + e2) * 0.5;
  col = vec3(dot(col, vec3(0.333)));
  col = aces(col * 1.2);
  gl_FragColor = vec4(finish(col, 0.09, 0.9), 1.0);
}`;

// Dust wave: a sheet woven from glowing dust that folds over itself, monochrome on black.
const dust = `${HEAD}
void main(){
  vec2 p = P();
  p.y -= 0.06 - uScroll * 0.25;
  float t = uTime * (0.18 + 0.22 * uAmount);
  float acc = 0.0;
  for (int i = 0; i < 40; i++){
    float fi = float(i) / 39.0;
    float y = 0.2 * sin(p.x * 1.5 + t * 1.6 + fi * 1.9 + uPointer.x * 0.4)
            + 0.11 * sin(p.x * 2.9 - t * 1.1 + fi * 3.3)
            + (fi - 0.5) * 0.62 * (0.55 + 0.45 * sin(p.x * 1.05 + t * 0.9 + uPointer.y * 0.5));
    float d = abs(p.y - y);
    acc += 0.0014 / (d + 0.0035) * (0.5 + 0.5 * sin(fi * 7.0 + p.x * 2.0 + t)) * (1.0 + 1.2 * smoothstep(0.85, 1.0, abs(fi * 2.0 - 1.0)));
  }
  float dustN = hash(floor(gl_FragCoord.xy * 0.9) + floor(uTime * 12.0));
  float speck = 0.55 + 0.7 * dustN * dustN;
  float body = acc * speck * 1.6;
  body = pow(body / (1.0 + body), 1.1);
  vec3 col = vec3(body) * mix(vec3(1.0), 0.6 + 0.4 * uAccent, 0.18);
  // Distant dust in the dark.
  float star = step(0.9975, hash(floor(gl_FragCoord.xy * 0.5))) * (0.4 + 0.6 * sin(uTime * 1.5 + hash(floor(gl_FragCoord.xy)) * 40.0));
  col += vec3(star) * 0.6;
  col += vec3(0.02);
  gl_FragColor = vec4(finish(col, 0.08, 0.85), 1.0);
}`;

// Liquid chrome: an iridescent ribbon turning slowly in the dark, thin-film colours.
const chrome = `${HEAD}
vec3 film(float x){
  vec3 a = vec3(0.62, 0.48, 0.78), b = vec3(0.38, 0.3, 0.3), c = vec3(1.0, 1.0, 1.0), d = vec3(0.02, 0.12, 0.08);
  return a + b * cos(6.28318 * (c * x + d));
}
vec4 ribbon(vec2 p, float seed, float w0, float t){
  float c = 0.17 * sin(p.x * 1.25 + t * 0.6 + seed) + 0.1 * sin(p.x * 2.2 - t * 0.45 + seed * 2.0) - p.x * 0.18;
  float w = w0 * (0.72 + 0.38 * sin(p.x * 0.9 + t * 0.5 + seed * 3.0));
  float v = (p.y - c) / w;
  float inside = smoothstep(1.0, 0.94, abs(v));
  float twist = p.x * 1.7 + t * 0.8 + seed;
  float th = asin(clamp(v, -1.0, 1.0)) + 0.9 * sin(twist);
  float n = cos(th);
  vec3 base = film(th * 0.35 + p.x * 0.12 + t * 0.05);
  base = mix(base, base * (0.7 + 0.6 * uAccent), 0.25);
  float spec = pow(max(0.0, cos(th * 2.0 - 1.1)), 24.0) * 1.4 + pow(max(0.0, cos(th * 3.0 + 0.6)), 50.0) * 0.8;
  float shade = 0.18 + 0.82 * pow(abs(n), 0.8);
  vec3 col = base * shade + vec3(1.0, 0.95, 0.9) * spec;
  col *= 0.55 + 0.45 * smoothstep(1.0, 0.6, abs(v));
  return vec4(col, inside);
}
void main(){
  vec2 p = P();
  p += uPointer * 0.03;
  p.y += uScroll * 0.2;
  float t = uTime * (0.2 + 0.3 * uAmount);
  vec3 col = vec3(0.02, 0.016, 0.03);
  col += vec3(0.28, 0.12, 0.42) * 0.25 * smoothstep(0.9, 0.0, length(p * vec2(0.6, 1.2)));
  vec4 back = ribbon(p * 1.3 + vec2(0.3, 0.25), 2.4, 0.12, t * 0.8);
  col = mix(col, back.rgb * 0.35, back.a);
  vec4 r = ribbon(p, 0.0, 0.26, t);
  col = mix(col, r.rgb, r.a);
  col = aces(col * 1.1);
  gl_FragColor = vec4(finish(col, 0.035, 0.7), 1.0);
}`;

// Sky isles: bright clouds and mossy islands floating at several depths.
const isles = `${HEAD}
float island(vec2 p, vec2 c, float s, float seed, out float top){
  vec2 q = (p - c) / s;
  float w = 0.62 + 0.1 * sin(seed);
  float xn = q.x / w;
  // A domed, tufted top and a rounded, craggy underside that tapers to a point.
  float tufts = fbm3(vec2(q.x * 9.0 + seed, seed)) * 0.16 + fbm3(vec2(q.x * 26.0, seed * 2.0)) * 0.06;
  float upper = 0.1 + tufts + 0.12 * sqrt(max(0.0, 1.0 - xn * xn));
  float taper = pow(max(0.0, 1.0 - abs(xn)), 0.65);
  float lower = 0.02 - 0.85 * taper + fbm3(vec2(q.x * 7.0, q.y * 3.0 + seed * 3.0)) * 0.22 - 0.1 * taper * sin(q.x * 11.0 + seed);
  float inside = smoothstep(1.0, 0.985, abs(xn)) * smoothstep(lower - 0.01, lower + 0.01, q.y) * smoothstep(upper + 0.01, upper - 0.01, q.y);
  top = smoothstep(upper - 0.16, upper - 0.02, q.y);
  return inside;
}
void main(){
  vec2 p = P();
  float t = uTime * (0.6 + 0.6 * uAmount);
  vec3 col = mix(vec3(0.93, 0.95, 0.97), vec3(0.68, 0.76, 0.86), smoothstep(-0.5, 0.6, p.y));
  // Clouds, three layers.
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    vec2 q = p * (1.2 + fi * 0.7) + vec2(t * 0.012 * (fi + 1.0), fi * 3.0) + uPointer * 0.03 * (fi + 1.0);
    float cl = smoothstep(0.42, 0.8, fbm(q * 2.0));
    col = mix(col, vec3(1.0) - 0.06 * fbm(q * 6.0), cl * 0.75);
  }
  // Islands, far to near.
  for (int i = 0; i < 6; i++){
    float fi = float(i);
    float depth = fi / 5.0;
    float s = mix(0.08, 0.36, depth);
    vec2 c = vec2(mix(-0.9, 0.9, hash(vec2(fi, 2.0))), mix(-0.15, 0.32, hash(vec2(fi, 5.0))));
    if (i == 5) c = vec2(0.0, -0.32);
    if (i == 4) c = vec2(-0.78, -0.25);
    c.y += 0.02 * sin(uTime * 0.5 + fi * 1.7) - uScroll * 0.25 * (1.0 + depth);
    c += uPointer * 0.05 * (depth + 0.2);
    float top;
    float m = island(p, c, s, fi * 4.1, top);
    vec2 q = (p - c) / s;
    vec3 rock = mix(vec3(0.33, 0.31, 0.27), vec3(0.58, 0.55, 0.48), fbm(q * 7.0 + fi)) * (0.75 + 0.25 * q.y);
    vec3 moss = mix(vec3(0.2, 0.36, 0.12), vec3(0.52, 0.7, 0.28), fbm(q * 11.0 + fi * 2.0));
    vec3 ic = mix(rock, moss, clamp(top + smoothstep(0.4, 0.7, fbm(q * 6.0)) * 0.6 * step(-0.3, q.y), 0.0, 1.0));
    ic = mix(ic, mix(ic, uAccent, 0.15), top * 0.3);
    ic = mix(vec3(0.86, 0.89, 0.93), ic, 0.35 + 0.65 * depth);
    col = mix(col, ic, m);
  }
  // A veil of near cloud drifting in front.
  float veil = smoothstep(0.5, 0.85, fbm(p * 1.4 + vec2(t * 0.03, 0.0)));
  col = mix(col, vec3(1.0), veil * 0.5 * smoothstep(0.1, -0.5, p.y));
  gl_FragColor = vec4(finish(col, 0.025, 0.25), 1.0);
}`;

// Nocturne: a night forest in blue and violet, trunks at three depths, mist and glowing flowers.
const nocturne = `${HEAD}
void main(){
  vec2 p = P();
  float t = uTime * (0.4 + 0.6 * uAmount);
  vec3 col = mix(vec3(0.05, 0.06, 0.16), vec3(0.2, 0.22, 0.48), smoothstep(-0.6, 0.7, p.y));
  col += vec3(0.4, 0.42, 0.75) * 0.35 * smoothstep(0.9, 0.0, length(p - vec2(0.0, 0.45)));
  // Trunks at three depths, nearest last.
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    float s = 5.0 - fi * 1.6;
    float x = p.x * s + uPointer.x * (0.2 + fi * 0.25) + fi * 13.0;
    float id = floor(x);
    float f = fract(x) - 0.5;
    float w = mix(0.06, 0.16, hash(vec2(id, fi)));
    float present = step(0.45, hash(vec2(id, fi + 4.0)));
    float bend = 0.08 * sin(p.y * 2.0 + id);
    float trunk = smoothstep(w + 0.03 + fi * 0.04, w, abs(f + bend)) * present;
    vec3 tc = mix(col, vec3(0.02, 0.03, 0.07), 0.55 + fi * 0.2);
    col = mix(col, tc, trunk);
  }
  // Mist bands.
  float mist = fbm(vec2(p.x * 1.5 + t * 0.03, p.y * 3.0));
  col += vec3(0.35, 0.38, 0.7) * smoothstep(0.45, 0.8, mist) * 0.25 * smoothstep(0.4, -0.3, p.y);
  // Glowing flowers on the forest floor.
  vec2 q = p * vec2(14.0, 22.0) + vec2(0.0, 0.0);
  vec2 id = floor(q); vec2 f = fract(q) - 0.5;
  float h = hash(id);
  float fl = smoothstep(0.22, 0.0, length(f - (vec2(hash(id + 1.0), hash(id + 2.0)) - 0.5) * 0.6)) * step(0.55, h) * smoothstep(-0.12, -0.45, p.y);
  vec3 fc = mix(vec3(0.45, 0.5, 1.0), vec3(0.75, 0.5, 1.0), hash(id + 3.0));
  col += fc * fl * (0.6 + 0.4 * sin(uTime + h * 20.0));
  col = mix(col, col + uAccent * 0.08, 0.5);
  gl_FragColor = vec4(finish(col, 0.04, 0.8), 1.0);
}`;

// Horizon: a vast glowing planet rising behind the page, warm grain and low clouds.
const horizon = `${HEAD}
void main(){
  vec2 p = P();
  vec3 col = vec3(0.07, 0.05, 0.05);
  vec2 c = vec2(0.0 + uPointer.x * 0.02, -1.42 + uScroll * 0.35);
  float R = 1.32;
  float d = length(p - c) - R;
  vec3 hot = mix(vec3(1.0, 0.42, 0.34), uAccent, 0.15);
  float surf = fbm(vec2(atan(p.y - c.y, p.x - c.x) * 6.0, length(p - c) * 8.0 - uTime * 0.03));
  vec3 disc = mix(hot * 0.95, vec3(1.0, 0.62, 0.5), smoothstep(-0.25, 0.0, d)) * (0.85 + 0.25 * surf);
  disc = mix(disc * 0.55, disc, smoothstep(-0.9, -0.1, d));
  col = mix(col, disc, smoothstep(0.004, -0.004, d));
  col += hot * 0.55 * exp(-max(d, 0.0) * 7.0) * step(0.0, d);
  col += hot * 0.18 * exp(-max(d, 0.0) * 1.6) * step(0.0, d);
  // Low clouds at the foot.
  float t = uTime * (0.015 + 0.02 * uAmount);
  float cl = smoothstep(0.5, 0.85, fbm(vec2(p.x * 1.6 + t, p.y * 3.0 - t)));
  col = mix(col, vec3(0.95, 0.72, 0.6), cl * smoothstep(-0.05, -0.55, p.y) * 0.8);
  col = aces(col * 1.05);
  gl_FragColor = vec4(finish(col, 0.12, 0.6), 1.0);
}`;

// Summit: a sepia mountain range, ridges layered into haze, clouds drifting between them.
const summit = `${HEAD}
float ridge(float x, float seed){
  float h = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 5; i++){ float n = noise(vec2(x * f + seed, seed)); h += a * (1.0 - abs(n * 2.0 - 1.0)); f *= 2.1; a *= 0.48; }
  return h;
}
float ridge3(float x, float seed){
  float h = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 3; i++){ float n = noise(vec2(x * f + seed, seed)); h += a * (1.0 - abs(n * 2.0 - 1.0)); f *= 2.1; a *= 0.48; }
  return h;
}
void main(){
  vec2 p = P();
  float t = uTime * (0.6 + 0.8 * uAmount);
  p.y += uScroll * 0.18;
  vec3 sky = mix(vec3(0.74, 0.67, 0.58), vec3(0.42, 0.37, 0.33), smoothstep(-0.2, 0.7, p.y));
  float cl = fbm(p * vec2(1.6, 3.2) + vec2(t * 0.01, 0.0));
  sky = mix(sky, vec3(0.88, 0.82, 0.73), smoothstep(0.45, 0.85, cl) * 0.8);
  sky = mix(sky, vec3(0.3, 0.26, 0.23), smoothstep(0.55, 0.9, fbm(p * 3.0 + 4.0 + t * 0.008)) * 0.35);
  vec3 col = sky;
  for (int i = 0; i < 4; i++){
    float fi = float(i);
    float par = uPointer.x * 0.04 * (fi + 1.0);
    float x = p.x * (0.9 + fi * 0.35) + par + fi * 3.7;
    float base = -0.02 - fi * 0.19;
    float amp = 0.6 - fi * 0.1;
    float peak = i == 3 ? 0.3 * exp(-pow((p.x + 0.4) * 1.8, 2.0)) : (i == 2 ? 0.22 * exp(-pow((p.x - 0.55) * 2.0, 2.0)) : 0.0);
    float h = base + amp * ridge(x * 1.3, fi * 9.0) + peak;
    float e = 0.02;
    float hs = base + amp * ridge3(x * 1.3, fi * 9.0) + peak;
    float hsr = base + amp * ridge3((x + e) * 1.3, fi * 9.0) + peak;
    float slope = (hsr - hs) / e;
    float m = smoothstep(0.003, -0.003, p.y - h);
    float below = clamp((h - p.y) * 7.0, 0.0, 1.0);
    vec2 fq = vec2(x * 3.0 + p.y * 1.5, p.y * 4.0 - x * 0.8);
    float facets = 1.0 - abs(fbm3(fq + slope * 0.3) * 2.0 - 1.0);
    float lit = clamp(0.48 + clamp(slope, -1.5, 1.5) * 0.3 * (1.0 - below * 0.6) + (facets - 0.55) * 0.9 - below * 0.2, 0.0, 1.0);
    vec3 rock = mix(vec3(0.08, 0.06, 0.05), vec3(0.74, 0.6, 0.45), smoothstep(0.1, 0.9, lit));
    rock = mix(rock, vec3(0.85, 0.82, 0.78), smoothstep(h - 0.05, h - 0.005, p.y) * step(0.22, h) * 0.6);
    float haze = 0.78 - fi * 0.24;
    rock = mix(rock, sky * 0.95, haze);
    col = mix(col, rock, m);
    // Cloud between this ridge and the next.
    float c2 = smoothstep(0.55, 0.85, fbm(vec2(p.x * 2.0 + t * 0.02 * (fi + 1.0), p.y * 5.0 + fi * 2.0)));
    col = mix(col, vec3(0.86, 0.8, 0.72), c2 * 0.45 * smoothstep(base + 0.25, base - 0.05, p.y));
  }
  col = mix(col, col * vec3(1.02, 0.98, 0.92), 0.5);
  gl_FragColor = vec4(finish(col, 0.06, 0.7), 1.0);
}`;

// Studio: a soft grey cyclorama with a slow light sweep. The giant debossed word sits in HTML.
const studio = `${HEAD}
void main(){
  vec2 p = P();
  float floorY = -0.22 - uPointer.y * 0.02;
  float k = smoothstep(floorY + 0.12, floorY - 0.12, p.y);
  vec3 wall = mix(vec3(0.47, 0.5, 0.53), vec3(0.27, 0.29, 0.32), smoothstep(-0.1, 0.6, p.y));
  vec3 flo = mix(vec3(0.62, 0.64, 0.66), vec3(0.45, 0.47, 0.5), smoothstep(floorY, floorY - 0.5, p.y));
  vec3 col = mix(wall, flo, k);
  float sweep = sin(uTime * 0.12 * (0.5 + uAmount)) * 0.7 + uPointer.x * 0.15;
  col += vec3(0.16) * smoothstep(0.7, 0.0, length((p - vec2(sweep, 0.15)) * vec2(0.7, 1.3)));
  col += vec3(0.08) * smoothstep(0.03, 0.0, abs(p.y - floorY - 0.003 * sin(p.x * 3.0)));
  col *= 1.0 - 0.18 * smoothstep(0.2, 0.0, abs(p.y - floorY + 0.05)) * smoothstep(0.6, 0.0, abs(p.x));
  col = mix(col, col * (0.9 + 0.2 * uAccent), 0.12);
  gl_FragColor = vec4(finish(col, 0.03, 0.55), 1.0);
}`;

// Caustics: sunlight dancing on the floor of a pool, seen from above.
const caustics = `${HEAD}
float cell(vec2 p, float t){
  vec2 i = floor(p), f = fract(p); float m = 1.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y));
    vec2 o = 0.5 + 0.45 * sin(t + 6.2831 * vec2(hash(i + g), hash(i + g + 7.1)));
    m = min(m, length(g + o - f));
  }
  return m;
}
void main(){
  vec2 p = P() * 2.2 + uPointer * 0.08;
  float t = uTime * (0.35 + 0.5 * uAmount);
  vec2 w = p + 0.25 * vec2(fbm3(p * 1.3 + t * 0.2), fbm3(p * 1.3 - t * 0.2 + 4.0));
  float r1 = 1.0 - abs(2.0 * noise(w * 2.6 + vec2(t * 0.3, 0.0)) - 1.0);
  float r2 = 1.0 - abs(2.0 * noise(w * 4.1 - vec2(0.0, t * 0.4) + 3.0) - 1.0);
  float c = pow(r1 * r2, 7.0) * 1.5 + pow(r1, 18.0) * 0.6 + pow(r2, 22.0) * 0.4;
  vec3 deep = vec3(0.02, 0.18, 0.26), shallow = vec3(0.1, 0.52, 0.6);
  vec3 col = mix(deep, shallow, smoothstep(-0.8, 0.9, P().y + 0.3 * fbm3(p)));
  col += vec3(0.75, 0.95, 1.0) * c;
  col = mix(col, col * (0.85 + 0.3 * uAccent), 0.1);
  gl_FragColor = vec4(finish(aces(col * 1.05), 0.03, 0.65), 1.0);
}`;

// Rain glass: a window at night, drops running down over soft city lights.
const rainglass = `${HEAD}
void main(){
  vec2 uv = vUv; vec2 p = P();
  float t = uTime * (0.6 + 0.6 * uAmount);
  vec2 ofs = vec2(0.0);
  float wet = 0.0;
  for (int k = 0; k < 2; k++){
    float fk = float(k);
    vec2 g = vec2(uv.x * (14.0 + fk * 9.0) * uRes.x / uRes.y, uv.y * (5.0 + fk * 3.0) + t * (0.22 + fk * 0.1));
    vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    float h = hash(id + fk * 3.0);
    float y = fract(h * 7.0 - t * (0.15 + h * 0.2)) - 0.5;
    vec2 d = vec2(f.x - (h - 0.5) * 0.6, (f.y - y) * 0.5);
    float drop = smoothstep(0.12, 0.0, length(d)) * step(0.35, h);
    float trail = smoothstep(0.05, 0.0, abs(f.x - (h - 0.5) * 0.6)) * smoothstep(y, y + 0.5, f.y) * step(0.35, h) * 0.4;
    ofs += d * drop * 0.6;
    wet += drop + trail;
  }
  vec3 col = mix(vec3(0.02, 0.025, 0.05), vec3(0.07, 0.05, 0.09), uv.y);
  for (int k = 0; k < 2; k++){
    float fk = float(k);
    vec2 q = (uv + ofs * 0.08) * vec2(uRes.x / uRes.y, 1.0) * (4.5 + fk * 2.5) + uPointer * 0.2 + fk * 17.3;
    vec2 bi = floor(q); vec2 bf = fract(q) - 0.5;
    float bh = hash(bi + fk);
    vec3 light = mix(vec3(1.0, 0.62, 0.3), mix(vec3(0.4, 0.6, 1.0), vec3(1.0, 0.3, 0.45), step(0.7, bh)), step(0.45, bh));
    float br = mix(0.13, 0.26, hash(bi + 9.0));
    float bd = length(bf - (vec2(hash(bi + 1.0), hash(bi + 2.0)) - 0.5) * 0.3);
    float bok = exp(-bd * bd / (br * br) * 1.6) * smoothstep(0.5, 0.42, max(abs(bf.x), abs(bf.y))) * step(0.35, hash(bi + 5.0));
    col += light * bok * (0.42 - fk * 0.14) * (0.6 + 0.4 * smoothstep(0.6, -0.3, p.y)) * (0.8 + 0.2 * sin(uTime * 0.5 + bh * 30.0));
  }
  col += vec3(0.6, 0.7, 0.9) * clamp(wet, 0.0, 1.0) * 0.08;
  gl_FragColor = vec4(finish(aces(col * 1.2), 0.04, 0.7), 1.0);
}`;

// Topography: slowly shifting contour lines, like a survey map in light.
const topo = `${HEAD}
void main(){
  vec2 p = P() * 1.6 + uPointer * 0.05;
  float t = uTime * (0.03 + 0.05 * uAmount);
  float h = fbm(p * 1.2 + vec2(t, -t * 0.7)) + 0.25 * fbm(p * 3.0 - t);
  float bands = h * 22.0;
  float line = smoothstep(0.44, 0.485, abs(fract(bands) - 0.5));
  float major = smoothstep(0.47, 0.495, abs(fract(bands / 5.0) - 0.5));
  vec3 col = vec3(0.955, 0.95, 0.93);
  vec3 ink = mix(vec3(0.25, 0.27, 0.3), uAccent, 0.35);
  col = mix(col, ink, line * 0.28 + major * 0.35);
  gl_FragColor = vec4(finish(col, 0.02, 0.25), 1.0);
}`;

// Background pass for the two particle scenes: a deep, slightly lit void.
const voidBg = (tint) => `${HEAD}
void main(){
  vec2 p = P();
  vec3 col = vec3(0.012, 0.012, 0.02);
  col += ${tint} * 0.22 * smoothstep(1.1, 0.0, length(p - vec2(0.0, -0.75)));
  gl_FragColor = vec4(finish(col, 0.04, 0.6), 1.0);
}`;

// Points. Constellation: thousands of small triangle outlines forming a living form that
// breaks into fragments as the visitor scrolls.
export const CONSTELLATION_VERT = `
attribute vec3 aHome; attribute vec3 aAway; attribute float aSeed; attribute vec3 aColor;
uniform float uTime; uniform vec2 uRes; uniform vec2 uPointer; uniform float uScroll; uniform float uAmount;
varying vec3 vColor; varying float vSpin; varying float vAlpha;
void main(){
  float s = smoothstep(0.0, 1.0, uScroll * 1.3);
  vec3 p = mix(aHome, aAway, s);
  p += 0.025 * vec3(sin(uTime * 0.9 + aSeed * 30.0), cos(uTime * 0.7 + aSeed * 20.0), sin(uTime * 0.5 + aSeed * 11.0));
  float a = uTime * 0.12 + uPointer.x * 0.6;
  float c = cos(a), sn = sin(a);
  p = vec3(c * p.x + sn * p.z, p.y, -sn * p.x + c * p.z);
  float b = uPointer.y * 0.3;
  p = vec3(p.x, cos(b) * p.y - sin(b) * p.z, sin(b) * p.y + cos(b) * p.z);
  float z = p.z + 3.2;
  vec2 xy = p.xy / z * 2.6;
  xy.x *= uRes.y / uRes.x;
  gl_Position = vec4(xy, 0.0, 1.0);
  gl_PointSize = (9.0 + 14.0 * fract(aSeed * 7.0)) * uRes.y / 900.0 * (3.2 / z);
  vColor = aColor; vSpin = aSeed * 6.28 + uTime * (0.3 + aSeed);
  vAlpha = clamp(1.4 - z * 0.25, 0.25, 1.0);
}`;
export const CONSTELLATION_FRAG = `
precision highp float;
varying vec3 vColor; varying float vSpin; varying float vAlpha;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float c = cos(vSpin), s = sin(vSpin);
  q = mat2(c, -s, s, c) * q;
  // Distance to an equilateral triangle, then keep only its outline.
  const float k = 1.7320508;
  vec2 t = q * 2.4;
  t.x = abs(t.x) - 1.0 * 0.5;
  t.y = t.y + 0.5 / k;
  if (t.x + k * t.y > 0.0) t = vec2(t.x - k * t.y, -k * t.x - t.y) / 2.0;
  t.x -= clamp(t.x, -1.0, 0.0);
  float d = -length(t) * sign(t.y);
  float line = smoothstep(0.2, 0.02, abs(d + 0.06));
  if (line < 0.02) discard;
  gl_FragColor = vec4(vColor * line * vAlpha * 1.3, line * vAlpha);
}`;

// Glow garden: a field of glowing flowers the camera glides over.
export const GARDEN_VERT = `
attribute vec3 aPos; attribute float aSeed; attribute vec3 aColor;
uniform float uTime; uniform vec2 uRes; uniform vec2 uPointer; uniform float uScroll; uniform float uAmount;
varying vec3 vColor; varying float vSeed; varying float vFog; varying float vBlur;
void main(){
  float travel = uTime * (0.25 + 0.5 * uAmount) + uScroll * 8.0;
  vec3 p = aPos;
  p.z = mod(p.z - travel, 28.0) + 0.6;
  p.x += 0.08 * sin(uTime * 0.8 + aSeed * 20.0);
  p.y += 0.05 * sin(uTime * 1.1 + aSeed * 13.0);
  vec3 cam = vec3(uPointer.x * 0.4, 1.15 + uPointer.y * 0.15, 0.0);
  vec3 v = p - cam;
  float pitch = 0.2;
  float y = cos(pitch) * v.y + sin(pitch) * v.z;
  float z = -sin(pitch) * v.y + cos(pitch) * v.z;
  vec2 xy = vec2(v.x, y) / z * 1.6;
  xy.x *= uRes.y / uRes.x;
  gl_Position = vec4(xy, z / 40.0, 1.0);
  gl_PointSize = clamp((0.45 + 0.4 * fract(aSeed * 13.0)) * 0.8 / z * uRes.y, 1.0, 360.0);
  vColor = aColor; vSeed = aSeed;
  vBlur = clamp(abs(z - 5.0) / 9.0, 0.0, 1.0);
  vFog = smoothstep(27.0, 8.0, z) * smoothstep(0.5, 1.8, z) * (0.35 + 0.65 * smoothstep(20.0, 4.0, z));
}`;
export const GARDEN_FRAG = `
precision highp float;
uniform float uTime;
varying vec3 vColor; varying float vSeed; varying float vFog; varying float vBlur;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  q.y *= 1.35;
  float r = length(q) * 2.6;
  float a = atan(q.y, q.x) + vSeed * 6.28 + uTime * 0.1 * (vSeed - 0.5);
  float petals = 0.55 + 0.45 * pow(abs(cos(a * 2.5)), 1.4);
  float soft = 0.05 + vBlur * 0.5;
  float shape = smoothstep(petals, petals - soft, r);
  float vein = 0.7 + 0.3 * pow(abs(cos(a * 2.5)), 3.0);
  float core = smoothstep(0.22 + vBlur * 0.2, 0.0, r);
  float glow = exp(-r * 2.2) * 0.9;
  // Lit from inside: bright at the heart, deep at the petal tips.
  vec3 c = mix(vColor * 1.5, vColor * 0.35, smoothstep(0.0, petals, r)) * vein;
  vec3 outc = c * shape + vColor * glow * 0.55 + vec3(1.0, 0.92, 0.7) * core * 1.2;
  float alpha = clamp(shape * (1.0 - vBlur * 0.45) + glow * 0.3, 0.0, 1.0);
  gl_FragColor = vec4(outc * vFog, alpha * vFog);
}`;

export const FRAGS = {
  meadow,
  noir,
  dust,
  chrome,
  isles,
  nocturne,
  horizon,
  summit,
  studio,
  caustics,
  rainglass,
  topo,
  constellation: voidBg("vec3(0.35, 0.25, 0.7)"),
  garden: `${HEAD}
void main(){
  vec2 p = P();
  vec3 col = mix(vec3(0.02, 0.01, 0.03), vec3(0.12, 0.04, 0.09), smoothstep(0.6, -0.1, p.y));
  col += vec3(0.5, 0.12, 0.25) * 0.25 * smoothstep(0.9, 0.0, length(p - vec2(0.0, -0.05)) );
  col += uAccent * 0.05;
  gl_FragColor = vec4(finish(col, 0.04, 0.6), 1.0);
}`,
};
