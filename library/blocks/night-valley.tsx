// The night valley from the Fernhollow template: thousands of flowers and leaves under the stars,
// with bloom and grain. It starts when the section comes near the screen and stops when it leaves.
import { useEffect, useRef } from 'react';
import { ValleyEngine } from './valley/ValleyEngine';
import { AudioEngine } from './valley/AudioEngine';
import { color, num, text, useInView, type BlockProps } from '../kit';

export default function NightValley({ props: p }: BlockProps) {
  const [ref, near] = useInView<HTMLDivElement>('100px', false);
  const stage = useRef<HTMLDivElement>(null);
  const key = JSON.stringify([p.sky, p.fog, p.glow, p.flowers, p.density, p.stars, p.bloom]);
  useEffect(() => {
    const el = stage.current;
    if (!near || !el) return;
    const audio = new AudioEngine({ enabled: false });
    const density = num(p.density, 0.6, 0.1, 1);
    const engine = new ValleyEngine(el, () => undefined, () => undefined, audio, {
      sky: color(p.sky, '#030508'),
      fog: color(p.fog, '#04070b'),
      glow: color(p.glow, '#f5e6c2'),
      flowers: [color(p.flowers, '#f5efe2'), '#f6e6c9', '#e6c2b8', '#b6bfe8', '#9dd6c3'],
      flowerCount: Math.round(15000 * density),
      leafCount: Math.round(10000 * density),
      stars: num(p.stars, 450, 0, 2000),
      bloom: num(p.bloom, 0.58, 0, 2),
    });
    return () => {
      engine.dispose();
      audio.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, key]);
  return (
    <section ref={ref} style={{ position: 'relative', height: `${num(p.height, 100, 50, 100)}vh`, minHeight: 420, overflow: 'hidden', background: color(p.sky, '#030508'), color: color(p.text, '#f5efe2') }}>
      <div ref={stage} style={{ position: 'absolute', inset: 0 }}>
        <div className="js-canvas-container" style={{ position: 'absolute', inset: 0 }} />
      </div>
      <div style={{ position: 'absolute', left: 'clamp(20px,6vw,96px)', bottom: 'clamp(28px,8vh,96px)', maxWidth: 560, pointerEvents: 'none' }}>
        {text(p.kicker) && <p style={{ margin: '0 0 12px', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', opacity: 0.7 }}>{text(p.kicker)}</p>}
        <h2 style={{ margin: 0, fontSize: 'clamp(36px,6vw,88px)', lineHeight: 0.95, letterSpacing: '-.03em', fontWeight: 400 }}>{text(p.title)}</h2>
        {text(p.body) && <p style={{ margin: '16px 0 0', lineHeight: 1.6, opacity: 0.8 }}>{text(p.body)}</p>}
      </div>
    </section>
  );
}
