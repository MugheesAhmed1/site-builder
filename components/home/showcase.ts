// The characters the home page shows off. Each one is a real model from the asset library
// (library/assets/manifest.json; none of them needs a credit line), with an idea it could star in.
// The page reads its colours from the model's still with the same code the journey uses, so what
// the visitor sees here is what their own site would get.

export interface Showcase {
  id: string;
  name: string;
  asset: string;
  preview: string;
  /** The one line a person might type for it. */
  line: string;
  /** Business type id (lib/categories.ts) and mood words, as the journey would read them. */
  business: string;
  words: string[];
  /** How the model sits in the hero. */
  scale?: number;
  turn?: number;
  lift?: number;
}

export const SHOWCASE: Showcase[] = [
  {
    id: "character-robot-001",
    name: "Robot",
    asset: "/assets/3d/character/character-robot-001.glb",
    preview: "/assets/previews/character-robot-001.webp",
    line: "An app that books dentist visits",
    business: "product",
    words: ["robot", "tech", "friendly", "app"],
    scale: 1.05,
  },
  {
    id: "food-burger-001",
    name: "Burger",
    asset: "/assets/3d/prop/food-burger-001.glb",
    preview: "/assets/previews/food-burger-001.webp",
    line: "A burger joint in Lahore called Smash",
    business: "food",
    words: ["food", "warm", "playful"],
    scale: 1,
  },
  {
    id: "character-astronaut-001",
    name: "Astronaut",
    asset: "/assets/3d/character/character-astronaut-001.glb",
    preview: "/assets/previews/character-astronaut-001.webp",
    line: "Portfolio for a 3D motion designer",
    business: "photo",
    words: ["space", "futuristic", "creative", "portfolio"],
    scale: 1.05,
  },
  {
    id: "animal-macaw-001",
    name: "Macaw",
    asset: "/assets/3d/character/animal-macaw-001.glb",
    preview: "/assets/previews/animal-macaw-001.webp",
    line: "Eco tours in the Margalla Hills",
    business: "hotel",
    words: ["nature", "travel", "friendly", "colourful"],
    scale: 1,
  },
  {
    id: "prop-giftbox-001",
    name: "Gift box",
    asset: "/assets/3d/prop/prop-giftbox-001.glb",
    preview: "/assets/previews/prop-giftbox-001.webp",
    line: "A gift shop in Karachi",
    business: "shop",
    words: ["gift", "pastel", "cute", "shop"],
    scale: 0.95,
  },
  {
    id: "character-dragon-001",
    name: "Dragon",
    asset: "/assets/3d/character/character-dragon-001.glb",
    preview: "/assets/previews/character-dragon-001.webp",
    line: "A fantasy game studio",
    business: "agency",
    words: ["gaming", "fantasy", "bold"],
    scale: 1.05,
  },
];

/** The first character's colours, worked out ahead so the page paints in them before any script runs. */
export const FIRST = { accent: "#dab765", accent2: "#bbdb8c", page: "#0f0c05", onAccent: "#100d06", stops: ["#160e00", "#6d540f", "#25330a"] };
