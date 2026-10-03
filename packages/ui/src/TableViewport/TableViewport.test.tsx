import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"
import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./TableViewport.stories.tsx"

const { Interactive } = composeStories(stories)

test("long inline comparisons grow with the page and expand without duplicate tables", async () => {
  const { body, canvas } = await mountStory(Interactive)
  const pane = expectAgentDrivable(canvas, {
    role: "region",
    name: "Printer comparison",
  })
  await expect(pane.scrollHeight).toBeLessThanOrEqual(
    pane.clientHeight + 1,
  )
  const trigger = expectAgentDrivable(canvas, {
    role: "button",
    name: "Expand table",
  })
  await userEvent.click(trigger)
  const dialog = expectAgentDrivable(body, {
    role: "dialog",
    name: "Printer comparison",
  })
  await expect(
    document.querySelectorAll("table").length,
  ).toBe(1)
  await expect(
    dialog.getBoundingClientRect().width,
  ).toBeGreaterThan(innerWidth * 0.9)
  await expectNoAxeViolations(dialog)
  const header = dialog.querySelector(
    "thead th",
  ) as HTMLElement
  const scroller = header.closest(
    ".overflow-auto",
  ) as HTMLElement
  scroller.scrollTop = 250
  await waitFor(() =>
    expect(
      header.getBoundingClientRect().top,
    ).toBeGreaterThanOrEqual(
      scroller.getBoundingClientRect().top - 1,
    ),
  )
  await userEvent.keyboard("{Escape}")
  await waitFor(() =>
    expect(body.queryByRole("dialog")).toBeNull(),
  )
  await expect(document.activeElement).toBe(trigger)
  await expect(
    canvas.getByRole("table"),
  ).toBeInTheDocument()
})
