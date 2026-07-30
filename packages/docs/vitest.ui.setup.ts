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
