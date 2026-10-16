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
import { userEvent as browserUserEvent } from "vitest/browser"

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
  RowStates,
  SelectableRows,
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

/** The `<li>` a whole-row button stretches over. */
const rowOf = (button: HTMLElement) =>
  button.closest("li") as HTMLElement

/** What the pointer would hit at the middle of an element's box. */
const elementAtCentreOf = (element: HTMLElement) => {
  const box = element.getBoundingClientRect()

  return document.elementFromPoint(
    box.left + box.width / 2,
    box.top + box.height / 2,
  )
}

test("a row without onSelect draws no row button", async () => {
  const { canvas } = await mountStory(Playground)

  await expect(
    canvas.queryByRole("button", { name: "Lobby" }),
  ).toBeNull()

  await expect(
    canvas
      .getAllByRole("button")
      .map((button: HTMLElement) =>
        button.getAttribute("aria-label"),
      ),
  ).toEqual([
    "Open Lobby",
    "Open Break Room",
    "Open Welcome",
    "Open Weather",
    "Open Schedule",
    "Open Test Pattern",
  ])
})

test("onSelect makes the whole row one native button, named by selectLabel", async () => {
  const { canvas, canvasElement } =
    await mountStory(SelectableRows)

  const rowButton = expectAgentDrivable(canvas, {
    name: "Edit Water the ferns",
    role: "button",
  })

  await expect(rowButton.tagName).toBe("BUTTON")

  await expect(rowButton).toHaveAttribute("type", "button")

  // Nothing is nested inside it: the row's text is a sibling drawn
  // over it, so there is no interactive content inside a button.
  await expect(rowButton.childElementCount).toBe(0)

  const row = rowOf(rowButton)

  const buttonBox = rowButton.getBoundingClientRect()

  // Full-area: the button covers the row's whole padding box — all
  // of it but the 1px divider between rows.
  await expect(buttonBox.width).toBeCloseTo(
    row.clientWidth,
    0,
  )

  await expect(buttonBox.height).toBeCloseTo(
    row.clientHeight,
    0,
  )

  // A pointer on the label, the description, the cap line or the
  // payout lands on the row's button.
  for (const text of [
    "Water the ferns",
    "water-ferns",
    "Up to 5 pts a day",
    "5 pts",
  ]) {
    await expect(
      elementAtCentreOf(within(row).getByText(text)),
    ).toBe(rowButton)
  }

  await userEvent.click(rowButton)

  await expect(
    canvas.getByRole("status"),
  ).toHaveTextContent("Opened Water the ferns")

  await expectNoAxeViolations(canvasElement)
})

test("a row's action stays its own target and never selects the row", async () => {
  const { canvas } = await mountStory(SelectableRows)

  const deleteButton = expectAgentDrivable(canvas, {
    name: "Delete Water the ferns",
    role: "button",
  })

  const hit = elementAtCentreOf(deleteButton)

  await expect(
    hit === deleteButton || deleteButton.contains(hit),
  ).toBe(true)

  // A real click at the action's centre, with real hit-testing.
  await browserUserEvent.click(deleteButton)

  await expect(
    canvas.getByRole("status"),
  ).toHaveTextContent("Deleted Water the ferns")
})

test("Tab reaches each row's button, then its action, in reading order, and Enter and Space open the row", async () => {
  const { canvas } = await mountStory(SelectableRows)

  const order = [
    "Edit Water the ferns",
    "Delete Water the ferns",
    "Edit Sort the recycling",
    "Delete Sort the recycling",
    "Edit Feed the goldfish",
    "Delete Feed the goldfish",
  ]

  for (const name of order) {
    await userEvent.tab()

    await expect(
      expectAgentDrivable(canvas, { name, role: "button" }),
    ).toHaveFocus()
  }

  const muted = canvas.getByRole("button", {
    name: "Edit Feed the goldfish",
  })

  muted.focus()

  await userEvent.keyboard("{Enter}")

  await expect(
    canvas.getByRole("status"),
  ).toHaveTextContent("Opened Feed the goldfish")

  canvas
    .getByRole("button", {
      name: "Edit Sort the recycling",
    })
    .focus()

  await userEvent.keyboard(" ")

  await expect(
    canvas.getByRole("status"),
  ).toHaveTextContent("Opened Sort the recycling")
})

test("keyboard focus draws the focus ring inside the row's edge", async () => {
  const { canvas } = await mountStory(SelectableRows)

  // A real Tab, because only a trusted key press makes the browser
  // match `:focus-visible`.
  await browserUserEvent.tab()

  const rowButton = expectAgentDrivable(canvas, {
    name: "Edit Water the ferns",
    role: "button",
  })

  await expect(rowButton).toHaveFocus()

  const style = getComputedStyle(rowButton)

  await expect(style.outlineStyle).toBe("solid")

  // Inside the edge: the group's list clips its corners, and an
  // outside ring would be cut off on the first and last row. One
  // ring-width further in again, so it never shares pixels with the
  // highlight ring that hugs the edge.
  const ringWidth = Number.parseFloat(style.outlineWidth)

  await expect(ringWidth).toBeGreaterThan(0)

  await expect(
    Number.parseFloat(style.outlineOffset),
  ).toBeCloseTo(-2 * ringWidth, 1)
})

