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
import * as stories from "./Nav.stories.tsx"

const { AllStates, AllVariants, Default, Interactive } =
  composeStories(stories)

test("the destinations are a named navigation landmark", async () => {
  const { canvas } = await mountStory(Default)

  const nav = expectAgentDrivable(canvas, {
    name: "Main",
    role: "navigation",
  })

  await expectNoAxeViolations(nav)
})

/**
 * The whole reason this component exists rather than a row of
 * buttons. A `<button onClick={navigate}>` is indistinguishable from
 * this in a screenshot and loses middle-click, ctrl-click, "open in
 * a new tab", the status bar, and "copy link address".
 */
test("every destination is a real link with an href", async () => {
  const { canvas } = await mountStory(Default)

  const links = canvas.getAllByRole("link")

  expect(links.length).toBe(5)

  for (const link of links) {
    expect(link).toHaveAttribute("href")
  }
})

test("the current destination is announced, not only coloured", async () => {
  const { canvas } = await mountStory(Default)

  const current = canvas.getByRole("link", {
    name: "Library",
  })

  expect(current).toHaveAttribute("aria-current", "page")

  // And exactly one of them. Two current pages is the same defect as
  // none, one screen reader announcement later.
  expect(
    canvas
      .getAllByRole("link")
      .filter(
        (link: HTMLElement) =>
          link.getAttribute("aria-current") === "page",
      ),
  ).toHaveLength(1)
})

/**
 * A collapsed rail shows a glyph and nothing else. The label has to
 * survive into the accessible tree or the whole column is unnamed —
 * and this is the state where `NavItem.icon` being required stops
 * being pedantry.
 */
test("a collapsed rail keeps every destination's name", async () => {
  const { canvas } = await mountStory(AllVariants)

  const rail = canvas.getByRole("navigation", {
    name: "Rail without labels",
  })

  const links = within(rail).getAllByRole("link")

  expect(links.length).toBe(5)

  for (const link of links) {
    // A `title` for the pointer, and real text for everyone else.
    // `aria-label` is deliberately not used: it would replace the
    // content rather than name it.
    expect(link).toHaveAttribute("title")

    expect(link.textContent?.trim()).not.toBe("")
  }

  await expectNoAxeViolations(rail)
})

/**
 * `/library/a-flock-of-seagulls?sort=year` is inside Library. The
 * item matched on arrival and has to keep matching once a filter is
 * applied, which is the case that breaks first in a real app.
 */
test("a filtered page inside a destination is still that destination", async () => {
  const { canvas } = await mountStory(AllStates)

  const nav = canvas.getByRole("navigation", {
    name: "Current deeper",
  })

  const current = within(nav)
    .getAllByRole("link")
    .filter(
      (link: HTMLElement) =>
        link.getAttribute("aria-current") === "page",
    )

  expect(current).toHaveLength(1)

  expect(current[0]?.textContent).toContain("Library")
})

test("a destination that leaves the app opens in a new tab and is never current", async () => {
  const { canvas } = await mountStory(AllStates)

  const nav = canvas.getByRole("navigation", {
    name: "Long and external",
  })

  const external = within(nav)
    .getAllByRole("link")
    .find((link: HTMLElement) =>
      link.getAttribute("href")?.startsWith("https://"),
    )

  expect(external).toBeDefined()

  expect(external).toHaveAttribute("target", "_blank")

  // `noreferrer` beside `noopener` on purpose: one closes the
  // `window.opener` hole, the other keeps a private app's URL out of
  // the destination's logs.
  expect(external).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  )

  expect(external).not.toHaveAttribute("aria-current")

  // Said out loud as well as drawn, WCAG 1.4.1.
  expect(external?.textContent).toContain(
    "opens in a new tab",
  )
})

/**
 * The Narrow View's whole keyboard path. The panel holds **links**,
 * not menu items — which is the difference between this and `Menu`,
 * and the reason it is a `Popover` underneath.
 */
test("the narrow menu opens from its trigger and holds real links", async () => {
  const { body, canvas } = await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Menu",
    role: "button",
  })

  await userEvent.click(trigger)

  await waitFor(() => {
    expect(
      body.getByRole("navigation", { name: "Main" }),
    ).toBeInTheDocument()
  })

  const panel = body.getByRole("navigation", {
    name: "Main",
  })

  expect(within(panel).getAllByRole("link")).toHaveLength(6)

  await expectNoAxeViolations(panel)
})

