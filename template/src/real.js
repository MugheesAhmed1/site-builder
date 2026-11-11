// The real-life pack: photoreal characters, fish and particle sprites. Every picture was
// generated for this library with Pollinations.ai (free, no account) from an original prompt,
// then cut out and saved as a small transparent WebP in public/real. Nothing is generated
// while a site runs: the pictures are plain files and a downloaded site carries the ones it uses.

// Where the pictures live. A site served from its root uses the paths as they are; the
// ready-to-host download sets window.__ASSET_BASE__ to "." so it also works in a sub-folder.
export function asset(path) {
  const base = typeof window !== "undefined" ? window.__ASSET_BASE__ : "";
  return base && typeof path === "string" && path[0] === "/" && path[1] !== "/" ? base + path : path;
}

export const REAL_CHARACTERS = [
 {
  "id": "C-521",
  "family": "real-person",
  "name": "Chef",
  "src": "/real/people/chef.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "food",
   "hotel"
  ]
 },
 {
  "id": "C-522",
  "family": "real-person",
  "name": "Barista",
  "src": "/real/people/barista.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "food",
   "shop"
  ]
 },
 {
  "id": "C-523",
  "family": "real-person",
  "name": "Baker",
  "src": "/real/people/baker.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "food",
   "shop"
  ]
 },
 {
  "id": "C-524",
  "family": "real-person",
  "name": "Fitness coach",
  "src": "/real/people/coach.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "fitness",
   "health"
  ]
 },
 {
  "id": "C-525",
  "family": "real-person",
  "name": "Yoga teacher",
  "src": "/real/people/yoga.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "fitness",
   "health",
   "beauty"
  ]
 },
 {
  "id": "C-526",
  "family": "real-person",
  "name": "Dentist",
  "src": "/real/people/dentist.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "dentist",
   "health",
   "role-doctor"
  ]
 },
 {
  "id": "C-527",
  "family": "real-person",
  "name": "Doctor",
  "src": "/real/people/doctor.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "hospital",
   "health",
   "role-doctor"
  ]
 },
 {
  "id": "C-528",
  "family": "real-person",
  "name": "Nurse",
  "src": "/real/people/nurse.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "hospital",
   "health",
   "role-doctor"
  ]
 },
 {
  "id": "C-529",
  "family": "real-person",
  "name": "Designer",
  "src": "/real/people/designer.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "role-designer",
   "agency",
   "creator",
   "portfolio"
  ]
 },
 {
  "id": "C-530",
  "family": "real-person",
  "name": "Developer",
  "src": "/real/people/developer.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "role-dev",
   "role-it",
   "role-data",
   "product",
   "portfolio"
  ]
 },
 {
  "id": "C-531",
  "family": "real-person",
  "name": "Photographer",
  "src": "/real/people/photographer.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "photo",
   "role-photo",
   "creator"
  ]
 },
 {
  "id": "C-532",
  "family": "real-person",
  "name": "Florist",
  "src": "/real/people/florist.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "shop",
   "events",
   "beauty"
  ]
 },
 {
  "id": "C-533",
  "family": "real-person",
  "name": "Hair stylist",
  "src": "/real/people/stylist.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "beauty"
  ]
 },
 {
  "id": "C-534",
  "family": "real-person",
  "name": "Property agent",
  "src": "/real/people/agent.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "property",
   "role-sales"
  ]
 },
 {
  "id": "C-535",
  "family": "real-person",
  "name": "Teacher",
  "src": "/real/people/teacher.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "school",
   "role-teacher"
  ]
 },
 {
  "id": "C-536",
  "family": "real-person",
  "name": "Student",
  "src": "/real/people/student.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "role-student",
   "school"
  ]
 },
 {
  "id": "C-537",
  "family": "real-person",
  "name": "Musician",
  "src": "/real/people/musician.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "events",
   "creator",
   "role-creator"
  ]
 },
 {
  "id": "C-538",
  "family": "real-person",
  "name": "Gardener",
  "src": "/real/people/gardener.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "nonprofit",
   "trades",
   "property"
  ]
 },
 {
  "id": "C-539",
  "family": "real-person",
  "name": "Architect",
  "src": "/real/people/architect.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "role-engineer",
   "property",
   "trades"
  ]
 },
 {
  "id": "C-540",
  "family": "real-person",
  "name": "Founder",
  "src": "/real/people/founder.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "role-ceo",
   "role-pm",
   "consulting",
   "agency",
   "product",
   "portfolio"
  ]
 },
 {
  "id": "C-541",
  "family": "real-person",
  "name": "Mechanic",
  "src": "/real/people/mechanic.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "auto",
   "trades"
  ]
 },
 {
  "id": "C-542",
  "family": "real-person",
  "name": "Consultant",
  "src": "/real/people/consultant.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "consulting",
   "law",
   "role-finance",
   "role-hr",
   "role-ceo",
   "role-sales"
  ]
 },
 {
  "id": "C-543",
  "family": "real-person",
  "name": "Artist",
  "src": "/real/people/artist.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "role-designer",
   "creator",
   "events"
  ]
 },
 {
  "id": "C-544",
  "family": "real-person",
  "name": "Traveller",
  "src": "/real/people/traveller.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "hotel",
   "events",
   "general",
   "role-writer"
  ]
 },
 {
  "id": "C-545",
  "family": "real-animal",
  "name": "Red fox",
  "src": "/real/animals/fox.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "agency",
   "creator",
   "general"
  ]
 },
 {
  "id": "C-546",
  "family": "real-animal",
  "name": "Tabby cat",
  "src": "/real/animals/cat.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "pets",
   "shop",
   "role-writer"
  ]
 },
 {
  "id": "C-547",
  "family": "real-animal",
  "name": "Golden dog",
  "src": "/real/animals/dog.webp",
  "idle": "wiggle",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "pets",
   "general"
  ]
 },
 {
  "id": "C-548",
  "family": "real-animal",
  "name": "Corgi",
  "src": "/real/animals/corgi.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "pets",
   "shop"
  ]
 },
 {
  "id": "C-549",
  "family": "real-animal",
  "name": "Rabbit",
  "src": "/real/animals/rabbit.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "pets",
   "school"
  ]
 },
 {
  "id": "C-550",
  "family": "real-animal",
  "name": "Owl",
  "src": "/real/animals/owl.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "school",
   "law",
   "consulting",
   "role-teacher",
   "role-writer"
  ]
 },
 {
  "id": "C-551",
  "family": "real-animal",
  "name": "Parrot",
  "src": "/real/animals/parrot.webp",
  "idle": "wiggle",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "pets",
   "events",
   "role-marketer"
  ]
 },
 {
  "id": "C-552",
  "family": "real-animal",
  "name": "Penguin",
  "src": "/real/animals/penguin.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "school",
   "general",
   "role-hr"
  ]
 },
 {
  "id": "C-553",
  "family": "real-animal",
  "name": "Panda",
  "src": "/real/animals/panda.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "nonprofit",
   "school"
  ]
 },
 {
  "id": "C-554",
  "family": "real-animal",
  "name": "Koala",
  "src": "/real/animals/koala.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "nonprofit",
   "hotel"
  ]
 },
 {
  "id": "C-555",
  "family": "real-animal",
  "name": "Lion",
  "src": "/real/animals/lion.webp",
  "idle": "wiggle",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "role-ceo",
   "fitness",
   "role-sales"
  ]
 },
 {
  "id": "C-556",
  "family": "real-animal",
  "name": "Deer",
  "src": "/real/animals/deer.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "nonprofit",
   "hotel"
  ]
 },
 {
  "id": "C-557",
  "family": "real-animal",
  "name": "Hedgehog",
  "src": "/real/animals/hedgehog.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "shop",
   "pets"
  ]
 },
 {
  "id": "C-558",
  "family": "real-animal",
  "name": "Otter",
  "src": "/real/animals/otter.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "pets",
   "hotel"
  ]
 },
 {
  "id": "C-559",
  "family": "real-animal",
  "name": "Horse",
  "src": "/real/animals/horse.webp",
  "idle": "wiggle",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "fitness",
   "property"
  ]
 },
 {
  "id": "C-560",
  "family": "real-animal",
  "name": "Bulldog",
  "src": "/real/animals/bulldog.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "pets",
   "trades"
  ]
 },
 {
  "id": "C-561",
  "family": "real-animal",
  "name": "Hamster",
  "src": "/real/animals/hamster.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "pets"
  ]
 },
 {
  "id": "C-562",
  "family": "real-animal",
  "name": "Frog",
  "src": "/real/animals/frog.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "nonprofit",
   "school"
  ]
 },
 {
  "id": "C-563",
  "family": "real-animal",
  "name": "Tortoise",
  "src": "/real/animals/turtle.webp",
  "idle": "wiggle",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "health",
   "nonprofit",
   "role-finance"
  ]
 },
 {
  "id": "C-564",
  "family": "real-animal",
  "name": "Butterfly",
  "src": "/real/animals/butterfly.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "beauty",
   "nonprofit",
   "events"
  ]
 },
 {
  "id": "C-565",
  "family": "real-animal",
  "name": "Bee",
  "src": "/real/animals/bee.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "nonprofit",
   "food"
  ]
 },
 {
  "id": "C-566",
  "family": "real-animal",
  "name": "Duckling",
  "src": "/real/animals/duck.webp",
  "idle": "sway",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "school",
   "pets",
   "role-student"
  ]
 },
 {
  "id": "C-567",
  "family": "real-animal",
  "name": "Raccoon",
  "src": "/real/animals/raccoon.webp",
  "idle": "wiggle",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "role-dev",
   "creator"
  ]
 },
 {
  "id": "C-568",
  "family": "real-animal",
  "name": "Sloth",
  "src": "/real/animals/sloth.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "health",
   "hotel"
  ]
 },
 {
  "id": "C-569",
  "family": "real-mascot",
  "name": "Plush bear",
  "src": "/real/mascots/plush-bear.webp",
  "idle": "bounce",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "shop",
   "school"
  ]
 },
 {
  "id": "C-570",
  "family": "real-mascot",
  "name": "Plush bunny",
  "src": "/real/mascots/plush-bunny.webp",
  "idle": "wiggle",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "shop",
   "beauty"
  ]
 },
 {
  "id": "C-571",
  "family": "real-mascot",
  "name": "Plush dinosaur",
  "src": "/real/mascots/plush-dino.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "school",
   "creator"
  ]
 },
 {
  "id": "C-572",
  "family": "real-mascot",
  "name": "Plush octopus",
  "src": "/real/mascots/plush-octopus.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "creator",
   "agency"
  ]
 },
 {
  "id": "C-573",
  "family": "real-mascot",
  "name": "Clay robot",
  "src": "/real/mascots/clay-robot.webp",
  "idle": "bounce",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "product",
   "role-dev",
   "role-it",
   "role-data"
  ]
 },
 {
  "id": "C-574",
  "family": "real-mascot",
  "name": "Clay monster",
  "src": "/real/mascots/clay-monster.webp",
  "idle": "wiggle",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "creator",
   "agency",
   "role-marketer"
  ]
 },
 {
  "id": "C-575",
  "family": "real-mascot",
  "name": "Toy astronaut",
  "src": "/real/mascots/toy-astronaut.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "product",
   "role-engineer",
   "role-data",
   "role-pm"
  ]
 },
 {
  "id": "C-576",
  "family": "real-mascot",
  "name": "Wooden fox",
  "src": "/real/mascots/wood-fox.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "shop"
  ]
 },
 {
  "id": "C-577",
  "family": "real-mascot",
  "name": "Ceramic cat",
  "src": "/real/mascots/ceramic-cat.webp",
  "idle": "bounce",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "shop",
   "food"
  ]
 },
 {
  "id": "C-578",
  "family": "real-mascot",
  "name": "Felt owl",
  "src": "/real/mascots/felt-owl.webp",
  "idle": "wiggle",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "school",
   "role-teacher"
  ]
 },
 {
  "id": "C-579",
  "family": "real-mascot",
  "name": "Rubber duck",
  "src": "/real/mascots/rubber-duck.webp",
  "idle": "bob",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "role-dev",
   "role-it"
  ]
 },
 {
  "id": "C-580",
  "family": "real-mascot",
  "name": "Cactus toy",
  "src": "/real/mascots/cactus-toy.webp",
  "idle": "float",
  "palette": "brand",
  "accessory": "none",
  "expression": "smile",
  "variant": 0,
  "fits": [
   "shop",
   "property"
  ]
 }
];

