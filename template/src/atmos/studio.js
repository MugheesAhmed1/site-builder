// Studio shaders: a second set of original backgrounds written for this builder, covering the
// popular "animated background" effects (aurora, beams, star fields, lightning, dithering and
// so on). Every line here is our own GLSL. They share the uniforms in shaders.js plus uKnob,
// up to four settings from the Scenes panel (controls.js, SHADER_CONTROLS), in that order.
import { HEAD } from "./shaders.js";

const H = `${HEAD}
uniform vec4 uKnob;
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec2 ptr(){ return uPointer * vec2(0.5 * uRes.x / uRes.y, 0.5); }
vec3 tintA(vec3 c, float k){ return mix(c, uAccent, k); }
`;

// Aurora: three curtains of light hanging over a dark sky.
const aurora = `${H}
void main(){
  vec2 p = P();
  float t = uTime * 0.12 * uKnob.x * (0.5 + uAmount);
  vec3 col = mix(vec3(0.01, 0.015, 0.045), vec3(0.03, 0.02, 0.08), smoothstep(-0.5, 0.5, p.y));
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    float y = 0.22 - 0.1 * fi - 0.3 * (uKnob.y - 0.5) + 0.2 * (fbm3(vec2(p.x * 1.1 + fi * 3.1 + uPointer.x * 0.2, t + fi * 1.7)) - 0.5);
    float d = p.y - y;
    float curtain = d > 0.0 ? exp(-d * d * 260.0) : exp(d * (5.5 + 2.0 * fi));
    float streak = 0.45 + 0.55 * noise(vec2(p.x * 22.0 + fi * 7.0 + t * 4.0, fi));
    vec3 c = mix(vec3(0.15, 0.95, 0.62), vec3(0.55, 0.25, 0.95), fi * 0.5);
    col += tintA(c, 0.3 * uKnob.z) * curtain * streak * 0.55;
  }
  col += vec3(0.6, 0.7, 1.0) * step(0.997, hash(floor(gl_FragCoord.xy / 2.0))) * smoothstep(0.0, 0.4, p.y) * 0.6;
  gl_FragColor = vec4(finish(aces(col * 1.2), 0.03, 0.3), 1.0);
}`;

// Beams: shafts of light leaning across the dark, each breathing at its own pace.
const beams = `${H}
void main(){
  vec2 p = P();
  vec2 q = rot(uKnob.z) * (p + vec2(uPointer.x * 0.04, 0.0));
  float x = q.x * uKnob.x;
  float id = floor(x), f = fract(x) - 0.5;
  float w = 0.12 + 0.26 * hash(vec2(id, 1.0));
  float beam = smoothstep(w, 0.0, abs(f));
  float breath = 0.35 + 0.65 * noise(vec2(id * 3.7, q.y * 1.5 + uTime * 0.25 * uKnob.y));
  float fade = smoothstep(-0.9, 0.7, q.y);
  vec3 c = tintA(vec3(0.92, 0.9, 1.0), 0.45);
  vec3 col = vec3(0.018, 0.016, 0.03) + c * beam * breath * fade * 0.42 * (0.6 + 0.5 * uAmount);
  col += c * 0.05 * smoothstep(0.8, -0.2, length(p - vec2(0.0, 0.5)));
  gl_FragColor = vec4(finish(col, 0.035, 0.35), 1.0);
}`;

// Dot grid: an even grid of dots, breathing in a slow wave and swelling under the pointer.
const dotgrid = `${H}
void main(){
  float s = uKnob.x * max(1.0, uRes.y / 900.0);
  vec2 g = gl_FragCoord.xy / s;
  vec2 c = floor(g) + 0.5, f = g - c;
  vec2 cp = (c * s - 0.5 * uRes) / uRes.y;
  float d = length(cp - ptr());
  float swell = exp(-d * d / (uKnob.y * uKnob.y));
  float wave = 0.5 + 0.5 * sin(length(cp) * 12.0 - uTime * uKnob.z * (0.4 + uAmount));
  float r = 0.1 + 0.08 * wave + 0.22 * swell;
  float dotm = smoothstep(r, r - 0.08, length(f));
  vec3 col = vec3(0.035, 0.035, 0.05) + mix(vec3(0.28, 0.28, 0.34), uAccent * 1.2, swell * 0.9) * dotm;
  gl_FragColor = vec4(finish(col, 0.02, 0.3), 1.0);
}`;

