// Numbers that count up when they come into view (from Mossline's proof section).
import { useEffect, useRef } from 'react';
import { color, items, num, text, useInView, useReducedMotion, type BlockProps } from '../kit';

function Count({ to, decimals, prefix, suffix, run, ms }: { to: number; decimals: number; prefix: string; suffix: string; run: boolean; ms: number }) {
  const el = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const fmt = (v: number) => `${prefix}${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  useEffect(() => {
    if (!run || !el.current) return;
    if (reduced) return void (el.current.textContent = fmt(to));
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      if (el.current) el.current.textContent = fmt(to * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, to, decimals, prefix, suffix, ms, reduced]);
  return <span ref={el}>{fmt(run ? to : 0)}</span>;
}

export default function CountUpStats({ props: p }: BlockProps) {
  const list = items(p.items);
  const [ref, seen] = useInView<HTMLDivElement>('-15% 0px');
  const accent = color(p.accent, '#2f7d5b');
  return (
    <section style={{ background: color(p.background, '#f2f4f0'), color: color(p.text, '#13201a'), padding: 'clamp(64px,9vw,128px) clamp(20px,6vw,96px)' }}>
      <div ref={ref} style={{ maxWidth: 1200, margin: '0 auto' }}>
        {text(p.title) && <h2 style={{ margin: '0 0 clamp(28px,4vw,56px)', fontSize: 'clamp(30px,4.4vw,60px)', letterSpacing: '-.03em', lineHeight: 1, maxWidth: '18ch' }}>{text(p.title)}</h2>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'clamp(20px,3vw,40px)' }}>
          {list.map((it, i) => (
            <div key={i} style={{ borderTop: `2px solid ${accent}`, paddingTop: 18 }}>
              <div style={{ fontSize: 'clamp(44px,6vw,88px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: accent }}>
                <Count to={num(it.value, 0)} decimals={num(it.decimals, 0, 0, 3)} prefix={text(it.prefix)} suffix={text(it.suffix)} run={seen} ms={num(p.duration, 1.6, 0.2, 6) * 1000} />
              </div>
              <p style={{ margin: '12px 0 0', lineHeight: 1.5, opacity: 0.75 }}>{text(it.label)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
