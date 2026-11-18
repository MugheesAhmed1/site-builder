import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface RevealLayerProps {
  image: string;
  cursorX: number;
  cursorY: number;
  radius?: number;
}

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export function RevealLayer({
  image,
  cursorX,
  cursorY,
  radius = 260,
}: RevealLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const revealRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
      setViewport({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const revealEl = revealRef.current;
    if (!canvas || !revealEl) return;

    if (canvas.width !== viewport.width) canvas.width = viewport.width;
    if (canvas.height !== viewport.height) canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(
      cursorX,
      cursorY,
      0,
      cursorX,
      cursorY,
      radius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.75)');
    gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.88, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, radius, 0, Math.PI * 2);
    ctx.fill();

    const maskUrl = `url(${canvas.toDataURL()})`;
    revealEl.style.maskImage = maskUrl;
    revealEl.style.webkitMaskImage = maskUrl;
  }, [cursorX, cursorY, radius, viewport]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ display: 'none' }}
      />
      <div
        ref={revealRef}
        className="absolute inset-0 bg-center bg-cover bg-no-repeat z-30 pointer-events-none"
        style={{
          backgroundImage: `url('${image}')`,
          maskImage: `url(${TRANSPARENT_PIXEL})`,
          WebkitMaskImage: `url(${TRANSPARENT_PIXEL})`,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }}
      />
    </>
  );
}
