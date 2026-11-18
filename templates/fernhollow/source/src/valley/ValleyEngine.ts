import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { AudioEngine } from './AudioEngine';
import {
  createDustTexture,
  createFlowerAtlasTexture,
  createLeafAtlasTexture,
  createLightRayTexture,
} from './textures';

const ValleyPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRgbShift: { value: 0.0018 },
    uNoiseAmount: { value: 0.045 },
    uVignette: { value: 0.48 },
    uVignetteSoftness: { value: 0.62 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uRgbShift;
    uniform float uNoiseAmount;
    uniform float uVignette;
    uniform float uVignetteSoftness;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 dir = vUv - vec2(0.5);
      float dist = length(dir);
      vec2 offset = dir * uRgbShift * (0.45 + dist * 1.6);

      float r = texture2D(tDiffuse, clamp(vUv + offset, 0.001, 0.999)).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, clamp(vUv - offset, 0.001, 0.999)).b;
      vec3 col = vec3(r, g, b);

      // Subtle split-RGB organic grain
      float nR = rand(vUv * 410.0 + uTime * 1.7) - 0.5;
      float nG = rand(vUv * 415.0 + uTime * 2.1 + 7.3) - 0.5;
      float nB = rand(vUv * 420.0 + uTime * 1.3 + 13.7) - 0.5;
      col += vec3(nR, nG, nB) * uNoiseAmount;

      // Velocity-reactive vignette
      float vig = smoothstep(uVignetteSoftness + 0.35, uVignetteSoftness - uVignette * 0.45, dist);
      col *= mix(1.0 - uVignette * 0.85, 1.0, vig);

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

/** Everything about the valley a template user can change (see content.json "valley"). */
export interface ValleyOptions {
  sky: string;
  fog: string;
  fogDensity: number;
  flowers: string[];
  leaves: string[];
  glow: string;
  rays: boolean;
  rayColor: string;
  stars: number;
  starColor: string;
  flowerCount: number;
  leafCount: number;
  dust: number;
  bloom: number;
  grain: number;
  vignette: number;
  drift: number;
  wander: number;
  sway: number;
}

export const DEFAULT_VALLEY: ValleyOptions = {
  sky: '#030508',
  fog: '#04070b',
  fogDensity: 0.022,
  flowers: ['#f5efe2', '#f6e6c9', '#e6c2b8', '#b6bfe8', '#9dd6c3', '#f0c888'],
  leaves: ['#132820', '#1b362b', '#254437', '#182a31'],
  glow: '#f5e6c2',
  rays: true,
  rayColor: '#cfdcf0',
  stars: 450,
  starColor: '#dbe2f0',
  flowerCount: 15000,
  leafCount: 10000,
  dust: 1400,
  bloom: 0.58,
  grain: 0.045,
  vignette: 0.44,
  drift: 1,
  wander: 1,
  sway: 1,
};

