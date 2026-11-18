import { defineConfig } from "vitest/config"

/**
 * Node only, and `.ts` only: the document builders, the image policy, the
 * emoji marks, and the observer hashes. The `.tsx` tests mount the stories
 * in chromium through the `ui-dom` project in `packages/docs`.
 */
export default defineConfig({
  root: import.meta.dirname,
  test: {
    name: "email-viewer",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
})
