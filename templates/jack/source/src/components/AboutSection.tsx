import { fill, safeSrc, useXP, type XP } from '../xp';
import { AnimatedText } from './AnimatedText';
import { ContactButton } from './ContactButton';
import { FadeIn } from './FadeIn';
import { SafeImage } from './SafeImage';

interface AboutSectionProps {
  onOpenContact: () => void;
}


export function AboutSection({ onOpenContact }: AboutSectionProps) {
  const data = useXP();
  const about: XP = data.about || {};
  const ABOUT_DECOR_IMAGES = {
    moon: safeSrc(about.decor1),
    objectBottomLeft: safeSrc(about.decor2),
    lego: safeSrc(about.decor3),
    groupBottomRight: safeSrc(about.decor4),
  };
  return (
    <section
      id="about"
      className={`${about.blend ? 'xp-blend ' : ''}relative min-h-screen w-full bg-[var(--c-page)] flex flex-col items-center justify-center px-5 sm:px-8 md:px-10 py-20 overflow-hidden`}
    >
      {/* Top-left Moon icon */}
      <div className="absolute top-[4%] left-[1%] sm:left-[2%] md:left-[4%] w-[120px] sm:w-[160px] md:w-[210px] pointer-events-none z-0">
        <FadeIn delay={0.1} x={-80} y={0} duration={0.9}>
          <SafeImage
            src={ABOUT_DECOR_IMAGES.moon}
            alt=""
            loading="lazy"
            transparentFallback
            className="w-full h-auto object-contain select-none"
          />
        </FadeIn>
      </div>

      {/* Bottom-left 3D object */}
      <div className="absolute bottom-[8%] left-[3%] sm:left-[6%] md:left-[10%] w-[100px] sm:w-[140px] md:w-[180px] pointer-events-none z-0">
        <FadeIn delay={0.25} x={-80} y={0} duration={0.9}>
          <SafeImage
            src={ABOUT_DECOR_IMAGES.objectBottomLeft}
            alt=""
            loading="lazy"
            transparentFallback
            className="w-full h-auto object-contain select-none"
          />
        </FadeIn>
      </div>

      {/* Top-right Lego icon */}
      <div className="absolute top-[4%] right-[1%] sm:right-[2%] md:right-[4%] w-[120px] sm:w-[160px] md:w-[210px] pointer-events-none z-0">
        <FadeIn delay={0.15} x={80} y={0} duration={0.9}>
          <SafeImage
            src={ABOUT_DECOR_IMAGES.lego}
            alt=""
            loading="lazy"
            transparentFallback
            className="w-full h-auto object-contain select-none"
          />
        </FadeIn>
      </div>

      {/* Bottom-right 3D group */}
      <div className="absolute bottom-[8%] right-[3%] sm:right-[6%] md:right-[10%] w-[130px] sm:w-[170px] md:w-[220px] pointer-events-none z-0">
        <FadeIn delay={0.3} x={80} y={0} duration={0.9}>
          <SafeImage
            src={ABOUT_DECOR_IMAGES.groupBottomRight}
            alt=""
            loading="lazy"
            transparentFallback
            className="w-full h-auto object-contain select-none"
          />
        </FadeIn>
      </div>

      {/* Centered Content */}
      <div className="relative z-10 flex flex-col items-center gap-16 sm:gap-20 md:gap-24">
        <div className="flex flex-col items-center gap-10 sm:gap-14 md:gap-16">
          <FadeIn delay={0} y={40}>
            <h2
              className="hero-heading font-black uppercase leading-none tracking-tight text-center"
              style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
            >
              {fill(about.title, data)}
            </h2>
          </FadeIn>

          <AnimatedText text={fill(about.text, data)} />
        </div>

        <ContactButton onClick={onOpenContact} />
      </div>
    </section>
  );
}