test("hover tints the row and rings its edge; holding the row presses it", async () => {
  const { canvas } = await mountStory(SelectableRows)

  const rowButton = expectAgentDrivable(canvas, {
    name: "Edit Water the ferns",
    role: "button",
  })

  const resting = getComputedStyle(rowButton)

  const restingBackground = resting.backgroundColor

  const restingShadow = resting.boxShadow

  await browserUserEvent.hover(rowButton)

  await waitFor(() => {
    expect(
      getComputedStyle(rowButton).backgroundColor,
    ).not.toBe(restingBackground)
  })

  await expect(
    getComputedStyle(rowButton).boxShadow,
  ).not.toBe(restingShadow)

  await browserUserEvent.unhover(rowButton)

  // Holding Space keeps a focused button `:active`, which is a press
  // without a pointer — and it presses only the row whose button it
  // is.
  rowButton.focus()

  await browserUserEvent.keyboard("{ >}")

  const row = rowOf(rowButton)

  // Tailwind's `scale-*` writes the individual `scale` property,
  // not `transform`.
  await waitFor(() => {
    expect(getComputedStyle(row).scale).toBe("0.99")
  })

  await expect(
    getComputedStyle(
      rowOf(
        canvas.getByRole("button", {
          name: "Edit Sort the recycling",
        }),
      ),
    ).scale,
  ).toBe("none")

  await browserUserEvent.keyboard("{/ }")

  await expect(
    canvas.getByRole("status"),
  ).toHaveTextContent("Opened Water the ferns")
})

test("a muted row is a sunken surface with a quieter label, and still clears axe", async () => {
  const { canvas, canvasElement } =
    await mountStory(SelectableRows)

  const mutedRow = rowOf(
    canvas.getByRole("button", {
      name: "Edit Feed the goldfish",
    }),
  )

  const activeRow = rowOf(
    canvas.getByRole("button", {
      name: "Edit Water the ferns",
    }),
  )

  await expect(
    getComputedStyle(mutedRow).backgroundColor,
  ).not.toBe(getComputedStyle(activeRow).backgroundColor)

  await expect(
    getComputedStyle(
      within(mutedRow).getByText("Feed the goldfish"),
    ).color,
  ).not.toBe(
    getComputedStyle(
      within(activeRow).getByText("Water the ferns"),
    ).color,
  )

  // Muted is not disabled: the row still opens.
  await expect(
    canvas.getByRole("button", {
      name: "Edit Feed the goldfish",
    }),
  ).toBeEnabled()

  await expectNoAxeViolations(canvasElement)
})

test("a highlighted row is ringed, and the ring lets the pointer through", async () => {
  const { canvas } = await mountStory(SelectableRows)

  const rowButton = canvas.getByRole("button", {
    name: "Edit Sort the recycling",
  })

  const row = rowOf(rowButton)

  const ring = row.querySelector(
    ".charcuterie-highlight",
  ) as HTMLElement

  await expect(ring).not.toBeNull()

  await expect(ring).toHaveAttribute("aria-hidden", "true")

  await expect(getComputedStyle(ring).boxShadow).toContain(
    "inset",
  )

  await expect(
    elementAtCentreOf(within(row).getByText("2 pts")),
  ).toBe(rowButton)

  // Only the row that asked for it.
  await expect(
    rowOf(
      canvas.getByRole("button", {
        name: "Edit Water the ferns",
      }),
    ).querySelector(".charcuterie-highlight"),
  ).toBeNull()
})

test("the aside sits beside the text in a wide list and never pushes the row past its list", async () => {
  const { canvas } = await mountStory(SelectableRows)

  const list = expectAgentDrivable(canvas, {
    name: "Team Orion",
    role: "list",
  })

  await expect(list.scrollWidth).toBeLessThanOrEqual(
    list.clientWidth,
  )

  const row = rowOf(
    canvas.getByRole("button", {
      name: "Edit Water the ferns",
    }),
  )

  const label = within(row).getByText("Water the ferns")

  const capLine = within(row).getByText("Up to 5 pts a day")

  const payout = within(row).getByText("Per scan")

  // 12rem of text, the payout and the action fit on one line well
  // inside 40rem; below that the content decides.
  if (list.clientWidth >= 640) {
    await expect(
      payout.getBoundingClientRect().top,
    ).toBeLessThan(capLine.getBoundingClientRect().bottom)

    await expect(
      payout.getBoundingClientRect().left,
    ).toBeGreaterThan(label.getBoundingClientRect().right)
  } else {
    await expect(
      payout.getBoundingClientRect().top,
    ).toBeGreaterThanOrEqual(
      capLine.getBoundingClientRect().bottom,
    )
  }
})

test("every row state passes axe in both schemes", async () => {
  const { canvas, canvasElement } =
    await mountStory(RowStates)

  expectAgentDrivable(canvas, {
    name: "Highlight intents",
    role: "list",
  })

  // The canvas paints the scheme's own page surface, so the headings
  // are measured against the background they would really sit on.
  canvasElement.classList.add("bg-surface-base")

  for (const scheme of ["light", "dark"]) {
    canvasElement.setAttribute("data-scheme", scheme)

    await expectNoAxeViolations(canvasElement)
  }
})
