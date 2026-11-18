import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, X } from '../icons';
import { useEffect } from 'react';
import { Project, pad, projectsOf } from '../data/portfolioData';
import { fill, useXP } from '../xp';
import { useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { MOTION_EASE } from '../utils/webgl';
import { ProjectVisualScene } from './ProjectVisualScene';

interface ProjectExperienceProps {
  project: Project | null;
  onClose: () => void;
  onSelectProject: (project: Project) => void;
  onInquire: (contextLabel: string) => void;
}

export function ProjectExperience({
  project,
  onClose,
  onSelectProject,
  onInquire,
}: ProjectExperienceProps) {
  const reducedMotion = useReducedMotionPreference();
  const data = useXP();
  const ps = data.projects || {};
  const PROJECTS = projectsOf(data);

  useEffect(() => {
    if (!project) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [project, onClose]);

  const currentIndex = project
    ? PROJECTS.findIndex((p) => p.id === project.id)
    : -1;
  const prevProject =
    currentIndex >= 0
      ? PROJECTS[(currentIndex - 1 + PROJECTS.length) % PROJECTS.length]
      : null;
  const nextProject =
    currentIndex >= 0
      ? PROJECTS[(currentIndex + 1) % PROJECTS.length]
      : null;

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${project.title} case study`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: MOTION_EASE }}
          className="fixed inset-0 z-[160] bg-[var(--c-page)] text-[var(--c-text)] overflow-y-auto"
        >
          <div className="min-h-full flex flex-col justify-between px-5 sm:px-10 lg:px-16 py-6 sm:py-8 max-w-[1440px] mx-auto">
            {/* Top header */}
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-[var(--c-text)]/10">
              <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--c-text)]/55 tabular-nums">
                <span className="text-[var(--c-accent)]">{project.number} / {pad(PROJECTS.length)}</span>
                <span aria-hidden="true">·</span>
                <span>{project.title}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                data-cursor="OPEN"
                aria-label="Close project view"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-text)]/80 hover:text-[var(--c-accent)] transition-colors py-2 px-4 rounded-full border border-[var(--c-text)]/15"
              >
                <span>{fill(data.nav?.close, data)}</span>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive 3D Viewport + Case Study Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 my-auto py-8 items-center">
              <motion.div
                key={project.id}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: MOTION_EASE }}
                className="lg:col-span-7 relative h-[44vh] sm:h-[54vh] lg:h-[64vh] rounded-[28px] lg:rounded-[36px] overflow-hidden border border-[var(--c-text)]/14 bg-[var(--c-surface)]"
              >
                <ProjectVisualScene
                  visualType={project.visualType}
                  active={true}
                  interactiveOrbit={true}
                />
                <span className="pointer-events-none absolute bottom-4 left-5 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--c-text)]/45">
                  {fill(ps.orbitHint, data)}
                </span>
              </motion.div>

              <div className="lg:col-span-5 flex flex-col gap-6">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--c-accent)]">
                    {project.category} · {project.year}
                  </span>
                  <h2 className="mt-2 text-4xl sm:text-6xl font-extrabold tracking-[-0.05em] leading-[0.92] text-[var(--c-text)]">
                    {project.title}
                  </h2>
                </div>

                <p className="text-base sm:text-lg text-[var(--c-text)]/80 leading-[1.6]">
                  {project.narrative}
                </p>

                <div className="grid grid-cols-2 gap-6 py-5 border-y border-[var(--c-text)]/12 text-sm">
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--c-text)]/40 mb-1">
                      {fill(ps.clientLabel, data)}
                    </span>
                    <span className="text-[var(--c-text)]/90 font-medium">{project.client}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--c-text)]/40 mb-1">
                      {fill(ps.roleLabel, data)}
                    </span>
                    <span className="text-[var(--c-text)]/90 font-medium">{project.role}</span>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--c-text)]/40 mb-2">
                    {fill(ps.deliverablesLabel, data)}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--c-text)]/75">
                    {project.deliverables.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-3">
                        <span>{item}</span>
                        {idx < project.deliverables.length - 1 && (
                          <span aria-hidden="true" className="text-[var(--c-accent)]/50">
                            /
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    data-cursor="OPEN"
                    onClick={() => {
                      onClose();
                      onInquire(`${fill(ps.inquirePrefix, data)} ${project.title}`.trim());
                    }}
                    className="group inline-flex items-center gap-3 rounded-full border border-[var(--c-accent)]/45 bg-[var(--c-accent)]/10 hover:bg-[var(--c-accent)] text-[var(--c-text)] hover:text-[var(--c-page)] px-7 py-4 text-xs font-bold uppercase tracking-[0.18em] transition-all duration-300"
                  >
                    <span>{fill(ps.commission, data)}</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom project switcher */}
            <div className="flex items-center justify-between pt-6 border-t border-[var(--c-text)]/10">
              {prevProject && PROJECTS.length > 1 && (
                <button
                  type="button"
                  data-cursor="VIEW"
                  onClick={() => onSelectProject(prevProject)}
                  className="group inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-text)]/60 hover:text-[var(--c-accent)] transition-colors py-2"
                >
                  <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                  <span>{prevProject.number} · {prevProject.title}</span>
                </button>
              )}

              {nextProject && PROJECTS.length > 1 && (
                <button
                  type="button"
                  data-cursor="VIEW"
                  onClick={() => onSelectProject(nextProject)}
                  className="group inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-text)]/60 hover:text-[var(--c-accent)] transition-colors py-2"
                >
                  <span>{nextProject.number} · {nextProject.title}</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
