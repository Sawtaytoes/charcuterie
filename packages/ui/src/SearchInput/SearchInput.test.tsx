import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./SearchInput.stories.tsx"

const { Interactive } = composeStories(stories)

test("the clear affordance is a labelled button and returns focus", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)
  const input = expectAgentDrivable(canvas, {
    name: "Search inventory",
    role: "searchbox",
  })
  const clear = expectAgentDrivable(canvas, {
    name: "Clear search",
    role: "button",
  })

  await userEvent.click(clear)
  await expect(input).toHaveValue("")
  await expect(input).toHaveFocus()
  await expectNoAxeViolations(canvasElement)
})
