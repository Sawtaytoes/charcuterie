import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    exclude: [
      "**/dist/**",
      "**/node_modules/**",
      "**/storybook-static/**",
    ],
    projects: [
      "packages/tokens/vitest.config.ts",
      "packages/logic/vitest.config.ts",
      "packages/logic/vitest.browser.config.ts",
      "packages/eslint-config/vitest.config.ts",
      "packages/ui/vitest.config.ts",
      "packages/docs/vitest.storybook.config.ts",
      "packages/docs/vitest.ui.config.ts",
    ],
  },
})