export const REAL_FISH = [
 {
  "id": "clownfish",
  "name": "Clownfish",
  "src": "/real/fish/clownfish.webp"
 },
 {
  "id": "blue-tang",
  "name": "Blue tang",
  "src": "/real/fish/blue-tang.webp"
 },
 {
  "id": "goldfish",
  "name": "Goldfish",
  "src": "/real/fish/goldfish.webp"
 },
 {
  "id": "betta",
  "name": "Betta",
  "src": "/real/fish/betta.webp"
 },
 {
  "id": "angelfish",
  "name": "Angelfish",
  "src": "/real/fish/angelfish.webp"
 },
 {
  "id": "koi",
  "name": "Koi",
  "src": "/real/fish/koi.webp"
 },
 {
  "id": "tetra",
  "name": "Neon tetra",
  "src": "/real/fish/tetra.webp"
 },
 {
  "id": "guppy",
  "name": "Guppy",
  "src": "/real/fish/guppy.webp"
 },
 {
  "id": "discus",
  "name": "Discus",
  "src": "/real/fish/discus.webp"
 },
 {
  "id": "mandarin",
  "name": "Mandarin fish",
  "src": "/real/fish/mandarin.webp"
 },
 {
  "id": "lionfish",
  "name": "Lionfish",
  "src": "/real/fish/lionfish.webp"
 },
 {
  "id": "puffer",
  "name": "Pufferfish",
  "src": "/real/fish/puffer.webp"
 },
 {
  "id": "butterflyfish",
  "name": "Butterflyfish",
  "src": "/real/fish/butterflyfish.webp"
 },
 {
  "id": "yellow-tang",
  "name": "Yellow tang",
  "src": "/real/fish/yellow-tang.webp"
 },
 {
  "id": "turtle-sea",
  "name": "Sea turtle",
  "src": "/real/fish/turtle-sea.webp"
 },
 {
  "id": "parrotfish",
  "name": "Parrotfish",
  "src": "/real/fish/parrotfish.webp"
 },
 {
  "id": "damsel",
  "name": "Damselfish",
  "src": "/real/fish/damsel.webp"
 },
 {
  "id": "cowfish",
  "name": "Cowfish",
  "src": "/real/fish/cowfish.webp"
 },
 {
  "id": "shrimp",
  "name": "Cleaner shrimp",
  "src": "/real/fish/shrimp.webp"
 },
 {
  "id": "rainbowfish",
  "name": "Rainbowfish",
  "src": "/real/fish/rainbowfish.webp"
 },
 {
  "id": "flame-angel",
  "name": "Flame angelfish",
  "src": "/real/fish/flame-angel.webp"
 },
 {
  "id": "gourami",
  "name": "Gourami",
  "src": "/real/fish/gourami.webp"
 },
 {
  "id": "platy",
  "name": "Platy",
  "src": "/real/fish/platy.webp"
 },
 {
  "id": "firefish",
  "name": "Firefish",
  "src": "/real/fish/firefish.webp"
 }
];

