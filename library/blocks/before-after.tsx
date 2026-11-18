// Two pictures split by a glowing line the visitor drags (after Distill's scanner).
import { useRef, useState } from 'react';
import { color, num, safeSrc, text, type BlockProps } from '../kit';

export default function BeforeAfter({ props: p }: BlockProps) {
  const [pos, setPos] = useState(num(p.start, 50, 0, 100));
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const glow = color(p.glow, '#ff5a1f');
  const at = (x: number) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setPos(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  };
  const before = safeSrc(p.before);
  const after = safeSrc(p.after);
  const tag = { position: 'absolute', top: 16, padding: '6px 12px', borderRadius: 999, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase' } as const;
  return (
    <section style={{ background: color(p.background, '#eef0f2'), color: color(p.text, '#0f1115'), padding: 'clamp(56px,9vw,120px) clamp(16px,5vw,80px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {text(p.title) && <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(30px,4.6vw,60px)', letterSpacing: '-.03em', lineHeight: 1 }}>{text(p.title)}</h2>}
        {text(p.body) && <p style={{ margin: '0 0 28px', opacity: 0.7, lineHeight: 1.6, maxWidth: '56ch' }}>{text(p.body)}</p>}
        <div
          ref={box}
          onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); at(e.clientX); }}
          onPointerMove={(e) => drag.current && at(e.clientX)}
          onPointerUp={() => (drag.current = false)}
          style={{ position: 'relative', aspectRatio: '16 / 10', borderRadius: 'clamp(14px,2vw,28px)', overflow: 'hidden', cursor: 'ew-resize', touchAction: 'pan-y', userSelect: 'none', background: '#222' }}
        >
          {after && <img src={after} alt={text(p.afterLabel)} draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          {before && <img src={before} alt={text(p.beforeLabel)} draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
          {text(p.beforeLabel) && <span style={{ ...tag, left: 16 }}>{text(p.beforeLabel)}</span>}
          {text(p.afterLabel) && <span style={{ ...tag, right: 16 }}>{text(p.afterLabel)}</span>}
          <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 3, marginLeft: -1.5, background: glow, boxShadow: `0 0 12px 2px ${glow}, 0 0 40px 10px ${glow}66` }} />
          <input type="range" min={0} max={100} value={Math.round(pos)} onChange={(e) => setPos(Number(e.target.value))} aria-label={text(p.sliderLabel) || 'Compare'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'ew-resize', margin: 0 }} />
        </div>
      </div>
    </section>
  );
}
