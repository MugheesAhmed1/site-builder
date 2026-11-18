import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Menu, X } from './icons';
import { Clock, Mail, Minus, Phone, Pin, Plus } from './glyphs';
import { Reveal, Words, items, nextDays, useSender } from './ui';
import { fill, lines, on, pairs, safeHref, safeSrc, useTheme, useXP, type XP } from './xp';

const EASE = [0.22, 1, 0.36, 1] as const;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export default function App() {
  const data = useXP();
  useTheme(data);
  return (
    <MotionConfig reducedMotion={data.motion?.animate === false ? 'always' : 'user'}>
      <div className="ag">
        <Nav data={data} />
        <Hero data={data} />
        {on('story', data) && <Story data={data} />}
        {on('signature', data) && <Signature data={data} />}
        {on('menu', data) && <MenuSection data={data} />}
        {on('private', data) && <Private data={data} />}
        {on('booking', data) && <Booking data={data} />}
        {on('visit', data) && <Visit data={data} />}
        <div data-xp-extras="" />
        <Footer data={data} />
      </div>
    </MotionConfig>
  );
}

function Nav({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const s = () => setSolid(window.scrollY > 40);
    s();
    window.addEventListener('scroll', s, { passive: true });
    return () => window.removeEventListener('scroll', s);
  }, []);
  const links = items(data.nav?.links);
  return (
    <header className={'ag-nav' + (solid ? ' is-solid' : '')}>
      <a href="#top" className="ag-logo ag-display">
        {f(data.brand?.name)}
      </a>
      <nav className="ag-links" aria-label="Main">
        {links.map((l, i) => (
          <a key={i} href={safeHref(l.href) || '#top'}>
            {f(l.label)}
          </a>
        ))}
      </nav>
      <div className="ag-nav-end">
        <a href="#book" className="ag-btn ag-btn-sm">
          {f(data.nav?.cta)}
        </a>
        <button type="button" className="ag-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav className="ag-drawer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label="Menu">
            {links.map((l, i) => (
              <motion.a key={i} href={safeHref(l.href) || '#top'} onClick={() => setOpen(false)} className="ag-display" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 * i, ease: EASE, duration: 0.6 }}>
                {f(l.label)}
              </motion.a>
            ))}
            <a href="#book" className="ag-btn" onClick={() => setOpen(false)}>
              {f(data.nav?.cta)}
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

/** Embers drifting up from the fire: a light 2D canvas that sleeps when off screen. */
function Embers({ count, color }: { count: number; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const c = ref.current;
    if (!c || reduce || count <= 0) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let w = 0,
      h = 0,
      raf = 0,
      visible = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const make = (y?: number) => ({ x: Math.random() * w, y: y ?? h + Math.random() * h * 0.3, r: 0.6 + Math.random() * 2.2, vy: 0.3 + Math.random() * 1.1, sway: Math.random() * Math.PI * 2, life: 0.4 + Math.random() * 0.6 });
    const parts = Array.from({ length: Math.min(200, count) }, () => make(Math.random() * h));
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.y -= p.vy;
        p.sway += 0.02;
        p.x += Math.sin(p.sway) * 0.4;
        const a = clamp(p.y / h) * p.life;
        if (p.y < -10) Object.assign(p, make());
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, color);
        g.addColorStop(1, 'transparent');
        ctx.globalAlpha = a;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (visible) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(tick);
    });
    io.observe(c);
    window.addEventListener('resize', size);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', size);
    };
  }, [count, color, reduce]);
  return <canvas ref={ref} className="ag-embers" aria-hidden="true" />;
}

