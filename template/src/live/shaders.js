// GLSL for the living scenes. Original code. One vertex shader animates every creature
// (swimming spine, sculling fins, flapping wings, pulsing bells) from the rig data baked
// into its vertices; the same shader draws the creature as a lit body or as points.

const PREC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

export const NOISE = `
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a*noise(p); p = p*2.03 + 17.0; a *= 0.5; } return s; }
// Light dancing through water: thin bright lines along the level sets of drifting noise.
float caustic(vec2 p, float t){
  vec2 q = p + 0.4*vec2(noise(p*1.3 + t*0.21), noise(p*1.3 - t*0.17 + 9.0));
  float a = abs(noise(q*2.1 + vec2(t*0.11, -t*0.07)) - 0.5);
  float b = abs(noise(q*3.7 - vec2(t*0.09, t*0.13) + 4.0) - 0.5);
  float c = (1.0 - smoothstep(0.0, 0.085, a)) * 0.8 + (1.0 - smoothstep(0.0, 0.06, b)) * 0.45;
  return c*c;
}
`;

// ------------------------------------------------------------------ creatures
export const CREATURE_VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol; attribute vec4 aRig; attribute vec3 aPiv;
uniform mat4 uModel; uniform mat4 uVP;
uniform float uKind; uniform float uPhase; uniform float uTime;
uniform vec4 uWave;   // head amplitude, tail amplitude, wave number, limb amplitude
uniform vec4 uPose;   // yaw bend, pitch bend, fold, glide
uniform vec2 uLook;   // head turn (yaw, pitch)
uniform float uPoint; // point size in px at distance 1 (0 = draw triangles)
uniform vec4 uPtr;    // pointer in clip space (xy), radius, strength
uniform float uBurst; uniform float uAspect; uniform float uSeed;
varying vec3 vCol; varying vec3 vNor; varying vec3 vWorld; varying float vRnd; varying float vFade;

vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }

