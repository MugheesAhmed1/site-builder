import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, Send, X } from '../icons';
import { fill, safeHref, useXP, type XP } from '../xp';

interface ContactModalProps {
  isOpen: boolean;
  initialProject?: string | null;
  onClose: () => void;
}


export function ContactModal({ isOpen, initialProject, onClose }: ContactModalProps) {
  const data = useXP();
  const f = (t: unknown) => fill(t, data);
  const c: XP = data.contact || {};
  const SERVICES: XP[] = data.services?.items || [];
  const DIRECT_EMAIL = String(c.email || '');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialProject) {
      setMessage(f(c.prefill).replace(/\{project\}/g, initialProject));
    }
  }, [initialProject]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(DIRECT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setError('');
    const action = safeHref(c.formAction);
    try {
      if (action.startsWith('https:')) {
        const body = new FormData();
        body.append('name', name);
        body.append('email', email);
        body.append('service', selectedService);
        body.append('message', message);
        const res = await fetch(action, { method: 'POST', body, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(DIRECT_EMAIL)) {
        const subject = encodeURIComponent(`${selectedService || f(c.title)} — ${name}`);
        window.location.href = `mailto:${DIRECT_EMAIL}?subject=${subject}&body=${encodeURIComponent(`${message}\n\n${name} <${email}>`)}`;
      }
      setSubmitted(true);
    } catch {
      setError(f(c.error) || 'The message could not be sent.');
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    setMessage('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={f(c.title)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6"
          onClick={handleResetAndClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl rounded-[32px] sm:rounded-[44px] border-2 border-[var(--c-text)]/80 bg-[var(--c-page)] text-[var(--c-text)] p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--c-text)]/60 mb-1">
                  {f(c.kicker)}
                </p>
                <h3 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight">
                  {f(c.title)}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleResetAndClose}
                aria-label="Close"
                className="w-11 h-11 rounded-full border border-[var(--c-text)]/40 flex items-center justify-center text-[var(--c-text)] hover:bg-[var(--c-text)]/10 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitted ? (
              <div className="py-10 text-center flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-[var(--c-text)] flex items-center justify-center">
                  <Check className="w-7 h-7 text-[var(--c-text)]" />
                </div>
                <h4 className="text-xl font-medium uppercase tracking-wide">
                  {f(c.thanksTitle)}
                </h4>
                <p className="text-sm text-[var(--c-text)]/75 max-w-sm font-light leading-relaxed">
                  {f(c.thanksText).replace(/\{visitor\}/g, name).replace(/\{service\}/g, selectedService.toLowerCase()).replace(/\{email\}/g, email)}
                </p>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="mt-2 rounded-full border-2 border-[var(--c-text)] text-[var(--c-text)] font-medium uppercase tracking-widest px-8 py-3 text-xs sm:text-sm hover:bg-[var(--c-text)]/10 transition-colors cursor-pointer"
                >
                  {f(c.done)}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-[var(--c-text)]/70">
                    {f(c.nameLabel)}
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={f(c.namePlaceholder)}
                      className="w-full rounded-2xl border border-[var(--c-text)]/25 bg-[var(--c-surface)] px-4 py-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text)]/35 focus:outline-none focus:border-[var(--c-text)]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-[var(--c-text)]/70">
                    {f(c.emailLabel)}
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={f(c.emailPlaceholder)}
                      className="w-full rounded-2xl border border-[var(--c-text)]/25 bg-[var(--c-surface)] px-4 py-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text)]/35 focus:outline-none focus:border-[var(--c-text)]"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-[var(--c-text)]/70">
                    {f(c.serviceLabel)}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map((svc) => (
                      <button
                        key={svc.number + svc.name}
                        type="button"
                        onClick={() => setSelectedService(f(svc.name))}
                        className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider border transition-colors cursor-pointer whitespace-nowrap ${
                          selectedService === f(svc.name)
                            ? 'bg-[var(--c-text)] text-[var(--c-page)] border-[var(--c-text)] font-medium'
                            : 'bg-transparent text-[var(--c-text)]/80 border-[var(--c-text)]/25 hover:border-[var(--c-text)]/60'
                        }`}
                      >
                        {f(svc.name)}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-[var(--c-text)]/70">
                  {f(c.briefLabel)}
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={f(c.briefPlaceholder)}
                    className="w-full rounded-2xl border border-[var(--c-text)]/25 bg-[var(--c-surface)] px-4 py-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text)]/35 focus:outline-none focus:border-[var(--c-text)] resize-none"
                  />
                </label>

                {error && <p className="text-xs text-[var(--c-grad2)]">{error}</p>}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  {DIRECT_EMAIL ? (
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--c-text)]/70 hover:text-[var(--c-text)] transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied {DIRECT_EMAIL}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{DIRECT_EMAIL}</span>
                      </>
                    )}
                  </button>
                  ) : (
                    <span />
                  )}

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-full text-[var(--c-buttonText)] font-medium uppercase tracking-widest px-8 py-3 text-xs sm:text-sm cursor-pointer transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
                    style={{
                      background:
                        'linear-gradient(123deg, var(--c-grad1) 7%, var(--c-grad2) 37%, var(--c-grad3) 72%, var(--c-grad4) 100%)',
                      boxShadow:
                        '0px 4px 4px color-mix(in srgb, var(--c-grad2) 25%, transparent), 4px 4px 12px var(--c-grad3) inset',
                      outline: '2px solid var(--c-buttonText)',
                      outlineOffset: '-3px',
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{f(c.button)}</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