test("escape closes the narrow menu", async () => {
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Menu",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      body.getByRole("navigation", { name: "Main" }),
    ).toBeInTheDocument()
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(
      body.queryByRole("navigation", { name: "Main" }),
    ).toBeNull()
  })
})

/**
 * A long destination name must not become the rail's floor. Only
 * `truncate` (or `wrap-anywhere`) shrinks the min-content size a
 * flex item's automatic minimum resolves against — `min-w-0` alone
 * does not, and the two are indistinguishable by eye until a column
 * is pushed out of the viewport.
 */
test("a long label truncates rather than widening the column", async () => {
  const { canvas } = await mountStory(AllStates)

  const nav = canvas.getByRole("navigation", {
    name: "Long and external",
  })

  const long = within(nav).getByRole("link", {
    name: /Publisher catalogue/,
  })

  const label = long.querySelector("span:nth-of-type(2)")

  expect(label).not.toBeNull()

  expect(
    label && getComputedStyle(label).textOverflow,
  ).toBe("ellipsis")
})

/**
 * The trigger exists **only when the row did not fit**. mux-magic
 * shows its overflow glyph at every width, which is why its collapse
 * is not a collapse at all — almost everything lives behind the
 * button permanently.
 */
test("a bar with room shows no menu trigger", async () => {
  const { canvas } = await mountStory(Default)

  const nav = canvas.getByRole("navigation", {
    name: "Main",
  })

  await waitFor(() => {
    expect(
      within(nav).queryByRole("button", {
        name: "Main menu",
      }),
    ).toBeNull()
  })

  expect(within(nav).getAllByRole("link")).toHaveLength(5)
})

/**
 * All or nothing — the decision `NavBar` established and `Nav` kept.
 *
 * `Toolbar` would leave two of the five in the bar and put three
 * behind the button, which splits the product's own order across two
 * places with no rule the reader can learn.
 */
test("a bar that does not fit folds every destination together", async () => {
  const { canvas } = await mountStory(AllVariants)

  const nav = canvas.getByRole("navigation", {
    name: "Main, folded",
  })

  await waitFor(() => {
    expect(
      within(nav).getByRole("button", {
        name: "Main menu",
      }),
    ).toBeInTheDocument()
  })

  // Not "fewer links" — none. A half-folded bar is the state this
  // component refuses to enter.
  expect(within(nav).queryAllByRole("link")).toHaveLength(0)
})

/**
 * The whole reason the folded panel is a `Popover` and not a `Menu`.
 * A `MenuItem` is `{ label, onSelect }`, so a nav folded into one is
 * a row of `<button>`s — identical in a screenshot, and with no
 * `href` for middle-click, ctrl-click or "copy link address".
 */
test("a folded destination is still a real link", async () => {
  const { body, canvas } = await mountStory(AllVariants)

  const nav = canvas.getByRole("navigation", {
    name: "Main, folded",
  })

  await userEvent.click(
    within(nav).getByRole("button", { name: "Main menu" }),
  )

  // Scoped to the panel, not the document: this board draws five
  // navs and every one of them has a "Tonight".
  await waitFor(() => {
    expect(
      body.getByRole("dialog", { name: "Main menu" }),
    ).toBeInTheDocument()
  })

  const panel = body.getByRole("dialog", {
    name: "Main menu",
  })

  expect(within(panel).getAllByRole("link")).toHaveLength(5)

  expect(
    within(panel).getByRole("link", { name: "Tonight" }),
  ).toHaveAttribute("href", "/tonight")

  await expectNoAxeViolations(panel)
})

/**
 * A destination is in the bar or in the panel, never both. The
 * fleet's habit is to render the whole nav twice and hide one copy
 * with `hidden md:flex`, which puts every link in the DOM at every
 * width — so an agent driving the page finds two of each and cannot
 * tell which one a human can see.
 */
test("a destination is mounted exactly once", async () => {
  const { canvas } = await mountStory(Default)

  expect(
    canvas.getAllByRole("link", { name: "Tonight" }),
  ).toHaveLength(1)
})
