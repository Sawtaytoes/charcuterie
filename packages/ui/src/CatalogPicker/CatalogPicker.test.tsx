import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./CatalogPicker.stories.tsx"

const {
  AllStates,
  Interactive,
  Playground,
  Responsive,
  WithoutFavorites,
} = composeStories(stories)

type MountableStory = Parameters<typeof mountStory>[0]

/** Open a story's picker by its trigger name and wait for the search field to take focus. */
const openPicker = async (
  story: MountableStory,
  triggerName: string,
) => {
  const mounted = await mountStory(story)

  const trigger = expectAgentDrivable(mounted.canvas, {
    name: triggerName,
    role: "button",
  })

  await userEvent.click(trigger)

  const input = expectAgentDrivable(mounted.body, {
    role: "combobox",
  })

  await waitFor(() => {
    expect(input).toHaveFocus()
  })

  const dialog = expectAgentDrivable(mounted.body, {
    role: "dialog",
  })

  return { ...mounted, dialog, input, trigger }
}

const optionNames = (listbox: HTMLElement) =>
  Array.from(
    listbox.querySelectorAll<HTMLElement>("[role=option]"),
  ).map((option) => (option.textContent ?? "").trim())

const railButton = (
  body: Parameters<typeof expectAgentDrivable>[0],
  name: string,
) =>
  expectAgentDrivable(body, {
    name,
    role: "button",
  })

test("the trigger is named by its label and the chosen item, and opens a dialog", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)

  const trigger = expectAgentDrivable(canvas, {
    name: "Agent: Lumen 4",
    role: "button",
  })

  await expect(trigger).toHaveAttribute(
    "aria-haspopup",
    "dialog",
  )
  await expect(trigger).toHaveAttribute(
    "aria-expanded",
    "false",
  )

  await expectNoAxeViolations(canvasElement)
})

test("opening on a favorite lands on Favorites with the chosen row active", async () => {
  const { body, dialog, input } = await openPicker(
    Playground,
    "Agent: Lumen 4",
  )

  await expect(dialog).toHaveAccessibleName(
    "Agent: Lumen 4",
  )

  await expect(
    railButton(body, "Favorites"),
  ).toHaveAttribute("aria-pressed", "true")

  const listbox = expectAgentDrivable(body, {
    name: "Agent",
    role: "listbox",
  })

  await expect(input).toHaveAttribute(
    "aria-controls",
    listbox.id,
  )

  // Favorites order, framed by the pinned rows, and the Contoso
  // (Work) favorite is its own row.
  await expect(optionNames(listbox)).toEqual([
    "DefaultWhatever the app picks",
    "Lumen 4ct-lumen-4",
    "Swift 3nw-swift-3",
    "Lumen 4Work account",
    // "TL" is Tailspin Labs' initials badge: decorative, so in the
    // text but not in the accessible name.
    "TLGlide 2ts-glide-2",
    "Choose per taskAsk every time",
  ])

  const chosen = body.getAllByRole("option", {
    selected: true,
  })

  await expect(chosen).toHaveLength(1)
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    chosen[0]?.id,
  )

  await expectNoAxeViolations(dialog)
})

test("opening on a non-favorite lands on its group and centres the chosen row", async () => {
  const { body, input } = await openPicker(
    Interactive,
    "Agent: Harbor 4",
  )

  await expect(
    railButton(body, "Northwind"),
  ).toHaveAttribute("aria-pressed", "true")
  await expect(
    railButton(body, "Favorites"),
  ).toHaveAttribute("aria-pressed", "false")

  const chosen = body.getByRole("option", {
    selected: true,
  })

  await expect(chosen).toHaveTextContent("Harbor 4")
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    chosen.id,
  )

  // Highlighting it is not showing it: the row must be inside the
  // list's visible box once the panel's height cap has landed.
  await waitFor(() => {
    const listBox = (
      chosen.closest("[role=listbox]") as HTMLElement
    ).getBoundingClientRect()
    const rowBox = chosen.getBoundingClientRect()

    expect(rowBox.top).toBeGreaterThanOrEqual(
      listBox.top - 1,
    )
    expect(rowBox.bottom).toBeLessThanOrEqual(
      listBox.bottom + 1,
    )
  })
})

test("without favorites there is no Favorites tab, and a group with no rows is left off", async () => {
  const { body } = await openPicker(
    WithoutFavorites,
    "Agent without favorites: Margin 2",
  )

  await expect(
    body.queryByRole("button", { name: "Favorites" }),
  ).toBeNull()
  await expect(
    body.queryByRole("button", { name: "Adatum" }),
  ).toBeNull()

  await expect(railButton(body, "Litware")).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  const toolbar = expectAgentDrivable(body, {
    name: "Agent without favorites groups",
    role: "toolbar",
  })

  await expect(toolbar).toHaveAttribute(
    "aria-orientation",
    "vertical",
  )
  await expect(
    Array.from(
      toolbar.querySelectorAll("button"),
      (button) => button.getAttribute("aria-label"),
    ),
  ).toEqual([
    "Northwind",
    "Contoso",
    "Contoso (Work)",
    "Fabrikam",
    "Tailspin Labs",
    "Litware",
  ])
})

