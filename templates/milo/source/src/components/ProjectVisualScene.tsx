import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** Drag to orbit and scroll to zoom, using three's own controls. */
function OrbitControls({ autoRotate, enableDamping }: { autoRotate: boolean; enableDamping: boolean }) {
  const { camera, gl } = useThree();
  const controls = useMemo(() => new ThreeOrbitControls(camera, gl.domElement), [camera, gl]);
  useEffect(() => {
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 2.5;
    controls.maxDistance = 7;
    controls.dampingFactor = 0.06;
    controls.autoRotateSpeed = 0.55;
    return () => controls.dispose();
  }, [controls]);
  useEffect(() => {
    controls.enableDamping = enableDamping;
    controls.autoRotate = autoRotate;
  }, [controls, autoRotate, enableDamping]);
  useFrame(() => controls.update());
  return null;
}
import { ProjectVisualType } from '../data/portfolioData';
import { useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { detectSoftwareGl } from '../utils/webgl';

function StudioEnv() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const envTarget = pmrem.fromScene(room, 0.04);
    scene.environment = envTarget.texture;
    room.dispose();
    pmrem.dispose();

    return () => {
      scene.environment = null;
      envTarget.dispose();
    };
  }, [gl, scene]);

  return null;
}

function AbyssWorld({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const bellRef = useRef<THREE.Mesh>(null);
  const sporesRef = useRef<THREE.Points>(null);

  const { bellGeo, tendrilGeos, sporeGeo } = useMemo(() => {
    // 1. Sculpted translucent jellyfish/coral bell via LatheGeometry
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const r = Math.sin(t * Math.PI * 0.72) * 1.15;
      const y = Math.cos(t * Math.PI * 0.78) * 0.85 - 0.1;
      profile.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    const bGeo = new THREE.LatheGeometry(profile, 42);

    // 2. 10 graceful organic tendrils
    const tGeos: THREE.TubeGeometry[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const radius = 0.25 + (i % 3) * 0.22;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 5; s++) {
        const st = s / 5;
        const spread = 1 + st * 0.65;
        pts.push(
          new THREE.Vector3(
            Math.cos(angle + st * 0.4) * radius * spread,
            0.1 - st * (1.85 + (i % 2) * 0.45),
            Math.sin(angle + st * 0.4) * radius * spread
          )
        );
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      tGeos.push(new THREE.TubeGeometry(curve, 24, 0.018 + (i % 2) * 0.008, 8, false));
    }

    // 3. Bioluminescent spore cloud
    const count = 180;
    const sGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5.2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4.2;
    }
    sGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    return { bellGeo: bGeo, tendrilGeos: tGeos, sporeGeo: sGeo };
  }, []);

  useEffect(() => {
    return () => {
      bellGeo.dispose();
      tendrilGeos.forEach((g) => g.dispose());
      sporeGeo.dispose();
    };
  }, [bellGeo, tendrilGeos, sporeGeo]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = reducedMotion ? 0.3 : t * 0.14;
      groupRef.current.position.y = reducedMotion ? 0.15 : 0.15 + Math.sin(t * 0.75) * 0.16;
    }
    if (bellRef.current && !reducedMotion) {
      const pulse = 1 + Math.sin(t * 1.6) * 0.055;
      bellRef.current.scale.set(pulse, 1 / Math.sqrt(pulse), pulse);
    }
    if (sporesRef.current && !reducedMotion) {
      sporesRef.current.rotation.y = -t * 0.04;
    }
  });

  return (
    <>
      <color attach="background" args={['#020B12']} />
      <fogExp2 attach="fog" args={['#020B12', 0.14]} />
      <hemisphereLight args={['#63E6FF', '#02070A', 0.7]} />
      <pointLight position={[0, 0.3, 0]} intensity={10} distance={7} color="#63E6FF" />
      <directionalLight position={[3, 5, 2]} intensity={1.2} color="#D9F7FF" />

      <group ref={groupRef}>
        <mesh ref={bellRef} geometry={bellGeo}>
          <meshPhysicalMaterial
            color="#0B3B54"
            emissive="#1CA9CC"
            emissiveIntensity={0.45}
            roughness={0.18}
            metalness={0.15}
            clearcoat={0.9}
            transparent
            opacity={0.78}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Inner bioluminescent core */}
        <mesh position={[0, -0.05, 0]}>
          <sphereGeometry args={[0.38, 24, 24]} />
          <meshStandardMaterial
            color="#63E6FF"
            emissive="#63E6FF"
            emissiveIntensity={1.6}
            roughness={0.2}
          />
        </mesh>

        {tendrilGeos.map((geo, i) => (
          <mesh key={i} geometry={geo}>
            <meshStandardMaterial
              color="#0E4A66"
              emissive={i % 2 === 0 ? '#63E6FF' : '#4BA3FF'}
              emissiveIntensity={0.55}
              roughness={0.35}
              transparent
              opacity={0.85}
            />
          </mesh>
        ))}
      </group>

      <points ref={sporesRef} geometry={sporeGeo}>
        <pointsMaterial
          color="#63E6FF"
          size={0.045}
          transparent
          opacity={0.65}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  );
}