// Galaxy: layers of stars turning slowly around a faint nebula.
const galaxy = `${H}
void main(){
  vec2 p = P();
  float a = uTime * 0.025 * uKnob.y;
  vec3 col = vec3(0.006, 0.006, 0.02);
  for (int i = 0; i < 4; i++){
    float fi = float(i);
    float sc = (5.0 + fi * 7.0) * uKnob.x;
    vec2 q = rot(a * (1.0 + fi * 0.35)) * p * sc + fi * 17.0 + uPointer * 0.15 * (fi + 1.0);
    vec2 id = floor(q), f = fract(q) - 0.5;
    float h = hash(id + fi * 3.1);
    vec2 o = vec2(hash(id * 1.3 + 2.0), hash(id * 2.7 + 5.0)) - 0.5;
    float tw = 0.55 + 0.45 * sin(uTime * uKnob.z * (1.0 + h * 3.0) + h * 40.0);
    float star = exp(-dot(f - o * 0.6, f - o * 0.6) * (900.0 - fi * 120.0)) * step(0.6, h);
    col += mix(vec3(0.75, 0.82, 1.0), uAccent, smoothstep(0.85, 1.0, h)) * star * tw * (1.4 - fi * 0.25);
  }
  float neb = pow(fbm(rot(a) * p * 1.5 + 3.0), 3.0);
  col += mix(uAccent, vec3(0.3, 0.4, 0.9), 0.4) * neb * 0.55 * smoothstep(1.0, 0.0, length(p));
  gl_FragColor = vec4(finish(aces(col * 1.3), 0.025, 0.4), 1.0);
}`;

// Iridescence: a bright oily film, colours sliding over each other.
const iridescence = `${H}
void main(){
  vec2 q = P() * uKnob.y * 2.0 + uPointer * 0.15;
  float t = uTime * 0.18 * uKnob.x * (0.5 + uAmount);
  for (int i = 1; i < 6; i++){
    float fi = float(i);
    q += vec2(0.6 / fi * sin(fi * q.y + t + 0.3 * fi), 0.6 / fi * cos(fi * q.x + t + 0.5 * fi));
  }
  vec3 c = 0.5 + 0.5 * cos(vec3(0.0, 2.1, 4.2) + q.x + q.y + uKnob.z * 6.2831);
  c = mix(c, c * (0.5 + uAccent), 0.3);
  vec3 col = mix(vec3(0.93, 0.92, 0.96), c, 0.62);
  gl_FragColor = vec4(finish(col, 0.02, 0.12), 1.0);
}`;

// Lightning: forked bolts flickering in a storm sky.
const lightning = `${H}
void main(){
  vec2 p = P();
  float t = uTime * uKnob.x;
  vec3 c = tintA(vec3(0.62, 0.72, 1.0), 0.45);
  vec3 col = vec3(0.01, 0.012, 0.03) + vec3(0.04, 0.045, 0.08) * fbm(p * 2.0 + vec2(uTime * 0.05, 0.0));
  float glow = 0.0;
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    float beat = floor(t * 2.0 + fi * 0.37);
    float x = (fbm(vec2(p.y * 2.6 + fi * 5.0, beat * 1.7)) - 0.5) * 1.1 + (fi - 1.0) * 0.45 + uPointer.x * 0.1;
    x += (noise(vec2(p.y * 24.0, beat + fi)) - 0.5) * 0.05;
    float d = abs(p.x - x);
    float flash = pow(hash(vec2(beat, fi)), 4.0);
    float life = 1.0 - fract(t * 2.0 + fi * 0.37);
    glow += (0.0016 / (d + 0.0016)) * (0.15 + flash * life) * smoothstep(-0.7, 0.5, p.y + 0.2 * fi);
  }
  col += c * min(glow, 2.0) * uKnob.y;
  gl_FragColor = vec4(finish(aces(col), 0.03, 0.35), 1.0);
}`;

// Light rays: soft god rays falling from above, leaning toward the pointer.
const rays = `${H}
void main(){
  vec2 p = P();
  vec2 o = vec2(uPointer.x * 0.35, 0.72);
  vec2 d = p - o;
  float ang = atan(d.x, -d.y);
  float r = length(d);
  float rr = fbm3(vec2(ang * uKnob.x * 4.0, uTime * 0.12 * uKnob.y));
  rr = pow(rr, 2.0) * 2.0;
  float fall = exp(-r * (3.2 - uKnob.z * 2.2));
  vec3 c = tintA(vec3(1.0, 0.95, 0.86), 0.35);
  vec3 col = vec3(0.016, 0.015, 0.025) + c * rr * fall * smoothstep(1.6, 0.0, abs(ang)) * (0.7 + 0.4 * uAmount);
  col += c * 0.18 * exp(-r * 7.0);
  gl_FragColor = vec4(finish(aces(col * 1.2), 0.035, 0.3), 1.0);
}`;

