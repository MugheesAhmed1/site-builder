import {
  BH,
  FLAVOURS,
  FONTS,
  PACK,
  SHEET_URL,
  clamp,
  mixHex,
  seededRand,
  type FlavourSpec,
} from './strideData';

export interface BarPose {
  x: number;
  y: number;
  h: number;
  rz: number;
  ry: number;
  rx: number;
  z: number;
  op: number;
  sx: number;
  sy: number;
  shadow: number;
}

export interface BarInstance {
  group: import('three').Group;
  frontMesh: import('three').Mesh;
  backMesh: import('three').Mesh;
  frontMat: import('three').MeshPhysicalMaterial;
  backMat: import('three').MeshPhysicalMaterial;
  shadowMesh: import('three').Mesh;
  shadowMat: import('three').MeshBasicMaterial;
  flavourIdx: number;
  slotOffset: number;
}

export interface Stride3DEngine {
  isSoftwareGl: boolean;
  cameraD: number;
  pool: BarInstance[];
  traveller: BarInstance;
  updateSize: (vw: number, vh: number) => number;
  placeBar: (bar: BarInstance, pose: BarPose, vw: number, vh: number) => void;
  setBarFlavour: (bar: BarInstance, flavourIdx: number) => void;
  raycastPool: (clientX: number, clientY: number, vw: number, vh: number) => BarInstance | null;
  render: () => void;
  afterDraw: (cb: () => void) => number;
  dispose: () => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function buildBarGeometries(THREE: typeof import('three')) {
  const segX = 30;
  const segY = 64;
  const CR = 0.062;

  const computeZ = (u: number, v: number) => {
    const ex = Math.abs(2 * u - 1);
    const ev = Math.min(v, 1 - v);
    if (ev < CR) {
      return 0.006 + 0.006 * Math.abs(Math.sin(u * Math.PI * 34));
    }
    const across = Math.pow(Math.max(0, 1 - Math.pow(ex, 2.6)), 0.62);
    const along = Math.pow(clamp((ev - CR) / 0.11, 0, 1), 0.7);
    return 0.012 + 0.118 * across * along + 0.004 * Math.sin(23 * u + 31 * v) * across;
  };

  const frontGeo = new THREE.PlaneGeometry(1, BH, segX, segY);
  const fPos = frontGeo.attributes.position;
  const fUv = frontGeo.attributes.uv;
  for (let i = 0; i < fPos.count; i++) {
    const u = fUv.getX(i);
    const v = fUv.getY(i);
    fPos.setZ(i, computeZ(u, v));
  }
  fPos.needsUpdate = true;
  frontGeo.computeVertexNormals();

  const backGeo = new THREE.PlaneGeometry(1, BH, segX, segY);
  const bPos = backGeo.attributes.position;
  const bUv = backGeo.attributes.uv;
  for (let i = 0; i < bPos.count; i++) {
    const u = bUv.getX(i);
    const v = bUv.getY(i);
    bPos.setZ(i, -computeZ(u, v));
    bUv.setX(i, 1 - u);
  }
  const index = backGeo.getIndex();
  if (index) {
    const arr = index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const tmp = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = tmp;
    }
    index.needsUpdate = true;
  }
  bPos.needsUpdate = true;
  bUv.needsUpdate = true;
  backGeo.computeVertexNormals();

  return { frontGeo, backGeo };
}

function createShadowTexture(THREE: typeof import('three')) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.save();
  ctx.translate(128, 256);
  ctx.scale(1, 2);
  const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
  grad.addColorStop(0, 'rgba(30,18,40,.55)');
  grad.addColorStop(0.55, 'rgba(30,18,40,.24)');
  grad.addColorStop(1, 'rgba(30,18,40,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createPlaceholderTextures(
  THREE: typeof import('three'),
  flav: FlavourSpec
): { front: import('three').CanvasTexture; back: import('three').CanvasTexture } {
  const W = 128;
  const H = Math.round(W * BH);
  const fc = document.createElement('canvas');
  fc.width = W;
  fc.height = H;
  const fctx = fc.getContext('2d')!;
  fctx.fillStyle = flav.color;
  fctx.fillRect(0, 0, W, H);
  const front = new THREE.CanvasTexture(fc);
  front.colorSpace = THREE.SRGBColorSpace;

  const bc = document.createElement('canvas');
  bc.width = W;
  bc.height = H;
  const bctx = bc.getContext('2d')!;
  bctx.fillStyle = flav.color;
  bctx.fillRect(0, 0, W, H);
  const back = new THREE.CanvasTexture(bc);
  back.colorSpace = THREE.SRGBColorSpace;
  return { front, back };
}

