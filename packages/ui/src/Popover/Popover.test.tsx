import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Popover.stories.tsx"

const {
  AllStates,
  AllVariants,
  Default,
  Interactive,
  Responsive,
} = composeStories(stories)

test("the trigger and the panel agree about each other", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const trigger = expectAgentDrivable(canvas, {
    name: "Filters",
    role: "button",
  })

  await expect(trigger).toHaveAttribute(
    "aria-expanded",
    "false",
  )

  await userEvent.click(trigger)

  // Found through `canvas`, not `screen` — the panel is in the top
  // layer and still in this story's DOM, which a portal would have
  // cost.
  const panel = expectAgentDrivable(canvas, {
    name: "Filters",
    role: "dialog",
  })

  // `aria-controls` really points at the panel. An id that has
  // drifted renders identically and announces nothing, which is why
  // `useRole` owns both ends of it.
  await expect(trigger).toHaveAttribute(
    "aria-controls",
    panel.id,
  )

  // `manual`, not `auto`: the UA's light-dismiss closes the element
  // by itself and leaves `isVisible` true.
  await expect(panel).toHaveAttribute("popover", "manual")

  await expectNoAxeViolations(canvasElement)
})

test("the panel is positioned rather than centred by the UA", async () => {
  const { canvas } = await mountStory(AllVariants)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open top",
      role: "button",
    }),
  )

  const panel = expectAgentDrivable(canvas, {
    name: "Filters — top",
    role: "dialog",
  })

  // The thing that silently fails if the UA's `inset: 0; margin:
  // auto` is left in place: the panel would sit dead centre of the
  // viewport looking deliberate.
  const { left, top } = panel.getBoundingClientRect()

  await expect(left).toBeGreaterThan(0)

  await expect(top).toBeGreaterThan(0)
})

test("a panel with nothing tabbable inside is still reachable", async () => {
  const { canvas } = await mountStory(AllStates)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Text only",
      role: "button",
    }),
  )

  const panel = expectAgentDrivable(canvas, {
    name: "Read error detail",
    role: "dialog",
  })

  // Otherwise a keyboard user is told a dialog opened and then
  // cannot get to it. `FloatingFocusManager` puts the panel itself
  // in the tab order — `tabindex="0"`, not `-1`, so Tab reaches it
  // and not only the programmatic focus does.
  await expect(panel).toHaveAttribute("tabindex", "0")

  await waitFor(() => {
    expect(panel.contains(document.activeElement)).toBe(
      true,
    )
  })
})

test("flip and shift keep the panel inside the viewport", async () => {
  const { canvas } = await mountStory(Responsive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Top edge, asks for top",
      role: "button",
    }),
  )

  const panel = expectAgentDrivable(canvas, {
    name: "Filters — top start",
    role: "dialog",
  })

  // Inside the viewport is the only thing `flip` and `shift`
  // actually promise — asserting a specific side would be asserting
  // the collision *did not* happen.
  const rect = panel.getBoundingClientRect()

  await expect(rect.top).toBeGreaterThanOrEqual(0)

  await expect(rect.bottom).toBeLessThanOrEqual(
    globalThis.innerHeight,
  )

  await expect(rect.left).toBeGreaterThanOrEqual(0)

  await expect(rect.right).toBeLessThanOrEqual(
    globalThis.innerWidth,
  )
})

/**
 * The dismiss layer, driven. Outside press and Escape both route
 * through `useDismiss` → `onDismiss` → `hide()`, so the panel is
 * never closed by anything except the state saying so.
 *
 * Escape *is* pressable here, unlike `Modal`'s: `useDismiss` listens
 * for a keydown rather than relying on a UA default action, and a
 * synthetic keydown is a real keydown as far as a listener is
 * concerned.
 */
test("Escape and an outside press both dismiss through the state", async () => {
  const { canvas } = await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Filters",
    role: "button",
  })

  await userEvent.click(trigger)

  expectAgentDrivable(canvas, {
    name: "Bay 3 filters",
    role: "dialog",
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(canvas.queryByRole("dialog")).toBeNull()
  })

  await expect(trigger).toHaveAttribute(
    "aria-expanded",
    "false",
  )

  // Reopened, then dismissed by pressing the page behind it.
  await userEvent.click(trigger)

  await waitFor(() => {
    expect(canvas.getByRole("dialog")).toBeInTheDocument()
  })

  await userEvent.click(document.body)

  await waitFor(() => {
    expect(canvas.queryByRole("dialog")).toBeNull()
  })
})
