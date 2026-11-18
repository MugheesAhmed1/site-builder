import { useEffect, useRef } from 'react';
import { fill, safeSrc, useXP, type XP } from '../xp';
import { SafeImage } from './SafeImage';

export function MarqueeSection() {
  const data = useXP();
  const mq: XP = data.marquee || {};
  const row = (l: XP[] | undefined) => (l || []).map((x) => safeSrc(x.image)).filter(Boolean);
  const MARQUEE_ROW_1 = row(mq.row1);
  const MARQUEE_ROW_2 = row(mq.row2);
  const speed = Number(data.motion?.marqueeSpeed ?? 0.3);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const sectionRef = useRef<HTMLElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  const row1Images = [...MARQUEE_ROW_1, ...MARQUEE_ROW_1, ...MARQUEE_ROW_1];
  const row2Images = [...MARQUEE_ROW_2, ...MARQUEE_ROW_2, ...MARQUEE_ROW_2];

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId: number | null = null;

    const updateTransform = () => {
      if (!sectionRef.current || !row1Ref.current || !row2Ref.current) return;

      const sectionTop = sectionRef.current.offsetTop;
      const offset = prefersReducedMotion
        ? 0
        : (window.scrollY - sectionTop + window.innerHeight) * speedRef.current;

      row1Ref.current.style.transform = `translate3d(${offset - 200}px, 0, 0)`;
      row2Ref.current.style.transform = `translate3d(${-(offset - 200)}px, 0, 0)`;
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        updateTransform();
        rafId = null;
      });
    };

    updateTransform();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [MARQUEE_ROW_1.length, MARQUEE_ROW_2.length]);

  return (
    <section
      ref={sectionRef}
      aria-label={fill(mq.label, data)}
      className="w-full bg-[var(--c-page)] pt-24 sm:pt-32 md:pt-40 pb-10 overflow-hidden"
    >
      <div className="flex flex-col gap-3">
        {/* Row 1: Moves RIGHT on scroll */}
        <div
          ref={row1Ref}
          className="flex flex-nowrap gap-3"
          style={{
            marginLeft: `${-432 * MARQUEE_ROW_1.length}px`,
            willChange: 'transform',
          }}
        >
          {row1Images.map((src, idx) => (
            <div
              key={`r1-${idx}`}
              className="w-[420px] h-[270px] shrink-0 rounded-2xl overflow-hidden bg-[var(--c-surface)]"
            >
              <SafeImage
                src={src}
                alt=""
                loading="lazy"
                fallbackLabel={`Reel 0${(idx % MARQUEE_ROW_1.length) + 1}`}
                className="w-[420px] h-[270px] rounded-2xl object-cover block"
              />
            </div>
          ))}
        </div>

        {/* Row 2: Moves LEFT on scroll */}
        <div
          ref={row2Ref}
          className="flex flex-nowrap gap-3"
          style={{
            marginLeft: `${-432 * MARQUEE_ROW_2.length}px`,
            willChange: 'transform',
          }}
        >
          {row2Images.map((src, idx) => (
            <div
              key={`r2-${idx}`}
              className="w-[420px] h-[270px] shrink-0 rounded-2xl overflow-hidden bg-[var(--c-surface)]"
            >
              <SafeImage
                src={src}
                alt=""
                loading="lazy"
                fallbackLabel={`Showcase 0${(idx % MARQUEE_ROW_2.length) + 1}`}
                className="w-[420px] h-[270px] rounded-2xl object-cover block"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
