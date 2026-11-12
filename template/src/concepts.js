// Scene concepts: animated set pieces with a star. A parrot flies in and lands, a whale
// glides past, the camera walks through a jungle while leaves slide by in layers. Each
// concept is plain data here (a background, one or more actors with a choreography, and
// optional layers) and is drawn by concept.js. Four styles share the same choreography:
// real-life photos, particles (the actor made of dots), nature (painted silhouettes) and
// cartoon. Real-life pictures come from the free AI pack in public/real, made once with
// Pollinations; cartoon actors come from the free public art library in public/real/library
// (Fluent Emoji, MIT, and Noto Emoji, Apache 2.0). Nothing is generated while a site runs.
import { REAL_FISH, REAL_PLATES, REAL_PROPS, REAL_SPRITES } from "./real.js";
import { READY_FILES } from "./concepts-ready.js";
import { ART } from "./library-art.js";

export const CONCEPT_STYLES = [
  { id: "real", name: "Real life" },
  { id: "particle", name: "Particles" },
  { id: "nature", name: "Nature" },
  { id: "cartoon", name: "Cartoon" },
];

// Picture paths.
const A = (id) => `/real/concepts/actors/${id}.webp`;
const T = (id) => `/real/concepts/cartoon/${id}.webp`;
// The free public art library (open-source Fluent and Noto emoji art, see library-art.js).
const L = (key) => ART[key] || `/real/library/${key}.webp`;
const P = (id) => `/real/concepts/plates/${id}.webp`;
const AN = (id) => `/real/animals/${id}.webp`;
const MS = (id) => `/real/mascots/${id}.webp`;
const FISH_SRC = (id) => (REAL_FISH.find((f) => f.id === id) || REAL_FISH[0]).src;
const S = (...ids) => ids.map((id) => REAL_SPRITES[id] || REAL_PROPS[id]).filter(Boolean);
const FISH = REAL_FISH.map((f) => f.src);

// Shared layers (the same shape as the real-life scenes' layers in scenes.js).
const BUBBLES = { mode: "rise", sprites: S("bubble"), count: 14, size: [10, 26], speed: 0.8 };
const SCHOOL = { mode: "swim", sprites: FISH, count: 8, size: [30, 54] };
const LEAVES = { mode: "fall", sprites: S("green-leaf", "ginkgo", "green-leaf"), count: 10, size: [18, 34], speed: 0.7 };
const FLUTTER = { mode: "fly", sprites: [...S("butterfly-blue"), AN("butterfly")], count: 4, size: [26, 44] };
const MONARCHS = { mode: "fly", sprites: [A("monarch")], count: 4, size: [28, 46] };
const BIRDS = { mode: "drift", sprites: S("sparrow", "gull", "dove"), count: 3, size: [26, 44], speed: 2.2, flap: true, band: [0.06, 0.4] };
const CLOUDS = { mode: "drift", sprites: S("cloud-3"), count: 4, size: [140, 280], speed: 0.4, band: [0.02, 0.45], alpha: 0.9 };
const SNOW = { mode: "fall", sprites: S("snowflake"), count: 30, size: [10, 24], speed: 0.6 };
const PETALS = { mode: "fall", sprites: S("petal-pink", "lavender", "daisy-petal"), count: 16, size: [14, 26] };

// Walks: items slide past in depth layers (front ones faster and larger), like a camera
// moving through the place. depth > 1 sits in front of the actors.
const JUNGLE_WALK = [
  { mode: "pass", sprites: [A("jungle-bush"), S("fern")[0]], depth: 0.45, size: [0.3, 0.45], anchor: "bottom", gap: [0.3, 0.5], alpha: 0.8 },
  { mode: "pass", sprites: [S("monstera")[0], S("fern")[0], A("jungle-bush")], depth: 0.8, size: [0.28, 0.42], anchor: "bottom", gap: [0.25, 0.45] },
  { mode: "pass", sprites: [A("vines")], depth: 1.25, size: [0.55, 0.85], anchor: "top", gap: [0.5, 0.9], front: true },
  { mode: "pass", sprites: [A("banana-leaf"), S("palm-leaf")[0], S("monstera")[0]], depth: 1.9, size: [0.4, 0.6], anchor: "bottom", gap: [0.7, 1.2], front: true, blur: 3 },
];
const BAMBOO_WALK = [
  { mode: "pass", sprites: [S("fern")[0], A("jungle-bush")], depth: 0.6, size: [0.25, 0.38], anchor: "bottom", gap: [0.3, 0.5], alpha: 0.85 },
  { mode: "pass", sprites: [A("banana-leaf"), S("palm-leaf")[0]], depth: 1.6, size: [0.45, 0.65], anchor: "bottom", gap: [0.8, 1.3], front: true, blur: 3 },
];
const GRASS_WALK = [
  { mode: "pass", sprites: S("fern", "daisy", "sunflower"), depth: 1.7, size: [0.22, 0.34], anchor: "bottom", gap: [0.3, 0.6], front: true, blur: 2 },
];

