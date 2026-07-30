import { join } from "node:path"

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    storybookTest({
      configDir: join(import.meta.dirname, ".storybook"),
    }),
  ],
  // Pre-bundled, because discovering it mid-run makes Vite reload
  // the page and every story in flight fails with "Failed to fetch
  // dynamically imported module" — a real failure that looks
  // nothing like its cause.
  optimizeDeps: {
    include: ["@floating-ui/react"],
  },
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
})
