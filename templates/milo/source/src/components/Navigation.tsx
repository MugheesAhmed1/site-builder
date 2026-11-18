import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, X } from '../icons';
import { useEffect, useState } from 'react';
import { Project, chaptersOf, projectsOf } from '../data/portfolioData';
import { fill, useXP } from '../xp';
import { useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { MOTION_EASE } from '../utils/webgl';

interface NavigationProps {
  onSelectProject: (project: Project) => void;
}

export function Navigation({ onSelectProject }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentWorld, setCurrentWorld] = useState('01');
  const reducedMotion = useReducedMotionPreference();
  const data = useXP();
  const n = data.nav || {};
  const PROJECTS = projectsOf(data);
  const NAV_SECTIONS = chaptersOf(data);
  const mark = fill(data.brand?.mark || data.brand?.name, data);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = y / maxScroll;
      if (progress < 0.16) setCurrentWorld('01');
      else if (progress < 0.34) setCurrentWorld('02');
      else if (progress < 0.56) setCurrentWorld('03');
      else if (progress < 0.82) setCurrentWorld('04');
      else setCurrentWorld('05');
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const scrollToSection = (targetId: string) => {
    setMenuOpen(false);
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <>
      <motion.header
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -15 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: MOTION_EASE }}
        className="fixed top-6 left-6 right-6 z-[100] pointer-events-none"
      >
        <nav
          aria-label="Primary navigation"
          className="pointer-events-auto mx-auto flex items-center justify-between rounded-full px-[18px] py-3 transition-all duration-300"
          style={{
            backgroundColor: scrolled
              ? 'color-mix(in srgb, var(--c-page) 72%, transparent)'
              : 'color-mix(in srgb, var(--c-page) 28%, transparent)',
            border: scrolled
              ? '1px solid color-mix(in srgb, var(--c-text) 24%, transparent)'
              : '1px solid color-mix(in srgb, var(--c-text) 12%, transparent)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            opacity: scrolled ? 1 : 0.85,
          }}
        >
          <a
            href="#surface"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('surface');
            }}
            data-cursor="OPEN"
            className="text-xs sm:text-sm font-bold tracking-[0.14em] text-[var(--c-text)] whitespace-nowrap shrink-0 hover:text-[var(--c-accent)] transition-colors"
          >
            {mark}
          </a>

          <span className="hidden md:inline-block text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--c-text)]/65 tabular-nums whitespace-nowrap shrink-0 select-none">
            {fill(n.world, data)} / {currentWorld}
          </span>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-label="Open navigation menu"
            data-cursor="OPEN"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-text)] hover:text-[var(--c-accent)] transition-colors whitespace-nowrap shrink-0 py-1 px-2 -mr-1 rounded-full"
          >
            {fill(n.menu, data)}
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: MOTION_EASE }}
            className="fixed inset-0 z-[150] bg-[var(--c-page)]/96 flex flex-col justify-between px-6 sm:px-12 lg:px-20 py-8 overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold tracking-[0.14em] text-[var(--c-text)]">
                {mark}
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
                data-cursor="OPEN"
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-text)]/80 hover:text-[var(--c-accent)] transition-colors py-2 px-3 rounded-full border border-[var(--c-text)]/15"
              >
                <span>{fill(n.close, data)}</span>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 my-auto py-12">
              <div className="lg:col-span-7 flex flex-col gap-3 sm:gap-4">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--c-text)]/40 mb-2">
                  {fill(n.chaptersTitle, data)}
                </span>
                {NAV_SECTIONS.map((item, index) => (
                  <motion.button
                    key={index}
                    type="button"
                    onClick={() => scrollToSection(item.targetId)}
                    data-cursor="OPEN"
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
                    animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: reducedMotion ? 0 : 0.06 + index * 0.05,
                      ease: MOTION_EASE,
                    }}
                    className="group flex items-baseline gap-4 sm:gap-6 text-left py-1.5"
                  >
                    <span className="text-xs sm:text-sm font-medium tabular-nums text-[var(--c-accent)]/70 group-hover:text-[var(--c-accent)] transition-colors">
                      {item.index}
                    </span>
                    <span className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.04em] text-[var(--c-text)] group-hover:text-[var(--c-accent)] group-hover:translate-x-3 transition-all duration-300">
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              <div className="lg:col-span-5 flex flex-col justify-end lg:border-l lg:border-[var(--c-text)]/10 lg:pl-12">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--c-text)]/40 mb-5">
                  {fill(n.worksTitle, data)}
                </span>
                <div className="flex flex-col divide-y divide-[var(--c-text)]/10">
                  {PROJECTS.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      data-cursor="VIEW"
                      onClick={() => {
                        setMenuOpen(false);
                        onSelectProject(project);
                      }}
                      className="group flex items-center justify-between py-4 text-left"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs tabular-nums text-[var(--c-text)]/40">
                            {project.number}
                          </span>
                          <span className="text-lg font-semibold tracking-tight text-[var(--c-text)] group-hover:text-[var(--c-accent)] transition-colors">
                            {project.title}
                          </span>
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--c-text)]/45 block mt-0.5">
                          {project.category} · {project.year}
                        </span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[var(--c-text)]/40 group-hover:text-[var(--c-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[var(--c-text)]/10 text-xs uppercase tracking-[0.18em] text-[var(--c-text)]/45">
              <span>{fill(data.brand?.email, data)}</span>
              <span>{fill(data.brand?.tagline, data)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
