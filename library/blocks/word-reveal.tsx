// A statement that lights up word by word as it scrolls past (from Jack's about section).
import { useRef } from 'react';
import { color, text, useScrollProgress, type BlockProps } from '../kit';

export default function WordReveal({ props: p }: BlockProps) {
  const words = text(p.body).split(/\s+/).filter(Boolean);
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const dim = Math.min(1, Math.max(0, Number(p.dim ?? 0.18)));
  const ref = useScrollProgress<HTMLElement>((pr) => {
    // Words light up between 15% and 60% of the section's trip through the screen.
    const t = Math.min(1, Math.max(0, (pr - 0.15) / 0.45)) * words.length;
    spans.current.forEach((s, i) => s && (s.style.opacity = String(dim + (1 - dim) * Math.min(1, Math.max(0, t - i)))));
  });
  return (
    <section ref={ref} style={{ background: color(p.background, '#0b0b0c'), color: color(p.text, '#f4f2ee'), padding: 'clamp(80px,14vw,200px) clamp(20px,6vw,96px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: p.align === 'left' ? 'left' : 'center' }}>
        {text(p.kicker) && <p style={{ margin: '0 0 24px', fontSize: 13, letterSpacing: '.18em', textTransform: 'uppercase', opacity: 0.6 }}>{text(p.kicker)}</p>}
        <p style={{ margin: 0, fontSize: 'clamp(26px,4.2vw,58px)', lineHeight: 1.18, letterSpacing: '-.02em', fontWeight: 600 }}>
          {words.map((w, i) => (
            <span key={i} ref={(el) => void (spans.current[i] = el)} style={{ opacity: dim, transition: 'opacity .15s linear' }}>
              {w}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
