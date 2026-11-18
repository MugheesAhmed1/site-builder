// The portfolio's content comes from xp-content.js (see ../xp.ts). These are its shapes.
export interface ServiceItem {
  number: string;
  name: string;
  description: string;
}

export interface ProjectItem {
  number: string;
  name: string;
  category: string;
  year: string;
  summary: string;
  deliverables: string;
  image1: string;
  image2: string;
  image3: string;
  link: string;
}

/** The pictures of a project, main one first. */
export const projectImages = (p: ProjectItem) => [p.image3, p.image1, p.image2].filter(Boolean);