function buildFlavourTexturesFromSheet(
  THREE: typeof import('three'),
  img: HTMLImageElement,
  flav: FlavourSpec,
  anisotropy: number
): { front: import('three').CanvasTexture; back: import('three').CanvasTexture } {
  const [bx, by, bw, bh] = flav.box;
  const scale = (img.naturalWidth || 2200) / 2688;
  const sx = (bx - 4) * scale;
  const sy = (by - 4) * scale;
  const sw = (bw + 8) * scale;
  const sh = (bh + 8) * scale;

  const W = Math.round((bw + 8) * 1.5 * 0.75);
  const H = Math.round(W * BH);

  // Front canvas
  const fc = document.createElement('canvas');
  fc.width = W;
  fc.height = H;
  const fctx = fc.getContext('2d')!;
  fctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  const front = new THREE.CanvasTexture(fc);
  front.colorSpace = THREE.SRGBColorSpace;
  front.anisotropy = anisotropy;

  // Back canvas
  const bc = document.createElement('canvas');
  bc.width = W;
  bc.height = H;
  const ctx = bc.getContext('2d')!;

  // 1. Draw horizontally mirrored crop
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  ctx.restore();

  // 2. source-atop flavour colour fill
  const sealH = H * 0.075;
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = flav.color;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, sealH, W, H - 2 * sealH);
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, 0, W, sealH);
  ctx.fillRect(0, H - sealH, W, sealH);

  // 3. Horizontal sheen gradient over the body
  ctx.globalAlpha = 1;
  const sheen = ctx.createLinearGradient(0, 0, W, 0);
  sheen.addColorStop(0, 'rgba(0,0,0,.10)');
  sheen.addColorStop(0.28, 'rgba(255,255,255,.14)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.8, 'rgba(0,0,0,.04)');
  sheen.addColorStop(1, 'rgba(0,0,0,.14)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, sealH, W, H - 2 * sealH);

  // 4. Text and panels inside silhouette
  const ink = mixHex(flav.color, '#1c1a1f', 0.78);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // STRIDE title
  ctx.font = `400 ${0.085 * W}px "${FONTS.display}", sans-serif`;
  ctx.fillText(PACK.brand, W * 0.5, H * 0.15);

  // Flavour · 50 G
  ctx.font = `500 ${0.042 * W}px "${FONTS.mono}", monospace`;
  ctx.fillText(PACK.weight ? `${flav.name.toUpperCase()} · ${PACK.weight}` : flav.name.toUpperCase(), W * 0.5, H * 0.185);

  // Nutrition panel
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  drawRoundedRect(ctx, W * 0.15, H * 0.215, W * 0.7, H * 0.36, W * 0.03);
  ctx.fill();

  const padL = W * 0.195;
  const padR = W * 0.805;
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `400 ${0.058 * W}px "${FONTS.display}", sans-serif`;
  ctx.fillText(PACK.nutritionTitle, padL, H * 0.233);

  ctx.font = `400 ${0.032 * W}px "${FONTS.mono}", monospace`;
  ctx.globalAlpha = 0.82;
  ctx.fillText(PACK.serving, padL, H * 0.268);
  ctx.globalAlpha = 1;

  // Solid rule
  ctx.fillRect(padL, H * 0.296, padR - padL, Math.max(2, W * 0.005));

  const rows: Array<[string, string, boolean]> = PACK.nutrition;

  rows.forEach(([label, val, bold], idx) => {
    const ry = H * 0.315 + idx * (H * 0.034);
    ctx.font = `${bold ? 500 : 400} ${0.033 * W}px "${FONTS.mono}", monospace`;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.fillText(label, padL, ry);
    ctx.textAlign = 'right';
    ctx.fillText(val, padR, ry);

    // Hairline
    ctx.globalAlpha = 0.18;
    ctx.fillRect(padL, ry + H * 0.025, padR - padL, 1);
  });

  // Ingredients
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `500 ${0.036 * W}px "${FONTS.mono}", monospace`;
  ctx.fillText(PACK.ingredientsTitle, W * 0.15, H * 0.62);

  ctx.font = `400 ${0.034 * W}px "${FONTS.mono}", monospace`;
  const words = flav.ingredients.split(' ');
  const maxWidth = W * 0.7;
  let line = '';
  let lineY = H * 0.648;
  const lineStep = H * 0.022;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, W * 0.15, lineY);
      line = words[i];
      lineY += lineStep;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, W * 0.15, lineY);

  // Barcode white card at 73.5% height
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  drawRoundedRect(ctx, W * 0.22, H * 0.735, W * 0.56, H * 0.112, W * 0.024);
  ctx.fill();

  const rand = seededRand(101 + flav.id * 97);
  const bx0 = W * 0.27;
  const bwTotal = W * 0.46;
  const barTop = H * 0.75;
  const barH = H * 0.064;
  ctx.fillStyle = ink;
  let curX = bx0;
  while (curX < bx0 + bwTotal - 2) {
    const barW = (0.005 + rand() * 0.013) * W;
    const gap = (0.005 + rand() * 0.011) * W;
    if (curX + barW <= bx0 + bwTotal) {
      ctx.fillRect(curX, barTop, barW, barH);
    }
    curX += barW + gap;
  }
  ctx.font = `400 ${0.026 * W}px "${FONTS.mono}", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`${PACK.barcode}${flav.id + 1}8`, W * 0.5, H * 0.822);

  // Footer
  ctx.font = `500 ${0.034 * W}px "${FONTS.mono}", monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillText(PACK.slogan, W * 0.5, H * 0.885);

  ctx.globalCompositeOperation = 'source-over';
  const back = new THREE.CanvasTexture(bc);
  back.colorSpace = THREE.SRGBColorSpace;
  back.anisotropy = anisotropy;

  return { front, back };
}

