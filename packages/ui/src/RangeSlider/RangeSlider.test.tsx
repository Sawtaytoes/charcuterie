import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./RangeSlider.stories.tsx"

const { AllStates, BesideTheSlider, Default, Interactive } =
  composeStories(stories)

/** A fraction along the bar, as viewport coordinates. */
const pointerAt =
  (group: HTMLElement) =>
  (fraction: number): { x: number; y: number } => {
    const bar = group.getBoundingClientRect()

    return {
      x: bar.x + bar.width * fraction,
      y: bar.y + bar.height / 2,
    }
  }

/** Everything about a thumb that `../sliderStyles.ts` claims to own. */
const readThumbStyles = (thumb: Element) => {
  const style = getComputedStyle(thumb)

  return {
    backgroundColor: style.backgroundColor,
    borderColor: style.borderTopColor,
    borderRadius: style.borderTopLeftRadius,
    borderWidth: style.borderTopWidth,
    boxShadow: style.boxShadow,
    height: style.height,
    width: style.width,
  }
}

test("it is two named sliders inside one named group", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const start = expectAgentDrivable(canvas, {
    name: "Clip start",
    role: "slider",
  })

  const end = expectAgentDrivable(canvas, {
    name: "Clip end",
    role: "slider",
  })

  // The group is what carries the label the two handles are each an
  // end of. Without it a screen reader announces "Clip start" with
  // nothing saying the two belong together.
  expectAgentDrivable(canvas, {
    name: "Clip",
    role: "group",
  })

  await expect(start).toHaveAttribute(
    "aria-valuenow",
    "600",
  )

  await expect(end).toHaveAttribute("aria-valuenow", "1500")

  // Each thumb reports the OTHER as its own bound, which is the
  // clamping rule said in the only vocabulary a slider has.
  await expect(start).toHaveAttribute("aria-valuemin", "0")

  await expect(start).toHaveAttribute(
    "aria-valuemax",
    "1500",
  )

  await expect(end).toHaveAttribute("aria-valuemin", "600")

  await expect(end).toHaveAttribute("aria-valuemax", "2700")

  await expectNoAxeViolations(canvasElement)
})

test("each thumb takes the arrow keys on its own", async () => {
  const { canvas } = await mountStory(Interactive)

  const start = expectAgentDrivable(canvas, {
    name: "Clip start",
    role: "slider",
  })

  const end = expectAgentDrivable(canvas, {
    name: "Clip end",
    role: "slider",
  })

  start.focus()

  await userEvent.keyboard("{ArrowRight}")

  await waitFor(() => {
    expect(start).toHaveAttribute("aria-valuenow", "630")
  })

  // The other end did not move. That is the whole difference between
  // two sliders and one widget with a second handle painted on.
  await expect(end).toHaveAttribute("aria-valuenow", "1500")

  end.focus()

  await userEvent.keyboard("{ArrowUp}{ArrowUp}")

  await waitFor(() => {
    expect(end).toHaveAttribute("aria-valuenow", "1560")
  })

  await expect(start).toHaveAttribute(
    "aria-valuenow",
    "630",
  )

  // Ten steps of 30, from the default `largeStep` of a tenth of the
  // range: a caller should not have to know its own range to get a
  // sensible page key.
  await userEvent.keyboard("{PageUp}")

  await waitFor(() => {
    expect(end).toHaveAttribute("aria-valuenow", "1830")
  })
})

/**
 * The crossing rule, driven rather than argued: the start thumb walks
 * up into the end thumb, stops **on** it, and is still the start
 * thumb. A widget that swapped them would report the movement on the
 * element that no longer has focus.
 */
