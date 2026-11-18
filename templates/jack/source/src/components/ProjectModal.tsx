import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from '../icons';
import { projectImages, type ProjectItem } from '../data/portfolio';
import { fill, safeHref, safeSrc, useXP } from '../xp';
import { SafeImage } from './SafeImage';
import { ContactButton } from './ContactButton';

interface ProjectModalProps {
  project: ProjectItem | null;
  onClose: () => void;
  onInquire: (projectName: string) => void;
}

export function ProjectModal({ project, onClose, onInquire }: ProjectModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [project]);

  useEffect(() => {
    if (!project) return;

    const images = projectImages(project);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % images.length);
      }
      if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, onClose]);

  const data = useXP();
  const f = (t: unknown) => fill(t, data);
  const images = project ? projectImages(project).map(safeSrc) : [];
  const link = project ? safeHref(project.link) : '';

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={f(project.name)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 md:p-10"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl rounded-[32px] sm:rounded-[44px] border-2 border-[var(--c-text)]/80 bg-[var(--c-page)] text-[var(--c-text)] p-5 sm:p-8 max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 text-xs sm:text-sm uppercase tracking-widest text-[var(--c-text)]/60 mb-1">
                  <span className="tabular-nums">{f(project.number)}</span>
                  <span aria-hidden="true">/</span>
                  <span>{f(project.category)}</span>
                  <span aria-hidden="true">/</span>
                  <span className="tabular-nums">{f(project.year)}</span>
                </div>
                <h3 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-[var(--c-text)]">
                  {f(project.name)}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-11 h-11 rounded-full border border-[var(--c-text)]/40 flex items-center justify-center text-[var(--c-text)] hover:bg-[var(--c-text)]/10 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Image Viewer */}
            <div className="relative w-full h-[260px] sm:h-[380px] md:h-[440px] rounded-[24px] sm:rounded-[32px] overflow-hidden bg-[var(--c-surface)] mb-4">
              <SafeImage
                src={images[activeIndex]}
                alt=""
                className="w-full h-full object-cover"
              />

              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
                }
                aria-label="Previous"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-[var(--c-text)]/40 flex items-center justify-center text-[var(--c-text)] hover:bg-black/80 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev + 1) % images.length)}
                aria-label="Next"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-[var(--c-text)]/40 flex items-center justify-center text-[var(--c-text)] hover:bg-black/80 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Thumbnail Strip */}
            <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: `repeat(${Math.max(1, images.length)}, minmax(0, 1fr))` }}>
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`${idx + 1}`}
                  className={`h-16 sm:h-24 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === activeIndex
                      ? 'border-[var(--c-text)] opacity-100'
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <SafeImage
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Summary & Action */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4 border-t border-[var(--c-text)]/15">
              <div className="max-w-2xl">
                <p className="text-sm sm:text-base font-light text-[var(--c-text)]/85 leading-relaxed mb-3">
                  {f(project.summary)}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-wider text-[var(--c-text)]/60">
                  {f(project.deliverables).split(/\n|,/).map((x) => x.trim()).filter(Boolean).map((item, idx) => (
                    <span key={item} className="inline-flex items-center gap-3">
                      {idx > 0 && <span aria-hidden="true">·</span>}
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {link && (
                  <a href={link} target="_blank" rel="noreferrer" className="rounded-full border-2 border-[var(--c-text)] text-[var(--c-text)] font-medium uppercase tracking-widest px-6 py-3 text-xs sm:text-sm hover:bg-[var(--c-text)]/10 transition-colors">
                    {f(data.buttons?.visit)}
                  </a>
                )}
                <ContactButton onClick={() => onInquire(f(project.name))} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