function Hero({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const h: XP = data.hero || {};
  const m: XP = data.motion || {};
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, (p) => `${p * 30}%`);
  const fade = useTransform(scrollYProgress, (p) => 1 - clamp(p * 1.6));
  const glow = String(data.theme?.colors?.glow || '#ffb067');
  return (
    <section className="ag-hero" id="top" ref={ref}>
      <motion.div className="ag-hero-img" style={{ y }}>
        {safeSrc(h.image) && <img src={safeSrc(h.image)} alt="" className={m.flicker !== false ? 'is-flicker' : ''} />}
      </motion.div>
      <div className="ag-hero-shade" />
      {m.embers !== false && <Embers count={Number(h.embers) || 0} color={glow} />}
      <motion.div className="ag-hero-copy" style={{ opacity: fade }}>
        {h.kicker && (
          <motion.p className="ag-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}>
            {f(h.kicker)}
          </motion.p>
        )}
        <h1 className="ag-display ag-hero-title">
          <Words text={f(h.title)} stagger={0.08} delay={0.15} />
        </h1>
        {h.text && (
          <motion.p className="ag-hero-text" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.9, ease: EASE }}>
            {f(h.text)}
          </motion.p>
        )}
        <motion.div className="ag-ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.9, ease: EASE }}>
          {h.button && (
            <a href="#book" className="ag-btn">
              {f(h.button)} <ArrowRight size={18} />
            </a>
          )}
          {h.secondary && (
            <a href="#menu" className="ag-btn ag-btn-ghost">
              {f(h.secondary)}
            </a>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}

function Story({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const s: XP = data.story || {};
  const list = items(s.chapters);
  const [cur, setCur] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setCur(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [list.length]);
  if (!list.length) return null;
  return (
    <section className="ag-story" id="story">
      <div className="ag-story-media">
        <div className="ag-story-stick">
          {list.map((c, i) => (
            <motion.div key={i} className="ag-story-img" initial={false} animate={{ opacity: i === cur ? 1 : 0, scale: i === cur ? 1 : 1.08 }} transition={{ duration: 1, ease: EASE }}>
              {safeSrc(c.image) && <img src={safeSrc(c.image)} alt="" loading="lazy" />}
            </motion.div>
          ))}
          <div className="ag-story-count ag-display">
            {String(cur + 1).padStart(2, '0')} <small>/ {String(list.length).padStart(2, '0')}</small>
          </div>
        </div>
      </div>
      <div className="ag-story-text">
        {s.kicker && <p className="ag-kicker">{f(s.kicker)}</p>}
        {list.map((c, i) => (
          <div key={i} className={'ag-chapter' + (i === cur ? ' is-on' : '')} data-i={i} ref={(el) => void (refs.current[i] = el)}>
            {safeSrc(c.image) && <img className="ag-chapter-img" src={safeSrc(c.image)} alt="" loading="lazy" />}
            <h2 className="ag-display">{f(c.title)}</h2>
            <p>{f(c.text)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Signature({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const s: XP = data.signature || {};
  const list = items(s.items);
  const cur = String(data.brand?.currency ?? '');
  const ref = useRef<HTMLElement>(null);
  const spin = data.motion?.spinPlates !== false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const n = Math.max(1, list.length);
  const step = 360 / n;
  const [shown, setShown] = useState(0);
  useEffect(() => scrollYProgress.on('change', (p) => setShown(Math.min(n - 1, Math.round(clamp(p) * (n - 1))))), [scrollYProgress, n]);
  // Picking a plate scrolls to it, so the wheel and the page stay in step.
  const pick = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const run = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (run * i) / Math.max(1, n - 1), behavior: 'smooth' });
  };
  const rotate = useTransform(scrollYProgress, (p) => (spin ? -clamp(p) * step * (n - 1) : 0));
  if (!list.length) return null;
  const dish = list[shown] || list[0];
  return (
    <section className="ag-sig" ref={ref} style={{ height: `${100 + n * 45}vh` }}>
      <div className="ag-sig-stick">
        <div className="ag-sig-head">
          {s.kicker && <p className="ag-kicker">{f(s.kicker)}</p>}
          <h2 className="ag-display ag-h2">
            <Words text={f(s.title)} />
          </h2>
        </div>
        <div className="ag-wheel-wrap">
          <motion.div className="ag-wheel" style={{ rotate }}>
            {list.map((d, i) => (
              <button
                type="button"
                key={i}
                className={'ag-plate' + (i === shown ? ' is-on' : '')}
                style={{ transform: `rotate(${i * step}deg) translateY(calc(var(--wheel) * -0.5)) rotate(${-i * step}deg)` }}
                onClick={() => pick(i)}
                aria-label={f(d.name)}
              >
                {safeSrc(d.image) && <img src={safeSrc(d.image)} alt="" loading="lazy" />}
              </button>
            ))}
          </motion.div>
        </div>
        <div className="ag-sig-card" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div key={shown} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.4, ease: EASE }}>
              <span className="ag-sig-no">
                {String(shown + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
              </span>
              <h3 className="ag-display">{f(dish.name)}</h3>
              <p>{f(dish.note)}</p>
              {dish.price && (
                <strong className="ag-display">
                  {cur}
                  {f(dish.price)}
                </strong>
              )}
            </motion.div>
          </AnimatePresence>
          {n > 1 && (
            <div className="ag-sig-arrows">
              <button type="button" aria-label="Previous plate" disabled={shown <= 0} onClick={() => pick(shown - 1)}>
                <ArrowLeft size={18} />
              </button>
              <button type="button" aria-label="Next plate" disabled={shown >= n - 1} onClick={() => pick(shown + 1)}>
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MenuSection({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const m: XP = data.menu || {};
  const cats = items(m.categories);
  const [tab, setTab] = useState(0);
  const cur = String(data.brand?.currency ?? '');
  const t = Math.min(tab, cats.length - 1);
  const dishes = useMemo(() => lines(cats[t]?.dishes, data).map((l) => l.split('|').map((x) => x.trim())), [cats, t, data]);
  if (!cats.length) return null;
  return (
    <section className="ag-section ag-menu" id="menu">
      <div className="ag-head">
        {m.kicker && <p className="ag-kicker">{f(m.kicker)}</p>}
        <h2 className="ag-display ag-h2">
          <Words text={f(m.title)} />
        </h2>
      </div>
      <div className="ag-tabs" role="tablist" aria-label={f(m.kicker) || 'Menu'}>
        {cats.map((c, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === t} className={i === t ? 'is-on' : ''} onClick={() => setTab(i)}>
            {f(c.name)}
            {i === t && <motion.span layoutId="ag-tab" className="ag-tab-line" />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.ul key={t} className="ag-dishes" role="tabpanel" initial="h" animate="s" exit="h" variants={{ s: { transition: { staggerChildren: 0.05 } } }}>
          {dishes.map(([name, price, note], i) => (
            <motion.li key={i} variants={{ h: { opacity: 0, y: 14 }, s: { opacity: 1, y: 0 } }} transition={{ duration: 0.45, ease: EASE }}>
              <div className="ag-dish-row">
                <span className="ag-display ag-dish-name">{name}</span>
                <i aria-hidden="true" />
                {price && (
                  <span className="ag-dish-price">
                    {/^\d/.test(price) ? cur : ''}
                    {price}
                  </span>
                )}
              </div>
              {note && <p>{note}</p>}
            </motion.li>
          ))}
        </motion.ul>
      </AnimatePresence>
      {m.note && <p className="ag-note">{f(m.note)}</p>}
    </section>
  );
}

function Private({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const p: XP = data.private || {};
  const b: XP = data.brand || {};
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, (v) => `${(v - 0.5) * -16}%`);
  const subject = encodeURIComponent(`${f(p.kicker) || 'Private dining'} enquiry`);
  return (
    <section className="ag-section ag-private" id="private" ref={ref}>
      <div className="ag-private-img">{safeSrc(p.image) && <motion.img src={safeSrc(p.image)} alt="" style={{ y }} loading="lazy" />}</div>
      <Reveal className="ag-private-card">
        {p.kicker && <p className="ag-kicker">{f(p.kicker)}</p>}
        <h2 className="ag-display ag-h3">{f(p.title)}</h2>
        <p className="ag-muted">{f(p.text)}</p>
        <ul>
          {lines(p.points, data).map((x, i) => (
            <li key={i}>
              <Check size={16} /> {x}
            </li>
          ))}
        </ul>
        {b.email && (
          <a className="ag-btn" href={`mailto:${f(b.email)}?subject=${subject}`}>
            {f(p.button)} <ArrowRight size={18} />
          </a>
        )}
      </Reveal>
    </section>
  );
}

function Booking({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const b: XP = data.booking || {};
  const closed = String(b.closedDays ?? '')
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => n >= 0 && n <= 6);
  const days = useMemo(() => nextDays(Math.max(3, Math.min(30, Number(b.days) || 14)), closed), [b.days, b.closedDays]);
  const times = lines(b.times, data);
  const max = Math.max(1, Number(b.maxParty) || 8);
  const [party, setParty] = useState(2);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tried, setTried] = useState(false);
  const { state, send, reset } = useSender(b.formAction);
  const d = days.find((x) => x.iso === day);
  const when = d ? `${d.day} ${d.date}${time ? ` at ${time}` : ''}` : '';
  return (
    <section className="ag-section ag-book" id="book">
      <div className="ag-book-copy">
        {b.kicker && <p className="ag-kicker">{f(b.kicker)}</p>}
        <h2 className="ag-display ag-h2">
          <Words text={f(b.title)} />
        </h2>
        {b.text && <p className="ag-muted">{f(b.text)}</p>}
        {data.brand?.phone && (
          <a className="ag-phone ag-display" href={`tel:${String(data.brand.phone).replace(/[^\d+]/g, '')}`}>
            {f(data.brand.phone)}
          </a>
        )}
      </div>
      <div className="ag-book-card">
        <AnimatePresence mode="wait">
          {state === 'sent' ? (
            <motion.div key="done" className="ag-done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="ag-done-icon">
                <Check size={28} />
              </span>
              <h3 className="ag-display">Table held.</h3>
              <p>
                {f(b.done)
                  .replace(/\{person\}/g, name.split(' ')[0])
                  .replace(/\{when\}/g, when)
                  .replace(/\{party\}/g, String(party))}
              </p>
              <button
                type="button"
                className="ag-btn ag-btn-ghost"
                onClick={() => {
                  reset();
                  setTried(false);
                  setTime('');
                }}
              >
                Book another
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              noValidate
              exit={{ opacity: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                setTried(true);
                if (!day || !time || !name.trim() || !phone.trim()) return;
                send({ party: String(party), date: day, time, name, phone });
              }}
            >
              <div className="ag-field">
                <span>Guests</span>
                <div className="ag-stepper">
                  <button type="button" aria-label="Fewer guests" disabled={party <= 1} onClick={() => setParty(party - 1)}>
                    <Minus size={16} />
                  </button>
                  <output className="ag-display">{party}</output>
                  <button type="button" aria-label="More guests" disabled={party >= max} onClick={() => setParty(party + 1)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <fieldset className="ag-field">
                <legend>Date</legend>
                <div className="ag-chips ag-days">
                  {days.map((x) => (
                    <button key={x.iso} type="button" className={'ag-chip' + (day === x.iso ? ' is-on' : '')} aria-pressed={day === x.iso} onClick={() => setDay(x.iso)}>
                      <small>{x.day}</small>
                      {x.date}
                    </button>
                  ))}
                </div>
                {tried && !day && <em className="ag-err">Pick a date</em>}
              </fieldset>
              <fieldset className="ag-field">
                <legend>Time</legend>
                <div className="ag-chips">
                  {times.map((t) => (
                    <button key={t} type="button" className={'ag-chip' + (time === t ? ' is-on' : '')} aria-pressed={time === t} onClick={() => setTime(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                {tried && !time && <em className="ag-err">Pick a time</em>}
              </fieldset>
              <div className="ag-row">
                <label className="ag-field">
                  <span>Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={tried && !name.trim()} />
                </label>
                <label className="ag-field">
                  <span>Phone</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" aria-invalid={tried && !phone.trim()} />
                </label>
              </div>
              {state === 'error' && <p className="ag-err">That did not send. Please call us instead.</p>}
              <button type="submit" className="ag-btn ag-btn-wide" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : when ? `Book for ${party}, ${when}` : 'Book table'} <ArrowRight size={18} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Visit({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const v: XP = data.visit || {};
  const b: XP = data.brand || {};
  const hours = pairs(v.hours, data);
  return (
    <section className="ag-section ag-visit" id="visit">
      {v.kicker && <p className="ag-kicker">{f(v.kicker)}</p>}
      <div className="ag-visit-grid">
        <Reveal className="ag-visit-col">
          <h3>
            <Clock size={18} /> Hours
          </h3>
          <dl>
            {hours.map(([d, h], i) => (
              <div key={i}>
                <dt>{d}</dt>
                <dd>{h}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <Reveal className="ag-visit-col" delay={0.1}>
          <h3>
            <Pin size={18} /> Address
          </h3>
          <p className="ag-display ag-addr">{f(b.address)}</p>
          {v.note && <p className="ag-muted">{f(v.note)}</p>}
          {safeHref(b.mapLink) && (
            <a className="ag-link" href={safeHref(b.mapLink)} target="_blank" rel="noreferrer">
              Directions <ArrowUpRight size={14} />
            </a>
          )}
        </Reveal>
        <Reveal className="ag-visit-col" delay={0.2}>
          <h3>
            <Phone size={18} /> Contact
          </h3>
          {b.phone && (
            <a className="ag-link" href={`tel:${String(b.phone).replace(/[^\d+]/g, '')}`}>
              {f(b.phone)}
            </a>
          )}
          {b.email && (
            <a className="ag-link" href={`mailto:${f(b.email)}`}>
              <Mail size={14} /> {f(b.email)}
            </a>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function Footer({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  return (
    <footer className="ag-footer">
      <p className="ag-display ag-footer-name">{f(data.brand?.name)}</p>
      <p className="ag-footer-line">{f(data.footer?.text)}</p>
      <nav aria-label="Footer">
        {items(data.nav?.links).map((l, i) => (
          <a key={i} href={safeHref(l.href) || '#top'}>
            {f(l.label)}
          </a>
        ))}
      </nav>
      <p className="ag-legal">{f(data.footer?.legal)}</p>
    </footer>
  );
}
