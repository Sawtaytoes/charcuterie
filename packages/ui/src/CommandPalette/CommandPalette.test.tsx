import { composeStories } from "@storybook/react"
import {
  expect,
  userEvent,
  waitFor,
  within,
} from "storybook/test"
import { afterEach, test, vi } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./CommandPalette.stories.tsx"

const {
  AllStates,
  Interactive,
  OpenFiltered,
  OpenPrefixCommand,
  Playground,
  Responsive,
} = composeStories(stories)

const PALETTE_NAME = "Search apps, bookmarks, and the web"

type Queries = ReturnType<typeof within>

const findPalette = (body: Queries) =>
  waitFor(() =>
    expectAgentDrivable(body, {
      name: PALETTE_NAME,
      role: "dialog",
    }),
  )

const getField = (palette: HTMLElement) =>
  within(palette).getByRole("combobox", {
    name: PALETTE_NAME,
  })

const getOptionNames = (palette: HTMLElement) =>
  within(palette)
    .queryAllByRole("option")
    .map((option) => option.getAttribute("id") ?? "")
    .map(
      (id) =>
        document
          .getElementById(id)
          ?.querySelector("span:not([aria-hidden]) > span")
          ?.textContent ?? "",
    )

const getActiveOption = (palette: HTMLElement) => {
  const id = getField(palette).getAttribute(
    "aria-activedescendant",
  )

  return id === null ? null : document.getElementById(id)
}

const getGroupNames = (palette: HTMLElement) =>
  within(palette)
    .queryAllByRole("group")
    .map((group) => {
      const headingId =
        group.getAttribute("aria-labelledby") ?? ""

      return document.getElementById(headingId)?.textContent
    })

afterEach(() => {
  vi.restoreAllMocks()
})

test("it opens listing the suggestions before anything is typed", async () => {
  const { body } = await mountStory(Responsive)

  const palette = await findPalette(body)
  const field = getField(palette)

  await waitFor(() => {
    expect(field).toHaveFocus()
  })

  await expect(field).toHaveValue("")
  await expect(field).toHaveAttribute(
    "aria-expanded",
    "true",
  )
  await expect(field).toHaveAttribute(
    "aria-autocomplete",
    "list",
  )

  const listbox = within(palette).getByRole("listbox", {
    name: PALETTE_NAME,
  })

  await expect(field).toHaveAttribute(
    "aria-controls",
    listbox.id,
  )

  // The owner's complaint about the old launcher was exactly the
  // opposite: "nothing appears when you press it."
  await expect(getGroupNames(palette)).toStrictEqual([
    "Pinned",
    "Recently opened",
  ])
  await expect(getOptionNames(palette)).toStrictEqual([
    "Home Automation",
    "Media Server",
    "Task Board",
    "Weather Forecast",
    "Storage Server",
    "Photo Library",
  ])

  // The first row is active, and the field says so.
  const active = getActiveOption(palette)

  await expect(active).toHaveAttribute(
    "aria-selected",
    "true",
  )
  await expect(active).toHaveTextContent("Home Automation")

  await expectNoAxeViolations(palette)
})

test("typing filters by word prefix, groups the matches, and ends with the fallback", async () => {
  const { body } = await mountStory(Responsive)

  const palette = await findPalette(body)

  await userEvent.type(getField(palette), "serv")

  await waitFor(() => {
    expect(getGroupNames(palette)).toStrictEqual([
      "Apps",
      "The web",
    ])
  })

  // `Media Server` and `Storage Server` match on their second word;
  // the higher weight comes first. `Reverse Proxy Manager` has `serv`
  // inside a word and does not match.
  await expect(getOptionNames(palette)).toStrictEqual([
    "Media Server",
    "Storage Server",
    "Search the web for “serv”",
  ])

  const marks = palette.querySelectorAll("mark")

  await expect(
    [...marks].map((mark) => mark.textContent),
  ).toStrictEqual(["Serv", "Serv"])

  await expectNoAxeViolations(palette)
})

test("initials, folder names and keywords all match", async () => {
  const { body } = await mountStory(Responsive)

  const palette = await findPalette(body)
  const field = getField(palette)

  await userEvent.type(field, "ha")

  await waitFor(() => {
    expect(getOptionNames(palette)[0]).toBe(
      "Home Automation",
    )
  })

  await userEvent.clear(field)
  await userEvent.type(field, "remotes")

  // Folder members: the folder is the description, so the row still
  // says where the item lives.
  await waitFor(() => {
    expect(getOptionNames(palette)).toStrictEqual([
      "Living Room Remote",
      "Bedroom Remote",
      "Search the web for “remotes”",
    ])
  })

  await expect(
    within(palette).getByRole("option", {
      name: /Living Room Remote Remotes/,
    }),
  ).toBeInTheDocument()

  await userEvent.clear(field)
  await userEvent.type(field, "parcels")

  await waitFor(() => {
    expect(getOptionNames(palette)[0]).toBe(
      "Package Tracking",
    )
  })
})

