import { describe, expect, it, vi } from "vitest";
import { newProject } from "@/lib/store";
import { composeWebsite } from "@/lib/compose";
import { defaultAnswers } from "@/lib/questions";
import { headTags, structuredData, faviconSvg, siteName, slug } from "@/lib/export";
import type { Project } from "@/lib/types";

vi.stubGlobal("window", { dispatchEvent: () => true });
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined });

function bakery(): Project {
  const p = newProject("Website for my bakery called Crumb House in Lahore", "website", "food", "Crumb House");
  p.answers = { ...defaultAnswers("website", "food", { name: "Crumb House", city: "Lahore" }), name: "Crumb House", city: "Lahore" };
  p.content = composeWebsite("food", p.answers);
  return p;
}

describe("downloads", () => {
  it("builds head tags with share and search data", () => {
    const html = headTags(bakery(), ".");
    expect(html).toContain('rel="icon"');
    expect(html).toContain("og:image");
    expect(html).toContain("twitter:card");
    expect(html).toContain("application/ld+json");
    expect(html).not.toContain("</script><script");
  });

  it("escapes anything typed into the page", () => {
    const p = bakery();
    p.content!.meta.title = 'Evil "</title><script>alert(1)</script>';
    const html = headTags(p, "");
    expect(html).not.toContain("<script>alert(1)");
    expect(html).not.toMatch(/content="[^"]*"[^>]*<script>alert/);
  });

  it("describes a local business for search engines", () => {
    const ld = structuredData(bakery()) as Record<string, unknown> | null;
    expect(ld).toBeTruthy();
    expect(JSON.stringify(ld)).toContain("Crumb House");
  });

  it("makes a safe icon and file names", () => {
    const p = bakery();
    expect(faviconSvg(p)).toMatch(/^<svg/);
    expect(slug(siteName(p))).toMatch(/^[a-z0-9-]+$/);
  });
});
