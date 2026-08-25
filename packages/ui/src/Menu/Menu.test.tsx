import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import {
  DESKTOP,
  SHORT_WINDOW,
  setViewport,
} from "../viewport.testHelpers.ts"
import * as stories from "./Menu.stories.tsx"

const {
  AllStates,
  AllVariants,
  Empty,
  Grouped,
  Interactive,
  SharedTrigger,
} = composeStories(stories)

test("the menu is named, and its items are menuitems", async () => {
  const { body } = await mountStory(AllStates)

  // **Named by its trigger**, not by a `label` prop. `useRole` puts
  // `aria-labelledby` on the panel pointing at the button, and
  // `aria-labelledby` beats `aria-label` — so the `label` prop this
  // component was first written with did nothing at all, silently.
  //
  // That narrows the M3/M4 lesson rather than contradicting it: an
  // overlay with **no trigger relationship** (`Spinner`'s
  // `role="status"`, `Popover`'s `role="dialog"`) needs its own
  // name. A menu has one.
  const menu = expectAgentDrivable(body, {
    name: "Bay 3",
    role: "menu",
  })

  expectAgentDrivable(body, {
    name: "Retry title",
    role: "menuitem",
  })

  await expectNoAxeViolations(menu)
})

/**
 * A menu is one of the few patterns where focus must jump on open —
 * otherwise the keyboard user who pressed Enter on the trigger is
 * still on the trigger, with a menu they cannot reach.
 */
test("opening moves focus into the menu", async () => {
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open bay 4 menu",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      expectAgentDrivable(body, {
        name: "Retry title",
        role: "menuitem",
      }),
    ).toHaveFocus()
  })
})

test("the arrow keys move within the menu and skip the disabled item", async () => {
  const { body } = await mountStory(AllStates)

  const skip = expectAgentDrivable(body, {
    name: "Skip title",
    role: "menuitem",
  })

  const eject = expectAgentDrivable(body, {
    name: "Eject disc",
    role: "menuitem",
  })

  await expect(eject).toBeDisabled()

  // Not a click to get started — **choosing dismisses the menu**, so
  // clicking an item to "focus" it closes the thing under test. This
  // story opens already visible, and opening is what puts focus on
  // the first item.
  const retry = expectAgentDrivable(body, {
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
  const { body } = await mountStory(AllStates)

  const menu = expectAgentDrivable(body, {
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
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open bay 4 menu",
      role: "button",
    }),
  )

  await userEvent.click(
    expectAgentDrivable(body, {
      name: "Retry title",
      role: "menuitem",
    }),
  )

  // A menu that stays open after an action has fired is the one
  // interaction users read as "it didn't work".
  await waitFor(() => {
    expect(body.queryAllByRole("menuitem")).toHaveLength(0)
  })
})

test("Escape dismisses without choosing", async () => {
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open bay 4 menu",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      body.queryAllByRole("menuitem").length,
    ).toBeGreaterThan(0)
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryAllByRole("menuitem")).toHaveLength(0)
  })
})

/**
 * The panel portals to `document.body` — escaping any
 * `overflow: hidden` ancestor — and the trigger→panel link survives
 * the boundary: `useRole` writes `aria-labelledby` on the menu
 * pointing back at the button that names it. A scoped query for the
 * panel now reaches for `body`; the trigger stays in the canvas.
 */
test("the menu portals to the body, still named by its trigger", async () => {
  const { body, canvas, canvasElement } =
    await mountStory(AllVariants)

  const trigger = expectAgentDrivable(canvas, {
    name: "Bay 2",
    role: "button",
  })

  const menu = expectAgentDrivable(body, {
    name: "Bay 2",
    role: "menu",
  })

  await expect(canvasElement).not.toContainElement(menu)

  await expect(document.body).toContainElement(menu)

  // The link, across the portal: the menu is named by pointing at its
  // trigger, and the id really resolves.
  await expect(menu).toHaveAttribute(
    "aria-labelledby",
    trigger.id,
  )

  await expectNoAxeViolations(menu)
})

