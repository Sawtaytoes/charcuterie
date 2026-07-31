import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Menu.stories.tsx"

const { AllStates, AllVariants, Interactive } =
  composeStories(stories)

test("the menu is named, and its items are menuitems", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  // **Named by its trigger**, not by a `label` prop. `useRole` puts
  // `aria-labelledby` on the panel pointing at the button, and
  // `aria-labelledby` beats `aria-label` — so the `label` prop this
  // component was first written with did nothing at all, silently.
  //
  // That narrows the M3/M4 lesson rather than contradicting it: an
  // overlay with **no trigger relationship** (`Spinner`'s
  // `role="status"`, `Popover`'s `role="dialog"`) needs its own
  // name. A menu has one.
  expectAgentDrivable(canvas, {
    name: "Bay 3",
    role: "menu",
  })

  expectAgentDrivable(canvas, {
    name: "Retry title",
    role: "menuitem",
  })

  await expectNoAxeViolations(canvasElement)
})

/**
 * A menu is one of the few patterns where focus must jump on open —
 * otherwise the keyboard user who pressed Enter on the trigger is
 * still on the trigger, with a menu they cannot reach.
 */
test("opening moves focus into the menu", async () => {
  const { canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open bay 4 menu",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      expectAgentDrivable(canvas, {
        name: "Retry title",
        role: "menuitem",
      }),
    ).toHaveFocus()
  })
})

test("the arrow keys move within the menu and skip the disabled item", async () => {
  const { canvas } = await mountStory(AllStates)

  const skip = expectAgentDrivable(canvas, {
    name: "Skip title",
    role: "menuitem",
  })

  const eject = expectAgentDrivable(canvas, {
    name: "Eject disc",
    role: "menuitem",
  })

  await expect(eject).toBeDisabled()

  // Not a click to get started — **choosing dismisses the menu**, so
  // clicking an item to "focus" it closes the thing under test. This
  // story opens already visible, and opening is what puts focus on
  // the first item.
  const retry = expectAgentDrivable(canvas, {
    name: "Retry title",
    role: "menuitem",
  })

  await waitFor(() => {
    expect(retry).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(skip).toHaveFocus()
  })

  // Registration is membership: the disabled item never joined the
  // roving group, so wrapping goes past it back to the first.
  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(retry).toHaveFocus()
  })

  await expect(eject).not.toHaveFocus()
})

/**
 * Exactly one tab stop for the whole menu — the roving-tabindex
 * rule, read straight from `selectTabIndex`. `expectAgentDrivable`
 * asserts it for every composite member it is handed; this states it
 * outright because a menu's members all carry `tabindex="-1"` and
 * that is the pattern, not a bug.
 */
test("the menu has one tab stop", async () => {
  const { canvas } = await mountStory(AllStates)

  const menu = expectAgentDrivable(canvas, {
    name: "Bay 3",
    role: "menu",
  })

  const tabbable = Array.from(
    menu.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]',
    ),
  ).filter((one) => one.tabIndex === 0)

  await expect(tabbable).toHaveLength(1)
})

test("choosing an item dismisses the menu", async () => {
  const { canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open bay 4 menu",
      role: "button",
    }),
  )

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Retry title",
      role: "menuitem",
    }),
  )

  // A menu that stays open after an action has fired is the one
  // interaction users read as "it didn't work".
  await waitFor(() => {
    expect(canvas.queryAllByRole("menuitem")).toHaveLength(
      0,
    )
  })
})

test("Escape dismisses without choosing", async () => {
  const { canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open bay 4 menu",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      canvas.queryAllByRole("menuitem").length,
    ).toBeGreaterThan(0)
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(canvas.queryAllByRole("menuitem")).toHaveLength(
      0,
    )
  })
})

/**
 * The panel is in the top layer via `popover="manual"` and **stays
 * in the DOM where it was written** — so a scoped query still finds
 * it. A portalled menu would move to `document.body` and every story
 * here would have to reach for `screen`.
 */
test("the menu is not portalled out of its canvas", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  const menu = expectAgentDrivable(canvas, {
    name: "Bay 2",
    role: "menu",
  })

  await expect(canvasElement).toContainElement(menu)

  await expectNoAxeViolations(canvasElement)
})
