import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Combobox.stories.tsx"

const {
  AllVariants,
  AttachedInputDrillDown,
  ChosenValueOnOpen,
  Default,
  DisabledFirstOption,
  Interactive,
  LongFooter,
  TrailingElement,
  Virtualized,
  VirtualizedChosenValue,
} = composeStories(stories)

const openMulti = async () => {
  const mounted = await mountStory(AllVariants)

  await userEvent.click(
    expectAgentDrivable(mounted.canvas, {
      name: "Pick languages",
      role: "button",
    }),
  )

  const input = expectAgentDrivable(mounted.body, {
    role: "combobox",
  })

  await waitFor(() => {
    expect(input).toHaveFocus()
  })

  return { ...mounted, input }
}

const openDefault = async () => {
  const mounted = await mountStory(Default)

  await userEvent.click(
    expectAgentDrivable(mounted.canvas, {
      name: "Search languages",
      role: "button",
    }),
  )

  const input = expectAgentDrivable(mounted.body, {
    role: "combobox",
  })

  await waitFor(() => {
    expect(input).toHaveFocus()
  })

  return { ...mounted, input }
}

test("a button opens a combobox whose popup is a listbox", async () => {
  const { body, input } = await openDefault()

  await expect(input).toHaveAttribute(
    "aria-autocomplete",
    "list",
  )

  const listbox = expectAgentDrivable(body, {
    role: "listbox",
  })

  await expect(input).toHaveAttribute(
    "aria-controls",
    listbox.id,
  )

  await expectNoAxeViolations(listbox)
})

test("typing filters the options, and focus stays in the input", async () => {
  const { body, input } = await openDefault()

  await expect(body.getAllByRole("option")).toHaveLength(7)

  await userEvent.keyboard("fr")

  await waitFor(() => {
    expect(body.getAllByRole("option")).toHaveLength(1)
  })

  expect(body.getByRole("option")).toHaveTextContent(
    "French",
  )

  // The caret never left the input.
  await expect(input).toHaveFocus()
})

test("no match shows the empty label and keeps the popup open", async () => {
  const { body } = await openDefault()

  await userEvent.keyboard("zzz")

  await waitFor(() => {
    expect(body.queryAllByRole("option")).toHaveLength(0)
  })

  // Still open, still typeable.
  await expect(
    body.getByText("No matches"),
  ).toBeInTheDocument()

  await expect(
    body.getByRole("combobox"),
  ).toBeInTheDocument()
})

test("the arrow keys move aria-activedescendant, not focus", async () => {
  const { body, input } = await openDefault()

  const options = body.getAllByRole("option")

  // Opens on the first option.
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    options[0]?.id,
  )

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      options[1]?.id,
    )
  })

  // Focus never moved to the option.
  await expect(input).toHaveFocus()
})

test("Enter selects the active option and closes", async () => {
  const { body, input } = await openDefault()

  await userEvent.keyboard("{ArrowDown}{Enter}")

  await waitFor(() => {
    expect(body.queryByRole("combobox")).toBeNull()
  })

  // Single-select flows back through `onSelect`.
  await expect(input).not.toBeInTheDocument()
})

test("Escape clears the query first, then closes", async () => {
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Search languages",
      role: "button",
    }),
  )

  const input = body.getByRole("combobox")

  await waitFor(() => {
    expect(input).toHaveFocus()
  })

  await userEvent.keyboard("fr")

  await expect(input).toHaveValue("fr")

  await userEvent.keyboard("{Escape}")

  // First Escape clears the query but leaves the popup open.
  await expect(input).toHaveValue("")

  await expect(
    body.getByRole("combobox"),
  ).toBeInTheDocument()

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("combobox")).toBeNull()
  })
})

test("multi-select Tab escapes the field instead of committing", async () => {
  const { body, canvas, input } = await openMulti()

  // Nothing chosen yet.
  await expect(
    canvas.getByText("Chosen: —"),
  ).toBeInTheDocument()

  await userEvent.tab()

  // Tab did not commit the active option — no chip, still nothing chosen…
  await expect(
    canvas.getByText("Chosen: —"),
  ).toBeInTheDocument()

  await expect(
    body.queryByRole("button", { name: /^Remove / }),
  ).toBeNull()

  // …and focus left the input rather than being trapped back in it.
  await expect(input).not.toHaveFocus()
})

