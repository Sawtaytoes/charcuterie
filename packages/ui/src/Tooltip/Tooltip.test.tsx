import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Tooltip.stories.tsx"

const { AllVariants, Default, Interactive } =
  composeStories(stories)

test("nothing is shown until something asks", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: "Retry",
    role: "button",
  })

  await expect(
    canvas.queryAllByRole("tooltip"),
  ).toHaveLength(0)

  await expectNoAxeViolations(canvasElement)
})

/**
 * The defect that matters most in mux-magic's `FieldTooltip`: it
 * renders `role="tooltip"` and **no `aria-describedby` anywhere**,
 * so the control it belongs to never mentions it. `role="tooltip"`
 * is not a live region and does nothing on its own — the tip is a
 * floating node nobody is pointed at.
 */
test("the trigger is described by the tip that opened", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Keyboard tip",
    role: "button",
  })

  await expect(trigger).not.toHaveAttribute(
    "aria-describedby",
  )

  await userEvent.tab()

  await waitFor(() => {
    expect(trigger).toHaveFocus()
  })

  const tip = await waitFor(() =>
    expectAgentDrivable(canvas, { role: "tooltip" }),
  )

  await expect(trigger).toHaveAttribute(
    "aria-describedby",
    tip.id,
  )

  await expect(tip).toHaveTextContent(
    "Opened by focus, closed by Escape.",
  )

  // Audited in the *driven* state, not at mount. The a11y addon
  // runs axe once, when `run()` resolves — before anything has been
  // focused — so an open tip would never be seen by it.
  await expectNoAxeViolations(canvasElement)
})

/**
 * Focus, not just hover. `useFocus` is the line mux-magic is
 * missing, and without it the tip is pointer-only — a WCAG 2.1.1
 * failure on the one control whose explanation lives there.
 */
test("focus opens it and blur closes it", async () => {
  const { canvas } = await mountStory(Interactive)

  await userEvent.tab()

  await waitFor(() => {
    expectAgentDrivable(canvas, { role: "tooltip" })
  })

  await userEvent.tab()

  await waitFor(() => {
    expect(canvas.queryAllByRole("tooltip")).toHaveLength(0)
  })
})

test("Escape dismisses it", async () => {
  const { canvas } = await mountStory(Interactive)

  await userEvent.tab()

  await waitFor(() => {
    expectAgentDrivable(canvas, { role: "tooltip" })
  })

  // WCAG 1.4.13 requires content shown on hover or focus to be
  // dismissable without moving the pointer or the caret.
  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(canvas.queryAllByRole("tooltip")).toHaveLength(0)
  })
})

/**
 * A tooltip **adds**; it is never the name. An `IconButton` still
 * carries its own `aria-label`, and the tip is the sentence there
 * was no room for — so the button stays findable by the same query
 * whether or not the tip is open.
 */
test("the tip does not become the control's name", async () => {
  const { canvas } = await mountStory(AllVariants)

  const iconButton = expectAgentDrivable(canvas, {
    name: "Bay settings",
    role: "button",
  })

  await userEvent.hover(iconButton)

  await waitFor(() => {
    expectAgentDrivable(canvas, { role: "tooltip" })
  })

  // Still "Bay settings", not "Opens the bay's rip settings."
  expectAgentDrivable(canvas, {
    name: "Bay settings",
    role: "button",
  })
})
