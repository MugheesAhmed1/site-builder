import { AmbientLight, BoxGeometry, CanvasTexture, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, RepeatWrapping, SRGBColorSpace } from "three";
import { clamp, hsl, hueOf, lerp, num, rng, type Frame } from "../frame";
import {host, type Init3D, type Kit } from "./core";

// gallery3d: a corridor of framed work the camera walks through. Beat key cam (0 the entrance
// .. 1 the far wall). The work is the site's own words on generated canvases; the cursor
// turns the head a little; lights pool on each frame as the camera passes.

function art(label: string, hue: number, seed: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 384;
  const g = c.getContext("2d")!;
  const R = rng(seed);
  const grd = g.createLinearGradient(0, 0, 512, 384);
  grd.addColorStop(0, hsl(hue, 60, 62));
  grd.addColorStop(1, hsl(hue + 50, 55, 32));
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 384);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = hsl(hue + R() * 90, 60, 50 + R() * 30) + "88";
    g.beginPath();
    g.arc(R() * 512, R() * 384, 30 + R() * 120, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.font = "700 40px system-ui, sans-serif";
  g.fillText(label.slice(0, 18), 28, 352);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function floorTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#d9d4cc";
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#c9c2b8";
  for (let i = 0; i < 8; i++) g.fillRect(0, i * 32, 256, 2);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(4, 30);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export const gallery3d = host({ fov: 55 }, (k: Kit, init: Init3D) => {
  const { scene, camera, renderer } = k;
  const hue = hueOf(init.pal.accent);
  const words = init.labels.length ? init.labels : ["Work", "Studio", "Story", "Craft"];
  const frames = 10;
  const gap = 6;
  const hall = new Group();
  const wallMat = new MeshStandardMaterial({ color: 0xf3f0ea, roughness: 0.95 });
  const len = frames * gap + 20;
  const floor = new Mesh(new PlaneGeometry(8, len), new MeshStandardMaterial({ map: floorTexture(), roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -2, -len / 2 + 6);
  hall.add(floor);
  for (const side of [-1, 1]) {
    const wall = new Mesh(new PlaneGeometry(len, 7), wallMat);
    wall.rotation.y = -side * Math.PI / 2;
    wall.position.set(side * 4, 1.5, -len / 2 + 6);
    hall.add(wall);
  }
  const frameMat = new MeshStandardMaterial({ color: 0x1d1b1a, roughness: 0.5 });
  const lights: PointLight[] = [];
  for (let i = 0; i < frames; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -i * gap * 0.5 - 4;
    const g = new Group();
    const border = new Mesh(new BoxGeometry(2.7, 2.1, 0.1), frameMat);
    const pic = new Mesh(new PlaneGeometry(2.4, 1.8), new MeshBasicMaterial({ map: art(words[i % words.length], (hue + i * 37) % 360, i + 3) }));
    pic.position.z = 0.06;
    g.add(border, pic);
    g.position.set(side * 3.9, 0.6, z);
    g.rotation.y = -side * Math.PI / 2;
    hall.add(g);
  }
  for (let i = 0; i < 4; i++) {
    const l = new PointLight(0xfff1dd, 18, 12, 2);
    hall.add(l);
    lights.push(l);
  }
  scene.add(hall, new AmbientLight(0xffffff, 0.55));
  let z = 2;
  return {
    frame(f: Frame) {
      const cam = clamp(num(f.beat, "cam", 0));
      const want = 2 - cam * (frames * gap * 0.5 - 2);
      z = f.reduced ? want : lerp(z, want, 0.06);
      camera.position.set(0, 0.4 + (f.reduced ? 0 : Math.sin(z * 0.9) * 0.03), z);
      camera.rotation.y = lerp(camera.rotation.y, f.pointer ? -f.nx * 0.35 : 0, 0.06);
      camera.rotation.x = lerp(camera.rotation.x, f.pointer ? -f.ny * 0.12 : 0, 0.06);
      lights.forEach((l, i) => l.position.set(i % 2 ? 2.5 : -2.5, 2.4, z - 3 - i * 3));
      renderer.render(scene, camera);
    }
  };
});
