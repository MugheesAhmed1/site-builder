// A small live 3D world the visitor can turn and zoom (the project worlds from the Milo template).
import { useState } from 'react';
import { ProjectVisualScene } from '../../templates/milo/source/src/components/ProjectVisualScene';
import { color, num, text, useInView, type BlockProps } from '../kit';

const WORLDS = ['abyss', 'orbital', 'tideline', 'echo'] as const;

export default function World3D({ props: p }: BlockProps) {
  const [ref, near] = useInView<HTMLDivElement>('200px', false);
  const [seen, setSeen] = useState(false);
  if (near && !seen) setSeen(true);
  const world = WORLDS.includes(p.world) ? p.world : 'abyss';
  return (
    <section style={{ background: color(p.background, '#02070a'), color: color(p.text, '#f2fbff'), padding: 'clamp(48px,8vw,110px) clamp(16px,5vw,80px)' }}>
      <style>{`.xpl-world-fill{position:relative;overflow:hidden;width:100%;height:100%}`}</style>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 'clamp(24px,4vw,56px)', alignItems: 'center' }}>
        <div>
          {text(p.kicker) && <p style={{ margin: '0 0 12px', fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', opacity: 0.6 }}>{text(p.kicker)}</p>}
          <h2 style={{ margin: 0, fontSize: 'clamp(34px,5vw,72px)', lineHeight: 0.92, letterSpacing: '-.04em', fontWeight: 800 }}>{text(p.title)}</h2>
          {text(p.body) && <p style={{ margin: '18px 0 0', lineHeight: 1.6, opacity: 0.75 }}>{text(p.body)}</p>}
        </div>
        <div ref={ref} style={{ height: `${num(p.height, 60, 30, 90)}vh`, minHeight: 300, borderRadius: 32, overflow: 'hidden', border: '1px solid rgba(255,255,255,.12)' }}>
          {seen && <ProjectVisualScene visualType={world} active={near} interactiveOrbit={p.orbit !== false} className="xpl-world-fill" />}
        </div>
      </div>
    </section>
  );
}
