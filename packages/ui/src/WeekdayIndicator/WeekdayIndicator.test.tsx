import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./WeekdayIndicator.stories.tsx"

const { Playground, Interactive } = composeStories(stories)
test("the pattern reads Monday first and exposes the filled days in words", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)
  const pattern = expectAgentDrivable(canvas, {
    role: "img",
    name: "Repeats: Monday, Tuesday, Wednesday, Thursday",
  })
  await expect(pattern.textContent).toBe("MTWTFSS")
  await expectNoAxeViolations(canvasElement)
})
test("a changed pattern updates its accessible description", async () => {
  const { canvas } = await mountStory(Interactive)
  const button = expectAgentDrivable(canvas, {
    role: "button",
    name: "Switch pattern",
  })
  button.focus()
  await userEvent.keyboard("{Enter}")
  await expect(
    canvas.getByRole("img", {
      name: "Repeats: Saturday, Sunday",
    }),
  ).toBeInTheDocument()
})
