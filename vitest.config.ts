import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    exclude: [
      "**/dist/**",
      "**/node_modules/**",
      "**/storybook-static/**",
    ],
    projects: [
      // `ci` carries its own config and was never listed here, so its
      // suite has not run since the package landed in #248.
      "packages/ci/vitest.config.ts",
      "packages/tokens/vitest.config.ts",
      "packages/logic/vitest.config.ts",
      "packages/logic/vitest.browser.config.ts",
      "packages/biome-config/vitest.config.ts",
      "packages/eslint-config/vitest.config.ts",
      "packages/vite-config/vitest.config.ts",
      "packages/vitest-config/vitest.config.ts",
      "packages/server/vitest.config.ts",
      "packages/model-viewer/vitest.config.ts",
      "packages/storybook-config/vitest.config.ts",
      "packages/ui/vitest.config.ts",
      "packages/docs/vitest.storybook.config.ts",
      "packages/docs/vitest.ui.config.ts",
    ],
  },
})
