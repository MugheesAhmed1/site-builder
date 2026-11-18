// Big numbered rows that lean in on hover (from Jack's and Milo's services).
import { color, items, text, useInView, type BlockProps } from '../kit';

export default function NumberedList({ props: p }: BlockProps) {
  const list = items(p.items);
  const [ref, seen] = useInView<HTMLDivElement>('-10% 0px');
  const fg = color(p.text, '#0b0b0c');
  const accent = color(p.accent, '#ff5a1f');
  return (
    <section style={{ background: color(p.background, '#f4f2ee'), color: fg, padding: 'clamp(64px,10vw,140px) clamp(20px,6vw,96px)' }}>
      <style>{`
.xpl-num{max-width:1240px;margin:0 auto}
.xpl-num h2{margin:0 0 clamp(32px,5vw,72px);font-size:clamp(40px,8vw,120px);line-height:.9;letter-spacing:-.04em;font-weight:800}
.xpl-num .row{display:grid;grid-template-columns:minmax(90px,.4fr) 1fr;gap:clamp(16px,4vw,64px);padding:clamp(22px,3vw,40px) 0;border-top:1px solid color-mix(in srgb,currentColor 18%,transparent);opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s cubic-bezier(.22,1,.36,1)}
.xpl-num.seen .row{opacity:1;transform:none}
.xpl-num .n{font-size:clamp(44px,7vw,104px);font-weight:900;line-height:.85;letter-spacing:-.04em;transition:color .3s}
.xpl-num h3{margin:0 0 10px;font-size:clamp(20px,2.4vw,32px);text-transform:uppercase;letter-spacing:-.01em;transition:transform .4s cubic-bezier(.22,1,.36,1)}
.xpl-num p{margin:0;max-width:56ch;line-height:1.6;opacity:.7}
.xpl-num .row:hover .n{color:${accent}}
.xpl-num .row:hover h3{transform:translateX(12px)}
@media (prefers-reduced-motion:reduce){.xpl-num .row{transition:none;transform:none}}
`}</style>
      <div ref={ref} className={`xpl-num${seen ? ' seen' : ''}`}>
        {text(p.title) && <h2>{text(p.title)}</h2>}
        {list.map((it, i) => (
          <div className="row" key={i} style={{ transitionDelay: `${i * 80}ms` }}>
            <span className="n">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{text(it.title)}</h3>
              <p>{text(it.text)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
