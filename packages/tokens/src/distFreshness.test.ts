/**
 * The built `dist/` is what Storybook and every consumer actually
 * read, and a stale one is silent.
 *
 * Found in M4, the expensive way. `packages/docs` imports
 * `@charcuterie/tokens/theme.css`, which resolves to `dist` — and
 * that `dist` was three commits old, so a token added that
 * afternoon simply did not exist in the canvas. Nothing errored:
 * Tailwind cannot generate a utility for a `--color-*` it never
 * saw, so the element rendered with the UA default and the board
 * looked plausible. A story asserting the new colour was *there*
 * passed too, because the UA's own `::backdrop` is a translucent
 * black that satisfies a loose assertion.
 *
 * So freshness is a red test rather than a thing to remember.
 * `yarn build` fixes it, and the message says so.
 */

import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import { expect, test } from "vitest"

import {
  buildThemeCss,
  buildVariablesCss,
} from "./buildCss.ts"
import { variants } from "./variants/index.ts"

const distDirectory = resolve(
  import.meta.dirname,
  "..",
  "dist",
)

const readDistFile = async (name: string) => {
  try {
    return await readFile(join(distDirectory, name), "utf8")
  } catch {
    return null
  }
}

test.each([
  [
    "variables.css",
    buildVariablesCss(variants, "daylight"),
  ],
  ["theme.css", buildThemeCss()],
])(
  "dist/%s is what the generator produces today",
  async (name, expected) => {
    const built = await readDistFile(name)

    // Missing is a failure, not a skip. A skipped freshness check on
    // a machine that has never built is the same silence this test
    // exists to remove — and Storybook cannot start without these
    // files anyway.
    expect(
      built,
      `packages/tokens/dist/${name} is missing. Run \`yarn build\`.`,
    ).not.toBeNull()

    expect(
      built,
      `packages/tokens/dist/${name} is stale — it does not match what the generator produces from src. Run \`yarn build\`.`,
    ).toBe(expected)
  },
)