/**
 * **One trigger, two slots** — the defect image-viewer reported, and
 * the one shape `mergeSlotProps` did not cover when it shipped in
 * 1.0.0.
 *
 * `Menu` and `Tooltip` both clone onto the button and both hand it a
 * floating-ui `refs.setReference`. That is not an attribute, so
 * last-write-wins destroyed one of them: the inner `Tooltip` wrote
 * its own and the `Menu` was left with **no reference element at
 * all**. Nothing threw, nothing was unnamed, axe was clean, and the
 * panel rendered at `left: 0; top: 0` — a positioning bug that reads
 * as CSS.
 *
 * So the assertion is geometric, and it is the only kind that can
 * see this: the panel is where the trigger is. Nothing in `Menu`
 * writes that number — floating-ui computes it from the reference
 * element, and a dropped ref means no reference element.
 */
const expectAnchoredTrigger = (trigger: HTMLElement) => {
  const triggerRect = trigger.getBoundingClientRect()

  // The precondition, stated rather than assumed. An unanchored
  // panel lands at the viewport origin, so a trigger that also sits
  // at the origin makes every assertion below pass for the wrong
  // reason. The story's padding is what keeps them apart, and this
  // is where its removal fails.
  expect(triggerRect.left).toBeGreaterThan(32)

  expect(triggerRect.top).toBeGreaterThan(32)

  return triggerRect
}

test("a menu sharing its trigger with a tooltip is still anchored to it", async () => {
  const { body, canvas } = await mountStory(SharedTrigger)

  const trigger = expectAgentDrivable(canvas, {
    name: "Bay 5",
    role: "button",
  })

  const triggerRect = expectAnchoredTrigger(trigger)

  await userEvent.click(trigger)

  const menu = await waitFor(() =>
    expectAgentDrivable(body, { role: "menu" }),
  )

  // `bottom-start` with `offset(4)`: flush with the trigger's
  // inline start, four pixels below it. Before the fix this read
  // `left 0, top 0` — and it read that *forever*, so waiting for it
  // costs a timeout rather than hiding a failure. The wait is for
  // floating-ui's first position, which lands a frame after the
  // panel does.
  await waitFor(() => {
    const menuRect = menu.getBoundingClientRect()

    expect(Math.round(menuRect.left)).toBe(
      Math.round(triggerRect.left),
    )

    expect(Math.round(menuRect.top)).toBe(
      Math.round(triggerRect.bottom) + 4,
    )
  })

  await expectNoAxeViolations(menu)
})

/**
 * The other ref, in the same composition — because a fix that
 * reversed the priority instead of merging would leave *this* one
 * pointing at nothing and the test above would still pass.
 */
test("the tooltip sharing that trigger is anchored to it too", async () => {
  const { body, canvas } = await mountStory(SharedTrigger)

  const trigger = expectAgentDrivable(canvas, {
    name: "Bay 5",
    role: "button",
  })

  const triggerRect = expectAnchoredTrigger(trigger)

  trigger.focus()

  const tip = await waitFor(() =>
    expectAgentDrivable(body, { role: "tooltip" }),
  )

  // The **main axis** only: `top` with `offset(6)`. The cross axis
  // is not asserted because `shift({ padding: 8 })` legitimately
  // moves it — a 229px tip over a 71px button cannot be centred
  // this close to the edge — and an assertion that has to allow for
  // that is one an unanchored tip at the viewport origin would also
  // satisfy. This one it cannot: unanchored reads `bottom 24`.
  await waitFor(() => {
    const tipRect = tip.getBoundingClientRect()

    expect(Math.round(tipRect.bottom)).toBe(
      Math.round(triggerRect.top) - 6,
    )
  })
})

test("a group is a named group and a separator is a separator", async () => {
  const { body } = await mountStory(Grouped)

  const menu = expectAgentDrivable(body, {
    name: "Bay 6",
    role: "menu",
  })

  // Each group is a `role="group"` named by its heading, so a screen
  // reader announces "Danger, group" before its members.
  expectAgentDrivable(body, {
    name: "Disc",
    role: "group",
  })

  expectAgentDrivable(body, {
    name: "Danger",
    role: "group",
  })

  // A native `<hr>`, which carries the implicit `role="separator"`.
  await expect(menu.querySelectorAll("hr")).toHaveLength(1)

  await expect(body.getAllByRole("separator")).toHaveLength(
    1,
  )

  await expectNoAxeViolations(menu)
})

