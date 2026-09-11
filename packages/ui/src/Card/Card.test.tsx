import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Card.stories.tsx"

const {
  AccentEdge,
  AllStates,
  CallerNamed,
  Default,
  Interactive,
} = composeStories(stories)

test("a heading turns the card into a named landmark", async () => {
  const { canvas } = await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: "Bay 3",
    role: "region",
  })
})

test("a card with no heading is not a landmark", async () => {
  const { canvas } = await mountStory(AllStates)

  // Four cards on the board, three of them named. A `<section>` with
  // no accessible name is not a region at all — which is the point:
  // the component does not pretend to be one it cannot name.
  await expect(canvas.getAllByRole("region")).toHaveLength(
    3,
  )
})

/**
 * The name the call site set is the fallback, and it is the half the
 * component used to throw away.
 *
 * `aria-labelledby` is written after the caller's spread, so the old
 * `heading ? headingId : undefined` overwrote the caller's pointer
 * instead of deferring to it. A tile naming itself from a heading it
 * draws lost its name and picked up its whole subtree — and this is
 * the only gate that can see it, because the markup is valid, the
 * types are satisfied, and a card named by everything is still a
 * card with a name.
 */
test("a card with no heading keeps the caller's own name", async () => {
  const { canvas } = await mountStory(CallerNamed)

  // Exactly "Recent Mail". Were the subtree naming it, this would be
  // "Recent Mail 6 40 arrived in the last 24 hours, 34 done" and the
  // query would match nothing.
  expectAgentDrivable(canvas, {
    name: "Recent Mail",
    role: "region",
  })
})

/**
 * The fallback is a fallback, not a swap: a `heading` is text the
 * reader can see and the component renders it, so it still wins.
 */
test("a heading still names the card over the caller's pointer", async () => {
  const { canvas } = await mountStory(CallerNamed)

  expectAgentDrivable(canvas, {
    name: "Bay 5",
    role: "region",
  })
})

/**
 * `aria-label` needs no fallback — the component never writes one,
 * so the spread carries the caller's through. Asserted anyway, so
 * that a future "fix" which starts writing `aria-label` here cannot
 * take the caller's with it the way this one took `aria-labelledby`.
 */
test("a caller's aria-label reaches the card untouched", async () => {
  const { canvas } = await mountStory(CallerNamed)

  expectAgentDrivable(canvas, {
    name: "Unread mail",
    role: "region",
  })
})

/**
 * Two identical "Start rip" buttons on one page, disambiguated only
 * by the region each sits in.
 */
test("region scoping disambiguates two identical buttons", async () => {
  const { canvas } = await mountStory(Interactive)

  const bayFour = expectAgentDrivable(canvas, {
    name: "Bay 4",
    role: "region",
  })

  const scoped = bayFour.querySelectorAll("button")

  await expect(scoped).toHaveLength(1)

  // And the progress bar inside that region is the one named for it,
  // so an agent reading a value off a 16-bay tower reads the right
  // bay's.
  await expect(
    canvas.getByRole("progressbar", {
      name: "Bay 4 progress",
    }),
  ).toHaveAttribute("aria-valuenow", "40")
})

/**
 * The bar overlays the entire card, links and buttons included, so
 * `pointer-events: none` on it is the difference between a card you
 * can use and one that swallows every click. Driven, not asserted
 * off a class name — the class is what the fix looks like, and this
 * is what it is for.
 */
test("the accent edge does not swallow a click", async () => {
  const { canvas } = await mountStory(AccentEdge)

  const open = expectAgentDrivable(canvas, {
    name: "Open",
    role: "button",
  })

  let isClicked = false

  open.addEventListener("click", () => {
    isClicked = true
  })

  open.click()

  await expect(isClicked).toBe(true)
})

const readRadius = (card: Element, isBar: boolean) =>
  globalThis.getComputedStyle(
    card,
    isBar ? "::before" : undefined,
  ).borderTopLeftRadius

/**
 * The radius is INHERITED rather than restated, which is what lets
 * one treatment sit on `rounded-lg`, on `rounded-3xl`, and on
 * whatever an app overrides it to. Computed styles, because a class
 * name is the thing that can be right while the paint is wrong.
 */
test("the bar takes the card's own radius, whatever it is", async () => {
  const { canvas } = await mountStory(AccentEdge)

  const wider = expectAgentDrivable(canvas, {
    name: "A wider radius",
    role: "region",
  })

  const stock = expectAgentDrivable(canvas, {
    name: "Project 1",
    role: "region",
  })

  await expect(readRadius(wider, true)).toBe(
    readRadius(wider, false),
  )
  await expect(readRadius(stock, true)).toBe(
    readRadius(stock, false),
  )

  // And the two cards genuinely differ, or the assertions above
  // would pass on a component that hardcoded one radius.
  await expect(readRadius(wider, false)).not.toBe(
    readRadius(stock, false),
  )
})

/**
 * `Card` carries `shadow-low`. The accent edge is a second shadow,
 * and the first version of this fix wrote it onto the card itself —
 * where an unlayered rule outranks the utility and the elevation
 * silently goes away.
 */
test("the accent edge leaves the card's elevation alone", async () => {
  const { canvas } = await mountStory(AccentEdge)

  const card = expectAgentDrivable(canvas, {
    name: "Project 1",
    role: "region",
  })

  const cardShadow =
    globalThis.getComputedStyle(card).boxShadow
  const barShadow = globalThis.getComputedStyle(
    card,
    "::before",
  ).boxShadow

  await expect(cardShadow).not.toBe("none")
  await expect(cardShadow).not.toContain("inset")
  await expect(barShadow).toContain("inset")
})
