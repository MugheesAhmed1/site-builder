// The 3D character in a template (Site Builder, docs/CHARACTER-JOURNEY.md). content.character
// names the model and how it moves; content.design holds the gradient it stands on. When a model
// is set, xp-content.js also loads the character runtime (xp-lib/xp-character.js), which draws it
// into every <CharacterSlot>. Until then the slot shows the model's picture, so nothing jumps.
// This file is shared by every template: edit templates/_kit/character.tsx, not a copy.
import type { CSSProperties } from 'react';
import { safeSrc, type XP } from './xp';

/** Models: https, uploads (data:) and files next to the page. */
export function safeModel(src: unknown): string {
  const s = String(src ?? '').trim();
  return /^(https:|data:(model\/gltf-binary|application\/octet-stream);base64,|\.\/|\/)/i.test(s) ? s : '';
}

/** True when the site has a 3D character. */
export function hasCharacter(data: XP): boolean {
  return !!safeModel(data?.character?.src);
}

/** Show it again near the end of the page. */
export function hasEcho(data: XP): boolean {
  return hasCharacter(data) && data?.character?.echo !== false;
}

const mixCss = (a: string, b: string, p: number) => `color-mix(in oklab, ${a} ${p}%, ${b})`;

/** The background the character stands on, as CSS (the same as the builder's own). */
export function gradientCss(design: XP | undefined, at: [number, number] = [68, 46]): string {
  const stops: string[] = Array.isArray(design?.stops) ? design!.stops : [];
  const [g1, g2, g3] = [stops[0] || '#111111', stops[1] || stops[0] || '#333333', stops[2] || stops[0] || '#222222'];
  const angle = typeof design?.angle === 'number' ? design.angle : 160;
  switch (design?.style) {
    case 'solid':
      return g1;
    case 'linear':
      return `linear-gradient(${angle}deg, ${g1} 0%, ${g2} 55%, ${g3} 100%)`;
    case 'radial':
      return `radial-gradient(circle at ${at[0]}% ${at[1]}%, ${g2} 0%, ${mixCss(g2, g1, 45)} 32%, ${g1} 72%)`;
    case 'aurora':
      return `radial-gradient(60% 70% at ${at[0]}% ${at[1]}%, ${mixCss(g2, 'transparent', 80)} 0%, transparent 62%), radial-gradient(45% 55% at 14% 86%, ${g3} 0%, transparent 70%), radial-gradient(40% 50% at 92% 8%, ${mixCss(mixCss(g2, g3, 50), 'transparent', 60)} 0%, transparent 70%), linear-gradient(${angle}deg, ${g1} 0%, ${mixCss(g1, g3, 50)} 100%)`;
    default:
      return `radial-gradient(52% 62% at ${at[0]}% ${at[1]}%, ${g2} 0%, ${mixCss(g2, g1, 40)} 38%, transparent 72%), linear-gradient(${angle}deg, ${g1} 0%, ${mixCss(g1, g3, 35)} 100%)`;
  }
}

/**
 * The style for a section the character stands in: its gradient (or the picture chosen instead)
 * plus the colours as --xp-g1, --xp-g2 and --xp-g3 for anything else that wants them.
 */
export function stageStyle(data: XP, at?: [number, number]): CSSProperties {
  const d = data?.design || {};
  const stops: string[] = Array.isArray(d.stops) ? d.stops : [];
  const img = safeSrc(d.image);
  const style: Record<string, string> = {
    '--xp-g1': stops[0] || '#111111',
    '--xp-g2': stops[1] || stops[0] || '#333333',
    '--xp-g3': stops[2] || stops[0] || '#222222',
    backgroundColor: stops[0] || '#111111',
    backgroundImage: img ? `url("${img.replace(/"/g, '%22')}")` : gradientCss(d, at).replace(/^#[0-9a-f]{6}$/i, 'none'),
    backgroundSize: img ? 'cover' : 'auto',
    backgroundPosition: 'center',
    ...(toneStyle(data) as Record<string, string>),
  };
  return style as CSSProperties;
}

const lum = (hex: string) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0;
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};

/**
 * Whether the stage reads as dark (light words on it) or light (dark words), from where words sit:
 * mostly on the base colour, a little on the second. A background picture counts as dark unless
 * the design says otherwise.
 */
export function stageTone(data: XP): 'dark' | 'light' {
  const d = data?.design || {};
  if (safeSrc(d.image)) return d.imageTone === 'light' ? 'light' : 'dark';
  const stops: string[] = Array.isArray(d.stops) ? d.stops : [];
  const l = lum(stops[0] || '#111111') * 0.8 + lum(stops[2] || stops[0] || '#111111') * 0.2;
  return l < 0.179 ? 'dark' : 'light';
}

/**
 * Words that read on the stage: --xp-ink and --xp-ink2 (quieter), tinted with its base colour.
 * Put them where the words are (stageStyle includes them).
 */
export function toneStyle(data: XP): CSSProperties {
  const stops: string[] = Array.isArray(data?.design?.stops) ? data.design.stops : [];
  const g1 = /^#[0-9a-f]{6}$/i.test(stops[0] || '') ? stops[0] : '#111111';
  const dark = stageTone(data) === 'dark';
  return {
    '--xp-ink': dark ? mixCss(g1, '#ffffff', 6) : mixCss(g1, '#0c0c11', 14),
    '--xp-ink2': dark ? mixCss(g1, '#e4e4ea', 22) : mixCss(g1, '#33333c', 26),
  } as CSSProperties;
}

/**
 * xp-tone-dark or xp-tone-light, plus xp-flip when the stage is the other way from the one the
 * template's words were made for (`native`): its text colours then turn to --xp-ink.
 */
export function toneClass(data: XP, native?: 'dark' | 'light'): string {
  const t = stageTone(data);
  return `xp-tone-${t}${native && t !== native ? ' xp-flip' : ''}`;
}

/** Classes for the stage: its tone (see toneClass) and the slow aurora movement. */
export function stageClass(data: XP, native?: 'dark' | 'light'): string {
  return `xp-stage ${toneClass(data, native)}` + (data?.design?.style === 'aurora' && !safeSrc(data?.design?.image) ? ' xp-stage--aurora' : '');
}

/**
 * The spot the character is drawn into. Size it with CSS like an image (it fills its box);
 * slot "echo" is the calmer copy near the end of the page.
 */
export function CharacterSlot({ data, slot = 'hero', className = '', style, turn, scale, lift }: { data: XP; slot?: 'hero' | 'echo' | 'badge'; className?: string; style?: CSSProperties; turn?: number; scale?: number; lift?: number }) {
  if (!hasCharacter(data)) return null;
  const poster = safeSrc(data.character?.poster);
  // A model under CC BY is credited: under the copy near the end, or on the hero when that is off.
  const credit = String(data.character?.credit || '').trim();
  const showCredit = !!credit && (slot === 'echo' || (slot === 'hero' && data.character?.echo === false));
  return (
    <div
      data-xp-character={slot}
      data-xp-turn={turn != null ? String(turn) : undefined}
      data-xp-scale={scale != null ? String(scale) : undefined}
      data-xp-lift={lift != null ? String(lift) : undefined}
      className={`xp-slot xp-slot--${slot} ${className}`.trim()}
      style={style}
      role="img"
      aria-label={String(data.character?.name || '3D character')}
    >
      {poster && <img className="xp-char-poster" src={poster} alt="" draggable={false} />}
      {showCredit && <small className="xp-credit">{credit}</small>}
    </div>
  );
}
