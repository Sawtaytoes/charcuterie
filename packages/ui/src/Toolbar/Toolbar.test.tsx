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
import * as stories from "./Toolbar.stories.tsx"

const {
  AllStates,
  AllVariants,
  Default,
  InAppShell,
  Interactive,
} = composeStories(stories)

test("the toolbar is named, and its actions are buttons", async () => {
  const { canvas } = await mountStory(Default)

  const toolbar = expectAgentDrivable(canvas, {
    name: "Deck actions",
    role: "toolbar",
  })

  expectAgentDrivable(canvas, {
    name: "Start rip",
    role: "button",
  })

  await expectNoAxeViolations(toolbar)
})

/**
 * The trigger exists **only when something overflowed**, which is
 * the difference between progressive collapse and mux-magic's ⋮ —
 * displayed at every width, so almost everything lives in the
 * popover permanently.
 */
test("a bar with room shows no overflow trigger", async () => {
  const { canvas } = await mountStory(Default)

  const toolbar = expectAgentDrivable(canvas, {
    name: "Deck actions",
    role: "toolbar",
  })

  await waitFor(() => {
    expect(
      within(toolbar).queryByRole("button", {
        name: "More actions",
      }),
    ).toBeNull()
  })

  // All four still in the row — the disabled one included, because
  // "not right now" is not "does not exist".
  await expect(
    within(toolbar).getAllByRole("button"),
  ).toHaveLength(4)
})

/**
 * Exactly one tab stop for the whole toolbar — the APG's
 * requirement, and the thing four repos' `role="toolbar"` does not
 * do. Read from `selectTabIndex` rather than restated, and written
 * onto whatever focusable the slot holds, because a `control` is
 * the app's own component and most of them forward no `tabIndex`.
 */
test("the toolbar is one tab stop", async () => {
  const { canvas } = await mountStory(Default)

  const toolbar = expectAgentDrivable(canvas, {
    name: "Deck actions",
    role: "toolbar",
  })

  await waitFor(() => {
    expect(
      within(toolbar)
        .getAllByRole("button")
        // A disabled button is out of the tab order whatever its
        // `tabIndex` property says, and it never registered with
        // the roving group either — the same mechanism that makes
        // the arrow keys skip it.
        .filter(
          (button) =>
            !(button as HTMLButtonElement).disabled &&
            button.tabIndex === 0,
        ),
    ).toHaveLength(1)
  })
})

test("the arrow keys move along the row", async () => {
  const { canvas } = await mountStory(Default)

  const start = expectAgentDrivable(canvas, {
    name: "Start rip",
    role: "button",
  })

  const retry = expectAgentDrivable(canvas, {
    name: "Retry title",
    role: "button",
  })

  start.focus()

  await userEvent.keyboard("{ArrowRight}")

  await waitFor(() => {
    expect(retry).toHaveFocus()
  })

  await userEvent.keyboard("{Home}")

  await waitFor(() => {
    expect(start).toHaveFocus()
  })
})

/**
 * The defect this component exists to delete: mux-magic renders its
 * whole control set twice and hides one copy with a CSS specificity
 * coin-flip, so every action is in the DOM at every viewport and an
 * agent driving the page sees phantom controls.
 */
test("a collapsed action is mounted exactly once", async () => {
  const { body } = await mountStory(AllStates)

  const narrowToolbar = expectAgentDrivable(body, {
    name: "Deck actions, narrow",
    role: "toolbar",
  })

  // It overflowed, so the trigger is there.
  expectAgentDrivable(within(narrowToolbar), {
    name: "More actions",
    role: "button",
  })

  // …and the collapsed action is in the open menu, once, in the
  // whole document — not once in the bar and once in the panel.
  await waitFor(() => {
    expect(
      body.getAllByRole("menuitem", {
        name: "Skip title",
      }),
    ).toHaveLength(1)
  })

  await expect(
    within(narrowToolbar).queryByRole("button", {
      name: "Skip title",
    }),
  ).toBeNull()
})

/**
 * A trigger that advertises what it does. mux-magic's file contains
 * zero `aria-expanded`, `aria-haspopup` or `aria-controls` — here
 * they come from `useRole` inside `Menu`/`Popover`, so they cannot
 * be forgotten.
 */
test("the trigger advertises the overlay it opens", async () => {
  const { body, canvas } = await mountStory(Interactive)

  const trigger = expectAgentDrivable(canvas, {
    name: "More actions",
    role: "button",
  })

  await expect(trigger).toHaveAttribute(
    "aria-expanded",
    "false",
  )

  await expect(trigger).toHaveAttribute(
    "aria-haspopup",
    "menu",
  )

  await userEvent.click(trigger)

  await expect(trigger).toHaveAttribute(
    "aria-expanded",
    "true",
  )

  // Focus moves into the menu on opening — `Menu` owns that — so
  // the keyboard user who pressed Enter on the trigger is not left
  // on a menu they cannot reach.
  const menu = expectAgentDrivable(body, {
    name: "More actions",
    role: "menu",
  })

  await waitFor(() => {
    expect(menu).toContainElement(
      document.activeElement as HTMLElement,
    )
  })

  await userEvent.keyboard("{Escape}")

  // …and back to the trigger on close.
  await waitFor(() => {
    expect(trigger).toHaveFocus()
  })
})

/**
 * `role="menu"` permits only the `menuitem` family, so a scheme
 * switcher inside one — which plex-channels ships — is invalid
 * ARIA. Mixed content gets a `Popover`: `role="dialog"`,
 * `aria-haspopup="dialog"`, and a switch is legal content.
 */
test("a mixed overflow is a dialog, not a menu", async () => {
  const { body } = await mountStory(AllStates)

  const panel = expectAgentDrivable(body, {
    name: "More controls",
    role: "dialog",
  })

  // A real toggle with real state, against mux-magic's
  // `aria-hidden` span: Dry Run announces identically on and off
  // there, and is the worst defect in that file.
  const dryRun = expectAgentDrivable(within(panel), {
    name: "Dry run",
    role: "switch",
  })

  await expect(dryRun).toHaveAttribute(
    "aria-checked",
    "true",
  )

  await expectNoAxeViolations(panel)
})

test("both overflow kinds audit clean while open", async () => {
  const { canvasElement } = await mountStory(AllStates)

  // The resting states, and then the driven ones — an overflow
  // audited only while shut is an overflow nobody audited.
  await expectNoAxeViolations(canvasElement)

  await expectNoAxeViolations(document.body)
})

test("the two overflow kinds render side by side", async () => {
  const { canvas } = await mountStory(AllVariants)

  expectAgentDrivable(canvas, {
    name: "Deck actions",
    role: "toolbar",
  })

  expectAgentDrivable(canvas, {
    name: "Deck controls",
    role: "toolbar",
  })
})

/**
 * Where it actually goes. `useMediaQuery` decides *where* the bar is
 * mounted and `Toolbar` decides *what fits* once it is there —
 * plex-channels' relocation pattern and progressive collapse are
 * different jobs, and both are needed.
 */
test("the shell mounts exactly one toolbar", async () => {
  const { canvas } = await mountStory(InAppShell)

  await expect(
    canvas.getAllByRole("toolbar", {
      name: "Deck controls",
    }),
  ).toHaveLength(1)
})
