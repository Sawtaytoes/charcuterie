import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test, vi } from "vitest"
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
  for (const animation of dialog.getAnimations())
    animation.finish()
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

test("keeps the table and focus trap until the reverse animation completes", async () => {
  const { body, canvas } = await mountStory(Interactive)
  const trigger = canvas.getByRole("button", {
    name: "Expand table",
  })
  const pane = canvas.getByRole("region", {
    name: "Printer comparison",
  })
  pane.scrollLeft = 120
  const scrollLeft = pane.scrollLeft
  const height = pane.getBoundingClientRect().height
  await userEvent.click(trigger)
  const dialog = body.getByRole("dialog", {
    name: "Printer comparison",
  })
  const [animation] = dialog.getAnimations()
  await expect(animation).toBeDefined()
  animation.pause()
  animation.currentTime =
    Number(animation.effect?.getTiming().duration) / 2
  await expect(
    Number(getComputedStyle(dialog).opacity),
  ).toBeGreaterThan(0)
  await expect(
    Number(getComputedStyle(dialog).opacity),
  ).toBeLessThan(1)
  await expect(pane.getBoundingClientRect().height).toBe(
    height,
  )
  await userEvent.keyboard("{Escape}")
  await animation.ready
  animation.pause()
  await expect(animation.playbackRate).toBe(-1)
  await expect(body.getByRole("dialog")).toBe(dialog)
  await expect(
    document.querySelectorAll("table"),
  ).toHaveLength(1)
  // A second dismiss during exit must not reverse back into an opening.
  await userEvent.click(
    body.getByRole("button", { name: "Close" }),
  )
  await expect(animation.playbackRate).toBe(-1)
  animation.finish()
  await waitFor(() =>
    expect(body.queryByRole("dialog")).toBeNull(),
  )
  await waitFor(() =>
    expect(document.activeElement).toBe(trigger),
  )
  await waitFor(() =>
    expect(pane.scrollLeft).toBe(scrollLeft),
  )
  await expect(
    canvas.getByRole("table"),
  ).toBeInTheDocument()
})

test("reduced motion opens and closes immediately without a table animation", async () => {
  const { body, canvas } = await mountStory(Interactive)
  const matchMedia = window.matchMedia.bind(window)
  const media = vi
    .spyOn(window, "matchMedia")
    .mockImplementation((query) =>
      query === "(prefers-reduced-motion: reduce)"
        ? { ...matchMedia(query), matches: true }
        : matchMedia(query),
    )
  try {
    await userEvent.click(
      canvas.getByRole("button", { name: "Expand table" }),
    )
    const dialog = body.getByRole("dialog", {
      name: "Printer comparison",
    })
    await expect(dialog.getAnimations()).toHaveLength(0)
    await userEvent.click(
      body.getByRole("button", { name: "Close" }),
    )
    await waitFor(() =>
      expect(body.queryByRole("dialog")).toBeNull(),
    )
  } finally {
    media.mockRestore()
  }
})