test("removing a chip reports the removal through onSelect", async () => {
  const { body, canvas } = await openMulti()

  // Enter commits the active option in multi-select and keeps the popup
  // open, so a chip appears and the parent is told.
  await userEvent.keyboard("{Enter}")

  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: eng"),
    ).toBeInTheDocument()
  })

  // The chip's face and accessible name are the option's human label,
  // not its `value` — "English", not "eng".
  await userEvent.click(
    body.getByRole("button", { name: "Remove English" }),
  )

  // The removal flowed back through `onSelect`, so the parent cleared it
  // — a chip removal and a list toggle-off now agree.
  await waitFor(() => {
    expect(
      canvas.getByText("Chosen: —"),
    ).toBeInTheDocument()
  })
})

test("a disabled first option is skipped, never active or committed", async () => {
  const { body, canvas } = await mountStory(
    DisabledFirstOption,
  )

  const input = body.getByRole("combobox")

  await waitFor(() => {
    expect(input).toHaveFocus()
  })

  const options = body.getAllByRole("option")

  // The seed lands on index 0 (disabled English); the resolved active
  // descendant skips to the first enabled option, Spanish.
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    options[1]?.id,
  )

  await userEvent.keyboard("{Enter}")

  // Enter committed Spanish, not the disabled English, and closed.
  await waitFor(() => {
    expect(body.queryByRole("combobox")).toBeNull()
  })

  await expect(
    canvas.getByText("Chosen: spa"),
  ).toBeInTheDocument()
})

test("attached mode: the consumer input is the combobox and options are shown", async () => {
  const { body, canvas } = await mountStory(
    AttachedInputDrillDown,
  )

  const input = canvas.getByLabelText("Path")

  // The a11y is mirrored onto the consumer's own input.
  await waitFor(() => {
    expect(input).toHaveAttribute("role", "combobox")
  })

  await expect(input).toHaveAttribute(
    "aria-autocomplete",
    "list",
  )

  const listbox = body.getByRole("listbox")

  await expect(input).toHaveAttribute(
    "aria-controls",
    listbox.id,
  )

  // The three top-level folders, from the pre-filtered options.
  await expect(body.getAllByRole("option")).toHaveLength(3)

  await expectNoAxeViolations(listbox)
})

test("attached mode: selecting a folder drills in and keeps the popup open", async () => {
  const { body, canvas } = await mountStory(
    AttachedInputDrillDown,
  )

  const input = canvas.getByLabelText("Path")

  await userEvent.click(input)

  await waitFor(() => {
    expect(input).toHaveFocus()
  })

  // Enter commits the active option ("apps") — but does not close.
  await userEvent.keyboard("{Enter}")

  await waitFor(() => {
    expect(
      body.getByRole("option", { name: /mux-magic/ }),
    ).toBeInTheDocument()
  })

  // The field drilled in, the popup is still open, and focus never left.
  await expect(input).toHaveValue("/apps/")

  await expect(
    body.getByRole("listbox"),
  ).toBeInTheDocument()

  await expect(input).toHaveFocus()
})

test("attached mode: Tab also accepts the active option and drills", async () => {
  const { body, canvas } = await mountStory(
    AttachedInputDrillDown,
  )

  const input = canvas.getByLabelText("Path")

  await userEvent.click(input)

  await waitFor(() => {
    expect(input).toHaveFocus()
  })

  await userEvent.keyboard("{Tab}")

  await waitFor(() => {
    expect(input).toHaveValue("/apps/")
  })

  // Tab drilled rather than moving focus out; the popup stays open.
  await expect(
    body.getByRole("listbox"),
  ).toBeInTheDocument()

  await expect(input).toHaveFocus()
})

test("attached mode: Escape closes the popup outright", async () => {
  const { body, canvas } = await mountStory(
    AttachedInputDrillDown,
  )

  const input = canvas.getByLabelText("Path")

  await userEvent.click(input)

  await waitFor(() => {
    expect(input).toHaveFocus()
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("listbox")).toBeNull()
  })

  // The consumer's input persists (Combobox never rendered it); it just
  // reports itself collapsed.
  await expect(input).toHaveAttribute(
    "aria-expanded",
    "false",
  )
})

