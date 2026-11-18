// A film that plays forwards and backwards with the scroll, with captions taking turns (from Mossline's opening).
import { useEffect, useRef, useState } from 'react';
import { color, lines, num, safeSrc, useStickyProgress, type BlockProps } from '../kit';

export default function ScrollVideo({ props: p }: BlockProps) {
  const video = useRef<HTMLVideoElement>(null);
  const caps = lines(p.captions);
  const [cap, setCap] = useState(0);
  const want = useRef(0);
  const ref = useStickyProgress<HTMLElement>((pr) => {
    want.current = pr;
    setCap(Math.min(caps.length - 1, Math.floor(pr * caps.length)));
  });
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = video.current;
      if (v && v.duration && !v.seeking) {
        const t = want.current * v.duration;
        if (Math.abs(v.currentTime - t) > 0.04) v.currentTime = v.currentTime + (t - v.currentTime) * 0.35;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const src = safeSrc(p.video);
  const shade = num(p.shade, 0.35, 0, 0.9);
  return (
    <section ref={ref} style={{ position: 'relative', height: `${num(p.length, 3, 1.5, 8) * 100}vh`, background: color(p.background, '#000000'), color: color(p.text, '#ffffff') }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        {src && <video ref={video} src={src} muted playsInline preload="auto" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${shade})` }} />
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '0 clamp(20px,6vw,96px)', textAlign: 'center' }}>
          {caps.map((c, i) => (
            <p key={i} aria-hidden={i !== cap} style={{ gridArea: '1/1', margin: 0, maxWidth: '20ch', fontSize: 'clamp(30px,5.4vw,80px)', lineHeight: 1.02, letterSpacing: '-.03em', fontWeight: 600, opacity: i === cap ? 1 : 0, transform: i === cap ? 'none' : 'translateY(18px)', transition: 'opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1)' }}>
              {c}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
