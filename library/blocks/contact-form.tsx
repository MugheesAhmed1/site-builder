// A contact form that posts to a form service or opens the visitor's email app (from every template's contact).
import { useState, type FormEvent } from 'react';
import { color, safeHref, text, type BlockProps } from '../kit';

export default function ContactForm({ props: p }: BlockProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [state, setState] = useState<'' | 'sent' | 'error'>('');
  const fg = color(p.text, '#13201a');
  const accent = color(p.accent, '#13201a');
  const to = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.email || '').trim()) ? String(p.email).trim() : '';
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const action = safeHref(p.formAction);
    try {
      if (action.startsWith('https:')) {
        const body = new FormData();
        body.append('name', name);
        body.append('email', email);
        body.append('message', msg);
        const res = await fetch(action, { method: 'POST', body, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
      } else if (to) {
        window.location.href = `mailto:${to}?subject=${encodeURIComponent(`${text(p.title)} — ${name}`)}&body=${encodeURIComponent(`${msg}\n\n${name} <${email}>`)}`;
      }
      setState('sent');
    } catch {
      setState('error');
    }
  }
  const field = { width: '100%', padding: '14px 16px', borderRadius: 12, border: `1px solid color-mix(in srgb, ${fg} 22%, transparent)`, background: 'transparent', color: 'inherit', font: 'inherit', fontSize: 16 } as const;
  const label = { display: 'grid', gap: 8, fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase' } as const;
  return (
    <section id={text(p.anchor) || undefined} style={{ background: color(p.background, '#f2f4f0'), color: fg, padding: 'clamp(64px,10vw,140px) clamp(20px,6vw,96px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,360px),1fr))', gap: 'clamp(28px,5vw,72px)' }}>
        <div>
          {text(p.kicker) && <p style={{ margin: '0 0 14px', fontSize: 13, letterSpacing: '.16em', textTransform: 'uppercase', opacity: 0.6 }}>{text(p.kicker)}</p>}
          <h2 style={{ margin: 0, fontSize: 'clamp(36px,5.6vw,76px)', lineHeight: 0.95, letterSpacing: '-.035em' }}>{text(p.title)}</h2>
          {text(p.body) && <p style={{ margin: '20px 0 0', lineHeight: 1.6, opacity: 0.75, maxWidth: '44ch' }}>{text(p.body)}</p>}
          {to && <p style={{ margin: '24px 0 0' }}><a href={`mailto:${to}`} style={{ color: 'inherit' }}>{to}</a></p>}
          {text(p.phone) && <p style={{ margin: '8px 0 0' }}><a href={`tel:${text(p.phone).replace(/[^+\d]/g, '')}`} style={{ color: 'inherit' }}>{text(p.phone)}</a></p>}
        </div>
        {state === 'sent' ? (
          <div role="status" style={{ alignSelf: 'center' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 'clamp(24px,3vw,36px)' }}>{text(p.thanksTitle)}</h3>
            <p style={{ margin: 0, opacity: 0.75, lineHeight: 1.6 }}>{text(p.thanksText)}</p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'grid', gap: 18 }}>
            <label style={label}>{text(p.nameLabel)}<input required value={name} onChange={(e) => setName(e.target.value)} style={field} /></label>
            <label style={label}>{text(p.emailLabel)}<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={field} /></label>
            <label style={label}>{text(p.messageLabel)}<textarea rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} style={{ ...field, resize: 'vertical' }} /></label>
            {state === 'error' && <p role="alert" style={{ margin: 0 }}>{text(p.error)}</p>}
            <button type="submit" style={{ justifySelf: 'start', padding: '15px 28px', borderRadius: 999, border: 0, background: accent, color: color(p.buttonText, '#ffffff'), font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>{text(p.button)}</button>
          </form>
        )}
      </div>
    </section>
  );
}
