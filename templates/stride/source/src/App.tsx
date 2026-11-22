import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ARC_SLOTS,
  BITS,
  FLAVOURS,
  HERO_BITS_LAYOUT,
  INSIDE_STEPS,
  INTRO_VIDEO_URL,
  clamp,
  easeEntrance,
  easeGlide,
  easeInOutSine,
  hexWithAlpha,
  lerp,
  mod,
  seededRand,
  spriteCss,
  htmlLines,
  FONTS,
} from './strideData';
import { fill, lines, safeHref, useXP } from './xp';
import { CharacterSlot, hasCharacter, stageClass, stageStyle } from './character';

/** Set once the opening has played, so the preview does not replay it after each edit. */
let introPlayed = false;
import { createStride3DEngine, type BarPose, type Stride3DEngine } from './stride3d';

interface StormSeed {
  angle: number;
  ph: number;
  spin: number;
  sizeFactor: number;
  useActiveBit: boolean;
  fallbackBitOffset: number;
}

const STORM_SEEDS: StormSeed[] = (() => {
  const rand = seededRand(4242);
  return Array.from({ length: 20 }, (_, i) => ({
    angle: (i / 20) * Math.PI * 2 + (rand() - 0.5) * 0.42,
    ph: i / 20 + rand() * 0.03,
    spin: (rand() > 0.5 ? 1 : -1) * 360,
    sizeFactor: 0.7 + rand() * 0.7,
    useActiveBit: i % 10 < 7, // exact 70%
    fallbackBitOffset: Math.floor(rand() * 4) + 1,
  }));
})();

function BrandMarkSvg({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" aria-hidden="true">
      <circle className="disc" cx="18" cy="18" r="18" />
      <path
        className="path"
        d="M8.5 23.5 L15.2 12.2 L19.8 19.6 L22.6 15.2 L27.5 23.5 Z"
      />
    </svg>
  );
}

function InsideIconSvg({ index }: { index: number }) {
  if (index === 0) {
    // Leaf
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    );
  }
  if (index === 1) {
    // Four grains
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="9" cy="8.5" rx="2.6" ry="4" transform="rotate(-20 9 8.5)" />
        <ellipse cx="15" cy="8.5" rx="2.6" ry="4" transform="rotate(20 15 8.5)" />
        <ellipse cx="9" cy="15.5" rx="2.6" ry="4" transform="rotate(20 9 15.5)" />
        <ellipse cx="15" cy="15.5" rx="2.6" ry="4" transform="rotate(-20 15 15.5)" />
      </svg>
    );
  }
  if (index === 2) {
    // Heart
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    );
  }
  // Bolt
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function measureCanvasText(text: string, font: string): number {
  const c = measureCanvasText as unknown as { ctx?: CanvasRenderingContext2D };
  if (!c.ctx) {
    const canvas = document.createElement('canvas');
    c.ctx = canvas.getContext('2d')!;
  }
  c.ctx.font = font;
  return c.ctx.measureText(text).width || 100;
}

function sampleArcSlot(absK: number): { dx: number; dy: number; h: number; rz: number; ry: number } {
  const k = Math.min(absK, 4);
  const idx = Math.floor(k);
  const frac = k - idx;
  const a = ARC_SLOTS[idx];
  const b = ARC_SLOTS[Math.min(idx + 1, ARC_SLOTS.length - 1)];
  return {
    dx: lerp(a.dx, b.dx, frac),
    dy: lerp(a.dy, b.dy, frac),
    h: lerp(a.h, b.h, frac),
    rz: lerp(a.rz, b.rz, frac),
    ry: lerp(a.ry, b.ry, frac),
  };
}

