import { composeStories } from "@storybook/react"
import { expect, userEvent, within } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./LaneTimeline.stories.tsx"

const {
  AllStates,
  AllVariants,
  Interactive,
  LongRange,
  NarrowView,
  Playground,
  Responsive,
} = composeStories(stories)

/**
 * The timeline is the landmark; the lanes are **groups** inside it.
 *
 * Eight lanes as eight `region`s would bury the page's real
 * landmarks, and two timelines on one page would put two landmarks
 * with the same name in the document — axe's `landmark-unique`,
 * which `BoardLaneList` hit for real before its lanes became groups.
 */
test("the timeline is a named landmark and its lanes are named groups", async () => {
  const { canvas } = await mountStory(Playground)

  const timeline = expectAgentDrivable(canvas, {
    name: "The week",
    role: "region",
  })

  for (const laneLabel of ["Ada", "Wren", "Juno", "Rook"]) {
    expectAgentDrivable(canvas, {
      name: laneLabel,
      role: "group",
    })
  }

  await expectNoAxeViolations(timeline)
})

/**
 * The claim the component is built on: a lane carrying overlapping
 * work is **taller**, so load asymmetry reads before anybody counts
 * anything.
 *
 * Measured as real geometry rather than as a row count, because the
 * row count is the thing that could be right while the CSS grid drew
 * them all on top of each other.
 */
test("a lane carrying more is taller than a lane carrying less", async () => {
  const { canvas } = await mountStory(Playground)

  const getLaneHeight = (name: string) =>
    canvas
      .getByRole("group", { name })
      .getBoundingClientRect().height

  await expect(getLaneHeight("Wren")).toBeGreaterThan(
    getLaneHeight("Ada"),
  )
})

/**
 * The count is what the lane carries **in this range**, and it keeps
 * counting what the row limit hid — a lane must not look lighter by
 * being more loaded.
 */
test("a lane past its row limit counts the rest and says what is missing", async () => {
  const { canvas } = await mountStory(AllStates)

  const wren = canvas.getAllByRole("group", {
    name: "Wren",
  })[0]

  if (!wren) {
    throw new Error("the Wren lane must render")
  }

  await expect(
    within(wren).getByText("+ 3 more overlapping in Wren"),
  ).toBeInTheDocument()

  // Six in the range, three of them hidden behind `maxRowCount={2}`.
  await expect(
    within(wren).getByText("6"),
  ).toBeInTheDocument()
})

/**
 * A multi-day thing is one bar covering the days it covers — the
 * shape a month grid cannot draw, and the assertion that catches an
 * off-by-one that no screenshot can.
 */
test("a multi-day item is one bar spanning its own days", async () => {
  const { canvas } = await mountStory(Playground)

  const bar = canvas.getByTitle(
    /^Field recording trip, Mon 6 Apr to Thu 9 Apr, 4 days$/,
  )

  const cell = bar.closest("li")

  // Monday is column 1 of this week, and four days is a span of 4 —
  // not 3, which is what a half-open reading of `end` produces, and
  // not 5, which is what adding a day twice produces.
  await expect(cell?.style.gridColumn).toBe("1 / span 4")
})

/**
 * The four edge cases, each of which is a place a naive
 * implementation draws nothing or draws it somewhere else.
 */
test("an item starting before the range is clipped to the first column and says so", async () => {
  const { canvas } = await mountStory(AllStates)

  const bar = canvas.getByTitle(
    /^Desk hire, started last month, Mon 30 Mar to Wed 8 Apr, 10 days, starts before this range$/,
  )

  // Column 1, never 0 and never negative — a negative
  // `grid-column-start` counts back from the END of the row, so the
  // naive subtraction puts the bar at the far side of the week and
  // nothing fails.
  await expect(bar.closest("li")?.style.gridColumn).toBe(
    "1 / span 3",
  )
})

test("an item running past the range is clipped to the last column and says so", async () => {
  const { canvas } = await mountStory(AllStates)

  const bar = canvas.getByTitle(
    /^Residency, runs into May, Fri 10 Apr to Thu 30 Apr, 21 days, continues past this range$/,
  )

  await expect(bar.closest("li")?.style.gridColumn).toBe(
    "5 / span 3",
  )
})

test("a single-day item is one column wide and still a bar", async () => {
  const { canvas } = await mountStory(AllStates)

  const bar = canvas.getByTitle(
    /^Tape delivery, Thu 9 Apr$/,
  )

  await expect(bar.closest("li")?.style.gridColumn).toBe(
    "4 / span 1",
  )
})

test("a zero-width item is drawn on its start day rather than dropped", async () => {
  const { canvas } = await mountStory(AllStates)

  // `end` before `start`. It is drawn, because a dropped row is a
  // data fault nobody can see, and it is one column, because there
  // is no such thing as a backwards bar.
  const bar = canvas.getByTitle(
    /^Kit return, dates entered backwards, Sat 11 Apr$/,
  )

  await expect(bar.closest("li")?.style.gridColumn).toBe(
    "6 / span 1",
  )
})

