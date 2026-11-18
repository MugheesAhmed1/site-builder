import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { type ProjectItem } from '../data/portfolio';
import { fill, safeSrc, useXP } from '../xp';
import { FadeIn } from './FadeIn';
import { LiveProjectButton } from './LiveProjectButton';
import { SafeImage } from './SafeImage';

interface StickyProjectCardProps {
  project: ProjectItem;
  index: number;
  totalCards: number;
  progress: MotionValue<number>;
  onSelect: (project: ProjectItem) => void;
}

function StickyProjectCard({
  project,
  index,
  totalCards,
  progress,
  onSelect,
}: StickyProjectCardProps) {
  const data = useXP();
  const f = (t: unknown) => fill(t, data);
  const stack = data.motion?.cardStack !== false;
  const targetScale = stack ? 1 - (totalCards - 1 - index) * 0.03 : 1;
  const rangeStart = index / totalCards;
  const scale = useTransform(progress, [rangeStart, 1], [1, targetScale]);

  return (
    <div className="h-[85vh] flex items-start justify-center">
      <div className="sticky top-24 md:top-32 w-full max-w-6xl">
        <motion.article
          style={{
            scale,
            transformOrigin: 'top center',
            top: `${index * 28}px`,
          }}
          className="relative w-full rounded-[40px] sm:rounded-[50px] md:rounded-[60px] border-2 border-[var(--c-text)] bg-[var(--c-page)] p-4 sm:p-6 md:p-8"
        >
          {/* Top Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
              <span
                className="font-black text-[var(--c-text)] leading-none tabular-nums"
                style={{ fontSize: 'clamp(2.5rem, 6vw, 5.5rem)' }}
              >
                {f(project.number)}
              </span>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm uppercase tracking-widest text-[var(--c-text)]/60">
                  {f(project.category)}
                </span>
                <h3 className="text-lg sm:text-2xl md:text-3xl font-medium uppercase tracking-tight text-[var(--c-text)]">
                  {f(project.name)}
                </h3>
              </div>
            </div>

            <LiveProjectButton onClick={() => onSelect(project)} />
          </div>

          {/* Bottom Row: Two-Column Image Grid */}
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-5 items-stretch">
            {/* Left Column (40% width): 2 stacked images */}
            <div className="w-full md:w-[40%] flex flex-col gap-3 sm:gap-4 md:gap-5">
              <button
                type="button"
                onClick={() => onSelect(project)}
                aria-label={f(project.name)}
                className="block w-full overflow-hidden rounded-[40px] sm:rounded-[50px] md:rounded-[60px] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--c-text)]"
                style={{ height: 'clamp(130px, 16vw, 230px)' }}
              >
                <SafeImage
                  src={safeSrc(project.image1)}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px] transition-transform duration-300 hover:scale-[1.03]"
                />
              </button>

              <button
                type="button"
                onClick={() => onSelect(project)}
                aria-label={f(project.name)}
                className="block w-full overflow-hidden rounded-[40px] sm:rounded-[50px] md:rounded-[60px] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--c-text)]"
                style={{ height: 'clamp(160px, 22vw, 340px)' }}
              >
                <SafeImage
                  src={safeSrc(project.image2)}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px] transition-transform duration-300 hover:scale-[1.03]"
                />
              </button>
            </div>

            {/* Right Column (60% width): 1 tall image */}
            <div className="w-full md:w-[60%] flex">
              <button
                type="button"
                onClick={() => onSelect(project)}
                aria-label={f(project.name)}
                className="block w-full h-[220px] md:h-auto overflow-hidden rounded-[40px] sm:rounded-[50px] md:rounded-[60px] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--c-text)]"
              >
                <SafeImage
                  src={safeSrc(project.image3)}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px] transition-transform duration-300 hover:scale-[1.03]"
                />
              </button>
            </div>
          </div>
        </motion.article>
      </div>
    </div>
  );
}

interface ProjectsSectionProps {
  onSelectProject: (project: ProjectItem) => void;
}

export function ProjectsSection({ onSelectProject }: ProjectsSectionProps) {
  const data = useXP();
  const PROJECTS: ProjectItem[] = data.projects?.items || [];
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section
      id="projects"
      className="relative z-10 w-full bg-[var(--c-page)] rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-10 sm:-mt-12 md:-mt-14 px-5 sm:px-8 md:px-10 pt-20 sm:pt-24 md:pt-32 pb-24 sm:pb-32"
    >
      <FadeIn delay={0} y={40}>
        <h2
          className="hero-heading font-black uppercase leading-none tracking-tight text-center mb-16 sm:mb-20 md:mb-28"
          style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
        >
          {fill(data.projects?.title, data)}
        </h2>
      </FadeIn>

      <div ref={containerRef} className="relative flex flex-col gap-6 sm:gap-10">
        {PROJECTS.map((project, index) => (
          <StickyProjectCard
            key={index}
            project={project}
            index={index}
            totalCards={PROJECTS.length}
            progress={scrollYProgress}
            onSelect={onSelectProject}
          />
        ))}
      </div>
    </section>
  );
}
