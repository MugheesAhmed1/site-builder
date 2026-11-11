import { beforeEach, describe, expect, it, vi } from "vitest";

// The store talks to localStorage and window; give it small stand-ins.
const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
  vi.stubGlobal("window", { dispatchEvent: () => true });
  vi.stubGlobal("CustomEvent", class { constructor(public type: string, public init?: unknown) {} });
});

describe("store", () => {
  it("skips junk instead of crashing", async () => {
    const { listProjects } = await import("@/lib/store");
    mem.set("sb.projects.v2", JSON.stringify([null, 5, "x", { id: "../evil" }, { id: "ok1" }]));
    expect(listProjects()).toEqual([]);
    mem.set("sb.projects.v2", "{not json");
    expect(listProjects()).toEqual([]);
    mem.set("sb.projects.v2", JSON.stringify({ a: 1 }));
    expect(listProjects()).toEqual([]);
  });

  it("round-trips a project and imports only real projects", async () => {
    const { newProject, saveProject, listProjects, importProjects } = await import("@/lib/store");
    const p = newProject("Website for my bakery", "website", "food", "Crumb House");
    saveProject(p);
    expect(listProjects().map((x) => x.id)).toEqual([p.id]);
    const q = newProject("Portfolio", "portfolio", "portfolio", "");
    expect(importProjects([q, { id: "bad" }, null, 3])).toBe(1);
    expect(listProjects().length).toBe(2);
    expect(importProjects([{ nope: true }])).toBe(0);
  });

  it("keeps working when storage refuses to save", async () => {
    const { newProject, saveProject } = await import("@/lib/store");
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => { throw new Error("quota"); } });
    expect(() => saveProject(newProject("x", "website", "general", ""))).not.toThrow();
  });
});
