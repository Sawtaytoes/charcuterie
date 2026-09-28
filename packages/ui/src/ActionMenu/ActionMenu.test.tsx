import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./ActionMenu.stories.tsx"

const { AllVariants, Interactive, Playground, Responsive } =
  composeStories(stories)

test("the trigger is a button named for the thing it acts on", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)

  const trigger = expectAgentDrivable(canvas, {
    name: "Actions for Office Shelves",
    role: "button",
  })

  await expect(trigger).toHaveAttribute(
    "aria-haspopup",
    "menu",
  )
  await expect(trigger).toHaveAttribute(
    "aria-expanded",
    "false",
  )

  await expectNoAxeViolations(canvasElement)
})

test("clicking opens a menu named by the trigger, aligned to its end edge", async () => {
  const { body, canvas } = await mountStory(Playground)

  const trigger = canvas.getByRole("button", {
    name: "Actions for Office Shelves",
  })

  await userEvent.click(trigger)

  const menu = await waitFor(() =>
    expectAgentDrivable(body, {
      name: "Actions for Office Shelves",
      role: "menu",
    }),
  )

  await expect(trigger).toHaveAttribute(
    "aria-expanded",
    "true",
  )

  // `bottom-end`: the panel hangs from the trigger's end edge, so a
  // trigger in a row's last column opens inward, not off screen. Not
  // an exact edge match — this trigger touches the viewport, and
  // `shift` keeps the panel its padding away from that edge.
  const triggerBox = trigger.getBoundingClientRect()
  const menuBox = menu.getBoundingClientRect()

  await expect(menuBox.left).toBeLessThan(triggerBox.left)
  await expect(menuBox.right).toBeLessThanOrEqual(
    triggerBox.right + 1,
  )
  await expect(menuBox.top).toBeGreaterThanOrEqual(
    triggerBox.bottom,
  )

  await expectNoAxeViolations(menu)

  // A second click on the trigger closes it again.
  await userEvent.click(trigger)

  await waitFor(() => {
    expect(body.queryAllByRole("menuitem")).toHaveLength(0)
  })
})

test("the keyboard opens it, walks it, and closes it", async () => {
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.tab()
  await expect(
    canvas.getByRole("button", {
      name: "Actions for Office Shelves",
    }),
  ).toHaveFocus()

  await userEvent.keyboard("{Enter}")

  await waitFor(() => {
    expect(
      body.getByRole("menuitem", { name: "Rename" }),
    ).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowDown}")
  await expect(
    body.getByRole("menuitem", {
      name: "Move to another place",
    }),
  ).toHaveFocus()

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryAllByRole("menuitem")).toHaveLength(0)
  })
})

test("choosing an item runs it and closes the menu", async () => {
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    canvas.getByRole("button", {
      name: "Actions for Office Shelves",
    }),
  )

  await userEvent.click(
    await waitFor(() =>
      body.getByRole("menuitem", { name: "Rename" }),
    ),
  )

  await waitFor(() => {
    expect(body.queryAllByRole("menuitem")).toHaveLength(0)
  })
})

/**
 * The default dots are three boxes, so they have a size to measure in
 * a font with no `⋮`. A custom icon replaces them.
 */
test("the default dots draw without a font; an icon replaces them", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  const withDots = canvas.getByRole("button", {
    name: "Actions for shelf md",
  })

  const dots = withDots.querySelectorAll(
    "span > span.rounded-full",
  )

  await expect(dots).toHaveLength(3)

  for (const dot of Array.from<Element>(dots)) {
    await expect(
      dot.getBoundingClientRect().width,
    ).toBeGreaterThan(0)
  }

  await expect(withDots.querySelector("svg")).toBeNull()

  const withIcon = canvas.getByRole("button", {
    name: "Actions for bin md",
  })

  await expect(withIcon.querySelector("svg")).not.toBeNull()
  await expect(
    withIcon.querySelectorAll("span.rounded-full"),
  ).toHaveLength(0)

  await expectNoAxeViolations(canvasElement)
})

test("the trigger keeps its size beside a wrapping title", async () => {
  const { canvas, canvasElement } =
    await mountStory(Responsive)

  const narrow: HTMLElement = canvas.getByRole("button", {
    name: "Actions for Office Shelves at 15rem",
  })

  const wide: HTMLElement = canvas.getByRole("button", {
    name: "Actions for Office Shelves at 34rem",
  })

  await expect(narrow.getBoundingClientRect().width).toBe(
    wide.getBoundingClientRect().width,
  )

  await expectNoAxeViolations(canvasElement)
})