test("a prefix command lists one row that sends the rest of the query to its target", async () => {
  const { body } = await mountStory(OpenPrefixCommand)

  const palette = await findPalette(body)

  await expect(getField(palette)).toHaveValue("au lego")
  await expect(getGroupNames(palette)).toStrictEqual([
    "Search a site",
  ])

  const row = within(palette).getByRole("option", {
    name: "Search Auction Site for “lego”",
  })

  await expect(row).toHaveAttribute(
    "href",
    "https://auction.example.com/search?q=lego",
  )
  await expect(row).toHaveAttribute("aria-selected", "true")

  await expectNoAxeViolations(palette)
})

test("the arrow keys, Home and End move the active row, and the pointer does too", async () => {
  const { body } = await mountStory(Responsive)

  const palette = await findPalette(body)
  const options = within(palette).getAllByRole("option")
  const last = options.length - 1

  await userEvent.keyboard("{ArrowUp}")
  await expect(getActiveOption(palette)).toBe(options[0])

  await userEvent.keyboard("{ArrowDown}{ArrowDown}")
  await expect(getActiveOption(palette)).toBe(options[2])
  await expect(options[2]).toHaveAttribute(
    "aria-selected",
    "true",
  )
  await expect(options[0]).toHaveAttribute(
    "aria-selected",
    "false",
  )

  await userEvent.keyboard("{End}")
  await expect(getActiveOption(palette)).toBe(options[last])

  await userEvent.keyboard("{ArrowDown}")
  await expect(getActiveOption(palette)).toBe(options[last])

  await userEvent.keyboard("{Home}")
  await expect(getActiveOption(palette)).toBe(options[0])

  const pointedAt = options[3]

  if (pointedAt === undefined) {
    throw new Error("The fixture has fewer than four rows")
  }

  await userEvent.hover(pointedAt)
  await expect(getActiveOption(palette)).toBe(pointedAt)

  // Focus never left the field.
  await expect(getField(palette)).toHaveFocus()
})

test("Enter opens a link row the way a click would, and the palette closes", async () => {
  const { body } = await mountStory(OpenFiltered)

  const palette = await findPalette(body)

  const clickedHrefs: string[] = []

  // The rows link to `example.com`; keep the test page where it is.
  const stopNavigation = (event: MouseEvent) => {
    const anchor = (event.target as Element).closest("a")

    if (anchor !== null) {
      clickedHrefs.push(anchor.href)
      event.preventDefault()
    }
  }

  document.addEventListener("click", stopNavigation, true)

  try {
    await waitFor(() => {
      expect(getField(palette)).toHaveFocus()
    })

    await userEvent.keyboard("{ArrowDown}{Enter}")

    await expect(clickedHrefs).toStrictEqual([
      "https://storage.example.com/",
    ])

    await waitFor(() => {
      expect(body.queryByRole("dialog")).toBeNull()
    })
  } finally {
    document.removeEventListener(
      "click",
      stopNavigation,
      true,
    )
  }
})

test("Ctrl Enter opens a link row in a new tab", async () => {
  const openSpy = vi
    .spyOn(window, "open")
    .mockImplementation(() => null)

  const { body } = await mountStory(OpenPrefixCommand)

  const palette = await findPalette(body)

  await waitFor(() => {
    expect(getField(palette)).toHaveFocus()
  })

  await userEvent.keyboard("{Control>}{Enter}{/Control}")

  await expect(openSpy).toHaveBeenCalledWith(
    "https://auction.example.com/search?q=lego",
    "_blank",
    "noopener,noreferrer",
  )

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })
})

test("Enter runs an onSelect row, closes, and gives focus back", async () => {
  const { body, canvas } = await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Search",
    role: "button",
  })

  await userEvent.click(trigger)

  const palette = await findPalette(body)

  await waitFor(() => {
    expect(getField(palette)).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowDown}{Enter}")

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  await expect(
    canvas.getByText("Last chosen: Media Server"),
  ).toBeInTheDocument()

  await waitFor(() => {
    expect(trigger).toHaveFocus()
  })
})

