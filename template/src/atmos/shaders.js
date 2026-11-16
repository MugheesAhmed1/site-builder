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

export const FRAGS = {
  noir,
  dust,
  chrome,
  nocturne,
  caustics,
  rainglass,
  topo,
};

// Living plates: a cinematic still brought to life. The picture is split into depth by height
// (the foot of the frame is near, the horizon is far), then the camera drifts and follows the
// pointer with parallax, the near ground sways in the wind, water shimmers, the sky breathes,
// fog banks roll through and motes (fireflies, dust, petals, snow, bubbles) drift at several
// depths. Graded with a soft bloom, grain and vignette so it reads like a film loop.
export const PLATE_FRAG = `${HEAD}
uniform sampler2D uTex; uniform vec2 uImg;
uniform float uHorizon; uniform float uSway; uniform float uWater; uniform float uSky;
uniform float uFog; uniform vec3 uFogCol; uniform float uMotes; uniform float uMoteKind; uniform vec3 uMoteCol;
uniform float uRays; uniform vec2 uRayPos; uniform float uDrift;
vec2 cover(vec2 uv, float zoom, vec2 shift){
  float ca = uRes.x / uRes.y, ia = uImg.x / uImg.y;
  vec2 s = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);
  return (uv - 0.5) * s / zoom + 0.5 + shift;
}
float mote(vec2 p, float layer, float kind){
  // Rising (fireflies, dust, bubbles) or falling (petals, snow) motes in a jittered grid.
  float scale = 9.0 - layer * 2.5;
  float dir = kind > 2.5 ? -1.0 : 1.0;
  vec2 q = p * scale + vec2(sin(uTime * 0.3 + layer) * 0.4, dir * uTime * (0.12 + layer * 0.05)) + layer * 13.7;
  vec2 id = floor(q), f = fract(q) - 0.5;
  float h = hash(id + layer * 3.1);
  if (h > 0.05 + uAmount * 0.08) return 0.0;
  vec2 o = (vec2(hash(id + 1.3), hash(id + 2.7)) - 0.5) * 0.6 + vec2(sin(uTime * (0.5 + h) + h * 6.0), cos(uTime * (0.4 + h) + h * 4.0)) * 0.12;
  float r = (kind > 2.5 ? 0.07 : 0.035) * (0.7 + layer * 0.5);
  float soft = 0.015 + layer * layer * 0.05; // the nearest layer is out of focus
  float d = length((f - o) * (kind > 3.5 ? vec2(1.0, 1.6) : vec2(1.0)));
  float m = smoothstep(r + soft, r - soft * 0.4, d);
  if (kind < 0.5) m = m * (0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.2 + h * 2.0) + h * 30.0), 2.0)) + smoothstep(r * 4.0, 0.0, d) * 0.18; // fireflies pulse and glow
  return m * (0.9 - layer * 0.25);
}
void main(){
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float t = uTime;
  // Depth from height: 0 far (sky, horizon) to 1 near (the foot of the frame).
  float near = smoothstep(uHorizon - 0.05, 1.0, uv.y);
  float sky = smoothstep(uHorizon + 0.02, uHorizon - 0.25, uv.y) * uSky;
  // A slow dolly in, a drift, the pointer and the scroll, stronger for near things.
  float zoom = 1.08 + uScroll * 0.18 + sin(t * 0.06) * 0.015 * uDrift;
  vec2 cam = vec2(sin(t * 0.05), cos(t * 0.043)) * 0.008 * uDrift + uPointer * vec2(-0.012, 0.008);
  vec2 shift = cam * (0.35 + near * 1.2);
  // Wind in the near ground: a low, travelling ripple in the picture itself.
  float gust = fbm3(vec2(uv.x * 3.0 - t * 0.35, uv.y * 2.0)) - 0.5;
  shift.x += gust * 0.009 * uSway * near * near * (0.6 + uAmount * 0.6);
  shift.y += (fbm3(vec2(uv.x * 2.0 + t * 0.2, uv.y * 3.0 + 4.0)) - 0.5) * 0.003 * uSway * near;
  // Water: fine horizontal shimmer below the horizon.
  float water = uWater * smoothstep(uHorizon - 0.01, uHorizon + 0.06, uv.y);
  shift.x += sin(uv.y * 260.0 / (0.25 + near) + t * 1.6 + fbm3(uv * 8.0) * 6.0) * 0.0012 * water;
  shift.y += sin(uv.x * 40.0 + t * 0.9) * 0.0009 * water;
  // The sky breathes: clouds stretch and drift a little.
  shift += (vec2(fbm3(uv * 2.5 + vec2(t * 0.04, 0.0)), fbm3(uv * 2.5 + vec2(3.0, t * 0.03))) - 0.5) * 0.012 * sky;
  vec2 tuv = cover(uv, zoom, shift);
  vec3 col = texture2D(uTex, tuv).rgb;
  // Soft bloom from the brightest parts.
  vec3 b = vec3(0.0);
  for (int i = 0; i < 6; i++){
    float a = float(i) * 1.047;
    b += texture2D(uTex, tuv + vec2(cos(a), sin(a)) * 0.012).rgb;
  }
  b /= 6.0;
  col += max(b - 0.6, 0.0) * 0.55;
  // Fog banks rolling through the middle distance.
  float band = smoothstep(uHorizon - 0.3, uHorizon + 0.05, uv.y) * smoothstep(1.05, uHorizon + 0.1, uv.y);
  float fog = fbm(vec2(uv.x * 2.2 - t * 0.025, uv.y * 4.0) + fbm3(uv * 3.0 + t * 0.02));
  col = mix(col, uFogCol, clamp(uFog * band * smoothstep(0.35, 0.85, fog) * 0.75, 0.0, 0.7));
  // Light shafts from a point in the frame.
  if (uRays > 0.0){
    vec2 d = uv - uRayPos;
    float ang = atan(d.y, d.x);
    float shaft = fbm3(vec2(ang * 9.0, t * 0.08)) * smoothstep(1.2, 0.0, length(d));
    col += uFogCol * pow(shaft, 2.5) * uRays * 0.6;
  }
  // Motes at three depths, nearer ones bigger and softer.
  if (uMotes > 0.0){
    vec2 mp = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    float m = 0.0;
    for (int L = 0; L < 3; L++) m += mote(mp + uPointer * 0.02 * float(L + 1), float(L), uMoteKind);
    // Dust only shows where light falls on it.
    if (abs(uMoteKind - 1.0) < 0.5) m *= smoothstep(0.2, 0.75, dot(col, vec3(0.3, 0.55, 0.15))) * 1.6;
    // Fireflies and bubbles keep to the lower part of the frame.
    if (uMoteKind < 0.5) m *= smoothstep(uHorizon - 0.25, uHorizon + 0.15, uv.y);
    col += uMoteCol * m * uMotes;
  }
  // Grade: a touch of contrast, lifted blacks, grain and a vignette.
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.18);
  col = col * 0.96 + 0.012;
  col += grain() * 0.045;
  float v = length((vUv - 0.5) * vec2(1.1, 1.0));
  col *= 1.0 - 0.38 * smoothstep(0.35, 0.95, v);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
