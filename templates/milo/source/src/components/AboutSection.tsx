import { motion } from 'motion/react';
import { useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { MOTION_EASE } from '../utils/webgl';
import { RevealText } from './RevealText';
import { SectionLabel } from './SectionLabel';
import { fill, lines, useXP } from '../xp';


export function AboutSection() {
  const reducedMotion = useReducedMotionPreference();
  const data = useXP();
  const a = data.about || {};
  const STATS: { value: string; label: string }[] = (Array.isArray(a.stats) ? a.stats : []).map((s: any) => ({ value: fill(s.value, data), label: fill(s.label, data) }));

  return (
    <section
      id="creator"
      className="relative z-10 min-h-[100svh] w-full bg-[var(--c-surface)]/92 rounded-t-[48px] md:rounded-t-[72px] px-6 sm:px-12 lg:px-20 py-24 sm:py-32 lg:py-36 flex flex-col justify-between"
    >
      <div className="w-full max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left column */}
          <div className="lg:col-span-4 flex flex-col">
            <span className="text-[clamp(3.5rem,7vw,6.5rem)] font-extrabold leading-[0.85] tracking-[-0.055em] text-[var(--c-accent)] tabular-nums">
              {fill(a.number, data)}
            </span>
            <SectionLabel className="mt-4 text-[var(--c-text)]/65">{fill(a.label, data)}</SectionLabel>
          </div>

          {/* Right column: line-by-line blurred editorial reveal */}
          <div className="lg:col-span-8">
            <RevealText
              lines={lines(a.text, data)}
              stagger={0.14}
              className="text-[clamp(1.8rem,4vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--c-text)]"
            />
          </div>
        </div>

        {/* Creative statistics without cards, subtle horizontal separators */}
        <div className="mt-24 sm:mt-32 border-t border-[var(--c-text)]/14">
          <div style={{ ['--stat-cols' as string]: Math.max(1, STATS.length) }} className="grid grid-cols-1 md:grid-cols-[repeat(var(--stat-cols),minmax(0,1fr))] divide-y md:divide-y-0 md:divide-x divide-[var(--c-text)]/14">
            {STATS.map((stat, index) => (
              <motion.div
                key={index}
                initial={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 28 }
                }
                whileInView={
                  reducedMotion
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0 }
                }
                viewport={{ once: true, amount: 0.35 }}
                transition={{
                  duration: 0.75,
                  delay: reducedMotion ? 0 : index * 0.1,
                  ease: MOTION_EASE,
                }}
                className="py-10 md:py-12 md:px-10 first:md:pl-0 last:md:pr-0 flex flex-col justify-between"
              >
                <span className="text-[clamp(3rem,7vw,7rem)] font-extrabold leading-[0.9] tracking-[-0.055em] text-[var(--c-text)] tabular-nums">
                  {stat.value}
                </span>
                <span className="mt-4 text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em] text-[var(--c-text)]/50">
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>
          <div className="border-t border-[var(--c-text)]/14" />
        </div>
      </div>
    </section>
  );
}
