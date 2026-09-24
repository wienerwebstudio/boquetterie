import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the pure domain modules under `src/lib` (delivery engine,
 * pricing, catalog, validators, shop filters). Node environment – nothing here
 * touches the DOM or the filesystem.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    globals: false,
    // Playwright specs live under tests/e2e and are never picked up by Vitest.
    exclude: ["node_modules/**", ".next/**", "tests/e2e/**"],
  },
});
