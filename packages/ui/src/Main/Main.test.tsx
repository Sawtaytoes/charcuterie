import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { afterAll, afterEach, test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import {
  DESKTOP,
  PHONE,
  setViewport,
} from "../viewport.testHelpers.ts"
import * as stories from "./Main.stories.tsx"
import { forgetScrollOffsets } from "./scrollMemory.ts"

const {
  Default,
  Interactive,
  Responsive,
  ScrollMemory,
  ScrollMemoryWithLateContent,
} = composeStories(stories)

afterAll(async () => {
  await setViewport(DESKTOP)
})

// The offsets are module state, so they outlive a mount. A test
// must not.
afterEach(() => {
  forgetScrollOffsets()
})

test("the content column is capped at the token, not at the window", async () => {
  await setViewport(DESKTOP)

  const { canvas } = await mountStory(Default)

  const column = canvas.getByRole("main")
    .firstElementChild as HTMLElement

  // `screen.lg` — 64rem at the root 16px font size. The number is
  // spelled out here rather than read back from the same
  // `var()` the component wrote, because a test that asks the
  // component what it did agrees with it by construction.
  await expect(
    globalThis.getComputedStyle(column).maxInlineSize,
  ).toBe("1024px")

  await expect(
    column.getBoundingClientRect().width,
  ).toBeLessThanOrEqual(1024)
})

/**
 * The `@container` claim, asserted rather than assumed.
 *
 * A grid inside `Main` answers to the **content column**, which is
 * a different width from the window's the moment a rail is open —
 * the pair a media query cannot tell apart, and the reason the
 * fleet's poster grids look wrong at intermediate widths.
 */
test("main is the query container its content responds to", async () => {
  await setViewport(DESKTOP)

  const { canvas } = await mountStory(Default)

  const column = canvas.getByRole("main")
    .firstElementChild as HTMLElement

  // On the column, not on `<main>`. `<main>` is as wide as its
  // grid track (1184px beside the rail here); the column is
  // capped at 1024px. A container declared on the wrong one of
  // those measures a width the content never has.
  await expect(
    globalThis.getComputedStyle(column).containerType,
  ).toBe("inline-size")

  const grid = column.firstElementChild as HTMLElement

  // Two-up, and that is the whole argument. The column's content
  // box is 976px — past `--cq-md` (32rem), short of `--cq-xl`
  // (64rem) — while the *window* is 1440px, so a `lg:grid-cols-3`
  // media query would have drawn three slivers in 976px of space.
  await expect(
    globalThis
      .getComputedStyle(grid)
      .gridTemplateColumns.split(" "),
  ).toHaveLength(2)
})

test("neither an unbroken path nor a wide table widens the page at 390px", async () => {
  await setViewport(PHONE)

  const { canvas, canvasElement } =
    await mountStory(Responsive)

  const path = canvas.getByText(
    /Some-Very-Long-Show-Name-S01E01/,
  )

  // It wraps rather than overflowing. Without it the element is
  // one 1,000px line.
  await expect(
    path.getBoundingClientRect().width,
  ).toBeLessThanOrEqual(PHONE.width)

  // `anywhere`, not `break-word` — a drift gate, because the two
  // are indistinguishable in a screenshot and only `anywhere`
  // shrinks the **min-content size** a flex or grid item's
  // automatic minimum resolves against. Under `break-word` the ink
  // wraps while the intrinsic contribution stays the full token
  // length, so the string can still force a column open with **no
  // overflowing element box** for a bounding-rect assertion to
  // see. That is the failure shape found in plex-channels, and
  // this line is what stops somebody "tidying" the utility back.
  const column = canvas.getByRole("main")
    .firstElementChild as HTMLElement

  await expect(
    globalThis.getComputedStyle(column).overflowWrap,
  ).toBe("anywhere")

  const scroller = canvas.getByRole("region", {
    name: "Transfer log, scrollable",
  })

  // The table genuinely does not fit — otherwise the page-level
  // assertion below passes for the wrong reason.
  await expect(scroller.scrollWidth).toBeGreaterThan(
    scroller.clientWidth,
  )

  const { documentElement } = document

  await expect(
    documentElement.scrollWidth,
  ).toBeLessThanOrEqual(documentElement.clientWidth)

  await expectNoAxeViolations(canvasElement)
})

/**
 * `tabIndex={-1}` is the difference between a skip link that
 * works and one that only scrolls. It must not put `<main>` in
 * the tab order, and it must accept focus when sent there.
 */
test("main takes focus from a skip link without joining the tab order", async () => {
  await setViewport(DESKTOP)

  const { canvas, canvasElement } =
    await mountStory(Interactive)

  const main = canvas.getByRole("main")

  await expect(main).toHaveAttribute("tabindex", "-1")

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Skip to main content",
      role: "link",
    }),
  )

  await expect(main).toHaveFocus()

  // The next Tab leaves `<main>` rather than cycling back into
  // the header, because the skip link put focus *inside* the page
  // rather than merely scrolling to it.
  await userEvent.tab()

  await expect(main).not.toHaveFocus()

  await expect(main.contains(document.activeElement)).toBe(
    true,
  )

  await expectNoAxeViolations(canvasElement)
})

/**
 * A `scroll` event is dispatched at the next rendering step, not
 * at the assignment, so a test that scrolls and immediately
 * navigates measures the listener before it has been told
 * anything.
 */