test("an item outside the range is not drawn and is not counted", async () => {
  const { canvas } = await mountStory(AllStates)

  await expect(
    canvas.queryByText("Next month's session"),
  ).toBeNull()

  const studio = canvas.getByRole("group", {
    name: "Studio floor",
  })

  // Five items in the fixture, four of them in the week.
  await expect(
    within(studio).getByText("4"),
  ).toBeInTheDocument()
})

/**
 * The Narrow View. There is no axis, nothing scrolls sideways, and
 * every span that the geometry used to carry is now printed as text
 * — which is the trade being made, stated as an assertion.
 */
test("the Narrow View drops the axis and writes every span out in words", async () => {
  const { canvas, canvasElement } =
    await mountStory(NarrowView)

  await expect(
    canvas.getByText("Field recording trip"),
  ).toBeInTheDocument()

  await expect(
    canvas.getByText("Mon 6 Apr to Thu 9 Apr, 4 days"),
  ).toBeInTheDocument()

  /*
   * No bar carries a grid placement, because there is no grid. The
   * selector is `li[style]` rather than a substring match on
   * `grid-column`: chromium serialises the two placement properties
   * back out as the `grid-area` shorthand, so a `[style*=…]` test
   * for the name React set finds nothing and passes for the wrong
   * reason.
   */
  await expect(
    canvasElement.querySelectorAll("li[style]"),
  ).toHaveLength(0)

  // And nothing is hidden off the side of the box. `scrollWidth`
  // past `clientWidth` is the silent overflow this component refuses
  // to ship — *"no horizontal scroll, ever"*.
  const timeline = canvas.getByRole("region", {
    name: "The week, Narrow View",
  })

  await expect(timeline.scrollWidth).toBeLessThanOrEqual(
    timeline.clientWidth,
  )
})

/**
 * The fold is the width **per column**, which is why it is measured
 * rather than queried. One container width, two answers, because the
 * other number is in the data.
 */
test("the same width keeps its axis for a week and loses it for a month", async () => {
  const { canvasElement } = await mountStory(Responsive)

  const getBarCount = (name: string) =>
    within(canvasElement)
      .getByRole("region", { name })
      .querySelectorAll("li[style]").length

  // The 34rem panel has room for a seven-column axis.
  await expect(
    getBarCount("The week at 34rem"),
  ).toBeGreaterThan(0)

  // The same 34rem panel has no room for a thirty-column one, so it
  // becomes the list instead. No media query could tell these two
  // apart: the box never changed.
  await expect(getBarCount("The month at 34rem")).toBe(0)
})

/**
 * Thinning the labels rather than shrinking the type, because type
 * that shrinks to fit is type somebody cannot read.
 */
test("a long range labels the axis in whole weeks", async () => {
  const { canvas } = await mountStory(LongRange)

  // Thirty days, labelled every seven: 1, 8, 15, 22, 29.
  await expect(
    canvas.getByText("Wed 1 Apr"),
  ).toBeInTheDocument()

  await expect(
    canvas.getByText("Wed 8 Apr"),
  ).toBeInTheDocument()

  await expect(canvas.queryByText("Thu 2 Apr")).toBeNull()
})

/**
 * A bar with an `onSelect` is a real control, found by the same
 * `getByRole(role, { name })` an agent or a Playwright script
 * writes — and its name carries the span, so thirty bars are thirty
 * distinguishable controls rather than thirty of the same word.
 */
test("a bar that acts is drivable by role and name", async () => {
  const { canvas } = await mountStory(Interactive)

  const bar = expectAgentDrivable(canvas, {
    name: "Foley session, Tue 7 Apr to Wed 8 Apr, 2 days",
    role: "button",
  })

  await userEvent.click(bar)

  await expect(
    canvas.getByText("Picked: Foley session"),
  ).toBeInTheDocument()
})

test("a bar that navigates is a real link", async () => {
  const { canvas } = await mountStory(AllVariants)

  const link = canvas.getAllByRole("link", {
    name: "Foley session, Tue 7 Apr to Wed 8 Apr, 2 days",
  })[0]

  await expect(link).toHaveAttribute("href", "/item/foley")
})

/**
 * *"Real empty states"* is a standing requirement, and an empty
 * timeline is what a household sees on a good week.
 */
test("a timeline with no lanes shows a real empty state", async () => {
  const { canvas } = await mountStory(AllStates)

  await expect(
    canvas.getByText("No lanes yet"),
  ).toBeInTheDocument()

  await expect(
    canvas.getByText("Nobody has a lane yet"),
  ).toBeInTheDocument()

  // An empty *lane* is not an empty timeline. It keeps its heading
  // and its zero, because a lane carrying nothing is the fact the
  // asymmetry is measured against.
  const spare = canvas.getByRole("group", {
    name: "Spare room",
  })

  await expect(
    within(spare).getByText("0"),
  ).toBeInTheDocument()
})
