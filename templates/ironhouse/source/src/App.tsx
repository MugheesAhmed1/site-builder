import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, animate, motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, Menu, X } from './icons';
import { Clock, Flame, Mail, Phone, Pin } from './glyphs';
import { Counter, Reveal, Words, items, useSender } from './ui';
import { fill, lines, on, safeHref, safeSrc, useTheme, useXP, type XP } from './xp';

const EASE = [0.22, 1, 0.36, 1] as const;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function App() {
  const data = useXP();
  useTheme(data);
  const [picked, setPicked] = useState('');
  const toTrial = (what = '') => {
    setPicked(what);
    document.getElementById('trial')?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <MotionConfig reducedMotion={data.motion?.animate === false ? 'always' : 'user'}>
      <div className="ih">
        <Nav data={data} onTrial={() => toTrial()} />
        <Hero data={data} onTrial={() => toTrial()} />
        <Ticker data={data} />
        {on('stats', data) && <Stats data={data} />}
        {on('programs', data) && <Programs data={data} onTrial={toTrial} />}
        {on('timetable', data) && <Timetable data={data} onBook={toTrial} />}
        {on('membership', data) && <Membership data={data} onTrial={toTrial} />}
        {on('calculator', data) && <Calculator data={data} />}
        {on('coaches', data) && <Coaches data={data} />}
        {on('stories', data) && <Stories data={data} />}
        {on('trial', data) && <Trial data={data} picked={picked} />}
        <div data-xp-extras="" />
        <Footer data={data} />
      </div>
    </MotionConfig>
  );
}

function Nav({ data, onTrial }: { data: XP; onTrial: () => void }) {
  const f = (t: unknown) => fill(t, data);
  const [open, setOpen] = useState(false);
  const [hide, setHide] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const s = () => {
      const y = window.scrollY;
      setHide(y > 300 && y > last);
      last = y;
    };
    window.addEventListener('scroll', s, { passive: true });
    return () => window.removeEventListener('scroll', s);
  }, []);
  const links = items(data.nav?.links);
  return (
    <header className={'ih-nav' + (hide && !open ? ' is-hidden' : '')}>
      <a href="#top" className="ih-logo ih-display">
        {f(data.brand?.name)}
      </a>
      <nav className="ih-links" aria-label="Main">
        {links.map((l, i) => (
          <a key={i} href={safeHref(l.href) || '#top'}>
            <span data-t={f(l.label)}>{f(l.label)}</span>
          </a>
        ))}
      </nav>
      <div className="ih-nav-end">
        <button type="button" className="ih-btn ih-btn-sm" onClick={onTrial}>
          {f(data.nav?.cta)}
        </button>
        <button type="button" className="ih-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav className="ih-drawer" initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: 0.5, ease: EASE }} aria-label="Menu">
            {links.map((l, i) => (
              <motion.a key={i} href={safeHref(l.href) || '#top'} onClick={() => setOpen(false)} className="ih-display" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                {f(l.label)}
              </motion.a>
            ))}
            <button
              type="button"
              className="ih-btn"
              onClick={() => {
                setOpen(false);
                onTrial();
              }}
            >
              {f(data.nav?.cta)} <ArrowRight size={18} />
            </button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function Hero({ data, onTrial }: { data: XP; onTrial: () => void }) {
  const f = (t: unknown) => fill(t, data);
  const h: XP = data.hero || {};
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const par = data.motion?.heroParallax !== false;
  const x1 = useTransform(scrollYProgress, (p) => (par ? `${-p * 30}%` : '0%'));
  const x2 = useTransform(scrollYProgress, (p) => (par ? `${p * 30}%` : '0%'));
  const imgY = useTransform(scrollYProgress, (p) => (par ? `${p * 25}%` : '0%'));
  const imgScale = useTransform(scrollYProgress, (p) => (par ? 1.05 + p * 0.15 : 1.05));
  // The picture leans a little toward the pointer.
  const mx = useSpring(useMotionValue(0), { stiffness: 60, damping: 20 });
  const my = useSpring(useMotionValue(0), { stiffness: 60, damping: 20 });
  return (
    <section
      className="ih-hero"
      id="top"
      ref={ref}
      onPointerMove={(e) => {
        if (!par || e.pointerType !== 'mouse') return;
        mx.set((e.clientX / window.innerWidth - 0.5) * -24);
        my.set((e.clientY / window.innerHeight - 0.5) * -16);
      }}
    >
      <motion.div className="ih-hero-img" style={{ y: imgY, scale: imgScale }}>
        {safeSrc(h.image) && <motion.img src={safeSrc(h.image)} alt="" style={{ x: mx, y: my }} />}
      </motion.div>
      <div className="ih-hero-shade" />
      <div className="ih-hero-type ih-display" aria-label={`${f(h.line1)} ${f(h.line2)}`}>
        <motion.div style={{ x: x1 }} aria-hidden="true">
          <motion.span initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 1, ease: EASE }} className="ih-solid">
            {f(h.line1)}
          </motion.span>
        </motion.div>
        <motion.div style={{ x: x2 }} aria-hidden="true" className="ih-line2">
          <motion.span initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.12, ease: EASE }} className="ih-outline">
            {f(h.line2)}
          </motion.span>
        </motion.div>
      </div>
      <motion.div className="ih-hero-foot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8, ease: EASE }}>
        <p>{f(h.text)}</p>
        <div className="ih-ctas">
          {h.button && (
            <button type="button" className="ih-btn" onClick={onTrial}>
              {f(h.button)} <ArrowRight size={18} />
            </button>
          )}
          {h.secondary && (
            <a href="#timetable" className="ih-btn ih-btn-ghost">
              {f(h.secondary)}
            </a>
          )}
        </div>
      </motion.div>
    </section>
  );
}

