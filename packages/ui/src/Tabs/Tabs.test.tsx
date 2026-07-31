import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Tabs.stories.tsx"

const {
  AllStates,
  AllVariants,
  Default,
  Manual,
  Responsive,
} = composeStories(stories)

test("selecting a tab wires the panel back to it", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const tablist = expectAgentDrivable(canvas, {
    name: "Bay 3",
    role: "tablist",
  })

  await expect(tablist).toHaveAttribute(
    "aria-orientation",
    "horizontal",
  )

  const log = expectAgentDrivable(canvas, {
    name: "Log",
    role: "tab",
  })

  await userEvent.click(log)

  await waitFor(() => {
    expect(log).toHaveAttribute("aria-selected", "true")
  })

  // `aria-controls` really reaches the panel, and the panel names
  // itself back through `aria-labelledby`. Both ids come from one
  // `useUniqueId`, which is why they cannot drift.
  const panel = expectAgentDrivable(canvas, {
    name: "Log",
    role: "tabpanel",
  })

  await expect(log).toHaveAttribute(
    "aria-controls",
    panel.id,
  )

  await expectNoAxeViolations(canvasElement)
})

test("activeKey decides the first render and nothing after", async () => {
  const { canvas } = await mountStory(AllVariants)

  // A controlled prop is the thing this library refuses to have.
  const tablist = expectAgentDrivable(canvas, {
    name: "Bay 3 starting on log",
    role: "tablist",
  })

  const selected = tablist.querySelector(
    '[aria-selected="true"]',
  )

  await expect(selected).toHaveTextContent("Log")
})

test("a vertical tablist says so", async () => {
  const { canvas } = await mountStory(AllVariants)

  await expect(
    expectAgentDrivable(canvas, {
      name: "Bay 3 vertical",
      role: "tablist",
    }),
  ).toHaveAttribute("aria-orientation", "vertical")
})

test("the arrow keys skip a disabled tab", async () => {
  const { canvas } = await mountStory(AllStates)

  const verdict = expectAgentDrivable(canvas, {
    name: "Verdict",
    role: "tab",
  })

  await expect(verdict).toBeDisabled()

  // The disabled tab is out of the *focus* group and still one of
  // the *options* — it owns a panel and an id either way.
  // Registration is membership, so the arrow keys skip it with
  // nothing in `RovingFocus` knowing the word "disabled".
  const flags = expectAgentDrivable(canvas, {
    name: "Flags",
    role: "tab",
  })

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Disc",
      role: "tab",
    }),
  )

  await userEvent.keyboard("{ArrowRight}")

  await waitFor(() => {
    expect(flags).toHaveFocus()
  })

  await expect(verdict).not.toHaveFocus()
})

/**
 * A tab bar **scrolls**, it does not wrap. A wrapped tablist puts
 * tabs on two rows, which breaks both the visual row and the mental
 * model the arrow keys give — "right" stops meaning right.
 */
test("a narrow tab bar scrolls rather than wrapping", async () => {
  const { canvas } = await mountStory(Responsive)

  const narrow = expectAgentDrivable(canvas, {
    name: "Bay 3 at 15rem",
    role: "tablist",
  })

  await expect(narrow.scrollWidth).toBeGreaterThan(
    narrow.clientWidth,
  )

  // **And it clips what it cannot fit.** The line above says only
  // that the content is wider than the box, which is equally true of
  // a bar painting straight across the panel beside it — which is
  // what this component actually did until 2026-07-30, in this exact
  // story, with this exact assertion passing. Overflowing and
  // scrolling are different things and the test has to say which.
  await expect(
    globalThis.getComputedStyle(narrow).overflowX,
  ).not.toBe("visible")

  // One row, still. `clientHeight` growing past a single tab's
  // height is what wrapping would look like — and, now that this is
  // a scroll container, what a *classic* scrollbar taking layout
  // space would look like too. Both are caught here.
  const wide = expectAgentDrivable(canvas, {
    name: "Bay 3 at 34rem",
    role: "tablist",
  })

  await expect(narrow.clientHeight).toBe(wide.clientHeight)
})

test("the focus ring survives the scroll container", async () => {
  const { canvas } = await mountStory(Responsive)

  const narrow = expectAgentDrivable(canvas, {
    name: "Bay 3 at 15rem",
    role: "tablist",
  })

  // Tabbed to, not `.focus()`ed: the ring is a `:focus-visible`
  // rule, so a programmatic focus leaves `outline-offset` at its
  // `0px` initial value and *any* assertion about it passes. That is
  // how the first version of this test passed against the bug it was
  // written for.
  await userEvent.tab()

  const tab = document.activeElement as HTMLElement

  await expect(narrow).toContainElement(tab)

  // An `overflow` other than `visible` clips its descendants'
  // outlines, and the focus ring *is* an outline. The tab fills the
  // bar's content box, so a positive offset would put the whole ring
  // in the clipped region — visible nowhere, on the one component in
  // the library that scrolls. Drawing it inward is what keeps it on
  // screen, and this is the assertion that fails if the shared
  // `--focus-ring-offset` is ever restored here.
  const { outlineOffset, outlineWidth } =
    globalThis.getComputedStyle(tab)

  await expect(
    Number.parseFloat(outlineWidth),
  ).toBeGreaterThan(0)

  await expect(
    Number.parseFloat(outlineOffset),
  ).toBeLessThanOrEqual(0)
})

/**
 * The falsification point that M4 was built to run: `automatic` and
 * `manual` differ only in whether moving focus also *chooses*, and
 * that difference is one line because focus and selection are
 * separate kinds.
 */
test("manual activation moves focus without selecting", async () => {
  const { canvas } = await mountStory(Manual)

  const tablist = expectAgentDrivable(canvas, {
    name: "Bay 3 manual",
    role: "tablist",
  })

  const tabs = Array.from(
    tablist.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    ),
  )

  const [progress, log] = tabs as [
    HTMLButtonElement,
    HTMLButtonElement,
  ]

  // Exactly one tab stop for the whole bar — the roving-tabindex
  // rule, straight from `selectTabIndex`.
  await expect(
    tabs.filter((one) => one.tabIndex === 0),
  ).toHaveLength(1)

  progress.focus()

  await userEvent.keyboard("{ArrowRight}")

  await waitFor(() => {
    expect(log).toHaveFocus()
  })

  // The whole point: focus moved, selection did not.
  await expect(log).toHaveAttribute(
    "aria-selected",
    "false",
  )

  await expect(progress).toHaveAttribute(
    "aria-selected",
    "true",
  )

  await userEvent.keyboard("{Enter}")

  await waitFor(() => {
    expect(log).toHaveAttribute("aria-selected", "true")
  })
})

test("automatic activation selects as focus moves, and wraps", async () => {
  const { canvas } = await mountStory(Default)

  const tablist = expectAgentDrivable(canvas, {
    name: "Bay 3",
    role: "tablist",
  })

  const tabs =
    tablist.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    )

  tabs[0]?.focus()

  await userEvent.keyboard("{ArrowRight}")

  await waitFor(() => {
    expect(tabs[1]).toHaveAttribute("aria-selected", "true")
  })

  // Wrapping is on, because a tab list is one of the patterns ARIA
  // says wraps.
  await userEvent.keyboard("{ArrowRight}{ArrowRight}")

  await waitFor(() => {
    expect(tabs[0]).toHaveAttribute("aria-selected", "true")
  })
})
