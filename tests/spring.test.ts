import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CSS_SPRINGS, cssSpring, springAt } from "@/template/src/spring.js";

const values = (easing: string) => easing.slice("linear(".length, -1).split(", ").map(Number);

describe("css springs", () => {
  it("starts at 0, ends at 1 and settles after the visual duration", () => {
    for (const bounce of [0, 0.2, 0.5]) {
      const s = cssSpring({ visualDuration: 0.4, bounce });
      const v = values(s.easing);
      expect(v[0]).toBe(0);
      expect(v[v.length - 1]).toBe(1);
      expect(s.duration).toBeGreaterThan(0.2);
      expect(s.duration).toBeLessThan(4);
    }
  });

  it("only overshoots when it has bounce", () => {
    expect(Math.max(...values(cssSpring({ bounce: 0 }).easing))).toBeLessThanOrEqual(1);
    expect(Math.max(...values(cssSpring({ bounce: 0.4 }).easing))).toBeGreaterThan(1.05);
    expect(springAt(0, 0.4, 0.2)).toBeCloseTo(0, 6);
    expect(springAt(5, 0.4, 0.2)).toBeCloseTo(1, 6);
  });

  it("keeps the CSS in step with the spring settings", () => {
    const css = ["portfolio.css", "cast.css"].map((f) => readFileSync(join("template/src", f), "utf8")).join("\n");
    for (const [name, opts] of Object.entries(CSS_SPRINGS)) {
      expect(css, name).toContain(`${name}: ${cssSpring(opts).css};`);
    }
  });
});
