import { motion, useMotionValue, useSpring } from 'motion/react';
import { MouseEvent, ReactNode, useRef } from 'react';
import { useIsFinePointer, useReducedMotionPreference } from '../hooks/usePortfolioHooks';

interface MagneticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  cursorLabel?: 'VIEW' | 'OPEN';
  strength?: number;
  type?: 'button' | 'submit' | 'reset';
}

export function MagneticButton({
  children,
  onClick,
  className = '',
  ariaLabel,
  cursorLabel = 'OPEN',
  strength = 0.22,
  type = 'button',
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const isFinePointer = useIsFinePointer();
  const reducedMotion = useReducedMotionPreference();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 20, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 20, mass: 0.4 });

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!isFinePointer || reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(Math.max(-14, Math.min(14, dx * strength)));
    y.set(Math.max(-14, Math.min(14, dy * strength)));
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label={ariaLabel}
      data-cursor={cursorLabel}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.button>
  );
}