const col = (c: string, fallback: string) => {
  try {
    return new THREE.Color(c || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
};

function terrainHeight(x: number, z: number): number {
  const macro =
    Math.sin(x * 0.045) * Math.cos(z * 0.042) * 3.8 +
    Math.sin(x * 0.095 + 1.2) * Math.sin(z * 0.088 + 0.7) * 1.65;
  const micro = Math.cos(x * 0.23 - z * 0.19) * 0.42;
  return macro + micro;
}

export class ValleyEngine {
  private container: HTMLElement;
  private mountEl: HTMLElement;
  private onLoaded: () => void;
  private onIntroDone: () => void;
  private audio: AudioEngine;
  private o: ValleyOptions;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private postPass: ShaderPass | null = null;

  private flowerMaterial!: THREE.ShaderMaterial;
  private leafMaterial!: THREE.ShaderMaterial;
  private dustMaterial!: THREE.ShaderMaterial;
  private lightRays: Array<{ mesh: THREE.Mesh; baseOpacity: number; phase: number }> = [];

  private textures: THREE.Texture[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  private curve!: THREE.CatmullRomCurve3;
  private pathT = 0.08;
  private velocity = 0;
  private targetVelocity = 0;

  private mouse = new THREE.Vector2(0, 0);
  private targetMouse = new THREE.Vector2(0, 0);

  private hoverTarget = 0;
  private hoverMix = 0;

  private elapsed = 0;
  private introElapsed = 0;
  private introDone = false;
  private lastTime = performance.now();
  private frameId = 0;
  private isDisposed = false;
  private isSoftwareGl = false;
  private reducedMotion = false;
  private lastTouchY: number | null = null;

  // Reusable math helpers (zero GC in loop)
  private readonly _pos = new THREE.Vector3();
  private readonly _lookAt = new THREE.Vector3();
  private readonly _tangent = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _up = new THREE.Vector3(0, 1, 0);

  constructor(
    container: HTMLElement,
    onLoaded: () => void,
    onIntroDone: () => void,
    audio: AudioEngine,
    options: Partial<ValleyOptions> = {}
  ) {
    this.o = { ...DEFAULT_VALLEY, ...options };
    this.container = container;
    this.mountEl =
      (container.querySelector('.js-canvas-container') as HTMLElement) || container;
    this.onLoaded = onLoaded;
    this.onIntroDone = onIntroDone;
    this.audio = audio;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isSoftwareGl = detectSoftwareGl();

    this.initScene();
    this.bindEvents();

    // Signal asset readiness and start render loop
    window.setTimeout(() => {
      if (!this.isDisposed) {
        this.onLoaded();
      }
    }, 180);

    this.lastTime = performance.now();
    this.tick();
  }

  private initScene(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = col(this.o.sky, DEFAULT_VALLEY.sky);
    this.scene.fog = new THREE.FogExp2(col(this.o.fog, DEFAULT_VALLEY.fog), this.o.fogDensity);

    this.camera = new THREE.PerspectiveCamera(56, width / height, 0.15, 130);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(width, height);

    this.mountEl.innerHTML = '';
    this.mountEl.appendChild(this.renderer.domElement);

    // Closed meandering valley spline path
    const points: THREE.Vector3[] = [];
    const controlCount = 24;
    for (let i = 0; i < controlCount; i++) {
      const a = (i / controlCount) * Math.PI * 2;
      const x = Math.sin(a) * 62 + Math.sin(a * 2) * 18;
      const z = Math.cos(a) * 46 + Math.cos(a * 3) * 10;
      const y = terrainHeight(x, z) + 2.35 + Math.sin(a * 3 + 0.5) * 0.65;
      points.push(new THREE.Vector3(x, y, z));
    }
    this.curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);

    this.buildValleyPoints();
    if (this.o.rays) this.buildLightRays();
    this.buildDustParticles();
    this.buildNightSkyBackdrop();

    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        this.o.bloom,
        0.72,
        0.42
      );
      this.composer.addPass(this.bloomPass);

      this.postPass = new ShaderPass(ValleyPostShader);
      this.postPass.uniforms.uNoiseAmount.value = this.o.grain;
      this.composer.addPass(this.postPass);
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildValleyPoints(): void {
    const flowerAtlas = createFlowerAtlasTexture();
    const leafAtlas = createLeafAtlasTexture();
    this.textures.push(flowerAtlas, leafAtlas);

    const pick = (list: string[], fb: string[]) => (list && list.length ? list : fb).map((c, i) => col(c, fb[i % fb.length]));
    const flowerPalette = pick(this.o.flowers, DEFAULT_VALLEY.flowers);
    while (flowerPalette.length < 6) flowerPalette.push(flowerPalette[flowerPalette.length % Math.max(1, flowerPalette.length)].clone());
    const leafPalette = pick(this.o.leaves, DEFAULT_VALLEY.leaves);

    const sampleSteps = 340;
    const cap = this.isSoftwareGl ? 0.4 : 1;
    const flowerCount = Math.round(Math.max(500, Math.min(40000, this.o.flowerCount)) * cap);
    const leafCount = Math.round(Math.max(0, Math.min(30000, this.o.leafCount)) * cap);

    // Helper to sample organic corridor point around spline
    const sampleCorridorPoint = (
      idx: number,
      total: number,
      minLat: number,
      maxLat: number
    ) => {
      const t = (idx / total + (Math.random() - 0.5) * 0.008 + 1) % 1;
      const center = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3().crossVectors(tangent, this._up).normalize();

      const sign = Math.random() < 0.5 ? -1 : 1;
      const u = Math.pow(Math.random(), 0.72);
      const lateral = sign * (minLat + u * (maxLat - minLat));

      const wx = center.x + side.x * lateral + (Math.random() - 0.5) * 2.2;
      const wz = center.z + side.z * lateral + (Math.random() - 0.5) * 2.2;

      // Bowl-shaped valley cross-section blended with world terrain
      const slopeLift = Math.pow(Math.abs(lateral) / 14, 1.65) * 2.85;
      const baseH = terrainHeight(wx, wz);
      const pathFloor = center.y - 2.35;
      const wy =
        THREE.MathUtils.lerp(pathFloor, baseH, Math.min(1, Math.abs(lateral) / 12)) +
        slopeLift;

      return { wx, wy, wz, lateral };
    };

    // 1. Flowers Geometry
    const fPos = new Float32Array(flowerCount * 3);
    const fCol = new Float32Array(flowerCount * 3);
    const fScale = new Float32Array(flowerCount);
    const fTile = new Float32Array(flowerCount);
    const fRot = new Float32Array(flowerCount);
    const fPhase = new Float32Array(flowerCount);
    const fDisp = new Float32Array(flowerCount * 3);

    for (let i = 0; i < flowerCount; i++) {
      const pt = sampleCorridorPoint(i % sampleSteps, sampleSteps, 0.7, 25);
      const stemHeight = 0.15 + Math.random() * 0.85;

      fPos[i * 3] = pt.wx;
      fPos[i * 3 + 1] = pt.wy + stemHeight;
      fPos[i * 3 + 2] = pt.wz;

      // Weighted palette selection (mostly luminous cream & pale gold, hints of rose/periwinkle/sage)
      const r = Math.random();
      const color =
        r < 0.44
          ? flowerPalette[0]
          : r < 0.65
          ? flowerPalette[1]
          : r < 0.78
          ? flowerPalette[2]
          : r < 0.89
          ? flowerPalette[3]
          : r < 0.95
          ? flowerPalette[4]
          : flowerPalette[5];

      const brightness = 0.72 + Math.random() * 0.52;
      fCol[i * 3] = color.r * brightness;
      fCol[i * 3 + 1] = color.g * brightness;
      fCol[i * 3 + 2] = color.b * brightness;

      fScale[i] = 0.55 + Math.random() * 0.95;
      fTile[i] = Math.floor(Math.random() * 4);
      fRot[i] = Math.random() * Math.PI * 2;
      fPhase[i] = Math.random() * 100.0;

      // Outward/upward dispersion vector for hover transition
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.2) * Math.PI;
      fDisp[i * 3] = Math.cos(theta) * Math.cos(phi);
      fDisp[i * 3 + 1] = Math.abs(Math.sin(phi)) * 0.85 + 0.35;
      fDisp[i * 3 + 2] = Math.sin(theta) * Math.cos(phi);
    }

    const flowerGeo = new THREE.BufferGeometry();
    flowerGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
    flowerGeo.setAttribute('aColor', new THREE.BufferAttribute(fCol, 3));
    flowerGeo.setAttribute('aScale', new THREE.BufferAttribute(fScale, 1));
    flowerGeo.setAttribute('aTile', new THREE.BufferAttribute(fTile, 1));
    flowerGeo.setAttribute('aRotation', new THREE.BufferAttribute(fRot, 1));
    flowerGeo.setAttribute('aPhase', new THREE.BufferAttribute(fPhase, 1));
    flowerGeo.setAttribute('aDisp', new THREE.BufferAttribute(fDisp, 3));
    this.geometries.push(flowerGeo);

    this.flowerMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: flowerAtlas },
        uTime: { value: 0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uAspect: { value: window.innerWidth / window.innerHeight },
        uHoverDisperse: { value: 0 },
        uFogColor: { value: col(this.o.fog, DEFAULT_VALLEY.fog) },
        uFogDensity: { value: this.o.fogDensity },
        uGlow: { value: col(this.o.glow, DEFAULT_VALLEY.glow) },
        uSway: { value: this.o.sway },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aScale;
        attribute float aTile;
        attribute float aRotation;
        attribute float aPhase;
        attribute vec3 aDisp;

        uniform float uTime;
        uniform float uPixelRatio;
        uniform vec2 uMouse;
        uniform float uAspect;
        uniform float uHoverDisperse;
        uniform float uSway;

        varying vec3 vColor;
        varying float vTile;
        varying float vRotation;
        varying float vAlpha;
        varying float vMouseGlow;
        varying float vDisperse;
        varying float vFogDepth;

        void main() {
          vec3 pos = position;

          // Gentle organic breeze sway
          float sway = sin(uTime * 0.85 + aPhase) * 0.14 * uSway;
          pos.x += sway;
          pos.z += cos(uTime * 0.72 + aPhase * 1.3) * 0.11 * uSway;

          // Hover transition: disperse flowers outward into floating glowing particles
          float disperseAmt = uHoverDisperse * (3.2 + fract(aPhase) * 4.5);
          pos += aDisp * disperseAmt;
          pos.y += sin(uTime * 1.1 + aPhase) * 0.45 * uHoverDisperse;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float camDist = -mvPosition.z;
          vFogDepth = camDist;

          // Bloom from bud to full blossom as camera approaches
          float bloom = smoothstep(54.0, 9.5, camDist);
          float sizeFactor = mix(0.18, 1.0, bloom);
          // Shrink petals into sparkling floating motes during hover dispersion
          sizeFactor *= mix(1.0, 0.34, uHoverDisperse);

          vec4 clipPos = projectionMatrix * mvPosition;
          vec2 ndc = clipPos.xy / max(clipPos.w, 0.0001);

          // Screen-space radial push away from cursor (strongest close by)
          vec2 diff = (ndc - uMouse) * vec2(uAspect, 1.0);
          float mDist = length(diff);
          float push = exp(-mDist * 4.4) * 0.16;
          vec2 pushDir = mDist > 0.0001 ? diff / mDist : vec2(0.0, 1.0);
          clipPos.xy += pushDir * push * vec2(1.0 / uAspect, 1.0) * clipPos.w;

          vMouseGlow = smoothstep(0.42, 0.02, mDist);
          vColor = aColor;
          vTile = aTile;
          vRotation = aRotation + sin(uTime * 0.35 + aPhase) * 0.15;
          vDisperse = uHoverDisperse;

          float nearFade = smoothstep(1.1, 3.8, camDist);
          float farFade = smoothstep(64.0, 32.0, camDist);
          vAlpha = nearFade * farFade * mix(0.95, 0.82, uHoverDisperse);

          gl_Position = clipPos;
          gl_PointSize = clamp((360.0 * aScale * sizeFactor * uPixelRatio) / max(camDist, 1.0), 1.5, 130.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uAtlas;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uGlow;

        varying vec3 vColor;
        varying float vTile;
        varying float vRotation;
        varying float vAlpha;
        varying float vMouseGlow;
        varying float vDisperse;
        varying float vFogDepth;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float c = cos(vRotation);
          float s = sin(vRotation);
          vec2 rotUv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + vec2(0.5);

          // 2x2 atlas lookup
          float col = mod(vTile, 2.0);
          float row = floor(vTile / 2.0);
          vec2 atlasUv = (clamp(rotUv, 0.02, 0.98) + vec2(col, 1.0 - row)) * 0.5;
          vec4 sprite = texture2D(uAtlas, atlasUv);

          // Soft orb particle shape during hover dispersion
          float radial = length(uv);
          float orb = smoothstep(0.48, 0.04, radial);
          float alpha = mix(sprite.a, orb, vDisperse * 0.85) * vAlpha;
          if (alpha < 0.02) discard;

          vec3 baseCol = mix(sprite.rgb * vColor, vColor * 1.45, vDisperse * 0.72);
          // Cursor proximity luminescence
          baseCol += uGlow * vMouseGlow * 0.65;

          // Exponential depth fog
          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
          vec3 finalCol = mix(baseCol, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(finalCol, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    this.materials.push(this.flowerMaterial);

    const flowerPoints = new THREE.Points(flowerGeo, this.flowerMaterial);
    flowerPoints.frustumCulled = false;
    this.scene.add(flowerPoints);

    // 2. Leaves & Undergrowth Geometry
    const lPos = new Float32Array(leafCount * 3);
    const lCol = new Float32Array(leafCount * 3);
    const lScale = new Float32Array(leafCount);
    const lTile = new Float32Array(leafCount);
    const lRot = new Float32Array(leafCount);
    const lPhase = new Float32Array(leafCount);
    const lDisp = new Float32Array(leafCount * 3);

    for (let i = 0; i < leafCount; i++) {
      const pt = sampleCorridorPoint(i % sampleSteps, sampleSteps, 0.5, 27);
      lPos[i * 3] = pt.wx;
      lPos[i * 3 + 1] = pt.wy + Math.random() * 0.35;
      lPos[i * 3 + 2] = pt.wz;

      const c = leafPalette[Math.floor(Math.random() * leafPalette.length)];
      const shade = 0.75 + Math.random() * 0.55;
      lCol[i * 3] = c.r * shade;
      lCol[i * 3 + 1] = c.g * shade;
      lCol[i * 3 + 2] = c.b * shade;

      lScale[i] = 0.7 + Math.random() * 1.1;
      lTile[i] = Math.floor(Math.random() * 4);
      lRot[i] = (Math.random() - 0.5) * 1.2;
      lPhase[i] = Math.random() * 100.0;

      const theta = Math.random() * Math.PI * 2;
      lDisp[i * 3] = Math.cos(theta) * 0.8;
      lDisp[i * 3 + 1] = 0.3 + Math.random() * 0.6;
      lDisp[i * 3 + 2] = Math.sin(theta) * 0.8;
    }

    const leafGeo = new THREE.BufferGeometry();
    leafGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
    leafGeo.setAttribute('aColor', new THREE.BufferAttribute(lCol, 3));
    leafGeo.setAttribute('aScale', new THREE.BufferAttribute(lScale, 1));
    leafGeo.setAttribute('aTile', new THREE.BufferAttribute(lTile, 1));
    leafGeo.setAttribute('aRotation', new THREE.BufferAttribute(lRot, 1));
    leafGeo.setAttribute('aPhase', new THREE.BufferAttribute(lPhase, 1));
    leafGeo.setAttribute('aDisp', new THREE.BufferAttribute(lDisp, 3));
    this.geometries.push(leafGeo);

    this.leafMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: leafAtlas },
        uTime: { value: 0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uAspect: { value: window.innerWidth / window.innerHeight },
        uHoverDisperse: { value: 0 },
        uFogColor: { value: col(this.o.fog, DEFAULT_VALLEY.fog) },
        uFogDensity: { value: this.o.fogDensity },
        uGlow: { value: col(this.o.glow, DEFAULT_VALLEY.glow) },
        uSway: { value: this.o.sway },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aScale;
        attribute float aTile;
        attribute float aRotation;
        attribute float aPhase;
        attribute vec3 aDisp;

        uniform float uTime;
        uniform float uPixelRatio;
        uniform vec2 uMouse;
        uniform float uAspect;
        uniform float uHoverDisperse;
        uniform float uSway;

        varying vec3 vColor;
        varying float vTile;
        varying float vRotation;
        varying float vAlpha;
        varying float vMouseGlow;
        varying float vFogDepth;

        void main() {
          vec3 pos = position;
          pos.x += sin(uTime * 0.6 + aPhase) * 0.09 * uSway;
          pos += aDisp * uHoverDisperse * 2.5;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float camDist = -mvPosition.z;
          vFogDepth = camDist;

          // Leaves grow in further back
          float grow = smoothstep(62.0, 16.0, camDist);
          float sizeFactor = mix(0.2, 1.0, grow) * (1.0 - uHoverDisperse * 0.65);

          vec4 clipPos = projectionMatrix * mvPosition;
          vec2 ndc = clipPos.xy / max(clipPos.w, 0.0001);
          vec2 diff = (ndc - uMouse) * vec2(uAspect, 1.0);
          float mDist = length(diff);
          float push = exp(-mDist * 4.2) * 0.14;
          vec2 pushDir = mDist > 0.0001 ? diff / mDist : vec2(0.0, 1.0);
          clipPos.xy += pushDir * push * vec2(1.0 / uAspect, 1.0) * clipPos.w;

          vMouseGlow = smoothstep(0.36, 0.02, mDist);
          vColor = aColor;
          vTile = aTile;
          vRotation = aRotation;

          float nearFade = smoothstep(1.6, 5.2, camDist);
          float farFade = smoothstep(66.0, 34.0, camDist);
          vAlpha = nearFade * farFade * (1.0 - uHoverDisperse * 0.72);

          gl_Position = clipPos;
          gl_PointSize = clamp((420.0 * aScale * sizeFactor * uPixelRatio) / max(camDist, 1.0), 1.0, 140.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uAtlas;
        uniform vec3 uFogColor;
        uniform float uFogDensity;

        varying vec3 vColor;
        varying float vTile;
        varying float vRotation;
        varying float vAlpha;
        varying float vMouseGlow;
        varying float vFogDepth;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float c = cos(vRotation);
          float s = sin(vRotation);
          vec2 rotUv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + vec2(0.5);

          float col = mod(vTile, 2.0);
          float row = floor(vTile / 2.0);
          vec2 atlasUv = (clamp(rotUv, 0.02, 0.98) + vec2(col, 1.0 - row)) * 0.5;
          vec4 sprite = texture2D(uAtlas, atlasUv);

          float alpha = sprite.a * vAlpha;
          if (alpha < 0.03) discard;

          vec3 baseCol = sprite.rgb * vColor + vec3(0.22, 0.36, 0.30) * vMouseGlow * 0.45;
          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
          vec3 finalCol = mix(baseCol, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(finalCol, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    this.materials.push(this.leafMaterial);

    const leafPoints = new THREE.Points(leafGeo, this.leafMaterial);
    leafPoints.frustumCulled = false;
    leafPoints.renderOrder = -1;
    this.scene.add(leafPoints);
  }

  private buildLightRays(): void {
    const rayTex = createLightRayTexture();
    this.textures.push(rayTex);

    const rayGeo = new THREE.PlaneGeometry(10, 26);
    this.geometries.push(rayGeo);

    const rayCount = 22;
    const flowerTint = col(this.o.flowers?.[0], DEFAULT_VALLEY.flowers[0]);
    for (let i = 0; i < rayCount; i++) {
      const t = i / rayCount;
      const pt = this.curve.getPointAt(t);
      const sideOffset = (Math.random() - 0.5) * 18;
      const mat = new THREE.MeshBasicMaterial({
        map: rayTex,
        color: i % 2 === 0 ? col(this.o.rayColor, DEFAULT_VALLEY.rayColor) : flowerTint,
        transparent: true,
        opacity: 0.055,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.materials.push(mat);

      const mesh = new THREE.Mesh(rayGeo, mat);
      mesh.position.set(pt.x + sideOffset, pt.y + 7.5, pt.z + (Math.random() - 0.5) * 14);
      mesh.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.35 + 0.18);
      this.scene.add(mesh);
      this.lightRays.push({
        mesh,
        baseOpacity: 0.035 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private buildDustParticles(): void {
    const dustTex = createDustTexture();
    this.textures.push(dustTex);

    const count = Math.max(0, Math.min(6000, Math.round(this.o.dust)));
    const pos = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const phase = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const center = this.curve.getPointAt(t);
      pos[i * 3] = center.x + (Math.random() - 0.5) * 32;
      pos[i * 3 + 1] = center.y - 1.5 + Math.random() * 11;
      pos[i * 3 + 2] = center.z + (Math.random() - 0.5) * 32;
      scale[i] = 0.5 + Math.random() * 1.4;
      phase[i] = Math.random() * 60.0;
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    this.geometries.push(dustGeo);

    this.dustMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: dustTex },
        uTime: { value: 0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uHoverDisperse: { value: 0 },
      },
      vertexShader: `
        attribute float aScale;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uHoverDisperse;
        varying float vAlpha;

        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.35 + aPhase) * 0.85;
          p.x += cos(uTime * 0.28 + aPhase * 1.1) * 0.65;

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          float dist = -mvPosition.z;
          float twinkle = 0.45 + 0.55 * sin(uTime * 1.4 + aPhase * 2.0);
          vAlpha = twinkle * smoothstep(55.0, 8.0, dist) * smoothstep(0.8, 3.0, dist) * (0.55 + uHoverDisperse * 0.45);

          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = clamp((95.0 * aScale * uPixelRatio) / max(dist, 1.0), 1.0, 26.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uTex, gl_PointCoord);
          float a = tex.a * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vec3(0.96, 0.94, 0.88), a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.materials.push(this.dustMaterial);

    const dust = new THREE.Points(dustGeo, this.dustMaterial);
    dust.frustumCulled = false;
    this.scene.add(dust);
  }

  private buildNightSkyBackdrop(): void {
    // Faint distant starfield dome so sky never reads flat
    const starCount = Math.max(0, Math.min(3000, Math.round(this.o.stars)));
    const sPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.42;
      const r = 108;
      sPos[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
      sPos[i * 3 + 1] = Math.cos(phi) * r * 0.65 + 8;
      sPos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    this.geometries.push(starGeo);

    const starMat = new THREE.PointsMaterial({
      color: col(this.o.starColor, DEFAULT_VALLEY.starColor),
      size: 0.42,
      transparent: true,
      opacity: 0.35,
      fog: false,
    });
    this.materials.push(starMat);

    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  private onPointerMove = (e: PointerEvent): void => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    this.targetMouse.set(nx, ny);
  };

  private onWheel = (e: WheelEvent): void => {
    const delta = e.deltaY * 0.000018 * this.o.wander;
    this.targetVelocity = THREE.MathUtils.clamp(this.targetVelocity + delta, -0.045, 0.065);
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length > 0) {
      this.lastTouchY = e.touches[0].clientY;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length > 0 && this.lastTouchY !== null) {
      const currentY = e.touches[0].clientY;
      // 20x touch multiplier as described in the valley scroller spec
      const deltaY = (this.lastTouchY - currentY) * 20;
      this.lastTouchY = currentY;
      const delta = deltaY * 0.000012 * this.o.wander;
      this.targetVelocity = THREE.MathUtils.clamp(this.targetVelocity + delta, -0.055, 0.075);
    }
  };

  private onTouchEnd = (): void => {
    this.lastTouchY = null;
  };

  private onResize = (): void => {
    if (this.isDisposed) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(width, height);

    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }

    this.flowerMaterial.uniforms.uAspect.value = width / height;
    this.flowerMaterial.uniforms.uPixelRatio.value = pr;
    this.leafMaterial.uniforms.uAspect.value = width / height;
    this.leafMaterial.uniforms.uPixelRatio.value = pr;
    this.dustMaterial.uniforms.uPixelRatio.value = pr;
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
  };

  private onContextRestored = (): void => {
    this.lastTime = performance.now();
    this.tick();
  };

  private bindEvents(): void {
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  public startHoverTransition(): void {
    this.hoverTarget = 1;
    this.audio.setMuffled(true);
  }

  public stopHoverTransition(): void {
    this.hoverTarget = 0;
    this.audio.setMuffled(false);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.isDisposed) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (!this.reducedMotion) {
      this.elapsed += dt;
    }
    this.introElapsed += dt;

    // Intro reveal timing
    if (!this.introDone && this.introElapsed >= 0.9) {
      this.introDone = true;
    }
    if (this.introDone) {
      // Called every frame after intro finishes, matching original engine contract
      this.onIntroDone();
    }

    // Smooth hover transition
    this.hoverMix = THREE.MathUtils.damp(this.hoverMix, this.hoverTarget, 3.6, dt);

    // Smooth mouse tracking
    this.mouse.x = THREE.MathUtils.damp(this.mouse.x, this.targetMouse.x, 5.5, dt);
    this.mouse.y = THREE.MathUtils.damp(this.mouse.y, this.targetMouse.y, 5.5, dt);

    // Virtual scroller + gentle idle drift eased to stop on hover
    const idleDrift = this.reducedMotion ? 0 : 0.0044 * this.o.drift;
    this.targetVelocity = THREE.MathUtils.damp(this.targetVelocity, 0, 3.2, dt);
    this.velocity = THREE.MathUtils.damp(
      this.velocity,
      (idleDrift + this.targetVelocity) * (1 - this.hoverMix),
      4.5,
      dt
    );
    this.pathT = (this.pathT + this.velocity * dt + 1) % 1;

    // Camera along spline path + intro vertical descent + mouse tilt
    this.curve.getPointAt(this.pathT, this._pos);
    this.curve.getTangentAt(this.pathT, this._tangent).normalize();

    const introProgress = Math.min(1, this.introElapsed / 1.8);
    const introEase = 1 - Math.pow(1 - introProgress, 3);
    const introHeightOffset = (1 - introEase) * 5.2;
    this._pos.y += introHeightOffset;

    this.camera.position.copy(this._pos);

    const lookT = (this.pathT + 0.018) % 1;
    this.curve.getPointAt(lookT, this._lookAt);
    this._lookAt.y += 0.35 + (1 - introEase) * 1.4;

    // Tilt toward mouse cursor
    this._right.crossVectors(this._tangent, this._up).normalize();
    this._lookAt.addScaledVector(this._right, this.mouse.x * 1.65);
    this._lookAt.y += this.mouse.y * 1.05;

    this.camera.lookAt(this._lookAt);

    // Subtle speed FOV breathing
    const speedMag = Math.abs(this.velocity);
    const targetFov = 56 + Math.min(8, speedMag * 180);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, dt);
      this.camera.updateProjectionMatrix();
    }

    // Update shader uniforms
    this.flowerMaterial.uniforms.uTime.value = this.elapsed;
    this.flowerMaterial.uniforms.uMouse.value.copy(this.mouse);
    this.flowerMaterial.uniforms.uHoverDisperse.value = this.hoverMix;

    this.leafMaterial.uniforms.uTime.value = this.elapsed;
    this.leafMaterial.uniforms.uMouse.value.copy(this.mouse);
    this.leafMaterial.uniforms.uHoverDisperse.value = this.hoverMix;

    this.dustMaterial.uniforms.uTime.value = this.elapsed;
    this.dustMaterial.uniforms.uHoverDisperse.value = this.hoverMix;

    // Gentle light-ray shimmer
    for (let i = 0; i < this.lightRays.length; i++) {
      const ray = this.lightRays[i];
      const mat = ray.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity =
        ray.baseOpacity *
        (0.7 + 0.3 * Math.sin(this.elapsed * 0.55 + ray.phase)) *
        (1 - this.hoverMix * 0.45);
      ray.mesh.lookAt(this.camera.position.x, ray.mesh.position.y, this.camera.position.z);
    }

    // Post-processing dynamic uniforms (tighter vignette & RGB split with movement speed)
    if (this.postPass) {
      this.postPass.uniforms.uTime.value = this.elapsed;
      this.postPass.uniforms.uRgbShift.value = 0.0014 + Math.min(0.0055, speedMag * 0.09);
      this.postPass.uniforms.uVignette.value = this.o.vignette + Math.min(0.45, speedMag * 9.0);
    }

    if (this.isSoftwareGl || !this.composer) {
      this.renderer.render(this.scene, this.camera);
      this.afterDraw(this.tick);
    } else {
      this.composer.render();
      this.frameId = window.requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.isDisposed = true;
    window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);

    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('resize', this.onResize);

    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