function OrbitalWorld({ reducedMotion }: { reducedMotion: boolean }) {
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const monolithGroupRef = useRef<THREE.Group>(null);
  const dustRef = useRef<THREE.Points>(null);

  const dustGeo = useMemo(() => {
    const count = 220;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.6 + Math.random() * 2.2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.6;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useEffect(() => {
    return () => dustGeo.dispose();
  }, [dustGeo]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (reducedMotion) return;
    if (ringARef.current) {
      ringARef.current.rotation.z = t * 0.18;
      ringARef.current.rotation.x = 0.72 + Math.sin(t * 0.3) * 0.06;
    }
    if (ringBRef.current) {
      ringBRef.current.rotation.z = -t * 0.14;
      ringBRef.current.rotation.y = 0.4 + Math.cos(t * 0.25) * 0.08;
    }
    if (monolithGroupRef.current) {
      monolithGroupRef.current.rotation.y = t * 0.12;
    }
    if (dustRef.current) {
      dustRef.current.rotation.y = t * 0.05;
    }
  });

  const satellites = useMemo(
    () => [
      { pos: [1.85, 0.25, 0] as [number, number, number], scale: [0.12, 0.45, 0.12] as [number, number, number] },
      { pos: [-1.7, -0.3, 0.6] as [number, number, number], scale: [0.16, 0.32, 0.16] as [number, number, number] },
      { pos: [0.2, 0.45, -1.9] as [number, number, number], scale: [0.1, 0.5, 0.1] as [number, number, number] },
    ],
    []
  );

  return (
    <>
      <color attach="background" args={['#020508']} />
      <fogExp2 attach="fog" args={['#020508', 0.11]} />
      <StudioEnv />
      <directionalLight position={[4, 6, 4]} intensity={2.0} color="#D9F7FF" />
      <pointLight position={[-3, -2, 3]} intensity={9} distance={12} color="#4BA3FF" />

      {/* Planetary mineral core */}
      <mesh>
        <icosahedronGeometry args={[0.78, 3]} />
        <meshStandardMaterial
          color="#0F1C26"
          roughness={0.28}
          metalness={0.88}
        />
      </mesh>

      {/* Outer brushed titanium orbital rings */}
      <mesh ref={ringARef} rotation={[0.72, 0.25, 0]}>
        <torusGeometry args={[1.45, 0.045, 24, 96]} />
        <meshPhysicalMaterial
          color="#A6C8DC"
          metalness={0.95}
          roughness={0.16}
          anisotropy={0.8}
        />
      </mesh>

      <mesh ref={ringBRef} rotation={[-0.55, 0.4, 0.3]}>
        <torusGeometry args={[1.82, 0.024, 20, 96]} />
        <meshPhysicalMaterial
          color="#4BA3FF"
          emissive="#14497A"
          emissiveIntensity={0.45}
          metalness={0.9}
          roughness={0.18}
        />
      </mesh>

      <group ref={monolithGroupRef}>
        {satellites.map((sat, idx) => (
          <mesh key={idx} position={sat.pos} scale={sat.scale} rotation={[0.2 * idx, idx, 0.15]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#8EBAD1" metalness={0.92} roughness={0.2} />
          </mesh>
        ))}
      </group>

      <points ref={dustRef} geometry={dustGeo} rotation={[0.35, 0, 0.2]}>
        <pointsMaterial color="#8CD4FF" size={0.03} transparent opacity={0.55} sizeAttenuation />
      </points>
    </>
  );
}

function TidelineWorld({ reducedMotion }: { reducedMotion: boolean }) {
  const planeRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const { waveGeo, baseZ } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(8.5, 8.5, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const base = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      base[i * 2] = pos.getX(i);
      base[i * 2 + 1] = pos.getZ(i);
    }
    return { waveGeo: geo, baseZ: base };
  }, []);

  useEffect(() => {
    return () => waveGeo.dispose();
  }, [waveGeo]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (planeRef.current) {
      const pos = planeRef.current.geometry.attributes.position;
      const timeVal = reducedMotion ? 0.5 : t;
      for (let i = 0; i < pos.count; i++) {
        const x = baseZ[i * 2];
        const z = baseZ[i * 2 + 1];
        const y =
          Math.sin(x * 1.15 + timeVal * 0.9) * 0.22 +
          Math.cos(z * 1.35 - timeVal * 0.7) * 0.18 +
          Math.sin((x + z) * 0.8 + timeVal * 1.2) * 0.1;
        pos.setY(i, y - 0.55);
      }
      pos.needsUpdate = true;
      planeRef.current.geometry.computeVertexNormals();
    }

    if (ringRef.current && !reducedMotion) {
      ringRef.current.rotation.y = t * 0.22;
      ringRef.current.position.y = 0.55 + Math.sin(t * 0.8) * 0.09;
    }
  });

  return (
    <>
      <color attach="background" args={['#030E14']} />
      <fogExp2 attach="fog" args={['#030E14', 0.14]} />
      <StudioEnv />
      <directionalLight position={[-3, 6, 3]} intensity={2.2} color="#D9F7FF" />
      <pointLight position={[2, 3, -1]} intensity={10} distance={14} color="#63E6FF" />

      <mesh ref={planeRef} geometry={waveGeo}>
        <meshPhysicalMaterial
          color="#092A38"
          metalness={0.86}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>

      <mesh ref={ringRef} position={[0, 0.55, 0]} rotation={[0.45, 0.3, 0]}>
        <torusGeometry args={[0.92, 0.08, 28, 96]} />
        <meshPhysicalMaterial
          color="#D9F7FF"
          metalness={0.95}
          roughness={0.08}
          clearcoat={1}
        />
      </mesh>
    </>
  );
}

