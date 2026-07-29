import { defineConfig } from "vitest/config"

/**
 * Node only, deliberately — there is no second rendering stack in
 * this package.
 *
 * Every DOM assertion a component owes lives in its story's `play`
 * function, which the Storybook project (`packages/docs`) runs in
 * chromium with axe at `test: "error"`. Rendering the same markup a
 * second time under a different harness would double the
 * maintenance and halve the meaning: a component that passes in
 * jsdom and fails in Storybook has told nobody anything useful.
 *
 * What runs here is what stories cannot see — the class maps
 * Tailwind has to be able to generate, the exhaustive status
 * switches, the clamping arithmetic, and the package boundaries.
 */
export default defineConfig({
  test: {
    name: "ui",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
})