test("the ✓ gutter is always laid out, only hidden when a row is unselected", async () => {
  const { body } = await mountStory(TrailingElement)

  const options = body.getAllByRole("option")

  // Every option — selected or not — renders the ✓ span, so the label's
  // width (and any trailing element it pins) never changes on selection.
  for (const option of options) {
    const check = option.querySelector(
      '[aria-hidden="true"]',
    )

    expect(check).not.toBeNull()
    expect(check).toHaveTextContent("✓")
  }

  // The pre-selected first row (English) shows its ✓; the rest keep the
  // gutter but mark it `invisible`.
  const selected = options.find((option: HTMLElement) =>
    option.textContent?.includes("English"),
  )

  expect(selected).toHaveAttribute("aria-selected", "true")

  expect(
    selected?.querySelector('[aria-hidden="true"]'),
  ).not.toHaveClass("invisible")

  const unselected = options.find((option: HTMLElement) =>
    option.textContent?.includes("Spanish"),
  )

  expect(unselected).toHaveAttribute(
    "aria-selected",
    "false",
  )

  expect(
    unselected?.querySelector('[aria-hidden="true"]'),
  ).toHaveClass("invisible")
})

test("a long footer is allowed to wrap rather than force the panel wide", async () => {
  const { body } = await mountStory(LongFooter)

  const footer = body.getByText(/BCP-47 language code/)

  // The footer container permits wrapping (paired with the panel's
  // `maxWidthPx` cap) instead of laying the sentence out on one line.
  expect(footer).toHaveClass("whitespace-normal")
  expect(footer).toHaveClass("break-words")
})

test("a windowed list carries aria-setsize and aria-posinset", async () => {
  const { body } = await mountStory(Virtualized)

  const options = body.getAllByRole("option")

  // Only a window of the 500 is in the DOM.
  await expect(options.length).toBeLessThan(500)

  await expect(options.length).toBeGreaterThan(0)

  // Each announces its place in the whole set, not the window.
  await expect(options[0]).toHaveAttribute(
    "aria-setsize",
    "500",
  )

  await expect(options[0]).toHaveAttribute("aria-posinset")
})

test("opening lands on the chosen option, not the top of the list", async () => {
  const mounted = await mountStory(ChosenValueOnOpen)

  await userEvent.click(
    expectAgentDrivable(mounted.canvas, {
      name: "Search languages",
      role: "button",
    }),
  )

  const input = expectAgentDrivable(mounted.body, {
    role: "combobox",
  })

  // Item 58 of 62, far past the panel's height cap — index 0 would be
  // the old behaviour, and a row still off screen would be the fix
  // landing only halfway.
  const chosen = mounted.body.getByRole("option", {
    name: "Item 58",
  })

  await waitFor(() => {
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      chosen.id,
    )
  })

  await expect(chosen).toHaveAttribute(
    "aria-selected",
    "true",
  )

  // The seed is the chosen row, not merely a non-zero index.
  await expect(
    mounted.body.getAllByRole("option")[0],
  ).toHaveAttribute("aria-selected", "false")
})

test("typing reseeds the highlight to the top match, not the chosen row", async () => {
  const mounted = await mountStory(ChosenValueOnOpen)

  await userEvent.click(
    expectAgentDrivable(mounted.canvas, {
      name: "Search languages",
      role: "button",
    }),
  )

  const input = expectAgentDrivable(mounted.body, {
    role: "combobox",
  })

  // Matches "Item 1", "Item 10"… — the open seed must not drag the
  // highlight down to the chosen row.
  await userEvent.type(input, "1")

  await waitFor(() => {
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      mounted.body.getAllByRole("option")[0]?.id,
    )
  })
})

test("reopening after a pick lands on what was just picked", async () => {
  const mounted = await mountStory(ChosenValueOnOpen)

  const trigger = expectAgentDrivable(mounted.canvas, {
    name: "Search languages",
    role: "button",
  })

  await userEvent.click(trigger)

  await userEvent.click(
    mounted.body.getByRole("option", { name: "Item 3" }),
  )

  await waitFor(() => {
    expect(mounted.body.queryByRole("combobox")).toBeNull()
  })

  await userEvent.click(trigger)

  const reopened = expectAgentDrivable(mounted.body, {
    role: "combobox",
  })

  await waitFor(() => {
    expect(reopened).toHaveAttribute(
      "aria-activedescendant",
      mounted.body.getByRole("option", { name: "Item 3" })
        .id,
    )
  })
})

test("a windowed list scrolls its chosen option into the window on open", async () => {
  const { body } = await mountStory(VirtualizedChosenValue)

  // Rows 1–12 would be the window if the seed were still index 0.
  await waitFor(() => {
    expect(
      body.getByRole("option", { name: "Track 400" }),
    ).toBeInTheDocument()
  })

  await expect(
    body.getByRole("option", { name: "Track 400" }),
  ).toHaveAttribute("aria-selected", "true")

  await expect(
    body.queryByRole("option", { name: "Track 1" }),
  ).toBeNull()
})

