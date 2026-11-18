import { fill, useXP, type XP } from '../xp';
import { FadeIn } from './FadeIn';

export function ServicesSection() {
  const data = useXP();
  const f = (t: unknown) => fill(t, data);
  const SERVICES: XP[] = data.services?.items || [];
  return (
    <section
      id="services"
      className="relative w-full bg-[var(--c-light)] text-[var(--c-lightText)] rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] px-5 sm:px-8 md:px-10 py-20 sm:py-24 md:py-32"
    >
      <FadeIn delay={0} y={40}>
        <h2
          className="text-[var(--c-lightText)] font-black uppercase text-center leading-none tracking-tight mb-16 sm:mb-20 md:mb-28"
          style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
        >
          {f(data.services?.title)}
        </h2>
      </FadeIn>

      <div className="max-w-5xl mx-auto">
        {SERVICES.map((service, i) => (
          <FadeIn key={i} delay={i * 0.1} y={30}>
            <div
              className={`flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-10 md:gap-16 py-8 sm:py-10 md:py-12 ${
                i === SERVICES.length - 1 ? 'border-b' : ''
              } border-t`}
              style={{ borderColor: 'color-mix(in srgb, var(--c-lightText) 15%, transparent)' }}
            >
              <span
                className="font-black text-[var(--c-lightText)] leading-none tabular-nums shrink-0 sm:w-[220px] md:w-[260px]"
                style={{ fontSize: 'clamp(3rem, 10vw, 140px)' }}
              >
                {f(service.number)}
              </span>

              <div className="flex flex-col gap-2 sm:gap-3">
                <h3
                  className="font-medium uppercase text-[var(--c-lightText)] leading-tight"
                  style={{ fontSize: 'clamp(1rem, 2.2vw, 2.1rem)' }}
                >
                  {f(service.name)}
                </h3>
                <p
                  className="font-light text-[var(--c-lightText)] leading-relaxed max-w-2xl opacity-60"
                  style={{ fontSize: 'clamp(0.85rem, 1.6vw, 1.25rem)' }}
                >
                  {f(service.description)}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