const scrollTo = async (
  element: HTMLElement,
  offset: number,
) => {
  element.scrollTop = offset

  await waitFor(async () => {
    await expect(element.scrollTop).toBe(offset)
  })

  await new Promise((resolve) => {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(resolve)
    })
  })
}

/**
 * The whole point, and the thing no browser does for you.
 *
 * `Shell` makes `<main>` the page's only vertical scrollport.
 * `history.scrollRestoration` governs the **document** scroller, so
 * it has nothing to say about this element — and it says nothing at
 * all about a same-document navigation, which is every link press
 * in a single-page app.
 */
test("back returns the list to where it was scrolled, not to the top", async () => {
  await setViewport(DESKTOP)

  const { canvas, canvasElement } =
    await mountStory(ScrollMemory)

  const main = canvas.getByRole("main")

  // The fixture genuinely scrolls, or the assertion below would
  // pass against a page that was never long enough to lose a
  // place in.
  await expect(main.scrollHeight).toBeGreaterThan(
    main.clientHeight + 900,
  )

  await scrollTo(main, 900)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open Episode 12",
      role: "button",
    }),
  )

  await expect(
    canvas.getByRole("heading", { name: "Episode 12" }),
  ).toBeVisible()

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Back",
      role: "button",
    }),
  )

  await waitFor(async () => {
    await expect(main.scrollTop).toBe(900)
  })

  await expectNoAxeViolations(canvasElement)
})

/**
 * The failure a naive `scrollTop = offset` produces, and the
 * reason `useScrollMemory` keeps a `ResizeObserver` rather than
 * writing the number once.
 *
 * Back commits before the rows arrive, so the scrollport has no
 * room for the offset and the browser clamps the write to `0`.
 * Every assertion a one-shot restore could make still passes — the
 * offset was remembered, the write happened — and the reader is
 * looking at the top of the list.
 */
test("a restore waits for content that arrives after the navigation", async () => {
  await setViewport(DESKTOP)

  const { canvas } = await mountStory(
    ScrollMemoryWithLateContent,
  )

  const main = await waitFor(() => canvas.getByRole("main"))

  await waitFor(async () => {
    await expect(
      canvas.getByRole("heading", { name: "Episode 1" }),
    ).toBeVisible()
  })

  await scrollTo(main, 900)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open Episode 12",
      role: "button",
    }),
  )

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Back",
      role: "button",
    }),
  )

  // No assertion on the intermediate `0`: whether the rows have
  // landed by this line depends on how loaded the machine is, and
  // a test that reads the clock is a test that fails on CI. What
  // proves the wait is load-bearing is that deleting the
  // `ResizeObserver` from `useScrollMemory` fails **this** test and
  // no other.
  await waitFor(async () => {
    await expect(main.scrollTop).toBe(900)
  })
})

/**
 * The regression the first release of this shipped, and the reason
 * an entry remembers its path.
 *
 * A filter chip, an expanded group and a selected tab each write a
 * search param, and `setSearchParams` **navigates** — so pressing
 * one mints a history entry the memory has never seen, on the page
 * the reader is already looking at. Read as "unseen ⇒ start at the
 * top", the list jumped to the top every time the reader opened a
 * group. Measured live on Docket: scrolled to 1200, pressed a group
 * toggle, landed at 0.
 *
 * The toggle is in the header rather than in the list on purpose.
 * A control inside the scrollport is scrolled into view before it
 * is pressed, so the driver moves the offset and the test proves
 * nothing.
 *
 * Leaving the scrollport alone is also exactly what the page did
 * before any of this existed, so this answer cannot itself be a
 * regression.
 */
test("expanding a group is a new history entry that does not move the scrollport", async () => {
  await setViewport(DESKTOP)

  const { canvas } = await mountStory(ScrollMemory)

  const main = canvas.getByRole("main")

  await scrollTo(main, 900)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Expand the specials",
      role: "button",
    }),
  )

  // The expansion happened, so this is a real new entry rather than
  // a press that did nothing.
  await expect(
    expectAgentDrivable(canvas, {
      name: "Collapse the specials",
      role: "button",
    }),
  ).toBeVisible()

  // Still where the reader put it. `waitFor` would hide a jump that
  // corrects itself, so this is read directly after two rendering
  // steps.
  await new Promise((resolve) => {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(resolve)
    })
  })

  await expect(main.scrollTop).toBe(900)
})

/**
 * A restore that outlives the reader's first scroll is a page that
 * fights them. Anything the reader does to the scrollport ends it.
 */
test("a reader scrolling during a restore keeps their own position", async () => {
  await setViewport(DESKTOP)

  const { canvas } = await mountStory(
    ScrollMemoryWithLateContent,
  )

  await waitFor(async () => {
    await expect(
      canvas.getByRole("heading", { name: "Episode 1" }),
    ).toBeVisible()
  })

  const main = canvas.getByRole("main")

  await scrollTo(main, 900)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Open Episode 12",
      role: "button",
    }),
  )

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Back",
      role: "button",
    }),
  )

  // Before the rows land, so the restore is still pending.
  main.dispatchEvent(
    new WheelEvent("wheel", { bubbles: true }),
  )

  await waitFor(async () => {
    await expect(
      canvas.getByRole("heading", { name: "Episode 1" }),
    ).toBeVisible()
  })

  await scrollTo(main, 200)

  // Given up, rather than dragging the reader back to 900.
  await expect(main.scrollTop).toBe(200)
})