function Ticker({ data }: { data: XP }) {
  const list = lines(data.hero?.ticker, data);
  if (!list.length) return null;
  const speed = Math.max(6, Number(data.motion?.tickerSpeed) || 22);
  const row = [...list, ...list, ...list, ...list];
  return (
    <div className="ih-ticker" aria-label={list.join(', ')}>
      <div className="ih-ticker-track ih-display" style={{ animationDuration: `${speed}s` }} aria-hidden="true">
        {row.map((t, i) => (
          <span key={i}>
            {t} <Flame size={26} />
          </span>
        ))}
      </div>
    </div>
  );
}

function Stats({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const list = items(data.stats?.items);
  if (!list.length) return null;
  return (
    <section className="ih-stats">
      {list.map((s, i) => (
        <Reveal key={i} delay={i * 0.08} className="ih-stat">
          <Counter value={f(s.value)} className="ih-display ih-stat-num" />
          <p>{f(s.label)}</p>
        </Reveal>
      ))}
    </section>
  );
}

function Head({ data, k, t, id }: { data: XP; k?: string; t?: string; id?: string }) {
  const f = (x: unknown) => fill(x, data);
  return (
    <div className="ih-head" id={id}>
      {k && <p className="ih-kicker">{f(k)}</p>}
      {t && (
        <h2 className="ih-display ih-h2">
          <Words text={f(t)} stagger={0.05} />
        </h2>
      )}
    </div>
  );
}

function ProgramCard({ data, p, i, n, onTrial }: { data: XP; p: XP; i: number; n: number; onTrial: (w: string) => void }) {
  const f = (t: unknown) => fill(t, data);
  const ref = useRef<HTMLDivElement>(null);
  const stack = data.motion?.stackCards !== false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, (v) => (stack && i < n - 1 ? 1 - clamp(v) * 0.08 : 1));
  const dim = useTransform(scrollYProgress, (v) => (stack && i < n - 1 ? clamp(v) * 0.6 : 0));
  const level = clamp(Number(p.intensity) || 0, 0, 5);
  return (
    <div className="ih-prog-slot" ref={ref} style={stack ? { position: 'sticky', top: `calc(84px + ${i * 18}px)` } : undefined}>
      <motion.article className="ih-prog" style={{ scale }}>
        <div className="ih-prog-img">{safeSrc(p.image) && <img src={safeSrc(p.image)} alt="" loading="lazy" />}</div>
        <div className="ih-prog-body">
          <span className="ih-prog-no ih-display">{String(i + 1).padStart(2, '0')}</span>
          {p.tag && <span className="ih-tag">{f(p.tag)}</span>}
          <h3 className="ih-display">{f(p.name)}</h3>
          <p>{f(p.text)}</p>
          <div className="ih-prog-meta">
            {p.length && (
              <span>
                <Clock size={16} /> {f(p.length)}
              </span>
            )}
            <span className="ih-level" aria-label={`Intensity ${level} of 5`}>
              {[1, 2, 3, 4, 5].map((k) => (
                <i key={k} className={k <= level ? 'is-on' : ''} />
              ))}
            </span>
          </div>
          <button type="button" className="ih-btn" onClick={() => onTrial(f(p.name))}>
            Try {f(p.name)} free <ArrowRight size={18} />
          </button>
        </div>
        <motion.span className="ih-prog-dim" style={{ opacity: dim }} />
      </motion.article>
    </div>
  );
}