test("a click on a row chooses it", async () => {
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    canvas.getByRole("button", { name: "Search" }),
  )

  const palette = await findPalette(body)

  await userEvent.click(
    within(palette).getByRole("option", {
      name: /^Task Board/,
    }),
  )

  await waitFor(() => {
    expect(body.queryByRole("dialog")).toBeNull()
  })

  await expect(
    canvas.getByText("Last chosen: Task Board"),
  ).toBeInTheDocument()
})

test("Ctrl K, Ctrl Space and / open it empty; Escape closes it", async () => {
  const { body } = await mountStory(Interactive)

  for (const chord of [
    "{Control>}k{/Control}",
    "{Control>} {/Control}",
    "/",
  ]) {
    await userEvent.keyboard(chord)

    const palette = await findPalette(body)

    await waitFor(() => {
      expect(getField(palette)).toHaveFocus()
    })

    // The key that opened it typed nothing.
    await expect(getField(palette)).toHaveValue("")

    await userEvent.keyboard("{Escape}")

    await waitFor(() => {
      expect(body.queryByRole("dialog")).toBeNull()
    })
  }
})

test("typing a letter on the page opens it with that letter as the query", async () => {
  const { body } = await mountStory(Interactive)

  await userEvent.keyboard("m")

  const palette = await findPalette(body)
  const field = getField(palette)

  await waitFor(() => {
    expect(field).toHaveFocus()
  })

  await expect(field).toHaveValue("m")

  // The caret is after the letter, so the next key extends the query.
  await userEvent.keyboard("edia")

  await expect(field).toHaveValue("media")

  await waitFor(() => {
    expect(getOptionNames(palette)[0]).toBe("Media Server")
  })
})

test("a text field on the page keeps its keys", async () => {
  const { body, canvas } = await mountStory(Interactive)

  const note = canvas.getByRole("textbox", {
    name: "A note on the page",
  })

  await userEvent.click(note)
  await userEvent.keyboard("m/")

  await expect(note).toHaveValue("m/")
  await expect(body.queryByRole("dialog")).toBeNull()

  // The chord still works from inside it: it types nothing.
  await userEvent.keyboard("{Control>}k{/Control}")

  await findPalette(body)
  await expect(note).toHaveValue("m/")
})

test("the clear button empties the query and keeps focus in the field", async () => {
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    canvas.getByRole("button", { name: "Search" }),
  )

  const palette = await findPalette(body)
  const field = getField(palette)

  await userEvent.type(field, "zebra")

  await userEvent.click(
    within(palette).getByRole("button", {
      name: "Clear search",
    }),
  )

  await expect(field).toHaveValue("")
  await expect(field).toHaveFocus()
  await expect(getGroupNames(palette)).toStrictEqual([
    "Pinned",
    "Recently opened",
  ])
})

test("a query with no match and no fallback says so, and has no listbox", async () => {
  const { canvas } = await mountStory(AllStates)

  const field = canvas.getByRole("combobox", {
    name: "No matches",
  })

  await expect(field).toHaveAttribute(
    "aria-expanded",
    "false",
  )
  await expect(field).not.toHaveAttribute("aria-controls")

  const panel = field.closest(".flex-col") as HTMLElement

  await expect(
    within(panel).getByText("No matches"),
  ).toBeInTheDocument()
  await expect(
    within(panel).queryByRole("listbox"),
  ).toBeNull()
})

test("it hangs from the top on a wide window and fills the Narrow View", async () => {
  const { body } = await mountStory(Responsive)

  const palette = await findPalette(body)
  const box = palette.getBoundingClientRect()
  const { innerHeight, innerWidth } = window

  // The `sm` breakpoint, 40rem: the Narrow View.
  if (innerWidth < 640) {
    await expect(box.width).toBeGreaterThanOrEqual(
      innerWidth - 20,
    )
    await expect(box.height).toBeGreaterThanOrEqual(
      innerHeight * 0.9,
    )

    return
  }

  await expect(box.width).toBeLessThanOrEqual(720 + 1)
  await expect(box.width).toBeGreaterThan(
    Math.min(innerWidth - 40, 720) - 1,
  )
  await expect(box.top).toBeCloseTo(innerHeight * 0.12, -1)
  await expect(box.bottom).toBeLessThanOrEqual(innerHeight)
})

test("the playground opens from its button", async () => {
  const { body, canvas } = await mountStory(Playground)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Search",
      role: "button",
    }),
  )

  await findPalette(body)
})
