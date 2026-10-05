import {
  createCiTimeouts,
  createViewportInstances,
} from "@charcuterie/vitest-config"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

/**
 * The DOM half: the React 19 and Preact bindings, running the
 * same conformance suite as the core.
 *
 * Chromium headless, matching `mux-magic/packages/web` — the
 * reference app for every convention in this repo.
 *
 * No JSX plugin and no aliasing. The conformance harness mounts
 * its host with `createElement`, so React resolves to React and
 * Preact resolves to Preact with nothing in between; a
 * `preact/compat` alias here would mean the Preact adapter was
 * quietly testing React's binding.
 */
export default defineConfig({
  test: {
    // Four windows on a shared runner is four times the load; the
    // factory's CI budget, which a hand-rolled config does not get.
    ...createCiTimeouts(),
    name: "logic-dom",
    include: ["src/**/*.browser.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: createViewportInstances({
        project: "logic-dom",
      }),
    },
  },
  // Pre-declared so Vite optimises every test dependency at
  // startup. Discovering them mid-run triggers a re-optimisation
  // and a page reload, which lands in the middle of a property
  // and fails it for reasons that have nothing to do with the
  // code. Same reasoning as `mux-magic/packages/web`.
  optimizeDeps: {
    include: [
      "fast-check",
      "preact",
      "preact/hooks",
      "preact/test-utils",
      "react",
      "react-dom",
      "react-dom/client",
    ],
  },
})
