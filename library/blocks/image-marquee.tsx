// Two rows of pictures sliding in opposite directions, faster as the page scrolls (from Jack).
import { useEffect, useRef } from 'react';
import { color, items, num, safeSrc, text, useReducedMotion, type BlockProps } from '../kit';

function Row({ pics, dir, speed, h, radius, gap }: { pics: string[]; dir: 1 | -1; speed: number; h: number; radius: number; gap: number }) {
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = track.current;
    if (!el || !pics.length) return;
    let x = 0, raf = 0, last = performance.now(), lastY = window.scrollY, boost = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      boost += (Math.abs(dy) * 6 - boost) * 0.1;
      const half = el.scrollWidth / 2;
      if (!reduced) x = (x + dir * (40 * speed + boost * speed) * dt) % half;
      el.style.transform = `translate3d(${dir > 0 ? x - half : -x}px,0,0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pics.length, dir, speed, reduced]);
  const list = [...pics, ...pics];
  return (
    <div style={{ overflow: 'hidden' }}>
      <div ref={track} style={{ display: 'flex', gap, width: 'max-content', willChange: 'transform' }}>
        {list.map((src, i) => (
          <img key={i} src={src} alt="" loading="lazy" style={{ height: h, width: 'auto', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: radius, flex: 'none' }} />
        ))}
      </div>
    </div>
  );
}

export default function ImageMarquee({ props: p }: BlockProps) {
  const row = (v: unknown) => items(v).map((x) => safeSrc(x.image)).filter(Boolean);
  const a = row(p.row1);
  const b = row(p.row2);
  const h = num(p.size, 240, 80, 600);
  const radius = num(p.radius, 18, 0, 80);
  const gap = num(p.gap, 16, 0, 80);
  const speed = num(p.speed, 1, 0, 4);
  return (
    <section aria-label={text(p.label) || undefined} style={{ background: color(p.background, '#0b0b0c'), padding: `${num(p.padding, 64, 0, 200)}px 0`, display: 'grid', gap }}>
      {a.length > 0 && <Row pics={a} dir={-1} speed={speed} h={h} radius={radius} gap={gap} />}
      {b.length > 0 && <Row pics={b} dir={1} speed={speed} h={h} radius={radius} gap={gap} />}
    </section>
  );
}
