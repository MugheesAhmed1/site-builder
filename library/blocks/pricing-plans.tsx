// Plans side by side, one picked out (from Distill's pricing panel).
import { color, items, lines, safeHref, text, type BlockProps } from '../kit';

export default function PricingPlans({ props: p }: BlockProps) {
  const plans = items(p.plans);
  const fg = color(p.text, '#0f1115');
  const accent = color(p.accent, '#ff5a1f');
  return (
    <section id={text(p.anchor) || undefined} style={{ background: color(p.background, '#eef0f2'), color: fg, padding: 'clamp(64px,10vw,130px) clamp(16px,5vw,80px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <h2 style={{ margin: 0, textAlign: 'center', fontSize: 'clamp(32px,5vw,64px)', letterSpacing: '-.03em', lineHeight: 1 }}>{text(p.title)}</h2>
        {text(p.body) && <p style={{ margin: '16px auto 0', textAlign: 'center', maxWidth: '52ch', opacity: 0.7, lineHeight: 1.6 }}>{text(p.body)}</p>}
        <div style={{ marginTop: 'clamp(28px,5vw,56px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18, alignItems: 'stretch' }}>
          {plans.map((pl, i) => {
            const hi = !!pl.highlight;
            const href = safeHref(pl.link);
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 'clamp(22px,3vw,34px)', borderRadius: 22, background: hi ? fg : color(p.card, '#ffffff'), color: hi ? color(p.background, '#eef0f2') : fg, boxShadow: hi ? '0 24px 60px rgba(0,0,0,.18)' : 'none', transform: hi ? 'translateY(-8px)' : 'none' }}>
                <div style={{ fontWeight: 600 }}>{text(pl.name)}</div>
                <div style={{ fontSize: 'clamp(32px,4vw,48px)', fontWeight: 700, letterSpacing: '-.03em' }}>{text(pl.price)}</div>
                <div style={{ fontSize: 14, opacity: 0.7 }}>{text(pl.detail)}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10, fontSize: 15 }}>
                  {lines(pl.features).map((f, j) => (
                    <li key={j} style={{ display: 'flex', gap: 10 }}><span style={{ color: accent }}>✓</span>{f}</li>
                  ))}
                </ul>
                {href && <a href={href} style={{ marginTop: 'auto', textAlign: 'center', padding: '13px 18px', borderRadius: 999, background: hi ? accent : 'transparent', border: hi ? 0 : '1px solid currentColor', color: hi ? '#fff' : 'inherit', textDecoration: 'none', fontWeight: 600 }}>{text(pl.button)}</a>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
