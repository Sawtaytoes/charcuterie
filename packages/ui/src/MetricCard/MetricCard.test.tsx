import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"
import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./MetricCard.stories.tsx"

const { Playground, AllStates, Responsive, Interactive } =
  composeStories(stories)

test("a metric is named by its visible heading and decorates its icon with its category colour", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)
  const region = expectAgentDrivable(canvas, {
    role: "region",
    name: "Energy",
  })
  await expect(region).toHaveTextContent("0.35 kWh")
  const icon = region.querySelector(
    'span[aria-hidden="true"]',
  ) as HTMLElement
  await expect(icon).toBeVisible()
  await expect(getComputedStyle(icon).color).not.toBe(
    getComputedStyle(region).color,
  )
  await expect(
    getComputedStyle(region, "::before").boxShadow,
  ).not.toBe("none")
  await expectNoAxeViolations(canvasElement)
})
test("zero and unavailable readings remain distinct", async () => {
  const { canvas } = await mountStory(AllStates)
  await expect(
    expectAgentDrivable(canvas, {
      role: "region",
      name: "Recorded total",
    }),
  ).toHaveTextContent("0")
  await expect(
    expectAgentDrivable(canvas, {
      role: "region",
      name: "Energy",
    }),
  ).toHaveTextContent("Unavailable")
})
test("metric values and supporting text fit every container", async () => {
  const { canvasElement } = await mountStory(Responsive)
  for (const card of canvasElement.querySelectorAll<HTMLElement>(
    "section",
  )) {
    await expect(card.scrollWidth).toBeLessThanOrEqual(
      card.clientWidth + 1,
    )
  }
  await expectNoAxeViolations(canvasElement)
})
test("a footer action is reachable by its accessible name", async () => {
  const { canvas } = await mountStory(Interactive)
  expectAgentDrivable(canvas, {
    role: "button",
    name: "Inspect records",
  })
})