void main(){
  vec3 p = aPos; vec3 n = aNor;
  float s = aRig.x; float w = aRig.y; float part = aRig.z;
  float sgn = aPiv.z < 0.0 ? -1.0 : 1.0;

  if (uKind > 0.5 && uKind < 2.5) {
    // Swimmers: 1 = whales and dolphins (the wave runs up and down), 2 = fish (side to side).
    if (part > 0.5 && part < 1.5) {
      float a = sgn * uWave.w * (0.3 + 0.7*sin(uPhase*0.5 - 1.0 - w*1.4)) * (0.25 + w);
      vec3 r = p - aPiv; vec2 zy = rot(vec2(r.z, r.y), a); r.z = zy.x; r.y = zy.y;
      vec2 nzy = rot(vec2(n.z, n.y), a); n.z = nzy.x; n.y = nzy.y; p = aPiv + r;
    }
    float env = uWave.x + uWave.y*s*s;
    float ph = uPhase - s*uWave.z;
    float d = env*sin(ph);
    float dds = 2.0*uWave.y*s*sin(ph) - env*uWave.z*cos(ph);
    float q = s - 0.3;
    if (uKind < 1.5) {
      float a = atan(-(dds + uPose.y*2.0*q)*0.5);
      float o = p.y; p.y = d + uPose.y*q*q + o*cos(a); p.x -= o*sin(a); n.xy = rot(n.xy, a);
      float b = atan(-uPose.x*2.0*q*0.5);
      float oz = p.z; p.z = uPose.x*q*q + oz*cos(b); p.x -= oz*sin(b); n.xz = rot(n.xz, b);
    } else {
      float a = atan(-(dds + uPose.x*2.0*q)*0.5);
      float o = p.z; p.z = d + uPose.x*q*q + o*cos(a); p.x -= o*sin(a); n.xz = rot(n.xz, a);
      float b = atan(-uPose.y*2.0*q*0.5);
      float oy = p.y; p.y = uPose.y*q*q + oy*cos(b); p.x -= oy*sin(b); n.xy = rot(n.xy, b);
    }
  } else if (uKind < 3.5 && uKind > 2.5) {
    // Birds and butterflies: wings rotate about the shoulder, more toward the tip.
    if (part > 1.5 && part < 2.5) {
      float flap = uWave.x*sin(uPhase) + uWave.y*sin(uPhase - 1.15)*w;
      float a = mix(uWave.w + flap, -1.25, uPose.z);
      vec3 r = p - aPiv;
      r.x -= abs(r.z)*0.55*uPose.z; r.z *= mix(1.0, 0.5, uPose.z);
      // The outer wing sweeps back a little on the upstroke.
      r.x -= w*w*0.12*max(0.0, cos(uPhase))*(1.0 - uPose.z)*step(0.01, uWave.x);
      vec2 zy = rot(vec2(r.z, r.y), sgn*a*(0.35 + 0.65*smoothstep(0.0, 0.35, w))); r.z = zy.x; r.y = zy.y;
      vec2 nzy = rot(vec2(n.z, n.y), sgn*a); n.z = nzy.x; n.y = nzy.y; p = aPiv + r;
    } else if (part > 4.5 && part < 5.5) {
      vec3 r = p - aPiv;
      r.xz = rot(r.xz, -uLook.x); r.xy = rot(r.xy, uLook.y);
      n.xz = rot(n.xz, -uLook.x); n.xy = rot(n.xy, uLook.y); p = aPiv + r;
    } else if (part > 2.5 && part < 3.5) {
      vec3 r = p - aPiv; r.xy = rot(r.xy, uWave.z*sin(uPhase + 0.6) - uPose.z*0.25); p = aPiv + r;
    }
    // The body rises as the wings push down.
    p.y += -uWave.x*0.09*sin(uPhase - 0.5)*(1.0 - uPose.z);
  } else if (uKind > 3.5 && uKind < 4.5) {
    // Rays: a wave travels out along each wing.
    float z = abs(p.z);
    float ph = uPhase - z*uWave.z;
    float d = uWave.x*sin(ph)*pow(z, 1.5);
    p.y += d + uWave.y*sin(uPhase - s*6.0)*smoothstep(0.55, 1.0, s)*0.6;
    float a = atan(uWave.x*(1.5*sqrt(z)*sin(ph) - uWave.z*pow(z, 1.5)*cos(ph)));
    vec2 nzy = rot(vec2(n.z, n.y), sign(p.z)*a); n.z = nzy.x; n.y = nzy.y;
    p.z += uPose.x*(s-0.3)*(s-0.3);
  } else if (uKind > 4.5 && uKind < 5.5) {
    // Jellyfish: the bell squeezes, the arms trail and sway.
    float pulse = sin(uPhase - s*2.2);
    if (part < 3.5) {
      float k = 1.0 + uWave.x*pulse*smoothstep(0.02, 0.5, s);
      p.yz *= k; p.x += uWave.x*0.25*pulse*s;
    } else {
      float lag = uPhase - w*uWave.z - aRig.w*6.283;
      p.y += uWave.y*sin(lag)*w + uPose.y*w*w;
      p.z += uWave.y*cos(lag*0.8 + 1.7)*w + uPose.x*w*w;
      p.yz *= 1.0 + uWave.x*0.6*sin(uPhase - 1.2)*(1.0 - w*0.6);
      p.x -= uWave.x*0.12*sin(uPhase - 0.8)*w;
    }
  } else if (uKind > 5.5 && uKind < 6.5) {
    // Turtles: the front flippers row like wings, the back ones steer.
    if (part > 0.5 && part < 1.5) {
      float a = uWave.x*sin(uPhase - w*0.9) + 0.1;
      vec3 r = p - aPiv; r.x -= w*uWave.x*0.25*cos(uPhase - 0.6)*abs(r.z);
      vec2 zy = rot(vec2(r.z, r.y), sgn*a); r.z = zy.x; r.y = zy.y;
      vec2 nzy = rot(vec2(n.z, n.y), sgn*a); n.z = nzy.x; n.y = nzy.y; p = aPiv + r;
    } else if (part > 2.5 && part < 3.5) {
      vec3 r = p - aPiv; vec2 zy = rot(vec2(r.z, r.y), sgn*uWave.y*sin(uPhase*0.5 + 1.0)); r.z = zy.x; r.y = zy.y; p = aPiv + r;
    } else if (part > 4.5 && part < 5.5) {
      vec3 r = p - aPiv; r.xz = rot(r.xz, -uLook.x); r.xy = rot(r.xy, uLook.y); p = aPiv + r;
    }
  } else if (uKind > 6.5 && uKind < 7.5) {
    // Things on the wind (lanterns, balloons, planes): a soft sway of the hanging part.
    if (part > 0.5) { p.z += uWave.x*sin(uPhase + w*2.0)*w; p.x += uWave.x*cos(uPhase*0.7)*w; }
  }

  vec4 world = uModel * vec4(p, 1.0);
  vNor = mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz) * n;
  vCol = aCol; vRnd = aRig.w; vFade = 1.0;
  if (uPoint > 0.0) {
    // Particles breathe a little, burst outward when tapped and part around the pointer.
    float r1 = fract(aRig.w*37.7 + uSeed);
    vec3 dir = normalize(vNor + vec3(r1 - 0.5, aRig.w - 0.5, fract(r1*7.3) - 0.5));
    float sc = length(uModel[0].xyz);
    world.xyz += dir * sc * (0.012*sin(uTime*1.7 + aRig.w*40.0) + uBurst*(0.25 + 1.3*r1*r1));
  }
  vWorld = world.xyz;
  vec4 clip = uVP * world;
  if (uPoint > 0.0) {
    vec2 ndc = clip.xy / clip.w;
    vec2 dv = (ndc - uPtr.xy) * vec2(uAspect, 1.0);
    float dist = length(dv);
    float push = uPtr.w * smoothstep(uPtr.z, 0.0, dist);
    vec2 away = dist > 0.0001 ? dv / dist : vec2(0.0, 1.0);
    clip.xy += away * push * vec2(1.0/uAspect, 1.0) * clip.w * (0.4 + 0.9*aRig.w);
    gl_PointSize = uPoint * (0.55 + 0.9*fract(aRig.w*11.3)) / clip.w * (1.0 + push*2.0);
    vFade = 1.0 - uBurst*0.5;
  }
  gl_Position = clip;
}
`;

export const CREATURE_FS = `${PREC}
uniform vec3 uEye; uniform vec3 uLight; uniform vec3 uSun; uniform vec3 uAmbTop; uniform vec3 uAmbBot;
uniform vec3 uRim; uniform vec3 uFogTop; uniform vec3 uFogBot; uniform vec3 uTint; uniform vec3 uInk;
uniform float uFog; uniform float uStyle; uniform float uCaustic; uniform float uTime; uniform float uTintAmt;
uniform float uAlpha; uniform float uGlow; uniform vec2 uRes;
varying vec3 vCol; varying vec3 vNor; varying vec3 vWorld; varying float vRnd; varying float vFade;
${NOISE}
void main(){
  vec3 n = normalize(vNor);
  vec3 v = normalize(uEye - vWorld);
  if (dot(n, v) < 0.0) n = mix(n, -n, 0.85);
  float dist = length(uEye - vWorld);
  float sy = gl_FragCoord.y / uRes.y;
  vec3 fogc = mix(uFogBot, uFogTop, smoothstep(0.0, 1.0, sy));
  float fog = 1.0 - exp(-uFog * max(0.0, dist - 3.0));
  vec3 base = mix(vCol, vCol * uTint * 1.6 + uTint * 0.12, uTintAmt);
  vec3 col;
  if (uStyle < 0.5) {
    float nl = dot(n, uLight);
    float dif = nl*0.5 + 0.5; dif *= dif;
    vec3 amb = mix(uAmbBot, uAmbTop, n.y*0.5 + 0.5);
    col = base * (amb + uSun * dif);
    col += base * uSun * uCaustic * caustic(vWorld.xz*1.6 + vWorld.y*0.4, uTime) * smoothstep(0.05, 0.7, n.y);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    col += uRim * fres * (0.35 + 0.65*max(n.y, 0.0));
    vec3 h = normalize(uLight + v);
    col += uSun * pow(max(dot(n, h), 0.0), 40.0) * 0.18;
    col += base * uGlow;
  } else if (uStyle < 1.5) {
    // Cartoon: flat bands of light and a dark outline.
    float dif = dot(n, uLight)*0.5 + 0.5;
    float band = dif > 0.62 ? 1.0 : (dif > 0.34 ? 0.78 : 0.56);
    vec3 sat = mix(vec3(dot(base, vec3(0.3, 0.6, 0.1))), base, 1.35);
    col = clamp(sat, 0.0, 1.0) * band * 1.18 + 0.04;
    float edge = smoothstep(0.34, 0.2, abs(dot(n, v)));
    col = mix(col, uInk, edge);
    fog *= 0.4;
  } else {
    // Silhouette against a painted sky.
    col = uInk + uRim * pow(1.0 - max(dot(n, v), 0.0), 4.0) * 0.25;
    fog *= 0.75;
  }
  col = mix(col, fogc, clamp(fog, 0.0, 1.0));
  gl_FragColor = vec4(col * uAlpha, uAlpha);
}
`;

export const POINT_FS = `${PREC}
uniform vec3 uTint; uniform vec3 uInk; uniform float uTintAmt; uniform float uAlpha; uniform float uGlow; uniform vec3 uEye; uniform float uFog;
varying vec3 vCol; varying vec3 vNor; varying vec3 vWorld; varying float vRnd; varying float vFade;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.12, d);
  float lum = dot(vCol, vec3(0.3, 0.6, 0.1));
  vec3 col = mix(vCol, mix(uInk, uTint, smoothstep(0.1, 0.75, lum + (vRnd - 0.5)*0.25)), uTintAmt);
  vec3 n = normalize(vNor);
  float lit = 0.62 + 0.38*max(0.0, n.y*0.6 + n.z*0.5 + 0.3);
  float dist = length(uEye - vWorld);
  float fade = exp(-uFog * max(0.0, dist - 3.0));
  float al = a * uAlpha * vFade * fade * (0.55 + 0.45*vRnd);
  gl_FragColor = vec4(col * lit * (1.0 + uGlow) * al, al * (1.0 - uGlow*0.85));
}
`;

// ------------------------------------------------------------------ drifting motes
// Marine snow, bubbles, pollen, fireflies, stars of dust: points placed by the shader.
export const DUST_VS = `
attribute vec4 aSeed;
uniform mat4 uVP; uniform float uTime; uniform vec3 uBox; uniform vec3 uDrift; uniform float uSize; uniform float uWobble;
uniform vec4 uPtr; uniform float uAspect; uniform float uShift;
varying float vA; varying float vR;
void main(){
  vec3 p = aSeed.xyz;
  p += uDrift * uTime * (0.4 + aSeed.w);
  p.y += uShift;
  p.x += uWobble * sin(uTime*(0.3 + aSeed.w*0.5) + aSeed.z*30.0);
  p.z += uWobble * cos(uTime*(0.25 + aSeed.w*0.4) + aSeed.x*30.0);
  p = (fract(p) - 0.5) * uBox;
  p.z -= uBox.z*0.25;
  vec4 clip = uVP * vec4(p, 1.0);
  vec2 ndc = clip.xy / clip.w;
  vec2 dv = (ndc - uPtr.xy) * vec2(uAspect, 1.0);
  float dist = length(dv);
  float push = uPtr.w * smoothstep(uPtr.z, 0.0, dist);
  clip.xy += (dist > 0.0001 ? dv / dist : vec2(0.0)) * push * vec2(1.0/uAspect, 1.0) * clip.w;
  gl_Position = clip;
  gl_PointSize = uSize * (0.4 + aSeed.w*1.3) / max(0.6, clip.w);
  vec3 e = abs(fract(aSeed.xyz + uDrift*uTime*(0.4 + aSeed.w) + vec3(0.0, uShift, 0.0)) - 0.5) * 2.0;
  vA = (1.0 - smoothstep(0.75, 1.0, max(e.x, max(e.y, e.z)))) * (0.35 + 0.65*fract(aSeed.w*7.1));
  vA *= 0.75 + 0.25*sin(uTime*(1.0 + aSeed.w*2.0) + aSeed.x*50.0);
  vR = aSeed.w;
}
`;
export const DUST_FS = `${PREC}
uniform vec3 uCol; uniform float uAlpha; uniform float uRing; uniform float uAdd;
varying float vA; varying float vR;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float soft = smoothstep(0.5, 0.05, d);
  float ring = smoothstep(0.5, 0.42, d) * (0.25 + 0.75*smoothstep(0.3, 0.46, d)) + 0.5*smoothstep(0.12, 0.0, length(gl_PointCoord - vec2(0.33, 0.33)));
  float a = mix(soft, ring, uRing) * vA * uAlpha;
  gl_FragColor = vec4(uCol * a, a * (1.0 - uAdd));
}
`;

// Sparks: short-lived particles thrown from a tap (bubbles, feathers of light), from the CPU.
export const SPARK_VS = `
attribute vec4 aP; // xyz, size
attribute float aLife;
uniform mat4 uVP;
varying float vL;
void main(){ vec4 clip = uVP * vec4(aP.xyz, 1.0); gl_Position = clip; gl_PointSize = aP.w / max(0.5, clip.w); vL = aLife; }
`;
export const SPARK_FS = `${PREC}
uniform vec3 uCol; uniform float uRing; uniform float uAdd;
varying float vL;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float soft = smoothstep(0.5, 0.05, d);
  float ring = smoothstep(0.5, 0.42, d) * (0.25 + 0.75*smoothstep(0.3, 0.46, d)) + 0.5*smoothstep(0.12, 0.0, length(gl_PointCoord - vec2(0.33, 0.33)));
  float a = mix(soft, ring, uRing) * smoothstep(0.0, 0.25, vL) * 0.9;
  gl_FragColor = vec4(uCol * a, a * (1.0 - uAdd));
}
`;

// Flat textured layers (the jungle's leaves): a quad in the world, fogged by distance.
export const LAYER_VS = `
attribute vec3 aPos; attribute vec2 aUv;
uniform mat4 uVP; uniform vec4 uRect; uniform float uZ; uniform float uSway; uniform float uTime;
varying vec2 vUv; varying float vDist;
void main(){
  vec3 p = vec3(uRect.x + aPos.x*uRect.z, uRect.y + aPos.y*uRect.w, uZ);
  p.x += uSway * sin(uTime*0.6 + p.y*1.3 + uZ) * aPos.y;
  vUv = aUv; vec4 clip = uVP * vec4(p, 1.0); vDist = clip.w; gl_Position = clip;
}
`;
export const LAYER_FS = `${PREC}
uniform sampler2D uTex; uniform vec3 uFogCol; uniform float uFogAmt; uniform float uAlpha; uniform vec3 uInk; uniform float uInkAmt;
varying vec2 vUv; varying float vDist;
void main(){
  vec4 t = texture2D(uTex, vUv);
  vec3 col = t.rgb;
  col = mix(col, uInk * t.a, uInkAmt);
  col = mix(col, uFogCol * t.a, uFogAmt);
  float near = smoothstep(1.6, 0.5, vDist);
  gl_FragColor = vec4(col, t.a) * uAlpha * (1.0 - near);
}
`;

// ------------------------------------------------------------------ environments
export const ENV_VS = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.9999, 1.0); }`;

