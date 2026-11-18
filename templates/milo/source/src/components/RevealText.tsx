import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { MOTION_EASE } from '../utils/webgl';

interface RevealTextProps {
  lines?: string[];
  children?: ReactNode;
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
}

export function RevealText({
  lines,
  children,
  className = '',
  lineClassName = '',
  delay = 0,
  stagger = 0.12,
}: RevealTextProps) {
  const reducedMotion = useReducedMotionPreference();

  if (lines && lines.length > 0) {
    return (
      <div className={className}>
        {lines.map((line, index) => (
          <motion.span
            key={index}
            className={`block ${lineClassName}`}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 40, filter: 'blur(8px)' }
            }
            whileInView={
              reducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, filter: 'blur(0px)' }
            }
            viewport={{ once: true, amount: 0.35 }}
            transition={{
              duration: reducedMotion ? 0.3 : 0.9,
              delay: reducedMotion ? 0 : delay + index * stagger,
              ease: MOTION_EASE,
            }}
          >
            {line}
          </motion.span>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={
        reducedMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 32, filter: 'blur(6px)' }
      }
      whileInView={
        reducedMotion
          ? { opacity: 1 }
          : { opacity: 1, y: 0, filter: 'blur(0px)' }
      }
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: reducedMotion ? 0.3 : 0.85,
        delay: reducedMotion ? 0 : delay,
        ease: MOTION_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}
