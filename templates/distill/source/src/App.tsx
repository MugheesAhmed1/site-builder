import React, { useEffect, useRef, useState } from 'react';
import { X, Check, ArrowUpRight } from './icons';
import { cardsOf, type KesslerCardData } from './data/kesslerCards';
import { KesslerCardContent } from './components/KesslerCards';
import { fill, lines, pairs, safeHref, useTheme, useXP, type XP } from './xp';
import { CharacterSlot, hasCharacter, hasEcho, stageClass, stageStyle } from './character';

/** Seven shades from the hot colour to near white, for the dissolving particles. */
function particlePalette(hot: string): string[] {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hot || '').trim());
  const v = parseInt(m ? m[1] : 'FF5A1F', 16);
  const rgb = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  const mix = (t: number) => {
    const c = rgb.map((x) => Math.round(t < 0 ? x * (1 + t) : x + (255 - x) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  return [mix(-0.06), mix(0), mix(0.08), mix(0.22), mix(0.42), mix(0.7), mix(0.92)];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
}

type DropdownKey = number | null;
type ModalKey = 'demo' | 'trial' | 'signin' | 'pricing' | 'explore' | null;

function hash3(a: number, b: number, c: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}


export default function App() {
  const data = useXP();
  useTheme(data);
  const KESSLER_CARDS = cardsOf(data);
  const cardsRef = useRef<KesslerCardData[]>(KESSLER_CARDS);
  cardsRef.current = KESSLER_CARDS;
  const settingsRef = useRef<XP>({});
  settingsRef.current = { ...(data.motion || {}), palette: particlePalette(data.theme?.colors?.hot) };
  const f = (v: unknown) => fill(v, data);
  const menus: { label: string; items: [string, string][] }[] = (Array.isArray(data.nav?.menus) ? data.nav.menus : []).map((m: XP) => ({ label: f(m.label), items: pairs(m.items, data) }));
  const forms = data.forms || {};
  const [formError, setFormError] = useState('');
  const beltRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gapRulerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const codeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const badgeNumRef = useRef<HTMLSpanElement>(null);
  const badgePctRef = useRef<HTMLSpanElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const dataRef = useRef<XP>(data);
  dataRef.current = data;
  const dragStateRef = useRef({
    dragging: false,
    hovered: false,
    lastX: 0,
    lastT: 0,
    off: 0,
    vel: 0,
    hover: 0,
    initialized: false,
    cw: 662,
    ch: 421,
    gap: 68,
    lx: 720,
    beltW: 1440,
    beltH: 561,
    dpr: 1,
    activeCardIndex: -1,
    shownNum: 0,
    sparks: [] as Spark[],
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const beltEl = beltRef.current;
    const canvasEl = canvasRef.current;
    if (!beltEl || !canvasEl) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };
    motionQuery.addEventListener('change', onMotionChange);

    const s = dragStateRef.current;

    const measure = () => {
      const firstCard = cardRefs.current[0];
      const beltRect = beltEl.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (firstCard) {
        const cardRect = firstCard.getBoundingClientRect();
        s.cw = cardRect.width || window.innerWidth * 0.46;
        s.ch = cardRect.height || window.innerHeight * 0.52;
      }

      if (gapRulerRef.current) {
        s.gap = gapRulerRef.current.getBoundingClientRect().width || window.innerWidth * 0.0475;
      }

      s.lx = window.innerWidth / 2;
      s.beltW = beltRect.width || window.innerWidth;
      s.beltH = beltRect.height || s.ch + 140;
      s.dpr = dpr;

      canvasEl.width = Math.round(s.beltW * dpr);
      canvasEl.height = Math.round(s.beltH * dpr);

      if (!s.initialized) {
        s.off = window.innerWidth / 2 - 0.62 * s.cw;
        s.vel = reducedMotion ? 0 : -0.075 * window.innerWidth;
        s.initialized = true;
      }
    };

    measure();
    window.addEventListener('resize', measure);

    let rafId = 0;
    let prevTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - prevTime) / 1000));
      prevTime = now;
      const t = now / 1000;

      const { cw, ch, gap, lx, beltW, beltH, dpr } = s;
      const KESSLER_CARDS = cardsRef.current;
      const cfg = settingsRef.current;
      const PARTICLE_PALETTE: string[] = cfg.palette;
      const speed = Number.isFinite(Number(cfg.speed)) ? Number(cfg.speed) : 0.075;
      const still = reducedMotion || cfg.animate === false;
      if (!KESSLER_CARDS.length) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, beltW, beltH);
        rafId = requestAnimationFrame(frame);
        return;
      }
      const span = cw + gap;
      const period = span * KESSLER_CARDS.length;

      // Hover easing
      const hoverTarget = s.hovered ? 1 : 0;
      if (s.hover < hoverTarget) {
        s.hover = Math.min(1, s.hover + 4 * dt);
      } else if (s.hover > hoverTarget) {
        s.hover = Math.max(0, s.hover - 4 * dt);
      }

      // Speed easing when not dragging
      const autoSpeed = still ? 0 : -speed * window.innerWidth;
      const hoverSlow = Math.min(1, Math.max(0, Number(cfg.hoverSlow ?? 0.65)));
      const targetVel = autoSpeed * (1 - hoverSlow * s.hover);

      if (!s.dragging) {
        s.vel += (targetVel - s.vel) * (1 - Math.exp(-2.2 * dt));
        s.off += s.vel * dt;
      }

      // Reset canvas transform and clear
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, beltW, beltH);

      const cardTop = 70;
      const R = 0.3 * cw;
      const rows = Math.floor(ch / 3);
      let crossingIndex = -1;
      let crossingCut = 0;
      let hasCrossing = false;

      for (let i = 0; i < KESSLER_CARDS.length; i++) {
        const x = mod(s.off + i * span + span, period) - span;
        const cut = Math.max(0, Math.min(cw, lx - x));

        if (cut > 0 && cut < cw) {
          crossingIndex = i;
          crossingCut = cut;
          hasCrossing = true;
        }

        const cardEl = cardRefs.current[i];
        const codeEl = codeRefs.current[i];

        if (cardEl) {
          cardEl.style.transform = `translate3d(${x}px, 0, 0)`;
          if (cut >= cw) {
            cardEl.style.visibility = 'hidden';
          } else {
            cardEl.style.visibility = 'visible';
            if (cut > 0) {
              cardEl.style.clipPath = `inset(0 0 0 ${cut}px round 0 1.6vw 1.6vw 0)`;
              const mask = `linear-gradient(90deg, transparent ${cut}px, #000 ${cut + 26}px)`;
              cardEl.style.maskImage = mask;
              cardEl.style.webkitMaskImage = mask;
            } else {
              cardEl.style.clipPath = '';
              cardEl.style.maskImage = '';
              cardEl.style.webkitMaskImage = '';
            }
          }
        }

        if (codeEl) {
          codeEl.style.transform = `translate3d(${x}px, 0, 0)`;
          if (cut <= 0) {
            codeEl.style.visibility = 'hidden';
          } else {
            codeEl.style.visibility = 'visible';
            codeEl.style.clipPath = `inset(0 ${Math.max(0, cw - cut)}px 0 0)`;
          }
        }

        // Draw FX for cards with cut > 0 and right edge still past the scanner line
        if (cfg.particles !== false && cut > 0 && x + cw > lx) {
          // 1. Haze
          const hazeW = Math.min(150, x + cw - lx);
          if (hazeW > 0) {
            const hazeGrad = ctx.createLinearGradient(lx, 0, lx + 150, 0);
            hazeGrad.addColorStop(0, PARTICLE_PALETTE[1].replace('rgb(', 'rgba(').replace(')', ',0.42)'));
            hazeGrad.addColorStop(1, PARTICLE_PALETTE[1].replace('rgb(', 'rgba(').replace(')', ',0)'));
            ctx.fillStyle = hazeGrad;
            ctx.fillRect(lx, cardTop, hazeW, ch);
          }

          // 2. Dithered particles fixed to card surface
          const gxStart = Math.max(0, Math.floor(cut / 3));
          const gxEnd = Math.min(Math.ceil(cw / 3), Math.ceil((cut + R) / 3));
          const twinkleBucket = Math.floor(t * 9) + 97;

          for (let gx = gxStart; gx <= gxEnd; gx++) {
            const sx = x + gx * 3;
            const d = sx - lx;
            if (d < 0 || d >= R) continue;

            const p = Math.pow(1 - d / R, 1.7);

            for (let row = -5; row <= rows + 5; row++) {
              let threshold: number;
              if (row >= 0 && row < rows) {
                threshold = p * 0.92;
              } else {
                const distOut = row < 0 ? -row : row - rows + 1;
                const fade = Math.max(0, 1 - (distOut - 1) / 5);
                threshold = p * 0.16 * fade;
              }

              if (hash3(gx, row, i) >= threshold) continue;
              if (!reducedMotion && hash3(gx, row, twinkleBucket) < 0.22) continue;

              const h2 = hash3(row, gx, i + 31);
              let colIdx: number;
              if (d <= 10) {
                colIdx = Math.min(6, 4 + Math.floor(h2 * 3));
              } else {
                colIdx = Math.min(6, Math.floor(h2 * h2 * 7));
              }

              const size = 1.1 + h2 * 1.7;
              const jx = reducedMotion ? 0 : (hash3(gx, row, i + 13) - 0.5) * 1.6;
              const jy = reducedMotion ? 0 : (hash3(row, gx, i + 71) - 0.5) * 1.6;

              ctx.fillStyle = PARTICLE_PALETTE[colIdx];
              ctx.fillRect(sx + jx, cardTop + row * 3 + jy, size, size);
            }
          }
        }
      }

      // 3. Free sparks
      if (!still && cfg.sparks !== false && hasCrossing) {
        for (let k = 0; k < 3; k++) {
          if (Math.random() < 0.7) {
            s.sparks.push({
              x: lx + Math.random() * 30,
              y: cardTop - 10 + Math.random() * (ch + 20),
              vx: -30 + Math.random() * 70 + s.vel * 0.6,
              vy: (Math.random() * 2 - 1) * 25,
              size: 0.8 + Math.random() * 1.8,
              life: 0.3 + Math.random() * 0.8,
              color: PARTICLE_PALETTE[Math.floor(Math.random() * PARTICLE_PALETTE.length)],
            });
          }
        }
      }

      for (let k = s.sparks.length - 1; k >= 0; k--) {
        const sp = s.sparks[k];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;
        if (sp.life <= 0) {
          s.sparks.splice(k, 1);
          continue;
        }
        ctx.globalAlpha = Math.min(1, sp.life * 2.2);
        ctx.fillStyle = sp.color;
        ctx.fillRect(sp.x, sp.y, sp.size, sp.size);
      }
      ctx.globalAlpha = 1;

      // Update counter badge
      if (crossingIndex !== -1) {
        const card = KESSLER_CARDS[crossingIndex];
        const progress = crossingCut / cw;
        const saved = card.original - card.distilled;
        const targetNum = Math.round(saved * progress);

        if (s.activeCardIndex !== crossingIndex) {
          s.activeCardIndex = crossingIndex;
          s.shownNum = targetNum;
          if (badgePctRef.current) {
            const pct = Math.round((saved / card.original) * 100);
            badgePctRef.current.textContent = `${pct}${fill(dataRef.current.badge?.less, dataRef.current)}`;
          }
        } else {
          s.shownNum += (targetNum - s.shownNum) * Math.min(1, dt * 14);
        }

        if (badgeNumRef.current) {
          badgeNumRef.current.textContent = `\u2212${Math.round(s.shownNum).toLocaleString('en-US')}`;
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    // Wheel handler (horizontal scrubbing)
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        s.vel += -e.deltaX * 6;
      }
    };
    beltEl.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', measure);
      beltEl.removeEventListener('wheel', onWheel);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const beltEl = beltRef.current;
    if (!beltEl) return;
    beltEl.setPointerCapture(e.pointerId);
    const s = dragStateRef.current;
    s.dragging = true;
    s.lastX = e.clientX;
    s.lastT = performance.now();
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragStateRef.current;
    if (!s.dragging) return;
    const now = performance.now();
    const dx = e.clientX - s.lastX;
    const dtMs = Math.max(8, now - s.lastT);
    s.off += dx;
    s.vel = (dx / dtMs) * 1000 * 0.8 + s.vel * 0.2;
    s.lastX = e.clientX;
    s.lastT = now;
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const beltEl = beltRef.current;
    if (beltEl && beltEl.hasPointerCapture(e.pointerId)) {
      beltEl.releasePointerCapture(e.pointerId);
    }
    dragStateRef.current.dragging = false;
    setIsDragging(false);
  };

  const openModalWithReset = (modal: ModalKey) => {
    setOpenDropdown(null);
    setFormSubmitted(false);
    setFormError('');
    setFormEmail('');
    setFormDomain('');
    setActiveModal(modal);
  };

  return (
    <>
    <main className="distill-stage">
      {/* Hidden ruler to measure CSS --gap accurately in pixels */}
      <div
        ref={gapRulerRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 'var(--gap)',
          height: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      />

      {/* Top Navigation */}
      <header className="distill-nav">
        <a
          href="#top"
          className="distill-logo"
          onClick={(e) => {
            e.preventDefault();
            setOpenDropdown(null);
          }}
        >
          {data.brand?.showMark !== false && <svg width="19" height="23" viewBox="0 0 19 23" fill="none" aria-hidden="true">
            <path
              d="M9.5 1.1C9.5 1.1 1.5 9.6 1.5 14.8C1.5 19.2 5.08 22.5 9.5 22.5C13.92 22.5 17.5 19.2 17.5 14.8C17.5 9.6 9.5 1.1 9.5 1.1Z"
              fill="currentColor"
            />
            <path
              d="M5.6 14.6C5.6 16.9 7.2 18.4 9.2 18.6"
              stroke="var(--bg)"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>}
          <span>{f(data.brand?.name)}</span>
        </a>

        <nav className="distill-nav-links" aria-label="Primary">
          {menus.map(({ label, items }, key) => (
            <div key={key} style={{ position: 'relative' }}>
              <button
                type="button"
                className="distill-nav-link"
                aria-expanded={openDropdown === key}
                onClick={() => setOpenDropdown(openDropdown === key ? null : key)}
              >
                <span>{label}</span>
                <svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true">
                  <path
                    d="M1 1L4 4L7 1"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {openDropdown === key && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    left: 0,
                    width: '290px',
                    background: '#FFFFFF',
                    border: '1px solid #D7DCE1',
                    borderRadius: '14px',
                    padding: '10px',
                    boxShadow: '0 14px 36px rgba(15, 17, 21, 0.08)',
                    zIndex: 50,
                  }}
                >
                  {items.map(([title, desc], idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openModalWithReset('explore')}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F4F6F8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                        {title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          lineHeight: 1.45,
                          color: 'var(--muted)',
                          marginTop: '2px',
                        }}
                      >
                        {desc}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {f(data.nav?.pricing) && <button
            type="button"
            className="distill-nav-link"
            onClick={() => openModalWithReset('pricing')}
          >
            {f(data.nav?.pricing)}
          </button>}
        </nav>

        <div className="distill-nav-actions">
          {f(data.nav?.signin) && <button
            type="button"
            className="distill-signin"
            onClick={() => openModalWithReset('signin')}
          >
            {f(data.nav?.signin)}
          </button>}
          {f(data.nav?.trial) && <button
            type="button"
            className="distill-trial"
            onClick={() => openModalWithReset('trial')}
          >
            {f(data.nav?.trial)}
          </button>}
          {f(data.nav?.demo) && <button
            type="button"
            className="distill-demo"
            onClick={() => openModalWithReset('demo')}
          >
            {f(data.nav?.demo)}
          </button>}
        </div>
      </header>

      {/* Two-Column Hero */}
      <section className={'distill-hero' + (hasCharacter(data) ? ' has-char' : '')} aria-label="Introduction">
        <div>
          <p className="distill-eyebrow">{f(data.hero?.eyebrow)}</p>
          <h1 className="distill-headline">
            {f(data.hero?.line1)}
            <br />
            <em>{f(data.hero?.line2)}</em>
          </h1>
        </div>
        <div>
          <p className="distill-copy">
            {f(data.hero?.text)}
          </p>
          <button
            type="button"
            className="distill-cta"
            onClick={() => openModalWithReset('explore')}
          >
            {f(data.hero?.button)}
          </button>
        </div>
        {hasCharacter(data) && (
          <div className={`distill-char-stage ${stageClass(data)}`} style={stageStyle(data, [50, 52])}>
            <CharacterSlot data={data} className="distill-char" />
          </div>
        )}
      </section>

      {/* Floating Token Reduction Counter */}
      <div className="badge" aria-live="polite">
        <span className="badge-label">{f(data.badge?.label)}</span>
        <div className="badge-pill">
          <span ref={badgeNumRef} className="badge-num">
            &#8722;{(KESSLER_CARDS[0] ? KESSLER_CARDS[0].original - KESSLER_CARDS[0].distilled : 0).toLocaleString('en-US')}
          </span>
          <span ref={badgePctRef} className="badge-pct">
            {KESSLER_CARDS[0] ? Math.round(((KESSLER_CARDS[0].original - KESSLER_CARDS[0].distilled) / Math.max(1, KESSLER_CARDS[0].original)) * 100) : 0}
            {f(data.badge?.less)}
          </span>
        </div>
      </div>

      {/* Glowing Orange Scanner Line */}
      <div className="scan" aria-hidden="true">
        <b />
        <i />
      </div>

      {/* Interactive Conveyor Belt */}
      <div
        ref={beltRef}
        className={`belt${isDragging ? ' is-dragging' : ''}`}
        role="region"
        aria-label={f(data.belt?.label)}
        onPointerEnter={() => {
          dragStateRef.current.hovered = true;
        }}
        onPointerLeave={() => {
          dragStateRef.current.hovered = false;
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
      >
        {/* Layer 1: Distilled HTML Code Blocks */}
        <div className="codes" aria-hidden="true">
          {KESSLER_CARDS.map((card, i) => (
            <div
              key={`code-${card.key}`}
              ref={(el) => {
                codeRefs.current[i] = el;
              }}
              className="code-block"
            >
              <pre className="code-html">{card.html}</pre>
              <pre className="code-meta">{card.meta}</pre>
            </div>
          ))}
        </div>

        {/* Layer 2: Kessler Mini-Website Cards */}
        <div className="cards">
          {KESSLER_CARDS.map((card, i) => (
            <div
              key={`card-${card.key}`}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={`k-card k-card--${card.id}`}
            >
              <KesslerCardContent card={card} />
            </div>
          ))}
        </div>

        {/* Layer 3: 2D Particle Dissolve Canvas */}
        <canvas ref={canvasRef} className="fx" />
      </div>

      {/* Interactive Modal for Nav / CTA actions */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 17, 21, 0.36)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '28px',
              border: '1px solid #DDE1E6',
              boxShadow: '0 24px 60px rgba(15, 17, 21, 0.16)',
              position: 'relative',
              color: 'var(--ink)',
            }}
          >
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => setActiveModal(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: '#F4F6F8',
                border: 'none',
                borderRadius: '999px',
                width: '32px',
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--body)',
              }}
            >
              <X size={16} />
            </button>

            {activeModal === 'pricing' ? (
              <div>
                <p className="distill-eyebrow" style={{ marginBottom: '8px' }}>
                  {f(data.pricing?.eyebrow)}
                </p>
                <h2
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: '28px',
                    fontWeight: 400,
                    margin: '0 0 18px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {f(data.pricing?.title)}
                </h2>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {lines(data.pricing?.tiers, data).map((l) => l.split('|').map((x) => x.trim())).map(([name = '', price = '', detail = ''], idx) => ({ name, price, detail, idx })).map((tier) => (
                    <div
                      key={tier.idx}
                      style={{
                        border: '1px solid #E4E7EC',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{tier.name}</div>
                        <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>
                          {tier.detail}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 500 }}>
                        {tier.price}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="distill-cta"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '18px' }}
                  onClick={() => openModalWithReset('trial')}
                >
                  {f(data.pricing?.button)}
                </button>
              </div>
            ) : activeModal === 'explore' ? (
              <div>
                <p className="distill-eyebrow" style={{ marginBottom: '8px' }}>
                  {f(data.explore?.eyebrow)}
                </p>
                <h2
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: '28px',
                    fontWeight: 400,
                    margin: '0 0 12px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {f(data.explore?.title)}
                </h2>
                <p style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--body)', margin: '0 0 18px' }}>
                  {f(data.explore?.text)}
                </p>
                <div
                  style={{
                    background: '#F4F6F8',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    fontFamily: 'var(--mono)',
                    fontSize: '12px',
                    color: 'var(--body)',
                    lineHeight: 1.6,
                  }}
                >
                  {lines(data.explore?.facts, data).map((l, idx) => (
                    <div key={idx}>{l}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  <button
                    type="button"
                    className="distill-cta"
                    style={{ marginTop: 0, flex: 1, justifyContent: 'center' }}
                    onClick={() => openModalWithReset('demo')}
                  >
                    {f(data.explore?.button)} <ArrowUpRight size={14} style={{ marginLeft: '6px' }} />
                  </button>
                </div>
              </div>
            ) : formSubmitted ? (
              <div style={{ textAlign: 'center', padding: '14px 0' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '999px',
                    background: 'var(--hot-soft)',
                    color: 'var(--hot-deep)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <Check size={20} />
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: '26px',
                    fontWeight: 400,
                    margin: '0 0 8px',
                  }}
                >
                  {f(activeModal === 'signin' ? forms.signinThanksTitle : forms.thanksTitle)}
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--body)', margin: '0 0 18px', lineHeight: 1.5 }}>
                  {f(activeModal === 'signin' ? forms.signinThanksText : forms.thanksText)
                    .replace(/\{email\}/g, formEmail)
                    .replace(/\{domain\}/g, formDomain || f(forms.domainFallback))}
                </p>
                <button
                  type="button"
                  className="distill-trial"
                  onClick={() => setActiveModal(null)}
                >
                  {f(forms.back)}
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!formEmail.trim()) return;
                  setFormError('');
                  const kind = activeModal || 'demo';
                  const signinLink = safeHref(forms.signinLink);
                  if (kind === 'signin' && signinLink) {
                    window.location.href = signinLink;
                    return;
                  }
                  const action = safeHref(forms.formAction);
                  const to = String(forms.email || '').trim();
                  try {
                    if (action.startsWith('https:')) {
                      const body = new FormData();
                      body.append('request', kind);
                      body.append('email', formEmail);
                      body.append('domain', formDomain);
                      const res = await fetch(action, { method: 'POST', body, headers: { Accept: 'application/json' } });
                      if (!res.ok) throw new Error(String(res.status));
                    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
                      const subject = encodeURIComponent(`${f(forms[`${kind}Title`])} — ${formEmail}`);
                      window.location.href = `mailto:${to}?subject=${subject}&body=${encodeURIComponent(`${formEmail}\n${formDomain}`)}`;
                    }
                    setFormSubmitted(true);
                  } catch {
                    setFormError(f(forms.error) || 'That did not go through.');
                  }
                }}
              >
                <p className="distill-eyebrow" style={{ marginBottom: '8px' }}>
                  {f(forms[`${activeModal}Eyebrow`])}
                </p>
                <h2
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: '28px',
                    fontWeight: 400,
                    margin: '0 0 16px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {f(forms[`${activeModal}Title`])}
                </h2>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <label style={{ display: 'grid', gap: '6px', fontSize: '12.5px', fontWeight: 500 }}>
                    {f(forms.emailLabel)}
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder={f(forms.emailPlaceholder)}
                      style={{
                        height: '40px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1px solid #C4C9CF',
                        fontSize: '14px',
                        fontFamily: 'var(--sans)',
                      }}
                    />
                  </label>
                  {activeModal !== 'signin' && (
                    <label style={{ display: 'grid', gap: '6px', fontSize: '12.5px', fontWeight: 500 }}>
                      {f(forms.domainLabel)}
                      <input
                        type="text"
                        value={formDomain}
                        onChange={(e) => setFormDomain(e.target.value)}
                        placeholder={f(forms.domainPlaceholder)}
                        style={{
                          height: '40px',
                          padding: '0 12px',
                          borderRadius: '10px',
                          border: '1px solid #C4C9CF',
                          fontSize: '14px',
                          fontFamily: 'var(--sans)',
                        }}
                      />
                    </label>
                  )}
                </div>
                {formError && <p role="alert" style={{ color: 'var(--hot-deep)', fontSize: '13px', margin: '12px 0 0' }}>{formError}</p>}
                <button
                  type="submit"
                  className="distill-cta"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '18px' }}
                >
                  {f(forms[`${activeModal}Button`])}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
    {hasEcho(data) && (
      <div className="xp-echo distill-echo">
        <CharacterSlot data={data} slot="echo" />
      </div>
    )}
    <div data-xp-extras="" />
    </>
  );
}