// Prism burst: a spectrum fanning out from the centre and turning.
const prism = `${H}
void main(){
  vec2 p = P() - ptr() * 0.15;
  float ang = atan(p.y, p.x) + uTime * 0.08 * uKnob.y;
  float r = length(p);
  float s = abs(fract(ang / 6.2831 * uKnob.x) - 0.5) * 2.0;
  float ray = pow(1.0 - s, 5.0);
  vec3 spec = 0.5 + 0.5 * cos(6.2831 * (ang / 6.2831 * 2.0 + r * 0.9 + vec3(0.0, 0.33, 0.67)));
  spec = mix(spec, uAccent, 0.2);
  vec3 col = vec3(0.01) + spec * ray * exp(-r * (1.6 - uKnob.z)) * 1.1 + spec * 0.2 * exp(-r * 5.0);
  gl_FragColor = vec4(finish(aces(col), 0.03, 0.35), 1.0);
}`;

// Ripple grid: a fine grid of light that ripples outward from the pointer.
const ripple = `${H}
void main(){
  vec2 p = P();
  vec2 c = ptr();
  float d = length(p - c);
  float w = sin(d * 22.0 - uTime * 3.0 * uKnob.y) * exp(-d * 2.4) * 0.025 * uKnob.z;
  vec2 q = p + normalize(p - c + 1e-4) * w;
  vec2 g = abs(fract(q * uKnob.x + 0.5) - 0.5);
  float lw = uKnob.x * 1.4 / uRes.y;
  float line = 1.0 - smoothstep(0.0, lw, min(g.x, g.y));
  float lift = 0.35 + 0.65 * smoothstep(0.0, 0.025, abs(w) * 40.0 / max(uKnob.z, 0.1));
  vec3 col = vec3(0.025, 0.022, 0.04) + mix(vec3(0.3, 0.3, 0.38), uAccent * 1.3, lift * exp(-d * 1.5)) * line * (0.5 + 0.5 * lift);
  gl_FragColor = vec4(finish(col, 0.02, 0.45), 1.0);
}`;

// Silk: a sheet of satin folding in slow light.
const silk = `${H}
void main(){
  vec2 q = P() * uKnob.y * 1.4 + uPointer * 0.06;
  float t = uTime * 0.22 * uKnob.x * (0.5 + uAmount);
  float w = q.x * 1.3 + q.y * 0.7 * uKnob.z;
  float n = fbm(vec2(w * 0.7 + t * 0.3, q.y * 0.5 - t * 0.15));
  float ph = w * 3.6 + n * 5.0 + t;
  float shade = 0.5 + 0.5 * sin(ph - 0.7);
  float sheen = pow(0.5 + 0.5 * sin(ph), 7.0);
  vec3 base = mix(vec3(0.07, 0.05, 0.1), uAccent * 0.5, 0.6);
  vec3 col = base * (0.3 + 0.8 * shade) + mix(vec3(1.0), uAccent, 0.35) * sheen * 0.45;
  gl_FragColor = vec4(finish(aces(col * 1.1), 0.02, 0.4), 1.0);
}`;

// Threads: fine dark threads waving on paper, as if strung across the page.
const threads = `${H}
void main(){
  vec2 p = P();
  float acc = 0.0;
  float lw = 1.6 / uRes.y;
  for (int i = 0; i < 48; i++){
    if (float(i) >= uKnob.x) break;
    float fi = float(i) / uKnob.x;
    float bend = sin(p.x * (1.8 + fi * 1.4) + uTime * 0.45 * uKnob.z + fi * 6.0) * 0.09 * uKnob.y;
    bend *= 1.0 + noise(vec2(p.x * 1.5 + uTime * 0.1, fi * 9.0));
    bend += uPointer.y * 0.06 * exp(-pow(p.x - ptr().x, 2.0) * 6.0);
    float y = (fi - 0.5) * 0.55 + bend;
    acc += smoothstep(lw * 2.0, 0.0, abs(p.y - y)) * (0.35 + 0.65 * fi);
  }
  vec3 ink = mix(vec3(0.12, 0.11, 0.16), uAccent * 0.7, 0.4);
  vec3 col = mix(vec3(0.955, 0.95, 0.965), ink, clamp(acc, 0.0, 1.0) * 0.85);
  gl_FragColor = vec4(finish(col, 0.015, 0.1), 1.0);
}`;

