import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "app/src/**/*.test.ts",
      "scripts/**/*.test.ts",
      "pipeline/**/*.test.ts",
      "packages/**/test/**/*.test.ts",
      "worker/**/*.test.ts",
    ],
    testTimeout: 30_000,
    environment: "node",
    environmentMatchGlobs: [
      ["app/src/**/*.test.ts", "happy-dom"],
      ["app/src/catalog/**/*.test.ts", "happy-dom"],
      ["app/src/import/**/*.test.ts", "happy-dom"],
      ["app/src/packs/**/*.test.ts", "happy-dom"],
    ],
  },
});