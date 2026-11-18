// The belt's sample pages, read from the template content (xp-content.js). Edit that file, not this one.
import { fill, lines, pairs, safeSrc, type XP } from '../xp';

export type CardLayout = 'home' | 'price' | 'case' | 'vision' | 'alloy' | 'journal';
const LAYOUTS: CardLayout[] = ['home', 'price', 'case', 'vision', 'alloy', 'journal'];

export interface KesslerCardData {
  id: CardLayout;
  key: string;
  original: number;
  distilled: number;
  url: string;
  html: string;
  meta: string;
  site: string;
  menu: string[];
  active: string;
  kicker: string;
  title: string;
  emphasis: string;
  text: string[];
  rows: [string, string][];
  button: string;
  images: string[];
}

const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : d);
const fmt = (v: number) => v.toLocaleString('en-US');

export function cardsOf(data: XP): KesslerCardData[] {
  const site = fill(data.belt?.site, data);
  const withSite = (v: unknown) => fill(v, data).replace(/\{site\}/g, site);
  const items: XP[] = Array.isArray(data.belt?.cards) ? data.belt.cards : [];
  return items.map((c, i) => {
    const original = n(c.original, 50000);
    const distilled = Math.min(original, n(c.distilled, 5000));
    const url = withSite(c.address);
    return {
      id: LAYOUTS.includes(c.layout) ? c.layout : LAYOUTS[i % LAYOUTS.length],
      key: `c${i}`,
      original,
      distilled,
      url,
      html: withSite(c.html),
      meta: `<!-- distilled: ${fmt(distilled)} tokens -->\n<!-- original: ${fmt(original)} tokens -->\n<!-- ${url} -->`,
      site,
      menu: withSite(c.menu).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4),
      active: withSite(c.active).trim(),
      kicker: withSite(c.kicker),
      title: withSite(c.title),
      emphasis: withSite(c.emphasis),
      text: lines(withSite(c.text)),
      rows: pairs(withSite(c.rows)),
      button: withSite(c.button),
      images: [safeSrc(c.image), safeSrc(c.image2), safeSrc(c.image3)],
    };
  });
}
