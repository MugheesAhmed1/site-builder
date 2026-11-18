// A picture with pulsing pins; each opens a short note (from Mossline's field map).
import { useState } from 'react';
import { color, items, num, safeSrc, text, type BlockProps } from '../kit';

export default function ImageHotspots({ props: p }: BlockProps) {
  const spots = items(p.spots);
  const [open, setOpen] = useState<number | null>(null);
  const pin = color(p.pin, '#ffffff');
  const img = safeSrc(p.image);
  return (
    <section style={{ background: color(p.background, '#0e1512'), color: color(p.text, '#f2f4f0'), padding: 'clamp(48px,8vw,112px) clamp(16px,5vw,80px)' }}>
      <style>{`
.xpl-hot{max-width:1200px;margin:0 auto}
.xpl-hot h2{margin:0 0 24px;font-size:clamp(28px,4vw,56px);letter-spacing:-.03em;line-height:1}
.xpl-hot .pic{position:relative;border-radius:clamp(14px,2vw,28px);overflow:hidden}
.xpl-hot .pic img{display:block;width:100%;height:auto}
.xpl-hot .pin{position:absolute;width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;border:0;background:${pin};cursor:pointer;box-shadow:0 0 0 0 ${pin}aa;animation:xpl-pulse 2.2s infinite}
.xpl-hot .pin[aria-expanded=true]{animation:none;transform:scale(1.15)}
.xpl-hot .note{position:absolute;width:min(280px,70vw);padding:16px 18px;border-radius:14px;background:rgba(10,14,12,.86);backdrop-filter:blur(10px);color:#fff;font-size:14px;line-height:1.5;transform:translate(-50%,18px)}
.xpl-hot .note strong{display:block;margin-bottom:4px;font-size:15px}
@keyframes xpl-pulse{0%{box-shadow:0 0 0 0 ${pin}99}70%{box-shadow:0 0 0 16px ${pin}00}100%{box-shadow:0 0 0 0 ${pin}00}}
@media (prefers-reduced-motion:reduce){.xpl-hot .pin{animation:none}}
`}</style>
      <div className="xpl-hot">
        {text(p.title) && <h2>{text(p.title)}</h2>}
        <div className="pic">
          {img && <img src={img} alt={text(p.alt)} loading="lazy" />}
          {spots.map((s, i) => {
            const x = num(s.x, 50, 0, 100);
            const y = num(s.y, 50, 0, 100);
            return (
              <span key={i}>
                <button type="button" className="pin" style={{ left: `${x}%`, top: `${y}%` }} aria-expanded={open === i} aria-label={text(s.title)} onClick={() => setOpen(open === i ? null : i)} />
                {open === i && (
                  <span className="note" role="status" style={{ left: `${Math.min(80, Math.max(20, x))}%`, top: `${y}%` }}>
                    <strong>{text(s.title)}</strong>
                    {text(s.text)}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
