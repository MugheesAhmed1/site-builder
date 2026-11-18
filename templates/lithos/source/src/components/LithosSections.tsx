import { useEffect, useRef, useState } from 'react';
import { Check } from '../icons';
import { fill, lines, on, safeSrc, type XP } from '../xp';

/** Fades sections in as they reach the screen (off when motion.entrance is false). */
function useReveal(enabled: boolean) {
  const root = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!enabled || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach((i) => i.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    items.forEach((i) => {
      if (!i.classList.contains('is-in')) io.observe(i);
    });
    return () => io.disconnect();
  });
  return root;
}

const Kicker = ({ children }: { children: string }) =>
  children ? (
    <span className="lithos-kicker text-xs font-semibold tracking-[0.2em] uppercase">{children}</span>
  ) : null;

export function LithosSections({ data, onSignup }: { data: XP; onSignup: () => void }) {
  const f = (t: unknown) => fill(t, data);
  const motion = data.motion || {};
  const root = useReveal(motion.entrance !== false);
  const course = data.course || {};
  const guides = data.guides || {};
  const geology = data.geology || {};
  const plans = data.plans || {};
  const tour = data.tour || {};
  const layers: XP[] = Array.isArray(geology.layers) ? geology.layers : [];
  const [layer, setLayer] = useState(0);
  const current = layers[Math.min(layer, Math.max(0, layers.length - 1))];

  return (
    <div ref={root} className="lithos-text">
      {on('course', data) && (
        <section id="course" className="lithos-section">
          <div className="lithos-wrap grid gap-12 md:grid-cols-[1fr_1.3fr] items-start">
            <div data-reveal className="md:sticky md:top-28">
              <Kicker>{f(course.kicker)}</Kicker>
              <h2 className="lithos-h2 font-display italic mt-4">{f(course.title)}</h2>
              <p className="opacity-70 leading-relaxed mt-5 max-w-md">{f(course.text)}</p>
            </div>
            <ol className="space-y-3">
              {(course.chapters || []).map((c: XP, i: number) => (
                <li key={i} data-reveal style={{ transitionDelay: `${i * 70}ms` }} className="lithos-card rounded-2xl p-5 sm:p-6 flex gap-5">
                  <span className="font-display italic text-3xl opacity-50 tabular-nums w-10 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-4 flex-wrap">
                      <h3 className="text-lg font-medium">{f(c.title)}</h3>
                      {c.length && <span className="text-xs opacity-55 tabular-nums">{f(c.length)}</span>}
                    </div>
                    <p className="text-sm opacity-65 leading-relaxed mt-1.5">{f(c.text)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {on('guides', data) && (
        <section id="guides" className="lithos-section">
          <div className="lithos-wrap">
            <div data-reveal className="max-w-2xl">
              <Kicker>{f(guides.kicker)}</Kicker>
              <h2 className="lithos-h2 font-display italic mt-4">{f(guides.title)}</h2>
              {guides.text && <p className="opacity-70 leading-relaxed mt-5">{f(guides.text)}</p>}
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-12">
              {(guides.items || []).map((g: XP, i: number) => (
                <article key={i} data-reveal style={{ transitionDelay: `${i * 80}ms` }} className="lithos-card group rounded-2xl overflow-hidden">
                  <div className="aspect-[4/3] overflow-hidden bg-white/5">
                    {safeSrc(g.image) && (
                      <img src={safeSrc(g.image)} alt={f(g.title)} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    )}
                  </div>
                  <div className="p-5">
                    {g.tag && <span className="text-[11px] uppercase tracking-[0.18em] lithos-kicker">{f(g.tag)}</span>}
                    <h3 className="text-lg font-medium mt-1.5">{f(g.title)}</h3>
                    <p className="text-sm opacity-65 leading-relaxed mt-1.5">{f(g.text)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {on('geology', data) && layers.length > 0 && (
        <section id="geology" className="lithos-section">
          <div className="lithos-wrap grid gap-10 md:grid-cols-2 items-center">
            <div data-reveal>
              <Kicker>{f(geology.kicker)}</Kicker>
              <h2 className="lithos-h2 font-display italic mt-4">{f(geology.title)}</h2>
              <p className="opacity-70 leading-relaxed mt-5 max-w-md">{f(geology.text)}</p>
              {current && (
                <div className="lithos-card rounded-2xl p-5 mt-8 max-w-md" aria-live="polite">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-medium">{f(current.name)}</h3>
                    <span className="text-xs opacity-60 tabular-nums">{f(current.age)}</span>
                  </div>
                  <p className="text-sm opacity-70 leading-relaxed mt-2">{f(current.text)}</p>
                </div>
              )}
            </div>
            <div data-reveal className="lithos-geology-col flex flex-col rounded-2xl overflow-hidden border border-white/10" role="tablist" aria-label={f(geology.title)}>
              {layers.map((l: XP, i: number) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === layer}
                  onClick={() => setLayer(i)}
                  onMouseEnter={() => setLayer(i)}
                  className="lithos-layer text-left px-5 flex items-center justify-between gap-3 cursor-pointer"
                  style={{ background: String(l.color || '#555'), flexGrow: Math.max(1, Math.min(6, Number(l.thickness) || 2)) }}
                  data-on={i === layer ? '' : undefined}
                >
                  <span className="text-sm font-semibold">{f(l.name)}</span>
                  <span className="text-xs tabular-nums opacity-80">{f(l.age)}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {on('plans', data) && (
        <section id="plans" className="lithos-section">
          <div className="lithos-wrap">
            <div data-reveal className="text-center max-w-2xl mx-auto">
              <Kicker>{f(plans.kicker)}</Kicker>
              <h2 className="lithos-h2 font-display italic mt-4">{f(plans.title)}</h2>
              {plans.text && <p className="opacity-70 leading-relaxed mt-5">{f(plans.text)}</p>}
            </div>
            <div className="grid gap-5 md:grid-cols-3 mt-12">
              {(plans.tiers || []).map((t: XP, i: number) => (
                <div
                  key={i}
                  data-reveal
                  style={{ transitionDelay: `${i * 80}ms` }}
                  className={`rounded-2xl p-6 sm:p-7 flex flex-col ${t.featured ? 'lithos-featured' : 'lithos-card'}`}
                >
                  <h3 className="text-lg font-medium">{f(t.name)}</h3>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-display italic text-5xl">{f(t.price)}</span>
                    {t.period && <span className="text-sm opacity-60">{f(t.period)}</span>}
                  </div>
                  <ul className="mt-6 space-y-2.5 text-sm flex-1">
                    {lines(t.features, data).map((x, k) => (
                      <li key={k} className="flex gap-2.5 items-start">
                        <Check className="w-4 h-4 mt-0.5 shrink-0 lithos-kicker" />
                        <span className="opacity-80">{x}</span>
                      </li>
                    ))}
                  </ul>
                  {t.button && (
                    <button type="button" onClick={onSignup} className={`mt-7 text-sm font-semibold px-6 py-3 rounded-full cursor-pointer transition hover:opacity-90 ${t.featured ? 'lithos-accent' : 'lithos-btn'}`}>
                      {f(t.button)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {on('tour', data) && (
        <section id="tour" className="lithos-section">
          <div data-reveal className="lithos-wrap">
            <div className="relative rounded-3xl overflow-hidden px-6 py-16 sm:px-14 sm:py-24 text-center lithos-card">
              {safeSrc(tour.image) && <img src={safeSrc(tour.image)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
              <div className="relative">
                <Kicker>{f(tour.kicker)}</Kicker>
                <h2 className="lithos-h2 font-display italic mt-4">{f(tour.title)}</h2>
                <p className="opacity-80 leading-relaxed mt-5 max-w-xl mx-auto">{f(tour.text)}</p>
                {tour.button && (
                  <button type="button" onClick={onSignup} className="lithos-accent mt-8 text-sm font-medium px-8 py-3.5 rounded-full cursor-pointer transition-all hover:scale-[1.03]">
                    {f(tour.button)}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {on('footer', data) && (
        <footer className="lithos-wrap py-10 flex flex-col sm:flex-row gap-3 justify-between text-xs opacity-55">
          <span>{f(data.footer?.left)}</span>
          <span>{f(data.footer?.right)}</span>
        </footer>
      )}
    </div>
  );
}
