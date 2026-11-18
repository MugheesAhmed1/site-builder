import { motion, useMotionValue, useSpring } from 'motion/react';
import { MouseEvent, useEffect, useRef, useState } from 'react';
import { Project } from '../data/portfolioData';
import { useIsFinePointer, useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { ProjectVisualScene } from './ProjectVisualScene';

interface ProjectPreviewProps {
  project: Project;
  onOpen: (project: Project) => void;
  isActive?: boolean;
  className?: string;
}

export function ProjectPreview({
  project,
  onOpen,
  isActive = true,
  className = '',
}: ProjectPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const isFinePointer = useIsFinePointer();
  const reducedMotion = useReducedMotionPreference();

  const shiftX = useMotionValue(0);
  const shiftY = useMotionValue(0);
  const smoothX = useSpring(shiftX, { stiffness: 180, damping: 24, mass: 0.5 });
  const smoothY = useSpring(shiftY, { stiffness: 180, damping: 24, mass: 0.5 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearViewport(entry.isIntersecting);
      },
      { rootMargin: '250px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isFinePointer || reducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1..1
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1..1
    // Maximum movement: ±10px
    shiftX.set(nx * 10);
    shiftY.set(ny * 10);
  };

  const handleMouseLeave = () => {
    shiftX.set(0);
    shiftY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onOpen(project)}
      role="button"
      tabIndex={0}
      aria-label={`Open ${project.title} project experience`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(project);
        }
      }}
      data-cursor="VIEW"
      className={`group relative overflow-hidden rounded-[28px] md:rounded-[40px] border border-[var(--c-text)]/12 bg-[var(--c-surface)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--c-accent)] ${className}`}
    >
      <motion.div
        style={
          reducedMotion
            ? undefined
            : { x: smoothX, y: smoothY, scale: 1.04 }
        }
        className="w-full h-full"
      >
        {isNearViewport ? (
          <ProjectVisualScene
            visualType={project.visualType}
            active={isNearViewport && isActive}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${project.palette.secondary}, ${project.palette.primary})`,
            }}
          >
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--c-text)]/35">
              {project.title}
            </span>
          </div>
        )}
      </motion.div>

      {/* Subtle atmospheric vignette for edge definition */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[28px] md:rounded-[40px]"
        style={{
          boxShadow: 'inset 0 0 80px color-mix(in srgb, var(--c-page) 55%, transparent)',
        }}
      />
    </div>
  );
}
