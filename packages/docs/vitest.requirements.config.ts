import { join } from "node:path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { quickpickle } from "quickpickle"
import { defineConfig } from "vitest/config"

/** Gherkin requirements use the same Playwright-backed browser as ui-dom. */
export default defineConfig({
  define: {
    "import.meta.env.VITEST_STORYBOOK": '"false"',
  },
  plugins: [
    react(),
    tailwindcss(),
    quickpickle({
      stepTimeout: process.env.CI ? 30_000 : 3_000,
    }),
  ],
  optimizeDeps: {
    include: [
      "@floating-ui/react",
      "@storybook/addon-a11y/preview",
      "@storybook/addon-docs/blocks",
      "@tanstack/react-virtual",
      "react-router",
      "tailwind-merge",
    ],
  },
  test: {
    name: "requirements",
    ...(process.env.CI
      ? { testTimeout: 30_000, hookTimeout: 30_000 }
      : {}),
    include: [
      join(import.meta.dirname, "requirements/*.feature"),
    ],
    setupFiles: [
      join(import.meta.dirname, "vitest.ui.setup.ts"),
      join(import.meta.dirname, "requirements/steps.ts"),
    ],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
      screenshotFailures: false,
    },
  },
})
