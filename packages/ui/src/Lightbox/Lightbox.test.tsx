import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Lightbox.stories.tsx"

const { Controlled, Default, Interactive, WithCaption } =
  composeStories(stories)

/**
 * The close request, dispatched where the browser would raise it.
 * `userEvent`'s Escape is untrusted and a native `<dialog>` runs no
 * default action for it, so — exactly as `Modal`'s tests do — the
 * `cancel` event is dispatched directly, and only the half
 * downstream of it (this component's `onClose`, the effect, the
 * focus restore) is ours to assert.
 */
const requestClose = (dialog: HTMLElement) => {
  dialog.dispatchEvent(
    new Event("cancel", { cancelable: true }),
  )
}

test("the thumbnail opens the enlarged image", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Enlarge THE OUTFIT poster",
      role: "button",
    }),
  )

  const dialog = expectAgentDrivable(canvas, {
    name: "THE OUTFIT poster",
    role: "dialog",
  })

  await expect(dialog).toHaveAttribute("open")

  // The enlarged image carries the name — a bare `<img>` in a dialog
  // otherwise announces as nothing.
  expectAgentDrivable(canvas, {
    name: "THE OUTFIT poster",
    role: "img",
  })

  // The open dialog audits itself: the empty-alt thumbnail, the
  // named trigger and the named enlarged image are the arrangement
  // most likely to trip `button-name` or a duplicate name.
  await expectNoAxeViolations(canvasElement)
})

test("the caption rides along with the enlarged image", async () => {
  const { canvas } = await mountStory(WithCaption)

  await userEvent.click(
    canvas.getByRole("button", {
      name: "Enlarge THE OUTFIT poster",
    }),
  )

  await expect(
    canvas.getByText("2022 · Blu-ray · 1080p"),
  ).toBeInTheDocument()
})

/**
 * The keyboard contract, inherited from `Modal` and asserted here so
 * the skin cannot quietly drop it — Escape routes through `onClose`,
 * and focus returns to the trigger the platform restored it to.
 */
test("closing restores focus to the thumbnail trigger", async () => {
  const { canvas } = await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Enlarge THE OUTFIT poster",
    role: "button",
  })

  await userEvent.click(trigger)

  const dialog = expectAgentDrivable(canvas, {
    name: "THE OUTFIT poster",
    role: "dialog",
  })

  await expect(dialog).toContainElement(
    document.activeElement as HTMLElement,
  )

  requestClose(dialog)

  await waitFor(() => {
    expect(canvas.queryByRole("dialog")).toBeNull()
  })

  await expect(document.activeElement).toBe(trigger)
})

/**
 * Controlled: the caller's `useVisibility` is the one truth, and the
 * `Lightbox` renders no trigger of its own — a button elsewhere
 * opens it, and closing it flows back through `onOpenChange`.
 */
test("a controlled lightbox opens from an outside button", async () => {
  const { canvas } = await mountStory(Controlled)

  // No built-in trigger: the only "Enlarge …" button a `thumbnail`
  // would have added is absent.
  await expect(
    canvas.queryByRole("button", {
      name: /^Enlarge/,
    }),
  ).toBeNull()

  await userEvent.click(
    canvas.getByRole("button", { name: "View the poster" }),
  )

  const dialog = expectAgentDrivable(canvas, {
    name: "THE OUTFIT poster",
    role: "dialog",
  })

  requestClose(dialog)

  await waitFor(() => {
    expect(canvas.queryByRole("dialog")).toBeNull()
  })
})