test("a thumb stops on its partner instead of crossing it", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  const start = expectAgentDrivable(canvas, {
    name: "Clip start",
    role: "slider",
  })

  const end = expectAgentDrivable(canvas, {
    name: "Clip end",
    role: "slider",
  })

  start.focus()

  // End means "as far as THIS thumb may go", which is its partner.
  await userEvent.keyboard("{End}")

  await waitFor(() => {
    expect(start).toHaveAttribute("aria-valuenow", "1500")
  })

  await expect(end).toHaveAttribute("aria-valuenow", "1500")

  // Two more presses past the partner. A start thumb that reached
  // 1560 would paint a span of negative width, which is invisible
  // rather than wrong-looking.
  await userEvent.keyboard("{ArrowRight}{ArrowRight}")

  await expect(start).toHaveAttribute(
    "aria-valuenow",
    "1500",
  )

  // The collapsed pair still says where each handle may go.
  await expect(start).toHaveAttribute(
    "aria-valuemax",
    "1500",
  )

  await expect(end).toHaveAttribute("aria-valuemin", "1500")

  // Focus never moved to the other handle, so the arrow key and the
  // value that changed still belong to the same element.
  await expect(document.activeElement).toBe(start)

  // Collapsed is a state a user can reach, so it is a state that has
  // to audit clean.
  await expectNoAxeViolations(canvasElement)

  await userEvent.keyboard("{ArrowLeft}")

  await waitFor(() => {
    expect(start).toHaveAttribute("aria-valuenow", "1470")
  })
})

/**
 * A press anywhere on the bar picks up the **nearer** thumb and moves
 * it there. The bar is the pointer target, exactly as it is on
 * `Slider` — a two-thumb range whose only pointer targets were its
 * 16px handles would be a control nobody can aim at.
 *
 * Driven as a real pointer rather than as dispatched `PointerEvent`s,
 * for `ReorderList`'s reason: `setPointerCapture` rejects an id that
 * matches no active pointer, so a synthetic sequence dies inside the
 * handler before a listener is ever registered. The whole gesture goes
 * in ONE `userEvent.pointer` call, because the pressed state lives in
 * that call rather than in the default instance.
 */
test("a press on the bar moves the nearer thumb", async () => {
  const { canvas } = await mountStory(Interactive)

  const group = expectAgentDrivable(canvas, {
    name: "Clip",
    role: "group",
  })

  const start = expectAgentDrivable(canvas, {
    name: "Clip start",
    role: "slider",
  })

  const end = expectAgentDrivable(canvas, {
    name: "Clip end",
    role: "slider",
  })

  const at = pointerAt(group)

  await userEvent.pointer([
    {
      coords: at(0.9),
      keys: "[MouseLeft>]",
      target: group,
    },
    { keys: "[/MouseLeft]" },
  ])

  // 90% of a 0–2700 range, on a step of 30.
  await waitFor(() => {
    expect(end).toHaveAttribute("aria-valuenow", "2430")
  })

  await expect(start).toHaveAttribute(
    "aria-valuenow",
    "600",
  )

  // Focus follows the grab, so a pointer user reaching for the arrow
  // keys moves the handle they were just dragging.
  await expect(document.activeElement).toBe(end)
})

/**
 * The pointer half of the crossing rule, and the reason the dragged
 * thumb is remembered rather than recomputed: halfway through this
 * gesture the *nearer* thumb becomes the other one, and the handle
 * under the pointer must not change.
 */
test("a drag keeps the thumb it picked up, and stops it on its partner", async () => {
  const { canvas } = await mountStory(Interactive)

  const group = expectAgentDrivable(canvas, {
    name: "Clip",
    role: "group",
  })

  const start = expectAgentDrivable(canvas, {
    name: "Clip start",
    role: "slider",
  })

  const end = expectAgentDrivable(canvas, {
    name: "Clip end",
    role: "slider",
  })

  const at = pointerAt(group)

  await userEvent.pointer([
    {
      coords: at(0.9),
      keys: "[MouseLeft>]",
      target: group,
    },
    { coords: at(0.5) },
    { coords: at(0.05) },
    { keys: "[/MouseLeft]" },
  ])

  // Dragged well below the start thumb, and stopped on it.
  await waitFor(() => {
    expect(end).toHaveAttribute("aria-valuenow", "600")
  })

  await expect(start).toHaveAttribute(
    "aria-valuenow",
    "600",
  )
})

