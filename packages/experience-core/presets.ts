import type { CursorMode, ExperienceMode, MotionLanguage, Params } from "@/template/src/experiences/types";

// Experience presets (PRD section 33) and experience packs (PRD section 64).
// A preset is a creative brief the generator works within: the concepts it may choose from,
// the mode, how intense it is and how it moves. A pack is a ready combination of one concept
// with its world, character, interaction, particles and transition already chosen.

export interface Preset {
  id: string;
  name: string;
  description: string;
  mode: ExperienceMode;
  /** Concepts this preset may pick from, in order of preference. */
  concepts: string[];
  intensity: number;
  motionLanguage?: MotionLanguage;
  cursor?: CursorMode;
}

export const PRESETS: Preset[] = [
  { id: "cinematic-journey", name: "Cinematic Journey", description: "A camera journey through a world, scene by scene, ending at your door.", mode: "cinematic", concepts: ["mountain-journey", "coastline", "city-lights", "desert-road", "forest-walk"], intensity: 8, motionLanguage: "fluid" },
  { id: "interactive-character", name: "Interactive Character", description: "A character that watches, reacts and travels with the visitor.", mode: "world", concepts: ["jungle-explorer", "deep-ocean", "buddy"], intensity: 8, cursor: "character" },
  { id: "3d-product", name: "3D Product", description: "Your product in the middle, turning to show every side.", mode: "product", concepts: ["product-orbit", "tooth-care"], intensity: 8, motionLanguage: "precise" },
  { id: "liquid-world", name: "Liquid World", description: "Living liquid shapes that lean toward every move.", mode: "world", concepts: ["liquid-world"], intensity: 7, motionLanguage: "fluid" },
  { id: "editorial-motion", name: "Editorial Motion", description: "Typography, documents and image transitions with restraint.", mode: "editorial", concepts: ["case-file", "minimal-luxury", "gallery-walk", "forest-walk"], intensity: 4, motionLanguage: "stable", cursor: "standard" },
  { id: "scroll-story", name: "Scroll Story", description: "One object transforms from scene to scene as the page scrolls.", mode: "cinematic", concepts: ["bean-to-cup", "dough-to-bread", "seed-to-bloom", "build-it", "progress-track", "data-to-insight"], intensity: 6 },
  { id: "digital-playground", name: "Digital Playground", description: "Shapes to grab, throw and burst, with gravity that tips with the scroll.", mode: "playful", concepts: ["digital-playground", "retro-arcade"], intensity: 9, motionLanguage: "elastic" },
  { id: "kinetic-typography", name: "Kinetic Typography", description: "The words are the visual object.", mode: "playful", concepts: ["kinetic-type"], intensity: 7, motionLanguage: "bold" },
  { id: "product-simulation", name: "Product Simulation", description: "The page demonstrates the product working.", mode: "product", concepts: ["product-simulation", "data-to-insight"], intensity: 6, motionLanguage: "precise" },
  { id: "minimal-luxury", name: "Minimal Luxury", description: "Slow, precise and quiet.", mode: "editorial", concepts: ["minimal-luxury", "case-file"], intensity: 3, motionLanguage: "restrained", cursor: "standard" },
  { id: "retro-interactive", name: "Retro Interactive", description: "An arcade cabinet where the business is the game.", mode: "playful", concepts: ["retro-arcade", "digital-playground"], intensity: 8, motionLanguage: "elastic" },
  { id: "futuristic-interface", name: "Futuristic Interface", description: "A heads-up display that builds itself around the story.", mode: "product", concepts: ["holo-interface", "space-voyage", "data-to-insight"], intensity: 7, motionLanguage: "precise" },
];

export interface Pack {
  id: string;
  name: string;
  description: string;
  concept: string;
  /** Stage settings layered over the concept's own. */
  params: Params;
  /** What the pack is made of, as the PRD lists it. */
  recipe: { environment: string; character?: string; objects?: string; interaction: string; scroll: string; particles?: string; transition?: string; lighting?: string; cursor?: string; typography?: string };
}

export const PACKS: Pack[] = [
  { id: "jungle-explorer", name: "Jungle Explorer", description: "A parrot guide through a jungle canopy.", concept: "jungle-explorer", params: { leaves: true }, recipe: { environment: "jungle", character: "parrot", interaction: "cursor", scroll: "camera travel", particles: "leaves", transition: "depth" } },
  { id: "deep-ocean", name: "Deep Ocean", description: "A whale beside the visitor on a dive to the floor.", concept: "deep-ocean", params: { caustics: true }, recipe: { environment: "underwater", character: "whale", interaction: "cursor", scroll: "dive", particles: "bubbles", lighting: "caustics" } },
  { id: "space-voyage", name: "Space Voyage", description: "A flight past planets with a warp between scenes.", concept: "space-voyage", params: { warp: true }, recipe: { environment: "space", objects: "planets", interaction: "cursor", scroll: "camera flight", particles: "stars", transition: "warp" } },
  { id: "digital-future", name: "Digital Future", description: "Data structures in depth, warped by the cursor, with kinetic type.", concept: "data-to-insight", params: { grid: true }, recipe: { environment: "abstract", objects: "data structures", interaction: "cursor", scroll: "depth", cursor: "distortion", typography: "kinetic" } },
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id);
export const packById = (id: string) => PACKS.find((p) => p.id === id);