export const REAL_SPRITES = {
 "petal-pink": "/real/sprites/petal-pink.webp",
 "rose-petal": "/real/sprites/rose-petal.webp",
 "maple": "/real/sprites/maple.webp",
 "oak": "/real/sprites/oak.webp",
 "ginkgo": "/real/sprites/ginkgo.webp",
 "green-leaf": "/real/sprites/green-leaf.webp",
 "snowflake": "/real/sprites/snowflake.webp",
 "bubble": "/real/sprites/bubble.webp",
 "feather": "/real/sprites/feather.webp",
 "butterfly-blue": "/real/sprites/butterfly-blue.webp",
 "ladybug": "/real/sprites/ladybug.webp",
 "coffee-bean": "/real/sprites/coffee-bean.webp",
 "lavender": "/real/sprites/lavender.webp",
 "confetti-gold": "/real/sprites/confetti-gold.webp",
 "chestnut": "/real/sprites/chestnut.webp",
 "pinecone": "/real/sprites/pinecone.webp",
 "daisy-petal": "/real/sprites/daisy-petal.webp",
 "sunflower-petal": "/real/sprites/sunflower-petal.webp",
 "star-anise": "/real/sprites/star-anise.webp"
};

// Larger cut-outs that scenes layer and animate: coral, clouds, birds, flowers, food.
export const REAL_PROPS = {
 "coral-pink": "/real/props/coral-pink.webp",
 "coral-orange": "/real/props/coral-orange.webp",
 "seaweed": "/real/props/seaweed.webp",
 "anemone": "/real/props/anemone.webp",
 "starfish": "/real/props/starfish.webp",
 "shell": "/real/props/shell.webp",
 "cloud-3": "/real/props/cloud-3.webp",
 "balloon": "/real/props/balloon.webp",
 "paper-plane": "/real/props/paper-plane.webp",
 "sparrow": "/real/props/sparrow.webp",
 "gull": "/real/props/gull.webp",
 "sunflower": "/real/props/sunflower.webp",
 "tulip": "/real/props/tulip.webp",
 "daisy": "/real/props/daisy.webp",
 "fern": "/real/props/fern.webp",
 "palm-leaf": "/real/props/palm-leaf.webp",
 "monstera": "/real/props/monstera.webp",
 "croissant": "/real/props/croissant.webp",
 "strawberry": "/real/props/strawberry.webp",
 "lemon": "/real/props/lemon.webp",
 "coffee-cup": "/real/props/coffee-cup.webp",
 "macaron": "/real/props/macaron.webp",
 "cherry": "/real/props/cherry.webp",
 "mint": "/real/props/mint.webp",
 "chocolate": "/real/props/chocolate.webp",
 "moon": "/real/props/moon.webp",
 "planet": "/real/props/planet.webp",
 "donut": "/real/props/donut.webp",
 "blueberries": "/real/props/blueberries.webp",
 "cupcake": "/real/props/cupcake.webp",
 "watermelon": "/real/props/watermelon.webp",
 "lotus": "/real/props/lotus.webp",
 "orchid": "/real/props/orchid.webp",
 "party-balloon": "/real/props/party-balloon.webp",
 "dove": "/real/props/dove.webp"
};

// Full-screen background photos that sit behind a scene's moving layers.
export const REAL_PLATES = {
 "reef": "/real/plates/reef.webp",
 "forest": "/real/plates/forest.webp",
 "mountains": "/real/plates/mountains.webp",
 "sky": "/real/plates/sky.webp",
 "night": "/real/plates/night.webp",
 "dunes": "/real/plates/dunes.webp",
 "ocean": "/real/plates/ocean.webp",
 "autumn": "/real/plates/autumn.webp",
 "blossom": "/real/plates/blossom.webp",
 "snow": "/real/plates/snow.webp",
 "city": "/real/plates/city.webp",
 "cafe": "/real/plates/cafe.webp"
};
