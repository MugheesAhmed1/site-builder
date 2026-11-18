import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { fill, useXP } from '../xp';

export function DescentSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotionPreference();
  const data = useXP();
  const d = data.descent || {};

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const horizontalShift = useTransform(scrollYProgress, [0, 1], [-48, 56]);
  const textOpacity = useTransform(scrollYProgress, [0.08, 0.35, 0.68, 0.92], [0, 1, 1, 0]);

  return (
    <section
      id="descent"
      ref={sectionRef}
      className="relative z-10 min-h-[130vh] w-full flex items-center px-6 sm:px-12 lg:px-20 py-28 pointer-events-none"
    >
      <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 items-center">
        <motion.div
          style={
            reducedMotion
              ? { opacity: textOpacity }
              : { x: horizontalShift, opacity: textOpacity }
          }
          className="lg:col-span-7 lg:pl-[4%] flex flex-col justify-center"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--c-text)]/40 mb-6">
            {fill(d.kicker, data)}
          </span>
          <h2 className="editorial-heading text-[clamp(2.8rem,7.2vw,6.8rem)] leading-[0.92] tracking-[-0.045em]">
            <span className="block text-[var(--c-text)]">{fill(d.line1, data)}</span>
            <span className="block text-[var(--c-accent)] mt-1 sm:mt-2">{fill(d.line2, data)}</span>
          </h2>
        </motion.div>

        {/* Open atmospheric stage on the right where the Abyssal Manta glides in the 3D scene */}
        <div
          aria-hidden="true"
          className="lg:col-span-5 h-[260px] sm:h-[340px] lg:h-[580px] pointer-events-none"
        />
      </div>
    </section>
  );
}
