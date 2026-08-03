/**
 * The first-paint script's substance — the two things a copy of it
 * gets wrong, asserted where it is generated.
 *
 * `buildFirstPaintRule` pins one scheme's canvas; this pins the
 * *dynamic* case: both surface hexes present (so the fallback can
 * branch), the `data-scheme` write (so `variables.css` selects a
 * block), and the storage key (so it agrees with the runtime hook).
 */

import { expect, test } from "vitest"

import {
  buildFirstPaintScript,
  DEFAULT_COLOR_SCHEME_STORAGE_KEY,
} from "./buildCss.ts"
import { daylight } from "./variants/index.ts"

test("both surface hexes are embedded so the fallback can branch", () => {
  const script = buildFirstPaintScript(daylight)

  expect(script).toContain(daylight.schemes.light.surface.base)
  expect(script).toContain(daylight.schemes.dark.surface.base)
})

test("it sets data-scheme and reads the default storage key", () => {
  const script = buildFirstPaintScript(daylight)

  expect(script).toContain('setAttribute("data-scheme"')
  expect(script).toContain(
    `var KEY = "${DEFAULT_COLOR_SCHEME_STORAGE_KEY}"`,
  )
})

test("the storage key is overridable, and the default matches the shared literal", () => {
  const script = buildFirstPaintScript(daylight, {
    storageKey: "my-app-scheme",
  })

  expect(script).toContain('var KEY = "my-app-scheme"')
  // Guards the cross-package contract: this literal must equal
  // @charcuterie/logic/browser's DEFAULT_COLOR_SCHEME_STORAGE_KEY.
  expect(DEFAULT_COLOR_SCHEME_STORAGE_KEY).toBe(
    "charcuterie-scheme",
  )
})

test("it keeps the var() fallback so the token wins once loaded", () => {
  const script = buildFirstPaintScript(daylight)

  expect(script).toContain(
    "var(--color-surface-base,",
  )
})
