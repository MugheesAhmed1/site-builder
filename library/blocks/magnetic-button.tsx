// A big call to action whose button is pulled towards the pointer (from Milo's and Jack's contact buttons).
import { useRef } from 'react';
import { color, num, safeHref, text, useReducedMotion, type BlockProps } from '../kit';

export default function MagneticButton({ props: p }: BlockProps) {
  const btn = useRef<HTMLAnchorElement>(null);
  const reduced = useReducedMotion();
  const pull = num(p.strength, 0.3, 0, 1);
  const move = (e: React.PointerEvent) => {
    const el = btn.current;
    if (!el || reduced || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${dx * pull}px, ${dy * pull}px)`;
  };
  const leave = () => btn.current && (btn.current.style.transform = '');
  const accent = color(p.accent, '#63e6ff');
  return (
    <section onPointerMove={move} onPointerLeave={leave} style={{ background: color(p.background, '#02070a'), color: color(p.text, '#f2fbff'), padding: 'clamp(80px,12vw,180px) clamp(20px,6vw,96px)', textAlign: 'center' }}>
      <h2 style={{ margin: '0 auto', maxWidth: '14ch', fontSize: 'clamp(40px,8vw,128px)', lineHeight: 0.88, letterSpacing: '-.05em', fontWeight: 800, whiteSpace: 'pre-line' }}>{text(p.title)}</h2>
      <a ref={btn} href={safeHref(p.link) || '#'} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 'clamp(32px,5vw,64px)', minWidth: 'min(280px,80vw)', height: 'clamp(64px,7vw,90px)', padding: '0 36px', borderRadius: 999, border: `1px solid ${accent}`, background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: 'inherit', textDecoration: 'none', fontSize: 14, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', transition: 'transform .35s cubic-bezier(.22,1,.36,1), background .3s' }}>
        {text(p.button)} <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}