// Actor fields: src, how (flyin, cross, leap, swing, rise, soar, hover, walk), size (a share
// of the scene's width), y (a share of its height), dir (1 = to the right), speed, flap /
// gait / swim for the body motion, count for groups, delay between passes in seconds.
const CONCEPT_LIST = [
  // ---------------- Real life
  { id: "parrot", style: "real", name: "Parrot flies in", hint: "A scarlet macaw sweeps in, lands beside your headline and follows the pointer. Tap and it flies off, then comes back.", bg: { plate: P("jungle"), veil: 0.18 }, actors: [{ src: A("macaw"), how: "flyin", size: 0.22, perch: [0.85, 0.6] }], layers: [{ ...JUNGLE_WALK[2], depth: 0.25, size: [0.3, 0.45] }, FLUTTER], fits: "food hotel pets events nonprofit school creator shop agency general" },
  { id: "jungle", style: "real", name: "Jungle walk", hint: "Walk through a rainforest: trunks, vines and huge leaves slide past in layers, faster as you scroll. A toucan crosses now and then.", bg: { plate: P("jungle"), veil: 0.16, walk: true }, actors: [{ src: A("toucan"), how: "cross", size: 0.14, y: 0.28, speed: 1.6, flap: true, delay: 5 }], layers: [...JUNGLE_WALK, LEAVES, FLUTTER], fits: "nonprofit hotel school pets events creator health general portfolio role-teacher role-student" },
  { id: "whale", style: "real", name: "Whale swims past", hint: "A humpback whale glides slowly across deep blue water. Point to make it turn its head, tap for a stream of bubbles.", bg: { plate: P("deep"), veil: 0.12 }, actors: [{ src: A("whale"), how: "cross", size: 0.72, y: 0.55, speed: 0.55, swim: true, delay: 2 }], layers: [{ ...SCHOOL, count: 5 }, BUBBLES], fits: "consulting law hotel nonprofit health hospital general portfolio role-ceo role-finance role-pm role-data" },
  { id: "shark", style: "real", name: "Whale shark glide", hint: "A gentle giant cruises by with a school of reef fish around it.", bg: { plate: P("deep"), veil: 0.12 }, actors: [{ src: A("shark"), how: "cross", size: 0.62, y: 0.5, speed: 0.7, swim: true, dir: -1, delay: 3 }], layers: [SCHOOL, BUBBLES], fits: "agency product consulting role-ceo role-sales role-it general" },
  { id: "manta", style: "real", name: "Manta ray flight", hint: "A manta ray flies through open water on wide wings, rising and dipping.", bg: { plate: P("deep"), veil: 0.12 }, actors: [{ src: A("manta"), how: "soar", size: 0.32, y: 0.45 }], layers: [BUBBLES], fits: "product agency design role-designer role-dev photo general" },
  { id: "dolphins", style: "real", name: "Dolphin leaps", hint: "Dolphins leap out of a turquoise bay one after another. Tap to make one jump.", bg: { plate: P("beach"), veil: 0.12 }, actors: [{ src: A("dolphin"), how: "leap", size: 0.2, y: 0.72, speed: 1.4, count: 3 }], layers: [BIRDS], fits: "hotel events fitness school pets nonprofit general" },
  { id: "jelly", style: "real", name: "Jellyfish glow", hint: "Glowing jellyfish pulse slowly up through the dark.", bg: { plate: P("deep"), veil: 0.35, dark: true }, actors: [{ src: A("jellyfish"), how: "rise", size: 0.12, count: 5, pulse: true }], layers: [BUBBLES], fits: "beauty creator events agency role-designer role-creator general" },
  { id: "orca", style: "real", name: "Orca in the kelp", hint: "An orca weaves through a kelp forest as light falls from the surface.", bg: { plate: P("kelp"), veil: 0.15 }, actors: [{ src: A("orca"), how: "cross", size: 0.5, y: 0.5, speed: 0.8, swim: true, delay: 3 }], layers: [{ ...SCHOOL, count: 5 }, BUBBLES], fits: "law consulting role-ceo role-finance role-engineer general" },
  { id: "bigfish", style: "real", name: "Giant reef fish", hint: "One enormous reef fish swims slowly in front of a busy coral reef.", bg: { plate: REAL_PLATES.reef, veil: 0.12 }, actors: [{ src: REAL_FISH.find((f) => f.id === "angelfish")?.src || FISH[0], how: "cross", size: 0.5, y: 0.5, speed: 0.6, swim: true, delay: 2 }], layers: [SCHOOL, { mode: "sway", sprites: S("seaweed", "coral-pink", "anemone", "coral-orange"), count: 6, size: [70, 140] }, BUBBLES], fits: "pets hotel food school dentist health shop general" },
  { id: "safari", style: "real", name: "Safari sunset", hint: "An elephant walks across the savanna at sunset while birds head home.", bg: { plate: P("savanna"), veil: 0.12 }, actors: [{ src: A("elephant"), how: "walk", size: 0.36, y: 0.86, speed: 0.45, delay: 3 }, { src: A("giraffe"), how: "walk", size: 0.16, y: 0.8, speed: 0.3, dir: -1, delay: 6, far: true }], layers: [BIRDS], fits: "consulting nonprofit property hotel law role-ceo role-pm role-hr general portfolio" },
  { id: "tiger", style: "real", name: "Tiger in the grass", hint: "A tiger prowls through the jungle edge, ferns brushing past the camera.", bg: { plate: P("jungle"), veil: 0.16 }, actors: [{ src: A("tiger"), how: "walk", size: 0.42, y: 0.92, speed: 0.6, delay: 3 }], layers: [JUNGLE_WALK[3], LEAVES], fits: "fitness agency auto trades role-sales role-ceo creator general" },
  { id: "monkey", style: "real", name: "Monkey on a vine", hint: "A monkey swings on a jungle vine. Tap to give it a push.", bg: { plate: P("canopy"), veil: 0.15 }, actors: [{ src: A("monkey"), how: "swing", size: 0.17, anchor: 0.72 }], layers: [{ ...JUNGLE_WALK[2], depth: 0.2 }, FLUTTER], fits: "school events pets creator shop role-student role-teacher general" },
  { id: "hummingbird", style: "real", name: "Hummingbird visit", hint: "A hummingbird hovers by the flowers and follows the pointer like a tiny helper.", bg: { plate: REAL_PLATES.blossom, veil: 0.25 }, actors: [{ src: A("hummingbird"), how: "hover", size: 0.1 }], layers: [{ mode: "sway", sprites: S("sunflower", "tulip", "daisy", "orchid", "lotus"), count: 7, size: [110, 200] }, PETALS], fits: "beauty health food shop nonprofit role-designer role-writer general" },
  { id: "eagle", style: "real", name: "Eagle over the peaks", hint: "An eagle circles high over misty mountains, banking as it turns.", bg: { plate: REAL_PLATES.mountains, veil: 0.14 }, actors: [{ src: A("eagle"), how: "soar", size: 0.24, y: 0.35 }], layers: [CLOUDS], fits: "consulting law finance property auto role-ceo role-it role-engineer role-finance general portfolio" },
  { id: "owl", style: "real", name: "Night owl", hint: "A barn owl glides silently across a moonlit sky.", bg: { plate: REAL_PLATES.night, veil: 0.1, dark: true }, actors: [{ src: A("owl-flying"), how: "cross", size: 0.26, y: 0.4, speed: 1.1, flap: true, delay: 3 }], layers: [{ mode: "float", sprites: S("moon"), count: 1, size: [90, 130] }], fits: "law school writer events role-writer role-dev role-data general" },
  { id: "flamingos", style: "real", name: "Flamingo flight", hint: "A line of flamingos flies over a misty lake at dawn.", bg: { plate: P("lake"), veil: 0.14 }, actors: [{ src: A("flamingo"), how: "cross", size: 0.15, y: 0.3, speed: 1.3, flap: true, count: 4, delay: 4 }], fits: "beauty hotel events shop role-designer general" },
  { id: "horses", style: "real", name: "Wild horses", hint: "A horse gallops across a wildflower meadow, grass rushing past in front.", bg: { plate: P("meadow"), veil: 0.12 }, actors: [{ src: A("horse-run"), how: "walk", size: 0.34, y: 0.9, speed: 2.2, gallop: true, delay: 2 }], layers: [GRASS_WALK[0], FLUTTER], fits: "fitness auto trades sales role-sales role-marketer general" },
  { id: "wolf", style: "real", name: "Wolf by the lake", hint: "A grey wolf walks the shore of a quiet mountain lake.", bg: { plate: P("lake"), veil: 0.14 }, actors: [{ src: A("wolf"), how: "walk", size: 0.3, y: 0.92, speed: 0.6, delay: 3 }], layers: [BIRDS], fits: "law consulting role-it role-engineer role-ceo general" },
  { id: "fox", style: "real", name: "Fox in the snow", hint: "A red fox trots through falling snow in a quiet forest.", bg: { plate: REAL_PLATES.snow, veil: 0.14 }, actors: [{ src: A("fox-run"), how: "walk", size: 0.26, y: 0.92, speed: 1.2, delay: 3 }], layers: [SNOW], fits: "shop creator writer pets role-writer role-creator general" },
  { id: "monarchs", style: "real", name: "Butterfly migration", hint: "Hundreds of monarch butterflies drift over a wildflower meadow and chase the pointer.", bg: { plate: P("meadow"), veil: 0.15 }, layers: [{ ...MONARCHS, count: 18, size: [22, 42] }], fits: "nonprofit health school beauty role-hr role-teacher general" },
  { id: "lanterns", style: "real", name: "Lantern night", hint: "Paper lanterns rise over a lake at night. Tap to release more.", bg: { plate: P("lake"), veil: 0.35, dark: true }, actors: [{ src: A("lantern"), how: "rise", size: 0.06, count: 9 }], fits: "events food hotel nonprofit beauty general" },
  { id: "sail", style: "real", name: "Sail away", hint: "A sailboat crosses the bay on gentle swells.", bg: { plate: P("beach"), veil: 0.1 }, actors: [{ src: A("sailboat"), how: "cross", size: 0.22, y: 0.62, speed: 0.4, bob: true, delay: 2 }], layers: [BIRDS], fits: "hotel property consulting law role-ceo role-finance general" },
  { id: "biplane", style: "real", name: "Biplane over the clouds", hint: "A vintage biplane loops through the clouds and pulls a banner of your words behind it.", bg: { plate: REAL_PLATES.sky, veil: 0.1 }, actors: [{ src: A("biplane"), how: "cross", size: 0.2, y: 0.3, speed: 1.5, banner: true, delay: 3 }], layers: [CLOUDS], fits: "agency events auto product shop role-marketer role-sales general" },
  { id: "launch", style: "real", name: "Rocket launch", hint: "A rocket lifts off into a starry nebula, trailing sparks. Tap to launch another.", bg: { plate: P("space"), veil: 0.08, dark: true }, actors: [{ src: A("rocket"), how: "rise", size: 0.1, count: 1, trail: true, launch: true }], fits: "product agency role-dev role-it role-data role-pm creator general portfolio" },
  { id: "lagoon", style: "real", name: "Waterfall lagoon", hint: "Mist drifts over a jungle waterfall while a macaw crosses the clearing.", bg: { plate: P("lagoon"), veil: 0.14 }, actors: [{ src: A("macaw-blue"), how: "cross", size: 0.18, y: 0.32, speed: 1.4, flap: true, delay: 4 }], layers: [{ mode: "rise", sprites: S("bubble"), count: 8, size: [8, 18], speed: 0.4, alpha: 0.5 }, FLUTTER], fits: "hotel health beauty nonprofit role-doctor general" },
  { id: "bamboo", style: "real", name: "Bamboo trail", hint: "Walk a bamboo trail as stalks slide by and a dragonfly keeps you company.", bg: { plate: P("bamboo-forest"), veil: 0.15, walk: true }, actors: [{ src: A("dragonfly"), how: "hover", size: 0.08 }], layers: [...BAMBOO_WALK], fits: "health beauty consulting writer role-writer role-doctor general" },
  { id: "turtle", style: "real", name: "Sea turtle glide", hint: "A big sea turtle glides past over the reef, small fish keeping it company.", bg: { plate: REAL_PLATES.reef, veil: 0.12 }, actors: [{ src: FISH_SRC("turtle-sea"), how: "cross", size: 0.42, y: 0.45, speed: 0.5, swim: true, delay: 2 }], layers: [{ ...SCHOOL, count: 6 }, BUBBLES], fits: "nonprofit health hotel school pets law general" },
  { id: "plane", style: "real", name: "Paper plane journey", hint: "A paper plane loops across the sky over the clouds. Point and it follows.", bg: { plate: REAL_PLATES.sky, veil: 0.12 }, actors: [{ src: S("paper-plane")[0], how: "soar", size: 0.14, y: 0.42, speed: 1.4 }], layers: [CLOUDS, BIRDS], fits: "agency product consulting school role-pm role-marketer role-student general portfolio" },
  { id: "balloons", style: "real", name: "Balloon sunrise", hint: "Hot air balloons rise slowly over golden dunes.", bg: { plate: REAL_PLATES.dunes, veil: 0.12 }, actors: [{ src: S("balloon")[0], how: "rise", size: 0.09, count: 4 }], fits: "hotel events property consulting role-ceo general" },
  { id: "lavender", style: "real", name: "Lavender breeze", hint: "Bees and petals drift over lavender fields at sunset.", bg: { plate: P("lavender"), veil: 0.15 }, actors: [{ src: AN("bee"), how: "hover", size: 0.07 }], layers: [PETALS, FLUTTER], fits: "beauty health shop food hotel role-designer general" },

  // ---------------- Particles: the same actors drawn as thousands of dots
  { id: "p-parrot", style: "particle", name: "Particle parrot", hint: "A parrot made of glowing dots flies in and lands. Move the pointer through it to scatter the dots.", actors: [{ src: A("macaw"), how: "flyin", size: 0.26, perch: [0.82, 0.58], render: "dots" }], fits: "agency creator product role-designer role-dev role-creator general portfolio" },
  { id: "p-whale", style: "particle", name: "Particle whale", hint: "A whale of dots swims across. The pointer parts the dots like water.", actors: [{ src: A("whale"), how: "cross", size: 0.7, y: 0.55, speed: 0.6, swim: true, render: "dots", delay: 1 }], fits: "product agency consulting role-data role-it role-pm role-ceo general portfolio" },
  { id: "p-eagle", style: "particle", name: "Particle eagle", hint: "An eagle of light circles the hero. Tap to burst it into dust.", actors: [{ src: A("eagle"), how: "soar", size: 0.3, y: 0.42, render: "dots" }], fits: "consulting finance law role-ceo role-finance role-engineer general" },
  { id: "p-elephant", style: "particle", name: "Particle elephant", hint: "An elephant of dots walks steadily across.", actors: [{ src: A("elephant"), how: "walk", size: 0.4, y: 0.85, speed: 0.5, render: "dots", delay: 2 }], fits: "nonprofit consulting role-pm role-hr school general" },
  { id: "p-jelly", style: "particle", name: "Particle jellyfish", hint: "Jellyfish of light pulse upward and scatter around the pointer.", actors: [{ src: A("jellyfish"), how: "rise", size: 0.14, count: 3, pulse: true, render: "dots" }], fits: "beauty creator events role-designer role-creator general" },
  { id: "p-fish", style: "particle", name: "Particle koi", hint: "A big koi of dots circles slowly. Tap to send ripples through it.", actors: [{ src: REAL_FISH.find((f) => f.id === "koi")?.src || FISH[0], how: "cross", size: 0.42, y: 0.5, speed: 0.7, swim: true, render: "dots", delay: 1 }], fits: "food hotel beauty health role-designer general" },
  { id: "p-horse", style: "particle", name: "Particle horse", hint: "A galloping horse made of sparks.", actors: [{ src: A("horse-run"), how: "walk", size: 0.36, y: 0.85, speed: 2, gallop: true, render: "dots", delay: 1 }], fits: "fitness auto role-sales role-marketer general" },
  { id: "p-butterfly", style: "particle", name: "Particle butterfly", hint: "A large butterfly of dots hovers and follows the pointer.", actors: [{ src: A("monarch"), how: "hover", size: 0.22, render: "dots" }], fits: "beauty nonprofit health role-hr role-designer general" },

  { id: "p-turtle", style: "particle", name: "Particle turtle", hint: "A sea turtle drawn in dots swims slowly across. Tap to scatter it.", actors: [{ src: FISH_SRC("turtle-sea"), how: "cross", size: 0.46, y: 0.5, speed: 0.5, swim: true, render: "dots", delay: 1 }], fits: "nonprofit health school role-teacher general" },
  { id: "p-plane", style: "particle", name: "Particle paper plane", hint: "A paper plane of dots loops around the hero and follows the pointer.", actors: [{ src: S("paper-plane")[0], how: "soar", size: 0.2, y: 0.45, speed: 1.3, render: "dots" }], fits: "agency product role-pm role-marketer role-dev general portfolio" },

  // ---------------- Nature: painted skies with silhouettes and layered hills
  { id: "n-hills", style: "nature", name: "Birds over the hills", hint: "Swans cross a sunset over layered hills that drift with the pointer.", bg: { paint: "dusk" }, actors: [{ src: A("swan"), how: "cross", size: 0.14, y: 0.3, speed: 1.3, flap: true, count: 3, render: "silhouette", delay: 3 }], fits: "nonprofit health law consulting role-teacher role-writer general portfolio" },
  { id: "n-moonwhale", style: "nature", name: "Whale under the moon", hint: "A whale's shadow glides under a moonlit sea.", bg: { paint: "nightsea" }, actors: [{ src: A("whale"), how: "cross", size: 0.62, y: 0.7, speed: 0.5, swim: true, render: "silhouette", delay: 2 }], fits: "consulting law writer role-writer role-ceo general" },
  { id: "n-savanna", style: "nature", name: "Savanna silhouettes", hint: "Giraffes and an elephant walk in silhouette against a huge sun.", bg: { paint: "savanna" }, actors: [{ src: A("giraffe"), how: "walk", size: 0.2, y: 0.84, speed: 0.35, render: "silhouette", delay: 4 }, { src: A("elephant"), how: "walk", size: 0.28, y: 0.88, speed: 0.4, dir: -1, render: "silhouette", delay: 6 }], fits: "nonprofit property hotel consulting role-pm general" },
  { id: "n-jungle", style: "nature", name: "Jungle shadows", hint: "Leaf shadows slide past in layers while a monkey swings in the canopy.", bg: { paint: "jungle", walk: true }, actors: [{ src: A("monkey"), how: "swing", size: 0.15, anchor: 0.3, render: "silhouette" }], layers: JUNGLE_WALK.map((l) => ({ ...l, silhouette: true })), fits: "creator school events agency general" },
  { id: "n-ridge", style: "nature", name: "Eagle ridge", hint: "An eagle circles above blue mountain ridges that shift in depth.", bg: { paint: "ridges" }, actors: [{ src: A("eagle"), how: "soar", size: 0.2, y: 0.3, render: "silhouette" }], fits: "consulting law finance role-ceo role-it role-engineer general" },
  { id: "n-fox", style: "nature", name: "Fox at dusk", hint: "A fox trots along a hilltop at dusk under the first stars.", bg: { paint: "dusk" }, actors: [{ src: A("fox-run"), how: "walk", size: 0.18, y: 0.8, speed: 1, render: "silhouette", delay: 3 }], fits: "writer shop creator role-writer role-creator general" },
  { id: "n-flamingo", style: "nature", name: "Flamingo dawn", hint: "Flamingos fly in a line across a pink dawn over still water.", bg: { paint: "dawn" }, actors: [{ src: A("flamingo"), how: "cross", size: 0.12, y: 0.32, speed: 1.2, flap: true, count: 5, render: "silhouette", delay: 3 }], fits: "beauty hotel events role-designer general" },

  { id: "n-parrot", style: "nature", name: "Parrot shadow", hint: "A parrot's silhouette sweeps in over a misty jungle and lands beside your words.", bg: { paint: "jungle" }, actors: [{ src: A("macaw"), how: "flyin", size: 0.22, perch: [0.84, 0.6], render: "silhouette" }], layers: [{ ...JUNGLE_WALK[2], silhouette: true, depth: 0.3 }], fits: "creator agency events general portfolio" },
  { id: "n-turtle", style: "nature", name: "Turtle by moonlight", hint: "A sea turtle's shadow swims under a moonlit sea.", bg: { paint: "nightsea" }, actors: [{ src: FISH_SRC("turtle-sea"), how: "cross", size: 0.36, y: 0.72, speed: 0.5, swim: true, render: "silhouette", delay: 2 }], fits: "nonprofit writer health role-writer general" },
  { id: "n-butterflies", style: "nature", name: "Dusk butterflies", hint: "Butterfly silhouettes flutter over the hills at sunset and chase the pointer.", bg: { paint: "dusk" }, actors: [{ src: AN("butterfly"), how: "hover", size: 0.08, render: "silhouette" }], layers: [{ mode: "fly", sprites: [AN("butterfly")], count: 6, size: [22, 40] }], fits: "beauty nonprofit health role-hr role-designer general" },
  { id: "n-gulls", style: "nature", name: "Gulls at dawn", hint: "Gulls glide over still pink water at dawn.", bg: { paint: "dawn" }, actors: [{ src: S("gull")[0], how: "cross", size: 0.07, y: 0.3, speed: 1.4, flap: true, count: 4, render: "silhouette", delay: 2 }], fits: "hotel property consulting role-writer general" },

  // ---------------- Cartoon: open-source emoji art from the free public library
  { id: "c-parrot", style: "cartoon", name: "Cartoon parrot", hint: "A cheerful cartoon parrot flies in and lands next to your words.", bg: { paint: "toonsky" }, actors: [{ src: L("fluent/parrot"), how: "flyin", size: 0.16, perch: [0.85, 0.6] }], layers: [{ mode: "fly", sprites: [L("fluent/butterfly")], count: 3, size: [22, 36] }], fits: "school food pets shop events role-student role-teacher general" },
  { id: "c-whale", style: "cartoon", name: "Cartoon whale", hint: "A big friendly humpback whale glides across a cartoon sea. Tap for a stream of bubbles.", bg: { paint: "toonsea" }, actors: [{ src: L("noto/whale"), how: "cross", size: 0.56, y: 0.55, speed: 0.55, swim: true, delay: 2 }], layers: [{ mode: "swim", sprites: [L("noto/tropical-fish"), L("noto/fish"), L("fluent/tropical-fish")], count: 5, size: [30, 50] }, BUBBLES], fits: "school pets nonprofit consulting hotel dentist role-teacher general portfolio" },
  { id: "c-spout", style: "cartoon", name: "Happy whale", hint: "A round little whale bobs across the waves and spouts water.", bg: { paint: "toonsea" }, actors: [{ src: L("fluent/spouting-whale"), how: "cross", size: 0.3, y: 0.5, speed: 0.6, bob: true, delay: 1 }], layers: [BUBBLES], fits: "school pets dentist shop food general" },
  { id: "c-fish", style: "cartoon", name: "Big cartoon fish", hint: "A big striped tropical fish swims across a cartoon sea with bubbles everywhere.", bg: { paint: "toonsea" }, actors: [{ src: L("noto/tropical-fish"), how: "cross", size: 0.3, y: 0.5, speed: 0.9, swim: true, delay: 1 }], layers: [{ mode: "swim", sprites: [L("fluent/fish"), L("fluent/tropical-fish"), L("noto/blowfish")], count: 6, size: [28, 46] }, BUBBLES], fits: "food pets dentist school shop general" },
  { id: "c-dolphins", style: "cartoon", name: "Cartoon dolphins", hint: "Cartoon dolphins leap out of the waves one after another. Tap to make one jump.", bg: { paint: "toonsea" }, actors: [{ src: L("noto/dolphin"), how: "leap", size: 0.18, y: 0.72, speed: 1.4, count: 3 }], fits: "hotel events school fitness pets general" },
  { id: "c-shark", style: "cartoon", name: "Cartoon shark", hint: "A toothy cartoon shark patrols past while small fish dart out of its way.", bg: { paint: "toonsea" }, actors: [{ src: L("noto/shark"), how: "cross", size: 0.42, y: 0.5, speed: 0.9, swim: true, delay: 2 }], layers: [{ mode: "swim", sprites: [L("fluent/fish"), L("fluent/tropical-fish")], count: 6, size: [24, 40] }, BUBBLES], fits: "agency product role-sales role-ceo creator general" },
  { id: "c-turtle", style: "cartoon", name: "Cartoon turtle", hint: "A smiling sea turtle paddles slowly across a cartoon reef.", bg: { paint: "toonsea" }, actors: [{ src: L("noto/turtle"), how: "cross", size: 0.26, y: 0.52, speed: 0.5, swim: true, delay: 1 }], layers: [{ mode: "sway", sprites: [L("fluent/coral")], count: 4, size: [70, 120] }, BUBBLES], fits: "nonprofit health school pets hotel general" },
  { id: "c-jelly", style: "cartoon", name: "Jelly bloom", hint: "Bright cartoon jellyfish pulse up through the sea.", bg: { paint: "toonsea" }, actors: [{ src: L("fluent/jellyfish"), how: "rise", size: 0.1, count: 5, pulse: true }], layers: [BUBBLES], fits: "beauty creator events school general" },
  { id: "c-octopus", style: "cartoon", name: "Waving octopus", hint: "A cartoon octopus floats up and down and waves.", bg: { paint: "toonsea" }, actors: [{ src: L("noto/octopus"), how: "rise", size: 0.18, count: 1, pulse: true }], layers: [BUBBLES], fits: "school pets dentist food general" },
  { id: "c-crab", style: "cartoon", name: "Crab walk", hint: "A little red crab scuttles sideways along the sea floor.", bg: { paint: "toonsea" }, actors: [{ src: L("fluent/crab"), how: "walk", size: 0.12, y: 0.94, speed: 0.8, delay: 1 }], layers: [BUBBLES], fits: "food hotel school pets general" },
  { id: "c-rocket", style: "cartoon", name: "Rocket ride", hint: "A cartoon rocket blasts off past planets. Tap to launch it again.", bg: { paint: "toonspace" }, actors: [{ src: L("fluent/rocket-up"), how: "rise", size: 0.1, count: 1, trail: true, launch: true }], fits: "product school agency role-dev role-student creator general" },
  { id: "c-ufo", style: "cartoon", name: "Flying saucer", hint: "A flying saucer hovers and follows the pointer. Tap to beam it up.", bg: { paint: "toonspace" }, actors: [{ src: L("fluent/saucer"), how: "hover", size: 0.16 }], fits: "product agency creator role-dev role-it general" },
  { id: "c-astronaut", style: "cartoon", name: "Floating astronaut", hint: "A toy astronaut floats in space and drifts after the pointer.", bg: { paint: "toonspace" }, actors: [{ src: MS("toy-astronaut"), how: "hover", size: 0.16 }], fits: "product school agency role-dev role-it role-student creator general" },
  { id: "c-bee", style: "cartoon", name: "Busy bee", hint: "A round little bee buzzes around the pointer over a cartoon meadow.", bg: { paint: "toonmeadow" }, actors: [{ src: L("fluent/honeybee"), how: "hover", size: 0.09 }], layers: [{ mode: "fly", sprites: [L("fluent/butterfly")], count: 3, size: [22, 36] }], fits: "food shop school nonprofit health general" },
  { id: "c-butterflies", style: "cartoon", name: "Butterfly garden", hint: "Cartoon butterflies flutter over a meadow and chase the pointer.", bg: { paint: "toonmeadow" }, actors: [{ src: L("noto/butterfly"), how: "hover", size: 0.1 }], layers: [{ mode: "fly", sprites: [L("fluent/butterfly"), L("noto/butterfly")], count: 8, size: [24, 44] }], fits: "beauty health nonprofit school role-hr general" },
  { id: "c-monkey", style: "cartoon", name: "Jungle swing", hint: "A cartoon monkey swings across a bright jungle. Tap to push.", bg: { paint: "toonjungle" }, actors: [{ src: L("fluent/monkey"), how: "swing", size: 0.14, anchor: 0.7 }], fits: "school events pets creator role-student general" },
  { id: "c-dino", style: "cartoon", name: "Dino walk", hint: "A cartoon T-rex stomps through a bright jungle.", bg: { paint: "toonjungle" }, actors: [{ src: L("noto/t-rex"), how: "walk", size: 0.24, y: 0.94, speed: 0.6, delay: 1 }], fits: "school pets shop events creator role-student general" },
  { id: "c-tiger", style: "cartoon", name: "Cartoon tiger", hint: "A cartoon tiger prowls through the jungle.", bg: { paint: "toonjungle" }, actors: [{ src: L("noto/tiger"), how: "walk", size: 0.26, y: 0.94, speed: 0.7, delay: 1 }], fits: "fitness agency school role-sales general" },
  { id: "c-elephant", style: "cartoon", name: "Elephant parade", hint: "A cartoon elephant and a giraffe stroll across a sunny meadow.", bg: { paint: "toonmeadow" }, actors: [{ src: L("noto/elephant"), how: "walk", size: 0.24, y: 0.94, speed: 0.45, delay: 2 }, { src: L("noto/giraffe"), how: "walk", size: 0.13, y: 0.9, speed: 0.35, dir: -1, delay: 5 }], fits: "nonprofit school consulting role-pm role-hr general" },
  { id: "c-horse", style: "cartoon", name: "Cartoon pony", hint: "A cartoon horse gallops across a sunny meadow.", bg: { paint: "toonmeadow" }, actors: [{ src: L("noto/horse"), how: "walk", size: 0.24, y: 0.93, speed: 2, gallop: true, delay: 1 }], fits: "fitness auto school role-sales general" },
  { id: "c-dragon", style: "cartoon", name: "Little dragon", hint: "A friendly dragon flies across the sky and loops around.", bg: { paint: "toonsky" }, actors: [{ src: L("noto/dragon"), how: "soar", size: 0.22, y: 0.4 }], fits: "creator events school shop role-creator general" },
  { id: "c-eagle", style: "cartoon", name: "Cartoon eagle", hint: "A cartoon eagle circles over puffy clouds, banking as it turns.", bg: { paint: "toonsky" }, actors: [{ src: L("noto/eagle"), how: "soar", size: 0.2, y: 0.38 }], fits: "consulting law role-ceo role-finance general" },
  { id: "c-doves", style: "cartoon", name: "Dove flight", hint: "White doves fly across a sunny cartoon sky.", bg: { paint: "toonsky" }, actors: [{ src: L("fluent/dove"), how: "cross", size: 0.1, y: 0.32, speed: 1.4, flap: true, count: 3, delay: 2 }], fits: "nonprofit health hospital events general" },
  { id: "c-kite", style: "cartoon", name: "Kite day", hint: "A bright kite dances on the wind and follows the pointer.", bg: { paint: "toonsky" }, actors: [{ src: L("fluent/kite"), how: "soar", size: 0.16, y: 0.36, speed: 1.1 }], fits: "school events nonprofit role-student role-teacher general" },
  { id: "c-balloons", style: "cartoon", name: "Party balloons", hint: "Balloons float up through a sunny sky. Tap to release more.", bg: { paint: "toonsky" }, actors: [{ src: L("fluent/balloon"), how: "rise", size: 0.06, count: 7 }], fits: "events shop food school general" },
  { id: "c-lanterns", style: "cartoon", name: "Paper lanterns", hint: "Red paper lanterns drift up into a starry sky.", bg: { paint: "toonspace" }, actors: [{ src: L("fluent/lantern"), how: "rise", size: 0.06, count: 7 }], fits: "events food hotel nonprofit general" },
  { id: "c-plane", style: "cartoon", name: "Banner helicopter", hint: "A little cartoon helicopter crosses the sky pulling a banner of your words.", bg: { paint: "toonsky" }, actors: [{ src: L("fluent/helicopter"), how: "cross", size: 0.14, y: 0.3, speed: 1.3, banner: true, delay: 2 }], fits: "agency events shop product role-marketer role-sales general" },
  { id: "c-sail", style: "cartoon", name: "Cartoon sailboat", hint: "A little sailboat bobs across a cartoon sea.", bg: { paint: "toonsea" }, actors: [{ src: L("fluent/sailboat"), how: "cross", size: 0.18, y: 0.4, speed: 0.5, bob: true, delay: 1 }], fits: "hotel property consulting general" },
  { id: "c-duck", style: "cartoon", name: "Rubber duck sea", hint: "A rubber duck bobs across a cartoon sea as bubbles rise.", bg: { paint: "toonsea" }, actors: [{ src: MS("rubber-duck"), how: "cross", size: 0.16, y: 0.4, speed: 0.6, bob: true, delay: 1 }], fits: "pets school shop dentist food general" },
  { id: "c-robot", style: "cartoon", name: "Robot stroll", hint: "A clay robot strolls across a sunny cartoon meadow.", bg: { paint: "toonmeadow" }, actors: [{ src: MS("clay-robot"), how: "walk", size: 0.14, y: 0.93, speed: 0.6, delay: 1 }], fits: "product trades auto school role-dev role-it role-engineer general" },
  { id: "c-plushocto", style: "cartoon", name: "Plush octopus", hint: "A soft toy octopus floats up through a cartoon sea.", bg: { paint: "toonsea" }, actors: [{ src: MS("plush-octopus"), how: "rise", size: 0.16, count: 2, pulse: true }], fits: "pets school dentist shop general" },
  { id: "c-birds", style: "cartoon", name: "Blue birds", hint: "Little cartoon birds fly across a sunny sky with puffy clouds.", bg: { paint: "toonsky" }, actors: [{ src: T("c-bird"), how: "cross", size: 0.09, y: 0.35, speed: 1.6, flap: true, count: 3, delay: 2 }], fits: "school nonprofit health shop role-teacher general" },

  // ---------------- More particles and silhouettes drawn from the art library
  { id: "p-dolphin", style: "particle", name: "Particle dolphins", hint: "Dolphins made of glowing dots leap one after another. Move the pointer through them to scatter the dots.", actors: [{ src: L("noto/dolphin"), how: "leap", size: 0.2, y: 0.72, speed: 1.3, count: 2, render: "dots" }], fits: "hotel agency product role-designer general" },
  { id: "p-dragon", style: "particle", name: "Particle dragon", hint: "A dragon of sparks circles the hero. Tap to burst it into dust.", actors: [{ src: L("noto/dragon"), how: "soar", size: 0.26, y: 0.42, render: "dots" }], fits: "creator events agency role-creator general portfolio" },
  { id: "n-dolphins", style: "nature", name: "Dolphins at dusk", hint: "Dolphin silhouettes leap from a calm sea at sunset.", bg: { paint: "dusk" }, actors: [{ src: L("noto/dolphin"), how: "leap", size: 0.16, y: 0.78, speed: 1.3, count: 3, render: "silhouette" }], fits: "hotel nonprofit health events general" },
  { id: "n-dino", style: "nature", name: "Dinosaur dusk", hint: "A long-necked dinosaur walks in silhouette against a huge sun.", bg: { paint: "savanna" }, actors: [{ src: L("fluent/sauropod"), how: "walk", size: 0.2, y: 0.86, speed: 0.35, render: "silhouette", delay: 3 }], fits: "school creator nonprofit role-teacher general" },
  { id: "n-kite", style: "nature", name: "Kite at dawn", hint: "A kite's silhouette dances over pink dawn water.", bg: { paint: "dawn" }, actors: [{ src: L("noto/kite"), how: "soar", size: 0.14, y: 0.34, speed: 1, render: "silhouette" }], fits: "school nonprofit writer role-writer general" },
];

