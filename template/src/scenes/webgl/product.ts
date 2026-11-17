import {
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { clamp, freshTaps, lerp, num, smooth, str, type Frame } from "../frame";
import { anchor3, col, disposeKit, makeKit, resizeKit, type Init3D, type View3D } from "./core";

// product3d: the product (or a tooth) as a real object under studio light. Beat keys as in the
// 2D morph engine: shape (the story step), spin (degrees), scale, shine. The cursor turns it a
// little; a tap gives it a spin.

function softShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(0,0,0,0.45)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

function tooth(enamel: MeshPhysicalMaterial) {
  const g = new Group();
  // The crown: a lathe profile with a soft waist, then two roots.
  const pts = [
    [0, 0.95],
    [0.42, 0.92],
    [0.62, 0.78],
    [0.7, 0.5],
    [0.66, 0.15],
    [0.55, -0.05],
  ].map(([x, y]) => new Vector2(x, y));
  const crown = new Mesh(new LatheGeometry(pts, 48), enamel);
  crown.scale.set(1, 1, 0.82);
  g.add(crown);
  const cap = new Mesh(new SphereGeometry(0.62, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), enamel);
  cap.position.y = 0.72;
  cap.scale.set(0.72, 0.38, 0.6);
  g.add(cap);
  for (const side of [-1, 1]) {
    const root = new Mesh(new CylinderGeometry(0.26, 0.07, 1.25, 28, 1), enamel);
    root.position.set(side * 0.27, -0.62, 0);
    root.rotation.z = side * 0.12;
    g.add(root);
  }
  return g;
}

function bottle(body: MeshPhysicalMaterial, accent: MeshPhysicalMaterial) {
  const g = new Group();
  const pts = [
    [0, -1.1],
    [0.52, -1.1],
    [0.6, -1.0],
    [0.62, 0.35],
    [0.5, 0.62],
    [0.24, 0.8],
    [0.22, 0.98],
  ].map(([x, y]) => new Vector2(x, y));
  g.add(new Mesh(new LatheGeometry(pts, 64), body));
  const cap = new Mesh(new CylinderGeometry(0.25, 0.25, 0.34, 40), accent);
  cap.position.y = 1.14;
  g.add(cap);
  const label = new Mesh(new CylinderGeometry(0.632, 0.632, 0.7, 64, 1, true), accent);
  label.position.y = -0.35;
  g.add(label);
  return g;
}

export function product3d(canvas: HTMLCanvasElement, init: Init3D): View3D | null {
  const k = makeKit(canvas, { env: true, fov: 32, mobile: init.mobile });
  if (!k) return null;
  const { scene, camera, renderer } = k;
  const subject = str(init.params, "subject", "product");
  const accent = col(init.pal.accent);
  const enamel = new MeshPhysicalMaterial({ color: subject === "tooth" ? 0xf6f3ec : 0xf2f2f2, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.3 });
  const body = new MeshPhysicalMaterial({ color: col(init.pal.accent).lerp(col("#ffffff"), 0.75), roughness: 0.12, transmission: 0.55, thickness: 0.8, ior: 1.45, clearcoat: 1 });
  const paint = new MeshPhysicalMaterial({ color: accent, roughness: 0.35, metalness: 0.15, clearcoat: 0.6 });
  const obj = subject === "tooth" ? tooth(enamel) : bottle(body, paint);
  const holder = new Group();
  holder.add(obj);
  scene.add(holder);
  // The story marks on a tooth: a shadow on the enamel, then a scan ring.
  const spot = new Mesh(new SphereGeometry(0.16, 24, 12), new MeshPhysicalMaterial({ color: 0x6b4a2f, roughness: 0.8 }));
  spot.position.set(0.32, 0.55, 0.38);
  const ring = new Mesh(new TorusGeometry(0.85, 0.018, 8, 96), new MeshBasicMaterial({ color: accent, transparent: true }));
  ring.rotation.x = Math.PI / 2;
  if (subject === "tooth") obj.add(spot, ring);
  const shadow = new Mesh(new PlaneGeometry(3, 3), new MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  scene.add(new HemisphereLight(0xffffff, col(init.pal.bg).getHex(), 0.6));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new DirectionalLight(accent, 1.4);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  let spin = 0;
  let extra = 0;
  let lastTap = -1;
  return {
    frame(f: Frame) {
      const shape = num(f.beat, "shape", 0);
      const shine = clamp(num(f.beat, "shine", 0.6));
      const a = anchor3(k, f);
      const scale = num(f.beat, "scale", 1) * a.s * 0.42;
      const tap = freshTaps(f, 1000).pop();
      if (tap && tap.t !== lastTap) (lastTap = tap.t), (extra += Math.PI * 2);
      const want = (num(f.beat, "spin", 0) * Math.PI) / 180 + extra;
      spin = f.reduced ? want : lerp(spin, want, 0.06);
      holder.position.set(a.x, a.y + (f.reduced ? 0 : Math.sin(f.t * 1.2) * 0.05), 0);
      holder.scale.setScalar(scale);
      obj.rotation.y = spin + f.t * 0.15 * (f.reduced ? 0 : 1);
      holder.rotation.x = (f.pointer ? f.ny * 0.25 : 0) + 0.08;
      holder.rotation.z = f.pointer ? -f.nx * 0.12 : 0;
      shadow.position.set(a.x, a.y - scale * 1.55, 0);
      shadow.scale.setScalar(scale * 0.9);
      enamel.clearcoat = 0.4 + shine * 0.6;
      enamel.roughness = 0.45 - shine * 0.3;
      renderer.toneMappingExposure = 0.85 + shine * 0.35;
      if (subject === "tooth") {
        const problem = smooth(clamp(shape - 0.4)) * (1 - smooth(clamp(shape - 2.6)));
        spot.scale.setScalar(Math.max(0.001, problem));
        spot.visible = problem > 0.02;
        const scan = clamp(1 - Math.abs(shape - 2) * 1.4);
        ring.visible = scan > 0.02;
        (ring.material as MeshBasicMaterial).opacity = scan;
        ring.position.y = Math.sin(f.t * 1.6) * 0.9;
      }
      renderer.render(scene, camera);
    },
    resize(w, h, dpr) {
      resizeKit(k, w, h, dpr);
    },
    dispose() {
      disposeKit(k);
    },
  };
}
