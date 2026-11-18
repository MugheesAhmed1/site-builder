import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Menu, X } from './icons';
import { Clock, Mail, Phone, Pin, Plus, Shield, Star } from './glyphs';
import { Counter, Modal, Reveal, Words, items, nextDays, useSender } from './ui';
import { fill, lines, on, pairs, safeHref, safeSrc, useTheme, useXP, type XP } from './xp';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function App() {
  const data = useXP();
  useTheme(data);
  const [booking, setBooking] = useState<{ open: boolean; treatment?: string }>({ open: false });
  const book = (treatment?: string) => setBooking({ open: true, treatment });
  const radius = Number(data.theme?.radius ?? 28);

  return (
    <MotionConfig reducedMotion={data.motion?.animate === false ? 'always' : 'user'}>
      <div className="bl" style={{ ['--r' as string]: `${radius}px` }}>
        <Nav data={data} onBook={() => book()} />
        <Hero data={data} onBook={() => book()} />
        {on('stats', data) && <Stats data={data} />}
        {on('treatments', data) && <Treatments data={data} onBook={book} />}
        {on('results', data) && <Results data={data} />}
        {on('journey', data) && <Journey data={data} />}
        {on('team', data) && <Team data={data} />}
        {on('plans', data) && <Plans data={data} onBook={book} />}
        {on('reviews', data) && <Reviews data={data} />}
        {on('faq', data) && <Faq data={data} />}
        {on('visit', data) && <Visit data={data} onBook={() => book()} />}
        <div data-xp-extras="" />
        <Footer data={data} />
        <Booking data={data} open={booking.open} treatment={booking.treatment} onClose={() => setBooking({ open: false })} />
      </div>
    </MotionConfig>
  );
}