const ENV_HEAD = `${PREC}
uniform vec2 uRes; uniform float uTime; uniform float uScroll; uniform vec2 uPtr;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4;
uniform float uA; uniform float uB; uniform vec4 uP; uniform float uGo; uniform vec3 uTap;
${NOISE}
vec3 finish(vec3 col, vec2 uv){
  vec2 q = uv - 0.5;
  col *= 1.0 - 0.42*dot(q, q)*1.5;
  col += (hash(gl_FragCoord.xy + fract(uTime)*61.0) - 0.5) / 160.0;
  return col;
}
`;

export const ENVS = {
  // Open water: light from the surface, shafts of sun, the deep below. C0 surface, C1 water,
  // C2 the deep, C3 light. uA is how strong the light is.
  deep: `${ENV_HEAD}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;
  float y = uv.y - uScroll*0.3 + uPtr.y*0.02;
  vec3 col = mix(uC2, uC1, smoothstep(-0.15, 0.72, y));
  col = mix(col, uC0, pow(smoothstep(0.4, 1.25, y), 1.5));
  vec2 src = vec2(0.4 + uPtr.x*0.05, 1.3 + uScroll*0.4);
  vec2 d = vec2((uv.x - src.x)*asp, uv.y - src.y);
  float ang = atan(d.x, -d.y); float r = length(d);
  float rays = noise(vec2(ang*7.0 + uTime*0.04, uTime*0.09))*0.62 + noise(vec2(ang*17.0 - uTime*0.06, 3.0 + uTime*0.15))*0.38;
  rays = smoothstep(0.38, 0.95, rays);
  float fall = exp(-r*1.5) * smoothstep(1.15, 0.15, abs(ang));
  col += uC3 * rays * fall * 0.85 * uA;
  col += uC3 * caustic(vec2(uv.x*asp*2.2, (1.0 - uv.y)*7.0), uTime) * smoothstep(0.8, 1.05, y) * 0.1 * uA;
  // Soft far-off shapes so the water has depth.
  float haze = fbm(vec2(uv.x*asp*1.4 + uTime*0.01, uv.y*2.2 - uTime*0.006));
  col = mix(col, uC1*1.15, (haze - 0.5)*0.22);
  gl_FragColor = vec4(finish(col, uv), 1.0);
}`,

  // Sky: a gradient from the horizon (C1) to the zenith (C0), a sun or moon (C2) at (uA, uB),
  // clouds, stars, layered ridges from far (C3) to near (C4), and still water that mirrors it
  // all. uP = ridges, clouds, stars, water line. uGo makes the land slide past.
  sky: `${ENV_HEAD}
vec3 sky(vec2 p, float asp){
  float base = uP.w > 0.0 ? uP.w : 0.0;
  float h = clamp((p.y - base) / (1.0 - base), 0.0, 1.0);
  vec3 col = mix(uC1, uC0, pow(h, 0.75));
  vec2 sp = vec2(uA + uPtr.x*0.012, uB + uPtr.y*0.012 - uScroll*0.12);
  vec2 d = vec2((p.x - sp.x)*asp, p.y - sp.y);
  float r = length(d);
  col += uC2 * (exp(-r*5.5)*0.55 + exp(-r*1.6)*0.22);
  col = mix(col, min(vec3(1.0), uC2*1.35 + 0.15), smoothstep(0.052, 0.046, r));
  if (uP.z > 0.0) {
    vec2 g = vec2(p.x*asp, p.y) * 70.0; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    float hs = hash(id);
    float tw = 0.6 + 0.4*sin(uTime*(1.0 + hs*3.0) + hs*40.0);
    vec2 o = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
    col += vec3(1.0, 0.96, 0.9) * step(0.9, hs) * smoothstep(0.16*hs, 0.0, length(f - o*0.6)) * tw * uP.z * smoothstep(0.0, 0.5, h) * 2.0;
  }
  if (uP.y > 0.0) {
    vec2 q = vec2(p.x*asp*1.1 + uTime*0.006*(1.0 + uGo*4.0) + uPtr.x*0.03, p.y*3.6);
    float c = fbm(q + fbm(q*1.7 + 4.0)*0.6);
    float m = smoothstep(0.52 - uP.y*0.16, 0.86 - uP.y*0.12, c) * smoothstep(0.02, 0.4, h);
    vec3 cc = mix(uC1*0.9 + uC2*0.25, vec3(1.0)*0.85 + uC2*0.25, smoothstep(0.5, 0.9, c + (p.y - sp.y)*0.3));
    col = mix(col, cc, m*0.8);
  }
  if (uP.x > 0.0) {
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float depth = fi / 4.0;                      // 0 far .. 1 near
      float sc = mix(1.6, 3.2, depth);
      float x = p.x*asp*sc + fi*31.7 + uGo*uTime*mix(0.004, 0.035, depth*depth) + uPtr.x*mix(0.01, 0.07, depth);
      float top = base + mix(0.36, 0.1, depth)*uP.x + (fbm(vec2(x, fi*5.0)) - 0.5)*mix(0.22, 0.3, depth)*uP.x + noise(vec2(x*7.0, fi))*0.012;
      top -= uScroll*mix(0.03, 0.22, depth) - uPtr.y*mix(0.0, 0.02, depth);
      vec3 rc = mix(uC3, uC4, depth);
      rc = mix(rc, col, (1.0 - depth)*0.35);           // haze on the far ones
      rc += uC2 * 0.12 * smoothstep(0.05, 0.0, top - p.y) * (1.0 - depth);   // a lit edge
      col = mix(col, rc, smoothstep(top + 0.0025, top - 0.0025, p.y));
      // Mist pooled in the valleys.
      col = mix(col, mix(uC1, vec3(1.0), 0.25), smoothstep(top, top - 0.16, p.y) * 0.16 * (1.0 - depth));
    }
  }
  return col;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;
  vec2 p = uv; float w = 0.0;
  float line = uP.w - uScroll*0.1;
  if (uP.w > 0.0 && uv.y < line) {
    float d = line - uv.y; w = 1.0;
    p.y = uP.w + d*1.15;
    p.x += (noise(vec2(uv.x*asp*26.0, d*190.0 - uTime*0.8)) - 0.5) * 0.02 * (0.25 + d*7.0);
    p.y += (noise(vec2(uv.x*asp*9.0 + uTime*0.3, d*60.0)) - 0.5) * 0.03 * d * 4.0;
  }
  vec3 col = sky(p, asp);
  if (w > 0.5) {
    float d = line - uv.y;
    col = mix(col, uC4, 0.16 + d*0.55);
    float gl = noise(vec2(uv.x*asp*60.0 + uTime*0.5, d*420.0 - uTime*1.5));
    col += uC2 * smoothstep(0.8, 1.0, gl) * 0.3 * exp(-abs(uv.x - uA)*asp*3.0) * smoothstep(0.0, 0.03, d);
    // Rings where something touched the water.
    float age = uTap.z;
    if (age < 4.0) { vec2 q = vec2((uv.x - uTap.x)*asp, (uv.y - uTap.y)*3.2); float rr = length(q); col += uC2 * 0.25 * sin((rr - age*0.16)*90.0) * smoothstep(0.05, 0.0, abs(rr - age*0.16)) * (1.0 - age/4.0); }
  }
  gl_FragColor = vec4(finish(col, uv), 1.0);
}`,

  // Rainforest behind the leaf layers: mist (C0) over deep green (C1) down to the dark
  // floor (C2), shafts of sun (C3) and far trunks (C4).
  jungle: `${ENV_HEAD}
float trunks(vec2 p, float n, float seed, float wide){
  float x = p.x*n + seed; float id = floor(x); float f = fract(x) - 0.5;
  float hs = hash(vec2(id, seed));
  float wd = wide*(0.25 + hs*0.75) * (1.0 + 0.5*smoothstep(0.35, 0.0, p.y));
  float lean = (hs - 0.5)*0.5*(p.y - 0.5) + (noise(vec2(p.y*3.0 + id, seed)) - 0.5)*0.06;
  return smoothstep(wd, wd*0.72, abs(f + (hash(vec2(id + 9.0, seed)) - 0.5)*0.5 + lean)) * step(0.3, hs);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;
  vec2 c = (uv - 0.5) / (1.0 + uScroll*0.35) + 0.5;
  vec3 col = mix(uC2, uC1, smoothstep(0.0, 0.55, c.y));
  col = mix(col, uC0, smoothstep(0.3, 1.05, c.y + (fbm(vec2(c.x*asp*2.0 + uTime*0.01, c.y*2.0)) - 0.5)*0.4) * 0.9);
  float go = uGo*uTime;
  float t1 = trunks(vec2(c.x*asp + uPtr.x*0.012 + go*0.004, c.y), 5.0, 3.0, 0.11);
  col = mix(col, mix(uC4, uC0, 0.62), t1*0.75);
  float t2 = trunks(vec2(c.x*asp + uPtr.x*0.03 + go*0.01, c.y), 2.6, 11.0, 0.13);
  col = mix(col, mix(uC4, uC1, 0.3), t2*0.9);
  // Canopy shadow at the top, and light breaking through.
  float canopy = fbm(vec2(c.x*asp*3.0 + uPtr.x*0.04 + go*0.012, c.y*3.0 + 7.0));
  col = mix(col, uC2*1.1, smoothstep(0.42, 0.75, canopy + (c.y - 0.8)*1.1) * 0.85);
  vec2 src = vec2(0.72 + uPtr.x*0.03, 1.25);
  vec2 d = vec2((uv.x - src.x)*asp, uv.y - src.y);
  float ang = atan(d.x, -d.y);
  float rays = noise(vec2(ang*10.0 + uTime*0.02, 1.0))*0.6 + noise(vec2(ang*27.0 - uTime*0.03, 5.0))*0.4;
  col += uC3 * smoothstep(0.45, 0.9, rays) * exp(-length(d)*1.1) * smoothstep(1.2, 0.1, abs(ang + 0.25)) * 0.75 * uA;
  col += uC0 * 0.12 * smoothstep(0.35, 0.0, uv.y) ;
  gl_FragColor = vec4(finish(col, uv), 1.0);
}`,

  // A pond from above: shallow water (C0) over deeper green (C1) and shadow (C2), with
  // light (C3) rippling on the bottom and rings spreading from taps and the pointer.
  pond: `${ENV_HEAD}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x*asp, uv.y);
  vec2 off = vec2(0.0);
  float age = uTap.z;
  if (age < 5.0) {
    vec2 q = p - vec2(uTap.x*asp, uTap.y); float r = length(q);
    float wv = sin((r - age*0.22)*46.0) * smoothstep(0.16, 0.0, abs(r - age*0.22)) * (1.0 - age/5.0);
    off += normalize(q + 0.0001) * wv * 0.012;
  }
  vec2 pq = p - vec2((uPtr.x*0.5 + 0.5)*asp, uPtr.y*0.5 + 0.5); float pr = length(pq);
  off += normalize(pq + 0.0001) * sin(pr*60.0 - uTime*5.0) * smoothstep(0.2, 0.0, pr) * 0.0035;
  vec2 w = p + off;
  float bed = fbm(w*2.2 + 3.0);
  vec3 col = mix(uC1, uC0, smoothstep(0.3, 0.75, bed));
  // Pebbles and shadows on the bottom.
  float st = fbm(w*9.0);
  col = mix(col, uC2, smoothstep(0.55, 0.75, st)*0.35);
  col = mix(col, uC2, smoothstep(0.25, 0.9, length(uv - 0.5)*1.2)*0.6);
  col += uC3 * caustic(w*2.6, uTime*1.2) * 0.3 * uA;
  col += uC3 * length(off) * 26.0;
  gl_FragColor = vec4(finish(col, uv), 1.0);
}`,

  // A garden out of focus: a soft gradient (C0 to C1) and big blurred lights (C2, C3, C4).
  bokeh: `${ENV_HEAD}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;
  vec3 col = mix(uC1, uC0, smoothstep(0.0, 1.0, uv.y + (fbm(uv*2.0 + uTime*0.01) - 0.5)*0.5));
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    float depth = hash(vec2(fi, 2.0));
    vec2 c = vec2(hash(vec2(fi, 5.0)), hash(vec2(fi, 9.0)));
    c += vec2(sin(uTime*0.05*(0.5 + depth) + fi), cos(uTime*0.04 + fi*2.0)) * 0.04;
    c.x += uPtr.x*0.05*(0.3 + depth) + uGo*uTime*0.004*(0.3 + depth); c.y += uPtr.y*0.03*(0.3 + depth) + uScroll*0.3*(0.3 + depth);
    c = fract(c);
    float r = mix(0.05, 0.2, depth);
    float d = length(vec2((uv.x - c.x)*asp, uv.y - c.y));
    vec3 cc = i - (i/3)*3 == 0 ? uC2 : (i - (i/3)*3 == 1 ? uC3 : uC4);
    float disc = smoothstep(r, r*0.82, d) * (0.75 + 0.25*smoothstep(r*0.6, r, d));
    col = mix(col, cc, disc * mix(0.1, 0.24, hash(vec2(fi, 13.0))) * uA);
  }
  gl_FragColor = vec4(finish(col, uv), 1.0);
}`,

  // The site's own background (C0) with two soft glows in its colours (C1, C2) that drift
  // and lean toward the pointer. Used behind the particle looks.
  studio: `${ENV_HEAD}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;
  vec3 col = uC0;
  vec2 a = vec2(0.68 + 0.08*sin(uTime*0.11) + uPtr.x*0.05, 0.52 + 0.08*cos(uTime*0.09) + uPtr.y*0.05 + uScroll*0.2);
  vec2 b = vec2(0.3 + 0.1*cos(uTime*0.07), 0.25 + 0.1*sin(uTime*0.1) + uScroll*0.3);
  float da = length(vec2((uv.x - a.x)*asp, uv.y - a.y));
  float db = length(vec2((uv.x - b.x)*asp, uv.y - b.y));
  col = mix(col, uC1, exp(-da*da*3.2)*0.34*uA);
  col = mix(col, uC2, exp(-db*db*4.0)*0.22*uA);
  vec2 q = uv - 0.5;
  col *= 1.0 - 0.2*dot(q, q);
  col += (hash(gl_FragCoord.xy + fract(uTime)*61.0) - 0.5) / 200.0;
  gl_FragColor = vec4(col, 1.0);
}`,
};
