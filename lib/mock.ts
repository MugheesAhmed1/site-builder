import type { AiRequest } from "./types";

// Canned answers used only when MOCK_AI=1 and no API key is set, so the whole
// flow can be clicked through for free while developing. The person is fictional.

const profile = {
  name: "Sara Malik",
  headline: "Product Manager, Payments",
  location: "Lahore, Pakistan",
  email: "sara.malik@example.com",
  phone: "+92 300 0000000",
  links: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/example" }],
  summary: "Product manager with 6 years building payment and wallet products for emerging markets.",
  experience: [
    {
      company: "PayLink",
      role: "Senior Product Manager",
      start: "Mar 2022",
      end: "Present",
      location: "Lahore",
      bullets: [
        "Launched cross-border remittance app reaching 400K users in the first year",
        "Cut onboarding drop-off by 31% with a redesigned KYC flow",
        "Led a squad of 9 engineers and 2 designers",
      ],
    },
    {
      company: "Kissan Connect",
      role: "Product Owner",
      start: "Jan 2019",
      end: "Feb 2022",
      location: "Islamabad",
      bullets: ["Shipped an SMS advisory service for 1.2M farmers", "Introduced quarterly roadmap reviews with telco partners"],
    },
  ],
  projects: [
    { name: "PayLink Remit", description: "Mobile remittance app for UAE to Pakistan corridor", tags: ["Fintech", "Mobile"], link: "" },
    { name: "Kissan SMS Advisor", description: "Weather and crop advice over SMS", tags: ["AgriTech", "VAS"], link: "" },
    { name: "Wallet Rewards", description: "Cashback engine for a mobile wallet", tags: ["Fintech", "Growth"], link: "" },
  ],
  skills: ["Product strategy", "Roadmapping", "KYC & compliance", "SQL", "Figma", "A/B testing", "Jira"],
  education: [{ school: "LUMS", degree: "BSc Computer Science", year: "2018" }],
  certifications: [{ name: "Certified Scrum Product Owner", issuer: "Scrum Alliance", year: "2021" }],
};

const questions = {
  questions: [
    { id: "q1", question: "What role should this portfolio help you land?", why: "Sets the headline and what we feature first.", suggested: "Senior or Lead PM roles in fintech" },
    { id: "q2", question: "Which 2-3 achievements are you proudest of, with any numbers?", why: "These become the impact counters and featured projects.", suggested: "PayLink Remit (400K users), KYC redesign (-31% drop-off), Kissan SMS (1.2M farmers)" },
    { id: "q3", question: "How would you describe how you work, in a few steps?", why: "Adds a short 'how I work' section that recruiters like.", suggested: "Discover, Design, Build, Launch, Optimise" },
    { id: "q4", question: "What tone should the site have?", why: "Shapes every sentence on the page.", suggested: "Confident and concise" },
    { id: "q5", question: "Any links to add (LinkedIn, GitHub, photo URL, hosted résumé)?", why: "Adds buttons in the hero and contact sections.", suggested: "LinkedIn: https://www.linkedin.com/in/example" },
  ],
};

const content = {
  meta: { title: "Sara Malik · Product Manager, Payments", description: "Product manager building payment and wallet products for emerging markets." },
  hero: {
    name: "Sara Malik",
    role: "Senior Product Manager",
    rotatingRoles: ["Cross-border payments", "Onboarding and KYC", "Mobile wallets"],
    tagline: "I make sending money home feel simple.",
    intro: "Six years shipping remittance, wallet and agritech products used by 1.6M people in Pakistan and the Gulf.",
    location: "Lahore, Pakistan",
    availability: "Open to new roles",
    photoUrl: "",
    resumeUrl: "",
  },
  stats: [
    { value: 400, suffix: "K+", label: "Remittance app users" },
    { value: 1.2, suffix: "M", label: "Farmers reached by SMS" },
    { value: 31, suffix: "%", label: "Less onboarding drop-off" },
    { value: 6, suffix: " yrs", label: "In product" },
  ],
  about: {
    heading: "Payments, made human",
    paragraphs: [
      "I build products for people who move money across borders and for the businesses that serve them.",
      "My work sits where compliance, engineering and real customer pain meet. I like small bets, clear metrics and shipping often.",
    ],
  },
  process: [
    { title: "Discover", description: "Talk to users and partners until the real problem is obvious." },
    { title: "Design", description: "Prototype the riskiest step first and test it with real customers." },
    { title: "Build", description: "Ship thin slices with engineering, behind flags." },
    { title: "Launch", description: "Roll out by corridor or segment, with a clear success metric." },
    { title: "Optimise", description: "Read the funnel weekly and fix the biggest leak." },
  ],
  experience: [
    {
      company: "PayLink",
      role: "Senior Product Manager",
      start: "Mar 2022",
      end: "Present",
      location: "Lahore",
      summary: "Own the remittance and onboarding products.",
      highlights: ["Launched a UAE to Pakistan remittance app that reached 400K users in year one", "Redesigned KYC, cutting onboarding drop-off by 31%", "Lead a squad of 9 engineers and 2 designers"],
      tags: ["Remittance", "KYC", "Mobile"],
    },
    {
      company: "Kissan Connect",
      role: "Product Owner",
      start: "Jan 2019",
      end: "Feb 2022",
      location: "Islamabad",
      summary: "Built value-added services with telco partners.",
      highlights: ["Shipped an SMS advisory service used by 1.2M farmers", "Set up quarterly roadmap reviews with telco partners"],
      tags: ["AgriTech", "VAS", "Partnerships"],
    },
  ],
  projects: [
    { name: "PayLink Remit", category: "Fintech", summary: "Mobile remittance for the UAE to Pakistan corridor.", impact: "400K users in the first year.", tags: ["Mobile", "Payments"], link: "" },
    { name: "Wallet Rewards", category: "Fintech", summary: "Cashback engine for a mobile wallet.", impact: "", tags: ["Growth"], link: "" },
    { name: "Kissan SMS Advisor", category: "AgriTech", summary: "Weather and crop advice over plain SMS.", impact: "Reached 1.2M farmers.", tags: ["SMS", "VAS"], link: "" },
  ],
  skills: [
    { group: "Product", items: ["Strategy", "Roadmapping", "A/B testing"] },
    { group: "Domain", items: ["Remittance", "Wallets", "KYC & compliance"] },
    { group: "Tools", items: ["SQL", "Figma", "Jira"] },
  ],
  education: [{ school: "LUMS", degree: "BSc Computer Science", year: "2018" }],
  certifications: [{ name: "Certified Scrum Product Owner", issuer: "Scrum Alliance", year: "2021", link: "" }],
  testimonials: [],
  contact: {
    heading: "Let's build something people trust.",
    blurb: "I'm open to senior product roles in fintech. The fastest way to reach me is email.",
    email: "sara.malik@example.com",
    phone: "+92 300 0000000",
    linkedin: "https://www.linkedin.com/in/example",
    github: "",
    website: "",
  },
  sections: ["stats", "about", "process", "experience", "projects", "skills", "certifications", "education", "contact"],
};

export function mockAnswer(req: AiRequest): string {
  switch (req.task) {
    case "extract":
      return JSON.stringify(profile);
    case "questions":
      return JSON.stringify(questions);
    case "build":
      return JSON.stringify(content);
    case "revise":
      return JSON.stringify({ ...req.content, hero: { ...req.content.hero, tagline: "Remittance that feels like a text message." } });
    case "design":
      return JSON.stringify({ ...req.design, accent: "#D9480F" });
  }
}
