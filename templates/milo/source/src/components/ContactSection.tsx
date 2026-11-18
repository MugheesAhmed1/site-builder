import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Copy, X } from '../icons';
import { FormEvent, useEffect, useState } from 'react';
import { servicesOf, socialsOf } from '../data/portfolioData';
import { fill, lines, safeHref, useXP } from '../xp';
import { useReducedMotionPreference } from '../hooks/usePortfolioHooks';
import { MOTION_EASE } from '../utils/webgl';
import { MagneticButton } from './MagneticButton';
import { RevealText } from './RevealText';
import { SectionLabel } from './SectionLabel';

interface ContactSectionProps {
  inquiryContext: string | null;
  onClearInquiryContext: () => void;
}

export function ContactSection({
  inquiryContext,
  onClearInquiryContext,
}: ContactSectionProps) {
  const data = useXP();
  const c = data.contact || {};
  const SERVICES = servicesOf(data);
  const SOCIAL_LINKS = socialsOf(data);
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.brand?.email || '').trim()) ? String(data.brand.email).trim() : '';
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>(() => SERVICES[0]?.title || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [brief, setBrief] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const reducedMotion = useReducedMotionPreference();

  useEffect(() => {
    if (inquiryContext) {
      const matched = SERVICES.find((s) => s.title === inquiryContext);
      if (matched) {
        setSelectedDiscipline(matched.title);
      } else {
        setBrief(`Interested in exploring: ${inquiryContext}`);
      }
      setSubmitted(false);
      setModalOpen(true);
      onClearInquiryContext();
    }
  }, [inquiryContext, onClearInquiryContext]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [modalOpen]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setError('');
    const action = safeHref(c.formAction);
    try {
      if (action.startsWith('https:')) {
        const body = new FormData();
        body.append('name', name);
        body.append('email', email);
        body.append('discipline', selectedDiscipline);
        body.append('message', brief);
        const res = await fetch(action, { method: 'POST', body, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
      } else if (EMAIL) {
        const subject = encodeURIComponent(`${selectedDiscipline || fill(c.formTitle, data)} — ${name}`);
        window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${encodeURIComponent(`${brief}\n\n${name} <${email}>`)}`;
      }
      setSubmitted(true);
    } catch {
      setError(fill(c.error, data) || 'The message could not be sent.');
    }
  };

  return (
    <>
      <section
        id="contact"
        className="relative z-30 min-h-[100svh] w-full px-6 sm:px-12 lg:px-20 pt-28 sm:pt-36 pb-20 flex flex-col justify-between"
        style={{
          background:
            'linear-gradient(180deg, var(--c-page) 0%, color-mix(in srgb, var(--c-page) 50%, var(--c-deep)) 42%, var(--c-deep) 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] opacity-70"
          style={{
            background:
              'radial-gradient(ellipse 75% 65% at 50% 100%, color-mix(in srgb, var(--c-accent) 16%, transparent) 0%, color-mix(in srgb, var(--c-accent2) 6%, transparent) 48%, transparent 100%)',
          }}
        />

        <div className="relative z-10 w-full max-w-[1440px] mx-auto my-auto">
          <SectionLabel className="text-[var(--c-text)]/55 mb-8">
            {fill(c.label, data)}
          </SectionLabel>

          <RevealText>
            <h2 className="editorial-heading text-[clamp(3.6rem,11.5vw,10.5rem)] leading-[0.86] tracking-[-0.055em]">
              {lines(c.title, data).map((l, i, all) => (
                <span key={i} className={i === all.length - 1 ? 'block text-[var(--c-accent)]' : 'block text-[var(--c-text)]'}>{l}</span>
              ))}
            </h2>
          </RevealText>

          <div className="mt-12 sm:mt-16">
            <MagneticButton
              onClick={() => {
                setSubmitted(false);
                setModalOpen(true);
              }}
              cursorLabel="OPEN"
              className="group w-full md:w-[280px] h-[72px] md:h-[90px] rounded-full border border-[var(--c-text)]/40 bg-[var(--c-accent)]/[0.08] hover:bg-[var(--c-accent)] text-[var(--c-text)] hover:text-[var(--c-page)] hover:border-[var(--c-accent)] hover:scale-[1.03] transition-all duration-[350ms] ease-out inline-flex items-center justify-center gap-4 px-8 text-xs sm:text-sm font-bold uppercase tracking-[0.18em]"
            >
              <span>{fill(c.button, data)}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-[350ms] ease-out group-hover:translate-x-2" />
            </MagneticButton>
          </div>

          <div className="mt-16 sm:mt-20 pt-10 border-t border-[var(--c-text)]/14 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {EMAIL ? <div className="flex items-center gap-4">
              <a
                href={`mailto:${EMAIL}`}
                data-cursor="OPEN"
                className="text-base sm:text-xl font-medium tracking-tight text-[var(--c-text)] hover:text-[var(--c-accent)] transition-colors"
              >
                {EMAIL}
              </a>
              <button
                type="button"
                onClick={handleCopyEmail}
                aria-label="Copy email address"
                data-cursor="OPEN"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--c-text)]/50 hover:text-[var(--c-accent)] transition-colors py-1 px-2"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--c-accent)]" />
                    <span className="text-[var(--c-accent)]">{fill(c.copied, data)}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{fill(c.copy, data)}</span>
                  </>
                )}
              </button>
            </div> : <span />}

            <div className="flex flex-wrap items-center gap-6 sm:gap-8">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label + social.href}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="OPEN"
                  className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em] text-[var(--c-text)]/55 hover:text-[var(--c-text)] transition-opacity duration-200"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={fill(c.formTitle, data)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: MOTION_EASE }}
            className="fixed inset-0 z-[170] bg-[var(--c-page)]/92 flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
          >
            <motion.div
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.35, ease: MOTION_EASE }}
              className="w-full max-w-[640px] rounded-[32px] border border-[var(--c-text)]/15 bg-[var(--c-surface)] p-6 sm:p-10 text-[var(--c-text)]"
            >
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-[var(--c-text)]/12">
                <div>
                  <SectionLabel className="text-[var(--c-accent)]">{fill(c.formKicker, data)}</SectionLabel>
                  <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-[-0.04em]">
                    {fill(c.formTitle, data)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close project inquiry"
                  className="p-2.5 rounded-full border border-[var(--c-text)]/15 text-[var(--c-text)]/75 hover:text-[var(--c-accent)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {submitted ? (
                <div className="py-10 flex flex-col gap-5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-accent)]">
                    {fill(c.thanksKicker, data)}
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {fill(c.thanksTitle, data)}
                  </h4>
                  <p className="text-sm sm:text-base text-[var(--c-text)]/65 leading-[1.6]">
                    {fill(c.thanksText, data)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="mt-4 self-start rounded-full border border-[var(--c-text)]/25 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-[var(--c-text)] hover:text-[var(--c-page)] transition-colors"
                  >
                    {fill(c.back, data)}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="pt-6 flex flex-col gap-6">
                  <div>
                    <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--c-text)]/50 mb-3">
                      {fill(c.disciplineLabel, data)}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {SERVICES.map((s) => {
                        const active = selectedDiscipline === s.title;
                        return (
                          <button
                            key={s.number + s.title}
                            type="button"
                            onClick={() => setSelectedDiscipline(s.title)}
                            className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] border transition-colors ${
                              active
                                ? 'bg-[var(--c-accent)] text-[var(--c-page)] border-[var(--c-accent)]'
                                : 'bg-transparent text-[var(--c-text)]/70 border-[var(--c-text)]/18 hover:border-[var(--c-text)]/40'
                            }`}
                          >
                            {s.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="inquiry-name"
                        className="block text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--c-text)]/50 mb-2"
                      >
                        {fill(c.nameLabel, data)}
                      </label>
                      <input
                        id="inquiry-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={fill(c.namePlaceholder, data)}
                        className="w-full rounded-xl border border-[var(--c-text)]/15 bg-[var(--c-page)]/60 px-4 py-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text)]/30 focus:border-[var(--c-accent)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="inquiry-email"
                        className="block text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--c-text)]/50 mb-2"
                      >
                        {fill(c.emailLabel, data)}
                      </label>
                      <input
                        id="inquiry-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={fill(c.emailPlaceholder, data)}
                        className="w-full rounded-xl border border-[var(--c-text)]/15 bg-[var(--c-page)]/60 px-4 py-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text)]/30 focus:border-[var(--c-accent)] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="inquiry-brief"
                      className="block text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--c-text)]/50 mb-2"
                    >
                      {fill(c.briefLabel, data)}
                    </label>
                    <textarea
                      id="inquiry-brief"
                      rows={4}
                      value={brief}
                      onChange={(e) => setBrief(e.target.value)}
                      placeholder={fill(c.briefPlaceholder, data)}
                      className="w-full rounded-xl border border-[var(--c-text)]/15 bg-[var(--c-page)]/60 px-4 py-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text)]/30 focus:border-[var(--c-accent)] focus:outline-none resize-none"
                    />
                  </div>

                  {error && <p role="alert" className="text-sm text-[var(--c-accent)]">{error}</p>}
                  <button
                    type="submit"
                    className="group w-full sm:w-auto self-end inline-flex items-center justify-center gap-3 rounded-full bg-[var(--c-accent)] text-[var(--c-page)] px-8 py-4 text-xs font-bold uppercase tracking-[0.18em] hover:bg-[var(--c-highlight)] transition-colors"
                  >
                    <span>{fill(c.send, data)}</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