export async function createStride3DEngine(
  canvas: HTMLCanvasElement,
  onTexturesReady?: () => void
): Promise<Stride3DEngine> {
  const [THREE, { RoomEnvironment }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/environments/RoomEnvironment.js'),
  ]);

  const isSoftwareGl = detectSoftwareWebGL();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isSoftwareGl,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTarget = pmrem.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  roomEnv.dispose();
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(-0.6, 0.9, 1.4);
  scene.add(keyLight);

  const camera = new THREE.PerspectiveCamera(40, 1, 10, 8000);
  let cameraD = 1500;

  const updateSize = (vw: number, vh: number) => {
    const safeH = Math.max(1, vh);
    const safeW = Math.max(1, vw);
    const pr = isSoftwareGl
      ? 1
      : safeW < 820
        ? Math.min(window.devicePixelRatio || 1, 1.75)
        : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(safeW, safeH, false);

    cameraD = clamp(1500 * Math.min(safeW / 1440, safeH / 900), 1000, 2200);
    const fov = (2 * Math.atan(safeH / 2 / cameraD) * 180) / Math.PI;
    camera.fov = fov;
    camera.aspect = safeW / safeH;
    camera.near = 10;
    camera.far = 4 * cameraD;
    camera.position.set(0, 0, cameraD);
    camera.updateProjectionMatrix();
    return cameraD;
  };

  updateSize(window.innerWidth, window.innerHeight);

  const { frontGeo, backGeo } = buildBarGeometries(THREE);
  const shadowGeo = new THREE.PlaneGeometry(1.25, 1.04 * BH);
  const shadowTex = createShadowTexture(THREE);

  const flavourTexPairs = FLAVOURS.map((f) => createPlaceholderTextures(THREE, f));

  const createBarInstance = (isTraveller = false): BarInstance => {
    const group = new THREE.Group();
    group.rotation.order = 'ZYX';

    const frontMat = new THREE.MeshPhysicalMaterial({
      map: flavourTexPairs[1].front,
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.45,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.42,
    });
    const backMat = new THREE.MeshPhysicalMaterial({
      map: flavourTexPairs[1].back,
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.45,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.42,
    });

    const frontMesh = new THREE.Mesh(frontGeo, frontMat);
    const backMesh = new THREE.Mesh(backGeo, backMat);
    group.add(frontMesh, backMesh);

    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.renderOrder = -1;

    group.visible = false;
    shadowMesh.visible = false;
    scene.add(shadowMesh, group);

    const inst: BarInstance = {
      group,
      frontMesh,
      backMesh,
      frontMat,
      backMat,
      shadowMesh,
      shadowMat,
      flavourIdx: 1,
      slotOffset: 0,
    };
    frontMesh.userData.bar = inst;
    backMesh.userData.bar = inst;
    frontMesh.userData.isTraveller = isTraveller;
    backMesh.userData.isTraveller = isTraveller;
    return inst;
  };

  const pool = Array.from({ length: 11 }, () => createBarInstance(false));
  const traveller = createBarInstance(true);

  const setBarFlavour = (bar: BarInstance, flavourIdx: number) => {
    const idx = ((flavourIdx % FLAVOURS.length) + FLAVOURS.length) % FLAVOURS.length;
    bar.flavourIdx = idx;
    const pair = flavourTexPairs[idx];
    if (bar.frontMat.map !== pair.front) {
      bar.frontMat.map = pair.front;
      bar.frontMat.needsUpdate = true;
    }
    if (bar.backMat.map !== pair.back) {
      bar.backMat.map = pair.back;
      bar.backMat.needsUpdate = true;
    }
  };

  const placeBar = (bar: BarInstance, pose: BarPose, vw: number, vh: number) => {
    if (pose.op <= 0.01) {
      bar.group.visible = false;
      bar.shadowMesh.visible = false;
      return;
    }
    bar.group.visible = true;
    const baseScale = pose.h / BH;
    bar.group.position.set(pose.x - vw / 2, vh / 2 - pose.y, pose.z);
    bar.group.scale.set(baseScale * pose.sx, baseScale * pose.sy, baseScale);
    bar.group.rotation.set(
      (pose.rx * Math.PI) / 180,
      (pose.ry * Math.PI) / 180,
      (-pose.rz * Math.PI) / 180,
      'ZYX'
    );
    bar.frontMat.opacity = pose.op;
    bar.backMat.opacity = pose.op;

    const shOp = 0.5 * pose.op * pose.shadow;
    if (shOp <= 0.005) {
      bar.shadowMesh.visible = false;
    } else {
      bar.shadowMesh.visible = true;
      bar.shadowMesh.position.set(
        pose.x - vw / 2,
        vh / 2 - (pose.y + 0.05 * pose.h),
        pose.z - 0.32 * pose.h
      );
      bar.shadowMesh.rotation.set(0, 0, (-pose.rz * Math.PI) / 180);
      const edgeScale = Math.max(0.3, Math.abs(Math.cos((pose.ry * Math.PI) / 180)));
      bar.shadowMesh.scale.set(baseScale * pose.sx * edgeScale, baseScale * pose.sy, 1);
      bar.shadowMat.opacity = shOp;
    }
  };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const raycastPool = (clientX: number, clientY: number, vw: number, vh: number): BarInstance | null => {
    ndc.set((clientX / vw) * 2 - 1, -(clientY / vh) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const targets: import('three').Object3D[] = [];
    for (const b of pool) {
      if (b.group.visible) targets.push(b.frontMesh, b.backMesh);
    }
    if (traveller.group.visible) {
      targets.push(traveller.frontMesh, traveller.backMesh);
    }
    const hits = raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      return (hits[0].object.userData.bar as BarInstance) || null;
    }
    return null;
  };

  // Load sheet + fonts, then build crisp CanvasTextures
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const imgReady = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = SHEET_URL;
  });

  const fontsReady = Promise.all([
    document.fonts.load(`400 40px "${FONTS.display}"`),
    document.fonts.load(`400 20px "${FONTS.mono}"`),
    document.fonts.load(`500 20px "${FONTS.mono}"`),
    document.fonts.load(`700 20px "${FONTS.body}"`),
  ]).catch(() => undefined);

  let disposed = false;
  Promise.all([imgReady, fontsReady])
    .then(([loadedImg]) => {
      if (disposed) return;
      const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
      for (let i = 0; i < FLAVOURS.length; i++) {
        const old = flavourTexPairs[i];
        const next = buildFlavourTexturesFromSheet(THREE, loadedImg, FLAVOURS[i], maxAniso);
        flavourTexPairs[i] = next;
        old.front.dispose();
        old.back.dispose();
      }
      // Refresh all bar material maps
      for (const b of pool) {
        b.frontMat.map = flavourTexPairs[b.flavourIdx].front;
        b.backMat.map = flavourTexPairs[b.flavourIdx].back;
        b.frontMat.needsUpdate = true;
        b.backMat.needsUpdate = true;
      }
      traveller.frontMat.map = flavourTexPairs[traveller.flavourIdx].front;
      traveller.backMat.map = flavourTexPairs[traveller.flavourIdx].back;
      traveller.frontMat.needsUpdate = true;
      traveller.backMat.needsUpdate = true;
      onTexturesReady?.();
    })
    .catch((err) => {
      console.warn('Sheet texture load warning:', err);
    });

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  const afterDraw = (cb: () => void): number => {
    try {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (status === gl.UNSIGNALED) {
            window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            window.setTimeout(cb, 80);
          }
        };
        return window.setTimeout(poll, 5);
      }
    } catch {
      // Fallback
    }
    return window.setTimeout(cb, 80);
  };

  const render = () => {
    if (!disposed) renderer.render(scene, camera);
  };

  const dispose = () => {
    disposed = true;
    frontGeo.dispose();
    backGeo.dispose();
    shadowGeo.dispose();
    shadowTex.dispose();
    envTarget.dispose();
    for (const pair of flavourTexPairs) {
      pair.front.dispose();
      pair.back.dispose();
    }
    for (const b of [...pool, traveller]) {
      b.frontMat.dispose();
      b.backMat.dispose();
      b.shadowMat.dispose();
    }
    renderer.dispose();
  };

  return {
    isSoftwareGl,
    cameraD,
    pool,
    traveller,
    updateSize,
    placeBar,
    setBarFlavour,
    raycastPool,
    render,
    afterDraw,
    dispose,
  };
}
