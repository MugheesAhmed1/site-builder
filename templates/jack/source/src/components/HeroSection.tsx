import { fill, on, safeSrc, useXP, type XP } from '../xp';
import { ContactButton } from './ContactButton';
import { FadeIn } from './FadeIn';
import { Magnet } from './Magnet';
import { SafeImage } from './SafeImage';

interface HeroSectionProps {
  onOpenContact: () => void;
}

export function HeroSection({ onOpenContact }: HeroSectionProps) {
  const data = useXP();
  const f = (t: unknown) => fill(t, data);
  const nav: XP = data.nav || {};
  const hero: XP = data.hero || {};
  const strength = Number(data.motion?.magnet) || 3;
  return (
    <section
      className={`${hero.blend ? 'xp-blend ' : ''}relative h-screen w-full flex flex-col justify-between bg-[var(--c-page)]`}
      style={{ overflowX: 'clip' }}
    >
      {/* Top Navbar */}
      <FadeIn delay={0} y={-20} className="relative z-20">
        <nav aria-label="Primary navigation" className="w-full flex items-center justify-between px-6 md:px-10 pt-6 md:pt-8">
          {on('about', data) && nav.about && (
            <a href="#about" className="text-[var(--c-text)] font-medium uppercase tracking-wider text-sm md:text-lg lg:text-[1.4rem] whitespace-nowrap shrink-0 transition-opacity duration-200 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-[var(--c-text)] focus-visible:outline-offset-4">
              {f(nav.about)}
            </a>
          )}
          {on('services', data) && nav.services && (
            <a href="#services" className="text-[var(--c-text)] font-medium uppercase tracking-wider text-sm md:text-lg lg:text-[1.4rem] whitespace-nowrap shrink-0 transition-opacity duration-200 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-[var(--c-text)] focus-visible:outline-offset-4">
              {f(nav.services)}
            </a>
          )}
          {on('projects', data) && nav.projects && (
            <a href="#projects" className="text-[var(--c-text)] font-medium uppercase tracking-wider text-sm md:text-lg lg:text-[1.4rem] whitespace-nowrap shrink-0 transition-opacity duration-200 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-[var(--c-text)] focus-visible:outline-offset-4">
              {f(nav.projects)}
            </a>
          )}
          {nav.contact && (
            <button type="button" onClick={onOpenContact} className="cursor-pointer bg-transparent border-0 text-[var(--c-text)] font-medium uppercase tracking-wider text-sm md:text-lg lg:text-[1.4rem] whitespace-nowrap shrink-0 transition-opacity duration-200 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-[var(--c-text)] focus-visible:outline-offset-4">
              {f(nav.contact)}
            </button>
          )}
        </nav>
      </FadeIn>

      {/* Massive Hero Heading */}
      <div className="overflow-hidden px-4 md:px-8 relative z-0">
        <FadeIn delay={0.15} y={40}>
          <h1 className="hero-heading font-black uppercase tracking-tight leading-none whitespace-nowrap w-full text-center text-[14vw] sm:text-[15vw] md:text-[16vw] lg:text-[17.5vw] mt-6 sm:mt-4 md:-mt-5 select-none">
            {f(hero.title)}
          </h1>
        </FadeIn>
      </div>

      {/* Centered Magnetic Portrait */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10 w-[280px] sm:w-[360px] md:w-[440px] lg:w-[520px] top-1/2 -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-0 pointer-events-auto">
        <FadeIn delay={0.6} y={30}>
          <Magnet
            padding={150}
            disabled={strength <= 0}
            strength={Math.max(0.5, 6 - strength)}
            activeTransition="transform 0.3s ease-out"
            inactiveTransition="transform 0.6s ease-in-out"
          >
            <SafeImage
              src={safeSrc(hero.portrait)}
              alt={f(hero.portraitAlt)}
              transparentFallback
              loading="eager"
              className="w-full h-auto block object-contain select-none"
            />
          </Magnet>
        </FadeIn>
      </div>

      {/* Bottom Bar */}
      <div className="mt-auto w-full flex justify-between items-end px-6 md:px-10 pb-7 sm:pb-8 md:pb-10 relative z-20 gap-4">
        <FadeIn delay={0.35} y={20}>
          <p
            className="text-[var(--c-text)] font-light uppercase tracking-wide leading-snug max-w-[160px] sm:max-w-[220px] md:max-w-[260px]"
            style={{ fontSize: 'clamp(0.75rem, 1.4vw, 1.5rem)' }}
          >
            {f(hero.tagline)}
          </p>
        </FadeIn>

        <FadeIn delay={0.5} y={20}>
          <ContactButton onClick={onOpenContact} />
        </FadeIn>
      </div>
    </section>
  );
}
