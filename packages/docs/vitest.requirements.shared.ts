import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  createCiTimeouts,
  createViewportInstances,
  type ViewportName,
} from "@charcuterie/vitest-config"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { quickpickle } from "quickpickle"
import { defineConfig } from "vitest/config"

const requirementsDirectory = join(
  import.meta.dirname,
  "requirements",
)

/**
 * A scenario's tags are part of its Vitest test name, as
 * `Scenario: … (@REQ-UI-001 @responsive)`, so the name pattern is
 * how one project takes the `@responsive` scenarios and the other
 * leaves them out.
 */
const responsiveTag = /@responsive\b/

/** Feature files that hold at least one `@responsive` scenario. */
export const responsiveFeatureFiles = () =>
  readdirSync(requirementsDirectory, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith(".feature"))
    .filter((file) =>
      responsiveTag.test(
        readFileSync(
          join(requirementsDirectory, file),
          "utf8",
        ),
      ),
    )
    .map((file) => join(requirementsDirectory, file))

/**
 * Both requirement projects: the same Playwright-backed Chromium,
 * story annotations, and step files as `ui-dom`.
 *
 * A requirement about behavior — a click, a key, an ARIA state —
 * does not change with the window, so it runs once, in `wide`.
 * A scenario tagged `@responsive` is about layout and runs in all
 * four standard windows
 * ([decision](../../docs/decisions/2026-11-22-requirement-scenarios-run-in-one-window-unless-tagged-responsive.md)).
 */
export const createRequirementsConfig = ({
  include,
  name,
  testNamePattern,
  windows,
}: {
  include: string[]
  name: string
  testNamePattern: RegExp
  windows: readonly ViewportName[]
}) =>
  defineConfig({
    resolve: { dedupe: ["react", "react-dom"] },
    define: {
      "import.meta.env.VITEST_STORYBOOK": '"false"',
    },
    plugins: [
      react(),
      tailwindcss(),
      quickpickle({
        // Below the test timeout, so a slow step fails as THAT step,
        // with its text and definition, not as an anonymous test
        // timeout. The old 3s local limit was shorter than one story
        // mount plus its axe audit on a loaded machine.
        stepTimeout: process.env.CI ? 25_000 : 10_000,
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
      ...createCiTimeouts(),
      name,
      include,
      testNamePattern,
      setupFiles: [
        join(import.meta.dirname, "vitest.ui.setup.ts"),
        join(requirementsDirectory, "index.ts"),
      ],
      browser: {
        enabled: true,
        provider: playwright(),
        headless: true,
        instances: createViewportInstances({
          names: windows,
          project: name,
        }),
        screenshotFailures: false,
      },
    },
  })
