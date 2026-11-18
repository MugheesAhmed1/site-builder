// A thin bar that fills as the page is read (from Milo).
import { useEffect, useRef } from 'react';
import { color, num, type BlockProps } from '../kit';

export default function ScrollProgress({ props: p }: BlockProps) {
  const bar = useRef<HTMLDivElement>(null);
  const side = p.position === 'right';
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const k = Math.min(1, window.scrollY / max);
        if (bar.current) bar.current.style.transform = side ? `scaleY(${k})` : `scaleX(${k})`;
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, [side]);
  const t = num(p.thickness, 3, 1, 12);
  const track: React.CSSProperties = side
    ? { position: 'fixed', right: 16, top: '50%', marginTop: -80, width: t, height: 160, borderRadius: t }
    : { position: 'fixed', left: 0, right: 0, top: 0, height: t };
  return (
    <div aria-hidden="true" style={{ ...track, zIndex: 2147482000, pointerEvents: 'none', overflow: 'hidden', background: side ? 'rgba(128,128,128,.25)' : 'transparent' }}>
      <div ref={bar} style={{ width: '100%', height: '100%', background: color(p.color, '#63e6ff'), transformOrigin: side ? '50% 0' : '0 50%', transform: side ? 'scaleY(0)' : 'scaleX(0)' }} />
    </div>
  );
}
