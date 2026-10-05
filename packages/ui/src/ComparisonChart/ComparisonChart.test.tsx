import { composeStories } from "@storybook/react"
import { expect, userEvent, within } from "storybook/test"
import { test } from "vitest"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./ComparisonChart.stories.tsx"

const { Playground, Interactive } = composeStories(stories)
test("comparison plots and the shared legend remain accessible", async () => {
  const { canvas } = await mountStory(Playground)
  expectAgentDrivable(canvas, {
    role: "img",
    name: "Activity comparison: Practice",
  })
  await expect(
    canvas.getByRole("list", {
      name: "Activity comparison legend",
    }),
  ).toBeVisible()
})
test("values can be read without relying on colour", async () => {
  const { canvas } = await mountStory(Interactive)
  await userEvent.click(
    expectAgentDrivable(canvas, {
      role: "button",
      name: "Show values",
    }),
  )
  const table = canvas.getByRole("table", {
    name: "Activity comparison values",
  })
  await expect(within(table).getByText("-")).toBeVisible()
})
