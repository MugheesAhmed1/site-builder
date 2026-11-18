// The portfolio's lists, read from the template content (xp-content.js). Edit that file, not this one.
import { fill, lines, safeHref, type XP } from '../xp';

export type ProjectVisualType = 'abyss' | 'orbital' | 'tideline' | 'echo';
const SCENES: ProjectVisualType[] = ['abyss', 'orbital', 'tideline', 'echo'];

export interface Project {
  id: string;
  number: string;
  title: string;
  category: string;
  year: string;
  description: string;
  visualType: ProjectVisualType;
  client: string;
  role: string;
  deliverables: string[];
  narrative: string;
  palette: { primary: string; secondary: string };
}

export interface ServiceItem {
  number: string;
  title: string;
  description: string;
}

export const pad = (n: number) => String(n).padStart(2, '0');

const COLOR = /^#[0-9a-f]{3,8}$/i;

export function projectsOf(data: XP): Project[] {
  const items: XP[] = Array.isArray(data.projects?.items) ? data.projects.items : [];
  return items.map((p, i) => ({
    id: `p${i}`,
    number: pad(i + 1),
    title: fill(p.title, data),
    category: fill(p.category, data),
    year: fill(p.year, data),
    description: fill(p.description, data),
    visualType: SCENES.includes(p.scene) ? p.scene : SCENES[i % SCENES.length],
    client: fill(p.client, data),
    role: fill(p.role, data),
    deliverables: lines(p.deliverables, data),
    narrative: fill(p.narrative, data),
    palette: {
      primary: COLOR.test(p.primary) ? p.primary : '#02070A',
      secondary: COLOR.test(p.secondary) ? p.secondary : '#082E42',
    },
  }));
}

export function servicesOf(data: XP): ServiceItem[] {
  const items: XP[] = Array.isArray(data.services?.items) ? data.services.items : [];
  return items.map((s, i) => ({ number: pad(i + 1), title: fill(s.title, data), description: fill(s.description, data) }));
}

export function socialsOf(data: XP) {
  const items: XP[] = Array.isArray(data.contact?.socials) ? data.contact.socials : [];
  return items.map((s) => ({ label: fill(s.label, data), href: safeHref(s.href) })).filter((s) => s.label && s.href);
}

export function chaptersOf(data: XP) {
  const items: XP[] = Array.isArray(data.nav?.chapters) ? data.nav.chapters : [];
  return items.map((c, i) => ({ index: pad(i + 1), label: fill(c.label, data), targetId: String(c.target || '') }));
}
