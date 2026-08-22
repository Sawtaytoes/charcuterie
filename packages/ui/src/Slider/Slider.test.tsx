import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Slider.stories.tsx"

const { AllStates, Default, Interactive } =
  composeStories(stories)

test("it is a slider a screen reader can name and read", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const slider = expectAgentDrivable(canvas, {
    name: "Volume",
    role: "slider",
  })

  await expect(slider).toHaveAttribute(
    "aria-valuenow",
    "40",
  )

  await expect(slider).toHaveAttribute("aria-valuemin", "0")

  await expect(slider).toHaveAttribute(
    "aria-valuemax",
    "100",
  )

  await expectNoAxeViolations(canvasElement)
})

test("the arrow keys move it one step and Home/End reach both ends", async () => {
  const { canvas } = await mountStory(Interactive)

  const slider = expectAgentDrivable(canvas, {
    name: "Volume",
    role: "slider",
  })

  await userEvent.click(slider)

  // The click landed somewhere on the track, so drive from a known
  // point rather than from wherever the pointer put it.
  await userEvent.keyboard("{Home}")

  await waitFor(() => {
    expect(slider).toHaveAttribute("aria-valuenow", "0")
  })

  await userEvent.keyboard("{ArrowRight}")

  await waitFor(() => {
    expect(slider).toHaveAttribute("aria-valuenow", "1")
  })

  await userEvent.keyboard("{ArrowUp}")

  await waitFor(() => {
    expect(slider).toHaveAttribute("aria-valuenow", "2")
  })

  await userEvent.keyboard("{ArrowLeft}")

  await waitFor(() => {
    expect(slider).toHaveAttribute("aria-valuenow", "1")
  })

  await userEvent.keyboard("{End}")

  await waitFor(() => {
    expect(slider).toHaveAttribute("aria-valuenow", "100")
  })
})

/**
 * The default `largeStep` is a tenth of the range, so PageDown from the
 * top of a 0–100 slider lands on 90. The point of asserting the default
 * rather than a passed-in one is that a caller should not have to know
 * its own range to get a sensible page key.
 */
test("the page keys move it ten steps by default", async () => {
  const { canvas } = await mountStory(Interactive)

  const slider = expectAgentDrivable(canvas, {
    name: "Volume",
    role: "slider",
  })

  await userEvent.click(slider)

  await userEvent.keyboard("{End}")

  await userEvent.keyboard("{PageDown}")

  await waitFor(() => {
    expect(slider).toHaveAttribute("aria-valuenow", "90")
  })

  await userEvent.keyboard("{PageUp}")

  await waitFor(() => {
    expect(slider).toHaveAttribute("aria-valuenow", "100")
  })
})

test("it never leaves its own range", async () => {
  const { canvas } = await mountStory(Interactive)

  const slider = expectAgentDrivable(canvas, {
    name: "Volume",
    role: "slider",
  })

  await userEvent.click(slider)

  await userEvent.keyboard("{Home}")

  // Three presses past the floor. A slider that goes to -3 renders a
  // thumb off the start of its track and reports a value AT cannot
  // place on the range it just announced.
  await userEvent.keyboard(
    "{ArrowLeft}{ArrowLeft}{ArrowLeft}",
  )

  await expect(slider).toHaveAttribute("aria-valuenow", "0")

  await userEvent.keyboard("{End}")

  await userEvent.keyboard(
    "{ArrowRight}{ArrowRight}{ArrowRight}",
  )

  await expect(slider).toHaveAttribute(
    "aria-valuenow",
    "100",
  )
})

test("a disabled slider is out of the tab order and does not move", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const disabled = expectAgentDrivable(canvas, {
    name: "Disabled",
    role: "slider",
  })

  await expect(disabled).toHaveAttribute(
    "aria-disabled",
    "true",
  )

  await expect(disabled).toHaveAttribute("tabindex", "-1")

  // Not `userEvent.click` — it refuses, because the disabled class sets
  // `pointer-events: none` and the helper asserts that before acting.
  // Its refusal IS the pointer half of this test, so the keyboard half
  // focuses directly rather than working around the guarantee.
  await expect(
    getComputedStyle(disabled).pointerEvents,
  ).toBe("none")

  disabled.focus()

  await userEvent.keyboard("{ArrowRight}")

  await expect(disabled).toHaveAttribute(
    "aria-valuenow",
    "35",
  )

  await expectNoAxeViolations(canvasElement)
})

/**
 * Read-only is the state that is easy to collapse into `disabled`, and
 * they are different answers: this one is still focusable and still
 * full contrast, because its value is worth reading even though it
 * cannot be changed.
 */
test("a read-only slider is announced, focusable, and does not move", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const readOnly = expectAgentDrivable(canvas, {
    name: "Read-only",
    role: "slider",
  })

  await expect(readOnly).toHaveAttribute(
    "aria-readonly",
    "true",
  )

  await expect(readOnly).toHaveAttribute("tabindex", "0")

  await expect(readOnly).not.toHaveAttribute(
    "aria-disabled",
  )

  await userEvent.click(readOnly)

  await userEvent.keyboard("{ArrowRight}")

  await expect(readOnly).toHaveAttribute(
    "aria-valuenow",
    "35",
  )

  await expectNoAxeViolations(canvasElement)
})

/**
 * `aria-valuetext` is the whole reason `valueFormat` exists. Without it
 * a scrubber announces "1274" — a number of seconds nobody has — and
 * `aria-valuenow` alone is what AT would read.
 */
test("valueFormat writes aria-valuetext and the shown value", async () => {
  const { canvas } = await mountStory(AllStates)

  const position = expectAgentDrivable(canvas, {
    name: "Position",
    role: "slider",
  })

  await expect(position).toHaveAttribute(
    "aria-valuetext",
    "21:14",
  )

  // The raw number is still there for anything that computes with it.
  await expect(position).toHaveAttribute(
    "aria-valuenow",
    "1274",
  )
})
