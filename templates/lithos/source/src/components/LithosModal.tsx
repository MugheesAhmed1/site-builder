import { useState, type FormEvent } from 'react';
import { X, Compass, Layers, Check } from '../icons';
import { fill, safeHref, useXP, type XP } from '../xp';

export type ModalMode = 'explore' | 'signup' | null;

export function LithosModal({ mode, onClose }: { mode: ModalMode; onClose: () => void }) {
  const data = useXP();
  const f = (t: unknown) => fill(t, data);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!mode) return null;
  const ex = data.explore || {};
  const su = data.signup || {};

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    const action = safeHref(su.formAction);
    try {
      if (action.startsWith('https:')) {
        const body = new FormData();
        body.append('email', email);
        const res = await fetch(action, { method: 'POST', body, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(su.email || ''))) {
        window.location.href = `mailto:${su.email}?subject=${encodeURIComponent(f(su.title))}&body=${encodeURIComponent(email)}`;
      }
      setSubmitted(true);
    } catch {
      setError('That did not go through. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={f(mode === 'signup' ? su.title : ex.title)}>
      <div className="relative w-full max-w-md rounded-2xl lithos-panel border border-white/15 p-6 sm:p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-white/10 transition cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        {mode === 'explore' ? (
          <div>
            <div className="flex items-center gap-2.5 mb-3" style={{ color: 'var(--c-accent)' }}>
              <Layers className="w-5 h-5" />
              <span className="text-xs font-semibold tracking-wider uppercase">{f(ex.kicker)}</span>
            </div>
            <h2 className="text-2xl font-display italic mb-2">{f(ex.title)}</h2>
            <p className="text-sm opacity-70 leading-relaxed mb-6">{f(ex.text)}</p>
            <div className="space-y-3 mb-6">
              {(ex.layers || []).map((layer: XP, i: number) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                  <div className="flex items-center justify-between text-sm font-medium gap-3">
                    <span>{f(layer.name)}</span>
                    <span className="text-xs opacity-60 tabular-nums">{f(layer.detail)}</span>
                  </div>
                  <p className="text-xs opacity-65 mt-1">{f(layer.text)}</p>
                </div>
              ))}
            </div>
            <button type="button" onClick={onClose} className="w-full lithos-accent text-sm font-medium px-6 py-3 rounded-full transition-colors cursor-pointer">
              {f(ex.button)}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2.5 mb-3" style={{ color: 'var(--c-accent)' }}>
              <Compass className="w-5 h-5" />
              <span className="text-xs font-semibold tracking-wider uppercase">{f(su.kicker)}</span>
            </div>
            <h2 className="text-2xl font-display italic mb-2">{f(su.title)}</h2>
            <p className="text-sm opacity-70 leading-relaxed mb-6">{f(su.text)}</p>
            {submitted ? (
              <div className="rounded-xl border border-white/15 bg-white/5 p-5 text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full flex items-center justify-center" style={{ color: 'var(--c-accent)', background: 'color-mix(in srgb, var(--c-accent) 20%, transparent)' }}>
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium">{f(su.thanksTitle)}</p>
                <p className="text-xs opacity-65">{f(su.thanksText)}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="xp-email" className="block text-xs font-medium opacity-75 mb-1.5">
                    {f(su.label)}
                  </label>
                  <input
                    id="xp-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={f(su.placeholder)}
                    className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm placeholder:opacity-40 focus:outline-none focus:border-white/50"
                  />
                </div>
                {error && <p className="text-xs" style={{ color: 'var(--c-accent)' }}>{error}</p>}
                <button type="submit" className="w-full lithos-btn text-sm font-semibold px-6 py-3 rounded-full hover:opacity-90 transition cursor-pointer">
                  {f(su.button)}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
