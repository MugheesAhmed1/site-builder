import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ASSETS, assetById, budgetOf, creditOf, isShippable, licenseProblems, resolveAsset, toExperienceAsset, type AssetRecord } from "@/packages/asset-library";
import { assetFiles, assetUrl, heroAsset, phoneMay3d, wants3d } from "@/template/src/experiences/assets";
import { assetLicenceProblems, qualityGates } from "@/packages/quality-engine";
import { normalizeArtPlan, localArtPlan } from "@/lib/animator-art";
import type { Experience } from "@/template/src/experiences/types";

// The 3D asset system (docs/ASSETS.md): the library files, the licence gate, the resolver,
// the generator, the export and the fallbacks. The browser half (the model loads in R3F, turns
// with scroll, phones, reduced motion) is checked by scripts/assets/e2e.mjs on a built site.

const PUBLIC = join(process.cwd(), "public");
const mq = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
vi.stubGlobal("window", { dispatchEvent: () => true, matchMedia: mq, innerWidth: 1280, innerHeight: 800, addEventListener() {}, removeEventListener() {} });
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
// The export copies the assets from the builder; here they come straight from public/.
const fetched: string[] = [];
vi.stubGlobal("fetch", async (u: string) => {
  fetched.push(String(u));
  if (/^https?:/.test(String(u))) return new Response("", { status: 404 });
  try {
    return new Response(readFileSync(join(PUBLIC, String(u).split("?")[0])), { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
});

/** The JSON chunk of a GLB, read the way a loader does. */
function glb(path: string) {
  const b = readFileSync(join(PUBLIC, path));
  expect(b.readUInt32LE(0), path).toBe(0x46546c67); // "glTF"
  expect(b.readUInt32LE(4), path).toBe(2);
  expect(b.readUInt32LE(8), path).toBe(b.length);
  const n = b.readUInt32LE(12);
  expect(b.readUInt32LE(16), path).toBe(0x4e4f534a); // JSON
  const json = JSON.parse(b.subarray(20, 20 + n).toString("utf8"));
  const bin = b.length > 28 + n ? b.readUInt32LE(20 + n + 4) : 0;
  return { json, bin };
}

const eyewear = async () => {
  const { SAMPLES, buildSample } = await import("@/lib/samples");
  return buildSample(SAMPLES.find((s) => s.id === "eyewear")!);
};

describe("asset library files", () => {
  it("has a valid record and a real, local file for every asset", () => {
    expect(ASSETS.length).toBeGreaterThanOrEqual(80);
    const ids = new Set<string>();
    for (const a of ASSETS) {
      expect(ids.has(a.id), a.id).toBe(false);
      ids.add(a.id);
      for (const k of ["name", "category", "subcategory", "preview", "asset"] as const) expect(a[k], `${a.id} ${k}`).toBeTruthy();
      expect(a.tags.length, a.id).toBeGreaterThan(2);
      expect(a.asset.startsWith("/assets/"), a.id).toBe(true);
      expect(existsSync(join(PUBLIC, a.asset)), a.asset).toBe(true);
      expect(existsSync(join(PUBLIC, a.preview)), a.preview).toBe(true);
      expect(a.license.type, a.id).toBeTruthy();
      expect(typeof a.license.commercialUse).toBe("boolean");
      expect(typeof a.license.redistribution).toBe("boolean");
      expect(typeof a.license.attributionRequired).toBe("boolean");
      expect(a.source.creator, a.id).toBeTruthy();
    }
  });

  it("loads every GLB: a valid binary glTF 2.0 whose triangles, clips and size match the manifest, with no outside files", () => {
    for (const a of ASSETS.filter((x) => x.format === "glb")) {
      const { json, bin } = glb(a.asset);
      expect(bin, a.id).toBeGreaterThan(0);
      // Everything is inside the file: no external buffers or images, no URLs.
      for (const buf of json.buffers ?? []) expect(buf.uri, a.id).toBeUndefined();
      for (const img of json.images ?? []) expect(img.uri, a.id).toBeUndefined();
      // Only extensions three.js reads without a decoder.
      for (const ext of json.extensionsRequired ?? []) expect(["KHR_mesh_quantization", "EXT_texture_webp", "KHR_texture_transform", "KHR_materials_emissive_strength"], `${a.id} ${ext}`).toContain(ext);
      // Triangles as drawn: a mesh used by several nodes counts once per node.
      const meshTris = (json.meshes ?? []).map((m: { primitives: { mode?: number; indices?: number; attributes: { POSITION: number } }[] }) =>
        m.primitives.reduce((n, p) => n + ((p.mode ?? 4) === 4 ? (p.indices !== undefined ? json.accessors[p.indices].count : json.accessors[p.attributes.POSITION].count) / 3 : 0), 0),
      );
      const tris = (json.nodes ?? []).reduce((n: number, node: { mesh?: number }) => n + (node.mesh !== undefined ? meshTris[node.mesh] : 0), 0);
      expect(Math.round(tris), a.id).toBe(a.performance.triangles);
      expect((json.animations ?? []).map((x: { name?: string }) => x.name ?? "").sort(), a.id).toEqual((a.clips ?? []).map((c) => c.name).sort());
      expect(readFileSync(join(PUBLIC, a.asset)).length, a.id).toBe(a.performance.bytes);
    }
  });

  it("keeps the library a reasonable size", () => {
    const total = ASSETS.reduce((n, a) => n + a.performance.bytes, 0);
    expect(total).toBeLessThan(75e6);
    for (const a of ASSETS) expect(a.performance.bytes, a.id).toBeLessThan(5.2e6);
  });

  it("ships only CC0, CC BY 4.0, original and owner-cleared assets; uploads with an unknown licence are held back", () => {
    for (const a of ASSETS.filter(isShippable)) expect(["CC0-1.0", "CC-BY-4.0", "original", "owner-cleared"]).toContain(a.license.type);
    for (const a of ASSETS.filter((x) => !isShippable(x))) expect(a.license.type).toBe("owner-supplied");
    // The owner's own uploads (made with ChatGPT, confirmed 2026-11-19) are original work and ship.
    for (const id of ["animal-macaw-001", "vehicle-mars-rover-001"]) expect(isShippable(assetById(id)!), id).toBe(true);
    const unconfirmed = { ...assetById("animal-macaw-001")!, license: { ...assetById("animal-macaw-001")!.license, type: "owner-supplied", commercialUse: false, redistribution: false } };
    expect(isShippable(unconfirmed)).toBe(false);
    for (const a of ASSETS.filter((x) => x.license.type === "CC-BY-4.0")) expect(a.license.attributionRequired, a.id).toBe(true);
  });
});

describe("owner batches", () => {
  it("adds the credited car, and ships the uploads the owner cleared on 2026-11-22", () => {
    const car = assetById("vehicle-hypercar-black-001")!;
    expect(isShippable(car)).toBe(true);
    expect(creditOf(car)).toMatch(/^"McLaren P1 GTR 2015" by LC Design, CC BY 4\.0/);
    expect(resolveAsset({ query: "black racing hypercar" }).id).toBe("vehicle-hypercar-black-001");
    for (const id of ["animal-deer-001", "product-loafers-black-001", "character-armored-warrior-001", "character-robot-bee-001", "character-astronaut-001", "character-dragon-001"]) {
      const a = assetById(id)!;
      expect(a.license.type, id).toBe("owner-cleared");
      expect(isShippable(a), id).toBe(true);
    }
  });

  it("adds the third batch with brand marks removed and generic names", () => {
    const ids = ["animal-myna-001", "character-dragon-pink-001", "character-kid-001", "product-backpack-001", "prop-giftbox-001", "prop-book-001", "prop-blueprints-001", "product-cans-001", "vehicle-yacht-001", "nature-coral-xenia-001", "chair-swivel-001", "product-phone-fold-001", "vehicle-coupe-white-001", "vehicle-formula-001", "environment-bedroom-001", "nature-earth-001", "nature-planet-amber-001"];
    for (const id of ids) {
      const a = assetById(id)!;
      expect(a, id).toBeTruthy();
      expect(isShippable(a), id).toBe(true);
      expect(a.name, id).not.toMatch(/apple|iphone|nissan|gt-?r|mclaren|netflix|marlboro/i);
    }
    expect(assetById("character-kid-001")!.clips.map((c) => c.name)).toEqual(["idle", "walk", "run", "sit"]);
    expect(assetById("product-phone-fold-001")!.clips.map((c) => c.name)).toEqual(["open-close"]);
    expect(resolveAsset({ query: "foldable phone app" }).id).toBe("product-phone-fold-001");
    expect(resolveAsset({ query: "planet earth globe" }).id).toBe("nature-earth-001");
  });
});

describe("licence gate", () => {
  const base = assetById("eyewear-black-001")!;
  it("refuses unclear, non-commercial and personal-use licences", () => {
    const nc: AssetRecord = { ...base, id: "x-nc", license: { ...base.license, type: "CC-BY-NC-4.0" } };
    const personal: AssetRecord = { ...base, id: "x-personal", license: { ...base.license, type: "CC0-1.0", commercialUse: false } };
    const unknown: AssetRecord = { ...base, id: "x-unknown", license: { ...base.license, type: "" } };
    const noSource: AssetRecord = { ...base, id: "x-nosrc", source: { url: "", creator: "" } };
    expect(licenseProblems(nc).join()).toMatch(/not one the builder ships/);
    expect(licenseProblems(personal).join()).toMatch(/commercial use/);
    expect(licenseProblems(unknown).join()).toMatch(/no licence/);
    expect(licenseProblems(noSource).length).toBe(2);
    // The resolver never offers one, even when it is the only match.
    const r = resolveAsset({ query: "black sunglasses" }, { pool: [nc, personal, unknown] });
    expect(r.asset).toBeNull();
    expect(r.representation).toBe("procedural");
  });

  it("resolves the owner's own uploads now their licence is confirmed", () => {
    expect(resolveAsset({ query: "macaw parrot bird" }).id).toBe("animal-macaw-001");
    expect(resolveAsset({ query: "mars rover" }).id).toBe("vehicle-mars-rover-001");
  });
});

describe("asset resolver", () => {
  it("resolves a semantic query to the right asset, with a score, a reason, a cost and a licence", () => {
    const r = resolveAsset({ query: "premium black sunglasses", artStyle: ["luxury", "premium"] });
    expect(r.id).toBe("eyewear-black-001");
    expect(r.exact).toBe(true);
    expect(r.score).toBeGreaterThan(0.6);
    expect(r.reason).toMatch(/sunglasses/);
    expect(r.preview).toBe("/assets/previews/eyewear-black-001.webp");
    expect(r.representation).toBe("3d");
    expect(r.license).toBe("CC-BY-4.0");
    expect(r.cost).toMatch(/KB|MB/);
    const cases: [string, string][] = [
      ["luxury wrist watch", "watch-chronograph-001"],
      ["running sneakers", "shoe-sneaker-001"],
      ["vintage camera", "camera-antique-001"],
      ["friendly robot mascot", "character-robot-001"],
      ["red fox", "animal-fox-001"],
      ["velvet sofa", "sofa-velvet-001"],
    ];
    for (const [q, id] of cases) expect(resolveAsset({ query: q }).id, q).toBe(id);
    expect(resolveAsset({ query: "studio softbox product", type: "hdri" }).id).toBe("hdri-studio-small-03");
  });

  it("falls back to procedural when nothing matches (a missing asset)", () => {
    const r = resolveAsset({ query: "submarine volcano unicorn" });
    expect(r.asset).toBeNull();
    expect(r.representation).toBe("procedural");
  });

  it("on a low budget picks a lighter model of the same thing, or the still", () => {
    const heavy = resolveAsset({ query: "concept sports car" });
    expect(heavy.id).toBe("car-concept-001");
    const low = resolveAsset({ query: "concept sports car" }, { budget: budgetOf("low", true) });
    // The phone budget never gets the 3.2 MB concept car in 3D: a light car, or the car's still.
    expect(low.asset!.category).toBe("vehicle");
    if (low.representation === "2d") expect(low.id).toBe("car-concept-001");
    else expect(low.asset!.performance.bytes).toBeLessThanOrEqual(budgetOf("low", true).maxBytes);
    const still = resolveAsset({ query: "concept sports car" }, { budget: budgetOf("low", true), pool: ASSETS.filter((a) => a.id === "car-concept-001") });
    expect(still.representation).toBe("2d");
  });
});

describe("generator: art direction, asset plan and Experience JSON", () => {
  it("builds the eyewear demo around the sunglasses under studio light", async () => {
    const p = await eyewear();
    const e = p.experience!;
    expect(e.concept).toBe("asset-showcase");
    expect(e.stage.engine).toBe("showcase");
    expect(e.stage.webgl).toBe("asset3d");
    expect(e.artDirection?.visualStyle).toBe("luxury editorial");
    expect(e.artDirection?.preferredVisuals).toContain("soft particles");
    expect(e.assetPlan?.assets[0]).toMatchObject({ role: "hero-product", type: "3d" });
    // The plan asks in words; only the resolver names files.
    expect(e.assetPlan!.assets.every((a) => !/\.(glb|hdr)|\//.test(a.query))).toBe(true);
    expect(heroAsset(e)?.id).toBe("eyewear-black-001");
    expect(e.assets?.find((a) => a.kind === "hdri")?.id).toBe("hdri-studio-small-03");
    expect(e.assetDirection).toMatchObject({ lighting: { type: "studio" }, animation: { scroll: "rotate-360" }, particles: true });
    expect(e.stage.params.image).toBe("/assets/previews/eyewear-black-001.webp");
    // Scroll turns it all the way round, hero to call to action.
    const spins = e.scenes.map((s) => Number(s.beat.spin));
    expect(spins[0]).toBeLessThan(0);
    expect(spins[spins.length - 1]).toBe(360);
    expect(wants3d(e)).toBe(true);
    expect(e.technologies).toEqual(expect.arrayContaining(["three", "r3f", "asset-library", "asset-library-attribution"]));
    const gates = qualityGates({ experience: e, meta: { title: "Noir Optics", description: "Handmade sunglasses and optical frames from Lahore, polished by hand for three days." }, contrast: [7], images: [] });
    expect(gates.filter((g) => !g.pass).map((g) => g.id)).toEqual([]);
    expect(gates.find((g) => g.id === "asset-performance")?.detail).toMatch(/phones get the 3D model/);
  });

  it("keeps businesses with no strong library match on their own concepts", async () => {
    const { createProject } = await import("@/lib/project");
    for (const q of ["Site for my dental clinic in Karachi", "Website for my bakery in Lahore", "Portfolio for me, I'm a product designer"]) {
      const e = createProject({ query: q }).experience!;
      expect(e.concept, q).not.toBe("asset-showcase");
      expect(e.assets, q).toBeUndefined();
      expect(e.artDirection, q).toBeTruthy();
    }
  });

  it("keeps the asset stage when the scenes are rebuilt", async () => {
    const { refreshExperience } = await import("@/packages/experience-core");
    const { briefInput } = await import("@/lib/experience");
    const p = await eyewear();
    const again = refreshExperience(p.experience!, briefInput(p));
    expect(again.concept).toBe("asset-showcase");
    expect(again.artDirection?.visualStyle).toBe("luxury editorial");
    expect(heroAsset(again)?.id).toBe("eyewear-black-001");
  });

  it("chooses a character's clips per scene", async () => {
    const { createProject } = await import("@/lib/project");
    const e = createProject({ query: "Website for my robot toy company with a friendly mascot" }).experience!;
    expect(e.concept).toBe("asset-showcase");
    expect(heroAsset(e)?.id).toBe("character-robot-001");
    const clips = e.scenes.map((s) => s.beat.clip);
    expect(clips[0]).toBe("idle");
    expect(clips.slice(1, -1).some((c) => c === "walk" || c === "run" || c === "dance")).toBe(true);
    expect(["wave", "dance", "yes", "idle"]).toContain(clips[clips.length - 1]);
  });
});

describe("devices and fallbacks", () => {
  it("lets phones run 3D only for a light hero, and turns 3D off when asked", async () => {
    const e = (await eyewear()).experience!;
    expect(phoneMay3d(e)).toBe(true);
    const car = toExperienceAsset(assetById("car-concept-001")!, "hero-product", "car");
    expect(car.mobile).toBe(false);
    expect(phoneMay3d({ ...e, assets: [car] })).toBe(false);
    expect(wants3d({ ...e, noWebgl: true })).toBe(false);
    expect(wants3d({ ...e, assets: [] })).toBe(false);
    expect(wants3d({ ...e, intensity: 3 })).toBe(false);
  });

  it("serves asset paths from the site itself", () => {
    expect(assetUrl("/assets/3d/product/eyewear-black-001.glb")).toBe("/assets/3d/product/eyewear-black-001.glb");
    (globalThis.window as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__ = ".";
    expect(assetUrl("/assets/3d/product/eyewear-black-001.glb")).toBe("./assets/3d/product/eyewear-black-001.glb");
    delete (globalThis.window as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__;
  });
});

describe("export", () => {
  it("copies only the assets the page uses, with credits, and no third-party URL", async () => {
    const JSZip = (await import("jszip")).default;
    const { buildZip } = await import("@/lib/export");
    const p = await eyewear();
    fetched.length = 0;
    const { blob } = await buildZip(p, "source");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    const assets = names.filter((n) => /\/public\/assets\//.test(n)).map((n) => n.replace(/^[^/]+\/public/, "")).sort();
    expect(assets).toEqual(assetFiles(p.experience).sort());
    expect(assets).toContain("/assets/3d/product/eyewear-black-001.glb");
    expect(assets).toContain("/assets/hdr/hdri-studio-small-03.hdr");
    // Byte for byte the library file.
    const glbName = names.find((n) => n.endsWith("eyewear-black-001.glb"))!;
    expect((await zip.files[glbName].async("nodebuffer")).equals(readFileSync(join(PUBLIC, "assets/3d/product/eyewear-black-001.glb")))).toBe(true);
    // Not the whole library.
    expect(assets.length).toBeLessThan(6);
    const credits = await zip.files[names.find((n) => n.endsWith("CREDITS.txt"))!].async("string");
    expect(credits).toMatch(/Eric Chadwick/);
    expect(credits).toMatch(/creativecommons\.org\/licenses\/by\/4\.0/);
    // The three.js packages ship with a 3D site.
    const pkg = JSON.parse(await zip.files[names.find((n) => n.endsWith("/package.json"))!].async("string"));
    expect(pkg.dependencies.three).toBeTruthy();
    // No third-party asset URL anywhere in the site's data, and nothing fetched from outside.
    const data = await zip.files[names.find((n) => n.endsWith("site-data.json"))!].async("string");
    const exp = JSON.parse(data).experience as Experience;
    // The only links are inside the credit lines, which name each source as the licence asks.
    const noCredits = { ...exp, assets: exp.assets?.map((a) => ({ ...a, license: { ...a.license, credit: "" } })) };
    expect(JSON.stringify(noCredits)).not.toMatch(/https?:\/\//);
    for (const a of exp.assets ?? []) expect(a.src.startsWith("/assets/")).toBe(true);
    for (const n of names.filter((x) => /\.(json|js|ts|tsx|html|css)$/.test(x))) {
      const text = await zip.files[n].async("string");
      // No asset file is fetched from another site (credit lines may name the source page).
      expect(text, n).not.toMatch(/https?:\/\/[^"'\s)]+\.(glb|gltf|hdr|exr|webp|png|jpe?g|ktx2)\b|raw\.githubusercontent|dl\.polyhaven|sketchfab\.com/i);
    }
    expect(fetched.every((u) => !/^https?:/.test(u) || /fonts\.googleapis|fonts\.gstatic/.test(u))).toBe(true);
  });

  it("drops a file that cannot be copied, so the page falls back instead of breaking", async () => {
    const { packAssets } = await import("@/lib/export");
    const e = (await eyewear()).experience!;
    const broken: Experience = { ...e, assets: e.assets!.map((a) => (a.kind === "model" ? { ...a, src: "/assets/3d/product/missing.glb", preview: "/assets/previews/missing.webp" } : a)), stage: { ...e.stage, params: { ...e.stage.params, image: "/assets/previews/missing.webp" } } };
    const put: string[] = [];
    const out = await packAssets(broken, (path) => put.push(path));
    expect(out.assets!.some((a) => a.kind === "model")).toBe(false);
    expect(out.stage.params.image).toBe("");
    expect(wants3d(out)).toBe(false);
    expect(put).not.toContain("assets/3d/product/missing.glb");
  });

  it("refuses an export whose assets are not in the library or not licensed", async () => {
    const e = (await eyewear()).experience!;
    const own = assetById("animal-macaw-001")!;
    const macaw = { ...toExperienceAsset(own, "hero-character", "macaw"), id: "unlisted-upload-001" };
    expect(assetLicenceProblems({ ...e, assets: [macaw] }).join()).toMatch(/not in the asset library/);
    expect(assetLicenceProblems({ ...e, assets: [toExperienceAsset(own, "hero-character", "macaw")] })).toEqual([]);
    const outside = { ...e.assets![0], src: "https://example.com/model.glb" };
    expect(assetLicenceProblems({ ...e, assets: [outside] }).join()).toMatch(/outside the site|not its library file/);
    const gates = qualityGates({ experience: { ...e, assets: [macaw] }, meta: { title: "T", description: "A description that is long enough to pass the search check easily." }, contrast: [7], images: [] });
    expect(gates.find((g) => g.id === "licensing")?.pass).toBe(false);
  });
});

describe("animator art direction", () => {
  it("accepts concepts from the AI and drops file names and URLs", () => {
    const fallback = localArtPlan("premium eyewear brand", "website", "shop", "lively");
    const out = normalizeArtPlan(
      { visualStyle: "luxury editorial", mood: "cinematic", density: "minimal", lighting: "studio", styleTags: ["luxury", "premium"], preferredVisuals: ["3d product"], avoid: ["stock photos"] },
      [
        { role: "hero-product", query: "premium black sunglasses" },
        { role: "supporting", query: "https://example.com/model.glb" },
        { role: "supporting", query: "sunglasses_final.glb" },
      ],
      fallback,
    );
    expect(out.art.visualStyle).toBe("luxury editorial");
    expect(out.art.source).toBe("gemini");
    expect(out.assets.map((a) => a.query)).toEqual(["premium black sunglasses", fallback.assets.find((a) => a.role === "lighting")!.query]);
  });
});
