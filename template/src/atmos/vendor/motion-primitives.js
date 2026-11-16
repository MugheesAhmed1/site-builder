// Six fragment shaders from Motion Primitives (https://github.com/itsjwill/motion-primitives-website,
// src/components/backgrounds/shader-backgrounds.tsx), MIT License as stated in that project's
// README ("MIT — use however you want, commercially or personally."). The GLSL is carried over
// unchanged (a precision line added for WebGL 1); the React Three Fiber wrapper is replaced by
// this builder's own renderer (engine.js), which sets the same uniforms with the same defaults.
export const MOTION_PRIMITIVES = [
 {
  "id": "mp-noise",
  "label": "Noise gradient",
  "note": "Indigo, violet and pink folding through slow simplex noise.",
  "moods": [
   "brand",
   "bold",
   "tech"
  ],
  "uniforms": {
   "uColor1": "#4f46e5",
   "uColor2": "#7c3aed",
   "uColor3": "#ec4899",
   "uNoiseScale": 3,
   "uSpeed": 0.3
  },
  "frag": "precision highp float;\nuniform float uTime;\n  uniform vec3 uColor1;\n  uniform vec3 uColor2;\n  uniform vec3 uColor3;\n  uniform float uNoiseScale;\n  uniform float uSpeed;\n  varying vec2 vUv;\n\n  // Simplex noise functions\n  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\n  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\n  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }\n\n  float snoise(vec2 v) {\n    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);\n    vec2 i  = floor(v + dot(v, C.yy));\n    vec2 x0 = v - i + dot(i, C.xx);\n    vec2 i1;\n    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n    vec4 x12 = x0.xyxy + C.xxzz;\n    x12.xy -= i1;\n    i = mod289(i);\n    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));\n    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);\n    m = m*m;\n    m = m*m;\n    vec3 x = 2.0 * fract(p * C.www) - 1.0;\n    vec3 h = abs(x) - 0.5;\n    vec3 ox = floor(x + 0.5);\n    vec3 a0 = x - ox;\n    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);\n    vec3 g;\n    g.x  = a0.x  * x0.x  + h.x  * x0.y;\n    g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n    return 130.0 * dot(m, g);\n  }\n\n  void main() {\n    vec2 uv = vUv;\n    float time = uTime * uSpeed;\n\n    // Create layered noise\n    float noise1 = snoise(uv * uNoiseScale + time * 0.5);\n    float noise2 = snoise(uv * uNoiseScale * 2.0 - time * 0.3);\n    float noise3 = snoise(uv * uNoiseScale * 4.0 + time * 0.2);\n\n    float combinedNoise = (noise1 + noise2 * 0.5 + noise3 * 0.25) / 1.75;\n    combinedNoise = combinedNoise * 0.5 + 0.5;\n\n    // Create gradient with three colors\n    vec3 color;\n    if (combinedNoise < 0.5) {\n      color = mix(uColor1, uColor2, combinedNoise * 2.0);\n    } else {\n      color = mix(uColor2, uColor3, (combinedNoise - 0.5) * 2.0);\n    }\n\n    gl_FragColor = vec4(color, 1.0);\n  }"
 },
 {
  "id": "mp-liquid-metal",
  "label": "Liquid metal",
  "note": "A dark metal surface rippling under a moving light.",
  "moods": [
   "luxe",
   "tech",
   "mono"
  ],
  "uniforms": {
   "uBaseColor": "#1a1a2e",
   "uReflectivity": 0.8
  },
  "frag": "precision highp float;\nuniform float uTime;\n  uniform vec3 uBaseColor;\n  uniform float uReflectivity;\n  varying vec2 vUv;\n\n  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\n  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\n  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }\n\n  float snoise(vec2 v) {\n    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);\n    vec2 i  = floor(v + dot(v, C.yy));\n    vec2 x0 = v - i + dot(i, C.xx);\n    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n    vec4 x12 = x0.xyxy + C.xxzz;\n    x12.xy -= i1;\n    i = mod289(i);\n    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));\n    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);\n    m = m*m;\n    m = m*m;\n    vec3 x = 2.0 * fract(p * C.www) - 1.0;\n    vec3 h = abs(x) - 0.5;\n    vec3 ox = floor(x + 0.5);\n    vec3 a0 = x - ox;\n    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);\n    vec3 g;\n    g.x  = a0.x  * x0.x  + h.x  * x0.y;\n    g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n    return 130.0 * dot(m, g);\n  }\n\n  void main() {\n    vec2 uv = vUv;\n    float time = uTime * 0.3;\n\n    // Create liquid distortion\n    float noise = snoise(uv * 3.0 + time);\n    float noise2 = snoise(uv * 5.0 - time * 0.5);\n\n    // Calculate pseudo-normals for reflection\n    float dx = snoise(vec2(uv.x + 0.01, uv.y) * 3.0 + time) - noise;\n    float dy = snoise(vec2(uv.x, uv.y + 0.01) * 3.0 + time) - noise;\n\n    vec3 normal = normalize(vec3(dx * 10.0, dy * 10.0, 1.0));\n\n    // Fresnel-like effect\n    float fresnel = pow(1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0))), 2.0);\n\n    // Specular highlights\n    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));\n    float specular = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 32.0);\n\n    // Combine colors\n    vec3 color = uBaseColor * (0.5 + 0.5 * noise);\n    color += vec3(1.0) * specular * uReflectivity;\n    color += vec3(0.8, 0.9, 1.0) * fresnel * 0.3;\n\n    gl_FragColor = vec4(color, 1.0);\n  }"
 },
 {
  "id": "mp-waves",
  "label": "Wave distortion",
  "note": "Deep violet bands bending in slow waves.",
  "moods": [
   "calm",
   "brand"
  ],
  "uniforms": {
   "uColor1": "#0f0f23",
   "uColor2": "#2d1b69",
   "uWaveFrequency": 10,
   "uWaveAmplitude": 0.1
  },
  "frag": "precision highp float;\nuniform float uTime;\n  uniform vec3 uColor1;\n  uniform vec3 uColor2;\n  uniform float uWaveFrequency;\n  uniform float uWaveAmplitude;\n  varying vec2 vUv;\n\n  void main() {\n    vec2 uv = vUv;\n    float time = uTime * 0.5;\n\n    // Create wave distortion\n    float wave1 = sin(uv.x * uWaveFrequency + time) * uWaveAmplitude;\n    float wave2 = sin(uv.y * uWaveFrequency * 0.8 + time * 1.2) * uWaveAmplitude;\n    float wave3 = sin((uv.x + uv.y) * uWaveFrequency * 0.5 + time * 0.8) * uWaveAmplitude;\n\n    float combinedWave = (wave1 + wave2 + wave3) / 3.0;\n\n    // Create gradient based on waves\n    float gradient = uv.y + combinedWave;\n    gradient = clamp(gradient, 0.0, 1.0);\n\n    vec3 color = mix(uColor1, uColor2, gradient);\n\n    // Add subtle highlights\n    float highlight = pow(abs(sin(gradient * 10.0 + time)), 8.0) * 0.1;\n    color += vec3(highlight);\n\n    gl_FragColor = vec4(color, 1.0);\n  }"
 },
 {
  "id": "mp-plasma",
  "label": "Plasma",
  "note": "Hot pink, violet and blue plasma, always moving.",
  "moods": [
   "bold",
   "play",
   "retro"
  ],
  "uniforms": {
   "uColor1": "#ff006e",
   "uColor2": "#8338ec",
   "uColor3": "#3a86ff"
  },
  "frag": "precision highp float;\nuniform float uTime;\n  uniform vec3 uColor1;\n  uniform vec3 uColor2;\n  uniform vec3 uColor3;\n  varying vec2 vUv;\n\n  void main() {\n    vec2 uv = vUv * 2.0 - 1.0;\n    float time = uTime * 0.5;\n\n    // Create plasma pattern\n    float v1 = sin(uv.x * 10.0 + time);\n    float v2 = sin(10.0 * (uv.x * sin(time / 2.0) + uv.y * cos(time / 3.0)) + time);\n    float v3 = sin(sqrt(100.0 * (pow(uv.x + 0.5 * sin(time / 5.0), 2.0) + pow(uv.y + 0.5 * cos(time / 3.0), 2.0)) + 1.0) + time);\n    float v4 = sin(sqrt(pow(uv.x, 2.0) + pow(uv.y, 2.0)) * 10.0 + time);\n\n    float plasma = (v1 + v2 + v3 + v4) / 4.0;\n    plasma = plasma * 0.5 + 0.5;\n\n    // Map to colors\n    vec3 color;\n    if (plasma < 0.33) {\n      color = mix(uColor1, uColor2, plasma * 3.0);\n    } else if (plasma < 0.66) {\n      color = mix(uColor2, uColor3, (plasma - 0.33) * 3.0);\n    } else {\n      color = mix(uColor3, uColor1, (plasma - 0.66) * 3.0);\n    }\n\n    gl_FragColor = vec4(color, 1.0);\n  }"
 },
 {
  "id": "mp-blobs",
  "label": "Organic blobs",
  "note": "Soft violet blobs that merge and part on black.",
  "moods": [
   "brand",
   "play",
   "calm"
  ],
  "uniforms": {
   "uBlobColor": "#8b5cf6",
   "uBackgroundColor": "#0f0f0f",
   "uBlobCount": 5
  },
  "frag": "precision highp float;\nuniform float uTime;\n  uniform vec3 uBlobColor;\n  uniform vec3 uBackgroundColor;\n  uniform float uBlobCount;\n  varying vec2 vUv;\n\n  float blob(vec2 uv, vec2 center, float radius, float softness) {\n    float dist = length(uv - center);\n    return smoothstep(radius + softness, radius - softness, dist);\n  }\n\n  void main() {\n    vec2 uv = vUv * 2.0 - 1.0;\n    float time = uTime * 0.3;\n\n    float blobs = 0.0;\n\n    // Create multiple organic blobs\n    for (float i = 0.0; i < 10.0; i++) {\n      if (i >= uBlobCount) break;\n      float angle = i * 1.2566 + time * (0.5 + i * 0.1);\n      float radius = 0.3 + sin(time + i) * 0.1;\n      vec2 center = vec2(\n        cos(angle) * (0.3 + sin(time * 0.5 + i) * 0.2),\n        sin(angle) * (0.3 + cos(time * 0.7 + i) * 0.2)\n      );\n      blobs += blob(uv, center, radius, 0.3);\n    }\n\n    blobs = clamp(blobs, 0.0, 1.0);\n\n    vec3 color = mix(uBackgroundColor, uBlobColor, blobs * 0.8);\n\n    gl_FragColor = vec4(color, 1.0);\n  }"
 },
 {
  "id": "mp-glitch",
  "label": "Glitch",
  "note": "A dark screen with bands of digital glitch.",
  "moods": [
   "tech",
   "bold",
   "retro"
  ],
  "uniforms": {
   "uColor1": "#0a0a0a",
   "uColor2": "#1a1a2e",
   "uIntensity": 0.5
  },
  "frag": "precision highp float;\nuniform float uTime;\n  uniform vec3 uColor1;\n  uniform vec3 uColor2;\n  uniform float uIntensity;\n  varying vec2 vUv;\n\n  float random(vec2 st) {\n    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);\n  }\n\n  void main() {\n    vec2 uv = vUv;\n    float time = uTime;\n\n    // Random glitch offset\n    float glitchLine = step(0.98, random(vec2(floor(uv.y * 50.0), floor(time * 10.0))));\n    float glitchOffset = (random(vec2(floor(time * 20.0), 0.0)) - 0.5) * uIntensity * glitchLine;\n\n    uv.x += glitchOffset;\n\n    // Color separation (chromatic aberration on glitch)\n    float rOffset = glitchLine * uIntensity * 0.02;\n    float bOffset = -glitchLine * uIntensity * 0.02;\n\n    // Base gradient\n    float gradient = uv.y + sin(uv.x * 10.0 + time) * 0.05;\n\n    vec3 color;\n    color.r = mix(uColor1.r, uColor2.r, gradient + rOffset);\n    color.g = mix(uColor1.g, uColor2.g, gradient);\n    color.b = mix(uColor1.b, uColor2.b, gradient + bOffset);\n\n    // Scanlines\n    float scanline = sin(uv.y * 400.0) * 0.04;\n    color -= scanline;\n\n    // Noise overlay\n    float noise = random(uv + time) * 0.05;\n    color += noise;\n\n    gl_FragColor = vec4(color, 1.0);\n  }"
 }
];