// Hyperspeed: streaks of light racing out of the dark centre.
const hyperspeed = `${H}
void main(){
  vec2 p = P() - ptr() * 0.12;
  float a = atan(p.y, p.x), r = length(p);
  float cells = 110.0 * uKnob.y;
  float ca = a / 6.2831 * cells;
  float id = floor(ca), fa = abs(fract(ca) - 0.5);
  float h = hash(vec2(id, 7.0));
  float s = fract(h * 13.0 + log(r + 1e-3) * 0.9 - uTime * uKnob.x * (0.5 + h) * (0.5 + uAmount));
  float streak = smoothstep(0.32, 0.0, s) * smoothstep(0.0, 0.02, s) * smoothstep(0.32, 0.04, fa) * step(0.5, h);
  vec3 c = mix(vec3(1.0, 0.22, 0.52), vec3(0.22, 0.62, 1.0), step(0.75, h));
  c = mix(c, uAccent, 0.3);
  vec3 col = vec3(0.006, 0.005, 0.015) + c * streak * smoothstep(0.04, 0.6, r) * 1.6 + c * 0.04 / (r * 6.0 + 0.4);
  gl_FragColor = vec4(finish(aces(col), 0.02, 0.2), 1.0);
}`;

// Orb: a glowing ring of colour that drifts after the pointer.
const orb = `${H}
void main(){
  vec2 p = P();
  vec2 q = p - ptr() * 0.4 * uKnob.y;
  float r = length(q), R = 0.26 * uKnob.x;
  float a = atan(q.y, q.x);
  float n = fbm3(vec2(a * 1.6 + uTime * 0.3, r * 4.0 - uTime * 0.45));
  float ring = exp(-pow((r - R * (0.88 + 0.22 * n)) * 8.0, 2.0));
  float core = exp(-r * r / (R * R) * 2.2) * 0.28;
  vec3 hue = 0.5 + 0.5 * cos(6.2831 * (a / 6.2831 + uTime * 0.04 + uKnob.z + vec3(0.0, 0.33, 0.67)));
  hue = mix(hue, uAccent, 0.35);
  vec3 col = vec3(0.02, 0.016, 0.04) + hue * ring * 1.1 + hue * core;
  gl_FragColor = vec4(finish(aces(col), 0.03, 0.35), 1.0);
}`;

