import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test, expect as vitestExpect } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Toast.stories.tsx"

const { ManyAtOnce, OverStackedModals } =
  composeStories(stories)

const layerOf = (element: Element): number =>
  Number.parseInt(
    globalThis.getComputedStyle(element).zIndex,
    10,
  )

/**
 * The region used to paint at a hand-picked `z-50`, which is below
 * every overlay token in the scale — so an Undo raised from inside a
 * modal was drawn *behind* the modal and could not be pressed at
 * all. These are the three things "the toast is on top" has to mean,
 * and each one was false.
 */
test("the toast paints above a cascade of modals", async () => {
  const { body, canvasElement } = await mountStory(
    OverStackedModals,
  )

  const [outer, inner] = [
    ...document.querySelectorAll('[role="dialog"]'),
  ].map((panel) => {
    const container = panel.closest("[style*='z-index']")

    if (!container) {
      throw new Error("a panel rendered with no container")
    }

    return container
  })

  if (!outer || !inner) {
    throw new Error("both modals should be open")
  }

  // Cascading, not one shared `--layer-modal`. Which of the two
  // painted on top used to fall out of portal append order.
  vitestExpect(layerOf(inner)).toBeGreaterThan(
    layerOf(outer),
  )

  const region = expectAgentDrivable(body, {
    name: "Notifications",
    role: "status",
  })

  // Above the whole stack, not only its first floor.
  vitestExpect(layerOf(region)).toBeGreaterThan(
    layerOf(inner),
  )

  // And painted there, which the z-index alone does not prove: a
  // region nested inside a panel's stacking context would report the
  // same number and still be covered.
  const undo = expectAgentDrivable(body, {
    name: "Undo",
    role: "button",
  })

  const box = undo.getBoundingClientRect()

  const painted = document.elementFromPoint(
    box.left + box.width / 2,
    box.top + box.height / 2,
  )

  vitestExpect(undo.contains(painted)).toBe(true)

  await expect(canvasElement).toBeTruthy()
})

test("pressing Undo does not dismiss the modal under it", async () => {
  const { body } = await mountStory(OverStackedModals)

  await userEvent.click(
    expectAgentDrivable(body, {
      name: "Undo",
      role: "button",
    }),
  )

  // The action ran...
  await waitFor(() => {
    vitestExpect(body.getByText("Undone")).toBeTruthy()
  })

  // ...and `useDismiss` did not read the press as an outside press.
  // Closing a modal on the way to taking an action back is the
  // opposite of what the button says.
  vitestExpect(
    document.querySelectorAll('[role="dialog"]'),
  ).toHaveLength(2)
})

test("the toast stays in the accessibility tree behind a focus trap", async () => {
  const { body } = await mountStory(OverStackedModals)

  const region = expectAgentDrivable(body, {
    name: "Notifications",
    role: "status",
  })

  // `FloatingFocusManager`'s `modal` marks the body-level siblings
  // of its portal `aria-hidden` — but `markOthers` concatenates
  // `[aria-live],[role="status"],output` onto its keep-list, so a
  // live region survives where it stands. That is load-bearing: it
  // is why this region does not have to move inside the panel, and
  // why it keeps `role="status"` rather than a bare `div`.
  vitestExpect(region.closest("[aria-hidden='true']")).toBe(
    null,
  )
  vitestExpect(region.closest("[inert]")).toBe(null)
})

test("a tall stack of toasts scrolls instead of climbing off the page", async () => {
  const { body } = await mountStory(ManyAtOnce)

  const region = expectAgentDrivable(body, {
    name: "Notifications",
    role: "status",
  })

  const list = region.querySelector("ul")

  if (!list) {
    throw new Error("the region should render a list")
  }

  // Bounded, so the column cannot grow past the viewport.
  vitestExpect(list.scrollHeight).toBeGreaterThan(
    list.clientHeight,
  )
  vitestExpect(
    list.getBoundingClientRect().top,
  ).toBeGreaterThanOrEqual(0)

  // Taken to the far end on arrival: the newest toast is the one
  // carrying the action, and it is the one at the bottom.
  const newest = body.getByText("Rip 12 finished")

  vitestExpect(
    newest.getBoundingClientRect().bottom,
  ).toBeLessThanOrEqual(
    list.getBoundingClientRect().bottom + 1,
  )

  // And the oldest is reachable rather than clipped away. This is
  // the assertion `justify-content: flex-end` fails: chromium does
  // not make a flex container's start-edge overflow scrollable, so
  // the toasts above the fold could not be reached at all.
  list.scrollTop = 0

  await waitFor(() => {
    const oldest = body.getByText("Rip 1 finished")

    vitestExpect(
      oldest.getBoundingClientRect().top,
    ).toBeGreaterThanOrEqual(
      list.getBoundingClientRect().top - 1,
    )
  })
})
