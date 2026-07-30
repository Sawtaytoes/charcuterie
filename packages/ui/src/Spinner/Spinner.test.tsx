import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Spinner.stories.tsx"

const { Default, Interactive } = composeStories(stories)

test("the hidden label is the accessible name", async () => {
  const { canvas } = await mountStory(Default)

  // A live region takes **no** accessible name from its content, so
  // `Spinner` sets both — text for the announcement, `aria-label`
  // for the name. Without that this query matches nothing:
  // announced, but unfindable, and axe stays silent about it.
  expectAgentDrivable(canvas, {
    name: "Loading…",
    role: "status",
  })
})

test("the ring is decoration and stays out of the tree", async () => {
  const { canvas } = await mountStory(Interactive)

  const status = expectAgentDrivable(canvas, {
    name: "Reading disc structure…",
    role: "status",
  })

  // Otherwise a screen reader reads the label twice — once as the
  // region, once as an unnamed child.
  const ring = status.querySelector("[aria-hidden='true']")

  await expect(ring).toBeInTheDocument()
  await expect(ring).toHaveClass("charcuterie-spin")
})
