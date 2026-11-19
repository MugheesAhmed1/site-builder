// The curated source list of the 3D asset library (docs/ASSETS.md).
//
// Every entry here was checked by hand against the licence published WITH the file (Khronos
// metadata.json "legal" entries, the KayKit pack's License.txt, Kenney's starter-kit README,
// three.js' RobotExpressive README, drei-assets' attribution of Poly Haven HDRIs). Only CC0 and
// CC BY 4.0 are accepted; CC BY entries carry their credits into every export that uses them.
// scripts/assets/ingest.mjs turns this list into public/assets and library/assets/manifest.json.
// Rejected files are listed at the bottom with the reason, so nobody adds them back by mistake.

export const LICENSES = {
  CC0: { type: "CC0-1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/", commercialUse: true, redistribution: true, modification: true, attributionRequired: false },
  CCBY: { type: "CC-BY-4.0", url: "https://creativecommons.org/licenses/by/4.0/", commercialUse: true, redistribution: true, modification: true, attributionRequired: true },
  // Files the project owner uploaded whose origin and licence are not yet confirmed. They are
  // kept in the library (and shown there, marked), but the licence gate keeps them out of every
  // generated site until the record is changed to a confirmed licence.
  OWNER: { type: "owner-supplied", url: "", commercialUse: false, redistribution: false, modification: true, attributionRequired: false },
  ORIGINAL: { type: "original", url: "", commercialUse: true, redistribution: true, modification: true, attributionRequired: false },
};

const KHR = (name) => `https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/${name}`;
const khr = (name, creator, lic, extra = {}) => ({
  file: `khr/${name}.glb`,
  license: { ...LICENSES[lic], evidence: `${KHR(name)}/metadata.json (legal)` },
  source: { url: KHR(name), creator, publisher: "Khronos Group glTF Sample Assets", via: `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/${name}/glTF-Binary/${name}.glb` },
  ...extra,
});
const KK = (pack, file) => ({
  file: `kk/KayKit-${pack}-1.0/${file}`,
  license: { ...LICENSES.CC0, evidence: `https://github.com/KayKit-Game-Assets/KayKit-${pack}-1.0/blob/main/License.txt` },
  source: { url: `https://github.com/KayKit-Game-Assets/KayKit-${pack}-1.0`, creator: "Kay Lousberg (KayKit)", publisher: "KayKit", via: `https://github.com/KayKit-Game-Assets/KayKit-${pack}-1.0` },
});
const kk = {
  furniture: (n) => KK("Furniture-Bits", `addons/kaykit_furniture_bits/Assets/gltf/${n}.gltf`),
  city: (n) => KK("City-Builder-Bits", `addons/kaykit_city_builder_bits/Assets/gltf/${n}.gltf`),
  food: (n) => KK("Restaurant-Bits", `addons/kaykit_restaurant_bits/Assets/gltf/${n}.gltf`),
  space: (n) => KK("Space-Base-Bits", `addons/kaykit_space_base_bits/Assets/gltf/${n}.gltf`),
  proto: (n) => KK("Prototype-Bits", `addons/kaykit_prototype_bits/Assets/gltf/${n}.gltf`),
  adv: (n) => KK("Character-Pack-Adventures", `addons/kaykit_character_pack_adventures/Assets/gltf/${n}.gltf`),
  hero: (n) => KK("Character-Pack-Adventures", `addons/kaykit_character_pack_adventures/Characters/gltf/${n}.glb`),
};
const KEN = (kit, file) => ({
  file: `kk/Starter-Kit-${kit}/${file}`,
  license: { ...LICENSES.CC0, evidence: `https://github.com/KenneyNL/Starter-Kit-${kit}#license ("Assets included in this package ... are CC0 licensed")` },
  source: { url: `https://github.com/KenneyNL/Starter-Kit-${kit}`, creator: "Kenney (kenney.nl)", publisher: "Kenney", via: `https://github.com/KenneyNL/Starter-Kit-${kit}` },
});
const arena = (n) => KEN("Basic-Scene", `sample/Mini Arena/Models/GLB format/${n}.glb`);
const HAVEN = (id, name, tags, style) => ({
  id: "hdri-" + id.replace(/_1k$/, "").replace(/_/g, "-"),
  name,
  type: "hdri",
  file: `drei-assets/hdri/${id}.hdr`,
  category: "hdri",
  subcategory: tags[0],
  tags,
  style,
  license: { ...LICENSES.CC0, evidence: "https://polyhaven.com/license (every Poly Haven asset is CC0); drei-assets README credits HDRI Haven" },
  source: { url: `https://polyhaven.com/a/${id.replace(/_1k$/, "")}`, creator: "Poly Haven", publisher: "Poly Haven (formerly HDRI Haven)", via: `https://github.com/pmndrs/drei-assets/blob/master/hdri/${id}.hdr` },
});

// Models whose printed logos (Khronos, 3D Commerce, DGG) are trademarks: the logo textures are
// replaced with a plain colour so no third-party mark ever ships. Recorded under modifications.
const DELOGO = "Third-party logo textures replaced with a plain colour (trademarks are not covered by the copyright licence).";

