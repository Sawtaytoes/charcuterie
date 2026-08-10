import { composeStories } from "@storybook/react"
import { page } from "@vitest/browser/context"
import { expect, userEvent } from "storybook/test"
import { afterAll, test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Main.stories.tsx"

const { Default, Interactive, Responsive } =
  composeStories(stories)

const PHONE = { height: 844, width: 390 }

const DESKTOP = { height: 900, width: 1440 }

afterAll(async () => {
  await page.viewport(DESKTOP.width, DESKTOP.height)
})

test("the content column is capped at the token, not at the window", async () => {
  await page.viewport(DESKTOP.width, DESKTOP.height)

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
  await page.viewport(DESKTOP.width, DESKTOP.height)

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
  await page.viewport(PHONE.width, PHONE.height)

  const { canvas, canvasElement } =
    await mountStory(Responsive)

  const path = canvas.getByText(
    /Some-Very-Long-Show-Name-S01E01/,
  )

  // It wraps rather than overflowing — which is `wrap-break-word`
  // on the content column doing its one job. Without it the
  // element is one 1,000px line.
  await expect(
    path.getBoundingClientRect().width,
  ).toBeLessThanOrEqual(PHONE.width)

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
  await page.viewport(DESKTOP.width, DESKTOP.height)

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
