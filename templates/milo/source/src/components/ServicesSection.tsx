import { servicesOf } from '../data/portfolioData';
import { fill, lines, useXP } from '../xp';
import { RevealText } from './RevealText';
import { SectionLabel } from './SectionLabel';
import { ServiceRow } from './ServiceRow';

interface ServicesSectionProps {
  onSelectService: (serviceTitle: string) => void;
}

export function ServicesSection({ onSelectService }: ServicesSectionProps) {
  const data = useXP();
  const s = data.services || {};
  const SERVICES = servicesOf(data);
  return (
    <section
      id="services"
      className="relative z-20 -mt-12 w-full bg-[var(--c-light)] text-[var(--c-lightText)] rounded-t-[60px] md:rounded-t-[80px] px-6 sm:px-12 lg:px-20 pt-24 sm:pt-32 pb-28 sm:pb-40"
    >
      <div className="w-full max-w-[1440px] mx-auto">
        <div className="mb-14 sm:mb-20">
          <SectionLabel className="text-[var(--c-lightText)]/50 mb-6">
            {fill(s.label, data)}
          </SectionLabel>
          <RevealText>
            <h2 className="editorial-heading text-left text-[var(--c-lightText)] text-[clamp(4rem,13vw,13rem)] leading-[0.86] tracking-[-0.055em]">
              {lines(s.title, data).map((l, i) => (
                <span key={i} className="block">{l}</span>
              ))}
            </h2>
          </RevealText>
        </div>

        <div className="w-full">
          {SERVICES.map((service, index) => (
            <ServiceRow
              key={index}
              service={service}
              index={index}
              onSelect={onSelectService}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
