import { motion, useScroll, useSpring } from 'motion/react';
import { useReducedMotionPreference } from '../hooks/usePortfolioHooks';

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reducedMotion = useReducedMotionPreference();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div
      aria-hidden="true"
      className="hidden md:block fixed right-6 top-1/2 -translate-y-1/2 z-40 h-36 w-[2px] rounded-full overflow-hidden pointer-events-none"
      style={{ backgroundColor: 'color-mix(in srgb, var(--c-text) 15%, transparent)' }}
    >
      <motion.div
        className="w-full h-full origin-top rounded-full"
        style={{
          backgroundColor: 'var(--c-accent)',
          scaleY: reducedMotion ? scrollYProgress : scaleY,
        }}
      />
    </div>
  );
}
