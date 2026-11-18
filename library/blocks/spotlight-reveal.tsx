// A picture with a soft spotlight that follows the pointer and shows a second picture through it
// (from the Lithos template's opening).
import { useEffect, useRef } from 'react';
import { color, num, safeSrc, text, useReducedMotion, type BlockProps } from '../kit';

export default function SpotlightReveal({ props: p }: BlockProps) {
  const box = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const radius = num(p.radius, 220, 40, 600);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let x = 0.5, y = 0.5, tx = 0.5, ty = 0.5, raf = 0, idle = true, t0 = performance.now();
    const set = () => {
      el.style.setProperty('--x', `${x * 100}%`);
      el.style.setProperty('--y', `${y * 100}%`);
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = (e.clientY - r.top) / r.height;
      idle = false;
    };
    const leave = () => (idle = true);
    const tick = (now: number) => {
      if (idle && !reduced) {
        const t = (now - t0) / 1000;
        tx = 0.5 + Math.sin(t * 0.45) * 0.28;
        ty = 0.5 + Math.sin(t * 0.7) * 0.18;
      }
      const k = reduced ? 1 : num(p.follow, 0.1, 0.02, 1);
      x += (tx - x) * k;
      y += (ty - y) * k;
      set();
      raf = requestAnimationFrame(tick);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [reduced, p.follow]);
  const base = safeSrc(p.image);
  const reveal = safeSrc(p.revealImage);
  const fg = color(p.text, '#ffffff');
  return (
    <section style={{ background: color(p.background, '#000000'), color: fg }}>
      <style>{`
.xpl-spot{position:relative;height:${num(p.height, 90, 40, 100)}vh;min-height:420px;overflow:hidden;touch-action:pan-y}
.xpl-spot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.xpl-spot .reveal{-webkit-mask-image:radial-gradient(circle ${radius}px at var(--x,50%) var(--y,50%),#000 55%,transparent 100%);mask-image:radial-gradient(circle ${radius}px at var(--x,50%) var(--y,50%),#000 55%,transparent 100%)}
.xpl-spot .words{position:absolute;left:clamp(20px,5vw,72px);bottom:clamp(24px,6vw,80px);max-width:min(620px,85%);z-index:2;text-shadow:0 2px 24px rgba(0,0,0,.45)}
.xpl-spot h2{margin:0;font-size:clamp(34px,6vw,84px);line-height:.95;letter-spacing:-.03em;font-weight:500}
.xpl-spot p{margin:16px 0 0;font-size:clamp(15px,1.3vw,18px);line-height:1.5;opacity:.85}
`}</style>
      <div className="xpl-spot" ref={box}>
        {base && <img src={base} alt={text(p.alt)} loading="lazy" />}
        {reveal && <img className="reveal" src={reveal} alt="" aria-hidden="true" loading="lazy" />}
        <div className="words">
          {text(p.title) && <h2>{text(p.title)}</h2>}
          {text(p.body) && <p>{text(p.body)}</p>}
        </div>
      </div>
    </section>
  );
}
