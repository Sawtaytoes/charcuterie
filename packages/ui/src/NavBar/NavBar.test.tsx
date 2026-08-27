import { composeStories } from "@storybook/react"
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
import * as stories from "./NavBar.stories.tsx"

const {
  AllStates,
  AllVariants,
  Default,
  InAppShell,
  Interactive,
} = composeStories(stories)

test("the nav is named, and its destinations are links", async () => {
  const { canvas } = await mountStory(Default)

  const nav = expectAgentDrivable(canvas, {
    name: "Main",
    role: "navigation",
  })

  const board = expectAgentDrivable(within(nav), {
    name: "Board",
    role: "link",
  })

  // A `<button onClick={navigate}>` looks identical in a screenshot
  // and satisfies "the nav works". It has no `href`, so middle-click,
  // ctrl-click and "copy link address" all do nothing.
  await expect(board).toHaveAttribute("href", "/board")

  await expectNoAxeViolations(nav)
})

/**
 * The trigger exists **only when the row did not fit**. mux-magic
 * shows its overflow glyph at every width, which is why its collapse
 * is not a collapse at all — almost everything lives behind the
 * button permanently.
 */
test("a bar with room shows no menu trigger", async () => {
  const { canvas } = await mountStory(Default)

  const nav = expectAgentDrivable(canvas, {
    name: "Main",
    role: "navigation",
  })

  await waitFor(() => {
    expect(
      within(nav).queryByRole("button", {
        name: "Main menu",
      }),
    ).toBeNull()
  })

  await expect(
    within(nav).getAllByRole("link"),
  ).toHaveLength(9)
})

/**
 * All or nothing — the decision this component exists to hold.
 *
 * `Toolbar` would leave four of the nine in the bar at this width
 * and put five behind the button, which splits the product's own
 * order across two places with no rule the reader can learn.
 */
test("a bar that does not fit folds every destination together", async () => {
  const { canvas } = await mountStory(AllVariants)

  const nav = expectAgentDrivable(canvas, {
    name: "Main, narrow",
    role: "navigation",
  })

  expectAgentDrivable(within(nav), {
    name: "Main menu",
    role: "button",
  })

  // Not "fewer links" — no links.
  await waitFor(() => {
    expect(within(nav).queryAllByRole("link")).toHaveLength(
      0,
    )
  })
})

/**
 * The defect this component refuses to introduce, and the reason it
 * is not a folded `Toolbar`: `MenuItem` is `{ label, onSelect }`, so
 * every row in the panel would be a `<button>` — no new tab, no
 * status bar, nothing to copy.
 */
test("a folded destination is still a real link", async () => {
  const { body } = await mountStory(AllStates)

  const panel = expectAgentDrivable(body, {
    name: "Main menu",
    role: "dialog",
  })

  const archives = expectAgentDrivable(within(panel), {
    name: "Archives",
    role: "link",
  })

  await expect(archives).toHaveAttribute(
    "href",
    "/archives",
  )

  // The complete list, in the product's order — a folded nav is not
  // an abridged one.
  await expect(
    within(panel)
      .getAllByRole("link")
      .map((link) => link.textContent),
  ).toEqual([
    "Triage",
    "Backlog",
    "Phases",
    "Lanes",
    "Board",
    "Archives",
    "Tonight",
    "Chats",
    "Settings",
  ])
})

/**
 * The fleet's habit is to render the nav twice and hide one copy
 * with `hidden md:flex` — so every link is in the DOM at every
 * width, and an agent driving the page finds two of each with no way
 * to tell which one a human can see.
 */
test("a destination is mounted exactly once", async () => {
  const { body, canvas } = await mountStory(AllStates)

  const nav = expectAgentDrivable(canvas, {
    name: "Main, folded and open",
    role: "navigation",
  })

  await expect(
    within(nav).queryAllByRole("link"),
  ).toHaveLength(0)

  await waitFor(() => {
    expect(
      within(
        body.getByRole("dialog", { name: "Main menu" }),
      ).getAllByRole("link", { name: "Chats" }),
    ).toHaveLength(1)
  })
})

/**
 * A highlight is invisible to a screen reader and to anyone who
 * cannot separate the two surfaces, so the current destination says
 * so in the platform's own words — and exactly one does.
 */
test("the current destination is marked, and only it", async () => {
  const { canvas } = await mountStory(AllStates)

  const nav = expectAgentDrivable(canvas, {
    name: "Main, current in bar",
    role: "navigation",
  })

  await expect(
    within(nav)
      .getAllByRole("link")
      .filter(
        (link) =>
          link.getAttribute("aria-current") === "page",
      )
      .map((link) => link.textContent),
  ).toEqual(["Board"])
})

/**
 * `/tasks/41` belongs to no destination, and the honest answer is
 * that none is current. react-router's `<NavLink to="/">` would mark
 * the root here unless the caller remembered `end`.
 */
test("a route no destination owns marks nothing", async () => {
  const { canvas } = await mountStory(AllStates)

  const nav = expectAgentDrivable(canvas, {
    name: "Main, nothing current",
    role: "navigation",
  })

  await expect(
    within(nav)
      .getAllByRole("link")
      .filter((link) => link.hasAttribute("aria-current")),
  ).toHaveLength(0)
})

/**
 * The trigger advertises what it opens, and gets focus back when it
 * closes — both from `useRole` and `FloatingFocusManager` inside
 * `Popover`, so neither can be forgotten here.
 */
test("the trigger advertises the panel it opens", async () => {
  const { body, canvas } = await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Main menu",
    role: "button",
  })

  await expect(trigger).toHaveAttribute(
    "aria-expanded",
    "false",
  )

  await expect(trigger).toHaveAttribute(
    "aria-haspopup",
    "dialog",
  )

  await userEvent.click(trigger)

  await expect(trigger).toHaveAttribute(
    "aria-expanded",
    "true",
  )

  const panel = expectAgentDrivable(body, {
    name: "Main menu",
    role: "dialog",
  })

  await waitFor(() => {
    expect(panel).toContainElement(
      document.activeElement as HTMLElement,
    )
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(trigger).toHaveFocus()
  })
})

/**
 * Choosing a destination closes the menu behind you — the one
 * interaction people read as "it didn't work" when it is missing.
 */
test("following a link in the panel closes it", async () => {
  const { body, canvas } = await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Main menu",
    role: "button",
  })

  await userEvent.click(trigger)

  const panel = expectAgentDrivable(body, {
    name: "Main menu",
    role: "dialog",
  })

  await userEvent.click(
    within(panel).getByRole("link", { name: "Phases" }),
  )

  await waitFor(() => {
    expect(
      body.queryByRole("dialog", { name: "Main menu" }),
    ).toBeNull()
  })
})

test("the folded nav audits clean while open", async () => {
  const { canvasElement } = await mountStory(AllStates)

  await expectNoAxeViolations(canvasElement)

  // The panel is portalled out of the canvas, so the resting audit
  // above cannot see it — an overflow audited only while shut is an
  // overflow nobody audited.
  await expectNoAxeViolations(document.body)
})

/**
 * Where it actually goes. `Header`'s row is what sizes the bar; the
 * bar measures that box to decide what to draw in it.
 */
test("the shell mounts exactly one nav", async () => {
  const { canvas } = await mountStory(InAppShell)

  await expect(
    canvas.getAllByRole("navigation", { name: "Main" }),
  ).toHaveLength(1)
})
