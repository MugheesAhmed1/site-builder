import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from './valley/AudioEngine';
import { ValleyEngine } from './valley/ValleyEngine';
import { applyTheme, fill, safeHref, useContent, type XP } from './xp';

type SectionKey = 'work' | 'about' | 'journal' | 'contact' | null;

const SECTIONS: Exclude<SectionKey, null>[] = ['work', 'about', 'journal', 'contact'];

function Linked({ href, children }: { href?: string; children: React.ReactNode }) {
  const h = safeHref(href);
  return h ? (
    <a href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="sheet-link">
      {children}
    </a>
  ) : (
    <>{children}</>
  );
}

export default function App() {
  const data = useContent();
  const f = (t: unknown) => fill(t, data);
  const on = (k: Exclude<SectionKey, null>) => data.sections?.[k] !== false;

  const valleyRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ValleyEngine | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [introShown, setIntroShown] = useState(false);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>(null);

  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryNote, setInquiryNote] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    applyTheme(data.theme);
    document.title = f(data.seo?.title || data.brand?.name);
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', f(data.seo?.description));
  });

  // The valley and its sound are rebuilt only when their own settings change.
  const valleyKey = useMemo(() => JSON.stringify([data.valley, data.sound]), [data.valley, data.sound]);

  useEffect(() => {
    const container = valleyRef.current;
    if (!container) return;

    const audio = new AudioEngine(data.sound || {});
    audio.initAudio();
    audioRef.current = audio;
    setSoundPlaying(false);

    let shown = false;
    const engine = new ValleyEngine(
      container,
      () => setLoaded(true),
      () => {
        if (!shown) {
          shown = true;
          setIntroShown(true);
        }
      },
      audio,
      data.valley || {}
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      audio.dispose();
      engineRef.current = null;
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valleyKey]);

  useEffect(() => {
    if (!activeSection) {
      engineRef.current?.stopHoverTransition();
      return;
    }
    engineRef.current?.startHoverTransition();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveSection(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSection]);

  // A section switched off in the builder closes if it is open.
  useEffect(() => {
    if (activeSection && !on(activeSection)) setActiveSection(null);
  });

  const handleToggleSound = () => {
    const audio = audioRef.current;
    if (!audio || !audio.isInitialized) return;
    const muted = audio.toggleMute();
    setSoundPlaying(!muted);
  };

  const openSection = (section: SectionKey, e?: React.MouseEvent) => {
    e?.preventDefault();
    setInquirySent(false);
    setSendError('');
    setActiveSection((prev) => (prev === section ? null : section));
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryEmail.trim()) return;
    const c = data.contact || {};
    const action = safeHref(c.formAction);
    setSendError('');
    try {
      if (action.startsWith('https:')) {
        const body = new FormData();
        body.append('name', inquiryName);
        body.append('email', inquiryEmail);
        body.append('message', inquiryNote);
        const res = await fetch(action, { method: 'POST', body, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email || ''))) {
        const subject = encodeURIComponent(`${f(c.label || 'Enquiry')} — ${inquiryName}`);
        const body = encodeURIComponent(`${inquiryNote}\n\n${inquiryName} <${inquiryEmail}>`);
        window.location.href = `mailto:${c.email}?subject=${subject}&body=${body}`;
      }
      setInquirySent(true);
      setInquiryName('');
      setInquiryEmail('');
      setInquiryNote('');
    } catch {
      setSendError('The message could not be sent. Please try again.');
    }
  };

  const nav = data.nav || {};
  const hero = data.hero || {};
  const work = data.work || {};
  const about = data.about || {};
  const journal = data.journal || {};
  const contact = data.contact || {};
  const opens: SectionKey = SECTIONS.includes(hero.opens) && on(hero.opens) ? hero.opens : SECTIONS.find(on) || null;

  return (
    <>
      <div id="valley" ref={valleyRef} aria-hidden="true">
        <div className="js-canvas-container" />
      </div>

      <div className={`ui ${introShown ? 'on' : ''}`} id="ui">
        <header>
          <a
            className="logo"
            href="#top"
            aria-label={f(data.brand?.name)}
            onClick={(e) => {
              e.preventDefault();
              setActiveSection(null);
            }}
          >
            {f(data.brand?.name)}
          </a>
          <nav aria-label="Main">
            {on('work') && (
              <a href="#work" onClick={(e) => openSection('work', e)}>
                {f(nav.work)}
              </a>
            )}
            {on('about') && (
              <a href="#about" onClick={(e) => openSection('about', e)}>
                {f(nav.about)}
              </a>
            )}
            {on('journal') && (
              <a href="#journal" onClick={(e) => openSection('journal', e)}>
                {f(nav.journal)}
              </a>
            )}
            {on('contact') && (
              <a className="pill" href="#contact" onClick={(e) => openSection('contact', e)}>
                {f(nav.cta)}
              </a>
            )}
          </nav>
        </header>

        <section className={`hero ${activeSection ? 'dimmed' : ''}`}>
          <h1>{f(hero.title)}</h1>
          <p className="cap">
            {f(hero.caption1)}
            {hero.caption2 ? <br /> : null}
            {f(hero.caption2)}
          </p>
          {opens && (
            <a
              className="go"
              href={`#${opens}`}
              id="go"
              aria-label={f(hero.button)}
              onPointerEnter={() => {
                if (!activeSection) engineRef.current?.startHoverTransition();
              }}
              onPointerLeave={() => {
                if (!activeSection) engineRef.current?.stopHoverTransition();
              }}
              onClick={(e) => openSection(opens, e)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M4 12h16M14 6l6 6-6 6" />
              </svg>
            </a>
          )}
        </section>

        {activeSection && (
          <div
            className="sheet-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={activeSection}
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveSection(null);
            }}
          >
            <div className="sheet-panel">
              <div className="sheet-head">
                <span className="sheet-kicker">
                  {activeSection === 'work' && f(work.label)}
                  {activeSection === 'about' && f(about.label)}
                  {activeSection === 'journal' && f(journal.label)}
                  {activeSection === 'contact' && f(contact.label)}
                </span>
                <button type="button" onClick={() => setActiveSection(null)} className="sheet-close">
                  {f(nav.close || 'Close')}
                </button>
              </div>

              {activeSection === 'work' && (
                <div className="sheet-list">
                  {(work.items || []).map((item: XP, i: number) => (
                    <article key={i} className="sheet-item">
                      <div className="sheet-row">
                        <h2 className="sheet-title">
                          <Linked href={item.link}>{f(item.title)}</Linked>
                        </h2>
                        <span className="sheet-meta">
                          {[item.discipline, item.year].filter(Boolean).map(f).join(' · ')}
                        </span>
                      </div>
                      <p className="sheet-text">{f(item.summary)}</p>
                    </article>
                  ))}
                </div>
              )}

              {activeSection === 'about' && (
                <div className="sheet-stack">
                  <h2 className="sheet-big">{f(about.title)}</h2>
                  <p className="sheet-text">{f(about.text)}</p>
                  {(about.facts || []).length > 0 && (
                    <div className="sheet-facts">
                      {(about.facts || []).map((x: XP, i: number) => (
                        <div key={i}>
                          <div className="sheet-fact-label">{f(x.label)}</div>
                          <div>{f(x.value)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'journal' && (
                <div className="sheet-list">
                  {(journal.entries || []).map((entry: XP, i: number) => (
                    <article key={i} className="sheet-item">
                      <div className="sheet-date">{f(entry.date)}</div>
                      <h2 className="sheet-title">
                        <Linked href={entry.link}>{f(entry.title)}</Linked>
                      </h2>
                      <p className="sheet-text">{f(entry.excerpt)}</p>
                    </article>
                  ))}
                </div>
              )}

              {activeSection === 'contact' && (
                <div>
                  {inquirySent ? (
                    <div className="sheet-thanks">
                      <h2 className="sheet-mid">{f(contact.thanksTitle)}</h2>
                      <p className="sheet-text">{f(contact.thanksText)}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitInquiry} className="sheet-form">
                      <div className="sheet-two">
                        <label className="sheet-label">
                          {f(contact.nameLabel)}
                          <input type="text" required value={inquiryName} onChange={(e) => setInquiryName(e.target.value)} placeholder={f(contact.namePlaceholder)} />
                        </label>
                        <label className="sheet-label">
                          {f(contact.emailLabel)}
                          <input type="email" required value={inquiryEmail} onChange={(e) => setInquiryEmail(e.target.value)} placeholder={f(contact.emailPlaceholder)} />
                        </label>
                      </div>
                      <label className="sheet-label">
                        {f(contact.noteLabel)}
                        <textarea rows={3} value={inquiryNote} onChange={(e) => setInquiryNote(e.target.value)} placeholder={f(contact.notePlaceholder)} />
                      </label>
                      {sendError && <p className="sheet-error">{sendError}</p>}
                      <button type="submit" className="sheet-send">
                        {f(contact.button)}
                      </button>
                    </form>
                  )}
                </div>
              )}
              {/* Blocks added from the library show at the end of every drawer. */}
              <div data-xp-extras="" className="sheet-extras" />
            </div>
          </div>
        )}

        <div className="corner">
          <span>{f(hero.hint)}</span>
          {data.sound?.enabled !== false && hero.showSoundButton !== false && (
            <>
              <i />
              <button className="sound" id="sound" type="button" aria-pressed={soundPlaying} aria-label="Ambient sound" onClick={handleToggleSound}>
                <svg viewBox="0 0 24 24">
                  <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5Z" />
                  <path className="w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
                  <path className="x" d="m16 10 4 4m0-4-4 4" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`loader ${loaded ? 'gone' : ''}`} id="loader">
        <span />
      </div>
    </>
  );
}
