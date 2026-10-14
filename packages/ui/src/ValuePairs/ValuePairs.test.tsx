import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import * as stories from "./ValuePairs.stories.tsx"

const { Narrow } = composeStories(stories)
test("all pairs remain readable when the list wraps", async () => {
  const { canvasElement } = await mountStory(Narrow)
  const list = canvasElement.querySelector("dl")
  await expect(list).toHaveAttribute("aria-label", "Payout")
  await expect(list?.querySelectorAll("dt")).toHaveLength(4)
  await expect(list?.querySelectorAll("dd")).toHaveLength(4)
  if (!list) throw new Error("Missing value list")
  await expect(list.scrollWidth).toBeLessThanOrEqual(
    list.clientWidth,
  )
  await expectNoAxeViolations(canvasElement)
})
