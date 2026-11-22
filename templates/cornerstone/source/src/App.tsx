import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, Menu, X } from './icons';
import { Area, Bath, Bed, Heart, Mail, Phone, Pin } from './glyphs';
import { Modal, Reveal, Words, items, nextDays, useSender } from './ui';
import { fill, lines, on, safeHref, safeSrc, useTheme, useXP, type XP } from './xp';
import { CharacterSlot, hasCharacter, hasEcho, stageClass, stageStyle } from './character';

const EASE = [0.22, 1, 0.36, 1] as const;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const SAVED_KEY = 'cs-saved';

/** Money as $1.2m, $890k or $540,000. */
function money(n: number, cur: string, short = false) {
  if (short && n >= 1e6) return `${cur}${(n / 1e6).toFixed(n % 1e6 ? 2 : 0).replace(/\.?0+$/, '')}m`;
  if (short && n >= 1e3) return `${cur}${Math.round(n / 1e3)}k`;
  return `${cur}${Math.round(n).toLocaleString('en-US')}`;
}

interface Filters {
  q: string;
  type: string;
  max: number;
}

export default function App() {
  const data = useXP();
  useTheme(data);
  const [filters, setFilters] = useState<Filters>({ q: '', type: '', max: 0 });
  const [open, setOpen] = useState<number | null>(null);
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const toggleSave = (name: string) =>
    setSaved((s) => {
      const next = s.includes(name) ? s.filter((x) => x !== name) : [...s, name];
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        /* private mode: keep it for this visit only */
      }
      return next;
    });
  return (
    <MotionConfig reducedMotion={data.motion?.animate === false ? 'always' : 'user'}>
      <div className="cs">
        <Nav data={data} saved={saved.length} />
        <Hero
          data={data}
          onSearch={(f) => {
            setFilters(f);
            document.getElementById('homes')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        {on('homes', data) && <Homes data={data} filters={filters} setFilters={setFilters} saved={saved} onSave={toggleSave} onOpen={setOpen} />}
        {on('mortgage', data) && <Mortgage data={data} />}
        {on('areas', data) && (
          <Areas
            data={data}
            onPick={(q) => {
              setFilters({ q, type: '', max: 0 });
              document.getElementById('homes')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        )}
        {on('sell', data) && <Sell data={data} />}
        {on('agents', data) && <Agents data={data} />}
        {on('valuation', data) && <Valuation data={data} />}
        <div data-xp-extras="" />
        {hasEcho(data) && (
          <div className="xp-echo">
            <CharacterSlot data={data} slot="echo" />
          </div>
        )}
        <Footer data={data} />
        <HomeModal data={data} index={open} onClose={() => setOpen(null)} saved={saved} onSave={toggleSave} />
      </div>
    </MotionConfig>
  );
}

function Nav({ data, saved }: { data: XP; saved: number }) {
  const f = (t: unknown) => fill(t, data);
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const s = () => setSolid(window.scrollY > 30);
    s();
    window.addEventListener('scroll', s, { passive: true });
    return () => window.removeEventListener('scroll', s);
  }, []);
  const links = items(data.nav?.links);
  return (
    <header className={'cs-nav' + (solid ? ' is-solid' : '')}>
      <a href="#top" className="cs-logo">
        <span className="cs-mark" aria-hidden="true" />
        <span>
          <b className="cs-display">{f(data.brand?.name)}</b>
          {data.brand?.tagline && <small>{f(data.brand.tagline)}</small>}
        </span>
      </a>
      <nav className="cs-links" aria-label="Main">
        {links.map((l, i) => (
          <a key={i} href={safeHref(l.href) || '#top'}>
            {f(l.label)}
          </a>
        ))}
      </nav>
      <div className="cs-nav-end">
        <a href="#homes" className="cs-saved" aria-label={`${saved} saved homes`}>
          <Heart size={18} filled={saved > 0} />
          <AnimatePresence>
            {saved > 0 && (
              <motion.span key={saved} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                {saved}
              </motion.span>
            )}
          </AnimatePresence>
        </a>
        <a href="#valuation" className="cs-btn cs-btn-sm">
          {f(data.nav?.cta)}
        </a>
        <button type="button" className="cs-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav className="cs-drawer" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} aria-label="Menu">
            {links.map((l, i) => (
              <a key={i} href={safeHref(l.href) || '#top'} onClick={() => setOpen(false)}>
                {f(l.label)} <ArrowRight size={18} />
              </a>
            ))}
            <a href="#valuation" className="cs-btn" onClick={() => setOpen(false)}>
              {f(data.nav?.cta)}
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function typesOf(data: XP) {
  return [...new Set(items(data.homes?.items).map((h) => String(h.type || '').trim()).filter(Boolean))];
}

function Hero({ data, onSearch }: { data: XP; onSearch: (f: Filters) => void }) {
  const f = (t: unknown) => fill(t, data);
  const h: XP = data.hero || {};
  const cur = String(data.brand?.currency ?? '');
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const opening = data.motion?.heroOpen !== false;
  const clip = useTransform(scrollYProgress, (p) => {
    const k = opening ? 1 - clamp(p * 2.2) : 0;
    return `inset(${k * 9}% ${k * 4}% 0% ${k * 4}% round ${k * 24}px ${k * 24}px 0 0)`;
  });
  const imgY = useTransform(scrollYProgress, (p) => `${p * 20}%`);
  const types = typesOf(data);
  const steps = lines(h.priceSteps, data)
    .map(Number)
    .filter((n) => n > 0);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [max, setMax] = useState(0);
  const char = hasCharacter(data);
  return (
    <section className={'cs-hero' + (char ? ` has-char ${stageClass(data, 'light')}` : '')} id="top" ref={ref} style={char ? stageStyle(data, [76, 26]) : undefined}>
      <div className="cs-hero-copy">
        {h.kicker && (
          <motion.p className="cs-kicker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {f(h.kicker)}
          </motion.p>
        )}
        <h1 className="cs-display cs-hero-title">
          <Words text={f(h.title)} stagger={0.06} />
        </h1>
        {h.text && (
          <motion.p className="cs-lead" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8, ease: EASE }}>
            {f(h.text)}
          </motion.p>
        )}
        {char && <CharacterSlot data={data} className="cs-char" />}
      </div>
      <motion.div className="cs-hero-media" style={{ clipPath: clip }}>
        {safeSrc(h.image) && <motion.img src={safeSrc(h.image)} alt="" style={{ y: imgY }} />}
        {on('search', data) && (
          <motion.form
            className="cs-search"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8, ease: EASE }}
            onSubmit={(e) => {
              e.preventDefault();
              onSearch({ q: q.trim(), type, max });
            }}
          >
            <label className="cs-sf cs-sf-q">
              <Pin size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={f(h.searchPlaceholder)} aria-label={f(h.searchPlaceholder) || 'Where'} />
            </label>
            {types.length > 0 && (
              <label className="cs-sf">
                <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
                  <option value="">{f(h.anyType)}</option>
                  {types.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            )}
            {steps.length > 0 && (
              <label className="cs-sf">
                <select value={max} onChange={(e) => setMax(Number(e.target.value))} aria-label="Most you want to pay">
                  <option value={0}>{f(h.anyPrice)}</option>
                  {steps.map((s) => (
                    <option key={s} value={s}>
                      Up to {money(s, cur, true)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button type="submit" className="cs-btn">
              {f(h.searchButton)} <ArrowRight size={18} />
            </button>
          </motion.form>
        )}
      </motion.div>
    </section>
  );
}

function HomeCard({ data, h, i, saved, onSave, onOpen }: { data: XP; h: XP; i: number; saved: boolean; onSave: () => void; onOpen: () => void }) {
  const f = (t: unknown) => fill(t, data);
  const cur = String(data.brand?.currency ?? '');
  return (
    <motion.article className="cs-home" layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.5, ease: EASE, delay: Math.min(i, 6) * 0.05 }}>
      <button type="button" className="cs-home-img" onClick={onOpen} aria-label={`Open ${f(h.name)}`}>
        {safeSrc(h.image) && <img src={safeSrc(h.image)} alt="" loading="lazy" />}
        {h.status && <span className="cs-status">{f(h.status)}</span>}
      </button>
      <button type="button" className={'cs-heart' + (saved ? ' is-on' : '')} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save this home'} onClick={onSave}>
        <motion.span key={String(saved)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
          <Heart size={18} filled={saved} />
        </motion.span>
      </button>
      <button type="button" className="cs-home-body" onClick={onOpen}>
        <span className="cs-home-price cs-display">{money(Number(h.price) || 0, cur)}</span>
        <span className="cs-home-name">{f(h.name)}</span>
        <span className="cs-home-area">
          <Pin size={14} /> {f(h.area)}
          {h.type && <> · {f(h.type)}</>}
        </span>
        <span className="cs-specs">
          <span>
            <Bed size={16} /> {Number(h.beds) || 0}
          </span>
          <span>
            <Bath size={16} /> {Number(h.baths) || 0}
          </span>
          {h.size && (
            <span>
              <Area size={16} /> {f(h.size)}
            </span>
          )}
        </span>
      </button>
    </motion.article>
  );
}

function Homes({ data, filters, setFilters, saved, onSave, onOpen }: { data: XP; filters: Filters; setFilters: (f: Filters) => void; saved: string[]; onSave: (n: string) => void; onOpen: (i: number) => void }) {
  const f = (t: unknown) => fill(t, data);
  const s: XP = data.homes || {};
  const list = items(s.items);
  const types = typesOf(data);
  const [beds, setBeds] = useState(0);
  const [sort, setSort] = useState('new');
  const [onlySaved, setOnlySaved] = useState(false);
  const shown = useMemo(() => {
    const q = filters.q.toLowerCase();
    const r = list
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => !filters.type || h.type === filters.type)
      .filter(({ h }) => !filters.max || (Number(h.price) || 0) <= filters.max)
      .filter(({ h }) => !q || `${h.name} ${h.area} ${h.type} ${h.text}`.toLowerCase().includes(q))
      .filter(({ h }) => (Number(h.beds) || 0) >= beds)
      .filter(({ h }) => !onlySaved || saved.includes(String(h.name)));
    if (sort === 'low') r.sort((a, b) => (Number(a.h.price) || 0) - (Number(b.h.price) || 0));
    if (sort === 'high') r.sort((a, b) => (Number(b.h.price) || 0) - (Number(a.h.price) || 0));
    return r;
  }, [list, filters, beds, sort, onlySaved, saved]);
  const active = filters.q || filters.type || filters.max || beds || onlySaved;
  return (
    <section className="cs-section" id="homes">
      <div className="cs-head-row">
        <div>
          {s.kicker && <p className="cs-kicker">{f(s.kicker)}</p>}
          <h2 className="cs-display cs-h2">
            <Words text={f(s.title)} />
          </h2>
        </div>
        <p className="cs-count" aria-live="polite">
          {shown.length} of {list.length} homes
        </p>
      </div>
      <div className="cs-filters">
        <div className="cs-chips" role="group" aria-label="Type">
          {['', ...types].map((t) => (
            <button key={t || 'all'} type="button" className={'cs-chip' + (filters.type === t ? ' is-on' : '')} aria-pressed={filters.type === t} onClick={() => setFilters({ ...filters, type: t })}>
              {t || f(s.allLabel) || 'All'}
            </button>
          ))}
          <button type="button" className={'cs-chip' + (onlySaved ? ' is-on' : '')} aria-pressed={onlySaved} onClick={() => setOnlySaved(!onlySaved)}>
            <Heart size={14} filled={onlySaved} /> Saved ({saved.length})
          </button>
        </div>
        <div className="cs-selects">
          <select value={beds} onChange={(e) => setBeds(Number(e.target.value))} aria-label="Bedrooms">
            <option value={0}>Any beds</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+ beds
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="new">Newest</option>
            <option value="low">Price, low to high</option>
            <option value="high">Price, high to low</option>
          </select>
          {active ? (
            <button
              type="button"
              className="cs-clear"
              onClick={() => {
                setFilters({ q: '', type: '', max: 0 });
                setBeds(0);
                setOnlySaved(false);
              }}
            >
              Clear {filters.q && <>“{filters.q}”</>}
            </button>
          ) : null}
        </div>
      </div>
      <motion.div className="cs-grid" layout>
        <AnimatePresence mode="popLayout">
          {shown.map(({ h, i }, k) => (
            <HomeCard key={i} data={data} h={h} i={k} saved={saved.includes(String(h.name))} onSave={() => onSave(String(h.name))} onOpen={() => onOpen(i)} />
          ))}
        </AnimatePresence>
      </motion.div>
      {!shown.length && (
        <div className="cs-empty">
          <p>{f(s.empty)}</p>
          <a href="#valuation" className="cs-btn cs-btn-ghost">
            Talk to an agent
          </a>
        </div>
      )}
    </section>
  );
}

function HomeModal({ data, index, onClose, saved, onSave }: { data: XP; index: number | null; onClose: () => void; saved: string[]; onSave: (n: string) => void }) {
  const f = (t: unknown) => fill(t, data);
  const list = items(data.homes?.items);
  const h = index != null ? list[index] : null;
  const v: XP = data.viewing || {};
  const agents = items(data.agents?.items);
  const agent = index != null && agents.length ? agents[index % agents.length] : null;
  const cur = String(data.brand?.currency ?? '');
  const days = useMemo(() => nextDays(8, [0]), []);
  const [day, setDay] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tried, setTried] = useState(false);
  const { state, send, reset } = useSender(v.formAction);
  useEffect(() => {
    if (h) {
      reset();
      setTried(false);
      setDay('');
    }
  }, [index]);
  const isSaved = h ? saved.includes(String(h.name)) : false;
  return (
    <Modal open={!!h} onClose={onClose} label={h ? f(h.name) : 'Home'} className="cs-hm">
      {h && (
        <>
          <div className="cs-hm-img">
            {safeSrc(h.image) && <img src={safeSrc(h.image)} alt="" />}
            {h.status && <span className="cs-status">{f(h.status)}</span>}
          </div>
          <div className="cs-hm-body">
            <div className="cs-hm-top">
              <div>
                <p className="cs-home-area">
                  <Pin size={14} /> {f(h.area)} · {f(h.type)}
                </p>
                <h3 className="cs-display">{f(h.name)}</h3>
              </div>
              <span className="cs-display cs-hm-price">{money(Number(h.price) || 0, cur)}</span>
            </div>
            <p className="cs-specs cs-specs-lg">
              <span>
                <Bed size={18} /> {Number(h.beds) || 0} beds
              </span>
              <span>
                <Bath size={18} /> {Number(h.baths) || 0} baths
              </span>
              {h.size && (
                <span>
                  <Area size={18} /> {f(h.size)}
                </span>
              )}
            </p>
            <p className="cs-muted">{f(h.text)}</p>
            <button type="button" className={'cs-btn cs-btn-ghost cs-save-lg' + (isSaved ? ' is-on' : '')} onClick={() => onSave(String(h.name))}>
              <Heart size={16} filled={isSaved} /> {isSaved ? 'Saved' : 'Save'}
            </button>
            <div className="cs-viewing">
              {state === 'sent' ? (
                <div className="cs-done">
                  <span className="cs-done-icon">
                    <Check size={24} />
                  </span>
                  <p>
                    {f(v.done)
                      .replace(/\{person\}/g, name.split(' ')[0])
                      .replace(/\{agent\}/g, agent ? f(agent.name).split(' ')[0] : 'We')
                      .replace(/\{home\}/g, f(h.name))}
                  </p>
                </div>
              ) : (
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    setTried(true);
                    if (!day || !name.trim() || !phone.trim()) return;
                    send({ home: f(h.name), date: day, name, phone, agent: agent ? f(agent.name) : '' });
                  }}
                >
                  <h4 className="cs-display">{f(v.title)}</h4>
                  {agent && (
                    <p className="cs-agent-mini">
                      {safeSrc(agent.image) && <img src={safeSrc(agent.image)} alt="" />}
                      <span>
                        <b>{f(agent.name)}</b> {f(agent.role)}
                      </span>
                    </p>
                  )}
                  <div className="cs-days">
                    {days.map((d) => (
                      <button key={d.iso} type="button" className={'cs-chip' + (day === d.iso ? ' is-on' : '')} aria-pressed={day === d.iso} onClick={() => setDay(d.iso)}>
                        <small>{d.day}</small> {d.date}
                      </button>
                    ))}
                  </div>
                  {tried && !day && <p className="cs-err">Pick a day</p>}
                  <div className="cs-row">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" autoComplete="name" aria-invalid={tried && !name.trim()} />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" aria-label="Phone" autoComplete="tel" aria-invalid={tried && !phone.trim()} />
                  </div>
                  {state === 'error' && <p className="cs-err">That did not send. Please call us.</p>}
                  <button type="submit" className="cs-btn cs-btn-wide" disabled={state === 'sending'}>
                    {state === 'sending' ? 'Sending…' : f(v.button)} <ArrowRight size={18} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

function Slider({ label, value, min, max, step, onChange, show }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; show: string }) {
  return (
    <label className="cs-range">
      <span>
        {label} <b>{show}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ ['--p' as string]: `${((value - min) / (max - min)) * 100}%` }} />
    </label>
  );
}

function Mortgage({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const m: XP = data.mortgage || {};
  const cur = String(data.brand?.currency ?? '');
  const prices = items(data.homes?.items).map((h) => Number(h.price) || 0);
  const [price, setPrice] = useState(() => Math.round((prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 800000) / 10000) * 10000);
  const [dep, setDep] = useState(20);
  const [rate, setRate] = useState(Number(m.rate) || 5);
  const [years, setYears] = useState(25);
  const loan = price * (1 - dep / 100);
  const r = rate / 100 / 12;
  const n = years * 12;
  const monthly = r ? (loan * r) / (1 - Math.pow(1 + r, -n)) : loan / n;
  const interest = monthly * n - loan;
  const share = clamp(loan / (loan + interest || 1));
  const shown = useSpring(useMotionValue(monthly), { stiffness: 120, damping: 20 });
  const [text, setText] = useState(money(monthly, cur));
  useEffect(() => shown.set(monthly), [monthly]);
  useEffect(() => shown.on('change', (v) => setText(money(v, cur))), [shown, cur]);
  return (
    <section className="cs-section" id="mortgage">
      <div className="cs-mort">
        <div className="cs-mort-inputs">
          {m.kicker && <p className="cs-kicker">{f(m.kicker)}</p>}
          <h2 className="cs-display cs-h2">
            <Words text={f(m.title)} />
          </h2>
          <Slider label={f(m.priceLabel)} value={price} min={100000} max={5000000} step={10000} onChange={setPrice} show={money(price, cur)} />
          <Slider label={f(m.depositLabel)} value={dep} min={5} max={60} step={1} onChange={setDep} show={`${dep}% · ${money(price * (dep / 100), cur, true)}`} />
          <Slider label={f(m.rateLabel)} value={rate} min={0.5} max={12} step={0.1} onChange={setRate} show={`${rate.toFixed(1)}%`} />
          <Slider label={f(m.yearsLabel)} value={years} min={5} max={40} step={1} onChange={setYears} show={String(years)} />
        </div>
        <div className="cs-mort-out" aria-live="polite">
          <div className="cs-donut" style={{ ['--a' as string]: `${share * 360}deg` }}>
            <div>
              <span className="cs-display">{text}</span>
              <small>{f(m.resultLabel)}</small>
            </div>
          </div>
          <dl>
            <div>
              <dt>
                <i className="is-loan" /> Loan
              </dt>
              <dd>{money(loan, cur)}</dd>
            </div>
            <div>
              <dt>
                <i /> Interest
              </dt>
              <dd>{money(interest, cur)}</dd>
            </div>
          </dl>
          {m.note && <p className="cs-note">{f(m.note)}</p>}
        </div>
      </div>
    </section>
  );
}

function Areas({ data, onPick }: { data: XP; onPick: (q: string) => void }) {
  const f = (t: unknown) => fill(t, data);
  const a: XP = data.areas || {};
  const list = items(a.items);
  const [hover, setHover] = useState<number | null>(null);
  const x = useSpring(0, { stiffness: 250, damping: 28 });
  const y = useSpring(0, { stiffness: 250, damping: 28 });
  const preview = data.motion?.areaPreview !== false;
  if (!list.length) return null;
  return (
    <section
      className="cs-section cs-areas"
      id="areas"
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        x.set(e.clientX);
        y.set(e.clientY);
      }}
    >
      {a.kicker && <p className="cs-kicker">{f(a.kicker)}</p>}
      <h2 className="cs-display cs-h2">
        <Words text={f(a.title)} />
      </h2>
      <ul className="cs-area-list" onMouseLeave={() => setHover(null)}>
        {list.map((r, i) => (
          <li key={i}>
            <button type="button" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => onPick(f(r.name))}>
              {safeSrc(r.image) && <img className="cs-area-thumb" src={safeSrc(r.image)} alt="" loading="lazy" />}
              <span className="cs-display cs-area-name">{f(r.name)}</span>
              <span className="cs-area-text">{f(r.text)}</span>
              <span className="cs-area-stat">{f(r.stat)}</span>
              <ArrowUpRight size={20} />
            </button>
          </li>
        ))}
      </ul>
      {preview && (
        <motion.div className="cs-area-float" style={{ x, y }} aria-hidden="true">
          <AnimatePresence>
            {hover != null && safeSrc(list[hover]?.image) && (
              <motion.img key={hover} src={safeSrc(list[hover].image)} alt="" initial={{ opacity: 0, scale: 0.8, rotate: -4 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.35, ease: EASE }} />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}

function Sell({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const s: XP = data.sell || {};
  const steps = items(s.steps);
  return (
    <section className="cs-section cs-sell" id="sell">
      <div className="cs-sell-img">
        {safeSrc(s.image) && <img src={safeSrc(s.image)} alt="" loading="lazy" />}
        {s.stat && (
          <Reveal className="cs-sell-stat">
            <span className="cs-display">{f(s.stat)}</span>
            {f(s.statLabel)}
          </Reveal>
        )}
      </div>
      <div>
        {s.kicker && <p className="cs-kicker">{f(s.kicker)}</p>}
        <h2 className="cs-display cs-h2">
          <Words text={f(s.title)} />
        </h2>
        <ol className="cs-steps">
          {steps.map((st, i) => (
            <Reveal as="li" key={i} delay={i * 0.08}>
              <span className="cs-step-no cs-display">{i + 1}</span>
              <div>
                <h3>{f(st.title)}</h3>
                <p>{f(st.text)}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        <a href="#valuation" className="cs-btn">
          {f(data.nav?.cta)} <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}

function Agents({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const a: XP = data.agents || {};
  const list = items(a.items);
  if (!list.length) return null;
  return (
    <section className="cs-section" id="agents">
      {a.kicker && <p className="cs-kicker">{f(a.kicker)}</p>}
      <h2 className="cs-display cs-h2">
        <Words text={f(a.title)} />
      </h2>
      <div className="cs-agents">
        {list.map((p, i) => (
          <Reveal key={i} delay={i * 0.1} className="cs-agent">
            <div className="cs-agent-img">{safeSrc(p.image) && <img src={safeSrc(p.image)} alt={f(p.name)} loading="lazy" />}</div>
            <div>
              <h3 className="cs-display">{f(p.name)}</h3>
              <p className="cs-muted">{f(p.role)}</p>
              <div className="cs-agent-links">
                {p.phone && (
                  <a href={`tel:${String(p.phone).replace(/[^\d+]/g, '')}`}>
                    <Phone size={16} /> {f(p.phone)}
                  </a>
                )}
                {p.email && (
                  <a href={`mailto:${f(p.email)}`}>
                    <Mail size={16} /> {f(p.email)}
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Valuation({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const v: XP = data.valuation || {};
  const [addr, setAddr] = useState('');
  const [beds, setBeds] = useState('3');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const { state, send } = useSender(v.formAction);
  const okEmail = /^\S+@\S+\.\S+$/.test(email);
  return (
    <section className="cs-val" id="valuation">
      <div className="cs-val-copy">
        {v.kicker && <p className="cs-kicker">{f(v.kicker)}</p>}
        <h2 className="cs-display cs-h2">
          <Words text={f(v.title)} />
        </h2>
        {v.text && <p>{f(v.text)}</p>}
      </div>
      <AnimatePresence mode="wait">
        {state === 'sent' ? (
          <motion.div key="done" className="cs-val-done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="cs-done-icon">
              <Check size={26} />
            </span>
            <p>{f(v.done).replace(/\{person\}/g, name.split(' ')[0])}</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="cs-val-form"
            noValidate
            exit={{ opacity: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              setTried(true);
              if (!addr.trim() || !name.trim() || !okEmail) return;
              send({ address: addr, bedrooms: beds, name, email });
            }}
          >
            <input className="cs-val-wide" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Property address" aria-label="Property address" aria-invalid={tried && !addr.trim()} />
            <select value={beds} onChange={(e) => setBeds(e.target.value)} aria-label={f(v.bedsLabel)}>
              {['1', '2', '3', '4', '5', '6+'].map((b) => (
                <option key={b} value={b}>
                  {b} {f(v.bedsLabel).toLowerCase() || 'bedrooms'}
                </option>
              ))}
            </select>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" autoComplete="name" aria-invalid={tried && !name.trim()} />
            <input className="cs-val-wide" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" autoComplete="email" aria-invalid={tried && !okEmail} />
            {tried && (!addr.trim() || !name.trim() || !okEmail) && <p className="cs-err cs-val-wide">Add the address, your name and a valid email.</p>}
            {state === 'error' && <p className="cs-err cs-val-wide">That did not send. Please try again.</p>}
            <button type="submit" className="cs-btn cs-val-wide" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : f(v.button)} <ArrowRight size={18} />
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}

function Footer({ data }: { data: XP }) {
  const f = (t: unknown) => fill(t, data);
  const b: XP = data.brand || {};
  return (
    <footer className="cs-footer">
      <div className="cs-footer-top">
        <div>
          <p className="cs-display cs-footer-name">{f(b.name)}</p>
          <p>{f(data.footer?.text)}</p>
        </div>
        <ul>
          {b.address && (
            <li>
              <Pin size={16} /> {f(b.address)}
            </li>
          )}
          {b.phone && (
            <li>
              <Phone size={16} /> <a href={`tel:${String(b.phone).replace(/[^\d+]/g, '')}`}>{f(b.phone)}</a>
            </li>
          )}
          {b.email && (
            <li>
              <Mail size={16} /> <a href={`mailto:${f(b.email)}`}>{f(b.email)}</a>
            </li>
          )}
        </ul>
        <nav aria-label="Footer">
          {items(data.nav?.links).map((l, i) => (
            <a key={i} href={safeHref(l.href) || '#top'}>
              {f(l.label)}
            </a>
          ))}
        </nav>
      </div>
      <p className="cs-legal">{f(data.footer?.legal)}</p>
    </footer>
  );
}
