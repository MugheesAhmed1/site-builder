// A small dot that trails the pointer and grows over links and buttons (from Milo).
import { useEffect, useRef } from 'react';
import { color, num, useReducedMotion, type BlockProps } from '../kit';

export default function CustomCursor({ props: p }: BlockProps) {
  const dot = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = dot.current;
    if (!el || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let x = -100, y = -100, tx = -100, ty = -100, raf = 0, big = false;
    const size = num(p.size, 10, 4, 40);
    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      big = !!(e.target as Element | null)?.closest?.('a,button,[role=button],input,textarea,select,label');
      el.style.opacity = '1';
    };
    const tick = () => {
      x += (tx - x) * 0.25;
      y += (ty - y) * 0.25;
      const s = big ? 4.2 : 1;
      el.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px) scale(${s})`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', move, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
    };
  }, [reduced, p.size]);
  const size = num(p.size, 10, 4, 40);
  return <div ref={dot} aria-hidden="true" style={{ position: 'fixed', left: 0, top: 0, width: size, height: size, borderRadius: '50%', background: color(p.color, '#ffffff'), mixBlendMode: p.blend === false ? 'normal' : 'difference', pointerEvents: 'none', zIndex: 2147483000, opacity: 0, transition: 'opacity .2s, scale .2s' }} />;
}
