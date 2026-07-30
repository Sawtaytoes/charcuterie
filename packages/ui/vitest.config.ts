import { defineConfig } from "vitest/config"

/**
 * Node only, and `.ts` only — the `.tsx` siblings belong to the
 * `ui-dom` project in `packages/docs`, which runs them in the same
 * chromium the stories render in.
 *
 * There is still no second *rendering* stack: no jsdom, no
 * `@testing-library/react`. A `*.test.tsx` here mounts the composed
 * story rather than re-assembling the component, so the subject of
 * a DOM test is the story a reader sees.
 *
 * What runs *here* is what a rendered component cannot show — the
 * class maps Tailwind has to be able to generate, the exhaustive
 * status switches, the clamping arithmetic, and the package
 * boundaries.
 */
export default defineConfig({
  test: {
    name: "ui",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
})
