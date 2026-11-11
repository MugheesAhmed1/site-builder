import type { SiteKind } from "./types";

// Rule-based understanding of what the user typed ("website for my bakery in Lahore").
// Keyword lists decide the kind of site and the business category. No AI.

export interface Category {
  id: string;
  label: string;
  keywords: string[];
  physical: boolean; // has a place people visit (shows hours and address)
  pricing: boolean; // usually shows plans or a price list
  primaryCta: string;
  kicker: string;
  services: string[];
  process: { title: string; description: string }[];
  faq: { question: string; answer: string }[];
  headlines: string[]; // {name}, {city}, {what}, {audience} are filled in
}

export const CATEGORIES: Category[] = [
  {
    id: "food",
    label: "Restaurant, café or bakery",
    keywords: ["bakery", "cafe", "café", "coffee", "restaurant", "kitchen", "bistro", "food", "pizza", "dessert", "cake", "catering", "dhaba", "grill", "bar"],
    physical: true,
    pricing: false,
    primaryCta: "See the menu",
    kicker: "Fresh daily",
    services: ["Dine in", "Takeaway", "Catering for events", "Custom orders"],
    process: [
      { title: "Order", description: "Call, message or walk in. Tell us what you need and when." },
      { title: "We make it", description: "Everything is prepared fresh on the day." },
      { title: "Pick up or enjoy here", description: "Collect at the counter or stay and eat with us." },
    ],
    faq: [
      { question: "Do you take custom orders?", answer: "Yes. Message us at least two days ahead with the details and we will confirm." },
      { question: "Do you deliver?", answer: "We deliver nearby. Ask when you order and we will tell you the fee." },
    ],
    headlines: ["{what} made fresh in {city}", "The {what} {city} comes back for", "Good {what}, made by hand"],
  },
  {
    id: "beauty",
    label: "Salon, spa or beauty",
    keywords: ["salon", "spa", "beauty", "hair", "barber", "nails", "makeup", "skincare", "lashes", "bridal"],
    physical: true,
    pricing: true,
    primaryCta: "Book an appointment",
    kicker: "By appointment",
    services: ["Haircut and styling", "Colour", "Treatments", "Bridal and events"],
    process: [
      { title: "Book", description: "Pick a time that suits you by phone or message." },
      { title: "Consult", description: "We talk through what you want before we start." },
      { title: "Relax", description: "Sit back. We take care of the rest." },
    ],
    faq: [
      { question: "Do I need an appointment?", answer: "Appointments are best. We take walk-ins when a chair is free." },
      { question: "What if I need to cancel?", answer: "Let us know a day ahead so we can offer the slot to someone else." },
    ],
    headlines: ["{what} in {city}, done properly", "Look like yourself, only better", "{name}. Unhurried {what}."],
  },
  {
    id: "fitness",
    label: "Gym, trainer or studio",
    keywords: ["gym", "fitness", "trainer", "yoga", "pilates", "crossfit", "boxing", "coach", "personal training", "martial", "dance"],
    physical: true,
    pricing: true,
    primaryCta: "Book a free session",
    kicker: "Train with us",
    services: ["Personal training", "Group classes", "Nutrition plans", "Online coaching"],
    process: [
      { title: "Free first session", description: "Meet the coach and talk about your goals." },
      { title: "Your plan", description: "Get a plan built around your time and level." },
      { title: "Train and track", description: "Show up, and we track progress every week." },
    ],
    faq: [
      { question: "I'm a complete beginner. Is that okay?", answer: "Yes. Every plan starts at your level." },
      { question: "Can I pause my membership?", answer: "Yes, for travel or illness. Just tell us." },
    ],
    headlines: ["Get stronger in {city}", "Training that fits your week", "{name}. Coaching that sticks."],
  },
  {
    id: "health",
    label: "Clinic or therapist",
    keywords: ["clinic", "doctor", "physio", "therapy", "therapist", "health", "medical", "nutritionist", "psychologist", "pharmacy"],
    physical: true,
    pricing: false,
    primaryCta: "Book a visit",
    kicker: "Patient first",
    services: ["Consultations", "Check-ups", "Treatment plans", "Follow-up care"],
    process: [
      { title: "Book", description: "Call or message to choose a time." },
      { title: "Visit", description: "We listen, examine and explain your options clearly." },
      { title: "Follow up", description: "We check in after treatment to make sure you're well." },
    ],
    faq: [
      { question: "Do you accept walk-ins?", answer: "Urgent cases are seen the same day. Otherwise please book ahead." },
      { question: "What should I bring?", answer: "Any previous reports and a list of medicines you take." },
    ],
    headlines: ["Care you can trust in {city}", "Clear answers, kind care", "{name}. Health care without the wait."],
  },
  {
    id: "agency",
    label: "Marketing or design agency",
    keywords: ["agency", "studio", "marketing", "design", "branding", "development", "software house", "web design", "seo", "advertising", "media"],
    physical: false,
    pricing: false,
    primaryCta: "Start a project",
    kicker: "Independent studio",
    services: ["Brand identity", "Websites", "Marketing campaigns", "Content"],
    process: [
      { title: "Brief", description: "A short call to understand the goal, budget and deadline." },
      { title: "Proposal", description: "A clear plan with scope, timeline and price." },
      { title: "Build", description: "We work in short rounds and show progress every week." },
      { title: "Launch", description: "We ship, measure and improve." },
    ],
    faq: [
      { question: "How long does a project take?", answer: "Most projects take four to eight weeks. We confirm the timeline in the proposal." },
      { question: "Do you work with small businesses?", answer: "Yes. We scope work to fit the budget." },
    ],
    headlines: ["{what} that gets results", "We help {audience} grow", "{name}. Work that earns attention."],
  },
  {
    id: "consulting",
    label: "Consultant, coach or freelancer",
    keywords: ["consultant", "consulting", "freelance", "freelancer", "coach", "coaching", "advisor", "accountant", "tutor", "mentor", "translator"],
    physical: false,
    pricing: true,
    primaryCta: "Book a call",
    kicker: "Independent practice",
    services: ["One-off consultation", "Ongoing support", "Workshops", "Reviews and audits"],
    process: [
      { title: "Intro call", description: "Twenty minutes, free, to see if we're a good fit." },
      { title: "Plan", description: "A written plan with clear outcomes and costs." },
      { title: "Work together", description: "Regular sessions and progress you can measure." },
    ],
    faq: [
      { question: "Is the first call free?", answer: "Yes. It's a short call to understand your situation." },
      { question: "Do you work remotely?", answer: "Yes, over video, and in person when it makes sense." },
    ],
    headlines: ["Expert {what} for {audience}", "Clear advice, real results", "{name}. {what} without the jargon."],
  },
  {
    id: "photo",
    label: "Photographer or creative",
    keywords: ["photographer", "photography", "videographer", "video", "film", "artist", "illustrator", "wedding photographer", "studio photography"],
    physical: false,
    pricing: true,
    primaryCta: "Check availability",
    kicker: "Booking now",
    services: ["Weddings", "Portraits", "Events", "Brand shoots"],
    process: [
      { title: "Enquire", description: "Send the date and what you have in mind." },
      { title: "Plan the shoot", description: "We agree on locations, timing and the look." },
      { title: "Shoot and deliver", description: "Edited photos delivered in an online gallery." },
    ],
    faq: [
      { question: "How soon do I get the photos?", answer: "Usually within two weeks. Weddings take up to four." },
      { question: "Do you travel?", answer: "Yes. Travel costs are added to the quote." },
    ],
    headlines: ["{what} that feels like you", "Moments worth keeping", "{name}. Honest {what}."],
  },
  {
    id: "property",
    label: "Real estate",
    keywords: ["real estate", "property", "realtor", "estate agent", "rentals", "homes", "apartments", "architect", "interior"],
    physical: true,
    pricing: false,
    primaryCta: "See listings",
    kicker: "Trusted locally",
    services: ["Buying", "Selling", "Rentals", "Property management"],
    process: [
      { title: "Tell us what you need", description: "Budget, area and timing." },
      { title: "Shortlist", description: "We send options that actually fit." },
      { title: "Visit and decide", description: "We arrange viewings and handle the paperwork." },
    ],
    faq: [
      { question: "What are your fees?", answer: "Fees depend on the property. We explain them upfront, in writing." },
      { question: "Which areas do you cover?", answer: "We cover {city} and nearby areas." },
    ],
    headlines: ["Find your place in {city}", "Property, minus the stress", "{name}. Homes, handled."],
  },
  {
    id: "product",
    label: "App, SaaS or startup",
    keywords: ["app", "saas", "startup", "software", "platform", "tool", "product", "fintech", "ai tool", "api", "dashboard", "extension"],
    physical: false,
    pricing: true,
    primaryCta: "Get started",
    kicker: "Now available",
    services: ["Feature one", "Feature two", "Feature three", "Integrations"],
    process: [
      { title: "Sign up", description: "Create an account in under a minute." },
      { title: "Connect", description: "Bring in your data or invite your team." },
      { title: "See results", description: "Get value on day one." },
    ],
    faq: [
      { question: "Is there a free trial?", answer: "Yes. Try it free, no card needed." },
      { question: "Is my data safe?", answer: "Data is encrypted in transit and at rest." },
    ],
    headlines: ["{what} for {audience}", "The simplest way to {what}", "{name}. Built for {audience}."],
  },
  {
    id: "shop",
    label: "Shop or brand",
    keywords: ["shop", "store", "boutique", "clothing", "fashion", "brand", "jewelry", "jewellery", "handmade", "crafts", "furniture", "online store", "ecommerce"],
    physical: false,
    pricing: false,
    primaryCta: "Shop now",
    kicker: "New collection",
    services: ["New arrivals", "Best sellers", "Gift cards", "Custom orders"],
    process: [
      { title: "Choose", description: "Browse and message us with what you like." },
      { title: "Confirm", description: "We confirm size, colour and delivery." },
      { title: "Delivered", description: "Packed with care and sent to your door." },
    ],
    faq: [
      { question: "How long does delivery take?", answer: "Three to five working days in most cities." },
      { question: "Can I return an item?", answer: "Yes, within seven days if it's unused." },
    ],
    headlines: ["{what}, made to last", "Designed in {city}", "{name}. Small batches, done well."],
  },
  {
    id: "nonprofit",
    label: "Nonprofit or community",
    keywords: ["nonprofit", "non-profit", "ngo", "charity", "foundation", "community", "volunteer", "trust", "welfare", "mosque", "church"],
    physical: false,
    pricing: false,
    primaryCta: "Get involved",
    kicker: "Our mission",
    services: ["Programs", "Volunteering", "Donations", "Partnerships"],
    process: [
      { title: "Learn", description: "See what we do and who we help." },
      { title: "Join", description: "Volunteer, donate or partner with us." },
      { title: "See the impact", description: "We report back on where every rupee goes." },
    ],
    faq: [
      { question: "How are donations used?", answer: "We publish a yearly report of where the money goes." },
      { question: "Can I volunteer remotely?", answer: "Some roles are remote. Get in touch and we'll match you." },
    ],
    headlines: ["Helping {audience} in {city}", "Small acts, real change", "{name}. Community first."],
  },
  {
    id: "events",
    label: "Events or weddings",
    keywords: ["event", "events", "wedding", "planner", "venue", "decor", "conference", "party", "marquee", "banquet"],
    physical: true,
    pricing: true,
    primaryCta: "Check your date",
    kicker: "Now booking",
    services: ["Full planning", "Day coordination", "Decor", "Venue booking"],
    process: [
      { title: "Share your date", description: "Tell us the date, guest count and budget." },
      { title: "Design the day", description: "We plan the look, the timing and the vendors." },
      { title: "Enjoy it", description: "We run the day so you don't have to." },
    ],
    faq: [
      { question: "How far ahead should we book?", answer: "Three to six months for weddings, sooner is better." },
      { question: "Do you work outside {city}?", answer: "Yes. Travel is added to the quote." },
    ],
    headlines: ["Days people remember", "Events in {city}, beautifully run", "{name}. Every detail handled."],
  },
  {
    id: "dentist",
    label: "Dentist",
    keywords: ["dentist", "dental", "teeth", "orthodontist", "braces", "smile clinic", "implants", "whitening"],
    physical: true,
    pricing: true,
    primaryCta: "Book a check-up",
    kicker: "Gentle dental care",
    services: ["Check-ups and cleaning", "Fillings and root canals", "Teeth whitening", "Braces and aligners"],
    process: [
      { title: "Book", description: "Choose a time online or by phone." },
      { title: "Check-up", description: "A full exam and X-rays if needed, explained in plain words." },
      { title: "Your plan", description: "A clear plan with prices before any treatment starts." },
    ],
    faq: [
      { question: "I'm nervous about the dentist. Can you help?", answer: "Yes. Tell us when you book and we will go slowly and explain every step." },
      { question: "Do you see children?", answer: "Yes, from their first tooth." },
    ],
    headlines: ["Smile with confidence in {city}", "Gentle dentistry, clear prices", "{name}. Dental care without the dread."],
  },
  {
    id: "hospital",
    label: "Hospital or medical centre",
    keywords: ["hospital", "medical centre", "medical center", "emergency", "surgery", "healthcare", "diagnostic", "laboratory", "lab", "maternity", "icu"],
    physical: true,
    pricing: false,
    primaryCta: "Book an appointment",
    kicker: "Open around the clock",
    services: ["Emergency care", "Specialist clinics", "Lab and imaging", "Surgery and recovery"],
    process: [
      { title: "Reach us", description: "Call the front desk or come straight to emergency." },
      { title: "See a specialist", description: "We match you with the right doctor quickly." },
      { title: "Recover well", description: "Clear aftercare and follow-up visits." },
    ],
    faq: [
      { question: "Is emergency open at night?", answer: "Yes. Emergency is open every hour of every day." },
      { question: "Which insurance do you accept?", answer: "Most major panels. Call the front desk to confirm yours." },
    ],
    headlines: ["Care for {city}, day and night", "Specialists who listen", "{name}. Expert care, close to home."],
  },
  {
    id: "creator",
    label: "Digital creator",
    keywords: ["creator", "content creator", "youtuber", "youtube", "influencer", "streamer", "podcast", "podcaster", "tiktok", "blogger", "vlogger", "newsletter"],
    physical: false,
    pricing: true,
    primaryCta: "Work with me",
    kicker: "New videos every week",
    services: ["Brand partnerships", "Sponsored videos", "Courses and guides", "Speaking and events"],
    process: [
      { title: "Say hello", description: "Tell me about your brand and what you want to launch." },
      { title: "Plan the content", description: "We agree the idea, format and dates together." },
      { title: "Go live", description: "I publish, share and send you the results." },
    ],
    faq: [
      { question: "Where can I see your audience numbers?", answer: "Ask for the media kit. It has reach, audience and past results." },
      { question: "Do you work with small brands?", answer: "Yes, if the product is a good fit for my audience." },
    ],
    headlines: ["{what} for curious people", "Stories that people share", "{name}. Making things people watch to the end."],
  },
  {
    id: "law",
    label: "Law firm",
    keywords: ["law", "lawyer", "law firm", "attorney", "legal", "solicitor", "advocate", "barrister", "notary"],
    physical: true,
    pricing: false,
    primaryCta: "Book a consultation",
    kicker: "Clear legal advice",
    services: ["Business and contracts", "Property", "Family matters", "Disputes"],
    process: [
      { title: "First consultation", description: "Tell us what happened. We explain where you stand." },
      { title: "A clear plan", description: "Options, risks and fees in writing." },
      { title: "We act for you", description: "We handle the paperwork and keep you updated." },
    ],
    faq: [
      { question: "Is the first meeting free?", answer: "The first short call is free. Full consultations are charged at a fixed fee." },
      { question: "Is what I tell you confidential?", answer: "Always." },
    ],
    headlines: ["Legal advice you can understand", "On your side in {city}", "{name}. Straight answers, strong advocacy."],
  },
  {
    id: "school",
    label: "School or academy",
    keywords: ["school", "academy", "college", "institute", "courses", "tuition", "coaching centre", "university", "kindergarten", "montessori", "classes"],
    physical: true,
    pricing: true,
    primaryCta: "Apply now",
    kicker: "Admissions open",
    services: ["Early years", "Primary and secondary", "After-school clubs", "Exam preparation"],
    process: [
      { title: "Visit", description: "Book a tour and meet the teachers." },
      { title: "Apply", description: "A short form and an informal assessment." },
      { title: "Start", description: "A gentle first week to settle in." },
    ],
    faq: [
      { question: "When do admissions open?", answer: "Twice a year. Message us to join the waiting list any time." },
      { question: "Is there transport?", answer: "Yes, on most routes in the city." },
    ],
    headlines: ["Where curious minds grow", "Learning that lasts, in {city}", "{name}. Great teachers, happy students."],
  },
  {
    id: "hotel",
    label: "Hotel or travel",
    keywords: ["hotel", "resort", "guest house", "guesthouse", "bnb", "hostel", "travel", "tours", "tour", "travel agency", "holiday", "villa"],
    physical: true,
    pricing: true,
    primaryCta: "Check availability",
    kicker: "Stay with us",
    services: ["Rooms and suites", "Breakfast and dining", "Airport pickup", "Tours and trips"],
    process: [
      { title: "Choose dates", description: "Tell us when you arrive and how many guests." },
      { title: "Confirm", description: "We confirm your room and price straight away." },
      { title: "Arrive and relax", description: "We take care of the rest." },
    ],
    faq: [
      { question: "What time is check-in?", answer: "From 2pm. Early check-in is free when a room is ready." },
      { question: "Can you arrange transport?", answer: "Yes. Airport pickup and day trips can be booked with your room." },
    ],
    headlines: ["Your stay in {city}, sorted", "Wake up somewhere better", "{name}. Rooms worth coming back to."],
  },
  {
    id: "trades",
    label: "Construction or home services",
    keywords: ["construction", "builder", "contractor", "plumber", "plumbing", "electrician", "roofing", "renovation", "painter", "carpenter", "cleaning", "handyman", "solar"],
    physical: false,
    pricing: true,
    primaryCta: "Get a free quote",
    kicker: "Licensed and insured",
    services: ["Repairs", "Renovations", "New builds", "Maintenance plans"],
    process: [
      { title: "Free quote", description: "We visit, measure and give a fixed price." },
      { title: "Build", description: "A clean, safe site and daily updates." },
      { title: "Hand over", description: "We walk through the finished work with you." },
    ],
    faq: [
      { question: "Is the quote really free?", answer: "Yes, with no obligation." },
      { question: "Do you guarantee your work?", answer: "Every job comes with a written guarantee." },
    ],
    headlines: ["Built properly, on time", "{what} you can rely on in {city}", "{name}. Fixed prices, clean work."],
  },
  {
    id: "auto",
    label: "Car service or dealer",
    keywords: ["car", "cars", "garage", "mechanic", "auto", "workshop", "car wash", "dealer", "dealership", "detailing", "tyres", "tires", "car rental"],
    physical: true,
    pricing: true,
    primaryCta: "Book a service",
    kicker: "Same-day service",
    services: ["Servicing and repairs", "Diagnostics", "Tyres and brakes", "Detailing"],
    process: [
      { title: "Book", description: "Pick a slot and tell us what's wrong." },
      { title: "Check", description: "We diagnose and call you with a price first." },
      { title: "Drive away", description: "Collect your car, cleaned and ready." },
    ],
    faq: [
      { question: "Will you call before doing extra work?", answer: "Always. Nothing is done without your approval." },
      { question: "Can I wait while you work?", answer: "Yes. Most services take under two hours." },
    ],
    headlines: ["Your car, in good hands", "Honest servicing in {city}", "{name}. Fixed right the first time."],
  },
  {
    id: "pets",
    label: "Vet or pet care",
    keywords: ["vet", "veterinary", "pet", "pets", "dog", "cat", "grooming", "kennel", "pet shop", "animal"],
    physical: true,
    pricing: true,
    primaryCta: "Book a visit",
    kicker: "Kind to every animal",
    services: ["Check-ups and vaccines", "Grooming", "Boarding", "Pet food and supplies"],
    process: [
      { title: "Book", description: "Choose a time that suits you and your pet." },
      { title: "Visit", description: "A calm check-up with plenty of treats." },
      { title: "Aftercare", description: "Clear advice and a reminder for the next visit." },
    ],
    faq: [
      { question: "Do you handle emergencies?", answer: "Yes. Call ahead so we're ready when you arrive." },
      { question: "Which animals do you see?", answer: "Dogs, cats, birds and small pets." },
    ],
    headlines: ["Happy pets in {city}", "Care your pet will love", "{name}. Gentle hands, wagging tails."],
  },
  {
    id: "general",
    label: "Something else",
    keywords: [],
    physical: false,
    pricing: false,
    primaryCta: "Get in touch",
    kicker: "Welcome",
    services: ["Service one", "Service two", "Service three"],
    process: [
      { title: "Get in touch", description: "Tell us what you need." },
      { title: "We plan it", description: "We agree on the details and cost upfront." },
      { title: "Done", description: "We deliver, on time." },
    ],
    faq: [{ question: "How do I get started?", answer: "Send us a message and we'll reply within a day." }],
    headlines: ["{what} in {city}", "{what}, done right", "{name}. {what} you can count on."],
  },
];

