import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import {
  DESKTOP,
  PHONE,
  setViewport,
} from "../viewport.testHelpers.ts"
import * as stories from "./DatePicker.stories.tsx"

const { AllVariants, Default, Interactive } =
  composeStories(stories)

const openDefault = async () => {
  const mounted = await mountStory(Default)

  const input = expectAgentDrivable(mounted.canvas, {
    name: "Due date",
    role: "combobox",
  })

  await userEvent.click(input)

  await waitFor(() => {
    expect(
      mounted.body.getByRole("dialog", {
        name: "Due date calendar",
      }),
    ).toBeInTheDocument()
  })

  return { ...mounted, input }
}

test("the field is a combobox that opens a named calendar dialog over a grid", async () => {
  const { body, input } = await openDefault()

  await expect(input).toHaveAttribute(
    "aria-haspopup",
    "dialog",
  )

  await expect(input).toHaveAttribute(
    "aria-expanded",
    "true",
  )

  const dialog = body.getByRole("dialog", {
    name: "Due date calendar",
  })

  await expect(input).toHaveAttribute(
    "aria-controls",
    dialog.id,
  )

  // The grid is named by the month it draws, so two of them on
  // screen (range mode) stay separately addressable.
  expectAgentDrivable(body, {
    name: "August 2026",
    role: "grid",
  })

  // Every day's accessible name is the whole date, not "19".
  expectAgentDrivable(body, {
    name: "Wednesday, August 19, 2026",
    role: "gridcell",
  })

  await expectNoAxeViolations(dialog)
})

test("today is marked, and exactly one cell is in the tab order", async () => {
  const { body } = await openDefault()

  const today = body.getByRole("gridcell", {
    name: "Wednesday, August 19, 2026",
  })

  await expect(today).toHaveAttribute(
    "aria-current",
    "date",
  )

  // One grid on screen, so every gridcell in the document is one of
  // this month's.
  const tabStops = body
    .getAllByRole("gridcell")
    .filter((cell: HTMLElement) => cell.tabIndex >= 0)

  // A roving-tabindex grid needs exactly one: zero strands the
  // widget, several put 31 days into the tab order.
  await expect(tabStops).toHaveLength(1)

  await expect(tabStops[0]).toBe(today)
})

test("a typed relative date is echoed and does NOT commit until Enter", async () => {
  const { canvas, input } = await openDefault()

  await userEvent.type(input, "next fri")

  // The whole anti-silent-guess mechanism: the resolution is on
  // screen, in a live region, before anything is stored.
  await waitFor(() => {
    expect(
      canvas.getByText("Friday, August 21, 2026"),
    ).toBeInTheDocument()
  })

  await expect(
    canvas.getByText("Chosen: —"),
  ).toBeInTheDocument()

  await userEvent.keyboard("{Enter}")

  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: 2026-08-21"),
    ).toBeInTheDocument()
  })

  // Committed as a calendar date, and rendered back in the locale's
  // own medium form.
  await expect(input).toHaveValue("Aug 21, 2026")
})

test("an ambiguous value is refused by name, and the typed text survives", async () => {
  const { canvas, input } = await openDefault()

  await userEvent.type(input, "ju 19")

  await waitFor(() => {
    expect(
      canvas.getByText(/could be June or July/),
    ).toBeInTheDocument()
  })

  await expect(input).toHaveAttribute(
    "aria-invalid",
    "true",
  )

  await userEvent.keyboard("{Enter}")

  // Nothing committed, and the text was neither cleared nor
  // rewritten to some nearby date the user did not ask for.
  await expect(
    canvas.getByText("Chosen: —"),
  ).toBeInTheDocument()

  await expect(input).toHaveValue("ju 19")
})

test("ArrowDown enters the grid, and the arrows move by day, week and month", async () => {
  const { body, input } = await openDefault()

  await userEvent.click(input)

  await userEvent.keyboard("{ArrowDown}")

  const wednesday = body.getByRole("gridcell", {
    name: "Wednesday, August 19, 2026",
  })

  await waitFor(() => {
    expect(wednesday).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowRight}")

  await waitFor(() => {
    expect(
      body.getByRole("gridcell", {
        name: "Thursday, August 20, 2026",
      }),
    ).toHaveFocus()
  })

  // Down is a week, not a row of whatever happens to be rendered.
  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(
      body.getByRole("gridcell", {
        name: "Thursday, August 27, 2026",
      }),
    ).toHaveFocus()
  })

  // PageDown pages the month, and the grid redraws around a day it
  // had not rendered.
  await userEvent.keyboard("{PageDown}")

  await waitFor(() => {
    expect(
      body.getByRole("grid", { name: "September 2026" }),
    ).toBeInTheDocument()
  })

  await expect(
    body.getByRole("gridcell", {
      name: "Sunday, September 27, 2026",
    }),
  ).toHaveFocus()
})

test("Enter on a cell selects and closes; Escape puts the caret back", async () => {
  const { body, canvas, input } = await openDefault()

  await userEvent.click(input)

  await userEvent.keyboard("{ArrowDown}{ArrowRight}{Enter}")

  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: 2026-08-20"),
    ).toBeInTheDocument()
  })

  await expect(body.queryByRole("dialog")).toBeNull()

  // Reopen, then leave without choosing.
  await userEvent.click(input)

  await waitFor(() => {
    expect(body.getByRole("dialog")).toBeInTheDocument()
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  await expect(input).toHaveFocus()

  await expect(
    canvas.getByText("Chosen: 2026-08-20"),
  ).toBeInTheDocument()
})