function Programs({ data, onTrial }: { data: XP; onTrial: (w: string) => void }) {
  const p: XP = data.programs || {};
  const list = items(p.items);
  if (!list.length) return null;
  return (
    <section className="ih-section" id="programs">
      <Head data={data} k={p.kicker} t={p.title} />
      <div className="ih-progs">
        {list.map((x, i) => (
          <ProgramCard key={i} data={data} p={x} i={i} n={list.length} onTrial={onTrial} />
        ))}
      </div>
    </section>
  );
}

function Timetable({ data, onBook }: { data: XP; onBook: (w: string) => void }) {
  const f = (t: unknown) => fill(t, data);
  const t: XP = data.timetable || {};
  const rows = useMemo(
    () =>
      lines(t.classes, data)
        .map((l) => l.split('|').map((x) => x.trim()))
        .filter((r) => r.length >= 3)
        .map(([day, time, name, coach]) => ({ day: day.slice(0, 3), time, name, coach: coach || '' })),
    [t.classes, data.brand?.name]
  );
  const days = DAYS.slice(1).concat(DAYS[0]).filter((d) => rows.some((r) => r.day.toLowerCase() === d.toLowerCase()));
  const today = DAYS[new Date().getDay()];
  const [day, setDay] = useState(days.includes(today) ? today : days[0] || '');
  const [kind, setKind] = useState('');
  const kinds = [...new Set(rows.map((r) => r.name))];
  const shown = rows.filter((r) => r.day.toLowerCase() === String(day).toLowerCase() && (!kind || r.name === kind));
  if (!rows.length) return null;
  return (
    <section className="ih-section" id="timetable">
      <Head data={data} k={t.kicker} t={t.title} />
      <div className="ih-tt">
        <div className="ih-days" role="tablist" aria-label="Day">
          {days.map((d) => (
            <button key={d} role="tab" type="button" aria-selected={d === day} className={d === day ? 'is-on' : ''} onClick={() => setDay(d)}>
              {d}
              {d === today && <i aria-label="today" />}
              {d === day && <motion.span layoutId="ih-day" className="ih-day-pill" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            </button>
          ))}
        </div>
        <div className="ih-kinds">
          {[{ v: '', l: f(t.allLabel) || 'All' }, ...kinds.map((k) => ({ v: k, l: k }))].map((k) => (
            <button key={k.v || 'all'} type="button" className={'ih-chip' + (kind === k.v ? ' is-on' : '')} aria-pressed={kind === k.v} onClick={() => setKind(k.v)}>
              {k.l}
            </button>
          ))}
        </div>
        <div className="ih-tt-list">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((r, i) => (
              <motion.div key={r.day + r.time + r.name} className="ih-tt-row" layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04 } }} exit={{ opacity: 0, x: 20 }}>
                <span className="ih-display ih-tt-time">{r.time}</span>
                <span className="ih-tt-name">{r.name}</span>
                <span className="ih-tt-coach">{r.coach}</span>
                <button type="button" className="ih-btn ih-btn-sm" onClick={() => onBook(`${r.name}, ${r.day} ${r.time}`)}>
                  {f(t.button) || 'Book'}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {!shown.length && <p className="ih-empty">No {kind} classes on {day}. Try another day.</p>}
        </div>
      </div>
    </section>
  );
}

function Price({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const c = animate(prev.current, value, { duration: 0.6, ease: EASE, onUpdate: (v) => setShown(Math.round(v)) });
    prev.current = value;
    return () => c.stop();
  }, [value]);
  return <>{shown.toLocaleString('en-US')}</>;
}

