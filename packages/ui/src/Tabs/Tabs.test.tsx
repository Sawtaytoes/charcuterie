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

  // The disabled tab is out of the *focus* group and still in the
  // *panel* group — it owns a panel and an id either way.
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

  // One row, still. `clientHeight` growing past a single tab's
  // height is what wrapping would look like.
  const wide = expectAgentDrivable(canvas, {
    name: "Bay 3 at 34rem",
    role: "tablist",
  })

  await expect(narrow.clientHeight).toBe(wide.clientHeight)
})

/**
 * The falsification point that M4 was built to run: `automatic` and
 * `manual` differ only in whether moving focus also shows a panel,
 * and that difference is one line because focus and selection are
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
