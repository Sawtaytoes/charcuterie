import { freezeMotion } from "@charcuterie/storybook-config/testing"
import * as a11yAnnotations from "@storybook/addon-a11y/preview"
import { setProjectAnnotations } from "@storybook/react"
import { afterEach } from "vitest"

import previewAnnotations from "./.storybook/preview.tsx"

/**
 * The same annotations the canvas runs under, so a composed story
 * is the story — density/variant/scheme attributes on `<html>`, the
 * token stylesheet (imported by the preview), and axe.
 *
 * The a11y addon's `afterEach` is what makes
 * `parameters.a11y.test: "error"` a failing assertion rather than a
 * panel, and it only exists if these annotations are registered.
 * Without this line every test would pass with the accessibility
 * tree unchecked, which is the failure mode that looks like success.
 */
setProjectAnnotations([a11yAnnotations, previewAnnotations])

/**
 * Every mount appends its own canvas to `<body>`, and axe scans the
 * document rather than that canvas — so without this, test three
 * fails on a violation left behind by test one, reported against
 * markup its own file never rendered.
 *
 * `<dialog open>` and `popover` elements are in the light DOM too
 * (M4's top-layer decision), so nothing survives this that would
 * survive a portal.
 */
afterEach(() => {
  document.body.replaceChildren()
})

/**
 * The determinism preamble, ported from `vrtCapture.mjs`.
 *
 * That script learned all of this the expensive way — `vrt` was the
 * sole failing job across three master runs, non-deterministic
 * enough that one commit produced "2 changed" then "1 changed" on a
 * re-run. **This project never learned any of it**, and it flakes
 * for the same reasons: three different `ui-dom` tests have failed
 * intermittently in CI (`ButtonLink`'s `color-contrast`, `Toast`'s
 * naming, `Dialog`'s `scrollable-region-focusable`) while the suite
 * passes five times in a row locally. That gap — green on a quiet
 * machine, red on a busy one — is the signature of a race, not of a
 * broken assertion.
 *
 * Motion goes first because the owner asked for it directly, and
 * because a transition in flight is a computed style that is
 * neither the old value nor the new one — which is exactly what an
 * axe contrast check reads.
 */
freezeMotion(document)

/**
 * **Fonts, before any test measures anything.**
 *
 * `vrtCapture.mjs` awaits this and this file did not, which is the
 * single largest determinism gap between the two suites. Chromium
 * lays out with fallback metrics until Victor Mono / Outfit / Baloo
 * arrive, and the fallback is a different width and a different
 * line height — so whether a body overflows its clamp, whether a
 * label truncates, and how tall a region is are all decided by who
 * wins a race against the network.
 *
 * `Dialog > a long body scrolls inside the clamp` asserts on
 * exactly that overflow, and it is one of the tests that has failed
 * in CI on a branch that does not touch it.
 *
 * Top-level `await` in a setup file is awaited before any test in
 * the file runs, which is the whole point: it is a barrier, not a
 * hint.
 */
await document.fonts.ready
