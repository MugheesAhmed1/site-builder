import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, Menu, X } from './icons';
import { Area, Calendar, Minus, Pin, Plus, Users } from './glyphs';
import { Modal, Reveal, Words, items, useSender } from './ui';
import { fill, lines, on, pairs, safeHref, safeSrc, useTheme, useXP, type XP } from './xp';

const EASE = [0.22, 1, 0.36, 1] as const;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
};
const nightsBetween = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);
const pretty = (s: string) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

export interface Stay {
  checkIn: string;
  checkOut: string;
  guests: number;
  room: number;
}

export default function App() {
  const data = useXP();
  useTheme(data);
  const today = iso(new Date());
  const [stay, setStay] = useState<Stay>(() => ({ checkIn: addDays(today, 14), checkOut: addDays(today, 17), guests: 2, room: 0 }));
  const [askOpen, setAskOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState<number | null>(null);
  const check = (patch?: Partial<Stay>) => {
    if (patch) setStay((s) => ({ ...s, ...patch }));
    setRoomOpen(null);
    setAskOpen(true);
  };
  return (
    <MotionConfig reducedMotion={data.motion?.animate === false ? 'always' : 'user'}>
      <div className="tw">
        <Nav data={data} onBook={() => check()} />
        <Hero data={data} />
        {on('booking', data) && <BookingBar data={data} stay={stay} setStay={setStay} onCheck={() => check()} />}
        {on('intro', data) && <Intro data={data} />}
        {on('rooms', data) && <Rooms data={data} onOpen={setRoomOpen} />}
        {on('experiences', data) && <Experiences data={data} />}
        {on('amenities', data) && <Amenities data={data} />}
        {on('reviews', data) && <Reviews data={data} />}
        {on('location', data) && <Location data={data} />}
        {on('offers', data) && <Offers data={data} />}
        <div data-xp-extras="" />
        <Footer data={data} />
        <RoomModal data={data} index={roomOpen} onClose={() => setRoomOpen(null)} onBook={(room) => check({ room })} />
        <Availability data={data} open={askOpen} stay={stay} setStay={setStay} onClose={() => setAskOpen(false)} />
      </div>
    </MotionConfig>
  );
}

function Nav({ data, onBook }: { data: XP; onBook: () => void }) {
  const f = (t: unknown) => fill(t, data);
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const s = () => setSolid(window.scrollY > window.innerHeight * 0.6);
    s();
    window.addEventListener('scroll', s, { passive: true });
    return () => window.removeEventListener('scroll', s);
  }, []);
  const links = items(data.nav?.links);
  return (
    <header className={'tw-nav' + (solid ? ' is-solid' : '')}>
      <nav className="tw-nav-links" aria-label="Main">
        {links.slice(0, 2).map((l, i) => (
          <a key={i} href={safeHref(l.href) || '#top'}>
            {f(l.label)}
          </a>
        ))}
      </nav>
      <a href="#top" className="tw-logo">
        {f(data.brand?.name)}
        {data.brand?.place && <small>{f(data.brand.place)}</small>}
      </a>
      <div className="tw-nav-end">
        <nav className="tw-nav-links" aria-label="More">
          {links.slice(2).map((l, i) => (
            <a key={i} href={safeHref(l.href) || '#top'}>
              {f(l.label)}
            </a>
          ))}
        </nav>
        <button type="button" className="tw-btn tw-btn-sm" onClick={onBook}>
          {f(data.nav?.cta)}
        </button>
        <button type="button" className="tw-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav className="tw-drawer" initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }} exit={{ clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: 0.5, ease: EASE }} aria-label="Menu">
            {links.map((l, i) => (
              <a key={i} href={safeHref(l.href) || '#top'} onClick={() => setOpen(false)}>
                {f(l.label)}
              </a>
            ))}
            <button
              type="button"
              className="tw-btn"
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

function Hero({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const h: XP = data.hero || {};
  const m: XP = data.motion || {};
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [mode, setMode] = useState<'auto' | 'day' | 'night'>('auto');
  const zoom = m.heroZoom !== false;
  const scale = useTransform(scrollYProgress, (p) => (zoom ? 1.18 - clamp(p) * 0.18 : 1));
  const clip = useTransform(scrollYProgress, (p) => {
    const k = zoom ? clamp((p - 0.35) / 0.65) : 0;
    return `inset(${k * 7}% ${k * 5}% ${k * 7}% ${k * 5}% round ${k * 28}px)`;
  });
  const nightAuto = useTransform(scrollYProgress, (p) => (m.dayToNight !== false ? clamp((p - 0.3) / 0.5) : 0));
  const titleOpacity = useTransform(scrollYProgress, (p) => 1 - clamp((p - 0.45) / 0.3));
  const titleY = useTransform(scrollYProgress, (p) => p * -140);
  const nightSrc = safeSrc(h.nightImage);
  return (
    <section className="tw-hero" id="top" ref={ref}>
      <div className="tw-hero-stick">
        <motion.div className="tw-hero-frame" style={{ clipPath: clip }}>
          <motion.div className="tw-hero-imgs" style={{ scale }}>
            {safeSrc(h.image) && <img src={safeSrc(h.image)} alt={f(h.imageAlt)} />}
            {nightSrc && <motion.img src={nightSrc} alt="" className="tw-night" style={{ opacity: mode === 'auto' ? nightAuto : mode === 'night' ? 1 : 0 }} />}
          </motion.div>
          <div className="tw-hero-shade" />
        </motion.div>
        <motion.div className="tw-hero-copy" style={{ opacity: titleOpacity, y: titleY }}>
          {h.kicker && (
            <motion.p className="tw-kicker tw-on-dark" initial={{ opacity: 0, letterSpacing: '0.6em' }} animate={{ opacity: 1, letterSpacing: '0.28em' }} transition={{ duration: 1.6, ease: EASE }}>
              {f(h.kicker)}
            </motion.p>
          )}
          <h1 className="tw-display tw-hero-title">
            <Words text={f(h.title)} stagger={0.09} delay={0.2} />
          </h1>
          {h.text && (
            <motion.p className="tw-hero-text" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.9, ease: EASE }}>
              {f(h.text)}
            </motion.p>
          )}
        </motion.div>
        {nightSrc && (
          <div className="tw-daynight" role="group" aria-label="Day or night">
            <button type="button" aria-pressed={mode === 'day'} className={mode === 'day' ? 'is-on' : ''} onClick={() => setMode(mode === 'day' ? 'auto' : 'day')}>
              {f(h.dayLabel) || 'Day'}
            </button>
            <button type="button" aria-pressed={mode === 'night'} className={mode === 'night' ? 'is-on' : ''} onClick={() => setMode(mode === 'night' ? 'auto' : 'night')}>
              {f(h.nightLabel) || 'Night'}
            </button>
          </div>
        )}
        {h.scrollHint && (
          <motion.div className="tw-scroll-hint" style={{ opacity: titleOpacity }}>
            <span>{f(h.scrollHint)}</span>
            <i aria-hidden="true" />
          </motion.div>
        )}
      </div>
    </section>
  );
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="tw-stepper" role="group" aria-label={label}>
      <button type="button" aria-label="Fewer" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus size={16} />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="More" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus size={16} />
      </button>
    </div>
  );
}

