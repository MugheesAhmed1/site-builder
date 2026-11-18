import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useIsMobile, useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { detectSoftwareGl } from '../utils/webgl';
import { useXP } from '../xp';

const HEX = /^#[0-9a-f]{3,8}$/i;
/** The theme's colours for the 3D scene, with the original ocean as the fallback. */
function useSceneColors() {
  const c = useXP().theme?.colors || {};
  const pick = (k: string, d: string) => (HEX.test(String(c[k] || '')) ? String(c[k]).slice(0, 7) : d);
  return {
    page: pick('page', '#02070A'),
    deep: pick('deep', '#082838'),
    accent: pick('accent', '#63E6FF'),
    accent2: pick('accent2', '#4BA3FF'),
    highlight: pick('highlight', '#D9F7FF'),
  };
}
const TMP_BG = new THREE.Color();

interface SceneProps {
  isMobile: boolean;
  reducedMotion: boolean;
  isSoftwareGl: boolean;
}

function getNormalizedScroll(): number {
  if (typeof window === 'undefined') return 0;
  const maxScroll = Math.max(
    1,
    document.documentElement.scrollHeight - window.innerHeight
  );
  return THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
}

function PlanktonField({
  count,
  reducedMotion,
}: {
  count: number;
  reducedMotion: boolean;
}) {
  const sc = useSceneColors();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color(sc.highlight),
      new THREE.Color(sc.accent),
      new THREE.Color(sc.accent2),
      new THREE.Color('#216B85'),
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Wide volume stretching in Z so descending through z=6 -> z=2.5 feels dense & continuous
      positions[i3] = (Math.random() - 0.5) * 18;
      positions[i3 + 1] = (Math.random() - 0.5) * 14;
      positions[i3 + 2] = Math.random() * 14 - 8; // -8 to +6

      // Varied particle sizes: mostly tiny suspended plankton, a few closer soft bokeh specks
      const tier = Math.random();
      sizes[i] =
        tier > 0.92
          ? 24 + Math.random() * 22
          : tier > 0.6
          ? 11 + Math.random() * 10
          : 5 + Math.random() * 6;

      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.25 + Math.random() * 0.65;

      const c = palette[Math.floor(Math.random() * palette.length)];
      const dim = 0.45 + Math.random() * 0.55;
      colors[i3] = c.r * dim;
      colors[i3 + 1] = c.g * dim;
      colors[i3 + 2] = c.b * dim;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uMotionScale: { value: reducedMotion ? 0.15 : 1.0 },
    }),
    [reducedMotion]
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const { gl } = useThree();

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    materialRef.current.uniforms.uPixelRatio.value = gl.getPixelRatio();
    materialRef.current.uniforms.uMotionScale.value = reducedMotion ? 0.12 : 1.0;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          attribute float aSize;
          attribute float aPhase;
          attribute float aSpeed;
          attribute vec3 aColor;

          uniform float uTime;
          uniform float uPixelRatio;
          uniform float uMotionScale;

          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            vColor = aColor;
            vec3 pos = position;

            float t = uTime * aSpeed * uMotionScale;
            // Slow buoyant vertical suspension + gentle ocean current drift
            pos.y = mod(pos.y + t * 0.14 + 7.0, 14.0) - 7.0;
            pos.x += sin(t * 0.45 + aPhase) * 0.35;
            pos.z += cos(t * 0.35 + aPhase * 1.3) * 0.25;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            float dist = max(0.8, -mvPosition.z);

            // Soft depth-based attenuation so distant particles are extremely faint
            float depthFade = smoothstep(14.0, 2.0, dist);
            float nearFade = smoothstep(0.4, 1.6, dist);
            float twinkle = 0.72 + 0.28 * sin(uTime * 0.8 + aPhase * 3.0);
            vAlpha = depthFade * nearFade * twinkle * 0.72;

            gl_PointSize = clamp((aSize * uPixelRatio) / dist, 1.2, 42.0);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float d = length(uv);
            if (d > 0.5) discard;

            // Soft organic plankton bokeh falloff (not harsh stars)
            float soft = pow(1.0 - d * 2.0, 2.2);
            gl_FragColor = vec4(vColor, soft * vAlpha);
          }
        `}
      />
    </points>
  );
}

function VolumetricSurfaceRays({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const rayMaterials = useRef<THREE.ShaderMaterial[]>([]);

  const rays = useMemo(
    () => [
      { pos: [-2.8, 5.2, -2.5] as [number, number, number], rotZ: -0.18, scale: [1.9, 12, 1.9] as [number, number, number], phase: 0.0 },
      { pos: [0.4, 5.6, -3.2] as [number, number, number], rotZ: 0.08, scale: [2.6, 13.5, 2.6] as [number, number, number], phase: 1.4 },
      { pos: [3.1, 5.0, -2.0] as [number, number, number], rotZ: 0.22, scale: [1.6, 11.5, 1.6] as [number, number, number], phase: 2.7 },
      { pos: [-0.9, 5.8, -0.8] as [number, number, number], rotZ: -0.06, scale: [2.1, 12.5, 2.1] as [number, number, number], phase: 4.1 },
    ],
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scroll = getNormalizedScroll();
    // Strongest at surface (scroll=0), fades out into deep water, softly returns near final emergence (scroll > 0.85)
    const surfaceFactor = Math.max(
      THREE.MathUtils.smoothstep(0.28, 0.0, scroll),
      THREE.MathUtils.smoothstep(0.84, 1.0, scroll) * 0.75
    );

    rayMaterials.current.forEach((mat, idx) => {
      if (!mat) return;
      mat.uniforms.uTime.value = reducedMotion ? 0 : t;
      mat.uniforms.uIntensity.value = surfaceFactor * (0.14 + (idx % 2) * 0.04);
    });

    if (groupRef.current && !reducedMotion) {
      groupRef.current.rotation.z = Math.sin(t * 0.12) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {rays.map((ray, i) => (
        <mesh key={i} position={ray.pos} rotation={[0, 0, ray.rotZ]} scale={ray.scale}>
          <cylinderGeometry args={[0.25, 1.5, 1, 24, 1, true]} />
          <shaderMaterial
            ref={(el) => {
              if (el) rayMaterials.current[i] = el;
            }}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            uniforms={{
              uTime: { value: 0 },
              uIntensity: { value: 0.14 },
              uPhase: { value: ray.phase },
              uColor: { value: new THREE.Color('#7CEBFF') },
            }}
            vertexShader={`
              varying vec2 vUv;
              varying vec3 vNormal;
              varying vec3 vViewPos;
              void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                vViewPos = -mv.xyz;
                gl_Position = projectionMatrix * mv;
              }
            `}
            fragmentShader={`
              uniform float uTime;
              uniform float uIntensity;
              uniform float uPhase;
              uniform vec3 uColor;
              varying vec2 vUv;
              varying vec3 vNormal;
              varying vec3 vViewPos;

              void main() {
                vec3 viewDir = normalize(vViewPos);
                float edgeSoft = pow(abs(dot(vNormal, viewDir)), 1.7);
                float verticalFade = smoothstep(0.0, 0.55, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
                float caustic = 0.8 + 0.2 * sin(vUv.x * 12.0 + uTime * 0.45 + uPhase);
                float alpha = edgeSoft * verticalFade * caustic * uIntensity;
                gl_FragColor = vec4(uColor, alpha);
              }
            `}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Composite multi-part procedural Abyssal Manta Ray / Giant Marine Creature
 * Appears gracefully during the Descent section (right side, deep atmospheric veil).
 */
function AbyssalManta({
  isMobile,
  reducedMotion,
}: {
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const wingMeshRef = useRef<THREE.Mesh>(null);
  const tailMeshRef = useRef<THREE.Mesh>(null);

  // Sculpted broad manta wing geometry (subdivided plane deformed into diamond/swept manta silhouette)
  const { wingGeo, basePositions, spineGeo, leftHornGeo, rightHornGeo, tailGeo, nodePositions } =
    useMemo(() => {
      // 1. Wing mantle
      const wGeo = new THREE.PlaneGeometry(5.6, 3.2, 42, 24);
      wGeo.rotateX(-Math.PI / 2);
      const pos = wGeo.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); // -2.8 .. 2.8 (wing span)
        const z = pos.getZ(i); // -1.6 .. 1.6 (nose to rear)
        const nx = Math.abs(x) / 2.8; // 0 at spine, 1 at wingtip
        const nz = z / 1.6; // -1 at front, +1 at back

        // Taper chord width smoothly toward wingtips and sweep tips backward
        const chordScale = Math.pow(1 - nx, 0.62) * 0.92 + 0.08;
        const sweptZ = z * chordScale + Math.pow(nx, 1.45) * 0.95;

        // Thick organic central body tapering smoothly to razor-thin wing edges
        const bodyArch =
          Math.exp(-nx * nx * 6.5) *
          Math.max(0, 1 - nz * nz * 0.75) *
          0.26;
        const wingCamber = Math.sin(nx * Math.PI) * 0.14;

        pos.setZ(i, sweptZ);
        pos.setY(i, bodyArch + wingCamber);
      }
      wGeo.computeVertexNormals();
      const basePos = new Float32Array(pos.array);

      // 2. Central dorsal spine keel
      const spineCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.16, -1.42),
        new THREE.Vector3(0, 0.31, -0.55),
        new THREE.Vector3(0, 0.24, 0.45),
        new THREE.Vector3(0, 0.08, 1.35),
      ]);
      const sGeo = new THREE.TubeGeometry(spineCurve, 28, 0.11, 12, false);

      // 3 & 4. Forward cephalic lobes
      const hornLeftCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.34, 0.08, -1.2),
        new THREE.Vector3(-0.56, 0.04, -1.68),
        new THREE.Vector3(-0.42, -0.02, -2.05),
      ]);
      const hornRightCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.34, 0.08, -1.2),
        new THREE.Vector3(0.56, 0.04, -1.68),
        new THREE.Vector3(0.42, -0.02, -2.05),
      ]);
      const lHorn = new THREE.TubeGeometry(hornLeftCurve, 18, 0.07, 10, false);
      const rHorn = new THREE.TubeGeometry(hornRightCurve, 18, 0.07, 10, false);

      // 5. Long whip tail
      const tailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.08, 1.25),
        new THREE.Vector3(0.06, 0.02, 2.2),
        new THREE.Vector3(-0.08, -0.05, 3.2),
        new THREE.Vector3(0.04, -0.08, 4.2),
      ]);
      const tGeo = new THREE.TubeGeometry(tailCurve, 32, 0.032, 8, false);

      // 6. Bioluminescent dorsal ridge nodes
      const nodes: [number, number, number][] = [
        [0, 0.34, -0.7],
        [0, 0.33, -0.2],
        [0, 0.29, 0.3],
        [0, 0.21, 0.8],
        [-0.75, 0.22, -0.35],
        [0.75, 0.22, -0.35],
        [-1.35, 0.17, 0.1],
        [1.35, 0.17, 0.1],
      ];

      return {
        wingGeo: wGeo,
        basePositions: basePos,
        spineGeo: sGeo,
        leftHornGeo: lHorn,
        rightHornGeo: rHorn,
        tailGeo: tGeo,
        nodePositions: nodes,
      };
    }, []);

  useEffect(() => {
    return () => {
      wingGeo.dispose();
      spineGeo.dispose();
      leftHornGeo.dispose();
      rightHornGeo.dispose();
      tailGeo.dispose();
    };
  }, [wingGeo, spineGeo, leftHornGeo, rightHornGeo, tailGeo]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    const scroll = getNormalizedScroll();

    // Visible primarily during Descent (~0.06 to 0.34)
    const descentPresence =
      THREE.MathUtils.smoothstep(scroll, 0.03, 0.13) *
      (1 - THREE.MathUtils.smoothstep(scroll, 0.24, 0.38));

    groupRef.current.visible = descentPresence > 0.01;
    if (!groupRef.current.visible) return;

    // Position on right: ~8% from right edge, top ~30% in Descent framing
    const targetX = (isMobile ? 0.55 : 1.75) + (reducedMotion ? 0 : Math.sin(t * 0.18) * 0.22);
    const targetY =
      (isMobile ? 0.35 : 0.22) +
      (0.16 - scroll) * 4.5 +
      (reducedMotion ? 0 : Math.sin(t * 0.42) * 0.16);
    const targetZ = THREE.MathUtils.lerp(-3.2, -0.9, descentPresence);

    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 3, delta);
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 3, delta);
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 3, delta);

    const scaleBase = (isMobile ? 0.46 : 0.78) * (0.85 + descentPresence * 0.15);
    groupRef.current.scale.setScalar(scaleBase);

    // Slow, dignified underwater glide orientation
    groupRef.current.rotation.set(
      0.34 + (reducedMotion ? 0 : Math.sin(t * 0.32) * 0.05),
      -0.62 + (reducedMotion ? 0 : Math.cos(t * 0.21) * 0.08),
      0.18 + (reducedMotion ? 0 : Math.sin(t * 0.27) * 0.06)
    );

    // Wingbeat undulation (subtle, organic, non-distracting)
    if (!reducedMotion && wingMeshRef.current) {
      const posAttr = wingMeshRef.current.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const bx = basePositions[i * 3];
        const by = basePositions[i * 3 + 1];
        const bz = basePositions[i * 3 + 2];
        const dist = Math.abs(bx) / 2.8;
        const wave = Math.sin(t * 1.15 - dist * 2.4 - bz * 0.6) * Math.pow(dist, 1.35) * 0.58;
        posAttr.setY(i, by + wave);
      }
      posAttr.needsUpdate = true;
      wingMeshRef.current.geometry.computeVertexNormals();
    }

    if (!reducedMotion && tailMeshRef.current) {
      tailMeshRef.current.rotation.y = Math.sin(t * 1.15 - 1.2) * 0.14;
      tailMeshRef.current.rotation.x = Math.cos(t * 0.9) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[1.8, 0.2, -2.6]}>
      {/* Main sculpted wing mantle */}
      <mesh ref={wingMeshRef} geometry={wingGeo}>
        <meshStandardMaterial
          color="#092534"
          emissive="#0A3A52"
          emissiveIntensity={0.42}
          roughness={0.32}
          metalness={0.38}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dorsal spine keel */}
      <mesh geometry={spineGeo}>
        <meshStandardMaterial
          color="#0D364A"
          emissive="#145873"
          emissiveIntensity={0.38}
          roughness={0.22}
          metalness={0.62}
        />
      </mesh>

      {/* Forward cephalic lobes */}
      <mesh geometry={leftHornGeo}>
        <meshStandardMaterial color="#0A2B3D" roughness={0.3} metalness={0.45} />
      </mesh>
      <mesh geometry={rightHornGeo}>
        <meshStandardMaterial color="#0A2B3D" roughness={0.3} metalness={0.45} />
      </mesh>

      {/* Trailing whip tail */}
      <mesh ref={tailMeshRef} geometry={tailGeo}>
        <meshStandardMaterial
          color="#08212E"
          emissive="#1D6D8C"
          emissiveIntensity={0.25}
          roughness={0.45}
          metalness={0.35}
        />
      </mesh>

      {/* Faint bioluminescent dorsal ridge nodes */}
      {nodePositions.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <sphereGeometry args={[0.026, 10, 10]} />
          <meshBasicMaterial color="#63E6FF" transparent opacity={0.65} />
        </mesh>
      ))}
    </group>
  );
}

function UnderwaterRig({ isMobile, reducedMotion }: SceneProps) {
  const { camera, scene } = useThree();
  const data = useXP();
  const ocean = data.ocean || {};
  const sc = useSceneColors();
  const parallaxScale = Math.max(0, Number(ocean.parallax ?? 1));
  const fogScale = Math.max(0.1, Number(ocean.fog ?? 1));
  const pointerRef = useRef({ x: 0, y: 0 });
  const fogRef = useRef<THREE.FogExp2 | null>(null);

  useEffect(() => {
    scene.background = new THREE.Color(sc.page);
    const fog = new THREE.FogExp2(sc.page, 0.085);
    scene.fog = fog;
    fogRef.current = fog;
  }, [scene, sc.page]);

  useEffect(() => {
    if (reducedMotion) return;
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [reducedMotion]);

  useFrame((state, delta) => {
    const scroll = getNormalizedScroll();

    // Camera Z progression: Hero 6.0 -> Descent 4.5 -> Deep 3.0 -> Surface emergence 4.2
    let targetZ = 6.0;
    let targetY = 0;
    if (scroll < 0.25) {
      const p = scroll / 0.25;
      targetZ = THREE.MathUtils.lerp(6.0, 3.0, p);
      targetY = THREE.MathUtils.lerp(0.0, -0.65, p);
    } else if (scroll < 0.8) {
      const p = (scroll - 0.25) / 0.55;
      targetZ = THREE.MathUtils.lerp(3.0, 2.5, p);
      targetY = THREE.MathUtils.lerp(-0.65, -0.85, p);
    } else {
      const p = (scroll - 0.8) / 0.2;
      targetZ = THREE.MathUtils.lerp(2.5, 4.1, p);
      targetY = THREE.MathUtils.lerp(-0.85, 0.25, p);
    }

    const idleBreath = reducedMotion
      ? 0
      : Math.sin(state.clock.getElapsedTime() * 0.35) * 0.04;

    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 3.5, delta);
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      targetY + idleBreath,
      3.5,
      delta
    );

    // Restrained pointer parallax
    const parallaxAmp = (reducedMotion ? 0 : isMobile ? 0.012 : 0.042) * parallaxScale;
    const targetRotY = -pointerRef.current.x * parallaxAmp;
    const targetRotX = -pointerRef.current.y * parallaxAmp * 0.7;

    camera.rotation.y = THREE.MathUtils.damp(camera.rotation.y, targetRotY, 4.0, delta);
    camera.rotation.x = THREE.MathUtils.damp(camera.rotation.x, targetRotX, 4.0, delta);

    // Subtle fog density shift as user descends
    if (fogRef.current) {
      const targetDensity =
        scroll < 0.35
          ? THREE.MathUtils.lerp(0.075, 0.135, scroll / 0.35)
          : scroll > 0.82
          ? THREE.MathUtils.lerp(0.135, 0.07, (scroll - 0.82) / 0.18)
          : 0.135;
      fogRef.current.density = THREE.MathUtils.damp(
        fogRef.current.density,
        targetDensity * fogScale,
        3.0,
        delta
      );
    }

    // Keep background deep ocean dark with subtle luminous rise near surface contact section
    if (scene.background instanceof THREE.Color) {
      const bgTarget = TMP_BG.set(sc.page);
      if (scroll > 0.84) bgTarget.lerp(new THREE.Color(sc.deep), (scroll - 0.84) / 0.16);
      scene.background.lerp(bgTarget, Math.min(1, delta * 3));
      if (fogRef.current) {
        fogRef.current.color.copy(scene.background);
      }
    }
  });

  const full = Math.round(Math.min(3000, Math.max(0, Number(ocean.particles ?? 1000))));
  const particleCount = isMobile ? Math.round(full * 0.34) : full;

  return (
    <>
      {/* Overhead sunlight penetrating from ocean surface */}
      <hemisphereLight args={[sc.highlight, sc.page, 0.85]} />
      <directionalLight position={[2, 12, 4]} intensity={1.8} color={sc.highlight} />
      <pointLight position={[0, 8, 2]} intensity={14} distance={24} color={sc.accent} />
      <pointLight position={[-4, -2, -3]} intensity={5} distance={18} color={sc.accent2} />

      <VolumetricSurfaceRays reducedMotion={reducedMotion} />
      {particleCount > 0 && <PlanktonField key={`${particleCount}${sc.accent}${sc.accent2}${sc.highlight}`} count={particleCount} reducedMotion={reducedMotion} />}
      {ocean.manta !== false && <AbyssalManta isMobile={isMobile} reducedMotion={reducedMotion} />}
    </>
  );
}

export function OceanScene() {
  const isMobile = useIsMobile(768);
  const reducedMotion = useReducedMotionPreference();
  const isSoftwareGl = useMemo(() => detectSoftwareGl(), []);
  const [contextLost, setContextLost] = useState(false);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 80% 55% at 50% 0%, color-mix(in srgb, var(--c-accent) 10%, transparent) 0%, color-mix(in srgb, var(--c-surface) 45%, transparent) 45%, var(--c-page) 100%)',
      }}
    >
      {!contextLost && (
        <Canvas
          dpr={isSoftwareGl ? 1 : isMobile ? [1, 1.5] : [1, 2]}
          camera={{ position: [0, 0, 6], fov: 48, near: 0.1, far: 60 }}
          gl={{
            antialias: !isSoftwareGl,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          onCreated={({ gl }) => {
            const dom = gl.domElement;
            dom.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setContextLost(true);
            });
            dom.addEventListener('webglcontextrestored', () => {
              setContextLost(false);
            });
          }}
        >
          <UnderwaterRig
            isMobile={isMobile}
            reducedMotion={reducedMotion}
            isSoftwareGl={isSoftwareGl}
          />
        </Canvas>
      )}
    </div>
  );
}