export default function App() {
  const data = useXP();
  const f = (v: unknown) => fill(v, data);
  const tpl = (v: unknown, vars: Record<string, string | number>) =>
    f(v).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  const [introGone, setIntroGone] = useState(false);
  const [introCream, setIntroCream] = useState(false);
  const [stampShow, setStampShow] = useState(false);

  const [autoOn, setAutoOn] = useState(() =>
    typeof window !== 'undefined' ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches && data.motion?.autoplay !== false : true
  );
  const [activeNav, setActiveNav] = useState<'flavors' | 'inside' | 'shop' | 'range'>('flavors');
  const [navTheme, setNavTheme] = useState<'default' | 'light' | 'dark'>('default');
  const [navIn, setNavIn] = useState(false);

  const [activeFlavour, setActiveFlavour] = useState(Math.min(1, FLAVOURS.length - 1)); // Berry Oat ("02")
  const [activeStep, setActiveStep] = useState(0);

  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState<Array<{ label: string; count: number }>>([]);
  const [badgeKey, setBadgeKey] = useState(0);
  const [basketBump, setBasketBump] = useState(false);
  const [popover, setPopover] = useState<'cart' | 'dibs' | null>(null);
  const [dibsEmail, setDibsEmail] = useState('');
  const [dibsSaved, setDibsSaved] = useState(false);

  // Builder state
  const [packSlots, setPackSlots] = useState<Array<number | null>>([null, null, null]);
  const [buyAdded, setBuyAdded] = useState(false);
  const [glowColor, setGlowColor] = useState('rgba(148, 189, 180, 0.72)');

  // DOM Refs
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const introRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const navPillRef = useRef<HTMLElement | null>(null);
  const navHlRef = useRef<HTMLDivElement | null>(null);
  const navLinkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const basketRef = useRef<HTMLButtonElement | null>(null);

  const heroRef = useRef<HTMLElement | null>(null);
  const revealRef = useRef<HTMLDivElement | null>(null);
  const ringsRef = useRef<HTMLDivElement | null>(null);
  const bitsRef = useRef<HTMLDivElement | null>(null);
  const arcRef = useRef<HTMLDivElement | null>(null);
  const playRef = useRef<HTMLButtonElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const countRef = useRef<HTMLDivElement | null>(null);
  const autoRef = useRef<HTMLButtonElement | null>(null);

  const insideRef = useRef<HTMLElement | null>(null);
  const inDarkRef = useRef<HTMLDivElement | null>(null);
  const inBackFrameRef = useRef<HTMLDivElement | null>(null);
  const inNumRef = useRef<HTMLDivElement | null>(null);
  const inBarRef = useRef<HTMLDivElement | null>(null);
  const inFrontRef = useRef<HTMLDivElement | null>(null);
  const inFrontFrameRef = useRef<HTMLDivElement | null>(null);
  const inHeadRef = useRef<HTMLHeadingElement | null>(null);
  const inCapRef = useRef<HTMLParagraphElement | null>(null);
  const stormRef = useRef<HTMLDivElement | null>(null);

  const shopRef = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cardPkRefs = useRef<Array<HTMLDivElement | null>>([]);

  const rangeRef = useRef<HTMLElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const slotBarRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);

  // Mutable animation engine state (zero React re-renders per frame)
  const engineRef = useRef<Stride3DEngine | null>(null);
  const stateRef = useRef({
    reducedMotion: false,
    heroEntered: false,
    pos: -2.6,
    target: 1,
    activeFlavour: 1,
    slideActive: false,
    slideStartPos: -2.6,
    slideEndPos: 1,
    slideStartTime: 0,
    slideDur: 1700,
    slideEase: easeEntrance as (t: number) => number,
    slideSwapped: true,
    slideDir: 1,

    revealActive: false,
    revealStartTime: 0,
    revealColor: FLAVOURS[1].color,
    flavColor: FLAVOURS[1].color,

    autoOn: true,
    lastInteract: performance.now(),
    dragging: false,

    // Section 2 step flip
    step: 0,
    flipAngle: 0,
    flipStartAngle: 0,
    flipTargetAngle: 0,
    flipStartTime: 0,
    flipDur: 720,
    flipActive: false,
    textSwapTimeout: 0 as number,

    // Card hover tilt & poke
    cardTilts: FLAVOURS.map(() => ({ x: 0, y: 0 })),
    pokeStartTime: -1,

    // Mobile shop auto-center once
    phoneShopCentered: false,

    // Smooth wheel scroll
    smoothActive: false,
    smoothCurY: 0,
    smoothTargetY: 0,
    lastFrameTime: performance.now(),

    // Metrics
    vw: typeof window !== 'undefined' ? window.innerWidth : 1440,
    vh: typeof window !== 'undefined' ? window.innerHeight : 900,
    heroH: typeof window !== 'undefined' ? window.innerHeight : 900,
    u: 1,
    cx: 720,
    cy: 372,
    xSpread: 1,

    userTouchedPack: false,
    rangeAutoFilled: false,
  });

  // Keep autoOn synced to stateRef
  useEffect(() => {
    stateRef.current.autoOn = autoOn;
  }, [autoOn]);

  // Update nav sliding highlight
  const syncNavHighlight = useCallback(() => {
    const hl = navHlRef.current;
    const link = navLinkRefs.current[activeNav];
    if (!hl || !link) return;
    hl.style.left = `${link.offsetLeft}px`;
    hl.style.width = `${link.offsetWidth}px`;
  }, [activeNav]);

  useEffect(() => {
    syncNavHighlight();
  }, [syncNavHighlight, navIn]);

  // Compute & apply #title font size (and phone #play vertical centering)
  const updateTitleSize = useCallback((flavourIdx: number) => {
    const titleEl = titleRef.current;
    const playEl = playRef.current;
    if (!titleEl) return;
    const st = stateRef.current;
    const name = FLAVOURS[flavourIdx].name.toUpperCase();
    const font = `400 100px "${FONTS.display}"`;
    if (st.vw >= 820) {
      const w = measureCanvasText(name, font);
      const size = Math.min(96 * st.u, (760 * st.u * 100) / w);
      titleEl.style.fontSize = `${size}px`;
      if (playEl) {
        playEl.style.top = '';
        playEl.style.bottom = '';
      }
    } else {
      const words = name.split(' ');
      let maxWordW = 100;
      for (const word of words) {
        maxWordW = Math.max(maxWordW, measureCanvasText(word, font));
      }
      const isLandscape = st.vh <= 500 && st.vw > st.vh;
      const baseClamp = isLandscape ? 36 : clamp(st.vw * 0.125, 40, 64);
      const size = Math.min(baseClamp, ((st.vw - 36) * 100) / maxWordW);
      titleEl.style.fontSize = `${size}px`;
      if (playEl) {
        requestAnimationFrame(() => {
          const heroR = heroRef.current?.getBoundingClientRect();
          const titleR = titleEl.getBoundingClientRect();
          if (heroR && titleR.height > 0) {
            const barBottom = st.cy + (430 * st.u) / 2;
            const titleTopInHero = titleR.top - heroR.top;
            const mid = barBottom + (titleTopInHero - barBottom) / 2;
            playEl.style.bottom = 'auto';
            playEl.style.top = `${Math.max(barBottom + 24, mid)}px`;
          }
        });
      }
    }
  }, []);

  // Build initial title DOM layer
  const buildTitleLayer = useCallback((name: string) => {
    const layer = document.createElement('span');
    layer.className = 'title-layer';
    const words = name.toUpperCase().split(' ');
    words.forEach((word, wi) => {
      const wSpan = document.createElement('span');
      wSpan.className = 'title-word';
      for (const ch of word) {
        const cSpan = document.createElement('span');
        cSpan.className = 'title-char';
        cSpan.textContent = ch;
        wSpan.appendChild(cSpan);
      }
      layer.appendChild(wSpan);
      if (wi < words.length - 1) {
        layer.appendChild(document.createTextNode(' '));
      }
    });
    return layer;
  }, []);

  // Animate title swap (letter-rise with fade)
  const swapTitle = useCallback(
    (flavourIdx: number, dir: number, instant = false) => {
      const titleEl = titleRef.current;
      if (!titleEl) return;
      updateTitleSize(flavourIdx);
      const name = FLAVOURS[flavourIdx].name;

      if (instant) {
        titleEl.innerHTML = '';
        titleEl.appendChild(buildTitleLayer(name));
        return;
      }

      const oldLayers = Array.from(titleEl.querySelectorAll('.title-layer')) as HTMLElement[];
      oldLayers.forEach((oldLayer) => {
        oldLayer.style.position = 'absolute';
        oldLayer.style.left = '0';
        oldLayer.style.right = '0';
        oldLayer.style.top = '0';
        const chars = Array.from(oldLayer.querySelectorAll('.title-char')) as HTMLElement[];
        chars.forEach((ch, i) => {
          ch.animate(
            [
              { transform: 'translateY(0%)', opacity: 1 },
              { transform: `translateY(${-110 * dir}%)`, opacity: 0 },
            ],
            {
              duration: 300,
              delay: i * 11,
              easing: 'cubic-bezier(.45, 0, .75, .3)',
              fill: 'forwards',
            }
          );
        });
        window.setTimeout(() => {
          oldLayer.remove();
        }, 340 + chars.length * 11);
      });

      const newLayer = buildTitleLayer(name);
      titleEl.appendChild(newLayer);
      const newChars = Array.from(newLayer.querySelectorAll('.title-char')) as HTMLElement[];
      newChars.forEach((ch, i) => {
        ch.animate(
          [
            { transform: `translateY(${110 * dir}%)`, opacity: 0 },
            { transform: 'translateY(0%)', opacity: 1 },
          ],
          {
            duration: 620,
            delay: 120 + i * 22,
            easing: 'cubic-bezier(.22, 1, .36, 1)',
            fill: 'both',
          }
        );
      });
    },
    [buildTitleLayer, updateTitleSize]
  );

  // Soft crossfade helper for counter & section 2 texts
  const crossfadeEl = useCallback(
    (
      el: HTMLElement | null,
      nextHtml: string,
      outDur: number,
      swapDelay: number,
      inDur: number,
      instant = false
    ) => {
      if (!el) return;
      if (instant) {
        el.innerHTML = nextHtml;
        return;
      }
      el.getAnimations().forEach((a) => a.cancel());
      el.animate(
        [
          { translate: '0 0', opacity: 1 },
          { translate: '0 -10px', opacity: 0 },
        ],
        {
          duration: outDur,
          easing: 'cubic-bezier(.5,0,.75,0)',
          fill: 'forwards',
        }
      );
      window.setTimeout(() => {
        el.innerHTML = nextHtml;
        el.animate(
          [
            { translate: '0 14px', opacity: 0 },
            { translate: '0 0', opacity: 1 },
          ],
          {
            duration: inDur,
            easing: 'cubic-bezier(.22,1,.36,1)',
            fill: 'forwards',
          }
        );
      }, swapDelay);
    },
    []
  );

  // Update storm piece sprites for active flavour
  const syncStormSprites = useCallback((flavourIdx: number) => {
    const stormEl = stormRef.current;
    if (!stormEl) return;
    const activeBit = FLAVOURS[flavourIdx].bit;
    const children = Array.from(stormEl.children) as HTMLElement[];
    children.forEach((el, idx) => {
      const seed = STORM_SEEDS[idx];
      const bitIdx = seed.useActiveBit ? activeBit : (activeBit + seed.fallbackBitOffset) % 5;
      const box = BITS[bitIdx];
      const css = spriteCss(box, 0);
      el.style.backgroundSize = css.backgroundSize;
      el.style.backgroundPosition = css.backgroundPosition;
      el.dataset.aspect = String(box[3] / box[2]);
    });
  }, []);

  // Trigger colour reveal circle + UI swap
  const triggerFlavourEffects = useCallback(
    (newFlavourIdx: number, dir: number, instant = false) => {
      const st = stateRef.current;
      const flav = FLAVOURS[newFlavourIdx];
      st.activeFlavour = newFlavourIdx;
      setActiveFlavour(newFlavourIdx);

      // Update shop card live class
      cardRefs.current.forEach((c, idx) => {
        if (c) c.classList.toggle('live', idx === newFlavourIdx);
      });

      // Update storm sprites
      syncStormSprites(newFlavourIdx);

      if (instant || st.reducedMotion) {
        st.revealActive = false;
        st.flavColor = flav.color;
        document.documentElement.style.setProperty('--flav', flav.color);
        if (revealRef.current) {
          revealRef.current.style.setProperty('--rv', 'transparent');
          revealRef.current.style.maskImage = '';
          revealRef.current.style.webkitMaskImage = '';
          revealRef.current.style.clipPath = 'circle(0 at 50% 50%)';
        }
      } else {
        // Finish any running reveal immediately
        if (st.revealActive) {
          st.flavColor = st.revealColor;
          document.documentElement.style.setProperty('--flav', st.flavColor);
        }
        st.revealActive = true;
        st.revealStartTime = performance.now();
        st.revealColor = flav.color;
        if (revealRef.current) {
          revealRef.current.style.setProperty('--rv', flav.color);
          revealRef.current.style.clipPath = 'none';
        }
      }

      swapTitle(newFlavourIdx, dir, instant || st.reducedMotion);
      crossfadeEl(
        countRef.current,
        `0${newFlavourIdx + 1}`,
        220,
        60,
        380,
        instant || st.reducedMotion
      );

      // If section 2 is currently on step 04, fade its headline to the new flavour name
      if (st.step === 3 && inHeadRef.current) {
        const words = flav.name.toUpperCase().split(' ');
        const hasLong = words.some((w) => w.length > 9);
        inHeadRef.current.classList.toggle('compact', hasLong);
        crossfadeEl(inHeadRef.current, words.join('<br/>'), 240, 40, 460, instant || st.reducedMotion);
      }
    },
    [crossfadeEl, swapTitle, syncStormSprites]
  );

  // Slide bars to a target index
  const goTo = useCallback(
    (nextTarget: number, customDur?: number) => {
      const st = stateRef.current;
      const now = performance.now();
      st.lastInteract = now;

      const prevTarget = st.target;
      const prevFlavour = st.activeFlavour;
      const nextFlavour = mod(nextTarget, FLAVOURS.length);
      const dir = nextTarget >= st.pos ? 1 : -1;

      st.target = nextTarget;

      if (st.reducedMotion) {
        st.pos = nextTarget;
        st.slideActive = false;
        if (nextFlavour !== prevFlavour) {
          triggerFlavourEffects(nextFlavour, dir, true);
        }
        return;
      }

      const dist = Math.abs(nextTarget - st.pos);
      const extraSlots = Math.max(0, Math.abs(nextTarget - prevTarget) - 1);
      const dur =
        customDur !== undefined
          ? customDur
          : dist < 0.01
            ? 250
            : 650 + 160 * extraSlots;

      st.slideActive = true;
      st.slideStartPos = st.pos;
      st.slideEndPos = nextTarget;
      st.slideStartTime = now;
      st.slideDur = dur;
      st.slideEase = easeGlide;
      st.slideSwapped = nextFlavour === prevFlavour;
      st.slideDir = nextTarget !== prevTarget ? (nextTarget > prevTarget ? 1 : -1) : dir;
    },
    [triggerFlavourEffects]
  );

  // Add items to cart
  const addToCart = useCallback((label: string, qty = 1) => {
    setCartCount((c) => c + qty);
    setCartItems((prev) => {
      const idx = prev.findIndex((x) => x.label === label);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], count: copy[idx].count + qty };
        return copy;
      }
      return [...prev, { label, count: qty }];
    });
    setBadgeKey((k) => k + 1);
  }, []);

  // Fly-to-cart animation (§11)
  const flyToCart = useCallback(
    (sourceEls: HTMLElement[], onAllLanded: () => void) => {
      const basketEl = basketRef.current;
      if (stateRef.current.reducedMotion || !basketEl || sourceEls.length === 0) {
        onAllLanded();
        return;
      }
      const bRect = basketEl.getBoundingClientRect();
      const bx = bRect.left + bRect.width / 2;
      const by = bRect.top + bRect.height / 2;

      sourceEls.forEach((srcEl, i) => {
        const sRect = srcEl.getBoundingClientRect();
        const cs = window.getComputedStyle(srcEl);
        const clone = document.createElement('div');
        clone.className = 'spr';
        clone.style.position = 'fixed';
        clone.style.left = `${sRect.left}px`;
        clone.style.top = `${sRect.top}px`;
        clone.style.width = `${sRect.width}px`;
        clone.style.height = `${sRect.height}px`;
        clone.style.zIndex = '70';
        clone.style.pointerEvents = 'none';
        clone.style.backgroundSize = cs.backgroundSize;
        clone.style.backgroundPosition = cs.backgroundPosition;
        clone.style.filter = 'drop-shadow(0 10px 14px rgba(0,0,0,.25))';
        clone.style.transformOrigin = 'center center';
        document.body.appendChild(clone);

        const sx = sRect.left + sRect.width / 2;
        const sy = sRect.top + sRect.height / 2;
        const dx = bx - sx;
        const dy = by - sy;
        const lift = Math.min(160, 0.35 * Math.abs(dy) + 60);
        const k = Math.min(0.2, 30 / Math.max(1, sRect.height));

        const anim = clone.animate(
          [
            {
              transform: 'translate(0px, 0px) scale(1) rotate(0deg)',
              opacity: 1,
            },
            {
              offset: 0.45,
              transform: `translate(${0.4 * dx}px, ${0.4 * dy - lift}px) scale(${0.45 + k}) rotate(-10deg)`,
              opacity: 1,
            },
            {
              transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(-18deg)`,
              opacity: 0.15,
            },
          ],
          {
            duration: 900,
            delay: i * 120,
            easing: 'cubic-bezier(.5, 0, .2, 1)',
            fill: 'forwards',
          }
        );

        anim.onfinish = () => {
          clone.remove();
          setBasketBump(false);
          requestAnimationFrame(() => setBasketBump(true));
          if (i === sourceEls.length - 1) {
            onAllLanded();
          }
        };
      });
    },
    []
  );

  // Enter hero from intro
  const enterHero = useCallback(() => {
    const st = stateRef.current;
    if (st.heroEntered) return;
    st.heroEntered = true;
    introPlayed = true;
    st.lastInteract = performance.now();

    document.body.classList.remove('locked');
    setNavIn(true);

    if (introRef.current) {
      introRef.current.classList.add('done');
      window.setTimeout(() => setIntroGone(true), 340);
    } else {
      setIntroGone(true);
    }

    ringsRef.current?.classList.add('in');

    if (st.reducedMotion) {
      st.pos = 1;
      st.target = 1;
      st.slideActive = false;
      playRef.current?.classList.add('in');
      countRef.current?.classList.add('in');
      autoRef.current?.classList.add('in');
      return;
    }

    window.setTimeout(() => playRef.current?.classList.add('in'), 500);
    window.setTimeout(() => countRef.current?.classList.add('in'), 620);
    window.setTimeout(() => autoRef.current?.classList.add('in'), 740);

    // Pos sweeps from -2.6 to 1 over 1700 ms
    st.pos = -2.6;
    st.target = 1;
    st.slideActive = true;
    st.slideStartPos = -2.6;
    st.slideEndPos = 1;
    st.slideStartTime = performance.now();
    st.slideDur = 1700;
    st.slideEase = easeEntrance;
    st.slideSwapped = true;

    // Bits fade in and drift forever
    if (bitsRef.current) {
      const bitEls = Array.from(bitsRef.current.children) as HTMLElement[];
      bitEls.forEach((el, i) => {
        const delay = 300 + 90 * i;
        el.animate([{ opacity: 0 }, { opacity: 0.6 }], {
          duration: 900,
          delay,
          easing: 'ease-out',
          fill: 'forwards',
        });

        const dx = (i % 2 === 0 ? 1 : -1) * (12 + (i % 3));
        const dy = -(22 + 3 * i);
        const rot = (i % 2 === 0 ? 1 : -1) * (10 + (i % 3));
        el.animate(
          [
            { transform: 'translate(0px, 0px) rotate(0deg)' },
            { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)` },
            { transform: 'translate(0px, 0px) rotate(0deg)' },
          ],
          {
            duration: 7000 + 900 * i,
            delay,
            easing: 'ease-in-out',
            iterations: Infinity,
            composite: 'add',
          }
        );
      });
    }
  }, []);

  // Main lifecycle: metrics, 3D engine, intro video, scroll & pointer handlers, rAF loop
  useEffect(() => {
    const st = stateRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    st.reducedMotion = reduced;
    st.autoOn = !reduced;

    // Initial title setup
    if (titleRef.current && titleRef.current.childElementCount === 0) {
      titleRef.current.appendChild(buildTitleLayer(FLAVOURS[1].name));
    }
    syncStormSprites(1);

    const updateMetrics = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const heroH = heroRef.current ? heroRef.current.getBoundingClientRect().height || vh : vh;
      st.vw = vw;
      st.vh = vh;
      st.heroH = heroH;

      if (glCanvasRef.current) {
        glCanvasRef.current.style.height = `${vh}px`;
      }

      if (vw < 820) {
        st.u = Math.min(vw / 560, heroH / 980);
        st.cx = vw / 2;
        st.cy = heroH * 0.4;
        st.xSpread = 1.02;
      } else {
        st.u = Math.min(vw / 1440, heroH / 900);
        st.cx = vw / 2;
        st.cy = heroH / 2 - 78 * st.u;
        st.xSpread = 1;
      }

      document.documentElement.style.setProperty('--u', `${st.u}px`);

      // Scale Section 2 back & front frames
      const k = vw < 820 ? Math.min(vw / 390, vh / 780) : Math.min(vw / 1440, vh / 900);
      if (inBackFrameRef.current) {
        inBackFrameRef.current.style.transform = `translate(-50%, -50%) scale(${k})`;
      }
      if (inFrontFrameRef.current) {
        inFrontFrameRef.current.style.transform = `translate(-50%, -50%) scale(${k})`;
      }

      // Position floating hero bits responsively
      if (bitsRef.current) {
        const bitEls = Array.from(bitsRef.current.children) as HTMLElement[];
        bitEls.forEach((el, idx) => {
          const cfg = HERO_BITS_LAYOUT[idx];
          const box = BITS[cfg.bit];
          if (vw < 820 && cfg.phoneHide) {
            el.style.display = 'none';
          } else {
            el.style.display = 'block';
            const mult = vw < 820 ? 1.3 : 1;
            const wPx = cfg.size * st.u * mult;
            const hPx = wPx * (box[3] / box[2]);
            el.style.width = `${wPx}px`;
            el.style.height = `${hPx}px`;
            el.style.left = `${cfg.x * 100}%`;
            el.style.top = `${cfg.y * 100}%`;
            el.style.transform = `translate(-50%, -50%) rotate(${cfg.rot}deg)`;
          }
        });
      }

      updateTitleSize(st.activeFlavour);
      engineRef.current?.updateSize(vw, vh);
      syncNavHighlight();
    };

    updateMetrics();
    window.addEventListener('resize', updateMetrics);
    document.fonts.ready.then(() => {
      updateTitleSize(st.activeFlavour);
      syncNavHighlight();
    });

    // Initialize 3D engine
    let mounted = true;
    if (glCanvasRef.current) {
      createStride3DEngine(glCanvasRef.current, () => {
        document.documentElement.classList.add('gl');
      })
        .then((eng) => {
          if (!mounted) {
            eng.dispose();
            return;
          }
          engineRef.current = eng;
          document.documentElement.classList.add('gl');
          eng.updateSize(st.vw, st.vh);
        })
        .catch((err) => {
          console.warn('WebGL init failed:', err);
        });
    }

    // Intro sequence
    const introStart = Math.max(0, Number(data.intro?.start) || 0);
    const introEnd = Number(data.intro?.end) || 0;
    let logoTriggered = false;
    let failsafeTimer = 0;
    let startTimeout = 0;

    const showLogoStampAndEnter = () => {
      if (logoTriggered || st.heroEntered) return;
      logoTriggered = true;
      window.clearTimeout(startTimeout);
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {
          // ignore
        }
      }
      setIntroCream(true);
      setStampShow(true);
      window.setTimeout(() => {
        enterHero();
      }, 380 + 650);
    };

    if (reduced || introPlayed || !INTRO_VIDEO_URL || data.intro?.show === false) {
      enterHero();
    } else {
      const video = videoRef.current;
      let playbackStarted = false;

      const beginVideo = () => {
        if (!video || logoTriggered || st.heroEntered) return;
        try {
          if (video.currentTime < introStart) video.currentTime = introStart;
        } catch {
          // ignore
        }
        const p = video.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            showLogoStampAndEnter();
          });
        }
      };

      if (video) {
        const onTimeUpdate = () => {
          if (video.currentTime >= introStart) playbackStarted = true;
          if (introEnd > introStart && video.currentTime >= introEnd) showLogoStampAndEnter();
        };
        const onPlaying = () => {
          playbackStarted = true;
        };
        const onEnded = () => showLogoStampAndEnter();
        const onError = () => showLogoStampAndEnter();
        const onCanPlay = () => beginVideo();

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('ended', onEnded);
        video.addEventListener('error', onError);

        if (video.readyState >= 3) {
          beginVideo();
        } else {
          video.addEventListener('canplay', onCanPlay, { once: true });
        }

        startTimeout = window.setTimeout(() => {
          if (!playbackStarted && !logoTriggered) {
            showLogoStampAndEnter();
          }
        }, 3500);

        failsafeTimer = window.setTimeout(() => {
          enterHero();
        }, 9000);
      } else {
        enterHero();
      }
    }

    // IntersectionObserver for #shop reveal + #range auto-fill
    const shopObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.18) {
            entry.target.classList.add('revealed');
            shopObs.unobserve(entry.target);
          }
        });
      },
      { threshold: [0.18] }
    );
    if (shopRef.current) shopObs.observe(shopRef.current);

    const rangeObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            rangeRef.current?.classList.add('revealed');
            if (!st.userTouchedPack && !st.rangeAutoFilled) {
              st.rangeAutoFilled = true;
              const base = st.activeFlavour;
              [250, 410, 570].forEach((delay, slotIdx) => {
                window.setTimeout(() => {
                  if (stateRef.current.userTouchedPack) return;
                  const fIdx = (base + slotIdx) % FLAVOURS.length;
                  setPackSlots((prev) => {
                    const next = [...prev];
                    next[slotIdx] = fIdx;
                    return next;
                  });
                  setGlowColor(hexWithAlpha(FLAVOURS[fIdx].color, 0.72));
                  if (glowRef.current) {
                    glowRef.current.classList.remove('pulse');
                    void glowRef.current.offsetWidth;
                    glowRef.current.classList.add('pulse');
                  }
                }, delay);
              });
            }
            rangeObs.unobserve(entry.target);
          }
        });
      },
      { threshold: [0.3] }
    );
    if (rangeRef.current) rangeObs.observe(rangeRef.current);

    // Keyboard navigation (← / → when hero >= 50% in view)
    const onKeyDown = (e: KeyboardEvent) => {
      if (st.heroEntered && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const hero = heroRef.current;
        if (hero) {
          const r = hero.getBoundingClientRect();
          const vis = Math.max(0, Math.min(r.bottom, st.vh) - Math.max(r.top, 0));
          if (vis >= r.height * 0.5) {
            e.preventDefault();
            goTo(st.target + (e.key === 'ArrowRight' ? 1 : -1));
            return;
          }
        }
      }
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) {
        st.smoothActive = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // Smooth wheel scrolling (desktop mouse/trackpad only)
    const isTouchDevice = 'ontouchstart' in window && navigator.maxTouchPoints > 0;
    const onWheel = (e: WheelEvent) => {
      if (
        st.reducedMotion ||
        document.body.classList.contains('locked') ||
        e.ctrlKey ||
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ||
        isTouchDevice
      ) {
        return;
      }
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= st.vh;

      if (!st.smoothActive) {
        st.smoothCurY = window.scrollY;
        st.smoothTargetY = window.scrollY;
        st.smoothActive = true;
      }
      const maxY = Math.max(0, document.documentElement.scrollHeight - st.vh);
      st.smoothTargetY = clamp(st.smoothTargetY + dy, 0, maxY);
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    const onWindowPointerDown = () => {
      if (!st.dragging) st.smoothActive = false;
    };
    window.addEventListener('pointerdown', onWindowPointerDown);

    // Hero arc pointer drag, tap, & cursor raycast
    const arcEl = arcRef.current;
    let pointerActive = false;
    let pointerId = -1;
    let downX = 0;
    let downY = 0;
    let pos0 = 0;
    let lastMoveX = 0;
    let lastMoveT = 0;
    let velocity = 0;
    let lastHoverCheck = 0;

    const finishDrag = (e: PointerEvent, isCancel: boolean) => {
      if (!pointerActive || e.pointerId !== pointerId) return;
      pointerActive = false;

      if (st.dragging) {
        st.dragging = false;
        document.body.classList.remove('dragging');
        try {
          arcEl?.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }

        if (isCancel && Math.abs(st.pos - Math.round(st.pos)) < 0.02) {
          goTo(Math.round(st.pos), 380);
          return;
        }
        const flick = clamp(velocity * 220, -2, 2);
        const snapTo = Math.round(st.pos + flick);
        const snapDur = Math.max(380, 650 * Math.min(1, Math.abs(snapTo - st.pos) + 0.35));
        goTo(snapTo, snapDur);
      } else if (!isCancel) {
        // Tap or click (moved <= 6px) -> raycast against visible 3D bars
        const eng = engineRef.current;
        if (eng) {
          const hit = eng.raycastPool(e.clientX, e.clientY, st.vw, st.vh);
          if (hit) {
            const slotIdx = Math.round(st.target + hit.slotOffset);
            if (hit.slotOffset !== 0) {
              goTo(slotIdx);
            } else {
              // Clicking center bar advances or resets interaction
              st.lastInteract = performance.now();
            }
          }
        }
      }
    };

    const onArcPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !st.heroEntered) return;
      pointerActive = true;
      pointerId = e.pointerId;
      downX = e.clientX;
      downY = e.clientY;
      pos0 = st.pos;
      lastMoveX = e.clientX;
      lastMoveT = performance.now();
      velocity = 0;
      st.lastInteract = lastMoveT;
    };

    const onArcPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (pointerActive && e.pointerId === pointerId) {
        st.lastInteract = now;
        const dx = e.clientX - downX;
        const dy = e.clientY - downY;

        if (!st.dragging && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 0.8) {
          st.dragging = true;
          st.slideActive = false;
          document.body.classList.add('dragging');
          try {
            arcEl?.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }

        if (st.dragging) {
          const slotPx = Math.max(40, 245 * st.u * st.xSpread);
          const nextPos = pos0 - dx / slotPx;
          const dt = Math.max(1, now - lastMoveT);
          const instVel = -(e.clientX - lastMoveX) / slotPx / dt;
          velocity = lerp(velocity, instVel, 0.4);
          st.pos = nextPos;
          lastMoveX = e.clientX;
          lastMoveT = now;
        }
        return;
      }

      // Mouse hover cursor check (throttled ~40ms)
      if (e.pointerType === 'mouse' && arcEl && now - lastHoverCheck > 40) {
        lastHoverCheck = now;
        const eng = engineRef.current;
        if (eng) {
          const hit = eng.raycastPool(e.clientX, e.clientY, st.vw, st.vh);
          arcEl.classList.toggle('over-bar', Boolean(hit));
        }
      }
    };

    const onArcPointerUp = (e: PointerEvent) => finishDrag(e, false);
    const onArcPointerCancel = (e: PointerEvent) => finishDrag(e, true);

    if (arcEl) {
      arcEl.addEventListener('pointerdown', onArcPointerDown);
      arcEl.addEventListener('pointermove', onArcPointerMove);
      arcEl.addEventListener('pointerup', onArcPointerUp);
      arcEl.addEventListener('pointercancel', onArcPointerCancel);
    }

    // Main animation frame loop
    let rafId = 0;
    let disposed = false;

    const frame = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(64, Math.max(1, now - st.lastFrameTime));
      st.lastFrameTime = now;

      // 1. Smooth scroll glide
      if (st.smoothActive) {
        st.smoothCurY += (st.smoothTargetY - st.smoothCurY) * (1 - Math.exp(-dt / 120));
        window.scrollTo(0, st.smoothCurY);
        if (Math.abs(st.smoothTargetY - st.smoothCurY) <= 0.5) {
          window.scrollTo(0, st.smoothTargetY);
          st.smoothActive = false;
        }
      }

      // 2. Hero Autoplay (3200 ms of no interaction, >= 60% in view, tab visible)
      if (
        st.heroEntered &&
        st.autoOn &&
        !st.dragging &&
        !st.slideActive &&
        !st.reducedMotion &&
        document.visibilityState === 'visible' &&
        now - st.lastInteract >= 3200
      ) {
        const heroEl = heroRef.current;
        if (heroEl) {
          const hr = heroEl.getBoundingClientRect();
          const vis = Math.max(0, Math.min(hr.bottom, st.vh) - Math.max(hr.top, 0));
          if (vis >= hr.height * 0.6) {
            goTo(st.target + 1);
          } else {
            st.lastInteract = now;
          }
        }
      }

      // 3. Hero slide tween
      if (st.slideActive) {
        const t = clamp((now - st.slideStartTime) / st.slideDur, 0, 1);
        const eased = st.slideEase(t);
        st.pos = lerp(st.slideStartPos, st.slideEndPos, eased);

        if (!st.slideSwapped && t >= 0.12) {
          st.slideSwapped = true;
          const nextFlav = mod(st.target, FLAVOURS.length);
          if (nextFlav !== st.activeFlavour) {
            triggerFlavourEffects(nextFlav, st.slideDir, false);
          }
        }

        if (t >= 1) {
          st.pos = st.slideEndPos;
          st.slideActive = false;
        }
      }

      // 4. Feathered colour reveal circle (420 ms)
      if (st.revealActive && revealRef.current) {
        const t = clamp((now - st.revealStartTime) / 420, 0, 1);
        const c1 = Math.hypot(st.cx, st.cy);
        const c2 = Math.hypot(st.vw - st.cx, st.cy);
        const c3 = Math.hypot(st.cx, st.heroH - st.cy);
        const c4 = Math.hypot(st.vw - st.cx, st.heroH - st.cy);
        const R = 1.45 * Math.max(c1, c2, c3, c4);
        const r = R * easeGlide(t);
        const f = Math.max(60, 0.35 * r);
        const mask = `radial-gradient(circle at ${st.cx}px ${st.cy}px, #000 ${Math.max(0, r - f)}px, transparent ${r}px)`;
        revealRef.current.style.maskImage = mask;
        revealRef.current.style.webkitMaskImage = mask;

        if (t >= 1) {
          st.revealActive = false;
          st.flavColor = st.revealColor;
          document.documentElement.style.setProperty('--flav', st.flavColor);
          revealRef.current.style.setProperty('--rv', 'transparent');
          revealRef.current.style.maskImage = '';
          revealRef.current.style.webkitMaskImage = '';
          revealRef.current.style.clipPath = 'circle(0 at 50% 50%)';
        }
      }

      // 5. Nav active link & theme tracking
      const sections: Array<{ id: 'flavors' | 'inside' | 'shop' | 'range'; el: HTMLElement | null }> = [
        { id: 'flavors', el: heroRef.current },
        { id: 'inside', el: insideRef.current },
        { id: 'shop', el: shopRef.current },
        { id: 'range', el: rangeRef.current },
      ];
      let currentActive: 'flavors' | 'inside' | 'shop' | 'range' = 'flavors';
      const thresholdY = st.vh * 0.35;
      for (const s of sections) {
        if (s.el && s.el.getBoundingClientRect().top <= thresholdY) {
          currentActive = s.id;
        }
      }
      setActiveNav((prev) => (prev === currentActive ? prev : currentActive));

      // Light / dark nav class based on section under top bar (nav height ~45px)
      const shopTop = shopRef.current ? shopRef.current.getBoundingClientRect().top : 9999;
      const rangeTop = rangeRef.current ? rangeRef.current.getBoundingClientRect().top : 9999;
      const nextTheme: 'default' | 'light' | 'dark' =
        rangeTop <= 48 ? 'dark' : shopTop <= 48 ? 'light' : 'default';
      setNavTheme((prev) => (prev === nextTheme ? prev : nextTheme));

      // 6. Section 2 sticky front layer, scroll mapping, step flip & storm
      let p1 = 0;
      let p3 = 0;
      let q = 0;

      const insideEl = insideRef.current;
      const shopEl = shopRef.current;

      if (insideEl) {
        const inRect = insideEl.getBoundingClientRect();
        p1 = clamp(1 - inRect.top / st.vh, 0, 1);

        // Pin #inFront like sticky
        if (inFrontRef.current) {
          if (inRect.bottom <= 0 || inRect.top >= st.vh) {
            inFrontRef.current.style.visibility = 'hidden';
          } else {
            inFrontRef.current.style.visibility = 'visible';
            const pinY =
              inRect.top > 0
                ? inRect.top
                : inRect.bottom < st.vh
                  ? inRect.bottom - st.vh
                  : 0;
            inFrontRef.current.style.transform = `translate3d(0, ${pinY}px, 0)`;
          }
        }

        const denom = Math.max(1, inRect.height - st.vh);
        const p = clamp(-inRect.top / denom, 0, 1);
        const newStep = Math.floor(Math.min(p, 0.759) / 0.19);
        q = clamp((p - 0.76) / 0.24, 0, 1);

        if (newStep !== st.step) {
          st.step = newStep;
          setActiveStep(newStep);
          const targetAngle = INSIDE_STEPS[newStep].ry;

          if (st.reducedMotion) {
            st.flipAngle = targetAngle;
            st.flipActive = false;
          } else {
            st.flipStartAngle = st.flipAngle;
            st.flipTargetAngle = targetAngle;
            const halfTurns = clamp(Math.abs(targetAngle - st.flipAngle) / 180, 0.4, 2);
            st.flipDur = 720 * halfTurns;
            st.flipStartTime = now;
            st.flipActive = true;
          }

          window.clearTimeout(st.textSwapTimeout);
          const textDelay = st.reducedMotion ? 0 : 0.38 * Math.min(st.flipDur, 720);
          st.textSwapTimeout = window.setTimeout(() => {
            const stepData = INSIDE_STEPS[newStep];
            const instant = st.reducedMotion;
            // {flavour} in a step's title becomes the flavour on show, one word per line.
            const fName = FLAVOURS[st.activeFlavour]?.name.toUpperCase() || '';
            const head = stepData.head.flatMap((l) => (l.includes('{flavour}') ? l.replace(/\{flavour\}/g, fName).split(' ') : [l]));
            const hasLong = head.some((w) => w.length > 9);
            inHeadRef.current?.classList.toggle('compact', hasLong);
            crossfadeEl(inHeadRef.current, htmlLines(head), 240, 40, 460, instant);
            crossfadeEl(inNumRef.current, htmlLines([stepData.num]), 240, 40, 460, instant);
            crossfadeEl(inCapRef.current, htmlLines(stepData.cap), 240, 40, 460, instant);
          }, textDelay);
        }

        // Flip tween
        if (st.flipActive) {
          const ft = clamp((now - st.flipStartTime) / st.flipDur, 0, 1);
          st.flipAngle = lerp(st.flipStartAngle, st.flipTargetAngle, easeInOutSine(ft));
          if (ft >= 1) {
            st.flipAngle = st.flipTargetAngle;
            st.flipActive = false;
          }
        }

        // Storm darkening & fade
        const frontFade = 1 - clamp(4 * q, 0, 1);
        if (inFrontFrameRef.current) {
          inFrontFrameRef.current.style.opacity = String(frontFade);
        }
        if (inNumRef.current) {
          inNumRef.current.style.opacity = String(frontFade);
        }
        if (inDarkRef.current) {
          inDarkRef.current.style.opacity = String(clamp(3.5 * q, 0, 1) * 0.42);
        }

        // Storm pieces
        if (stormRef.current && !st.reducedMotion) {
          const pieces = Array.from(stormRef.current.children) as HTMLElement[];
          if (q <= 0 || q >= 1) {
            pieces.forEach((el) => {
              el.style.opacity = '0';
            });
          } else {
            const R = 0.55 * Math.hypot(st.vw, st.vh);
            const baseSize = 0.085 * Math.min(st.vw, st.vh);
            const envOp = clamp(5 * q, 0, 1) * clamp(6 * (1 - q), 0, 1);

            pieces.forEach((el, idx) => {
              const seed = STORM_SEEDS[idx];
              const s = clamp((q - 0.45 * seed.ph) / 0.55, 0, 1);
              if (s <= 0 || s >= 1) {
                el.style.opacity = '0';
                return;
              }
              const radius = (0.06 + Math.pow(s, 1.5) * 0.95) * R;
              const px = st.vw / 2 + Math.cos(seed.angle) * radius;
              const py = st.vh / 2 + Math.sin(seed.angle) * radius * 0.8;
              const sc = (0.2 + 1.7 * s) * seed.sizeFactor;
              const rot = seed.spin * s;
              const op = Math.sin(Math.PI * s) * envOp;
              const aspect = parseFloat(el.dataset.aspect || '1');

              el.style.width = `${baseSize}px`;
              el.style.height = `${baseSize * aspect}px`;
              el.style.opacity = String(op);
              el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%) scale(${sc}) rotate(${rot}deg)`;
            });
          }
        }
      }

      if (shopEl) {
        const shopRect = shopEl.getBoundingClientRect();
        p3 = clamp((st.vh - shopRect.top) / (0.7 * st.vh), 0, 1);

        // On phones, first time p3 > 0 smoothly scroll cards strip to centre live card
        if (p3 > 0 && st.vw < 820 && !st.phoneShopCentered && cardsRef.current) {
          st.phoneShopCentered = true;
          const liveCard = cardRefs.current[st.activeFlavour];
          if (liveCard) {
            const targetScroll =
              liveCard.offsetLeft - (cardsRef.current.clientWidth - liveCard.offsetWidth) / 2;
            cardsRef.current.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
          }
        }
      }

      // 7. Position all 3D bars in Three.js
      const eng = engineRef.current;
      if (eng) {
        const jT = Math.round(st.target);
        const floorPos = Math.floor(st.pos);
        const otherFade = 1 - clamp(1.6 * p1, 0, 1);

        const computeHeroPose = (j: number): BarPose => {
          const k = j - st.pos;
          const absK = Math.abs(k);
          const signK = k >= 0 ? 1 : -1;
          const slot = sampleArcSlot(absK);
          const b = st.reducedMotion ? 0 : Math.sin((now / 4600) * Math.PI * 2 + 1.37 * j);
          const floatY = st.reducedMotion ? 0 : (0.5 * b + 0.5) * 9 * st.u;
          const floatRz = st.reducedMotion ? 0 : 0.4 * b;
          const op = absK <= 3.3 ? 1 : clamp(1 - (absK - 3.3) / 0.6, 0, 1);
          return {
            x: st.cx + signK * slot.dx * st.u * st.xSpread,
            y: st.cy + slot.dy * st.u - floatY,
            h: slot.h * st.u,
            rz: signK * slot.rz + floatRz,
            ry: signK * slot.ry,
            rx: 0,
            z: -Math.min(absK, 4) * 34 * st.u,
            op,
            sx: 1,
            sy: 1,
            shadow: 1,
          };
        };

        // Pool of 11 bars: floorPos - 5 ... floorPos + 5
        let poolIdx = 0;
        for (let j = floorPos - 5; j <= floorPos + 5; j++) {
          if (j === jT) continue;
          const bar = eng.pool[poolIdx++];
          if (!bar) break;
          bar.slotOffset = j - st.target;
          eng.setBarFlavour(bar, mod(j, FLAVOURS.length));
          const pose = computeHeroPose(j);
          pose.op *= otherFade;
          eng.placeBar(bar, pose, st.vw, st.vh);
        }
        while (poolIdx < eng.pool.length) {
          const bar = eng.pool[poolIdx++];
          bar.group.visible = false;
          bar.shadowMesh.visible = false;
        }

        // Traveller bar (jT)
        const travFlavour = mod(jT, FLAVOURS.length);
        eng.traveller.slotOffset = jT - st.target;
        eng.setBarFlavour(eng.traveller, travFlavour);

        const poseA = computeHeroPose(jT);
        let finalPose: BarPose = { ...poseA };

        // Anchor B (section 2)
        const stormSpin = st.reducedMotion ? 0 : 720 * q;
        const bob = st.reducedMotion ? 0 : Math.sin((now / 2600) * Math.PI * 2) * 6;
        let poseB: BarPose = { ...poseA };
        if (inBarRef.current) {
          const br = inBarRef.current.getBoundingClientRect();
          poseB = {
            x: br.left + br.width / 2,
            y: br.top + br.height / 2 + bob,
            h: br.height,
            rz: 14,
            ry: st.flipAngle + stormSpin,
            rx: 0,
            z: 0,
            op: 1,
            sx: 1,
            sy: 1,
            shadow: 1,
          };
        }

        // Anchor C (live shop card)
        let poseC: BarPose = { ...poseB };
        const livePk = cardPkRefs.current[travFlavour];
        if (livePk) {
          const pr = livePk.getBoundingClientRect();
          const tilt = st.cardTilts[travFlavour];
          const nearestTurn = Math.round(poseB.ry / 360) * 360;

          // Live squash poke
          let psx = 1;
          let psy = 1;
          if (st.pokeStartTime >= 0) {
            const pt = (now - st.pokeStartTime) / 500;
            if (pt >= 1) {
              st.pokeStartTime = -1;
            } else if (pt < 0.3) {
              const u = pt / 0.3;
              psx = lerp(1, 1.06, u);
              psy = lerp(1, 0.93, u);
            } else if (pt < 0.6) {
              const u = (pt - 0.3) / 0.3;
              psx = lerp(1.06, 0.97, u);
              psy = lerp(0.93, 1.04, u);
            } else {
              const u = (pt - 0.6) / 0.4;
              psx = lerp(0.97, 1, u);
              psy = lerp(1.04, 1, u);
            }
          }

          poseC = {
            x: pr.left + pr.width / 2,
            y: pr.top + pr.height / 2,
            h: pr.height * ((eng.cameraD - 30) / eng.cameraD),
            rz: 0,
            ry: nearestTurn + tilt.x * 14,
            rx: -tilt.y * 14,
            z: 30,
            op: 1,
            sx: psx,
            sy: psy,
            shadow: 0.7,
          };
        }

        if (p1 > 0) {
          const e1 = easeInOutSine(p1);
          finalPose = {
            x: lerp(finalPose.x, poseB.x, e1),
            y: lerp(finalPose.y, poseB.y, e1),
            h: lerp(finalPose.h, poseB.h, e1),
            rz: lerp(finalPose.rz, poseB.rz, e1),
            ry: lerp(finalPose.ry, poseB.ry, e1),
            rx: lerp(finalPose.rx, poseB.rx, e1),
            z: lerp(finalPose.z, poseB.z, e1),
            op: lerp(finalPose.op, poseB.op, e1),
            sx: lerp(finalPose.sx, poseB.sx, e1),
            sy: lerp(finalPose.sy, poseB.sy, e1),
            shadow: lerp(finalPose.shadow, poseB.shadow, e1),
          };
        }
        if (p3 > 0) {
          const e3 = easeInOutSine(p3);
          finalPose = {
            x: lerp(finalPose.x, poseC.x, e3),
            y: lerp(finalPose.y, poseC.y, e3),
            h: lerp(finalPose.h, poseC.h, e3),
            rz: lerp(finalPose.rz, poseC.rz, e3),
            ry: lerp(finalPose.ry, poseC.ry, e3),
            rx: lerp(finalPose.rx, poseC.rx, e3),
            z: lerp(finalPose.z, poseC.z, e3),
            op: lerp(finalPose.op, poseC.op, e3),
            sx: lerp(finalPose.sx, poseC.sx, e3),
            sy: lerp(finalPose.sy, poseC.sy, e3),
            shadow: lerp(finalPose.shadow, poseC.shadow, e3),
          };
        }

        eng.placeBar(eng.traveller, finalPose, st.vw, st.vh);
        eng.render();

        if (eng.isSoftwareGl) {
          rafId = eng.afterDraw(frame);
        } else {
          rafId = requestAnimationFrame(frame);
        }
      } else {
        rafId = requestAnimationFrame(frame);
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      mounted = false;
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(rafId);
      window.clearTimeout(failsafeTimer);
      window.clearTimeout(startTimeout);
      window.clearTimeout(st.textSwapTimeout);
      window.removeEventListener('resize', updateMetrics);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', onWindowPointerDown);
      if (arcEl) {
        arcEl.removeEventListener('pointerdown', onArcPointerDown);
        arcEl.removeEventListener('pointermove', onArcPointerMove);
        arcEl.removeEventListener('pointerup', onArcPointerUp);
        arcEl.removeEventListener('pointercancel', onArcPointerCancel);
      }
      shopObs.disconnect();
      rangeObs.disconnect();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [buildTitleLayer, crossfadeEl, enterHero, goTo, syncNavHighlight, syncStormSprites, triggerFlavourEffects, updateTitleSize]);

  // Scroll smoothly to a target Y
  const scrollToTargetY = useCallback((targetY: number) => {
    const st = stateRef.current;
    if (st.reducedMotion) {
      window.scrollTo(0, targetY);
      return;
    }
    const isTouch = 'ontouchstart' in window && navigator.maxTouchPoints > 0;
    if (isTouch) {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
      return;
    }
    if (!st.smoothActive) {
      st.smoothCurY = window.scrollY;
      st.smoothActive = true;
    }
    const maxY = Math.max(0, document.documentElement.scrollHeight - st.vh);
    st.smoothTargetY = clamp(targetY, 0, maxY);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: 'flavors' | 'inside' | 'shop' | 'range') => {
    e.preventDefault();
    setPopover(null);
    const el = document.getElementById(id);
    if (!el) return;
    const top = window.scrollY + el.getBoundingClientRect().top;
    scrollToTargetY(top);
  };

  const handleInsideIconClick = (stepIdx: number) => {
    const el = insideRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const docTop = window.scrollY + rect.top;
    const targetP = stepIdx * 0.19 + 0.095;
    const targetY = docTop + targetP * (rect.height - window.innerHeight);
    scrollToTargetY(targetY);
  };

  // Shop card pointer tilt & click poke
  const handleCardPointerMove = (idx: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || stateRef.current.reducedMotion) return;
    const card = cardRefs.current[idx];
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
    const y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
    stateRef.current.cardTilts[idx] = { x, y };
    card.classList.add('tilting');
    card.style.transform = `translateY(-8px) rotateX(${-y * 12}deg) rotateY(${x * 12}deg)`;
    card.style.boxShadow = '0 24px 40px -18px rgba(40,30,20,.35)';
  };

  const handleCardPointerLeave = (idx: number) => {
    const card = cardRefs.current[idx];
    stateRef.current.cardTilts[idx] = { x: 0, y: 0 };
    if (!card) return;
    card.classList.remove('tilting');
    card.style.transform = '';
    card.style.boxShadow = '';
  };

  const handleCardPointerDown = (idx: number, e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.add-btn')) return;
    const card = cardRefs.current[idx];
    if (!card || stateRef.current.reducedMotion) return;
    card.style.transform = `${card.style.transform || ''} scale(0.97)`.trim();
  };

  const handleCardClick = (idx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.add-btn')) return;
    const card = cardRefs.current[idx];
    if (card) {
      card.style.transform = card.style.transform.replace(/\s*scale\(0\.97\)/, '');
    }
    if (idx === stateRef.current.activeFlavour) {
      stateRef.current.pokeStartTime = performance.now();
    } else {
      const pk = cardPkRefs.current[idx];
      if (pk) {
        pk.classList.remove('poking');
        void pk.offsetWidth;
        pk.classList.add('poking');
      }
    }
  };

  const handleCardAdd = (idx: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const pk = cardPkRefs.current[idx];
    const flav = FLAVOURS[idx];
    if (pk) {
      flyToCart([pk], () => addToCart(tpl(data.cart?.bar, { flavour: flav.name }), 1));
    } else {
      addToCart(tpl(data.cart?.bar, { flavour: flav.name }), 1);
    }
  };

  // Builder interactions
  const handleThumbClick = (flavIdx: number) => {
    stateRef.current.userTouchedPack = true;
    const emptyIdx = packSlots.findIndex((s) => s === null);
    setPackSlots((prev) => {
      // A full pack swaps out its oldest bar, so a flavour tap always does something.
      if (emptyIdx === -1) return [...prev.slice(1), flavIdx];
      const next = [...prev];
      next[emptyIdx] = flavIdx;
      return next;
    });
    setGlowColor(hexWithAlpha(FLAVOURS[flavIdx].color, 0.72));
    if (glowRef.current) {
      glowRef.current.classList.remove('pulse');
      void glowRef.current.offsetWidth;
      glowRef.current.classList.add('pulse');
    }
  };

  const handleSlotRemove = (slotIdx: number) => {
    stateRef.current.userTouchedPack = true;
    setPackSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    if (glowRef.current) {
      glowRef.current.classList.remove('pulse');
      void glowRef.current.offsetWidth;
      glowRef.current.classList.add('pulse');
    }
  };

  const filledCount = packSlots.filter((s) => s !== null).length;
  const remainingCount = 3 - filledCount;

  const handleBuyPack = () => {
    if (remainingCount > 0 || buyAdded) return;
    stateRef.current.userTouchedPack = true;
    const els = slotBarRefs.current.filter((el): el is HTMLDivElement => el !== null);
    const chosenNames = packSlots
      .map((f) => (f !== null ? FLAVOURS[f].name : ''))
      .filter(Boolean)
      .join(', ');

    flyToCart(els, () => addToCart(tpl(data.cart?.pack, { flavours: chosenNames }), 1));

    window.setTimeout(() => {
      setPackSlots([null, null, null]);
      setBuyAdded(true);
      window.setTimeout(() => {
        setBuyAdded(false);
      }, 1600);
    }, 60);
  };

  return (
    <>
      {/* Layer 2: Fixed WebGL Canvas — MUST be first element */}
      <canvas id="gl" ref={glCanvasRef} />

      {/* Layer 100: Intro Video & Logo Stamp */}
      {!introGone && (
        <div id="intro" ref={introRef} className={introCream ? 'cream' : ''}>
          <video
            ref={videoRef}
            src={INTRO_VIDEO_URL}
            muted
            playsInline
            preload="auto"
          />
          <button id="skip" type="button" onClick={enterHero}>
            {f(data.intro?.skip)}
          </button>
          <div className={`intro-stamp ${stampShow ? 'show' : ''}`} aria-hidden="true">
            {data.brand?.showMark !== false && <BrandMarkSvg className="mark brand-mark" />}
            <span className="word">{f(data.brand?.name).toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* Layer 50: Fixed Nav */}
      <header
        ref={navRef}
        className={`nav ${navIn ? 'in' : ''} ${navTheme === 'light' ? 'light' : ''} ${navTheme === 'dark' ? 'dark' : ''}`}
      >
        <a
          className="brand"
          href="#flavors"
          onClick={(e) => handleNavClick(e, 'flavors')}
        >
          {data.brand?.showMark !== false && <BrandMarkSvg className="brand-mark" />}
          <span className="brand-word">{f(data.brand?.name).toUpperCase()}</span>
        </a>

        <nav className="nav-pill" ref={navPillRef} aria-label="Primary">
          <div className="nav-hl" ref={navHlRef} />
          {(['flavors', 'inside', 'shop', 'range'] as const).map((id) => {
            const label = f(data.nav?.[id]);
            return (
              <a
                key={id}
                ref={(el) => {
                  navLinkRefs.current[id] = el;
                }}
                href={`#${id}`}
                className={`nav-link ${activeNav === id ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, id)}
              >
                {label}
              </a>
            );
          })}
        </nav>

        <div className="nav-right">
          <button
            type="button"
            className="nav-chip"
            onClick={() => {
              setPopover(null);
              const el = rangeRef.current;
              if (el) scrollToTargetY(window.scrollY + el.getBoundingClientRect().top);
            }}
          >
            {f(data.nav?.offer)}
          </button>
          <button
            ref={basketRef}
            type="button"
            className={`nav-basket ${basketBump ? 'bump' : ''}`}
            aria-label={`Shopping cart (${cartCount} items)`}
            onClick={() => setPopover((p) => (p === 'cart' ? null : 'cart'))}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span
              key={badgeKey}
              className={`cart-badge ${cartCount > 0 ? 'show pop' : ''}`}
            >
              {cartCount}
            </span>
          </button>
          <button
            type="button"
            className="nav-cta"
            onClick={() => setPopover((p) => (p === 'dibs' ? null : 'dibs'))}
          >
            {f(data.nav?.dibs)}
          </button>
        </div>
      </header>

      {/* Optional clean popovers for Basket & First dibs */}
      {popover === 'cart' && (
        <div className="nav-popover" role="dialog" aria-label="Cart summary">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontFamily: 'var(--f-display, "Archivo Black"), sans-serif', fontSize: 15 }}>{f(data.cart?.title)} ({cartCount})</strong>
            <button
              type="button"
              onClick={() => setPopover(null)}
              style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'inherit' }}
              aria-label="Close cart"
            >
              ×
            </button>
          </div>
          {cartItems.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, opacity: 0.72, fontFamily: 'var(--f-mono, "DM Mono"), monospace' }}>
              {f(data.cart?.empty)}
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {cartItems.map((it) => (
                <li
                  key={it.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                    fontFamily: 'var(--f-mono, "DM Mono"), monospace',
                    borderBottom: '1px solid rgba(28,26,31,0.1)',
                    paddingBottom: 6,
                  }}
                >
                  <span>{it.label}</span>
                  <strong>×{it.count}</strong>
                </li>
              ))}
            </ul>
          )}
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCartCount(0);
                setCartItems([]);
              }}
              style={{
                marginTop: 12,
                width: '100%',
                height: 36,
                borderRadius: 99,
                border: '1px solid rgba(28,26,31,0.2)',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: 'inherit',
              }}
            >
              {f(data.cart?.clear)}
            </button>
          )}
          {cartItems.length > 0 && safeHref(data.cart?.checkout) && (
            <a
              href={safeHref(data.cart?.checkout)}
              style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 36,
                borderRadius: 99,
                background: 'var(--ink)',
                color: 'var(--cream)',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {f(data.cart?.checkoutLabel)}
            </a>
          )}
        </div>
      )}

      {popover === 'dibs' && (
        <div className="nav-popover" role="dialog" aria-label="First dibs early access">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontFamily: 'var(--f-display, "Archivo Black"), sans-serif', fontSize: 15 }}>{f(data.dibs?.title)}</strong>
            <button
              type="button"
              onClick={() => setPopover(null)}
              style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'inherit' }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {dibsSaved ? (
            <p style={{ margin: 0, fontSize: 13, fontFamily: 'var(--f-mono, "DM Mono"), monospace' }}>
              {f(data.dibs?.thanks)}
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!dibsEmail.trim()) return;
                const action = safeHref(data.dibs?.formAction);
                const to = String(data.dibs?.email || '').trim();
                if (action.startsWith('https:')) {
                  const body = new FormData();
                  body.append('email', dibsEmail);
                  fetch(action, { method: 'POST', body, headers: { Accept: 'application/json' } }).catch(() => undefined);
                } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
                  window.location.href = `mailto:${to}?subject=${encodeURIComponent(f(data.dibs?.title))}&body=${encodeURIComponent(dibsEmail)}`;
                }
                setDibsSaved(true);
              }}
              style={{ display: 'grid', gap: 8 }}
            >
              <p style={{ margin: 0, fontSize: 12.5, fontFamily: 'var(--f-mono, "DM Mono"), monospace', opacity: 0.78 }}>
                {f(data.dibs?.text)}
              </p>
              <input
                type="email"
                required
                placeholder={f(data.dibs?.placeholder)}
                value={dibsEmail}
                onChange={(e) => setDibsEmail(e.target.value)}
                style={{
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(28,26,31,0.22)',
                  background: '#fff',
                  fontSize: 13,
                  color: '#1c1a1f',
                }}
              />
              <button
                type="submit"
                style={{
                  height: 36,
                  borderRadius: 99,
                  border: 0,
                  background: '#1c1a1f',
                  color: '#f0e8e0',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {f(data.dibs?.button)}
              </button>
            </form>
          )}
        </div>
      )}

      <main>
        {/* SECTION 1: HERO CAROUSEL */}
        <section id="flavors" ref={heroRef}>
          <div className="reveal" ref={revealRef} />
          <div className="rings" ref={ringsRef} />
          <div className="bits" ref={bitsRef}>
            {HERO_BITS_LAYOUT.map((cfg, i) => {
              const css = spriteCss(BITS[cfg.bit], 0);
              return (
                <div
                  key={i}
                  className="bit spr"
                  style={{
                    backgroundSize: css.backgroundSize,
                    backgroundPosition: css.backgroundPosition,
                  }}
                />
              );
            })}
          </div>
          <div className="arc" ref={arcRef} />

          <button
            id="play"
            ref={playRef}
            type="button"
            aria-label={f(data.hero?.next)}
            onClick={() => goTo(stateRef.current.target + 1)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </button>

          <h1 id="title" className="disp" aria-live="polite" ref={titleRef} />

          <div id="count" className="disp" ref={countRef}>
            02
          </div>

          <button
            id="auto"
            ref={autoRef}
            type="button"
            aria-pressed={autoOn}
            onClick={() => {
              stateRef.current.lastInteract = performance.now();
              setAutoOn((v) => !v);
            }}
          >
            <span className="ring">
              {autoOn ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                  <rect x="2" y="1.5" width="2" height="7" rx="1" />
                  <rect x="6" y="1.5" width="2" height="7" rx="1" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                  <path d="M2.5 1.8 L8.5 5 L2.5 8.2 Z" />
                </svg>
              )}
            </span>
            <span className="lbl">{f(data.hero?.autoplay)}</span>
          </button>
        </section>

        {/* The 3D character on its gradient, between the flavours and the inside story. */}
        {hasCharacter(data) && (
          <section className={`stride-char-band ${stageClass(data, 'light')}`} style={stageStyle(data, [50, 60])} aria-label={f(data.character?.name) || f(data.brand?.name)}>
            <p className="disp stride-char-word" aria-hidden="true">
              {f(data.brand?.name).toUpperCase()}
            </p>
            <CharacterSlot data={data} className="stride-char" />
          </section>
        )}

        {/* SECTION 2: INSIDE (Pinned) */}
        <section id="inside" ref={insideRef}>
          <div className="pin">
            <div className="in-dark" ref={inDarkRef} />
            <div className="in-frame in-back" ref={inBackFrameRef}>
              <div className="in-num disp" ref={inNumRef}>
                01
              </div>
              <div id="inBar" ref={inBarRef} />
            </div>
          </div>
        </section>

        {/* SECTION 2 FRONT LAYER (Layer 3, above canvas) */}
        <div id="inFront" ref={inFrontRef}>
          <div className="in-frame in-front" ref={inFrontFrameRef}>
            <h2 className="in-head disp" ref={inHeadRef}>
              {INSIDE_STEPS[0].head.map((l, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {l}
                </span>
              ))}
            </h2>
            <div className="in-icons" role="tablist" aria-label="Inside steps">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={activeStep === i}
                  aria-label={`Step 0${i + 1}`}
                  className={`in-ico ${activeStep === i ? 'active' : ''}`}
                  onClick={() => handleInsideIconClick(i)}
                >
                  <InsideIconSvg index={i} />
                </button>
              ))}
            </div>
            <p className="in-cap" ref={inCapRef}>
              {INSIDE_STEPS[0].cap.map((l, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {l}
                </span>
              ))}
            </p>
          </div>
          <div className="storm" ref={stormRef}>
            {STORM_SEEDS.map((_, i) => (
              <div key={i} className="storm-piece spr" />
            ))}
          </div>
        </div>

        {/* SECTION 3: SHOP */}
        <section id="shop" ref={shopRef}>
          <h2 className="shop-head disp">
            {lines(data.shop?.title, data).map((l, i) => (
              <span key={i} className="line-mask">
                <span className="line-inner">{l}</span>
              </span>
            ))}
          </h2>

          <p className="shop-cap">
            {lines(data.shop?.text, data).map((l, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {l}
              </span>
            ))}
          </p>

          <div className="cards" ref={cardsRef}>
            {FLAVOURS.map((flav, idx) => {
              const css = spriteCss(flav.box, 4);
              const isLive = idx === activeFlavour;
              return (
                <div
                  key={flav.id}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
                  }}
                  className={`card ${isLive ? 'live' : ''}`}
                  style={{
                    background: flav.color,
                    transitionDelay: `${idx * 80}ms`,
                  }}
                  onPointerMove={(e) => handleCardPointerMove(idx, e)}
                  onPointerLeave={() => handleCardPointerLeave(idx)}
                  onPointerDown={(e) => handleCardPointerDown(idx, e)}
                  onClick={(e) => handleCardClick(idx, e)}
                >
                  <h3 className="card-name disp">
                    {flav.lines[0]}
                    {flav.lines[1] ? (
                      <>
                        <br />
                        {flav.lines[1]}
                      </>
                    ) : null}
                  </h3>
                  <div
                    ref={(el) => {
                      cardPkRefs.current[idx] = el;
                    }}
                    className="pk spr"
                    style={{
                      backgroundSize: css.backgroundSize,
                      backgroundPosition: css.backgroundPosition,
                    }}
                  />
                  <button
                    type="button"
                    className="add-btn"
                    aria-label={tpl(data.shop?.add, { flavour: flav.name })}
                    onClick={(e) => handleCardAdd(idx, e)}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 4: RANGE / BUILD YOUR 3 PACK */}
        <section id="range" ref={rangeRef}>
          <h2 className="range-head disp">
            <span className="line-mask">
              <span className="line-inner">{f(data.range?.line1)}</span>
            </span>
            <span className="line-mask">
              <span className="line-inner">
                <span className="box-3">3</span> {f(data.range?.line2)}
              </span>
            </span>
            <span className="line-mask">
              <span className="line-inner">{f(data.range?.line3)}</span>
            </span>
          </h2>

          <div
            ref={glowRef}
            className="glow"
            style={{ '--g': glowColor } as React.CSSProperties}
          >
            {[0, 1, 2].map((slotIdx) => {
              const fIdx = packSlots[slotIdx];
              const isFilled = fIdx !== null;
              const flav = isFilled ? FLAVOURS[fIdx] : null;
              const css = flav ? spriteCss(flav.box, 4) : null;
              return (
                <div key={slotIdx} className={`slot slot-${slotIdx} ${isFilled ? 'filled' : ''}`}>
                  {isFilled && css && (
                    <div
                      ref={(el) => {
                        slotBarRefs.current[slotIdx] = el;
                      }}
                      className="slot-bar spr"
                      style={{
                        backgroundSize: css.backgroundSize,
                        backgroundPosition: css.backgroundPosition,
                      }}
                    />
                  )}
                  <button
                    type="button"
                    className="slot-x"
                    aria-label={
                      isFilled && flav
                        ? `Remove ${flav.name} from slot ${slotIdx + 1}`
                        : `Empty slot ${slotIdx + 1}`
                    }
                    onClick={() => isFilled && handleSlotRemove(slotIdx)}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="thumbs">
            {FLAVOURS.map((flav) => {
              const css = spriteCss(flav.box, 4);
              const count = packSlots.filter((s) => s === flav.id).length;
              return (
                <button
                  key={flav.id}
                  type="button"
                  className="thumb"
                  onClick={() => handleThumbClick(flav.id)}
                >
                  <span className="thumb-sq" style={{ background: flav.color }}>
                    <span
                      className="thumb-bar spr"
                      style={{
                        backgroundSize: css.backgroundSize,
                        backgroundPosition: css.backgroundPosition,
                      }}
                    />
                  </span>
                  <span className="thumb-lbl">{flav.name}</span>
                  <span className={`thumb-ring ${count > 0 ? 'on' : ''}`}>
                    {count === 1 ? '✓' : count > 1 ? count : ''}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            id="buy"
            type="button"
            className={buyAdded ? 'added' : ''}
            disabled={!buyAdded && remainingCount > 0}
            onClick={handleBuyPack}
          >
            {buyAdded ? (
              f(data.range?.added)
            ) : remainingCount > 0 ? (
              tpl(data.range?.pick, { count: remainingCount })
            ) : (
              <>
                <span>{f(data.range?.add)}</span>
                {f(data.range?.price) && <span className="price">{f(data.range?.price)}</span>}
              </>
            )}
          </button>
        </section>
      </main>
    </>
  );
}
