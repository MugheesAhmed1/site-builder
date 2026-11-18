import { useEffect, useRef, useState } from 'react';
import { Menu, X } from './icons';
import { RevealLayer } from './components/RevealLayer';
import { LithosModal, type ModalMode } from './components/LithosModal';
import { LithosSections } from './components/LithosSections';
import { fill, safeHref, safeSrc, useTheme, useXP, type XP } from './xp';

export default function App() {
  const data = useXP();
  useTheme(data);
  const f = (t: unknown) => fill(t, data);
  const hero = data.hero || {};
  const nav = data.nav || {};
  const motion = data.motion || {};
  const links: XP[] = nav.links || [];

  const mouse = useRef({ x: -999, y: -999 });
  const smooth = useRef({ x: -999, y: -999 });
  const follow = useRef(0.1);
  follow.current = Math.max(0.02, Math.min(1, Number(motion.follow) || 0.1));
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });

  const [active, setActive] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  useEffect(() => {
    const move = (x: number, y: number) => {
      if (mouse.current.x === -999 && mouse.current.y === -999) smooth.current = { x, y };
      mouse.current = { x, y };
    };
    const onMouse = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => e.touches[0] && move(e.touches[0].clientX, e.touches[0].clientY);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: true });

    let lastX = -999;
    let lastY = -999;
    let raf = 0;
    const tick = () => {
      const k = follow.current;
      smooth.current.x += (mouse.current.x - smooth.current.x) * k;
      smooth.current.y += (mouse.current.y - smooth.current.y) * k;
      if (Math.abs(smooth.current.x - lastX) > 0.05 || Math.abs(smooth.current.y - lastY) > 0.05) {
        lastX = smooth.current.x;
        lastY = smooth.current.y;
        setCursorPos({ x: lastX, y: lastY });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
      cancelAnimationFrame(raf);
    };
  }, []);

  const anim = motion.entrance === false ? '' : 'hero-anim';
  const go = (i: number, href: string) => (e: React.MouseEvent) => {
    setActive(i);
    setMobileMenuOpen(false);
    if (!href || href === '#top') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const target = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  };

  // The menu follows the reader: the link of the section on screen is highlighted.
  useEffect(() => {
    const ids = links.map((l) => String(safeHref(l.href) || ''));
    const onScroll = () => {
      let best = 0;
      ids.forEach((h, i) => {
        const el = h.startsWith('#') && h.length > 1 ? document.getElementById(h.slice(1)) : null;
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) best = i;
      });
      setActive(best);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [links.map((l) => l.href).join('|')]);

  return (
    <div className="min-h-screen tracking-[-0.02em] lithos-page" id="top">
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5">
        <a href="#top" onClick={go(0, '#top')} className="flex items-center gap-2.5 shrink-0">
          {data.brand?.showMark !== false && (
            <svg width="26" height="26" viewBox="0 0 256 256" fill="currentColor" className="lithos-text" aria-hidden="true">
              <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
            </svg>
          )}
          <span className="lithos-text text-2xl font-display italic">{f(data.brand?.name)}</span>
        </a>

        {links.length > 0 && (
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
            {links.map((l, i) => (
              <a
                key={i}
                href={safeHref(l.href) || '#top'}
                onClick={go(i, safeHref(l.href))}
                className={`${active === i ? 'opacity-100' : 'opacity-80'} lithos-text hover:bg-white/20 hover:opacity-100 transition px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0`}
              >
                {f(l.label)}
              </a>
            ))}
          </div>
        )}

        {nav.cta && (
          <button type="button" onClick={() => setModalMode('signup')} className="hidden md:block lithos-btn text-sm font-semibold px-6 py-2.5 rounded-full transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer">
            {f(nav.cta)}
          </button>
        )}

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          className="md:hidden lithos-text p-2.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 hover:bg-white/25 transition-colors cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[90] md:hidden bg-black/90 backdrop-blur-lg flex flex-col justify-between pt-24 pb-8 px-6">
          <div className="flex flex-col gap-2">
            {links.map((l, i) => (
              <a
                key={i}
                href={safeHref(l.href) || '#top'}
                onClick={go(i, safeHref(l.href))}
                className={`lithos-text text-left px-4 py-3.5 rounded-xl text-lg font-medium transition-colors ${active === i ? 'bg-white/15' : 'opacity-75 hover:bg-white/10 hover:opacity-100'}`}
              >
                {f(l.label)}
              </a>
            ))}
          </div>
          {nav.cta && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setModalMode('signup');
              }}
              className="w-full lithos-btn text-sm font-semibold px-6 py-3.5 rounded-full cursor-pointer"
            >
              {f(nav.cta)}
            </button>
          )}
        </div>
      )}

      <section className="relative w-full overflow-hidden h-screen bg-black" style={{ height: '100dvh' }}>
        {safeSrc(hero.image) && (
          <div
            className={`absolute inset-0 bg-center bg-cover bg-no-repeat z-10 ${motion.zoomIn === false ? '' : 'hero-zoom'}`}
            style={{ backgroundImage: `url("${safeSrc(hero.image)}")` }}
            role="img"
            aria-label={f(hero.imageAlt)}
          />
        )}

        {safeSrc(hero.revealImage) && <RevealLayer image={safeSrc(hero.revealImage)} cursorX={cursorPos.x} cursorY={cursorPos.y} radius={Number(motion.spotlight) || 260} />}

        <div className="absolute top-[14%] left-0 right-0 flex flex-col items-center text-center px-5 pointer-events-none z-50">
          <h1 className="lithos-text leading-[0.95] lithos-h1">
            <span className={`block font-display italic font-normal ${anim} hero-reveal`} style={{ letterSpacing: '-0.05em', animationDelay: '0.25s' }}>
              {f(hero.line1)}
            </span>
            {hero.line2 && (
              <span className={`block font-normal -mt-1 ${anim} hero-reveal`} style={{ letterSpacing: '-0.08em', animationDelay: '0.42s' }}>
                {f(hero.line2)}
              </span>
            )}
          </h1>
        </div>

        {hero.left && (
          <div className={`hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50 ${anim} hero-fade`} style={{ animationDelay: '0.7s' }}>
            <p className="text-sm lithos-text opacity-80 leading-relaxed">{f(hero.left)}</p>
          </div>
        )}

        <div
          className={`absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] flex flex-col items-start gap-4 sm:gap-5 z-50 ${anim} hero-fade`}
          style={{ animationDelay: '0.85s' }}
        >
          {hero.right && <p className="text-xs sm:text-sm lithos-text opacity-80 leading-relaxed">{f(hero.right)}</p>}
          {hero.button && (
            <button type="button" onClick={() => setModalMode('explore')} className="lithos-accent text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 cursor-pointer">
              {f(hero.button)}
            </button>
          )}
        </div>
      </section>

      <LithosSections data={data} onSignup={() => setModalMode('signup')} />

      <div data-xp-extras="" />

      <LithosModal mode={modalMode} onClose={() => setModalMode(null)} />
    </div>
  );
}
