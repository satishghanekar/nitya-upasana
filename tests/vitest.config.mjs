// Vitest runs the logic tests in tests/unit (plain functions, no browser). Playwright runs the *.spec.mjs files.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["unit/**/*.test.mjs"], environment: "node" },
});
