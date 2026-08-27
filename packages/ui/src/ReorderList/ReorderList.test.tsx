import { composeStories } from "@storybook/react"
import {
  expect,
  userEvent,
  type within,
} from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import * as stories from "./ReorderList.stories.tsx"

const { Default, SingleItem } = composeStories(stories)

/**
 * The rows come back in the DOM order the list draws them, which is
 * the order under test. Reading the labels rather than the positions
 * is deliberate: the printed number is derived from the index, so
 * asserting on it would pass even if the rows had not moved.
 */
const getRowLabels = (canvas: ReturnType<typeof within>) =>
  canvas
    .getAllByRole("listitem")
    .map((row: HTMLElement) => row.textContent ?? "")
    .filter((text: string) => text !== "")

test("moves a row later with the button, and says where it went", async () => {
  const { canvas } = await mountStory(Default)

  await userEvent.click(
    canvas.getByRole("button", {
      name: "Move Measure the alcove later",
    }),
  )

  expect(getRowLabels(canvas)[0]).toContain(
    "Cut the shelf to width",
  )

  expect(getRowLabels(canvas)[1]).toContain(
    "Measure the alcove",
  )

  /*
   * The POSITION, not just the fact of a move. "Moved" leaves a
   * screen-reader user unable to tell the top of a list from the
   * bottom of thirty.
   */
  expect(
    canvas.getByRole("status", {
      name: "Shelf build activity",
    }),
  ).toHaveTextContent(
    "Moved Measure the alcove to position 2 of 5.",
  )
})

test("moves a row earlier, and the ends stay disabled", async () => {
  const { canvas } = await mountStory(Default)

  expect(
    canvas.getByRole("button", {
      name: "Move Measure the alcove earlier",
    }),
  ).toBeDisabled()

  expect(
    canvas.getByRole("button", {
      name: "Move Check it is level later",
    }),
  ).toBeDisabled()

  await userEvent.click(
    canvas.getByRole("button", {
      name: "Move Sand the cut edge earlier",
    }),
  )

  expect(getRowLabels(canvas)[1]).toContain(
    "Sand the cut edge",
  )
})

/**
 * The handle is a pointer enhancement, so it must never be the only
 * way to move a row — and on a list that cannot be reordered it must
 * not advertise a gesture that does nothing.
 */
test("a one-row list offers no drag handle", async () => {
  const { canvas } = await mountStory(SingleItem)

  expect(canvas.queryByTitle("Drag to reorder")).toBeNull()
})

test("the handle takes the gesture away from the browser's scroll", async () => {
  const { canvas } = await mountStory(Default)

  const grip = canvas.getAllByTitle("Drag to reorder")[0]

  /*
   * `touch-action: none` is the whole difference between a drag
   * that works on a desktop and one that also works on the tablet
   * this component was built for. Without it the browser claims
   * the gesture for a scroll and the pointermove stream stops one
   * frame in.
   */
  expect(grip).toHaveStyle({ touchAction: "none" })
})

/**
 * The gesture itself, driven as a real pointer rather than as
 * dispatched `PointerEvent`s.
 *
 * A hand-built event is not enough here, and the difference is not
 * pedantry: `setPointerCapture` rejects an id that matches no
 * ACTIVE pointer, so a synthetic sequence dies inside the handler
 * before a single listener is registered — and the test then
 * passes or fails for a reason the component does not have.
 */
test("drags a row past the one below it", async () => {
  const { canvas } = await mountStory(Default)

  const grip = canvas.getAllByTitle("Drag to reorder")[0]

  const secondRow = canvas.getAllByRole("listitem")[1]

  if (!grip || !secondRow) {
    throw new Error("The story drew no rows to drag.")
  }

  const to = secondRow.getBoundingClientRect()

  await userEvent.pointer([
    { keys: "[MouseLeft>]", target: grip },
    {
      coords: {
        x: to.x + to.width / 2,
        y: to.y + to.height - 2,
      },
    },
    { keys: "[/MouseLeft]" },
  ])

  expect(getRowLabels(canvas)[0]).toContain(
    "Cut the shelf to width",
  )

  expect(getRowLabels(canvas)[1]).toContain(
    "Measure the alcove",
  )
})

/**
 * A press that goes nowhere must move nothing.
 *
 * The movement threshold is the reason the position can be both a
 * printed number and a handle: without it, a handle is a control
 * you cannot press by accident and then change your mind about,
 * and every stray tap on a row reorders the list.
 */
test("a press with no movement reorders nothing", async () => {
  const { canvas } = await mountStory(Default)

  const grip = canvas.getAllByTitle("Drag to reorder")[0]

  if (!grip) {
    throw new Error("The story drew no rows to drag.")
  }

  await userEvent.pointer([
    { keys: "[MouseLeft>]", target: grip },
    { keys: "[/MouseLeft]", target: grip },
  ])

  expect(getRowLabels(canvas)[0]).toContain(
    "Measure the alcove",
  )

  expect(
    canvas.getByRole("status", {
      name: "Shelf build activity",
    }),
  ).toHaveTextContent("")
})

test("has no axe violations", async () => {
  const { canvasElement } = await mountStory(Default)

  await expectNoAxeViolations(canvasElement)
})
