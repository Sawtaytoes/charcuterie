import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./TableColumns.stories.tsx"

const { Interactive } = composeStories(stories)
test("column visibility and order can be changed with named controls", async () => {
  const { canvas, body } = await mountStory(Interactive)
  await userEvent.click(
    expectAgentDrivable(canvas, {
      role: "button",
      name: "Columns",
    }),
  )
  await userEvent.click(
    expectAgentDrivable(body, {
      role: "checkbox",
      name: "Median",
    }),
  )
  await expect(
    canvas.getByText("Name, Duration, Median"),
  ).toBeVisible()
  await userEvent.click(
    expectAgentDrivable(body, {
      role: "button",
      name: "Move Median earlier",
    }),
  )
  await expect(
    canvas.getByText("Name, Median, Duration"),
  ).toBeVisible()
})
