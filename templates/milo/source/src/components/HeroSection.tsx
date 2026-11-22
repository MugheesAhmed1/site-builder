import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { MOTION_EASE } from '../utils/webgl';
import { SectionLabel } from './SectionLabel';
import { fill, useXP } from '../xp';
import { CharacterSlot, hasCharacter, stageClass, stageStyle, toneClass, toneStyle } from '../character';

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotionPreference();
  const data = useXP();
  const h = data.hero || {};

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const contentY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);
  const contentScale = useTransform(scrollYProgress, [0, 0.85], [1, 0.92]);
  const indicatorOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const char = hasCharacter(data);
  // With a 3D character the title steps down so the character has room under it.
  const big = char ? 'text-[clamp(3.2rem,16vw,6rem)] md:text-[clamp(4rem,10vw,9.5rem)]' : 'text-[clamp(4rem,23vw,8rem)] md:text-[clamp(5rem,19vw,18rem)]';

  return (
    <section
      id="surface"
      ref={sectionRef}
      className={`relative z-10 min-h-[100svh] w-full flex flex-col items-center justify-center px-5 sm:px-8 pt-20 pb-28 select-none${char ? ` ${toneClass(data, 'dark')}` : ''}`}
      style={char ? toneStyle(data) : undefined}
    >
      {/* The character's gradient, fading into the ocean below it. */}
      {char && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 -z-10 pointer-events-none ${stageClass(data)}`}
          style={{ ...stageStyle(data, [50, 80]), maskImage: 'linear-gradient(180deg, #000 58%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, #000 58%, transparent 100%)' }}
        />
      )}
      <motion.div
        style={
          reducedMotion
            ? { opacity: contentOpacity }
            : { y: contentY, opacity: contentOpacity, scale: contentScale }
        }
        className="w-full max-w-[1440px] mx-auto flex flex-col items-center text-center"
      >
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: reducedMotion ? 0 : 0.2, ease: MOTION_EASE }}
          className="mb-3 sm:mb-4"
        >
          <SectionLabel className="text-[var(--c-text)]/65">
            {fill(h.label, data)}
          </SectionLabel>
        </motion.div>

        <motion.span
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: reducedMotion ? 0 : 0.25, ease: MOTION_EASE }}
          className="text-xs sm:text-sm font-semibold uppercase tracking-[0.34em] text-[var(--c-accent)]/85 mb-2 sm:mb-3"
        >
          {fill(h.kicker, data)}
        </motion.span>

        <h1 className="w-full flex flex-col items-center editorial-heading uppercase">
          <motion.span
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 50 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: reducedMotion ? 0 : 0.3, ease: MOTION_EASE }}
            className={`block text-[var(--c-text)] ${big} leading-[0.86] tracking-[-0.055em]`}
          >
            {fill(h.line1, data)}
          </motion.span>
          <motion.span
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 80 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: reducedMotion ? 0 : 0.4, ease: MOTION_EASE }}
            className={`block cyan-text-gradient ${big} leading-[0.86] tracking-[-0.055em]`}
          >
            {fill(h.line2, data)}
          </motion.span>
        </h1>

        <motion.p
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: reducedMotion ? 0 : 0.7, ease: MOTION_EASE }}
          className="mt-7 sm:mt-9 max-w-[420px] text-center font-normal leading-[1.6] tracking-[0.015em] text-[var(--c-text)]/60 text-[clamp(0.9rem,1.2vw,1.1rem)] text-balance"
        >
          {fill(h.text, data)}
        </motion.p>
        {char && <CharacterSlot data={data} className="mt-4 sm:mt-6 w-[min(560px,88vw)] h-[36svh] min-h-[260px]" />}
      </motion.div>

      <motion.div
        style={{ opacity: indicatorOpacity }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: reducedMotion ? 0 : 1.0, ease: MOTION_EASE }}
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--c-text)]/50 whitespace-nowrap">
          {fill(h.scrollHint, data)}
        </span>
        <div
          aria-hidden="true"
          className="relative w-[1px] h-[70px] overflow-hidden"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--c-text) 28%, transparent) 0%, color-mix(in srgb, var(--c-accent) 8%, transparent) 100%)',
          }}
        >
          {!reducedMotion && (
            <motion.span
              className="absolute left-1/2 -translate-x-1/2 w-[3px] h-[14px] rounded-full bg-[var(--c-accent)]"
              style={{
                boxShadow: '0 0 10px color-mix(in srgb, var(--c-accent) 95%, transparent)',
              }}
              animate={{ y: [-14, 70] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </div>
      </motion.div>
    </section>
  );
}
