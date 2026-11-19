// Builds example sites in different niches exactly as a person would download them (the
// "ready to host" zip), unzipped into .examples/<id>/, so they can be served, compared and run
// through Lighthouse:  npx vitest run -c vitest.examples.config.ts
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { it, vi } from "vitest";

const PUBLIC = join(process.cwd(), "public");
const mq = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
vi.stubGlobal("window", { dispatchEvent: () => true, matchMedia: mq, innerWidth: 1280, innerHeight: 800, addEventListener() {}, removeEventListener() {} });
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
const realFetch = globalThis.fetch;
vi.stubGlobal("fetch", async (u: string, init?: RequestInit) => {
  if (/^https?:/.test(String(u))) return realFetch(u, init);
  const path = join(PUBLIC, String(u).split("?")[0]);
  try {
    const buf = readFileSync(path);
    return new Response(buf, { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
});

export const EXAMPLES: { id: string; query: string; answers?: Record<string, string>; style?: "luxury" }[] = [
  { id: "eyewear", style: "luxury", query: "Website for my premium eyewear brand called Noir Optics in Lahore", answers: { what: "Handmade sunglasses and optical frames", about: "Every frame is cut from one sheet of acetate, polished by hand for three days and fitted with lenses that block all UVA and UVB." } },
  { id: "florist", query: "Website for my flower shop called Petal & Stem in London", answers: { what: "Seasonal bouquets and wedding flowers", about: "Two sisters, one tiny shop and flowers cut that morning. We design every bouquet by hand and deliver across London the same day." } },
  { id: "saas", query: "Website for my startup Ledgerly, invoicing software for freelancers", answers: { what: "Invoicing and payments for freelancers", about: "Ledgerly sends the invoice, chases the payment and files the tax note, so you can get back to the work you are paid for." } },
  { id: "cafe", query: "Website for my coffee shop called Morning Ritual in Lisbon", answers: { what: "Specialty coffee and fresh pastries", about: "A small roastery cafe in Alfama. We roast twice a week and bake every morning." } },
  { id: "law", query: "Website for my law firm called Hart & Vale in Dubai", answers: { what: "Corporate and family law", about: "A partner-led firm. You speak to the lawyer who handles your case, and you see the fee before we start." } },
  { id: "designer", query: "Portfolio for me, I'm a product designer called Sara Malik" },
  { id: "developer", query: "Portfolio for me, I'm a software engineer called Omar Khan" },
  { id: "resort", query: "Website for my beach resort called Blue Lagoon in Maldives", answers: { what: "Overwater villas and diving" } },
  { id: "gym", query: "Website for my gym called Iron Hour in Toronto", answers: { what: "Strength training and boxing classes" } },
  { id: "swim", query: "Website for my swim school called Little Dolphins in Sydney", answers: { what: "Swimming lessons for kids and adults" } },
  { id: "cyber", query: "Website for my cyber security firm called Bastion Labs", answers: { what: "Penetration testing and security audits" } },
];

it("builds every example", async () => {
  const { createProject, applyDetails } = await import("@/lib/project");
  const { buildZip } = await import("@/lib/export");
  const JSZip = (await import("jszip")).default;
  const root = join(process.cwd(), ".examples");
  rmSync(root, { recursive: true, force: true });
  const only = (process.env.ONLY || "").split(",").filter(Boolean);
  for (const ex of EXAMPLES.filter((e) => !only.length || only.includes(e.id))) {
    let p = createProject({ query: ex.query, style: ex.style });
    if (ex.answers) p = applyDetails(p, { answers: { ...p.answers, ...ex.answers } });
    const { blob } = await buildZip(p, "ready");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    for (const [name, f] of Object.entries(zip.files)) {
      if (f.dir) continue;
      const out = join(root, ex.id, name.split("/").slice(1).join("/"));
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, await f.async("nodebuffer"));
    }
    process.stdout.write(`${ex.id}: ${p.design.atmos} (${p.design.heroStyle})\n`);
  }
});