test("a rail click shows that group, pinned rows included, and keeps focus in the search", async () => {
  const { body, input } = await openPicker(
    Playground,
    "Agent: Lumen 4",
  )

  await userEvent.click(railButton(body, "Fabrikam"))

  await waitFor(() => {
    expect(railButton(body, "Fabrikam")).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  await expect(input).toHaveFocus()

  const names = optionNames(body.getByRole("listbox"))

  await expect(names[0]).toMatch(/^Default/u)
  await expect(names.at(-1)).toMatch(/^Choose per task/u)
  await expect(names).toHaveLength(9)
  await expect(
    body.getByRole("option", {
      name: /Loom 5 \(retired\)/u,
    }),
  ).toBeDisabled()
})

test("typing searches every group under headings, and no tab is current", async () => {
  const { body, input } = await openPicker(
    Playground,
    "Agent: Lumen 4",
  )

  await userEvent.keyboard("LUMEN")

  await waitFor(() => {
    expect(body.getAllByRole("group")).toHaveLength(2)
  })

  const groups = body.getAllByRole("group")

  await expect(groups[0]).toHaveAccessibleName("Contoso")
  await expect(groups[1]).toHaveAccessibleName(
    "Contoso (Work)",
  )
  await expect(body.getAllByRole("option")).toHaveLength(6)

  for (const button of Array.from(
    body.getByRole("toolbar").querySelectorAll("button"),
  )) {
    await expect(button).toHaveAttribute(
      "aria-pressed",
      "false",
    )
  }

  // A live query owns the highlight: the top match, not the chosen row.
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    body.getAllByRole("option")[0]?.id,
  )

  await expectNoAxeViolations(body.getByRole("dialog"))
})

test("every word must match, against the label, the description, or the group", async () => {
  const { body } = await openPicker(
    Playground,
    "Agent: Lumen 4",
  )

  // "work" is the Work account's description and group label; the
  // plain Contoso rows have neither.
  await userEvent.keyboard("work   lumen")

  await waitFor(() => {
    expect(body.getAllByRole("option")).toHaveLength(3)
  })

  await expect(
    body.getByRole("group"),
  ).toHaveAccessibleName("Contoso (Work)")

  await userEvent.clear(body.getByRole("combobox"))
  await userEvent.keyboard("litware")

  await waitFor(() => {
    expect(body.getAllByRole("option")).toHaveLength(5)
  })

  await userEvent.clear(body.getByRole("combobox"))
  await userEvent.keyboard("default")

  // A pinned row matches like any other, outside every group.
  await waitFor(() => {
    expect(optionNames(body.getByRole("listbox"))).toEqual([
      "DefaultWhatever the app picks",
    ])
  })
  await expect(body.queryAllByRole("group")).toHaveLength(0)
})

test("a search with no match shows the empty label", async () => {
  const { body, input } = await openPicker(
    Playground,
    "Agent: Lumen 4",
  )

  await userEvent.keyboard("zzz")

  await waitFor(() => {
    expect(body.getByText("No matches")).toBeVisible()
  })

  await expect(body.queryByRole("listbox")).toBeNull()
  await expect(input).toHaveAttribute(
    "aria-expanded",
    "false",
  )
  await expect(input).not.toHaveAttribute(
    "aria-activedescendant",
  )
})

test("the arrows skip a disabled row, and Home and End jump", async () => {
  const { body, input } = await openPicker(
    Playground,
    "Agent: Lumen 4",
  )

  await userEvent.click(railButton(body, "Fabrikam"))

  const option = (name: RegExp) =>
    body.getByRole("option", { name })

  await userEvent.keyboard("{End}")

  await waitFor(() => {
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      option(/^Choose per task/u).id,
    )
  })

  // Up from the last row passes over the disabled "Loom 5 (retired)".
  await userEvent.keyboard("{ArrowUp}")

  await waitFor(() => {
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      option(/^Spindle Vision/u).id,
    )
  })

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      option(/^Choose per task/u).id,
    )
  })

  await userEvent.keyboard("{Home}")

  await waitFor(() => {
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      option(/^Default/u).id,
    )
  })
})

test("Enter chooses the active row, closes, and returns focus to the trigger", async () => {
  const { body, canvas, input } = await openPicker(
    Interactive,
    "Agent: Harbor 4",
  )

  await userEvent.keyboard("weave 1")

  await waitFor(() => {
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      body.getByRole("option", { name: /^Weave Code 1/u })
        .id,
    )
  })

  await userEvent.keyboard("{Enter}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  const trigger = expectAgentDrivable(canvas, {
    name: "Agent: Weave Code 1",
    role: "button",
  })

  await waitFor(() => {
    expect(trigger).toHaveFocus()
  })
})

