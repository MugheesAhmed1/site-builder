// The licence register (PRD section 35, mandatory). Every library, animation and asset that
// can reach a generated site is recorded here with its source, author, licence, version, the
// date it was added and what we changed. The quality engine refuses an export that would ship
// anything not on this list, or anything whose licence does not allow redistribution.

export type LicenceId = "MIT" | "Apache-2.0" | "BSD-3-Clause" | "ISC" | "Zlib" | "OFL-1.1" | "original" | "MIT+Commons-Clause" | "GSAP-Standard" | "owner-supplied";

export interface LicenceEntry {
  id: string;
  name: string;
  source: string;
  author: string;
  license: LicenceId;
  version: string;
  added: string;
  modifications: string;
  /** May it be copied into a downloaded site? */
  redistributable: boolean;
  /** Technology ids (from Experience.technologies) this entry covers. */
  covers: string[];
}

/** Licences that allow copying into a site someone else owns and sells from. */
export const OPEN_LICENCES: LicenceId[] = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "Zlib", "OFL-1.1", "original", "owner-supplied"];

export const LICENCES: LicenceEntry[] = [
  { id: "react", name: "React and React DOM", source: "https://github.com/facebook/react", author: "Meta Platforms and contributors", license: "MIT", version: "19.x", added: "2026-11-01", modifications: "None", redistributable: true, covers: ["react"] },
  { id: "motion", name: "Motion", source: "https://github.com/motiondivision/motion", author: "Motion Division (Matt Perry)", license: "MIT", version: "14.7.1 (pinned)", added: "2026-11-12", modifications: "None. Motion+ (paid) is not used.", redistributable: true, covers: ["motion"] },
  { id: "lenis", name: "Lenis", source: "https://github.com/darkroomengineering/lenis", author: "darkroom.engineering", license: "MIT", version: "1.1.13 (pinned)", added: "2026-11-12", modifications: "None", redistributable: true, covers: ["lenis"] },
  { id: "three", name: "three.js", source: "https://github.com/mrdoob/three.js", author: "three.js authors", license: "MIT", version: "see package.json (pinned)", added: "2026-11-17", modifications: "None", redistributable: true, covers: ["three"] },
  { id: "r3f", name: "React Three Fiber", source: "https://github.com/pmndrs/react-three-fiber", author: "Poimandres", license: "MIT", version: "see package.json (pinned)", added: "2026-11-17", modifications: "None", redistributable: true, covers: ["r3f"] },
  { id: "drei", name: "Drei", source: "https://github.com/pmndrs/drei", author: "Poimandres", license: "MIT", version: "see package.json (pinned)", added: "2026-11-17", modifications: "None", redistributable: true, covers: ["drei"] },
  { id: "postprocessing", name: "React Postprocessing and postprocessing", source: "https://github.com/pmndrs/react-postprocessing", author: "Poimandres, Raoul van Rüschen", license: "MIT", version: "see package.json (pinned)", added: "2026-11-17", modifications: "None", redistributable: true, covers: ["postprocessing"] },
  { id: "css", name: "CSS motion and layouts", source: "This repository", author: "Site Builder", license: "original", version: "2", added: "2026-11-17", modifications: "Original", redistributable: true, covers: ["css", "svg", "canvas"] },
  { id: "experience-engines", name: "Stage engines (landscape, depths, cosmos, brew, morph, grow, assemble, interface, ledger, kinetic, orbit, playground, character, progress, liquid)", source: "This repository, template/src/scenes", author: "Site Builder", license: "original", version: "2", added: "2026-11-17", modifications: "Original procedural code, no third-party art", redistributable: true, covers: ["stage"] },
  { id: "scroll-orchestration", name: "Scroll orchestration and motion runtime", source: "This repository, template/src/motion", author: "Site Builder", license: "original", version: "2", added: "2026-11-17", modifications: "Original. Replaces GSAP ScrollTrigger.", redistributable: true, covers: ["scroll"] },
  { id: "web-audio", name: "Web Audio sound cues", source: "Browser API, tones generated in code", author: "Site Builder", license: "original", version: "2", added: "2026-11-17", modifications: "Original, no audio files", redistributable: true, covers: ["web-audio"] },
  { id: "google-fonts", name: "Google Fonts typefaces", source: "https://fonts.google.com", author: "Each typeface's designers", license: "OFL-1.1", version: "Served by Google Fonts", added: "2026-11-01", modifications: "Subset to the weights a site uses and self-hosted in downloads", redistributable: true, covers: ["fonts"] },
  { id: "tailwindcss", name: "Tailwind CSS", source: "https://github.com/tailwindlabs/tailwindcss", author: "Tailwind Labs", license: "MIT", version: "4.1.18 (pinned, build only)", added: "2026-11-18", modifications: "None. Used only to build imported templates that are written with it.", redistributable: true, covers: ["tailwind"] },
  // "owner-supplied": a whole project its owner handed over to be a builder template (docs/TEMPLATES.md).
  // Each one carries its holder and note in templates/<id>/template.json; its own libraries must be open licences.
  { id: "imported-templates", name: "Imported whole-project templates", source: "templates/<id> in this repository", author: "Each template's owner (see its template.json)", license: "owner-supplied", version: "per template", added: "2026-11-18", modifications: "Unused dependencies dropped; words and pictures replaced only by the person using it", redistributable: true, covers: ["template"] },
  // Kept out of generated sites on purpose.
  { id: "gsap", name: "GSAP and ScrollTrigger", source: "https://gsap.com", author: "GreenSock (Webflow)", license: "GSAP-Standard", version: "-", added: "2026-11-17", modifications: "Not used. Its licence is not an open licence and it restricts use in website-building tools.", redistributable: false, covers: ["gsap", "scrolltrigger"] },
  { id: "react-bits", name: "React Bits", source: "https://reactbits.dev", author: "David Haz", license: "MIT+Commons-Clause", version: "-", added: "2026-11-16", modifications: "Not used. Commons Clause forbids selling it as part of a product. Original equivalents only.", redistributable: false, covers: ["react-bits"] },
];

export function licenceFor(tech: string): LicenceEntry | undefined {
  return LICENCES.find((l) => l.covers.includes(tech));
}

/** Technologies with no entry, or whose entry may not ship. */
export function licenceProblems(technologies: string[]): string[] {
  const out: string[] = [];
  for (const t of technologies) {
    const l = licenceFor(t);
    if (!l) out.push(`${t} is not in the licence register`);
    else if (!l.redistributable || !OPEN_LICENCES.includes(l.license)) out.push(`${l.name} (${l.license}) may not be included in a downloaded site`);
  }
  return out;
}
