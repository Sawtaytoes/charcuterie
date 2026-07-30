import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./ProgressBar.stories.tsx"

const { Default, Indeterminate, Interactive } =
  composeStories(stories)

test("the name is real and the value sits on the track", async () => {
  const { canvas } = await mountStory(Default)

  const bar = expectAgentDrivable(canvas, {
    name: "Ripping title 4 of 9",
    role: "progressbar",
  })

  // The label is not printed, so the name has to come from a real
  // `aria-labelledby`. The value is on the *track* so an agent's
  // bounding box is the widget, not the filled 38%.
  await expect(bar).toHaveAttribute("aria-valuenow", "38")
  await expect(bar).toHaveAttribute("aria-valuemax", "100")
})

test("indeterminate means no value at all, not zero", async () => {
  const { canvas } = await mountStory(Indeterminate)

  const bar = expectAgentDrivable(canvas, {
    name: "Working — no measurable progress yet",
    role: "progressbar",
  })

  // rip-deck's AACS/BD+ preamble is ~25 s of a real Blu-ray emitting
  // nothing: a full bar reads as a finished rip, an empty one as a
  // wedged drive. Absent is the only honest answer.
  await expect(bar).not.toHaveAttribute("aria-valuenow")
  await expect(bar).toHaveAttribute("aria-busy", "true")
})

/**
 * A progressbar is not focusable and has no keyboard path — the
 * contract it owes an agent is that `aria-valuenow` tracks what is
 * drawn.
 */
test("aria-valuenow tracks the fill to completion", async () => {
  const { canvas } = await mountStory(Interactive)

  const bar = canvas.getByRole("progressbar")

  await expect(bar).toHaveAttribute("aria-valuenow", "0")

  const advance = canvas.getByRole("button", {
    name: "Advance 25%",
  })

  await userEvent.click(advance)
  await userEvent.click(advance)

  await expect(bar).toHaveAttribute("aria-valuenow", "50")
  await expect(canvas.getByText("50%")).toBeVisible()

  await userEvent.click(advance)
  await userEvent.click(advance)

  await expect(bar).toHaveAttribute("aria-valuenow", "100")

  // The 100% threshold turns the fill green, which is the
  // generalisation of rip-deck's `FILL_CLASS` keyed by rip state.
  await expect(
    bar.querySelector(".bg-intent-success-solid"),
  ).toBeInTheDocument()
})