// Dither wave: a rolling wave drawn in big ordered-dither pixels, like an old screen.
const dither = `${H}
float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }
void main(){
  float px = uKnob.x * max(1.0, uRes.y / 900.0);
  vec2 cell = floor(gl_FragCoord.xy / px);
  vec2 p = (cell * px - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.3 * uKnob.y;
  float v = fbm(p * 2.0 + vec2(t, t * 0.3) + fbm(p * 1.3 - t * 0.2));
  v += 0.25 * exp(-length(p - ptr()) * 4.0);
  float lv = max(2.0, uKnob.z);
  v = floor(v * lv + bayer8(cell) ) / lv;
  vec3 col = mix(vec3(0.05, 0.05, 0.08), mix(vec3(0.75, 0.78, 0.95), uAccent, 0.5), clamp(v, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

// Terminal: a wall of flickering green glyphs with scan lines and the odd glitch.
const terminal = `${H}
void main(){
  float cs = uKnob.x * max(1.0, uRes.y / 900.0);
  vec2 g = gl_FragCoord.xy / vec2(cs * 0.62, cs);
  vec2 id = floor(g), f = fract(g);
  float t = floor(uTime * 6.0);
  float swap = step(0.96, hash(id + t * 0.13));
  vec2 b = floor(f * vec2(3.0, 5.0));
  float bit = step(0.48, hash(id * 7.0 + b * 1.7 + floor(swap * t)));
  float inside = step(0.12, f.x) * step(f.x, 0.88) * step(0.1, f.y) * step(f.y, 0.9);
  float bright = pow(noise(id * 0.07 + vec2(0.0, uTime * 0.25)), 2.5) * 1.1;
  bright += 0.6 * exp(-length((id * vec2(cs * 0.62, cs) - 0.5 * uRes) / uRes.y - ptr()) * 6.0);
  float glitch = step(1.0 - uKnob.y * 0.12, hash(vec2(floor(gl_FragCoord.y / 9.0), t)));
  float scan = 1.0 - uKnob.z * 0.25 * (0.5 + 0.5 * sin(gl_FragCoord.y * 1.5708));
  vec3 c = mix(vec3(0.25, 1.0, 0.5), uAccent, 0.25);
  vec3 col = vec3(0.0, 0.02, 0.012) + c * bit * inside * bright * 0.45 * scan + c * glitch * 0.12;
  gl_FragColor = vec4(finish(col, 0.03, 0.5), 1.0);
}`;

// Squares: a grid of fine squares sliding by; the cells near the pointer light up.
const squares = `${H}
void main(){
  float s = uKnob.x * max(1.0, uRes.y / 900.0);
  vec2 dir = vec2(cos(uKnob.z), sin(uKnob.z));
  vec2 shift = dir * uTime * uKnob.y * 30.0;
  vec2 g = (gl_FragCoord.xy + shift) / s;
  vec2 id = floor(g), f = fract(g);
  float lw = 1.2 / s;
  float line = 1.0 - step(lw, f.x) * step(lw, f.y);
  vec2 pp = ((uPointer * 0.5 + 0.5) * uRes + shift) / s;
  float hov = exp(-length(floor(pp) - id) * 0.9);
  float twinkle = step(0.985, hash(id + floor(uTime * 0.7)));
  vec3 col = vec3(0.04, 0.038, 0.055) + vec3(0.16, 0.16, 0.2) * line + uAccent * 0.4 * hov * (1.0 - line) + uAccent * 0.12 * twinkle;
  gl_FragColor = vec4(finish(col, 0.02, 0.4), 1.0);
}`;

// Paint swirl: thick retro paint stirred into a slow whirlpool.
const swirl = `${H}
void main(){
  vec2 q = P() * 2.6;
  float r = length(q);
  float a = atan(q.y, q.x) + uKnob.x * (1.1 / (r + 0.35)) + uTime * 0.12 * (0.5 + uAmount);
  q = r * vec2(cos(a), sin(a)) + uPointer * 0.2;
  for (int i = 0; i < 4; i++){ q += 0.35 * vec2(sin(q.y * 2.1 + uTime * 0.3), cos(q.x * 1.9 - uTime * 0.25)); }
  float v = 0.5 + 0.5 * sin(q.x * 2.0 + q.y * 1.5);
  v = pow(v, uKnob.y);
  vec3 c1 = mix(vec3(0.87, 0.26, 0.24), uAccent, 0.35), c2 = vec3(0.12, 0.42, 0.86), c3 = vec3(0.07, 0.08, 0.11);
  vec3 col = mix(c3, mix(c1, c2, smoothstep(0.35, 0.65, fract(v * 2.0))), smoothstep(0.12, 0.38, v));
  gl_FragColor = vec4(finish(col, 0.04, 0.35), 1.0);
}`;

// Retro grid: a neon grid floor running to a striped sun on the horizon.
const retrogrid = `${H}
void main(){
  vec2 p = P();
  vec3 neon = mix(vec3(1.0, 0.25, 0.78), uAccent, 0.4);
  vec3 col = mix(vec3(0.05, 0.0, 0.1), vec3(0.35, 0.05, 0.32), smoothstep(0.5, 0.0, p.y));
  vec2 sc = vec2(uPointer.x * 0.05, 0.16);
  float sd = length(p - sc);
  float stripes = step(0.0, sin((p.y - sc.y) * 70.0 + uTime * 1.5) + (p.y - sc.y) * 18.0);
  col = mix(col, mix(vec3(1.0, 0.85, 0.3), vec3(1.0, 0.2, 0.55), smoothstep(0.25, -0.15, p.y - sc.y)), smoothstep(0.23, 0.22, sd) * (p.y > sc.y ? 1.0 : stripes));
  if (p.y < 0.0){
    float z = 0.22 / (-p.y + 0.002);
    vec2 g = vec2(p.x * z * 7.0, z * 2.5 + uTime * uKnob.x * 1.6);
    vec2 gd = 0.5 - abs(fract(g) - 0.5);
    vec2 aa = vec2(z * 7.0, z * z * 11.0) / uRes.y * (1.0 + uKnob.y);
    vec2 l = 1.0 - smoothstep(aa * 0.6, aa * 1.6 + 0.01 * uKnob.y, gd);
    float line = max(l.x, l.y);
    col = vec3(0.03, 0.0, 0.06) + neon * line * exp(-z * 0.06);
    col += neon * 0.5 * exp(p.y * 30.0);
  }
  gl_FragColor = vec4(finish(col, 0.03, 0.3), 1.0);
}`;

export const STUDIO_FRAGS = {
  "st-aurora": aurora,
  "st-beams": beams,
  "st-dotgrid": dotgrid,
  "st-galaxy": galaxy,
  "st-iridescence": iridescence,
  "st-lightning": lightning,
  "st-rays": rays,
  "st-prism": prism,
  "st-ripple": ripple,
  "st-silk": silk,
  "st-threads": threads,
  "st-hyperspeed": hyperspeed,
  "st-orb": orb,
  "st-dither": dither,
  "st-terminal": terminal,
  "st-squares": squares,
  "st-swirl": swirl,
  "st-retrogrid": retrogrid,
};