test("a click on a row chooses it and closes", async () => {
  const { body, canvas } = await openPicker(
    Interactive,
    "Agent: Harbor 4",
  )

  await userEvent.click(
    body.getByRole("option", {
      name: /^Atlas 2 Reasoning/u,
    }),
  )

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  expectAgentDrivable(canvas, {
    name: "Agent: Atlas 2 Reasoning",
    role: "button",
  })
})

test("Escape clears the query first, then closes and returns focus to the trigger", async () => {
  const { body, input, trigger } = await openPicker(
    Interactive,
    "Agent: Harbor 4",
  )

  await userEvent.keyboard("glide")

  await expect(input).toHaveValue("glide")

  await userEvent.keyboard("{Escape}")

  await expect(input).toHaveValue("")
  await expect(body.getByRole("dialog")).toBeInTheDocument()

  // The view is the tab again, not the search.
  await waitFor(() => {
    expect(railButton(body, "Northwind")).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  await waitFor(() => {
    expect(trigger).toHaveFocus()
  })
})

test("Tab moves between the search and the rail, where the arrows choose a group", async () => {
  const { body, input } = await openPicker(
    Interactive,
    "Agent: Harbor 4",
  )

  await userEvent.keyboard("{Tab}")

  // The rail is one tab stop, and it is the current tab.
  await waitFor(() => {
    expect(railButton(body, "Northwind")).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(railButton(body, "Contoso")).toHaveFocus()
  })

  // Moving focus does not press it; Enter does.
  await expect(railButton(body, "Contoso")).toHaveAttribute(
    "aria-pressed",
    "false",
  )

  await userEvent.keyboard("{End}")

  await waitFor(() => {
    expect(railButton(body, "Litware")).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowDown}")

  // Wraps.
  await waitFor(() => {
    expect(railButton(body, "Favorites")).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}")

  await waitFor(() => {
    expect(railButton(body, "Contoso")).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  await expect(
    optionNames(body.getByRole("listbox")),
  ).toContain("Prism 2 Fastct-prism-2-fast")

  await userEvent.keyboard("{Tab}")

  await waitFor(() => {
    expect(input).toHaveFocus()
  })

  await userEvent.keyboard("{Shift>}{Tab}{/Shift}")

  await waitFor(() => {
    expect(railButton(body, "Contoso")).toHaveFocus()
  })

  // Escape from the rail closes too.
  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })
})

test("the panel fits the window, rail and all", async () => {
  const { body, dialog } = await openPicker(
    Interactive,
    "Agent: Harbor 4",
  )

  await waitFor(() => {
    const box = dialog.getBoundingClientRect()

    expect(box.left).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    )
    expect(box.bottom).toBeLessThanOrEqual(
      window.innerHeight,
    )
  })

  const toolbarBox = body
    .getByRole("toolbar")
    .getBoundingClientRect()
  const listBox = body
    .getByRole("listbox")
    .getBoundingClientRect()

  await expect(toolbarBox.width).toBeGreaterThan(0)
  // The list keeps a usable width beside the rail.
  await expect(listBox.width).toBeGreaterThan(200)
  await expect(listBox.left).toBeGreaterThanOrEqual(
    toolbarBox.right - 1,
  )
})

test("a disabled picker does not open", async () => {
  const { body, canvas } = await mountStory(AllStates)

  const trigger = expectAgentDrivable(canvas, {
    name: "Disabled agent: Lumen 4",
    role: "button",
  })

  await expect(trigger).toBeDisabled()

  await userEvent.click(trigger, { pointerEventsCheck: 0 })

  await expect(body.queryAllByRole("dialog")).toHaveLength(
    0,
  )
})

test("the inline board names each panel and has no axe issues", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  expectAgentDrivable(canvas, {
    name: "Search panel",
    role: "combobox",
  })
  expectAgentDrivable(canvas, {
    name: "Empty panel groups",
    role: "toolbar",
  })

  await expectNoAxeViolations(canvasElement)
})

test("a stretched trigger keeps the chevron inside and ends a long name in an ellipsis", async () => {
  const { canvas } = await mountStory(Responsive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Long agent at 15rem: Tailwind Research Preview With A Very Long Name",
    role: "button",
  })

  const triggerBox = trigger.getBoundingClientRect()
  const chevronBox = (
    trigger.querySelector("svg:last-of-type") as SVGElement
  ).getBoundingClientRect()

  await expect(trigger.scrollWidth).toBe(
    trigger.clientWidth,
  )
  await expect(chevronBox.right).toBeLessThanOrEqual(
    triggerBox.right,
  )
})
