import type { Params, StageEngine2D, StageEngine3D } from "@/template/src/experiences/types";

// The environment library (PRD sections 11 and 12). An environment is a world with states,
// not a picture: what it does while idle, when scrolled, when the cursor moves, when clicked,
// how it hands over to the next scene, and what a phone gets.

export type EnvironmentFamily = "nature" | "urban" | "abstract" | "scifi";

export interface Environment {
  id: string;
  name: string;
  family: EnvironmentFamily;
  /** The 2D engine that draws it, with the settings that make it this world. */
  engine: StageEngine2D;
  params: Params;
  webgl?: StageEngine3D;
  states: { idle: string; scroll: string; cursor: string; click: string; transition: string; mobile: string };
}

const E = (
  id: string,
  name: string,
  family: EnvironmentFamily,
  engine: StageEngine2D,
  params: Params,
  states: [idle: string, scroll: string, cursor: string, click: string, transition: string, mobile: string],
  webgl?: StageEngine3D,
): Environment => ({ id, name, family, engine, params, webgl, states: { idle: states[0], scroll: states[1], cursor: states[2], click: states[3], transition: states[4], mobile: states[5] } });

export const ENVIRONMENTS: Environment[] = [
  // Nature
  E("jungle", "Jungle", "nature", "character", { world: "jungle", creature: "parrot" }, ["Leaves sway, light flickers through the canopy", "The camera pushes through layers of leaves", "Leaves part around the cursor", "Leaves burst and a bird takes off", "The canopy opens into the next scene", "Fewer leaf layers, tap to rustle"]),
  E("forest", "Forest", "nature", "landscape", { world: "forest" }, ["Mist drifts between the trees", "The camera walks deeper into the forest", "Sunbeams lean toward the cursor", "Birds scatter from the trees", "The trees thin out into a clearing", "Two tree layers, mist kept"]),
  E("mountains", "Mountains", "nature", "landscape", { world: "mountains" }, ["Clouds move, ridges breathe in the haze", "The camera travels toward the peaks", "Fog parts and the sun follows the cursor", "A flock of birds lifts off", "The valley opens into the next scene", "Three ridges, slower camera"]),
  E("desert", "Desert", "nature", "landscape", { world: "desert", road: true }, ["Heat shimmers over the dunes", "The road rushes toward the viewer", "The sun tracks the cursor", "Sand blows across the dunes", "The horizon turns to dusk", "Two dune layers, road kept"]),
  E("ocean", "Ocean", "nature", "landscape", { world: "coast" }, ["Waves roll in, light sparkles on the water", "The camera glides along the coast", "The sun's reflection follows the cursor", "Gulls take off", "The tide carries into the next scene", "Two wave layers"]),
  E("underwater", "Underwater", "nature", "depths", { world: "reef" }, ["Light shafts sway, bubbles rise", "The camera dives deeper and the light fades", "Bubbles stream away from the cursor", "A burst of bubbles, the whale turns", "Deeper water becomes the next scene", "Fewer bubbles, whale kept"]),
  E("river", "River", "nature", "landscape", { world: "river" }, ["The river glints and flows", "The camera follows the river downstream", "Ripples follow the cursor", "Fish jump", "The river bends into the next scene", "Two layers"]),
  E("waterfall", "Waterfall", "nature", "landscape", { world: "falls" }, ["Spray drifts at the falls", "The camera rises up the falls", "Spray leans away from the cursor", "Mist bursts", "The cliff opens to the sky", "Spray reduced"]),
  E("clouds", "Clouds", "nature", "landscape", { world: "clouds" }, ["Clouds drift slowly", "The camera flies up through the clouds", "Clouds part around the cursor", "A gust pushes the clouds", "Clouds clear into blue sky", "Two cloud layers"]),
  E("sky", "Open sky", "nature", "landscape", { world: "sky" }, ["The light shifts across the sky", "The sun climbs as the page scrolls", "Light follows the cursor", "Birds glide past", "Day turns to dusk", "Gradient kept, birds fewer"]),
  E("garden", "Garden", "nature", "grow", { world: "garden" }, ["Stems sway in a light breeze", "Seeds sprout and bloom as the page scrolls", "Stems lean toward the cursor", "A flower opens and petals fall", "The bloom becomes a bouquet", "Fewer stems"]),
  // Urban
  E("city", "City", "urban", "landscape", { world: "city" }, ["Windows flicker on and off", "The camera drives into the city", "Street light follows the cursor", "Lights switch on block by block", "The skyline turns to night", "Two skyline layers"]),
  E("street", "Street", "urban", "landscape", { world: "city", road: true }, ["Traffic lights blink", "The road runs toward the viewer", "Headlights follow the cursor", "A wave of traffic passes", "The street opens onto the skyline", "Road kept, fewer buildings"]),
  E("future-city", "Futuristic city", "urban", "landscape", { world: "city", neon: true }, ["Neon hums, towers glow", "The camera flies between the towers", "Neon brightens near the cursor", "A pulse runs through the city", "The towers dissolve into light", "Neon kept, fewer towers"]),
  E("neon", "Neon", "urban", "kinetic", { style: "neon" }, ["Signs flicker", "Words light up as they scroll in", "The glow follows the cursor", "A sign flashes", "The lights cut to the next scene", "Glow kept"]),
  E("architecture", "Architecture", "urban", "assemble", { subject: "building" }, ["Blueprint lines pulse", "The building is constructed as the page scrolls", "The building turns toward the cursor", "Windows switch on", "The finished building settles", "Smaller building, same stages"]),
  // Abstract
  E("liquid", "Liquid", "abstract", "liquid", { material: "liquid" }, ["Blobs merge and split", "The liquid flows and changes colour", "Blobs are drawn to the cursor", "A splash pushes the blobs apart", "The liquid settles into the next shape", "Fewer blobs"], "blob3d"),
  E("particles", "Particles", "abstract", "cosmos", { style: "data" }, ["Points drift in depth", "The field streams toward the viewer", "Points scatter from the cursor", "Points explode outward", "The field reforms", "Fewer points"]),
  E("fabric", "Fabric", "abstract", "liquid", { material: "silk" }, ["Silk folds ripple slowly", "Folds roll as the page scrolls", "Silk bends under the cursor", "A ripple runs out from the tap", "The folds smooth out", "Slower ripples"]),
  E("glass", "Glass", "abstract", "liquid", { material: "glass" }, ["Glass shapes refract the light", "Shapes rotate and catch the light", "Highlights follow the cursor", "A shape cracks into facets", "The glass clears", "Fewer shapes"], "blob3d"),
  E("metallic", "Metallic", "abstract", "liquid", { material: "chrome" }, ["Chrome shapes reflect the room", "Shapes melt into one another", "Reflections follow the cursor", "A drop splashes", "The chrome settles into a bead", "Fewer shapes"], "blob3d"),
  E("paper", "Paper", "abstract", "ledger", { material: "paper" }, ["Sheets rest with soft shadows", "Pages fan out and stack as the page scrolls", "Sheets lift toward the cursor", "A page turns", "The stack squares up", "Fewer sheets"]),
  E("ink", "Ink", "abstract", "kinetic", { style: "ink" }, ["Ink bleeds slowly", "Words are drawn in ink as they scroll in", "Ink trails the cursor", "A drop spreads", "The ink dries", "Trail off"]),
  E("fluid", "Fluid", "abstract", "liquid", { material: "fluid" }, ["Colour flows like smoke", "The flow speeds up with the scroll", "The flow bends around the cursor", "A swirl blooms", "The colour fades to the next scene", "Slower flow"]),
  E("geometric", "Geometric", "abstract", "playground", { style: "geometric" }, ["Shapes balance and rest", "Shapes tumble as the page scrolls", "Shapes lean away from the cursor", "A shape jumps", "Shapes stack into the next scene", "Fewer shapes, tap to push"]),
  E("kitchen", "Kitchen", "abstract", "brew", { drink: "coffee" }, ["Steam curls from the cup", "Beans roast, grind and pour as the page scrolls", "Steam bends around the cursor", "Beans tumble", "The cup comes to the front", "Fewer beans"]),
  E("bakery", "Bakery", "abstract", "morph", { subject: "dough" }, ["The dough breathes", "Dough is kneaded, proved and baked as the page scrolls", "The dough leans toward the cursor", "Flour puffs", "The loaf is sliced", "Same stages, smaller"]),
  E("track", "Track", "abstract", "progress", { style: "track" }, ["The track glows faintly", "The runner's line races forward as the page scrolls", "The line bends toward the cursor", "A burst of speed", "The finish line arrives", "Line kept"]),
  E("studio", "Studio", "abstract", "orbit", { style: "studio" }, ["Work orbits the centre", "The orbit opens and the camera moves through the work", "The orbit tilts with the cursor", "A piece comes forward", "The orbit closes on contact", "Smaller orbit, tap to focus"]),
  E("product-room", "Product room", "abstract", "interface", { style: "app" }, ["The interface idles with live data", "The product builds the solution as the page scrolls", "Rows light up under the cursor", "A button runs the automation", "The result settles", "One column"]),
  E("ledger-room", "Case room", "abstract", "ledger", { material: "paper", style: "case" }, ["Documents rest on the desk", "Documents form a timeline, then the evidence, then the resolution", "Documents lift under the cursor", "A seal is stamped", "The case closes", "Fewer documents"]),
  // Sci-fi
  E("space", "Space", "scifi", "cosmos", { style: "stars" }, ["Stars twinkle, nebula drifts", "The camera flies through the stars", "Stars bend around the cursor", "A warp jump", "A planet arrives as the next scene", "Fewer stars"], "space3d"),
  E("planets", "Planets", "scifi", "cosmos", { style: "planets" }, ["Planets turn slowly", "The camera passes planet after planet", "The nearest planet tilts toward the cursor", "A moon swings round", "The next planet fills the view", "One planet at a time"], "space3d"),
  E("spacecraft", "Spacecraft", "scifi", "cosmos", { style: "ship" }, ["Panels glow inside the ship", "The ship moves toward the window as the page scrolls", "Lights follow the cursor", "Thrusters fire", "The ship jumps to the next scene", "Fewer lights"]),
  E("holo", "Holographic", "scifi", "interface", { style: "holo" }, ["Holograms flicker", "Panels assemble in depth as the page scrolls", "Panels tilt toward the cursor", "A panel expands", "The hologram reforms", "One panel deep"]),
  E("digital", "Digital world", "scifi", "cosmos", { style: "data" }, ["Data nodes pulse along a grid", "The camera dives through the data", "The grid warps around the cursor", "A node connects to its neighbours", "The grid reforms as the next scene", "Fewer nodes"]),
  E("gallery", "Gallery", "abstract", "kinetic", { style: "gallery" }, ["Frames hang in soft light", "The camera walks the gallery", "Frames turn toward the cursor", "A frame opens", "The gallery ends on the contact wall", "Frames in a single row"]),
  E("showroom", "Showroom", "abstract", "morph", { subject: "product" }, ["The product rests under a spotlight", "The product turns and opens as the page scrolls", "The product follows the cursor", "The product spins", "The product settles beside the call to action", "Product smaller"]),
  E("asset-studio", "Studio light", "abstract", "showcase", {}, ["The model rests in studio light", "The model turns and the camera moves close as the page scrolls", "The model leans toward the cursor", "The model spins", "The model settles beside the call to action", "One model, lighter light"], "asset3d"),
  E("playroom", "Playroom", "abstract", "character", { world: "room", creature: "buddy" }, ["The buddy blinks and bobs", "The buddy walks along with the page", "The buddy watches the cursor", "The buddy jumps", "The buddy waves at the call to action", "Buddy smaller, tap to play"]),
];

const BY_ID = new Map(ENVIRONMENTS.map((e) => [e.id, e]));
export const environmentById = (id: string) => BY_ID.get(id);