// Only concepts whose new pictures have all been made are offered (see concepts-ready.js).
const READY = new Set(READY_FILES);
const filesOf = (c) => [c.bg && c.bg.plate, ...(c.actors || []).map((a) => a.src), ...(c.layers || []).flatMap((l) => l.sprites)].filter(Boolean);
const LIVE = CONCEPT_LIST.filter((c) => filesOf(c).every((f) => !f.startsWith("/real/concepts/") || READY.has(f)));

export const CONCEPTS = Object.fromEntries(LIVE.map((c) => [c.id, c]));
export const CONCEPT_IDS = LIVE.map((c) => c.id);

// Scene types for the picker (scenes.js adds these to its list).
export const CONCEPT_TYPES = LIVE.map((c) => ({ id: c.id, group: "concept", style: c.style, name: c.name, hint: c.hint, fits: c.fits.split(" ") }));

export function isConcept(type) {
  return Object.prototype.hasOwnProperty.call(CONCEPTS, type);
}

// The picture files a concept needs, so a download can include them.
export function conceptAssets(type) {
  const c = CONCEPTS[type];
  if (!c) return [];
  return [...new Set(filesOf(c))];
}

// Concepts that suit a category, best first (fits lists are written best first).
export function conceptsFor(category) {
  const hit = CONCEPT_TYPES.filter((t) => t.fits.includes(category));
  return (hit.length ? hit : CONCEPT_TYPES.filter((t) => t.fits.includes("general"))).map((t) => t.id);
}
