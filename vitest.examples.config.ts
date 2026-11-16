import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Builds the example sites (scripts/examples.gen.ts) into .examples/ for Lighthouse and review.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: { include: ["scripts/examples.gen.ts"], environment: "node", testTimeout: 120_000 },
});
