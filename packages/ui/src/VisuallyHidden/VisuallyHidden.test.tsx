import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import * as stories from "./VisuallyHidden.stories.tsx"

const { Interactive } = composeStories(stories)

test("it is in the accessibility tree and out of the layout", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  // `display: none` would fail the first assertion; a plain `<span>`
  // would fail the second. Both halves, or the component is either
  // useless or visible.
  const hidden = canvas.getByText(
    "Announced, never printed.",
  )

  await expect(hidden).toBeInTheDocument()

  const { height, width } = hidden.getBoundingClientRect()

  await expect(width).toBeLessThanOrEqual(1)
  await expect(height).toBeLessThanOrEqual(1)

  await expect(canvasElement.textContent).toContain(
    "Announced, never printed.",
  )
})
