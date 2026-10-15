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
