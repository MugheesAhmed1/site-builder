import { ArrowUpRight } from '../icons';
import { motion } from 'motion/react';
import { useState } from 'react';
import { ServiceItem } from '../data/portfolioData';
import { useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { MOTION_EASE } from '../utils/webgl';

interface ServiceRowProps {
  service: ServiceItem;
  index: number;
  onSelect: (serviceTitle: string) => void;
}

export function ServiceRow({ service, index, onSelect }: ServiceRowProps) {
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotionPreference();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.7,
        delay: reducedMotion ? 0 : index * 0.08,
        ease: MOTION_EASE,
      }}
    >
      <button
        type="button"
        onClick={() => onSelect(service.title)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        data-cursor="OPEN"
        className="w-full text-left min-h-[164px] md:min-h-[200px] py-8 md:py-10 px-4 sm:px-8 border-b border-[var(--c-lightText)]/[0.18] first:border-t first:border-[var(--c-lightText)]/[0.18] transition-colors duration-[400ms] ease-out flex flex-col md:flex-row md:items-center justify-between gap-6 group"
        style={{
          backgroundColor: hovered ? 'color-mix(in srgb, var(--c-page) 4.5%, transparent)' : 'transparent',
        }}
      >
        <div className="flex items-baseline gap-6 sm:gap-10 md:w-[54%]">
          <span
            className="text-xs sm:text-sm font-semibold tracking-[0.16em] text-[var(--c-lightText)]/45 tabular-nums transition-transform duration-[400ms] ease-out"
            style={{
              transform:
                !reducedMotion && hovered ? 'translateY(-6px)' : 'translateY(0px)',
            }}
          >
            {service.number}
          </span>
          <h3
            className="text-3xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-[-0.045em] leading-[0.95] text-[var(--c-lightText)] transition-transform duration-[400ms] ease-out"
            style={{
              transform:
                !reducedMotion && hovered ? 'translateX(20px)' : 'translateX(0px)',
            }}
          >
            {service.title}
          </h3>
        </div>

        <div className="flex items-center justify-between gap-6 md:w-[44%]">
          <p
            className="max-w-[380px] text-sm sm:text-base font-normal leading-[1.6] text-[var(--c-lightText)] transition-opacity duration-[400ms] ease-out"
            style={{
              opacity: hovered ? 1 : 0.65,
            }}
          >
            {service.description}
          </p>

          <span
            aria-hidden="true"
            className="shrink-0 w-10 h-10 rounded-full border border-[var(--c-lightText)]/25 flex items-center justify-center transition-all duration-[400ms] ease-out"
            style={{
              opacity: hovered ? 1 : 0,
              transform:
                !reducedMotion && hovered
                  ? 'scale(1) translateX(0)'
                  : 'scale(0.8) translateX(-8px)',
              backgroundColor: 'var(--c-lightText)',
              color: 'var(--c-light)',
            }}
          >
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </button>
    </motion.div>
  );
}
