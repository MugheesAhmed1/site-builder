import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  // The template is React with the automatic JSX runtime, so tests can render it.
  esbuild: { jsx: "automatic" },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
