import { ArrowRight } from '../icons';
import {
  MotionValue,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react';
import { useRef, useState } from 'react';
import { Project, pad, projectsOf } from '../data/portfolioData';
import { fill, lines, useXP } from '../xp';
import { useIsMobile, useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { ProjectPreview } from './ProjectPreview';
import { RevealText } from './RevealText';
import { SectionLabel } from './SectionLabel';

interface ProjectsSectionProps {
  onSelectProject: (project: Project) => void;
}

interface DesktopSlideProps {
  project: Project;
  index: number;
  total: number;
  progress: MotionValue<number>;
  isActive: boolean;
  reducedMotion: boolean;
  onSelectProject: (project: Project) => void;
  viewLabel: string;
}

function DesktopProjectSlide({
  project,
  index,
  total,
  progress,
  isActive,
  reducedMotion,
  onSelectProject,
  viewLabel,
}: DesktopSlideProps) {
  const step = 1 / Math.max(1, total - 1);
  const center = index * step;

  // Function transforms: the offset form would reach outside 0..1 for the first and last slide,
  // which the browser's own scroll animations refuse.
  const near = (v: number) => Math.max(0, 1 - Math.abs(v - center) / step);
  const opacity = useTransform(progress, (v) => 0.25 + 0.75 * near(v));
  const scale = useTransform(progress, (v) => 0.92 + 0.08 * near(v));

  return (
    <motion.article
      style={reducedMotion ? { opacity } : { opacity, scale }}
      className="shrink-0 w-[70vw] flex flex-col justify-center"
    >
      <ProjectPreview
        project={project}
        onOpen={onSelectProject}
        isActive={isActive}
        className="w-[70vw] h-[58vh] xl:h-[64vh] max-h-[680px]"
      />

      <div className="mt-6 flex items-end justify-between gap-8 px-1">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--c-text)]/50 tabular-nums">
            <span className="text-[var(--c-accent)]">{project.number} / {pad(total)}</span>
            <span aria-hidden="true">·</span>
            <span>{project.category}</span>
            <span aria-hidden="true">·</span>
            <span>{project.year}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <h3 className="text-3xl lg:text-5xl font-extrabold tracking-[-0.04em] text-[var(--c-text)]">
              {project.title}
            </h3>
            <p className="max-w-[460px] text-sm text-[var(--c-text)]/60 leading-[1.55]">
              {project.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectProject(project)}
          data-cursor="VIEW"
          className="group inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-text)] hover:text-[var(--c-accent)] transition-colors whitespace-nowrap shrink-0 py-2"
        >
          <span>{viewLabel}</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-out group-hover:translate-x-[8px]" />
        </button>
      </div>
    </motion.article>
  );
}

export function ProjectsSection({ onSelectProject }: ProjectsSectionProps) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile(768);
  const reducedMotion = useReducedMotionPreference();
  const [activeIndex, setActiveIndex] = useState(0);
  const data = useXP();
  const ps = data.projects || {};
  const PROJECTS = projectsOf(data);
  const viewLabel = fill(ps.view, data);

  const { scrollYProgress } = useScroll({
    target: galleryRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const idx = Math.round(latest * Math.max(0, PROJECTS.length - 1));
    if (idx !== activeIndex) {
      setActiveIndex(idx);
    }
  });

  // Slide width = 70vw, gap = 8vw -> step = 78vw. Left margin = 15vw to center 70vw slide.
  const xTrack = useTransform(
    scrollYProgress,
    [0, 1],
    ['15vw', `${15 - Math.max(0, PROJECTS.length - 1) * 78}vw`]
  );

  return (
    <section
      id="projects"
      className="relative z-30 -mt-12 w-full bg-[var(--c-page)] text-[var(--c-text)] rounded-t-[60px] md:rounded-t-[80px] pt-24 sm:pt-32 pb-16 md:pb-24"
    >
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-12 lg:px-20 mb-14 md:mb-10">
        <SectionLabel className="text-[var(--c-text)]/45 mb-6">
          {fill(ps.label, data)}
        </SectionLabel>
        <RevealText>
          <h2 className="editorial-heading text-[clamp(3.6rem,11.5vw,10.5rem)] leading-[0.86] tracking-[-0.055em]">
            {lines(ps.title, data).map((l, i, all) => (
              <span key={i} className={i === all.length - 1 ? 'block cyan-text-gradient' : 'block text-[var(--c-text)]'}>{l}</span>
            ))}
          </h2>
        </RevealText>
      </div>

      {/* Desktop horizontal sticky gallery */}
      {!isMobile ? (
        <div ref={galleryRef} className="relative w-full" style={{ height: `${Math.max(1, PROJECTS.length) * 75}vh` }}>
          <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-center">
            <motion.div
              style={{ x: xTrack }}
              className="flex items-center gap-[8vw] will-change-transform"
            >
              {PROJECTS.map((project, index) => (
                <DesktopProjectSlide
                  key={project.id}
                  project={project}
                  index={index}
                  total={PROJECTS.length}
                  progress={scrollYProgress}
                  isActive={Math.abs(index - activeIndex) <= 1}
                  reducedMotion={reducedMotion}
                  onSelectProject={onSelectProject}
                  viewLabel={viewLabel}
                />
              ))}
            </motion.div>
          </div>
        </div>
      ) : (
        /* Mobile vertical cinematic presentation */
        <div className="flex flex-col gap-20 px-5 sm:px-8 mt-8">
          {PROJECTS.map((project, index) => (
            <motion.article
              key={project.id}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
              whileInView={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7 }}
              className="min-h-[80svh] flex flex-col justify-center"
            >
              <ProjectPreview
                project={project}
                onOpen={onSelectProject}
                isActive={true}
                className="w-full h-[55vh]"
              />

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--c-text)]/50 tabular-nums">
                  <span className="text-[var(--c-accent)]">
                    {project.number} / {pad(PROJECTS.length)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{project.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{project.year}</span>
                </div>

                <h3 className="text-3xl font-extrabold tracking-[-0.04em] text-[var(--c-text)]">
                  {project.title}
                </h3>

                <p className="text-sm text-[var(--c-text)]/62 leading-[1.6]">
                  {project.description}
                </p>

                <button
                  type="button"
                  onClick={() => onSelectProject(project)}
                  className="group mt-2 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-accent)] py-2 self-start"
                >
                  <span>{viewLabel}</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-[8px]" />
                </button>
              </div>

              {index < PROJECTS.length - 1 && (
                <div className="mt-14 border-t border-[var(--c-text)]/10" />
              )}
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}
