import { defineConfig } from "vitest/config"

/**
 * The Node half: the cores and their model-based suite, which
 * need no DOM and run thousands of command sequences in
 * milliseconds.
 *
 * The React and Preact bindings run the same suite in a real
 * browser — see `vitest.browser.config.ts`.
 */
export default defineConfig({
  test: {
    name: "logic",
    include: ["src/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "src/**/*.browser.test.ts",
    ],
  },
})
