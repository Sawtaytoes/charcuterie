import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import * as stories from "./DropRail.stories.tsx"

const { AllStates, Default, InAList, ManyTargets } =
  composeStories(stories)

/**
 * The pointer half of this component cannot be driven convincingly
 * here, and `boardMove.ts` next door documents why: `userEvent` can
 * dispatch `pointermove`, but the hit test is
 * `document.elementFromPoint`, which needs a real layout at real
 * coordinates. So these tests prove the parts a browser test can
 * actually prove — the roles, the three chip states, the keyboard
 * path, and that a commit reports the destination out loud — and
 * the pointer path is left to the story a person drives.
 *
 * That split is deliberate rather than a gap being excused. The
 * keyboard path is the one WCAG 2.5.7 requires, so it is the one
 * that has to be red/green.
 */

test("the rail is a listbox of destinations", async () => {
  const { canvas } = await mountStory(Default)

  const rail = canvas.getByRole("listbox", {
    name: "Move to which project",
  })

  expect(rail).toBeInTheDocument()

  expect(
    canvas.getAllByRole("option").length,
  ).toBeGreaterThan(1)
})

test("a closed rail renders nothing at all", async () => {
  // `InAList` starts with no move in flight, which is the closed
  // case as a host actually produces it. A rail that left an empty
  // listbox behind would still be announced as one, and would still
  // be a Tab stop on a page where nothing is being moved.
  const { canvas } = await mountStory(InAList)

  expect(canvas.queryByRole("listbox")).toBeNull()

  expect(canvas.queryAllByRole("option")).toHaveLength(0)
})

test("the group a card is already in is shown but not offerable", async () => {
  const { canvas } = await mountStory(Default)

  const current = canvas.getByRole("option", {
    name: /Atlas Ingest/,
  })

  expect(current).toHaveAttribute("aria-disabled", "true")

  // Said out loud, not left to the dimmer colour. WCAG 1.4.1.
  expect(current).toHaveTextContent("where it is now")
})

test("an archived destination is refused", async () => {
  const { canvas } = await mountStory(Default)

  expect(
    canvas.getByRole("option", {
      name: /Signal Kitchen/,
    }),
  ).toHaveAttribute("aria-disabled", "true")
})

test("the arrow keys walk the rail and Enter commits", async () => {
  const { canvas } = await mountStory(InAList)

  await userEvent.click(
    canvas.getByRole("button", {
      name: /Move Re-point the garden wall/,
    }),
  )

  const rail = await waitFor(() =>
    canvas.getByRole("listbox", {
      name: "Move to which project",
    }),
  )

  expect(rail).toBeInTheDocument()

  // The first offerable chip takes focus when a pointer is not
  // driving, so the keyboard path starts somewhere real.
  await waitFor(() => {
    expect(
      canvas.getByRole("option", { name: /Loom Fleet/ }),
    ).toHaveAttribute("tabindex", "0")
  })

  await userEvent.keyboard("{ArrowRight}")

  await userEvent.keyboard("{Enter}")

  await waitFor(() => {
    expect(
      canvas.getByText(/Last move:/),
    ).toBeInTheDocument()
  })
})

test("Escape abandons the move and nothing is committed", async () => {
  const { canvas } = await mountStory(InAList)

  await userEvent.click(
    canvas.getByRole("button", {
      name: /Move Label the spare keys/,
    }),
  )

  await waitFor(() =>
    canvas.getByRole("listbox", {
      name: "Move to which project",
    }),
  )

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(
      canvas.queryByRole("listbox"),
    ).not.toBeInTheDocument()
  })

  expect(
    canvas.getByText("Nothing moved yet."),
  ).toBeInTheDocument()
})

test("every destination stays reachable at the size that made a menu wrong", async () => {
  const { canvas } = await mountStory(ManyTargets)

  // Fifteen here rather than the Backlog's thirty-four, but the
  // property under test is the one that matters: no destination is
  // behind a scroll, so every chip is in the accessibility tree at
  // once.
  expect(canvas.getAllByRole("option")).toHaveLength(15)
})

test("no axe violations in any state", async () => {
  const { canvasElement } = await mountStory(AllStates)

  await expectNoAxeViolations(canvasElement)
})
