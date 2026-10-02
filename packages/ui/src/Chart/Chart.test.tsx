import { composeStories } from "@storybook/react"
import { expect, userEvent, within } from "storybook/test"
import { test } from "vitest"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Chart.stories.tsx"

const { Playground, Interactive, StackedDaily } =
  composeStories(stories)
test("the plot has an accessible name and a named legend", async () => {
  const { canvas } = await mountStory(Playground)
  expectAgentDrivable(canvas, {
    role: "img",
    name: "Daily progress",
  })
  await expect(
    canvas.getByRole("list", {
      name: "Daily progress legend",
    }),
  ).toBeVisible()
})
test("the keyboard exposes all values, including missing data, in a real table", async () => {
  const { canvas } = await mountStory(Interactive)
  const toggle = expectAgentDrivable(canvas, {
    role: "button",
    name: "Show values",
  })
  toggle.focus()
  await userEvent.keyboard("{Enter}")
  const table = canvas.getByRole("table", {
    name: "Daily progress values",
  })
  await expect(table).toBeVisible()
  await expect(
    within(table).getByText("Unavailable"),
  ).toBeVisible()
  await expect(within(table).getByText("-50")).toBeVisible()
})

test("keyboard point navigation exposes the day's original category amounts", async () => {
  const { canvas } = await mountStory(StackedDaily)
  const plot = expectAgentDrivable(canvas, {
    role: "img",
    name: "Daily progress",
  })
  plot.focus()
  await userEvent.keyboard("{Home}")
  const body = within(document.body)
  await expect(body.getByRole("status")).toBeVisible()
  await expect(
    within(body.getByRole("status")).getByText("Tasks"),
  ).toBeVisible()
  await expect(
    within(body.getByRole("status")).getByText("200"),
  ).toBeVisible()
  await expect(
    within(body.getByRole("status")).getByText("10"),
  ).toBeVisible()
  await userEvent.keyboard("{End}")
  await expect(
    within(body.getByRole("status")).getByText("Fri"),
  ).toBeVisible()
  await expect(
    within(body.getByRole("status")).getByText("300"),
  ).toBeVisible()
})