test("a disabled range is out of the tab order and does not move", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const start = expectAgentDrivable(canvas, {
    name: "Disabled start",
    role: "slider",
  })

  await expect(start).toHaveAttribute(
    "aria-disabled",
    "true",
  )

  await expect(start).toHaveAttribute("tabindex", "-1")

  // The row, not the thumb, carries `pointer-events: none` — the
  // whole control is inert, including the bar a press would land on.
  const group = canvas.getByRole("group", {
    name: "Disabled",
  })

  await expect(getComputedStyle(group).pointerEvents).toBe(
    "none",
  )

  start.focus()

  await userEvent.keyboard("{ArrowRight}")

  await expect(start).toHaveAttribute("aria-valuenow", "30")

  await expectNoAxeViolations(canvasElement)
})

/**
 * Read-only is the state that is easy to collapse into `disabled`,
 * and they are different answers: this one is still focusable and
 * still full contrast, because both ends of the span are worth
 * reading even though neither can be changed.
 */
test("a read-only range is announced, focusable, and does not move", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const end = expectAgentDrivable(canvas, {
    name: "Read-only end",
    role: "slider",
  })

  await expect(end).toHaveAttribute("aria-readonly", "true")

  await expect(end).toHaveAttribute("tabindex", "0")

  await expect(end).not.toHaveAttribute("aria-disabled")

  end.focus()

  await userEvent.keyboard("{ArrowLeft}")

  await expect(end).toHaveAttribute("aria-valuenow", "70")

  await expectNoAxeViolations(canvasElement)
})

/**
 * `valueFormat` is the whole reason a media timeline can live in an
 * app that never taught the library what a timecode is. Without it a
 * clip announces "600", which is a number of seconds nobody has.
 */
test("valueFormat writes aria-valuetext and the shown span", async () => {
  const { canvas } = await mountStory(AllStates)

  const start = expectAgentDrivable(canvas, {
    name: "Section start",
    role: "slider",
  })

  await expect(start).toHaveAttribute(
    "aria-valuetext",
    "10:00",
  )

  // The raw number is still there for anything that computes with it.
  await expect(start).toHaveAttribute(
    "aria-valuenow",
    "600",
  )

  // "to", not an en dash: a default is words. Two cells in the story
  // show this span, so the query is the plural one.
  await expect(
    canvas.getAllByText("10:00 to 25:00")[0],
  ).toBeVisible()
})

/**
 * Tick marks are a picture of the app's own chapter list. Each thumb
 * already announces its own position, so a screen reader reading the
 * marks would be reading the decoration twice.
 */
test("tick labels are drawn and not announced", async () => {
  const { canvas } = await mountStory(AllStates)

  const chapter = canvas.getByText("Act one")

  await expect(chapter).toBeVisible()

  await expect(
    chapter.closest("[aria-hidden='true']"),
  ).not.toBeNull()
})

/**
 * The shared bar, asserted rather than trusted.
 *
 * `Slider` and `RangeSlider` are separate components and paint one
 * control, through `../sliderStyles.ts`. "They look the same" written
 * as two class strings is a promise that survives exactly one edit, so
 * this compares **computed** styles — the version of the claim a
 * class-name refactor cannot quietly break.
 */
test("a range thumb is a slider thumb", async () => {
  const { canvas } = await mountStory(BesideTheSlider)

  const slider = expectAgentDrivable(canvas, {
    name: "Position",
    role: "slider",
  })

  // `Slider`'s thumb is decoration hanging off the track, because
  // there the TRACK is the widget. It is the one element in this
  // package that has to be reached structurally: giving it a role or
  // a name would be the bug the component exists to avoid.
  const sliderThumb = slider.querySelector(
    ':scope > span[aria-hidden="true"]',
  )

  if (!sliderThumb) {
    throw new Error("the slider drew no thumb")
  }

  const rangeThumb = expectAgentDrivable(canvas, {
    name: "Section start",
    role: "slider",
  })

  expect(readThumbStyles(rangeThumb)).toEqual(
    readThumbStyles(sliderThumb),
  )
})
