// Cards that stick and stack as the page scrolls, each shrinking a little under the next (from Jack's projects).
import { useRef } from 'react';
import { color, items, safeHref, safeSrc, text, useStickyProgress, type BlockProps } from '../kit';

export default function StackingCards({ props: p }: BlockProps) {
  const list = items(p.items);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const n = Math.max(1, list.length);
  const ref = useStickyProgress<HTMLDivElement>((pr) => {
    if (p.shrink === false) return;
    cards.current.forEach((c, i) => {
      if (!c) return;
      const after = Math.max(0, pr * n - (i + 1)); // how far later cards have covered this one
      c.style.transform = `scale(${1 - Math.min(after, 1.5) * 0.05})`;
    });
  });
  const fg = color(p.text, '#f4f2ee');
  const card = color(p.card, '#17171a');
  return (
    <section style={{ background: color(p.background, '#0b0b0c'), color: fg, padding: 'clamp(64px,10vw,140px) clamp(16px,5vw,80px)' }}>
      <style>{`
.xpl-stack h2{max-width:1200px;margin:0 auto clamp(28px,5vw,64px);font-size:clamp(40px,8vw,120px);line-height:.9;letter-spacing:-.04em}
.xpl-stack .card{position:sticky;top:clamp(16px,6vh,64px);max-width:1200px;margin:0 auto 6vh;border-radius:clamp(18px,2.4vw,36px);overflow:hidden;background:${card};display:grid;grid-template-columns:1fr 1.3fr;min-height:min(70vh,640px);transform-origin:50% 0;box-shadow:0 -20px 60px rgba(0,0,0,.25)}
.xpl-stack .info{padding:clamp(22px,3vw,48px);display:flex;flex-direction:column;gap:14px}
.xpl-stack .meta{font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.6}
.xpl-stack h3{margin:0;font-size:clamp(26px,3.4vw,48px);line-height:1;letter-spacing:-.02em}
.xpl-stack p{margin:0;line-height:1.6;opacity:.78}
.xpl-stack a{margin-top:auto;align-self:flex-start;color:inherit;border:1px solid currentColor;border-radius:999px;padding:10px 20px;text-decoration:none;font-size:13px;letter-spacing:.08em;text-transform:uppercase}
.xpl-stack img{width:100%;height:100%;object-fit:cover;display:block}
@media (max-width:760px){.xpl-stack .card{grid-template-columns:1fr}.xpl-stack img{height:42vh}}
`}</style>
      <div className="xpl-stack" ref={ref}>
        {text(p.title) && <h2>{text(p.title)}</h2>}
        {list.map((it, i) => {
          const href = safeHref(it.link);
          const img = safeSrc(it.image);
          return (
            <article className="card" key={i} ref={(el) => void (cards.current[i] = el)} style={{ zIndex: i + 1 }}>
              <div className="info">
                <span className="meta">{String(i + 1).padStart(2, '0')} · {text(it.meta)}</span>
                <h3>{text(it.title)}</h3>
                <p>{text(it.text)}</p>
                {href && <a href={href}>{text(it.linkLabel) || 'Open'}</a>}
              </div>
              {img ? <img src={img} alt={text(it.title)} loading="lazy" /> : <span />}
            </article>
          );
        })}
      </div>
    </section>
  );
}
