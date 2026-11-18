import React, { useEffect, useRef, useState } from 'react';
import { AudioEngine } from './valley/AudioEngine';
import { ValleyEngine } from './valley/ValleyEngine';

type SectionKey = 'work' | 'about' | 'journal' | 'talk' | null;

const WORK_ITEMS = [
  {
    title: 'Kauri Watershed Atlas',
    discipline: 'Ecological Mapping · Spatial Web',
    year: '2026',
    summary:
      'Interactive catchment telemetry and living forest restoration archive built for Aotearoa watershed stewards.',
  },
  {
    title: 'Mycelium Material Index',
    discipline: 'Design System · Tactile Archive',
    year: '2025',
    summary:
      'Open-source material library cataloging regenerative mycelium composites, lifecycle carbon data, and tactile acoustics.',
  },
  {
    title: 'Solstice Seed Commons',
    discipline: 'Brand Identity · Digital Platform',
    year: '2025',
    summary:
      'Community seed-saving network connecting regional botanical growers with heritage alpine and meadow cultivars.',
  },
];

const JOURNAL_ENTRIES = [
  {
    date: 'Autumn 2026',
    title: 'Software that ages like timber, not plastic',
    excerpt:
      'Notes on low-energy rendering, patient motion curves, and interfaces designed to stay legible for decades.',
  },
  {
    date: 'Winter 2026',
    title: 'Listening to nocturnal pollinators in coastal valleys',
    excerpt:
      'Field recordings and light-level studies informing our dark-first botanical visual language.',
  },
];