function StayFields({ data, stay, setStay }: { data: XP; stay: Stay; setStay: (f: (s: Stay) => Stay) => void }) {
  const f = (t: unknown) => fill(t, data);
  const b: XP = data.booking || {};
  const rooms = items(data.rooms?.items);
  const today = iso(new Date());
  const max = Math.max(1, Number(b.maxGuests) || 6);
  return (
    <>
      <label className="tw-bf">
        <span>
          <Calendar size={14} /> {f(b.checkIn)}
        </span>
        <input
          type="date"
          min={addDays(today, 1)}
          value={stay.checkIn}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            setStay((s) => ({ ...s, checkIn: v, checkOut: nightsBetween(v, s.checkOut) < 1 ? addDays(v, 1) : s.checkOut }));
          }}
        />
      </label>
      <label className="tw-bf">
        <span>
          <Calendar size={14} /> {f(b.checkOut)}
        </span>
        <input type="date" min={addDays(stay.checkIn, 1)} value={stay.checkOut} onChange={(e) => e.target.value && setStay((s) => ({ ...s, checkOut: nightsBetween(s.checkIn, e.target.value) < 1 ? addDays(s.checkIn, 1) : e.target.value }))} />
      </label>
      <div className="tw-bf">
        <span>
          <Users size={14} /> {f(b.guests)}
        </span>
        <Stepper value={stay.guests} min={1} max={max} label={f(b.guests)} onChange={(n) => setStay((s) => ({ ...s, guests: n }))} />
      </div>
      {rooms.length > 0 && (
        <label className="tw-bf">
          <span>{f(b.room)}</span>
          <select value={Math.min(stay.room, rooms.length - 1)} onChange={(e) => setStay((s) => ({ ...s, room: Number(e.target.value) }))}>
            {rooms.map((r, i) => (
              <option key={i} value={i}>
                {f(r.name)}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}

function BookingBar({ data, stay, setStay, onCheck }: { data: XP; stay: Stay; setStay: (f: (s: Stay) => Stay) => void; onCheck: () => void }) {
  const f = (t: unknown) => fill(t, data);
  return (
    <Reveal className="tw-bar-wrap">
      <form
        className="tw-bar"
        onSubmit={(e) => {
          e.preventDefault();
          onCheck();
        }}
      >
        <StayFields data={data} stay={stay} setStay={setStay} />
        <button type="submit" className="tw-btn">
          {f(data.booking?.button)} <ArrowRight size={18} />
        </button>
      </form>
    </Reveal>
  );
}

function LitWord({ word, i, n, p }: { word: string; i: number; n: number; p: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => 0.16 + 0.84 * clamp((v * (n + 6) - i) / 6));
  return <motion.span style={{ opacity }}>{word} </motion.span>;
}

function Intro({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const it: XP = data.intro || {};
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 45%'] });
  const words = f(it.text).split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  return (
    <section className="tw-intro">
      {it.kicker && <p className="tw-kicker">{f(it.kicker)}</p>}
      <p className="tw-display tw-intro-text" ref={ref}>
        {words.map((w, i) => (
          <LitWord key={i} word={w} i={i} n={words.length} p={scrollYProgress} />
        ))}
      </p>
      {it.signature && <Reveal className="tw-sign">{f(it.signature)}</Reveal>}
    </section>
  );
}

function Rooms({ data, onOpen }: { data: XP; onOpen: (i: number) => void }) {
  const f = (t: unknown) => fill(t, data);
  const r: XP = data.rooms || {};
  const list = items(r.items);
  const cur = String(data.brand?.currency ?? '');
  const sec = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [dist, setDist] = useState(0);
  const [narrow, setNarrow] = useState(false);
  const sideways = data.motion?.sidewaysRooms !== false && !narrow;
  useLayoutEffect(() => {
    const measure = () => {
      setNarrow(window.innerWidth < 760);
      const t = track.current;
      if (t) setDist(Math.max(0, t.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [list.length]);
  const { scrollYProgress } = useScroll({ target: sec, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, (p) => (sideways ? -clamp(p) * dist : 0));
  const bar = useTransform(scrollYProgress, (p) => `${clamp(p) * 100}%`);
  if (!list.length) return null;
  return (
    <section className={'tw-rooms' + (sideways ? ' is-sideways' : '')} id="rooms" ref={sec} style={sideways ? { height: `calc(100vh + ${dist}px)` } : undefined}>
      <div className="tw-rooms-stick">
        <div className="tw-rooms-head">
          <div>
            {r.kicker && <p className="tw-kicker">{f(r.kicker)}</p>}
            <h2 className="tw-display tw-h2">
              <Words text={f(r.title)} />
            </h2>
          </div>
          {r.hint && <p className="tw-muted tw-rooms-hint">{f(r.hint)}</p>}
        </div>
        <motion.div className="tw-track" ref={track} style={{ x }}>
          {list.map((room, i) => (
            <button type="button" key={i} className="tw-room" onClick={() => onOpen(i)}>
              <div className="tw-room-img">{safeSrc(room.image) && <img src={safeSrc(room.image)} alt="" loading="lazy" />}</div>
              <div className="tw-room-meta">
                <span className="tw-room-no">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="tw-display">{f(room.name)}</h3>
                <p>
                  <span>
                    <Area size={14} /> {f(room.size)}
                  </span>
                  <span>
                    <Users size={14} /> {Number(room.sleeps) || 2}
                  </span>
                  <strong>
                    {cur}
                    {Number(room.price) || 0}
                    <small> / night</small>
                  </strong>
                </p>
              </div>
            </button>
          ))}
        </motion.div>
        {sideways && (
          <div className="tw-progress" aria-hidden="true">
            <motion.i style={{ width: bar }} />
          </div>
        )}
      </div>
    </section>
  );
}

function RoomModal({ data, index, onClose, onBook }: { data: XP; index: number | null; onClose: () => void; onBook: (i: number) => void }) {
  const f = (t: unknown) => fill(t, data);
  const list = items(data.rooms?.items);
  const room = index != null ? list[index] : null;
  const cur = String(data.brand?.currency ?? '');
  return (
    <Modal open={!!room} onClose={onClose} label={room ? f(room.name) : 'Room'} className="tw-room-modal">
      {room && (
        <>
          {safeSrc(room.image) && <img className="tw-rm-img" src={safeSrc(room.image)} alt="" />}
          <div className="tw-rm-body">
            <h3 className="tw-display">{f(room.name)}</h3>
            <p className="tw-rm-facts">
              <span>
                <Area size={16} /> {f(room.size)}
              </span>
              <span>
                <Users size={16} /> Sleeps {Number(room.sleeps) || 2}
              </span>
            </p>
            <p className="tw-muted">{f(room.text)}</p>
            <ul>
              {lines(room.features, data).map((x, i) => (
                <li key={i}>
                  <Check size={16} /> {x}
                </li>
              ))}
            </ul>
            <div className="tw-rm-foot">
              <strong className="tw-display">
                {cur}
                {Number(room.price) || 0}
                <small> / night</small>
              </strong>
              <button type="button" className="tw-btn" onClick={() => onBook(index!)}>
                Book this room <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

function Availability({ data, open, stay, setStay, onClose }: { data: XP; open: boolean; stay: Stay; setStay: (f: (s: Stay) => Stay) => void; onClose: () => void }) {
  const f = (t: unknown) => fill(t, data);
  const b: XP = data.booking || {};
  const rooms = items(data.rooms?.items);
  const room = rooms[Math.min(stay.room, rooms.length - 1)];
  const cur = String(data.brand?.currency ?? '');
  const nights = Math.max(1, nightsBetween(stay.checkIn, stay.checkOut));
  const total = (Number(room?.price) || 0) * nights;
  const tooMany = room && stay.guests > (Number(room.sleeps) || 2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const { state, send, reset } = useSender(b.formAction);
  useEffect(() => {
    if (open) {
      reset();
      setTried(false);
    }
  }, [open]);
  const okEmail = /^\S+@\S+\.\S+$/.test(email);
  return (
    <Modal open={open} onClose={onClose} label={f(b.button)} className="tw-avail">
      {state === 'sent' ? (
        <div className="tw-done">
          <motion.span className="tw-done-icon" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}>
            <Check size={28} />
          </motion.span>
          <h3 className="tw-display">See you soon.</h3>
          <p className="tw-muted">
            {f(b.done)
              .replace(/\{person\}/g, name.split(' ')[0])
              .replace(/\{room\}/g, room ? f(room.name) : '')
              .replace(/\{nights\}/g, String(nights))
              .replace(/\{date\}/g, pretty(stay.checkIn))}
          </p>
          <button type="button" className="tw-btn" onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (!name.trim() || !okEmail || tooMany) return;
            send({ room: room ? f(room.name) : '', checkIn: stay.checkIn, checkOut: stay.checkOut, guests: String(stay.guests), name, email, total: `${cur}${total}` });
          }}
        >
          <p className="tw-kicker">{f(b.button)}</p>
          <h3 className="tw-display tw-avail-title">
            {room ? f(room.name) : f(data.brand?.name)} <em>is free.</em>
          </h3>
          <div className="tw-avail-fields">
            <StayFields data={data} stay={stay} setStay={setStay} />
          </div>
          {tooMany && <p className="tw-err">This room sleeps {Number(room.sleeps) || 2}. Pick a bigger room or fewer guests.</p>}
          <dl className="tw-sum">
            <div>
              <dt>
                {cur}
                {Number(room?.price) || 0} × {nights} {nights === 1 ? 'night' : 'nights'}
              </dt>
              <dd>
                {cur}
                {total.toLocaleString('en-GB')}
              </dd>
            </div>
            <div className="is-total">
              <dt>Total</dt>
              <dd className="tw-display">
                {cur}
                {total.toLocaleString('en-GB')}
              </dd>
            </div>
          </dl>
          {b.taxNote && <p className="tw-note">{f(b.taxNote)}</p>}
          <div className="tw-row">
            <label className="tw-field">
              <span>Your name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={tried && !name.trim()} />
            </label>
            <label className="tw-field">
              <span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" aria-invalid={tried && !okEmail} />
            </label>
          </div>
          {tried && (!name.trim() || !okEmail) && <p className="tw-err">Add your name and a valid email so we can confirm.</p>}
          {state === 'error' && <p className="tw-err">That did not send. Please try again or email us.</p>}
          <button type="submit" className="tw-btn tw-btn-wide" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Request to book'} <ArrowRight size={18} />
          </button>
        </form>
      )}
    </Modal>
  );
}

function Experiences({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const e: XP = data.experiences || {};
  const list = items(e.items);
  const [active, setActive] = useState(0);
  if (!list.length) return null;
  return (
    <section className="tw-section" id="experiences">
      <div className="tw-head">
        {e.kicker && <p className="tw-kicker">{f(e.kicker)}</p>}
        <h2 className="tw-display tw-h2">
          <Words text={f(e.title)} />
        </h2>
      </div>
      <div className="tw-exp">
        {list.map((x, i) => (
          <motion.button
            type="button"
            key={i}
            className={'tw-exp-card' + (i === active ? ' is-on' : '')}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-expanded={i === active}
            layout
            transition={{ duration: 0.7, ease: EASE }}
          >
            {safeSrc(x.image) && <img src={safeSrc(x.image)} alt="" loading="lazy" />}
            <span className="tw-exp-shade" />
            <span className="tw-exp-body">
              {x.tag && <small>{f(x.tag)}</small>}
              <strong className="tw-display">{f(x.name)}</strong>
              <span className="tw-exp-text">{f(x.text)}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function Amenities({ data }: { data: XP }) {
  const list = lines(data.amenities?.items, data);
  if (!list.length) return null;
  const row = [...list, ...list];
  return (
    <section className="tw-amen" aria-label="At the hotel">
      <div className="tw-amen-track">
        {row.map((a, i) => (
          <span key={i} aria-hidden={i >= list.length}>
            {a} <i>✦</i>
          </span>
        ))}
      </div>
    </section>
  );
}

function Reviews({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const r: XP = data.reviews || {};
  const list = items(r.items);
  if (!list.length) return null;
  const half = Math.ceil(list.length / 2);
  const rows = list.length > 3 ? [list.slice(0, half), list.slice(half)] : [list];
  const speed = Math.max(10, Number(r.speed) || 40);
  return (
    <section className="tw-reviews">
      {r.kicker && <p className="tw-kicker tw-center">{f(r.kicker)}</p>}
      {rows.map((row, k) => (
        <div className="tw-marquee" key={k}>
          <div className={'tw-marquee-track' + (k % 2 ? ' is-rev' : '')} style={{ animationDuration: `${speed}s` }}>
            {[...row, ...row, ...row].map((q, i) => (
              <figure key={i} className="tw-quote" aria-hidden={i >= row.length}>
                <blockquote className="tw-display">“{f(q.quote)}”</blockquote>
                <figcaption>{f(q.name)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Location({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const l: XP = data.location || {};
  const b: XP = data.brand || {};
  const rows = pairs(l.distances, data);
  return (
    <section className="tw-section tw-loc" id="location">
      <div className="tw-loc-img">
        {safeSrc(l.image) && <img src={safeSrc(l.image)} alt="" loading="lazy" />}
        {b.address && (
          <p className="tw-loc-pin">
            <Pin size={16} /> {f(b.address)}
          </p>
        )}
      </div>
      <div className="tw-loc-body">
        {l.kicker && <p className="tw-kicker">{f(l.kicker)}</p>}
        <h2 className="tw-display tw-h2">
          <Words text={f(l.title)} />
        </h2>
        {rows.length > 0 && (
          <dl className="tw-dist">
            {rows.map(([a, c], i) => (
              <Reveal key={i} delay={i * 0.06}>
                <dt>{a}</dt>
                <dd>{c}</dd>
              </Reveal>
            ))}
          </dl>
        )}
        {l.note && <p className="tw-muted">{f(l.note)}</p>}
        <div className="tw-loc-ctas">
          {safeHref(b.mapLink) && (
            <a className="tw-btn" href={safeHref(b.mapLink)} target="_blank" rel="noreferrer">
              {f(l.button) || 'Open in maps'} <ArrowUpRight size={16} />
            </a>
          )}
          {b.phone && (
            <a className="tw-btn tw-btn-ghost" href={`tel:${String(b.phone).replace(/[^\d+]/g, '')}`}>
              {f(b.phone)}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Offers({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const o: XP = data.offers || {};
  const [email, setEmail] = useState('');
  const [bad, setBad] = useState(false);
  const { state, send } = useSender(o.formAction);
  return (
    <section className="tw-offers" id="offers">
      <div className="tw-offers-in">
        {o.kicker && <p className="tw-kicker tw-on-dark">{f(o.kicker)}</p>}
        <h2 className="tw-display tw-h2">
          <Words text={f(o.title)} />
        </h2>
        {o.text && <p className="tw-offers-text">{f(o.text)}</p>}
        <AnimatePresence mode="wait">
          {state === 'sent' ? (
            <motion.p key="done" className="tw-offers-done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Check size={18} /> {f(o.done)}
            </motion.p>
          ) : (
            <motion.form
              key="form"
              className="tw-offers-form"
              noValidate
              exit={{ opacity: 0, y: -10 }}
              onSubmit={(e) => {
                e.preventDefault();
                const ok = /^\S+@\S+\.\S+$/.test(email);
                setBad(!ok);
                if (ok) send({ email });
              }}
            >
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={f(o.placeholder)} aria-label={f(o.placeholder) || 'Email'} aria-invalid={bad} />
              <button type="submit" className="tw-btn" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : f(o.button)}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
        {bad && state !== 'sent' && <p className="tw-err tw-on-dark">Please enter a valid email.</p>}
        {state === 'error' && <p className="tw-err tw-on-dark">That did not send. Please try again.</p>}
      </div>
    </section>
  );
}

function Footer({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const b: XP = data.brand || {};
  return (
    <footer className="tw-footer">
      <p className="tw-display tw-footer-name">{f(b.name)}</p>
      <p className="tw-footer-text">{f(data.footer?.text)}</p>
      <div className="tw-footer-links">
        {items(data.nav?.links).map((l, i) => (
          <a key={i} href={safeHref(l.href) || '#top'}>
            {f(l.label)}
          </a>
        ))}
        {b.email && <a href={`mailto:${f(b.email)}`}>{f(b.email)}</a>}
      </div>
      <p className="tw-legal">{f(data.footer?.legal)}</p>
    </footer>
  );
}