export const SOURCES = [
  // ------------------------------------------------------------------ products
  { id: "eyewear-black-001", name: "Black Luxury Sunglasses", category: "product", subcategory: "eyewear", tags: ["sunglasses", "glasses", "eyewear", "shades", "fashion", "luxury", "black", "optical", "accessory"], style: ["premium", "minimal", "editorial", "luxury", "realistic"], materials: ["plastic", "glass"], colors: ["black"], ...khr("SunglassesKhronos", "Eric Chadwick", "CCBY"), delogo: [{ material: "temples", color: [0.02, 0.02, 0.02] }, { material: "earhooks", color: [0.02, 0.02, 0.02] }], modifications: DELOGO },
  { id: "watch-chronograph-001", name: "Chronograph Watch", category: "product", subcategory: "watch", tags: ["watch", "wristwatch", "chronograph", "timepiece", "luxury", "accessory", "jewellery", "sport"], style: ["premium", "editorial", "luxury", "realistic", "technical"], materials: ["metal", "glass", "carbon"], colors: ["black", "silver", "red", "gold"], ...khr("ChronographWatch", "Eric Chadwick", "CCBY"), simplify: 0.5, clips: { Anim_0: "hands" }, delogo: [{ material: "Backplate Khronos", color: [0.55, 0.55, 0.58] }, { material: "Clasp DGG", color: [0.55, 0.55, 0.58] }], modifications: DELOGO },
  { id: "shoe-sneaker-001", name: "Sneaker With Colourways", category: "product", subcategory: "shoes", tags: ["shoe", "shoes", "sneaker", "trainer", "footwear", "fashion", "streetwear", "sport", "running"], style: ["premium", "playful", "editorial", "realistic"], materials: ["fabric", "rubber", "leather"], colors: ["blue", "white", "pink", "black", "red"], ...khr("MaterialsVariantsShoe", "Shopify", "CCBY") },
  { id: "camera-antique-001", name: "Antique Camera", category: "product", subcategory: "camera", tags: ["camera", "vintage camera", "tripod", "antique", "photography", "photo", "film", "vintage"], style: ["vintage", "editorial", "classic", "realistic"], materials: ["wood", "metal", "leather", "glass"], colors: ["brown", "black", "brass"], ...khr("AntiqueCamera", "Maximillan Kamps", "CC0") },
  { id: "speaker-boombox-001", name: "Boombox Speaker", category: "product", subcategory: "speaker", tags: ["speaker", "boombox", "audio", "music", "radio", "sound", "retro", "electronics", "stereo"], style: ["retro", "playful", "realistic"], materials: ["plastic", "metal"], colors: ["white", "black"], ...khr("BoomBox", "Microsoft", "CC0") },
  { id: "car-concept-001", name: "Concept Sports Car", category: "vehicle", subcategory: "car", tags: ["car", "sports car", "supercar", "automotive", "vehicle", "concept", "luxury", "speed", "auto"], style: ["premium", "futuristic", "cinematic", "realistic"], materials: ["paint", "glass", "metal", "leather"], colors: ["red", "black", "silver"], ...khr("CarConcept", "Eric Chadwick", "CCBY"), simplify: 0.35, delogo: [{ material: "License", color: [0.06, 0.06, 0.06] }], modifications: DELOGO },
  { id: "car-toy-001", name: "Toy Racing Car", category: "vehicle", subcategory: "car", tags: ["car", "toy", "racing", "kids", "vehicle", "retro", "fun"], style: ["playful", "vintage", "realistic"], materials: ["plastic", "fabric"], colors: ["green", "red", "white"], ...khr("ToyCar", "Guido Odendahl, Eric Chadwick", "CC0"), maxTex: 1024, simplify: 0.35 },
  { id: "chair-sheen-001", name: "Sheen Lounge Chair", category: "product", subcategory: "furniture", tags: ["chair", "lounge chair", "armchair", "furniture", "interior", "seat", "fabric", "home"], style: ["minimal", "editorial", "realistic", "scandinavian"], materials: ["fabric", "wood"], colors: ["red", "white", "wood"], ...khr("SheenChair", "Eric Chadwick", "CC0") },
  { id: "sofa-velvet-001", name: "Velvet Sofa", category: "product", subcategory: "furniture", tags: ["sofa", "couch", "velvet", "furniture", "interior", "living room", "luxury", "home"], style: ["luxury", "premium", "editorial", "realistic"], materials: ["velvet", "metal"], colors: ["grey", "gold"], ...khr("GlamVelvetSofa", "Eric Chadwick", "CCBY") },
  { id: "sofa-leather-001", name: "Wood And Leather Sofa", category: "product", subcategory: "furniture", tags: ["sofa", "couch", "leather", "wood", "furniture", "interior", "classic", "home"], style: ["classic", "warm", "realistic", "premium"], materials: ["leather", "wood"], colors: ["brown"], ...khr("SheenWoodLeatherSofa", "Eric Chadwick, Fran Calvente", "CCBY"), simplify: 0.5 },
  { id: "chair-damask-001", name: "Damask Armchair", category: "product", subcategory: "furniture", tags: ["chair", "armchair", "damask", "furniture", "interior", "baroque", "luxury", "hotel"], style: ["luxury", "classic", "realistic"], materials: ["fabric", "wood"], colors: ["purple", "gold"], ...khr("ChairDamaskPurplegold", "Eric Chadwick", "CCBY") },
  { id: "lamp-iridescent-001", name: "Iridescent Table Lamp", category: "product", subcategory: "lighting", tags: ["lamp", "table lamp", "light", "lighting", "iridescent", "interior", "design", "home"], style: ["premium", "futuristic", "editorial", "realistic"], materials: ["glass", "metal"], colors: ["rainbow", "white"], ...khr("IridescenceLamp", "Eric Chadwick", "CCBY") },
  { id: "lamp-barn-001", name: "Brushed Barn Lamp", category: "product", subcategory: "lighting", tags: ["lamp", "pendant", "barn lamp", "light", "industrial", "metal", "interior", "cafe"], style: ["industrial", "vintage", "realistic"], materials: ["metal"], colors: ["copper", "brass"], ...khr("AnisotropyBarnLamp", "Eric Chadwick", "CCBY") },
  { id: "lantern-001", name: "Street Lantern", category: "prop", subcategory: "lighting", tags: ["lantern", "lamp", "street light", "light", "vintage", "night", "outdoor"], style: ["vintage", "cinematic", "realistic"], materials: ["metal", "glass"], colors: ["black", "rust"], ...khr("Lantern", "sbtron, Frank Galligan", "CC0") },
  { id: "fashion-corset-001", name: "Corset", category: "product", subcategory: "fashion", tags: ["corset", "fashion", "clothing", "garment", "boutique", "couture", "apparel", "tailor"], style: ["luxury", "vintage", "editorial", "realistic"], materials: ["fabric", "leather"], colors: ["red", "black", "cream"], ...khr("Corset", "Microsoft", "CC0") },
  { id: "teacup-001", name: "Porcelain Teacup", category: "prop", subcategory: "tableware", tags: ["teacup", "cup", "tea", "coffee", "porcelain", "cafe", "tableware", "breakfast"], style: ["minimal", "warm", "realistic"], materials: ["porcelain"], colors: ["white"], ...khr("DiffuseTransmissionTeacup", "Poly Haven, Eric Chadwick", "CC0"), simplify: 0.4 },
  { id: "dish-olives-001", name: "Iridescent Dish With Olives", category: "prop", subcategory: "food", tags: ["dish", "olives", "food", "restaurant", "mediterranean", "tableware", "glass"], style: ["premium", "editorial", "realistic"], materials: ["glass", "organic"], colors: ["green", "rainbow"], ...khr("IridescentDishWithOlives", "Eric Chadwick", "CCBY") },
  { id: "game-chess-001", name: "Chess Set", category: "prop", subcategory: "game", tags: ["chess", "board game", "strategy", "game", "pieces", "classic", "luxury", "consulting"], style: ["classic", "premium", "editorial", "realistic"], materials: ["wood", "marble", "metal"], colors: ["black", "white", "wood"], ...khr("ABeautifulGame", "MaterialX Project, Ed Mackey", "CCBY"), maxTex: 512, simplify: 0.12 },
  { id: "food-avocado-001", name: "Avocado", category: "prop", subcategory: "food", tags: ["avocado", "fruit", "food", "healthy", "organic", "kitchen", "vegan", "nutrition"], style: ["natural", "realistic"], materials: ["organic"], colors: ["green"], ...khr("Avocado", "Microsoft", "CC0"), maxTex: 512 },

  // ------------------------------------------------------------------ characters
  { id: "character-robot-001", name: "Expressive Robot", category: "character", subcategory: "robot", tags: ["robot", "android", "mascot", "character", "ai", "tech", "friendly", "dance"], style: ["stylized", "playful", "futuristic"], materials: ["plastic", "metal"], colors: ["yellow", "grey"], file: "three/RobotExpressive.glb", pivot: "bottom", clips: { Idle: "idle", Walking: "walk", Running: "run", Jump: "jump", Dance: "dance", Wave: "wave", ThumbsUp: "thumbs-up", Yes: "yes" }, license: { ...LICENSES.CC0, evidence: "https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/RobotExpressive/README.md (CC0 1.0)" }, source: { url: "https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive", creator: "Tomás Laulhé (Quaternius); morph targets by Don McCurdy", publisher: "three.js examples", via: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb" } },
  { id: "animal-fox-001", name: "Low-Poly Fox", category: "character", subcategory: "animal", tags: ["fox", "animal", "wildlife", "pet", "nature", "forest", "mascot"], style: ["low-poly", "stylized", "natural"], materials: ["organic"], colors: ["orange", "white"], ...khr("Fox", "PixelMannen (model, CC0); tomkranis (rig and animation, CC BY 4.0); AsoboStudio and scurest (glTF conversion, CC BY 4.0)", "CCBY"), pivot: "bottom", clips: { Survey: "idle", Walk: "walk", Run: "run" } },
  { id: "animal-fish-001", name: "Barramundi Fish", category: "character", subcategory: "animal", tags: ["fish", "barramundi", "seafood", "ocean", "water", "aquarium", "animal", "restaurant"], style: ["realistic", "natural"], materials: ["organic"], colors: ["silver", "green"], ...khr("BarramundiFish", "Microsoft", "CC0"), maxTex: 1024 },
  { id: "character-knight-001", name: "Knight", category: "character", subcategory: "stylized human", tags: ["knight", "hero", "character", "warrior", "game", "fantasy", "armour", "people"], style: ["stylized", "low-poly", "playful"], materials: ["metal", "fabric"], colors: ["blue", "silver"], ...KK("Character-Pack-Adventures", "addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb"), pivot: "bottom", clips: { Idle: "idle", Walking_A: "walk", Running_A: "run", Jump_Full_Short: "jump", Cheer: "cheer", Interact: "interact" } },
  { id: "character-mage-001", name: "Mage", category: "character", subcategory: "stylized human", tags: ["mage", "wizard", "character", "magic", "teacher", "fantasy", "game", "people"], style: ["stylized", "low-poly", "playful"], materials: ["fabric"], colors: ["purple", "blue"], ...KK("Character-Pack-Adventures", "addons/kaykit_character_pack_adventures/Characters/gltf/Mage.glb"), pivot: "bottom", clips: { Idle: "idle", Walking_A: "walk", Running_A: "run", Jump_Full_Short: "jump", Cheer: "cheer", Spellcast_Shoot: "cast" } },
  { id: "character-rogue-001", name: "Hooded Rogue", category: "character", subcategory: "stylized human", tags: ["rogue", "adventurer", "character", "explorer", "game", "fantasy", "people"], style: ["stylized", "low-poly", "playful"], materials: ["fabric", "leather"], colors: ["green", "brown"], ...KK("Character-Pack-Adventures", "addons/kaykit_character_pack_adventures/Characters/gltf/Rogue_Hooded.glb"), pivot: "bottom", clips: { Idle: "idle", Walking_A: "walk", Running_A: "run", Jump_Full_Short: "jump", Cheer: "cheer" } },
  { id: "character-hopper-001", name: "Platformer Hero", category: "character", subcategory: "stylized human", tags: ["character", "mascot", "kid", "game", "hero", "cute", "people"], style: ["stylized", "low-poly", "playful"], materials: ["plastic"], colors: ["blue", "orange"], ...KEN("3D-Platformer", "models/character.glb"), pivot: "bottom", clips: { idle: "idle", walk: "walk", jump: "jump" } },

  // ------------------------------------------------------------------ nature
  { id: "plant-potted-001", name: "Potted Plant", category: "nature", subcategory: "plant", tags: ["plant", "houseplant", "pot", "leaves", "green", "interior", "office", "botanical"], style: ["natural", "minimal", "realistic"], materials: ["organic", "ceramic"], colors: ["green", "terracotta"], ...khr("DiffuseTransmissionPlant", "Eric Chadwick, Rico Cilliers", "CCBY"), simplify: 0.5 },
  { id: "flowers-vase-001", name: "Flowers In A Glass Vase", category: "nature", subcategory: "flowers", tags: ["flowers", "vase", "bouquet", "florist", "glass", "spring", "wedding", "botanical"], style: ["natural", "editorial", "realistic"], materials: ["glass", "organic"], colors: ["pink", "green", "white"], ...khr("GlassVaseFlowers", "Eric Chadwick, Rico Cilliers", "CC0") },
  { id: "tree-round-001", name: "Round Tree", category: "nature", subcategory: "tree", tags: ["tree", "forest", "park", "green", "nature", "garden", "outdoor"], style: ["low-poly", "stylized"], materials: ["organic"], colors: ["green", "brown"], ...arena("tree"), pivot: "bottom" },
  { id: "trees-forest-001", name: "Forest Patch", category: "nature", subcategory: "tree", tags: ["forest", "trees", "pine", "woods", "nature", "landscape", "outdoor", "camping"], style: ["low-poly", "stylized"], materials: ["organic"], colors: ["green"], ...KEN("Racing", "models/decoration-forest.glb"), pivot: "bottom" },
  { id: "bush-001", name: "Bush", category: "nature", subcategory: "plant", tags: ["bush", "shrub", "garden", "green", "park", "hedge"], style: ["low-poly", "stylized"], materials: ["organic"], colors: ["green"], ...kk.city("bush"), pivot: "bottom" },
  { id: "cactus-001", name: "Potted Cactus", category: "nature", subcategory: "plant", tags: ["cactus", "succulent", "plant", "desert", "pot", "desk", "interior"], style: ["low-poly", "stylized", "playful"], materials: ["organic", "ceramic"], colors: ["green", "terracotta"], ...kk.furniture("cactus_medium_A"), pivot: "bottom" },
  { id: "rocks-001", name: "Desert Rocks", category: "nature", subcategory: "rock", tags: ["rocks", "stones", "boulder", "nature", "terrain", "desert", "mountain"], style: ["low-poly", "stylized"], materials: ["stone"], colors: ["grey", "sand"], ...kk.space("rocks_A"), pivot: "bottom" },

  // ------------------------------------------------------------------ architecture and environments
  { id: "building-tower-001", name: "City Tower", category: "architecture", subcategory: "building", tags: ["building", "tower", "office", "city", "skyscraper", "urban", "business", "corporate"], style: ["low-poly", "stylized"], materials: ["concrete", "glass"], colors: ["grey", "blue"], ...kk.city("building_H"), pivot: "bottom" },
  { id: "building-shop-001", name: "Corner Shop Building", category: "architecture", subcategory: "building", tags: ["building", "shop", "store", "street", "city", "retail", "urban", "restaurant"], style: ["low-poly", "stylized", "warm"], materials: ["brick", "glass"], colors: ["red", "white"], ...kk.city("building_A"), pivot: "bottom" },
  { id: "building-apartment-001", name: "Apartment Block", category: "architecture", subcategory: "building", tags: ["building", "apartment", "housing", "real estate", "property", "city", "home"], style: ["low-poly", "stylized"], materials: ["concrete", "glass"], colors: ["beige", "blue"], ...kk.city("building_C"), pivot: "bottom" },
  { id: "building-house-001", name: "Small Town House", category: "architecture", subcategory: "house", tags: ["house", "home", "real estate", "property", "family", "suburb", "estate agent"], style: ["low-poly", "stylized", "warm"], materials: ["brick", "wood"], colors: ["white", "red"], ...KEN("City-Builder", "models/building-small-a.glb"), pivot: "bottom" },
  { id: "fountain-plaza-001", name: "Plaza Fountain", category: "architecture", subcategory: "landmark", tags: ["fountain", "plaza", "square", "park", "city", "water", "landmark"], style: ["low-poly", "stylized"], materials: ["stone", "water"], colors: ["grey", "blue"], ...KEN("City-Builder", "models/pavement-fountain.glb"), pivot: "bottom" },
  { id: "column-classic-001", name: "Classical Column", category: "architecture", subcategory: "column", tags: ["column", "pillar", "classical", "museum", "law", "temple", "heritage", "greek"], style: ["classic", "low-poly", "editorial"], materials: ["stone"], colors: ["white", "grey"], ...arena("column"), pivot: "bottom" },
  { id: "statue-001", name: "Plinth Statue", category: "architecture", subcategory: "statue", tags: ["statue", "monument", "museum", "art", "gallery", "heritage", "sculpture"], style: ["classic", "low-poly"], materials: ["stone"], colors: ["grey"], ...arena("statue"), pivot: "bottom" },
  { id: "watertower-001", name: "Water Tower", category: "architecture", subcategory: "landmark", tags: ["water tower", "city", "industrial", "rooftop", "landmark", "urban"], style: ["low-poly", "stylized", "industrial"], materials: ["wood", "metal"], colors: ["brown", "grey"], ...kk.city("watertower"), pivot: "bottom" },
  { id: "space-module-001", name: "Space Base Module", category: "environment", subcategory: "futuristic", tags: ["space", "base", "module", "futuristic", "sci-fi", "mars", "habitat", "tech"], style: ["futuristic", "low-poly", "stylized"], materials: ["metal", "glass"], colors: ["white", "orange"], ...kk.space("basemodule_A"), pivot: "bottom" },
  { id: "space-lander-001", name: "Space Lander", category: "vehicle", subcategory: "spacecraft", tags: ["lander", "spacecraft", "rocket", "space", "futuristic", "launch", "startup"], style: ["futuristic", "low-poly", "stylized"], materials: ["metal"], colors: ["white", "orange"], ...kk.space("lander_A"), pivot: "bottom" },
  { id: "wind-turbine-001", name: "Wind Turbine", category: "environment", subcategory: "energy", tags: ["wind turbine", "energy", "renewable", "green", "eco", "sustainability", "power"], style: ["low-poly", "stylized", "futuristic"], materials: ["metal"], colors: ["white"], ...kk.space("windturbine_tall"), pivot: "bottom" },
  { id: "solar-panel-001", name: "Solar Panel", category: "environment", subcategory: "energy", tags: ["solar", "solar panel", "energy", "renewable", "eco", "sustainability", "tech"], style: ["low-poly", "stylized"], materials: ["glass", "metal"], colors: ["blue", "grey"], ...kk.space("solarpanel"), pivot: "bottom" },
  { id: "kitchen-table-001", name: "Restaurant Kitchen Table", category: "environment", subcategory: "restaurant", tags: ["kitchen", "restaurant", "chef", "cooking", "counter", "food", "cafe"], style: ["low-poly", "stylized", "warm"], materials: ["wood", "metal"], colors: ["wood", "grey"], ...kk.food("kitchentable_A_large_decorated"), pivot: "bottom" },
  { id: "cafe-table-001", name: "Set Cafe Table", category: "environment", subcategory: "restaurant", tags: ["table", "cafe", "restaurant", "dining", "bistro", "food", "coffee"], style: ["low-poly", "stylized", "warm"], materials: ["wood", "fabric"], colors: ["wood", "white"], ...kk.food("table_round_A_decorated"), pivot: "bottom" },
  { id: "shelf-decorated-001", name: "Decorated Bookshelf", category: "environment", subcategory: "interior", tags: ["shelf", "bookshelf", "books", "interior", "office", "library", "study", "home"], style: ["low-poly", "stylized", "warm"], materials: ["wood"], colors: ["wood"], ...kk.furniture("shelf_B_large_decorated"), pivot: "bottom" },

  // ------------------------------------------------------------------ vehicles (stylized)
  { id: "car-taxi-001", name: "City Taxi", category: "vehicle", subcategory: "car", tags: ["taxi", "cab", "car", "city", "transport", "ride", "urban"], style: ["low-poly", "stylized", "playful"], materials: ["paint", "glass"], colors: ["yellow"], ...kk.city("car_taxi"), pivot: "bottom" },
  { id: "car-sedan-001", name: "Sedan", category: "vehicle", subcategory: "car", tags: ["car", "sedan", "auto", "dealer", "garage", "rental", "vehicle"], style: ["low-poly", "stylized"], materials: ["paint", "glass"], colors: ["blue"], ...kk.city("car_sedan"), pivot: "bottom" },
  { id: "motorcycle-001", name: "Motorcycle", category: "vehicle", subcategory: "motorcycle", tags: ["motorcycle", "motorbike", "bike", "rider", "speed", "delivery", "vehicle"], style: ["low-poly", "stylized"], materials: ["paint", "metal"], colors: ["red", "black"], ...KEN("Racing", "models/vehicle-motorcycle.glb"), pivot: "bottom" },
  { id: "truck-001", name: "Delivery Truck", category: "vehicle", subcategory: "truck", tags: ["truck", "delivery", "logistics", "moving", "transport", "cargo", "shipping"], style: ["low-poly", "stylized", "playful"], materials: ["paint"], colors: ["red"], ...KEN("Racing", "models/vehicle-truck-red.glb"), pivot: "bottom" },

  // ------------------------------------------------------------------ props
  { id: "sofa-stylized-001", name: "Stylized Couch", category: "prop", subcategory: "furniture", tags: ["couch", "sofa", "furniture", "living room", "home", "interior", "cozy"], style: ["low-poly", "stylized", "warm"], materials: ["fabric"], colors: ["blue"], ...kk.furniture("couch"), pivot: "bottom" },
  { id: "armchair-stylized-001", name: "Cozy Armchair", category: "prop", subcategory: "furniture", tags: ["armchair", "chair", "furniture", "reading", "home", "interior", "cozy"], style: ["low-poly", "stylized", "warm"], materials: ["fabric"], colors: ["green"], ...kk.furniture("armchair_pillows"), pivot: "bottom" },
  { id: "lamp-standing-001", name: "Standing Lamp", category: "prop", subcategory: "lighting", tags: ["lamp", "floor lamp", "light", "interior", "home", "reading"], style: ["low-poly", "stylized"], materials: ["fabric", "metal"], colors: ["white", "black"], ...kk.furniture("lamp_standing"), pivot: "bottom" },
  { id: "books-001", name: "Book Stack", category: "prop", subcategory: "books", tags: ["books", "book", "reading", "library", "school", "education", "study", "author"], style: ["low-poly", "stylized", "warm"], materials: ["paper"], colors: ["red", "blue", "green"], ...kk.furniture("book_set"), pivot: "bottom" },
  { id: "spellbook-001", name: "Open Book", category: "prop", subcategory: "books", tags: ["book", "open book", "reading", "story", "magic", "education", "author"], style: ["stylized", "playful"], materials: ["paper", "leather"], colors: ["brown", "cream"], ...kk.adv("spellbook_open"), pivot: "bottom" },
  { id: "mug-001", name: "Full Mug", category: "prop", subcategory: "tableware", tags: ["mug", "cup", "drink", "coffee", "beer", "cafe", "pub"], style: ["stylized", "warm"], materials: ["wood", "foam"], colors: ["brown", "white"], ...kk.adv("mug_full"), pivot: "bottom" },
  { id: "frame-standing-001", name: "Standing Picture Frame", category: "prop", subcategory: "decor", tags: ["picture frame", "photo", "frame", "desk", "decor", "home", "gallery"], style: ["low-poly", "stylized", "minimal"], materials: ["wood"], colors: ["wood"], ...kk.furniture("pictureframe_standing_A"), pivot: "bottom" },
  { id: "food-burger-001", name: "Burger", category: "prop", subcategory: "food", tags: ["burger", "food", "fast food", "restaurant", "diner", "takeaway", "meal"], style: ["stylized", "playful", "warm"], materials: ["organic"], colors: ["brown", "green", "yellow"], ...kk.food("food_burger"), pivot: "bottom" },
  { id: "food-dinner-001", name: "Dinner Plate", category: "prop", subcategory: "food", tags: ["dinner", "plate", "meal", "food", "restaurant", "steak", "dining"], style: ["stylized", "warm"], materials: ["organic", "ceramic"], colors: ["white", "brown"], ...kk.food("food_dinner"), pivot: "bottom" },
  { id: "pot-stew-001", name: "Stew Pot", category: "prop", subcategory: "kitchen", tags: ["pot", "stew", "cooking", "kitchen", "chef", "soup", "restaurant"], style: ["stylized", "warm"], materials: ["metal"], colors: ["grey", "orange"], ...kk.food("stew_pot"), pivot: "bottom" },
  { id: "crate-tomatoes-001", name: "Crate Of Tomatoes", category: "prop", subcategory: "packaging", tags: ["crate", "tomatoes", "produce", "market", "grocery", "farm", "fresh"], style: ["stylized", "natural"], materials: ["wood", "organic"], colors: ["red", "wood"], ...kk.food("crate_tomatoes"), pivot: "bottom" },
  { id: "barrel-001", name: "Barrel", category: "prop", subcategory: "packaging", tags: ["barrel", "cask", "storage", "brewery", "winery", "warehouse"], style: ["low-poly", "stylized"], materials: ["wood", "metal"], colors: ["wood"], ...kk.proto("Barrel_A"), pivot: "bottom" },
  { id: "target-001", name: "Archery Target", category: "prop", subcategory: "sports", tags: ["target", "goal", "aim", "sports", "archery", "marketing", "focus"], style: ["low-poly", "stylized", "playful"], materials: ["wood", "fabric"], colors: ["red", "white"], ...kk.proto("target_stand_A_Decorated"), pivot: "bottom" },
  { id: "trophy-001", name: "Trophy Cup", category: "prop", subcategory: "sports", tags: ["trophy", "cup", "award", "winner", "sports", "achievement", "prize"], style: ["low-poly", "stylized"], materials: ["metal"], colors: ["gold"], ...arena("trophy"), pivot: "bottom" },
  { id: "coin-001", name: "Gold Coin", category: "prop", subcategory: "finance", tags: ["coin", "money", "gold", "finance", "payment", "crypto", "reward", "savings"], style: ["stylized", "playful"], materials: ["metal"], colors: ["gold"], ...KEN("3D-Platformer", "models/coin.glb") },
  { id: "flag-001", name: "Goal Flag", category: "prop", subcategory: "decor", tags: ["flag", "goal", "finish", "milestone", "achievement", "game"], style: ["stylized", "playful"], materials: ["fabric", "wood"], colors: ["red", "white"], ...KEN("3D-Platformer", "models/flag.glb"), pivot: "bottom" },
  { id: "streetlight-001", name: "Street Light", category: "prop", subcategory: "street", tags: ["street light", "lamp post", "city", "night", "street", "urban"], style: ["low-poly", "stylized"], materials: ["metal"], colors: ["grey"], ...kk.city("streetlight"), pivot: "bottom" },
  { id: "bench-001", name: "Park Bench", category: "prop", subcategory: "street", tags: ["bench", "park", "seat", "city", "outdoor", "relax"], style: ["low-poly", "stylized"], materials: ["wood", "metal"], colors: ["wood", "green"], ...kk.city("bench"), pivot: "bottom" },
  { id: "shield-001", name: "Painted Shield", category: "prop", subcategory: "security", tags: ["shield", "protection", "security", "insurance", "safety", "defence", "guard"], style: ["stylized", "playful"], materials: ["wood", "metal"], colors: ["red", "blue"], ...kk.adv("shield_round_color") },

  // ------------------------------------------------------------------ HDR lighting (Poly Haven, CC0)
  HAVEN("studio_small_03_1k", "Small Photo Studio", ["studio", "softbox", "product", "neutral"], ["premium", "minimal", "clean"]),
  HAVEN("empty_warehouse_01_1k", "Empty Warehouse", ["studio", "industrial", "warehouse", "interior"], ["industrial", "cinematic"]),
  HAVEN("venice_sunset_1k", "Venice Sunset", ["cinematic", "sunset", "golden hour", "city", "warm"], ["cinematic", "warm", "luxury"]),
  HAVEN("dikhololo_night_1k", "Night Sky", ["cinematic", "night", "dark", "moody"], ["cinematic", "dark", "moody"]),
  HAVEN("forest_slope_1k", "Forest Slope", ["nature", "forest", "green", "outdoor", "daylight"], ["natural", "fresh"]),
  HAVEN("potsdamer_platz_1k", "City Square", ["city", "urban", "daylight", "street"], ["urban", "editorial"]),
  HAVEN("st_fagans_interior_1k", "Heritage Interior", ["interior", "room", "heritage", "warm"], ["classic", "warm"]),

  // ------------------------------------------------------------------ owner uploads (licence to confirm)
  // Uploaded in the project thread on 2026-11-19. Both are trimesh exports of primitive shapes with
  // flat colours (no textures, no normals, no animation clips, although the macaw's file name says
  // "animation ready"). Origin and licence unknown, so commercialUse and redistribution stay false.
  { id: "vehicle-mars-rover-001", name: "Mars Rover", category: "vehicle", subcategory: "rover", tags: ["rover", "mars rover", "space", "exploration", "robot", "science", "planet", "vehicle"], style: ["stylized", "low-poly", "futuristic"], materials: ["metal", "composite"], colors: ["grey", "gold", "orange"], file: "owner/mars_rover_premium.glb", license: { ...LICENSES.ORIGINAL, evidence: "Made by the project owner with ChatGPT and uploaded on 2026-11-19 (mars_rover_premium.glb); the owner confirmed on 2026-11-19 that it is their own work, free to use." }, source: { url: "owner-upload:mars_rover_premium.glb", creator: "Project owner (made with ChatGPT)", via: "project thread upload" }, upright: true, pivot: "bottom", modifications: "Stood upright (the file is Z-up)." },
  { id: "animal-macaw-001", name: "Macaw", category: "character", subcategory: "bird", tags: ["macaw", "parrot", "bird", "tropical", "jungle", "animal", "colourful", "pet"], style: ["stylized", "low-poly", "playful"], materials: ["feathers"], colors: ["blue", "yellow"], file: "owner/premium_macaw_animation_ready.glb", license: { ...LICENSES.ORIGINAL, evidence: "Made by the project owner with ChatGPT and uploaded on 2026-11-19 (premium_macaw_animation_ready.glb); the owner confirmed on 2026-11-19 that it is their own work, free to use." }, source: { url: "owner-upload:premium_macaw_animation_ready.glb", creator: "Project owner (made with ChatGPT)", via: "project thread upload" }, upright: true, face: -90, modifications: "Stood upright (the file is Z-up) and turned to face the camera." },
];

// Abstract models are made in code by scripts/assets/abstract.mjs (original work, CC0 dedication).
export const ABSTRACT = [
  { id: "abstract-glass-orb-001", name: "Glass Orb", subcategory: "sphere", tags: ["sphere", "orb", "glass", "abstract", "bubble", "crystal ball", "minimal"], style: ["premium", "minimal", "futuristic"], materials: ["glass"], colors: ["clear"] },
  { id: "abstract-blob-001", name: "Liquid Blob", subcategory: "blob", tags: ["blob", "liquid", "organic", "abstract", "fluid", "metaball", "creative"], style: ["futuristic", "playful", "premium"], materials: ["chrome", "liquid"], colors: ["silver"] },
  { id: "abstract-crystal-001", name: "Crystal Shard", subcategory: "crystal", tags: ["crystal", "gem", "diamond", "shard", "jewel", "abstract", "luxury"], style: ["luxury", "futuristic", "premium"], materials: ["glass"], colors: ["violet", "clear"] },
  { id: "abstract-torus-knot-001", name: "Chrome Knot", subcategory: "geometric", tags: ["torus knot", "knot", "geometric", "chrome", "abstract", "loop", "infinite"], style: ["futuristic", "premium", "editorial"], materials: ["chrome"], colors: ["silver"] },
  { id: "abstract-ribbon-001", name: "Silk Ribbon", subcategory: "ribbon", tags: ["ribbon", "silk", "flow", "wave", "abstract", "fashion", "soft"], style: ["luxury", "editorial", "minimal"], materials: ["satin"], colors: ["pink", "gold"] },
  { id: "abstract-rings-001", name: "Orbital Rings", subcategory: "geometric", tags: ["rings", "orbit", "geometric", "abstract", "space", "tech", "gyroscope"], style: ["futuristic", "minimal", "premium"], materials: ["metal"], colors: ["gold", "black"] },
  { id: "abstract-pill-001", name: "Frosted Capsule", subcategory: "geometric", tags: ["capsule", "pill", "health", "pharmacy", "abstract", "soft", "wellness"], style: ["minimal", "clean", "premium"], materials: ["frosted glass"], colors: ["white", "blue"] },
  { id: "abstract-particles-001", name: "Particle Cloud", subcategory: "particles", tags: ["particles", "dust", "stars", "sparkle", "abstract", "atmosphere", "glow"], style: ["cinematic", "futuristic", "minimal"], materials: ["emissive"], colors: ["white", "gold"] },
];

/** Checked and refused. Kept so nobody adds them back. */
export const REJECTED = [
  { name: "DamagedHelmet (Khronos samples)", reason: "Original model is CC BY-NC 4.0 (theblueturtle_): no commercial use." },
  { name: "BrainStem (Khronos samples)", reason: "Poser EULA, not an open licence." },
  { name: "DragonAttenuation, DragonDispersion (Khronos samples)", reason: "Stanford 3D Scanning Repository terms (research use), not a redistribution licence for commercial sites." },
  { name: "Duck (Khronos samples)", reason: "SCEA Shared Source License, not an open content licence." },
  { name: "VirtualCity (Khronos samples)", reason: "3DRT licence limited to glTF testing." },
  { name: "CesiumMan, CesiumMilkTruck (Khronos samples)", reason: "CC BY 4.0, but the Cesium logo is painted large on the texture (a trademark): rejected rather than repainted." },
  { name: "GlassHurricaneCandleHolder (Khronos samples)", reason: "Third-party logos printed on the base texture." },
  { name: "CommercialRefrigerator (Khronos samples)", reason: "Product label artwork with brand names; little use beyond a test scene." },
  { name: "Kenney cloud.glb and KayKit terrain_tall (as cloud and mountain)", reason: "Licence fine (CC0) but the shapes read as plain blocks, not as a cloud or a mountain: rejected on quality." },
  { name: "WaterBottle (Khronos samples)", reason: "CC0, but a made-up brand mark (\"Climb Higher\") is printed on its only texture; painting it out leaves a plain shape. Found in the four-angle logo audit." },
  { name: "MosquitoInAmber (Khronos samples)", reason: "Licence is fine (CC BY 4.0) but 24 MB for a single prop fails the performance budget." },
  { name: "cirque_de_gavarnie.glb (supplied)", reason: "CC BY-NC-SA: no commercial use." },
  { name: "frieren-frieren-t-pose-3d-model.zip (supplied)", reason: "A copyrighted anime character with no licence." },
  { name: "Poly Haven, ambientCG, Sketchfab, Quaternius, OpenGameArt, Kenney.nl (direct)", reason: "Not reachable from the build environment; Poly Haven HDRIs came through the drei-assets mirror and Kenney models through Kenney's own GitHub starter kits instead." },
];
