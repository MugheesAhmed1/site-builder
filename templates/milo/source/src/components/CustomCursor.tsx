import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';
import { useIsFinePointer, useReducedMotionPreference } from '../hooks/usePortfolioHooks';

export function CustomCursor() {
  const isFinePointer = useIsFinePointer();
  const reducedMotion = useReducedMotionPreference();
  const enabled = isFinePointer && !reducedMotion;

  const [visible, setVisible] = useState(false);
  const [cursorLabel, setCursorLabel] = useState<string | null>(null);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const springX = useSpring(mouseX, { stiffness: 450, damping: 32, mass: 0.35 });
  const springY = useSpring(mouseY, { stiffness: 450, damping: 32, mass: 0.35 });

  useEffect(() => {
    if (!enabled) {
      document.body.classList.remove('custom-cursor-active');
      return;
    }

    document.body.classList.add('custom-cursor-active');

    const handleMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setVisible(true);

      const target = e.target as HTMLElement | null;
      const interactive = target?.closest('[data-cursor], a, button') as HTMLElement | null;
      if (interactive) {
        const custom = interactive.getAttribute('data-cursor');
        setCursorLabel(custom || 'OPEN');
      } else {
        setCursorLabel(null);
      }
    };

    const handleLeave = () => {
      setVisible(false);
      setCursorLabel(null);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    document.addEventListener('mouseleave', handleLeave);

    return () => {
      document.body.classList.remove('custom-cursor-active');
      window.removeEventListener('pointermove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, [enabled, mouseX, mouseY]);

  if (!enabled) return null;

  const isExpanded = Boolean(cursorLabel);

  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 z-[200] pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full mix-blend-difference"
      style={{
        x: springX,
        y: springY,
      }}
      animate={{
        width: isExpanded ? 46 : 6,
        height: isExpanded ? 46 : 6,
        opacity: visible ? 1 : 0,
        backgroundColor: isExpanded ? 'color-mix(in srgb, var(--c-text) 96%, transparent)' : 'var(--c-accent)',
      }}
      transition={{
        width: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
        height: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.15 },
      }}
    >
      {isExpanded && (
        <span className="text-[9px] font-bold tracking-[0.16em] text-[var(--c-page)] uppercase select-none">
          {cursorLabel}
        </span>
      )}
    </motion.div>
  );
}