function Membership({ data, onTrial }: { data: XP; onTrial: (w: string) => void }) {
  const f = (t: unknown) => fill(t, data);
  const m: XP = data.membership || {};
  const list = items(m.plans);
  const [yearly, setYearly] = useState(false);
  if (!list.length) return null;
  return (
    <section className="ih-section" id="membership">
      <div className="ih-mem-top">
        <Head data={data} k={m.kicker} t={m.title} />
        <div className="ih-switch" role="group" aria-label="Billing">
          <button type="button" aria-pressed={!yearly} className={!yearly ? 'is-on' : ''} onClick={() => setYearly(false)}>
            {f(m.monthlyLabel)}
          </button>
          <button type="button" aria-pressed={yearly} className={yearly ? 'is-on' : ''} onClick={() => setYearly(true)}>
            {f(m.yearlyLabel)} {m.yearlyNote && <small>{f(m.yearlyNote)}</small>}
          </button>
          <motion.span className="ih-switch-pill" animate={{ x: yearly ? '100%' : '0%' }} transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
        </div>
      </div>
      <div className="ih-plans">
        {list.map((p, i) => (
          <Reveal key={i} delay={i * 0.08} className={'ih-plan' + (p.highlight ? ' is-hi' : '')}>
            <h3 className="ih-display">{f(p.name)}</h3>
            <p className="ih-plan-price">
              <span className="ih-display">
                {f(m.currency)}
                <Price value={Number(yearly ? p.yearly : p.monthly) || 0} />
              </span>
              /{yearly ? 'year' : 'month'}
            </p>
            <ul>
              {lines(p.features, data).map((x, k) => (
                <li key={k}>
                  <Check size={16} /> {x}
                </li>
              ))}
            </ul>
            <button type="button" className={'ih-btn' + (p.highlight ? '' : ' ih-btn-ghost')} onClick={() => onTrial(`${f(p.name)} (${yearly ? 'yearly' : 'monthly'})`)}>
              {f(m.button)} <ArrowRight size={18} />
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Calculator({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const c: XP = data.calculator || {};
  const [kg, setKg] = useState(75);
  const [n, setN] = useState(3);
  const factor = Number(c.factor) || 8;
  const kcal = Math.round(kg * factor * n);
  return (
    <section className="ih-section">
      <div className="ih-calc">
        <div>
          <Head data={data} k={c.kicker} t={c.title} />
          <label className="ih-range">
            <span>
              {f(c.weightLabel)} <strong>{kg}</strong>
            </span>
            <input type="range" min={40} max={150} value={kg} onChange={(e) => setKg(Number(e.target.value))} style={{ ['--p' as string]: `${((kg - 40) / 110) * 100}%` }} />
          </label>
          <label className="ih-range">
            <span>
              {f(c.sessionsLabel)} <strong>{n}</strong>
            </span>
            <input type="range" min={1} max={7} value={n} onChange={(e) => setN(Number(e.target.value))} style={{ ['--p' as string]: `${((n - 1) / 6) * 100}%` }} />
          </label>
          {c.note && <p className="ih-note">{f(c.note)}</p>}
        </div>
        <div className="ih-calc-out" aria-live="polite">
          <Flame size={40} />
          <span className="ih-display ih-calc-num">
            <Price value={kcal} />
          </span>
          <span>{f(c.resultLabel)}</span>
        </div>
      </div>
    </section>
  );
}

function Coach({ data, c }: { data: XP; c: XP }) {
  const f = (t: unknown) => fill(t, data);
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });
  return (
    <motion.article
      className="ih-coach"
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const b = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - b.left) / b.width - 0.5) * 14);
        rx.set(((e.clientY - b.top) / b.height - 0.5) * -14);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {safeSrc(c.image) && <img src={safeSrc(c.image)} alt={f(c.name)} loading="lazy" />}
      <div className="ih-coach-body">
        <span className="ih-tag">{f(c.role)}</span>
        <h3 className="ih-display">{f(c.name)}</h3>
        <p>{f(c.bio)}</p>
      </div>
    </motion.article>
  );
}

function Coaches({ data }: { data: XP }) {
  const c: XP = data.coaches || {};
  const list = items(c.items);
  if (!list.length) return null;
  return (
    <section className="ih-section" id="coaches">
      <Head data={data} k={c.kicker} t={c.title} />
      <div className="ih-coaches">
        {list.map((x, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <Coach data={data} c={x} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Stories({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const list = items(data.stories?.items);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % list.length), 6000);
    return () => clearInterval(t);
  }, [list.length, i]);
  if (!list.length) return null;
  const cur = list[i % list.length];
  return (
    <section className="ih-stories">
      <AnimatePresence mode="wait">
        <motion.blockquote key={i} className="ih-display" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.6, ease: EASE }}>
          “{f(cur.quote)}”<footer>{f(cur.name)}</footer>
        </motion.blockquote>
      </AnimatePresence>
      {list.length > 1 && (
        <div className="ih-story-dots">
          {list.map((_, k) => (
            <button key={k} type="button" aria-label={`Story ${k + 1}`} className={k === i % list.length ? 'is-on' : ''} onClick={() => setI(k)}>
              <i />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Trial({ data, picked }: { data: XP; picked: string }) {
  const f = (t: unknown) => fill(t, data);
  const t: XP = data.trial || {};
  const b: XP = data.brand || {};
  const goals = lines(t.goals, data);
  const [goal, setGoal] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tried, setTried] = useState(false);
  const { state, send } = useSender(t.formAction);
  const okEmail = /^\S+@\S+\.\S+$/.test(email);
  return (
    <section className="ih-trial" id="trial">
      <div className="ih-trial-copy">
        {t.kicker && <p className="ih-kicker">{f(t.kicker)}</p>}
        <h2 className="ih-display ih-h2">
          <Words text={f(t.title)} />
        </h2>
        {t.text && <p className="ih-trial-text">{f(t.text)}</p>}
        <ul className="ih-contact">
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
              <Phone size={18} /> <a href={`tel:${String(b.phone).replace(/[^\d+]/g, '')}`}>{f(b.phone)}</a>
            </li>
          )}
          {b.email && (
            <li>
              <Mail size={18} /> <a href={`mailto:${f(b.email)}`}>{f(b.email)}</a>
            </li>
          )}
        </ul>
      </div>
      <div className="ih-trial-card">
        <AnimatePresence mode="wait">
          {state === 'sent' ? (
            <motion.div key="done" className="ih-done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <span className="ih-done-icon">
                <Check size={30} />
              </span>
              <h3 className="ih-display">Let's go.</h3>
              <p>{f(t.done).replace(/\{person\}/g, name.split(' ')[0])}</p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              noValidate
              exit={{ opacity: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                setTried(true);
                if (!name.trim() || !okEmail) return;
                send({ name, email, phone, goal, interest: picked });
              }}
            >
              {picked && (
                <p className="ih-picked">
                  <Flame size={16} /> {picked}
                </p>
              )}
              {goals.length > 0 && (
                <fieldset className="ih-field">
                  <legend>Your goal</legend>
                  <div className="ih-goals">
                    {goals.map((g) => (
                      <button key={g} type="button" className={'ih-chip' + (goal === g ? ' is-on' : '')} aria-pressed={goal === g} onClick={() => setGoal(goal === g ? '' : g)}>
                        {g}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              <label className="ih-field">
                <span>Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={tried && !name.trim()} />
              </label>
              <label className="ih-field">
                <span>Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={tried && !okEmail} />
              </label>
              <label className="ih-field">
                <span>Phone (optional)</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </label>
              {tried && (!name.trim() || !okEmail) && <p className="ih-err">Add your name and a valid email.</p>}
              {state === 'error' && <p className="ih-err">That did not send. Please try again.</p>}
              <button type="submit" className="ih-btn ih-btn-wide" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : f(t.button)} <ArrowRight size={18} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Footer({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  return (
    <footer className="ih-footer">
      <p className="ih-display ih-footer-name">{f(data.brand?.name)}</p>
      <div className="ih-footer-row">
        <p>{f(data.footer?.text)}</p>
        <nav aria-label="Footer">
          {items(data.nav?.links).map((l, i) => (
            <a key={i} href={safeHref(l.href) || '#top'}>
              {f(l.label)}
            </a>
          ))}
        </nav>
        <p>{f(data.footer?.legal)}</p>
      </div>
    </footer>
  );
}
