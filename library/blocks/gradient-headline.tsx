// A giant headline whose last line glows in a gradient, rising in on arrival (from Milo's opening).
import { color, lines, num, text, useInView, type BlockProps } from '../kit';

export default function GradientHeadline({ props: p }: BlockProps) {
  const ls = lines(p.lines);
  const [ref, seen] = useInView<HTMLDivElement>('-10% 0px');
  const g = `linear-gradient(180deg, ${color(p.from, '#d9f7ff')} 0%, ${color(p.via, '#63e6ff')} 55%, ${color(p.to, '#4ba3ff')} 100%)`;
  return (
    <section style={{ background: color(p.background, '#02070a'), color: color(p.text, '#f2fbff'), minHeight: `${num(p.height, 90, 30, 100)}vh`, display: 'grid', placeItems: 'center', padding: 'clamp(64px,10vw,140px) clamp(16px,5vw,64px)', textAlign: 'center', overflow: 'hidden' }}>
      <div ref={ref}>
        {text(p.kicker) && <p style={{ margin: '0 0 18px', fontSize: 12, letterSpacing: '.3em', textTransform: 'uppercase', opacity: 0.7 }}>{text(p.kicker)}</p>}
        <h2 style={{ margin: 0, fontWeight: 800, textTransform: p.upper === false ? 'none' : 'uppercase', letterSpacing: '-.055em', lineHeight: 0.86, fontSize: `clamp(56px, ${num(p.size, 17, 6, 30)}vw, 260px)` }}>
          {ls.map((l, i) => (
            <span key={i} style={{ display: 'block', ...(i === ls.length - 1 ? { background: g, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : {}), opacity: seen ? 1 : 0, transform: seen ? 'none' : 'translateY(60px)', transition: `opacity 1s ease ${i * 0.12}s, transform 1s cubic-bezier(.22,1,.36,1) ${i * 0.12}s` }}>
              {l}
            </span>
          ))}
        </h2>
        {text(p.body) && <p style={{ margin: '28px auto 0', maxWidth: 440, lineHeight: 1.6, opacity: seen ? 0.65 : 0, transition: 'opacity 1s ease .5s' }}>{text(p.body)}</p>}
      </div>
    </section>
  );
}