test("the chosen row is scrolled into view, not merely highlighted", async () => {
  const mounted = await mountStory(ChosenValueOnOpen)

  await userEvent.click(
    expectAgentDrivable(mounted.canvas, {
      name: "Search languages",
      role: "button",
    }),
  )

  const chosen = mounted.body.getByRole("option", {
    name: "Item 58",
  })

  // The panel's height cap is written imperatively by floating-ui's
  // `size` middleware, a frame after the open seed runs — so this is the
  // assertion the first version of this fix passed while the row sat off
  // screen in the real app. Highlighting it is not the same as showing
  // it.
  await waitFor(() => {
    const list = chosen.closest("[role=listbox]")

    expect(list).not.toBeNull()

    const listBox = (
      list as HTMLElement
    ).getBoundingClientRect()
    const rowBox = chosen.getBoundingClientRect()

    expect(rowBox.top).toBeGreaterThanOrEqual(listBox.top)
    expect(rowBox.bottom).toBeLessThanOrEqual(
      listBox.bottom,
    )
  })
})

test("reopening without picking still lands on the chosen row", async () => {
  const mounted = await mountStory(ChosenValueOnOpen)

  const trigger = expectAgentDrivable(mounted.canvas, {
    name: "Search languages",
    role: "button",
  })

  const isChosenRowInView = () => {
    const row = mounted.body.getByRole("option", {
      name: "Item 58",
    })

    const list = row.closest(
      "[role=listbox]",
    ) as HTMLElement

    const listBox = list.getBoundingClientRect()
    const rowBox = row.getBoundingClientRect()

    return (
      rowBox.top >= listBox.top &&
      rowBox.bottom <= listBox.bottom
    )
  }

  await userEvent.click(trigger)

  await waitFor(() => {
    expect(isChosenRowInView()).toBe(true)
  })

  // Close it the way a misclick-free dismissal does — no pick, so the
  // chosen value and therefore the seed index are both unchanged.
  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(mounted.body.queryByRole("combobox")).toBeNull()
  })

  await userEvent.click(trigger)

  // The seed must run again. It nearly did not: `activeIndex` already
  // held the seeded index from the first open, so setting it was a no-op
  // and the re-render the scroll rides on never happened.
  await waitFor(() => {
    expect(isChosenRowInView()).toBe(true)
  })
})

test("a windowed list reseeds its window on every open, not just the first", async () => {
  const mounted = await mountStory(VirtualizedChosenValue)

  const trigger = expectAgentDrivable(mounted.canvas, {
    name: "Search 500 tracks",
    role: "button",
  })

  // The story opens already showing the window around Track 400.
  await waitFor(() => {
    expect(
      mounted.body.getByRole("option", {
        name: "Track 400",
      }),
    ).toBeInTheDocument()
  })

  await userEvent.click(trigger)

  await waitFor(() => {
    expect(mounted.body.queryByRole("combobox")).toBeNull()
  })

  await userEvent.click(trigger)

  // Rows 1–12 would be the window if the seed had run only once.
  await waitFor(() => {
    expect(
      mounted.body.getByRole("option", {
        name: "Track 400",
      }),
    ).toBeInTheDocument()
  })

  await expect(
    mounted.body.queryByRole("option", { name: "Track 1" }),
  ).toBeNull()
})

/**
 * One panel, one row size.
 *
 * The owner's report was that the search field was visibly bigger
 * than the options it filters — *"the button is huge, but the options
 * don't match it"* — and two sizes inside one panel is the defect,
 * not the field being wrong or the option being wrong. `itemSize`
 * drives both, so this measures the pair rather than either number.
 */
test("the search row and an option are the same height", async () => {
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Search languages",
      role: "button",
    }),
  )

  const input = body.getByRole("combobox")

  await waitFor(() => {
    expect(input).toHaveFocus()
  })

  // The row is the input's *parent*: the input itself is a bare
  // `flex-1` field, and the box that carries the row-size class — the
  // height, the inline padding, the type — is the wrapper around it.
  const searchRow = input.closest("div")

  const [option] = body.getAllByRole("option")

  expect(option).toBeDefined()

  expect(searchRow?.getBoundingClientRect().height).toBe(
    option?.getBoundingClientRect().height,
  )

  // And the query reads at the size of the options it is filtering,
  // which is inherited from that wrapper rather than set on the input.
  expect(globalThis.getComputedStyle(input).fontSize).toBe(
    globalThis.getComputedStyle(option as HTMLElement)
      .fontSize,
  )
})
