import * as THREE from 'three';

function drawPetal(
  ctx: CanvasRenderingContext2D,
  angle: number,
  length: number,
  width: number,
  innerColor: string,
  outerColor: string,
  notch = 0
): void {
  ctx.save();
  ctx.rotate(angle);

  const grad = ctx.createLinearGradient(0, 0, 0, -length);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.55, outerColor);
  grad.addColorStop(1, 'rgba(255,255,255,0.88)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(width * 0.85, -length * 0.25, width, -length * 0.78, width * 0.25, -length);
  if (notch > 0) {
    ctx.quadraticCurveTo(0, -length * (1 - notch), -width * 0.25, -length);
  } else {
    ctx.quadraticCurveTo(0, -length * 1.06, -width * 0.25, -length);
  }
  ctx.bezierCurveTo(-width, -length * 0.78, -width * 0.85, -length * 0.25, 0, 0);
  ctx.closePath();
  ctx.fill();

  // Delicate center vein
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -length * 0.12);
  ctx.lineTo(0, -length * 0.78);
  ctx.stroke();

  ctx.restore();
}

export function createFlowerAtlasTexture(): THREE.CanvasTexture {
  const size = 1024;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Tile 0 (top-left): 5-petal wild evening primrose
  ctx.save();
  ctx.translate(half * 0.5, half * 0.5);
  for (let i = 0; i < 5; i++) {
    drawPetal(
      ctx,
      (i / 5) * Math.PI * 2,
      175,
      82,
      'rgba(255,245,220,0.65)',
      'rgba(255,252,244,0.95)',
      0.08
    );
  }
  const core0 = ctx.createRadialGradient(0, 0, 2, 0, 0, 44);
  core0.addColorStop(0, 'rgba(255, 232, 160, 1)');
  core0.addColorStop(0.55, 'rgba(255, 200, 110, 0.85)');
  core0.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = core0;
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tile 1 (top-right): 8-petal star cosmos / night lily
  ctx.save();
  ctx.translate(half * 1.5, half * 0.5);
  for (let i = 0; i < 8; i++) {
    drawPetal(
      ctx,
      (i / 8) * Math.PI * 2 + 0.1,
      188,
      46,
      'rgba(240,235,255,0.6)',
      'rgba(255,255,255,0.96)'
    );
  }
  const core1 = ctx.createRadialGradient(0, 0, 2, 0, 0, 36);
  core1.addColorStop(0, 'rgba(255, 245, 200, 1)');
  core1.addColorStop(0.7, 'rgba(255, 210, 140, 0.7)');
  core1.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = core1;
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tile 2 (bottom-left): Layered nocturnal anemone
  ctx.save();
  ctx.translate(half * 0.5, half * 1.5);
  for (let i = 0; i < 7; i++) {
    drawPetal(
      ctx,
      (i / 7) * Math.PI * 2,
      170,
      78,
      'rgba(215,210,235,0.55)',
      'rgba(255,248,244,0.92)'
    );
  }
  for (let i = 0; i < 6; i++) {
    drawPetal(
      ctx,
      (i / 6) * Math.PI * 2 + 0.35,
      118,
      54,
      'rgba(255,255,255,0.7)',
      'rgba(255,255,255,0.98)'
    );
  }
  ctx.fillStyle = 'rgba(255, 224, 150, 0.95)';
  for (let s = 0; s < 14; s++) {
    const sa = (s / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(sa) * 32, Math.sin(sa) * 32, 6.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Tile 3 (bottom-right): Umbel cluster of tiny florets
  ctx.save();
  ctx.translate(half * 1.5, half * 1.5);
  const subCenters = [
    [0, -78, 0.62],
    [76, -24, 0.58],
    [48, 66, 0.6],
    [-52, 62, 0.56],
    [-74, -28, 0.58],
    [0, 6, 0.66],
  ];
  subCenters.forEach(([cx, cy, sc]) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    for (let p = 0; p < 5; p++) {
      drawPetal(
        ctx,
        (p / 5) * Math.PI * 2,
        112,
        46,
        'rgba(255,248,230,0.65)',
        'rgba(255,255,255,0.96)'
      );
    }
    ctx.fillStyle = 'rgba(255,230,155,0.95)';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createLeafAtlasTexture(): THREE.CanvasTexture {
  const size = 1024;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Tile 0: Woodland fern frond
  ctx.save();
  ctx.translate(half * 0.5, half * 0.9);
  ctx.strokeStyle = 'rgba(220,245,232,0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -390);
  ctx.stroke();

  for (let i = 0; i < 11; i++) {
    const y = -35 - i * 32;
    const w = Math.sin((i / 11) * Math.PI * 0.85 + 0.25) * 145;
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(0, y);
      ctx.rotate(dir * 0.62);
      const g = ctx.createLinearGradient(0, 0, 0, -w);
      g.addColorStop(0, 'rgba(180,220,198,0.85)');
      g.addColorStop(1, 'rgba(235,255,244,0.95)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(dir * 16, -w * 0.5, 0, -w);
      ctx.quadraticCurveTo(-dir * 16, -w * 0.5, 0, 0);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  // Tile 1: Broad organic valley leaf
  ctx.save();
  ctx.translate(half * 1.5, half * 0.86);
  const g1 = ctx.createLinearGradient(0, 0, 0, -370);
  g1.addColorStop(0, 'rgba(155,195,175,0.82)');
  g1.addColorStop(1, 'rgba(235,252,240,0.96)');
  ctx.fillStyle = g1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(185, -75, 165, -245, 0, -375);
  ctx.bezierCurveTo(-165, -245, -185, -75, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, -350);
  ctx.stroke();
  ctx.restore();

  // Tile 2: Twin slender meadow blades
  ctx.save();
  ctx.translate(half * 0.5, half * 1.88);
  for (const [rot, h, w] of [
    [-0.18, 370, 34],
    [0.2, 330, 30],
    [0.02, 265, 24],
  ]) {
    ctx.save();
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(215,240,224,0.9)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, 0);
    ctx.quadraticCurveTo(-w * 0.65, -h * 0.55, 0, -h);
    ctx.quadraticCurveTo(w * 0.65, -h * 0.55, w * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Tile 3: Three-leaf botanical sprig
  ctx.save();
  ctx.translate(half * 1.5, half * 1.56);
  for (let k = 0; k < 3; k++) {
    ctx.save();
    ctx.rotate((k - 1) * 0.82);
    ctx.fillStyle = 'rgba(205,235,216,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(75, -55, 68, -175, 0, -210);
    ctx.bezierCurveTo(-68, -175, -75, -55, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createLightRayTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const horiz = ctx.createLinearGradient(0, 0, size, 0);
  horiz.addColorStop(0, 'rgba(255,255,255,0)');
  horiz.addColorStop(0.32, 'rgba(220,235,255,0.28)');
  horiz.addColorStop(0.5, 'rgba(245,239,226,0.55)');
  horiz.addColorStop(0.68, 'rgba(220,235,255,0.28)');
  horiz.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = horiz;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'destination-in';
  const vert = ctx.createLinearGradient(0, 0, 0, size);
  vert.addColorStop(0, 'rgba(255,255,255,0)');
  vert.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  vert.addColorStop(0.75, 'rgba(255,255,255,0.6)');
  vert.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = vert;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createDustTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;

  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(255,250,238,1)');
  grad.addColorStop(0.25, 'rgba(245,239,226,0.75)');
  grad.addColorStop(0.6, 'rgba(210,225,245,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
