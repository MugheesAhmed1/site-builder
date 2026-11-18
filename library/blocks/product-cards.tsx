// Bright product cards that tilt towards the pointer (from Stride's flavour shop).
import { color, items, safeHref, safeSrc, text, type BlockProps } from '../kit';

export default function ProductCards({ props: p }: BlockProps) {
  const list = items(p.items);
  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
  };
  const reset = (e: React.PointerEvent<HTMLElement>) => (e.currentTarget.style.transform = '');
  return (
    <section id={text(p.anchor) || undefined} style={{ background: color(p.background, '#f0e8e0'), color: color(p.text, '#1c1a1f'), padding: 'clamp(64px,9vw,120px) clamp(16px,4vw,64px)' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'end', gap: 20, marginBottom: 'clamp(24px,4vw,48px)' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(40px,7vw,104px)', lineHeight: 0.9, letterSpacing: '-.03em', textTransform: 'uppercase', whiteSpace: 'pre-line', fontWeight: 900 }}>{text(p.title)}</h2>
          {text(p.body) && <p style={{ margin: 0, maxWidth: '34ch', lineHeight: 1.55, opacity: 0.8 }}>{text(p.body)}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,220px),1fr))', gap: 16 }}>
          {list.map((it, i) => {
            const img = safeSrc(it.image);
            const href = safeHref(it.link);
            const Tag = href ? 'a' : 'div';
            return (
              <Tag key={i} {...(href ? { href } : {})} onPointerMove={tilt} onPointerLeave={reset} style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 'clamp(300px,34vw,420px)', padding: 20, borderRadius: 22, background: color(it.color, '#ab9ac4'), color: color(p.cardText, '#ffffff'), textDecoration: 'none', overflow: 'hidden', transition: 'transform .35s cubic-bezier(.22,1,.36,1)' }}>
                <h3 style={{ margin: 0, fontSize: 'clamp(22px,2.4vw,30px)', lineHeight: 1, textTransform: 'uppercase', fontWeight: 900, textAlign: 'center' }}>{text(it.name)}</h3>
                {img && <img src={img} alt="" loading="lazy" style={{ flex: 1, minHeight: 0, width: '100%', objectFit: 'contain', margin: '12px 0' }} />}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                  <span>{text(it.price)}</span>
                  {text(it.cta) && <span style={{ padding: '8px 14px', borderRadius: 999, background: 'rgba(255,255,255,.9)', color: '#1c1a1f', fontSize: 13 }}>{text(it.cta)}</span>}
                </div>
              </Tag>
            );
          })}
        </div>
      </div>
    </section>
  );
}