test("a preset commits the date it names, against the injected today", async () => {
  const { body, canvas, input } = await openDefault()

  await userEvent.click(input)

  await userEvent.click(
    body.getByRole("button", { name: "Next week" }),
  )

  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: 2026-08-26"),
    ).toBeInTheDocument()
  })
})

test("range mode picks a start then an end, and swaps a backwards pair", async () => {
  await setViewport(DESKTOP)

  const { body, canvas } = await mountStory(Interactive)

  const start = expectAgentDrivable(canvas, {
    name: "Phase start",
    role: "combobox",
  })

  await userEvent.click(start)

  await waitFor(() => {
    expect(
      body.getByRole("dialog", { name: "Phase calendar" }),
    ).toBeInTheDocument()
  })

  // Two months, side by side at desktop width.
  await expect(
    body.getByRole("grid", { name: "August 2026" }),
  ).toBeInTheDocument()

  await expect(
    body.getByRole("grid", { name: "September 2026" }),
  ).toBeInTheDocument()

  await userEvent.click(
    body.getByRole("gridcell", {
      name: "Monday, August 24, 2026",
    }),
  )

  // The panel stays open for the second half of the range.
  await expect(
    body.getByRole("dialog", { name: "Phase calendar" }),
  ).toBeInTheDocument()

  // Pick an END that precedes the start. Throwing it away would
  // discard the day the user just clicked; the pair is swapped.
  await userEvent.click(
    body.getByRole("gridcell", {
      name: "Thursday, August 20, 2026",
    }),
  )

  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: 2026-08-20 to 2026-08-24"),
    ).toBeInTheDocument()
  })
})

test("minValue and maxValue disable the days outside them", async () => {
  const { body, canvas } = await mountStory(AllVariants)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Sprint day",
      role: "combobox",
    }),
  )

  await waitFor(() => {
    expect(
      body.getByRole("dialog", {
        name: "Sprint day calendar",
      }),
    ).toBeInTheDocument()
  })

  await expect(
    body.getByRole("gridcell", {
      name: "Sunday, August 16, 2026",
    }),
  ).toHaveAttribute("aria-disabled", "true")

  await expect(
    body.getByRole("gridcell", {
      name: "Monday, August 17, 2026",
    }),
  ).not.toHaveAttribute("aria-disabled")

  await expect(
    body.getByRole("gridcell", {
      name: "Saturday, August 29, 2026",
    }),
  ).toHaveAttribute("aria-disabled", "true")

  // A disabled day cannot be committed by clicking it.
  await userEvent.click(
    body.getByRole("gridcell", {
      name: "Sunday, August 16, 2026",
    }),
  )

  await expect(
    body.getByRole("dialog", {
      name: "Sprint day calendar",
    }),
  ).toBeInTheDocument()
})

test("Narrow View: the range panel fits the viewport and stacks its months", async () => {
  await setViewport(PHONE)

  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Phase start",
      role: "combobox",
    }),
  )

  const dialog = await waitFor(() =>
    body.getByRole("dialog", { name: "Phase calendar" }),
  )

  const panel = dialog.getBoundingClientRect()

  // The panel asks for 41rem and gets whatever floating-ui found.
  // Nothing may hang off the side of a phone.
  await expect(panel.width).toBeLessThanOrEqual(PHONE.width)

  await expect(panel.left).toBeGreaterThanOrEqual(0)

  await expect(panel.right).toBeLessThanOrEqual(PHONE.width)

  const august = body
    .getByRole("grid", { name: "August 2026" })
    .getBoundingClientRect()

  const september = body
    .getByRole("grid", { name: "September 2026" })
    .getBoundingClientRect()

  // Stacked, not side by side — the container query read the panel's
  // own inline size, which is what a media query could not have told
  // it once the panel is portalled and clamped.
  await expect(september.top).toBeGreaterThanOrEqual(
    august.bottom,
  )

  await expectNoAxeViolations(dialog)

  await setViewport(DESKTOP)
})

test("a container narrower than --cq-xs drops the weekday headers to one letter", async () => {
  // The owner's actual case: not a phone, but a browser zoomed in
  // far enough that the layout viewport is tiny. The panel is
  // clamped to the space available and the calendar reads *that*.
  await setViewport({ height: 700, width: 260 })

  const { body, canvas } = await mountStory(Default)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Due date",
      role: "combobox",
    }),
  )

  const grid = await waitFor(() =>
    body.getByRole("grid", { name: "August 2026" }),
  )

  await expect(
    grid.getBoundingClientRect().width,
  ).toBeLessThan(256)

  const [firstHeader] = body.getAllByRole("columnheader")

  const [narrowSpan, shortSpan] = Array.from(
    firstHeader?.querySelectorAll("span") ?? [],
  )

  await expect(
    globalThis.getComputedStyle(narrowSpan as Element)
      .display,
  ).not.toBe("none")

  await expect(
    globalThis.getComputedStyle(shortSpan as Element)
      .display,
  ).toBe("none")

  // The column still announces its full name either way.
  await expect(firstHeader).toHaveTextContent("Sunday")

  await setViewport(DESKTOP)
})