test("arrow keys skip group headings and separators", async () => {
  const { body } = await mountStory(Grouped)

  const retry = expectAgentDrivable(body, {
    name: "Retry title",
    role: "menuitem",
  })

  const skip = expectAgentDrivable(body, {
    name: "Skip title",
    role: "menuitem",
  })

  const eject = expectAgentDrivable(body, {
    name: "Eject disc",
    role: "menuitem",
  })

  // Opening lands on the first item, and arrow-down walks the items
  // in DOM order across the group boundary — the heading and the
  // separator register nothing, so there is nothing between Skip
  // (end of group one) and Eject (start of group two) to stop on.
  await waitFor(() => {
    expect(retry).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(skip).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(eject).toHaveFocus()
  })
})

test("an empty menu shows a disabled note, not an actionable item", async () => {
  const { body } = await mountStory(Empty)

  const menu = expectAgentDrivable(body, {
    name: "Bay 7",
    role: "menu",
  })

  await expect(menu).toHaveTextContent(
    "No actions available",
  )

  // The note is the menu's one `menuitem` — a `role="menu"` must own
  // one — but it is `aria-disabled` and carries no tab stop, so a
  // keyboard user is told the menu is empty and cannot land on it.
  const items = menu.querySelectorAll<HTMLElement>(
    '[role="menuitem"]',
  )

  await expect(items).toHaveLength(1)

  await expect(items[0]).toHaveAttribute(
    "aria-disabled",
    "true",
  )

  await expect(items[0]?.tabIndex).toBe(-1)

  await expectNoAxeViolations(menu)
})

/**
 * `--control-height-<size>` in px.
 *
 * The token is declared in `rem`, and `getComputedStyle` hands back a
 * custom property's *declared* value rather than a used length — so
 * the conversion happens here, against the live root font size. That
 * keeps the assertions below written against the token instead of
 * against a `44` typed in this file, so a density change moves them
 * with it.
 */
const getControlHeightPx = (size: "lg" | "md" | "sm") => {
  const root = globalThis.document.documentElement

  const declared = globalThis
    .getComputedStyle(root)
    .getPropertyValue(`--control-height-${size}`)

  return (
    Number.parseFloat(declared) *
    Number.parseFloat(
      globalThis.getComputedStyle(root).fontSize,
    )
  )
}

/**
 * The click target, measured rather than described.
 *
 * `itemSize` defaults to `lg` on a menu and nothing else in the
 * library, which is the point: a menu item is aimed at in a hurry and
 * there are rarely more than about eight of them, so it can afford
 * the height a dense list cannot. `--control-height-lg` is 2.75rem at
 * `comfortable` density — 44px, the WCAG 2.5.5 target — and the
 * assertion is against the token rather than against 44, so the kiosk
 * density does not have to be special-cased here.
 */
test("a menu item is as tall as an `lg` control", async () => {
  await setViewport(DESKTOP)

  const { body } = await mountStory(AllStates)

  const item = expectAgentDrivable(body, {
    name: "Retry title",
    role: "menuitem",
  })

  expect(
    item.getBoundingClientRect().height,
  ).toBeGreaterThanOrEqual(getControlHeightPx("lg"))
})

/**
 * The other half of the same request: bigger rows, *unless* the
 * window cannot spend the height. Nine `lg` rows are 400px of panel,
 * which on a half-height window is the difference between a menu read
 * at a glance and a menu scrolled.
 */
test("a short window steps the item size back down", async () => {
  await setViewport(SHORT_WINDOW)

  try {
    const { body } = await mountStory(AllStates)

    const item = expectAgentDrivable(body, {
      name: "Retry title",
      role: "menuitem",
    })

    expect(
      item.getBoundingClientRect().height,
    ).toBeLessThan(getControlHeightPx("lg"))
  } finally {
    // Every later test in this file measures against the tall rows,
    // and the viewport is shared across the file.
    await setViewport(DESKTOP)
  }
})
