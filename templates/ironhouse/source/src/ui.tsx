// Small building parts this template uses: reveals, counters, a modal and a form sender.
// Plain React + motion, no other libraries.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { safeHref, type XP } from './xp';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({ children, delay = 0, y = 28, className, as = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'li' | 'section' | 'article' }) {
  const M = motion[as] as typeof motion.div;
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -12% 0px' }} transition={{ duration: 0.8, delay, ease: EASE }}>
      {children}
    </M>
  );
}

/** A line of text whose words rise in one after another. The wrapper watches the viewport
 *  (the words themselves start clipped out of sight, so they cannot). */
export function Words({ text, className, delay = 0, stagger = 0.06 }: { text: string; className?: string; delay?: number; stagger?: number }) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  return (
    <motion.span className={className} aria-label={text} style={{ display: 'inline' }} initial="hide" whileInView="show" viewport={{ once: true, margin: '0px 0px -8% 0px' }} transition={{ staggerChildren: stagger, delayChildren: delay }}>
      {words.map((w, i) => (
        <span key={i + w} aria-hidden="true" style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.1em', marginBottom: '-0.1em' }}>
          <motion.span style={{ display: 'inline-block' }} variants={{ hide: { y: '110%' }, show: { y: '0%', transition: { duration: 0.9, ease: EASE } } }}>
            {w}
            {i < words.length - 1 ? '\u00a0' : ''}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/** Counts up to a number such as "4.9", "12k+" or "98%" when it comes into view. */
export function Counter({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const m = String(value ?? '').match(/^(\D*)([\d.,]+)(.*)$/);
  const [shown, setShown] = useState(m ? m[1] + '0' + m[3] : String(value ?? ''));
  useEffect(() => {
    if (!m) return setShown(String(value ?? ''));
    const target = parseFloat(m[2].replace(/,/g, ''));
    const decimals = (m[2].split('.')[1] || '').length;
    const comma = m[2].includes(',');
    const fmt = (n: number) => {
      const s = n.toFixed(decimals);
      return comma ? Number(s).toLocaleString('en-US', { minimumFractionDigits: decimals }) : s;
    };
    if (!seen || reduce) return setShown(seen || reduce ? m[1] + fmt(target) + m[3] : m[1] + fmt(0) + m[3]);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1600);
      setShown(m[1] + fmt(target * (1 - Math.pow(1 - p, 3))) + m[3]);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, reduce]);
  return (
    <span ref={ref} className={className}>
      {shown}
    </span>
  );
}

/** A dialog over the page. Escape, the close button and the backdrop close it. */
export function Modal({ open, onClose, children, label, className = '' }: { open: boolean; onClose: () => void; children: ReactNode; label: string; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', key);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="xp-modal" role="dialog" aria-modal="true" aria-label={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className={'xp-modal-card ' + className} initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="xp-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Sends a form. With an https form address (Formspree, Getform, your own) it posts there;
 * without one it only shows the thank-you message, so the page works before it is wired up.
 */
export function useSender(action: unknown) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const send = async (values: Record<string, string>) => {
    const url = safeHref(action);
    setState('sending');
    try {
      if (url.startsWith('https:')) {
        const body = new FormData();
        for (const [k, v] of Object.entries(values)) body.append(k, v);
        const r = await fetch(url, { method: 'POST', body, headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(String(r.status));
      } else await new Promise((r) => setTimeout(r, 650));
      setState('sent');
    } catch {
      setState('error');
    }
  };
  return { state, send, reset: () => setState('idle') };
}

/** The next n days from today, for picking a date. */
export function nextDays(n: number, skip: number[] = []) {
  const out: { iso: string; day: string; date: string }[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    if (skip.includes(d.getDay())) continue;
    out.push({ iso: d.toISOString().slice(0, 10), day: d.toLocaleDateString('en-GB', { weekday: 'short' }), date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) });
  }
  return out;
}

/** Items of a list field, never undefined. */
export const items = (v: unknown): XP[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