export default function App() {
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

  useEffect(() => {
    const container = valleyRef.current;
    if (!container) return;

    const audio = new AudioEngine();
    audio.initAudio();
    audioRef.current = audio;

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
      audio
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      audio.dispose();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!activeSection) {
      engineRef.current?.stopHoverTransition();
      return;
    }
    engineRef.current?.startHoverTransition();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSection(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSection]);

  const handleToggleSound = () => {
    const audio = audioRef.current;
    if (!audio || !audio.isInitialized) return;
    const muted = audio.toggleMute();
    setSoundPlaying(!muted);
  };

  const openSection = (section: SectionKey, e?: React.MouseEvent) => {
    e?.preventDefault();
    setInquirySent(false);
    setActiveSection((prev) => (prev === section ? null : section));
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryEmail.trim()) return;
    setInquirySent(true);
    setInquiryName('');
    setInquiryEmail('');
    setInquiryNote('');
  };

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
            aria-label="Fernhollow"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection(null);
            }}
          >
            Fernhollow
          </a>
          <nav aria-label="Main">
            <a href="#work" onClick={(e) => openSection('work', e)}>
              Work
            </a>
            <a href="#about" onClick={(e) => openSection('about', e)}>
              About
            </a>
            <a href="#journal" onClick={(e) => openSection('journal', e)}>
              Journal
            </a>
            <a className="pill" href="#talk" onClick={(e) => openSection('talk', e)}>
              Let’s talk
            </a>
          </nav>
        </header>

        <section className={`hero ${activeSection ? 'dimmed' : ''}`}>
          <h1>Grown, not built.</h1>
          <p className="cap">
            Rooted in nature.
            <br />
            Built for what’s next.
          </p>
          <a
            className="go"
            href="#work"
            id="go"
            aria-label="See our work"
            onPointerEnter={() => {
              if (!activeSection) engineRef.current?.startHoverTransition();
            }}
            onPointerLeave={() => {
              if (!activeSection) engineRef.current?.stopHoverTransition();
            }}
            onClick={(e) => openSection('work', e)}
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 12h16M14 6l6 6-6 6" />
            </svg>
          </a>
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
              <div className="flex items-center justify-between gap-6 border-b border-[#f5efe2]/15 pb-5 mb-7">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#f5efe2]/70">
                  {activeSection === 'work' && 'Selected Work'}
                  {activeSection === 'about' && 'About Fernhollow'}
                  {activeSection === 'journal' && 'Field Journal'}
                  {activeSection === 'talk' && 'Start a Conversation'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSection(null)}
                  className="text-xs font-medium uppercase tracking-[0.16em] text-[#f5efe2]/80 hover:text-[#f5efe2] transition-opacity px-3 py-1.5 border border-[#f5efe2]/25 rounded-full"
                >
                  Close
                </button>
              </div>

              {activeSection === 'work' && (
                <div className="space-y-6">
                  {WORK_ITEMS.map((item) => (
                    <article
                      key={item.title}
                      className="border-b border-[#f5efe2]/10 pb-5 last:border-b-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
                        <h2
                          className="text-2xl tracking-tight text-[#f5efe2]"
                          style={{ fontFamily: 'Antonio, sans-serif' }}
                        >
                          {item.title}
                        </h2>
                        <span className="text-xs text-[#f5efe2]/60 tabular-nums">
                          {item.discipline} · {item.year}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-[#f5efe2]/80">
                        {item.summary}
                      </p>
                    </article>
                  ))}
                </div>
              )}

              {activeSection === 'about' && (
                <div className="space-y-5">
                  <h2
                    className="text-4xl leading-none text-[#f5efe2]"
                    style={{ fontFamily: 'Antonio, sans-serif' }}
                  >
                    Regenerative craft for living digital ecosystems.
                  </h2>
                  <p className="text-sm leading-relaxed text-[#f5efe2]/80">
                    Fernhollow is an independent regenerative design studio partnering with
                    ecological research initiatives, climate pioneers, and cultural
                    institutions. We treat every digital space like a cultivated habitat—lightweight,
                    adaptive, and attuned to natural rhythms.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-[#f5efe2]/15 text-xs text-[#f5efe2]/75">
                    <div>
                      <div className="uppercase tracking-[0.16em] text-[#f5efe2]/50 mb-1">
                        Practice
                      </div>
                      <div>Spatial Web &amp; Ecological Systems</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.16em] text-[#f5efe2]/50 mb-1">
                        Ethos
                      </div>
                      <div>Low-carbon, open botanical data</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.16em] text-[#f5efe2]/50 mb-1">
                        Studio
                      </div>
                      <div>Tāmaki Makaurau · Remote</div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'journal' && (
                <div className="space-y-6">
                  {JOURNAL_ENTRIES.map((entry) => (
                    <article
                      key={entry.title}
                      className="border-b border-[#f5efe2]/10 pb-5 last:border-b-0 last:pb-0"
                    >
                      <div className="text-xs uppercase tracking-[0.16em] text-[#f5efe2]/55 mb-1.5">
                        {entry.date}
                      </div>
                      <h2
                        className="text-2xl text-[#f5efe2] mb-2"
                        style={{ fontFamily: 'Antonio, sans-serif' }}
                      >
                        {entry.title}
                      </h2>
                      <p className="text-sm leading-relaxed text-[#f5efe2]/80">
                        {entry.excerpt}
                      </p>
                    </article>
                  ))}
                </div>
              )}

              {activeSection === 'talk' && (
                <div>
                  {inquirySent ? (
                    <div className="py-6 space-y-3">
                      <h2
                        className="text-3xl text-[#f5efe2]"
                        style={{ fontFamily: 'Antonio, sans-serif' }}
                      >
                        Note received.
                      </h2>
                      <p className="text-sm text-[#f5efe2]/80">
                        Thank you for reaching out to Fernhollow. We will reply within two
                        working days.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitInquiry} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block text-xs uppercase tracking-[0.14em] text-[#f5efe2]/70">
                          Name
                          <input
                            type="text"
                            required
                            value={inquiryName}
                            onChange={(e) => setInquiryName(e.target.value)}
                            placeholder="Your name"
                            className="mt-2 w-full bg-transparent border border-[#f5efe2]/25 px-3.5 py-2.5 text-sm text-[#f5efe2] placeholder:text-[#f5efe2]/35 focus:outline-none focus:border-[#f5efe2]"
                          />
                        </label>
                        <label className="block text-xs uppercase tracking-[0.14em] text-[#f5efe2]/70">
                          Email
                          <input
                            type="email"
                            required
                            value={inquiryEmail}
                            onChange={(e) => setInquiryEmail(e.target.value)}
                            placeholder="you@domain.com"
                            className="mt-2 w-full bg-transparent border border-[#f5efe2]/25 px-3.5 py-2.5 text-sm text-[#f5efe2] placeholder:text-[#f5efe2]/35 focus:outline-none focus:border-[#f5efe2]"
                          />
                        </label>
                      </div>
                      <label className="block text-xs uppercase tracking-[0.14em] text-[#f5efe2]/70">
                        Project Note
                        <textarea
                          rows={3}
                          value={inquiryNote}
                          onChange={(e) => setInquiryNote(e.target.value)}
                          placeholder="Tell us what you are growing..."
                          className="mt-2 w-full bg-transparent border border-[#f5efe2]/25 px-3.5 py-2.5 text-sm text-[#f5efe2] placeholder:text-[#f5efe2]/35 focus:outline-none focus:border-[#f5efe2]"
                        />
                      </label>
                      <button
                        type="submit"
                        className="inline-flex items-center px-6 py-2.5 rounded-full bg-[#f5efe2] text-[#151510] text-xs font-medium uppercase tracking-[0.16em] hover:opacity-90 transition-opacity"
                      >
                        Send message
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="corner">
          <span>Scroll to wander</span>
          <i />
          <button
            className="sound"
            id="sound"
            type="button"
            aria-pressed={soundPlaying}
            aria-label="Ambient sound"
            onClick={handleToggleSound}
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5Z" />
              <path className="w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
              <path className="x" d="m16 10 4 4m0-4-4 4" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`loader ${loaded ? 'gone' : ''}`} id="loader">
        <span />
      </div>
    </>
  );
}
