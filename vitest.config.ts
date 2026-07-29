import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    exclude: [
      "**/dist/**",
      "**/node_modules/**",
      "**/storybook-static/**",
      // v1's source, parked here until M2 ports it. Its tests
      // are Jest + Storybook test-runner and do not run under
      // Vitest; M2 rewrites them as part of the port.
      "packages/logic/**",
    ],
    projects: [
      "packages/tokens/vitest.config.ts",
      "packages/eslint-config/vitest.config.ts",
      "packages/docs/vitest.storybook.config.ts",
    ],
  },
})
