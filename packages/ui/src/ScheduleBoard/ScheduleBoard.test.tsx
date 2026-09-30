import { composeStories } from "@storybook/react"
import { expect, userEvent, within } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./ScheduleBoard.stories.tsx"

const { Playground, Responsive, Interactive, HourGrid } =
  composeStories(stories)

test("bands align periods while retaining exact times and complete titles", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)
  expectAgentDrivable(canvas, {
    role: "region",
    name: "Studio schedule",
  })
  const morning: HTMLElement = canvas.getByRole("group", {
    name: "Morning",
  })
  await expect(
    within(morning).getByText("9a–11a"),
  ).toBeInTheDocument()
  await expect(
    within(morning).getByText("Client review"),
  ).toBeInTheDocument()
  await expect(
    canvas.getByText(
      "Location recording and equipment preparation",
    ),
  ).toBeInTheDocument()
  const cards = Array.from(
    morning.querySelectorAll("article"),
  )
  await expect(
    cards.every(
      (card) => card.scrollHeight <= card.clientHeight + 1,
    ),
  ).toBe(true)
  await expectNoAxeViolations(canvasElement)
})

test("the narrow layout keeps all events inside the container", async () => {
  const { canvas, canvasElement } =
    await mountStory(Responsive)
  const region = expectAgentDrivable(canvas, {
    role: "region",
    name: "Schedule at 15rem",
  })
  await expect(
    within(region).getByText(
      "Location recording and equipment preparation",
    ),
  ).toBeInTheDocument()
  await expect(region.scrollWidth).toBeLessThanOrEqual(
    region.clientWidth + 1,
  )
  await expectNoAxeViolations(canvasElement)
})

test("the hour axis places overlapping items beside one another", async () => {
  const { canvas } = await mountStory(HourGrid)
  expectAgentDrivable(canvas, {
    role: "region",
    name: "Studio schedule",
  })
  const first = canvas
    .getByText("Mixing session")
    .parentElement?.getBoundingClientRect()
  const second = canvas
    .getByText("Client review")
    .parentElement?.getBoundingClientRect()
  if (!first || !second)
    throw new Error("Both events must render")
  await expect(second.top).toBeGreaterThan(first.top)
  await expect(second.left).toBeGreaterThanOrEqual(
    first.right,
  )
})

test("keyboard selection opens the detail and returns focus on Escape", async () => {
  const { canvas } = await mountStory(Interactive)
  const button = expectAgentDrivable(canvas, {
    role: "button",
    name: "9a–11a, Mixing session, Studio A",
  })
  button.focus()
  await userEvent.keyboard("{Enter}")
  await expect(
    within(document.body).getByRole("dialog", {
      name: "Mixing session",
    }),
  ).toBeInTheDocument()
  await userEvent.keyboard("{Escape}")
  await expect(button).toHaveFocus()
})
