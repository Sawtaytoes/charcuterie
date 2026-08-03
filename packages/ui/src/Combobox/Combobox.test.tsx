import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Combobox.stories.tsx"

const { Default, Interactive, Virtualized } =
  composeStories(stories)

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
