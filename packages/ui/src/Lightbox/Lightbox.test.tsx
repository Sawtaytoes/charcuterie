import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Lightbox.stories.tsx"

const { Controlled, Default, Interactive, WithCaption } =
  composeStories(stories)

test("the thumbnail opens the enlarged image", async () => {
  const { body, canvas } = await mountStory(Default)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Enlarge THE OUTFIT poster",
      role: "button",
    }),
  )

  const dialog = expectAgentDrivable(body, {
    name: "THE OUTFIT poster",
    role: "dialog",
  })

  // The enlarged image carries the name — a bare `<img>` in a dialog
  // otherwise announces as nothing.
  expectAgentDrivable(body, {
    name: "THE OUTFIT poster",
    role: "img",
  })

  // The open dialog audits itself: the empty-alt thumbnail, the
  // named trigger and the named enlarged image are the arrangement
  // most likely to trip `button-name` or a duplicate name.
  await expectNoAxeViolations(dialog)
})

test("the caption rides along with the enlarged image", async () => {
  const { body, canvas } = await mountStory(WithCaption)

  await userEvent.click(
    canvas.getByRole("button", {
      name: "Enlarge THE OUTFIT poster",
    }),
  )

  await expect(
    body.getByText("2022 · Blu-ray · 1080p"),
  ).toBeInTheDocument()
})

/**
 * The keyboard contract, inherited from `Dialog` and asserted here so
 * the skin cannot quietly drop it — Escape routes through `onClose`,
 * and focus returns to the trigger `FloatingFocusManager` restored it
 * to. Escape is a real `userEvent` keypress now, since the overlay is
 * no longer a native `<dialog>`.
 */
test("closing restores focus to the thumbnail trigger", async () => {
  const { body, canvas } = await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Enlarge THE OUTFIT poster",
    role: "button",
  })

  await userEvent.click(trigger)

  const dialog = expectAgentDrivable(body, {
    name: "THE OUTFIT poster",
    role: "dialog",
  })

  await waitFor(() => {
    expect(dialog.contains(document.activeElement)).toBe(
      true,
    )
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  await expect(document.activeElement).toBe(trigger)
})

/**
 * Controlled: the caller's `useVisibility` is the one truth, and the
 * `Lightbox` renders no trigger of its own — a button elsewhere
 * opens it, and closing it flows back through `onOpenChange`.
 */
test("a controlled lightbox opens from an outside button", async () => {
  const { body, canvas } = await mountStory(Controlled)

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

  const dialog = expectAgentDrivable(body, {
    name: "THE OUTFIT poster",
    role: "dialog",
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  await expect(dialog).not.toBeInTheDocument()
})
