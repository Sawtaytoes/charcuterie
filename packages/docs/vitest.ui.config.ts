import { join } from "node:path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

/**
 * The DOM behaviour suite: `@charcuterie/ui`'s `*.test.tsx` files,
 * run in the same chromium the stories render in.
 *
 * It cannot use `storybookTest()` — that plugin owns `test.include`
 * and overwrites whatever it is given, because its whole job is to
 * turn the `stories` globs into the test list. So the pieces it
 * would have supplied are assembled here instead, and the project
 * annotations are applied in `vitest.ui.setup.ts`.
 *
 * The config lives in `packages/docs` rather than `packages/ui`
 * because the preview — decorators, the a11y addon, the token
 * stylesheet — lives here, and `ui` may not depend on `docs`. The
 * *files* still sit beside their components.
 */
export default defineConfig({
  // The one thing `storybookTest()` sets that has no other way in.
  //
  // `@storybook/addon-a11y`'s `afterEach` always *runs* axe and
  // always files a report — but it only re-throws the violations
  // when `import.meta.env.VITEST_STORYBOOK === "false"`, its test
  // for "a standalone Vitest run rather than the Storybook UI".
  // Without this line every test here passes with a full set of
  // violations attached to a report nobody reads, which is the
  // failure mode that looks exactly like success.
  define: {
    "import.meta.env.VITEST_STORYBOOK": '"false"',
  },
  plugins: [react(), tailwindcss()],
  // Pre-bundled, because discovering it mid-run makes Vite reload
  // the page and every test in flight fails with "Failed to fetch
  // dynamically imported module" — a real failure that looks
  // nothing like its cause.
  optimizeDeps: {
    include: [
      "@floating-ui/react",
      "@storybook/addon-a11y/preview",
      "@storybook/addon-docs/blocks",
      "@tanstack/react-virtual",
    ],
  },
  test: {
    name: "ui-dom",
    include: [
      join(import.meta.dirname, "../ui/src/**/*.test.tsx"),
    ],
    setupFiles: [
      join(import.meta.dirname, "vitest.ui.setup.ts"),
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
