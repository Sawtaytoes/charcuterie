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
  Default,
  DisabledFirstOption,
  Interactive,
  Virtualized,
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

  await userEvent.click(
    body.getByRole("button", { name: "Remove eng" }),
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