function Nav({ data, onBook }: { data: XP; onBook: () => void }) {
  const f = (t: unknown) => fill(t, data);
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const s = () => setSolid(window.scrollY > 24);
    s();
    window.addEventListener('scroll', s, { passive: true });
    return () => window.removeEventListener('scroll', s);
  }, []);
  const links = items(data.nav?.links);
  return (
    <header className={'bl-nav' + (solid ? ' is-solid' : '')}>
      <a href="#top" className="bl-logo" onClick={() => setOpen(false)}>
        <span className="bl-logo-mark" aria-hidden="true" />
        {f(data.brand?.short || data.brand?.name)}
      </a>
      <nav className="bl-links" aria-label="Main">
        {links.map((l, i) => (
          <a key={i} href={safeHref(l.href) || '#top'}>
            {f(l.label)}
          </a>
        ))}
      </nav>
      <div className="bl-nav-end">
        {data.brand?.phone && (
          <a className="bl-phone" href={`tel:${String(data.brand.phone).replace(/[^\d+]/g, '')}`}>
            <Phone size={16} /> {f(data.brand.phone)}
          </a>
        )}
        <button type="button" className="bl-btn bl-btn-sm" onClick={onBook}>
          {f(data.nav?.cta)}
        </button>
        <button type="button" className="bl-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav className="bl-drawer" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} aria-label="Menu">
            {links.map((l, i) => (
              <a key={i} href={safeHref(l.href) || '#top'} onClick={() => setOpen(false)}>
                {f(l.label)} <ArrowRight size={18} />
              </a>
            ))}
            <button
              type="button"
              className="bl-btn"
              onClick={() => {
                setOpen(false);
                onBook();
              }}
            >
              {f(data.nav?.cta)}
            </button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function Hero({ data, onBook }: { data: XP; onBook: () => void }) {
  const f = (t: unknown) => fill(t, data);
  const h: XP = data.hero || {};
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scrolly = data.motion?.heroScroll !== false;
  // Function transforms: the arch opens into a rounded frame and the picture drifts as you scroll.
  const arch = useTransform(scrollYProgress, (p) => (scrolly ? `${Math.max(0, 50 - p * 120)}% ${Math.max(0, 50 - p * 120)}% var(--r) var(--r) / ${Math.max(0, 38 - p * 90)}% ${Math.max(0, 38 - p * 90)}% var(--r) var(--r)` : '50% 50% var(--r) var(--r) / 38% 38% var(--r) var(--r)'));
  const imgY = useTransform(scrollYProgress, (p) => (scrolly ? `${p * 12}%` : '0%'));
  const imgScale = useTransform(scrollYProgress, (p) => (scrolly ? 1.08 - p * 0.08 : 1));
  const textY = useTransform(scrollYProgress, (p) => (scrolly ? p * -80 : 0));
  const float = data.motion?.floatBadges !== false;
  const badges = [h.badge1, h.badge2, h.badge3].filter(Boolean);
  return (
    <section className="bl-hero" id="top" ref={ref}>
      <motion.div className="bl-hero-copy" style={{ y: textY }}>
        {h.kicker && (
          <motion.p className="bl-pill" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="bl-dot" /> {f(h.kicker)}
          </motion.p>
        )}
        <h1 className="bl-display bl-hero-title">
          <Words text={f(h.title)} stagger={0.07} />
        </h1>
        <motion.p className="bl-lead" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5, ease: EASE }}>
          {f(h.text)}
        </motion.p>
        <motion.div className="bl-hero-ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.65, ease: EASE }}>
          {h.primary && (
            <button type="button" className="bl-btn" onClick={onBook}>
              {f(h.primary)} <ArrowRight size={18} />
            </button>
          )}
          {h.secondary && (
            <a className="bl-btn bl-btn-ghost" href="#treatments">
              {f(h.secondary)}
            </a>
          )}
        </motion.div>
      </motion.div>
      <div className="bl-hero-art">
        <motion.div className="bl-arch" style={{ borderRadius: arch }} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: EASE }}>
          {safeSrc(h.image) && <motion.img src={safeSrc(h.image)} alt={f(h.imageAlt)} style={{ y: imgY, scale: imgScale }} />}
        </motion.div>
        <div className="bl-ring" aria-hidden="true" />
        {badges.map((b, i) => (
          <motion.div
            key={i}
            className={`bl-badge bl-badge-${i + 1}`}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={float ? { opacity: 1, y: [0, -8, 0], scale: 1 } : { opacity: 1, y: 0, scale: 1 }}
            transition={float ? { opacity: { delay: 0.9 + i * 0.2 }, scale: { delay: 0.9 + i * 0.2 }, y: { duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 } } : { delay: 0.9 + i * 0.2 }}
          >
            {i === 0 ? <Star size={16} /> : i === 1 ? <Clock size={16} /> : <Shield size={16} />}
            {f(b)}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Stats({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const list = items(data.stats?.items);
  if (!list.length) return null;
  return (
    <section className="bl-stats" aria-label="In numbers">
      {list.map((s, i) => (
        <Reveal key={i} delay={i * 0.08} className="bl-stat">
          <Counter value={f(s.value)} className="bl-display bl-stat-num" />
          <p>{f(s.label)}</p>
        </Reveal>
      ))}
    </section>
  );
}

function Head({ data, s, center }: { data: XP; s: XP; center?: boolean }) {
  const f = (t: unknown) => fill(t, data);
  return (
    <div className={'bl-head' + (center ? ' is-center' : '')}>
      {s.kicker && <p className="bl-kicker">{f(s.kicker)}</p>}
      {s.title && (
        <h2 className="bl-display bl-h2">
          <Words text={f(s.title)} />
        </h2>
      )}
      {s.text && (
        <Reveal delay={0.15}>
          <p className="bl-sub">{f(s.text)}</p>
        </Reveal>
      )}
    </div>
  );
}

function Treatments({ data, onBook }: { data: XP; onBook: (t?: string) => void }) {
  const f = (t: unknown) => fill(t, data);
  const t: XP = data.treatments || {};
  const list = items(t.items);
  const [active, setActive] = useState(0);
  const cur = list[Math.min(active, list.length - 1)];
  if (!list.length) return null;
  return (
    <section className="bl-section" id="treatments">
      <Head data={data} s={t} />
      <div className="bl-treat">
        <ul className="bl-treat-list" role="tablist" aria-label={f(t.kicker) || 'Treatments'}>
          {list.map((it, i) => (
            <li key={i}>
              <button type="button" role="tab" aria-selected={i === active} className={'bl-treat-tab' + (i === active ? ' is-on' : '')} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)}>
                <span className="bl-treat-no">{String(i + 1).padStart(2, '0')}</span>
                <span className="bl-treat-name">{f(it.name)}</span>
                <span className="bl-treat-price">{f(it.price)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="bl-treat-card" role="tabpanel">
          <AnimatePresence mode="wait">
            {cur && (
              <motion.div key={active} className="bl-treat-inner" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45, ease: EASE }}>
                {safeSrc(cur.image) && (
                  <div className="bl-treat-img">
                    <motion.img src={safeSrc(cur.image)} alt="" initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 1.1, ease: EASE }} />
                  </div>
                )}
                <div className="bl-treat-body">
                  <h3 className="bl-display">{f(cur.name)}</h3>
                  <p className="bl-treat-sum">{f(cur.summary)}</p>
                  <p>{f(cur.detail)}</p>
                  <div className="bl-treat-meta">
                    {cur.time && (
                      <span>
                        <Clock size={16} /> {f(cur.time)}
                      </span>
                    )}
                    {cur.price && <strong>{f(cur.price)}</strong>}
                  </div>
                  <button type="button" className="bl-btn" onClick={() => onBook(f(cur.name))}>
                    Book this <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Results({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const r: XP = data.results || {};
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const move = (x: number) => {
    const b = box.current?.getBoundingClientRect();
    if (b) setPos(Math.max(2, Math.min(98, ((x - b.left) / b.width) * 100)));
  };
  const before = safeSrc(r.before);
  const after = safeSrc(r.after);
  if (!before && !after) return null;
  return (
    <section className="bl-section bl-results" id="results">
      <Head data={data} s={r} center />
      <Reveal>
        <div
          className="bl-compare"
          ref={box}
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            move(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && move(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <img src={after || before} alt={f(r.afterLabel)} draggable={false} />
          <div className="bl-compare-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <img src={before || after} alt={f(r.beforeLabel)} draggable={false} className={r.tintBefore ? 'is-tinted' : ''} />
          </div>
          <span className="bl-compare-tag is-left">{f(r.beforeLabel)}</span>
          <span className="bl-compare-tag is-right">{f(r.afterLabel)}</span>
          <div className="bl-compare-line" style={{ left: `${pos}%` }}>
            <button
              type="button"
              className="bl-compare-knob"
              aria-label="Compare before and after"
              role="slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pos)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setPos((p) => Math.max(2, p - 5));
                if (e.key === 'ArrowRight') setPos((p) => Math.min(98, p + 5));
              }}
            >
              <ChevronLeft size={16} />
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Journey({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const j: XP = data.journey || {};
  const steps = items(j.steps);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] });
  const fillH = useTransform(scrollYProgress, (p) => `${Math.max(0, Math.min(1, p)) * 100}%`);
  const [lit, setLit] = useState(0);
  useEffect(() => scrollYProgress.on('change', (p) => setLit(Math.floor(Math.max(0, Math.min(0.999, p)) * steps.length))), [scrollYProgress, steps.length]);
  if (!steps.length) return null;
  return (
    <section className="bl-section bl-journey">
      <div className="bl-journey-grid">
        <div className="bl-journey-side">
          <Head data={data} s={j} />
        </div>
        <div className="bl-journey-steps" ref={ref}>
          <div className="bl-journey-rail" aria-hidden="true">
            <motion.div className="bl-journey-fill" style={{ height: fillH }} />
          </div>
          {steps.map((s, i) => (
            <div key={i} className={'bl-step' + (i <= lit ? ' is-lit' : '')}>
              <span className="bl-step-dot">{i < lit ? <Check size={16} /> : i + 1}</span>
              <h3 className="bl-display">{f(s.title)}</h3>
              <p>{f(s.text)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Team({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const t: XP = data.team || {};
  const list = items(t.members);
  if (!list.length) return null;
  return (
    <section className="bl-section" id="team">
      <Head data={data} s={t} />
      <div className="bl-team">
        {list.map((m, i) => (
          <Reveal key={i} delay={i * 0.1} as="article" className="bl-member">
            <div className="bl-member-img">{safeSrc(m.image) && <img src={safeSrc(m.image)} alt={f(m.name)} loading="lazy" />}</div>
            <div className="bl-member-body">
              <h3 className="bl-display">{f(m.name)}</h3>
              <p className="bl-member-role">{f(m.role)}</p>
              <p className="bl-member-bio">{f(m.bio)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Plans({ data, onBook }: { data: XP; onBook: (t?: string) => void }) {
  const f = (t: unknown) => fill(t, data);
  const p: XP = data.plans || {};
  const list = items(p.items);
  if (!list.length) return null;
  return (
    <section className="bl-section" id="plans">
      <Head data={data} s={p} center />
      <div className="bl-plans">
        {list.map((pl, i) => (
          <Reveal key={i} delay={i * 0.1} className={'bl-plan' + (pl.highlight ? ' is-hi' : '')}>
            {pl.highlight && <span className="bl-plan-flag">Most chosen</span>}
            <h3>{f(pl.name)}</h3>
            <p className="bl-plan-price">
              <span className="bl-display">{f(pl.price)}</span>
              {f(pl.period)}
            </p>
            <ul>
              {lines(pl.features, data).map((x, k) => (
                <li key={k}>
                  <Check size={16} /> {x}
                </li>
              ))}
            </ul>
            <button type="button" className={'bl-btn' + (pl.highlight ? '' : ' bl-btn-ghost')} onClick={() => onBook(f(pl.name) + ' plan')}>
              {f(pl.button) || 'Choose'}
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Reviews({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const r: XP = data.reviews || {};
  const list = items(r.items);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const secs = Math.max(2, Number(data.motion?.reviewSeconds) || 6);
  useEffect(() => {
    if (!r.autoplay || paused || list.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % list.length), secs * 1000);
    return () => clearInterval(t);
  }, [r.autoplay, paused, list.length, secs]);
  if (!list.length) return null;
  const cur = list[i % list.length];
  const go = (d: number) => setI((x) => (x + d + list.length) % list.length);
  return (
    <section className="bl-reviews" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {r.kicker && <p className="bl-kicker">{f(r.kicker)}</p>}
      <div className="bl-stars" aria-label="Five stars">
        {[0, 1, 2, 3, 4].map((k) => (
          <Star key={k} size={20} />
        ))}
      </div>
      <div className="bl-quote-wrap" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.blockquote key={i % list.length} className="bl-display bl-quote" initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -20, filter: 'blur(6px)' }} transition={{ duration: 0.6, ease: EASE }}>
            “{f(cur.quote)}”
            <footer>
              <strong>{f(cur.name)}</strong> {cur.detail && <span>· {f(cur.detail)}</span>}
            </footer>
          </motion.blockquote>
        </AnimatePresence>
      </div>
      {list.length > 1 && (
        <div className="bl-review-ctrl">
          <button type="button" aria-label="Previous review" onClick={() => go(-1)}>
            <ChevronLeft size={18} />
          </button>
          {list.map((_, k) => (
            <button key={k} type="button" className={'bl-dot-btn' + (k === i % list.length ? ' is-on' : '')} aria-label={`Review ${k + 1}`} onClick={() => setI(k)} />
          ))}
          <button type="button" aria-label="Next review" onClick={() => go(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}

function Faq({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const q: XP = data.faq || {};
  const list = items(q.items);
  const [open, setOpen] = useState<number | null>(0);
  if (!list.length) return null;
  return (
    <section className="bl-section bl-faq">
      <Head data={data} s={q} />
      <div className="bl-faq-list">
        {list.map((it, i) => (
          <div key={i} className={'bl-faq-item' + (open === i ? ' is-open' : '')}>
            <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              {f(it.q)}
              <Plus size={20} />
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                  <p>{f(it.a)}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

function Visit({ data, onBook }: { data: XP; onBook: () => void }) {
  const f = (t: unknown) => fill(t, data);
  const v: XP = data.visit || {};
  const b: XP = data.brand || {};
  const hours = pairs(v.hours, data);
  return (
    <section className="bl-section bl-visit" id="visit">
      <div className="bl-visit-card">
        <div className="bl-visit-body">
          <Head data={data} s={{ kicker: v.kicker, title: v.title }} />
          {hours.length > 0 && (
            <dl className="bl-hours">
              {hours.map(([d, h], i) => (
                <div key={i}>
                  <dt>{d}</dt>
                  <dd>{h}</dd>
                </div>
              ))}
            </dl>
          )}
          <ul className="bl-contact">
            {b.address && (
              <li>
                <Pin size={18} />
                {safeHref(b.mapLink) ? (
                  <a href={safeHref(b.mapLink)} target="_blank" rel="noreferrer">
                    {f(b.address)} <ArrowUpRight size={14} />
                  </a>
                ) : (
                  f(b.address)
                )}
              </li>
            )}
            {b.phone && (
              <li>
                <Phone size={18} />
                <a href={`tel:${String(b.phone).replace(/[^\d+]/g, '')}`}>{f(b.phone)}</a>
              </li>
            )}
            {b.email && (
              <li>
                <Mail size={18} />
                <a href={`mailto:${f(b.email)}`}>{f(b.email)}</a>
              </li>
            )}
          </ul>
          {v.note && <p className="bl-sub">{f(v.note)}</p>}
          <button type="button" className="bl-btn" onClick={onBook}>
            {f(data.nav?.cta) || 'Book a visit'} <ArrowRight size={18} />
          </button>
        </div>
        {safeSrc(v.image) && (
          <div className="bl-visit-img">
            <img src={safeSrc(v.image)} alt="" loading="lazy" />
          </div>
        )}
      </div>
      {v.emergency && (
        <Reveal className="bl-emergency">
          <Phone size={18} /> {f(v.emergency)}
        </Reveal>
      )}
    </section>
  );
}

function Footer({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  return (
    <footer className="bl-footer">
      <div>
        <p className="bl-display bl-footer-name">{f(data.brand?.name)}</p>
        <p>{f(data.footer?.text)}</p>
      </div>
      <nav aria-label="Footer">
        {items(data.nav?.links).map((l, i) => (
          <a key={i} href={safeHref(l.href) || '#top'}>
            {f(l.label)}
          </a>
        ))}
      </nav>
      <p className="bl-legal">{f(data.footer?.legal)}</p>
    </footer>
  );
}

function Booking({ data, open, treatment, onClose }: { data: XP; open: boolean; treatment?: string; onClose: () => void }) {
  const f = (t: unknown) => fill(t, data);
  const b: XP = data.booking || {};
  const treatments = items(data.treatments?.items).map((t) => f(t.name));
  const closed = String(b.closedDays ?? '')
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => n >= 0 && n <= 6);
  const days = useMemo(() => nextDays(Math.max(3, Math.min(30, Number(b.days) || 12)), closed), [b.days, b.closedDays]);
  const times = lines(b.times, data);
  const [what, setWhat] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const { state, send, reset } = useSender(b.formAction);
  useEffect(() => {
    if (open) {
      reset();
      setTried(false);
      setWhat(treatment || treatments[0] || '');
    }
  }, [open, treatment]);
  const when = [days.find((d) => d.iso === day)?.date, time].filter(Boolean).join(' at ');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!day || !time || !name.trim() || !phone.trim()) return;
    send({ treatment: what, date: day, time, name, phone, note });
  };
  return (
    <Modal open={open} onClose={onClose} label={f(b.title) || 'Book a visit'} className="bl-booking">
      {state === 'sent' ? (
        <div className="bl-done">
          <motion.span className="bl-done-icon" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
            <Check size={30} />
          </motion.span>
          <h3 className="bl-display">You're booked in.</h3>
          <p>{f(b.done).replace(/\{person\}/g, name.split(' ')[0]).replace(/\{when\}/g, when)}</p>
          <button type="button" className="bl-btn" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <h3 className="bl-display bl-booking-title">{f(b.title)}</h3>
          <p className="bl-sub">{f(b.text)}</p>
          {treatments.length > 0 && (
            <label className="bl-field">
              <span>Treatment</span>
              <select value={what} onChange={(e) => setWhat(e.target.value)}>
                {[...new Set([...(treatment && !treatments.includes(treatment) ? [treatment] : []), ...treatments])].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          )}
          <fieldset className="bl-field">
            <legend>Day</legend>
            <div className="bl-chips bl-days">
              {days.map((d) => (
                <button key={d.iso} type="button" className={'bl-chip' + (day === d.iso ? ' is-on' : '')} onClick={() => setDay(d.iso)} aria-pressed={day === d.iso}>
                  <small>{d.day}</small>
                  {d.date}
                </button>
              ))}
            </div>
            {tried && !day && <em className="bl-err">Pick a day</em>}
          </fieldset>
          {times.length > 0 && (
            <fieldset className="bl-field">
              <legend>Time</legend>
              <div className="bl-chips">
                {times.map((t) => (
                  <button key={t} type="button" className={'bl-chip' + (time === t ? ' is-on' : '')} onClick={() => setTime(t)} aria-pressed={time === t}>
                    {t}
                  </button>
                ))}
              </div>
              {tried && !time && <em className="bl-err">Pick a time</em>}
            </fieldset>
          )}
          <div className="bl-row">
            <label className="bl-field">
              <span>Your name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={tried && !name.trim()} />
            </label>
            <label className="bl-field">
              <span>Mobile</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" aria-invalid={tried && !phone.trim()} />
            </label>
          </div>
          <label className="bl-field">
            <span>Anything we should know? (optional)</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {state === 'error' && <p className="bl-err">That did not send. Please try again or call us.</p>}
          <button type="submit" className="bl-btn bl-btn-wide" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Request this time'} <ArrowRight size={18} />
          </button>
        </form>
      )}
    </Modal>
  );
}