const PORTFOLIO_WORDS = ["portfolio", "resume", "résumé", " cv ", " cv.", "my work", "personal site", "personal website", "hire me", "get hired", "job hunt", "showcase my", "case studies", "about me page"];

export function classify(query: string): { kind: SiteKind; category: string } {
  const q = " " + query.toLowerCase().replace(/[!?,]/g, " ") + " ";
  let best = { id: "general", score: 0 };
  for (const c of CATEGORIES) {
    const score = c.keywords.reduce((n, k) => n + (new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(q) ? k.length : 0), 0);
    if (score > best.score) best = { id: c.id, score };
  }
  if (PORTFOLIO_WORDS.some((w) => q.includes(w))) return { kind: "portfolio", category: "portfolio" };
  // "I'm a designer", "site for me": about a person, unless they say "my bakery", "my clinic" and so on.
  const aboutPerson = /\b(i am|i'm|im) (a|an)\b|\bfor (me|myself)\b/.test(q);
  const ownsBusiness = CATEGORIES.some((c) => c.keywords.some((k) => q.includes(" my " + k) || q.includes(" our " + k)));
  if (aboutPerson && !ownsBusiness) return { kind: "portfolio", category: "portfolio" };
  return { kind: "website", category: best.id };
}

export function categoryById(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

// Pulls a likely business or person name and a city out of the query, if present.
export function extractHints(query: string): { name: string; city: string } {
  const called = /(?:called|named)\s+["“]?([A-Z][\w&' ]{1,40}?)["”]?(?:\s+(?:in|at|for)\b|[,.]|$)/.exec(query);
  const city = /\b(?:in|from|based in)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/.exec(query);
  return { name: called?.[1]?.trim() ?? "", city: city?.[1] ?? "" };
}
