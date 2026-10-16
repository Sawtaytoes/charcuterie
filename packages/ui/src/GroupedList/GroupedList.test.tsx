import {
  composeStories,
  composeStory,
} from "@storybook/react"
import {
  expect,
  userEvent,
  waitFor,
  within,
} from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import meta, * as stories from "./GroupedList.stories.tsx"

const {
  AllStates,
  AllVariants,
  ColorSchemes,
  Empty,
  Interactive,
  LongText,
  NarrowView,
  Playground,
  Responsive,
  StickyHeadings,
} = composeStories(stories)

test("a group's heading names its list", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)

  // The heading labels the `<ul>` rather than a `<section>`: a named
  // section is a landmark, and one per group is the landmark
  // proliferation the APG warns about.
  const screens = expectAgentDrivable(canvas, {
    name: "Screens",
    role: "list",
  })

  await expect(
    within(screens).getAllByRole("listitem"),
  ).toHaveLength(2)

  await expect(
    canvasElement.querySelector("section"),
  ).toBeNull()

  await expect(
    canvas.getByRole("heading", {
      level: 3,
      name: "Screens",
    }),
  ).toBeVisible()

  expectAgentDrivable(canvas, {
    name: "Open Lobby",
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

test("the heading level is the caller's", async () => {
  const { canvas } = await mountStory(
    composeStory({ args: { headingLevel: 2 } }, meta),
  )

  const heading = expectAgentDrivable(canvas, {
    name: "Not on a screen",
    role: "heading",
  })

  await expect(heading.tagName).toBe("H2")
})

test("an empty group is not drawn", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  await expect(
    canvas.queryByRole("heading", { name: "Never drawn" }),
  ).toBeNull()

  expectAgentDrivable(canvas, {
    name: "Drawn",
    role: "list",
  })

  // The last cell has no group with an item, so it draws its
  // `emptyState` and no list at all.
  expectAgentDrivable(canvas, {
    name: "No page matches",
    role: "heading",
  })

  await expectNoAxeViolations(canvasElement)
})

test("a list with nothing in it draws the caller's empty state", async () => {
  const { canvas, canvasElement } = await mountStory(Empty)

  expectAgentDrivable(canvas, {
    name: "This server has no pages",
    role: "heading",
  })

  await expect(canvas.queryByRole("list")).toBeNull()

  await expectNoAxeViolations(canvasElement)
})

test("a clipped label carries its full text as a tooltip, and a short one has none", async () => {
  const { canvas, canvasElement } =
    await mountStory(LongText)

  const label = canvas.getByText(
    "Quarterly All-Hands Countdown and Seating Chart",
  )

  await waitFor(() => {
    expect(label).toHaveAttribute(
      "title",
      "Quarterly All-Hands Countdown and Seating Chart",
    )
  })

  await expect(label.scrollWidth).toBeGreaterThan(
    label.clientWidth,
  )

  const path = canvas.getByText(
    "/views/quarterly-all-hands-countdown-and-seating-chart-for-the-north-atrium",
  )

  await waitFor(() => {
    expect(path).toHaveAttribute("title")
  })

  await expect(canvas.getByText("Map")).not.toHaveAttribute(
    "title",
  )

  expectAgentDrivable(canvas, {
    name: "Open Map",
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

test("isTextTruncated={false} wraps the whole label instead", async () => {
  const { canvas } = await mountStory(AllVariants)

  // The third cell truncates, the fourth wraps; same fixture.
  const [truncated, wrapped] = canvas.getAllByText(
    "Quarterly All-Hands Countdown and Seating Chart",
  ) as [HTMLElement, HTMLElement]

  await waitFor(() => {
    expect(truncated).toHaveAttribute("title")
  })

  await expect(wrapped.scrollWidth).toBeLessThanOrEqual(
    wrapped.clientWidth,
  )

  await expect(wrapped).not.toHaveAttribute("title")

  await expect(
    canvas.getAllByRole("list", {
      name: "On the Conference Center North Atrium Wayfinding screen",
    }),
  ).toHaveLength(2)
})

test("Tab walks the actions in reading order", async () => {
  const { canvas } = await mountStory(Interactive)

  const order = [
    "Open Lobby",
    "Open Break Room",
    "Open Welcome",
    "Open Weather",
    "Open Schedule",
    "Open Test Pattern",
  ]

  for (const name of order) {
    await userEvent.tab()

    await expect(
      expectAgentDrivable(canvas, { name, role: "button" }),
    ).toHaveFocus()
  }
})

/**
 * The text column asks for 12rem and grows. In the 15rem panel the
 * actions cannot fit beside it, so they drop under the text; in the
 * 34rem panel they sit on the same line.
 */
test("the actions wrap under the text when the list is narrow", async () => {
  const { canvas } = await mountStory(Responsive)

  const labels = canvas.getAllByText("Water the ferns")

  const buttons = canvas.getAllByRole("button", {
    name: "Edit Water the ferns",
  })

  const [narrowLabel, , wideLabel] = labels as [
    HTMLElement,
    HTMLElement,
    HTMLElement,
  ]

  const [narrowButton, , wideButton] = buttons as [
    HTMLElement,
    HTMLElement,
    HTMLElement,
  ]

  await expect(
    narrowButton.getBoundingClientRect().top,
  ).toBeGreaterThanOrEqual(
    narrowLabel.getBoundingClientRect().bottom,
  )

  await expect(
    wideButton.getBoundingClientRect().top,
  ).toBeLessThan(wideLabel.getBoundingClientRect().bottom)

  // Nothing pushes past its panel: no row is wider than its list.
  for (const list of canvas.getAllByRole("list", {
    name: "Team Orion",
  })) {
    await expect(list.scrollWidth).toBeLessThanOrEqual(
      list.clientWidth,
    )
  }
})

test("the Narrow View keeps every row inside the window", async () => {
  const { canvas, canvasElement } =
    await mountStory(NarrowView)

  const list = expectAgentDrivable(canvas, {
    name: "Team Orion",
    role: "list",
  })

  await expect(list.scrollWidth).toBeLessThanOrEqual(
    list.clientWidth,
  )

  await expectNoAxeViolations(canvasElement)
})

test("both schemes pass axe, contrast included", async () => {
  const { canvas, canvasElement } =
    await mountStory(ColorSchemes)

  expectAgentDrivable(canvas, {
    name: "Open dark Lobby",
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

/**
 * The element `isHeadingSticky` pins: the heading's row, which also
 * holds the summary.
 */
const headingRowOf = (heading: HTMLElement) =>
  heading.parentElement as HTMLElement

test("a heading scrolls with its rows unless isHeadingSticky is set", async () => {
  const { canvas } = await mountStory(Playground)

  const heading = expectAgentDrivable(canvas, {
    name: "Screens",
    role: "heading",
  })

  await expect(
    getComputedStyle(headingRowOf(heading)).position,
  ).toBe("static")
})

test("a sticky heading stays at the top of its pane while its rows scroll under it", async () => {
  const { canvas, canvasElement } =
    await mountStory(StickyHeadings)

  const pane = expectAgentDrivable(canvas, {
    name: "Pages on a raised surface",
    role: "region",
  })

  const paneCanvas = within(pane)

  const heading = paneCanvas.getByRole("heading", {
    name: "On the Lobby screen",
  })

  const list = paneCanvas.getByRole("list", {
    name: "On the Lobby screen",
  })

  // The space under a stuck heading is its own padding, not a
  // transparent gap the rows would show through.
  await expect(
    headingRowOf(heading).getBoundingClientRect().bottom,
  ).toBeCloseTo(list.getBoundingClientRect().top, 0)

  pane.scrollTop = 96

  await waitFor(() => {
    expect(pane.scrollTop).toBe(96)
  })

  const paneTop =
    pane.getBoundingClientRect().top + pane.clientTop

  await expect(
    headingRowOf(heading).getBoundingClientRect().top,
  ).toBeCloseTo(paneTop, 0)

  // The first row has scrolled up past the heading, under it.
  const firstRow = within(list).getAllByRole(
    "listitem",
  )[0] as HTMLElement

  await expect(
    firstRow.getBoundingClientRect().top,
  ).toBeLessThan(paneTop)

  await expectNoAxeViolations(canvasElement)
})

test("a stuck heading's background is the surface its host names, and surface-base by default", async () => {
  const { canvas } = await mountStory(StickyHeadings)

  for (const name of [
    "Pages on a base surface",
    "Pages on a raised surface",
  ]) {
    const pane = expectAgentDrivable(canvas, {
      name,
      role: "region",
    })

    const heading = within(pane).getByRole("heading", {
      name: "On the Break Room screen",
    })

    const headingBackground = getComputedStyle(
      headingRowOf(heading),
    ).backgroundColor

    await expect(headingBackground).toBe(
      getComputedStyle(pane).backgroundColor,
    )

    await expect(headingBackground).not.toBe(
      "rgba(0, 0, 0, 0)",
    )
  }

  // And the two surfaces are different, or the assertion above
  // could pass with the property ignored.
  await expect(
    getComputedStyle(
      expectAgentDrivable(canvas, {
        name: "Pages on a base surface",
        role: "region",
      }),
    ).backgroundColor,
  ).not.toBe(
    getComputedStyle(
      expectAgentDrivable(canvas, {
        name: "Pages on a raised surface",
        role: "region",
      }),
    ).backgroundColor,
  )
})