function EchoWorld({ reducedMotion }: { reducedMotion: boolean }) {
  const ringsRef = useRef<THREE.Group>(null);
  const ribbonRef = useRef<THREE.Mesh>(null);

  const ribbonGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          Math.sin(a) * 1.15 + Math.sin(a * 3) * 0.22,
          Math.sin(a * 2) * 0.45,
          Math.cos(a) * 1.15 + Math.cos(a * 3) * 0.22
        )
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    return new THREE.TubeGeometry(curve, 128, 0.028, 12, true);
  }, []);

  useEffect(() => {
    return () => ribbonGeo.dispose();
  }, [ribbonGeo]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (reducedMotion) return;

    if (ringsRef.current) {
      ringsRef.current.children.forEach((child, idx) => {
        const wave = Math.sin(t * 1.6 - idx * 0.45);
        child.scale.setScalar(1 + wave * 0.06);
        child.position.y = wave * 0.14;
      });
    }
    if (ribbonRef.current) {
      ribbonRef.current.rotation.y = t * 0.24;
      ribbonRef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
    }
  });

  const ringRadii = useMemo(() => [0.55, 0.85, 1.15, 1.45, 1.75, 2.05], []);

  return (
    <>
      <color attach="background" args={['#02070A']} />
      <fogExp2 attach="fog" args={['#02070A', 0.13]} />
      <hemisphereLight args={['#63E6FF', '#02070A', 0.7]} />
      <pointLight position={[0, 1.5, 2]} intensity={12} distance={12} color="#63E6FF" />

      <group ref={ringsRef} rotation={[0.45, 0, 0]}>
        {ringRadii.map((radius, idx) => (
          <mesh key={idx} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.014, 16, 84]} />
            <meshStandardMaterial
              color="#63E6FF"
              emissive="#63E6FF"
              emissiveIntensity={0.85 - idx * 0.1}
              transparent
              opacity={0.9 - idx * 0.11}
            />
          </mesh>
        ))}
      </group>

      <mesh ref={ribbonRef} geometry={ribbonGeo}>
        <meshStandardMaterial
          color="#D9F7FF"
          emissive="#4BA3FF"
          emissiveIntensity={0.9}
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>
    </>
  );
}

interface ProjectVisualSceneProps {
  visualType: ProjectVisualType;
  active?: boolean;
  interactiveOrbit?: boolean;
  className?: string;
}

export function ProjectVisualScene({
  visualType,
  active = true,
  interactiveOrbit = false,
  className = 'w-full h-full',
}: ProjectVisualSceneProps) {
  const reducedMotion = useReducedMotionPreference();
  const isSoftwareGl = useMemo(() => detectSoftwareGl(), []);
  const [contextLost, setContextLost] = useState(false);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background:
          'radial-gradient(circle at 50% 35%, rgba(99, 230, 255, 0.14) 0%, #041319 52%, #02070A 100%)',
      }}
    >
      {!contextLost && (
        <Canvas
          frameloop={active ? 'always' : 'demand'}
          dpr={isSoftwareGl ? 1 : [1, 1.5]}
          camera={{ position: [0, 0.45, 4.4], fov: 42, near: 0.1, far: 40 }}
          gl={{
            antialias: !isSoftwareGl,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.08,
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
          {visualType === 'abyss' && <AbyssWorld reducedMotion={reducedMotion} />}
          {visualType === 'orbital' && <OrbitalWorld reducedMotion={reducedMotion} />}
          {visualType === 'tideline' && <TidelineWorld reducedMotion={reducedMotion} />}
          {visualType === 'echo' && <EchoWorld reducedMotion={reducedMotion} />}

          {interactiveOrbit && (
            <OrbitControls
              enableDamping={!isSoftwareGl}
              autoRotate={!reducedMotion && !isSoftwareGl}
            />
          )}
        </Canvas>
      )}
    </div>
  );
}
