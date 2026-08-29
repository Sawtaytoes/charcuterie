import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { afterAll, test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import {
  DESKTOP,
  PHONE,
  setViewport,
} from "../viewport.testHelpers.ts"
import * as stories from "./Shell.stories.tsx"

const {
  Default,
  Interactive,
  Responsive,
  Scrollable,
  WithBothRails,
  WithStartRail,
} = composeStories(stories)

afterAll(async () => {
  await setViewport(DESKTOP)
})

/**
 * The page's own `<header>`, found structurally rather than by
 * role — and the reason is worth writing down.
 *
 * `getByRole("banner")` returns **three** matches on any page with
 * two `Card`s in it, because `Card` renders a `<header>` and
 * testing-library's role mapping does not implement the HTML-AAM
 * scoping rule that makes a `<header>` inside `<section>` generic
 * rather than a banner. Chromium's real accessibility tree does
 * implement it — which is what Playwright, a screen reader and an
 * agent actually read, and why axe files no `landmark-unique` here
 * — so this is a testing-library artefact and not a fault in the
 * page.
 *
 * Asserting through the artefact would mean either shipping a page
 * with no cards on it or teaching the shell to work around a
 * query library. Neither is the component's problem, so the test
 * takes the shell's first `<header>`, which is the one it renders.
 */
const getPageHeader = (canvasElement: HTMLElement) => {
  const header = canvasElement.querySelector("header")

  if (!header) {
    throw new Error("The shell rendered no <header>.")
  }

  return header
}

/**
 * The gate, stated as the browser sees it.
 *
 * `scrollWidth > clientWidth` on the documentElement is *exactly*
 * "this page scrolls sideways" — no proxy, no computed-style
 * inference. It is asserted rather than eyeballed because the
 * causes are all invisible in a screenshot taken at the wrong
 * width: a grid track that ignored `min-width: 0`, a `100vw` that
 * counted the scrollbar gutter, a sticky header whose inner
 * container is wider than the viewport.
 */
const expectNoHorizontalScroll = async () => {
  const { documentElement } = document

  await expect(
    documentElement.scrollWidth,
  ).toBeLessThanOrEqual(documentElement.clientWidth)
}

test("the shell does not scroll sideways at 390px, with content that tries", async () => {
  await setViewport(PHONE)

  const { canvas, canvasElement } =
    await mountStory(Responsive)

  // The fixture is only a fixture if it is really there: an
  // unbroken 130-character path, plus a table wider than the
  // phone. A regression that deleted the content would otherwise
  // turn this into a green no-op.
  await expect(
    canvas.getByText(/Some-Very-Long-Show-Name-S01E01/),
  ).toBeVisible()

  await expect(
    canvas.getByRole("table"),
  ).toBeInTheDocument()

  // The third fixture: a closed drawer parked at
  // `translateX(110%)`. It has to be really parked past the
  // inline edge, because a transform leaves the box in the
  // document's scrollable overflow region — which is why this
  // shape survives every `min-width: 0` in the tree, and why the
  // assertion below is on `documentElement.scrollWidth` rather
  // than on any element's bounding rect.
  const parkedDrawer = canvasElement.querySelector(
    "#parked-drawer",
  ) as HTMLElement

  await expect(
    parkedDrawer.getBoundingClientRect().left,
  ).toBeGreaterThan(PHONE.width)

  const shellRoot =
    canvasElement.firstElementChild as HTMLElement

  // The drawer resolves against `Shell`, not the initial
  // containing block — which is the only reason the clip below
  // reaches it. `overflow-x: clip` clips descendants whose
  // containing-block chain runs through the clipper, and an
  // absolutely positioned box with no positioned ancestor has no
  // such chain: it lands its overflow straight on
  // `documentElement`, where `document.body.scrollWidth` still
  // reads clean.
  //
  // Measured before `Shell` took `position: relative`:
  // `shellScroll: 390`, `bodyScroll: 390`, `docScroll: 742`.
  await expect(parkedDrawer.offsetParent).toBe(shellRoot)

  await expect(
    globalThis.getComputedStyle(shellRoot).overflowX,
  ).toBe("clip")

  await expectNoAxeViolations(canvasElement)
})

test("both rails and a full page do not scroll sideways at 390px either", async () => {
  await setViewport(PHONE)

  const { canvasElement } = await mountStory(WithBothRails)

  await expectNoHorizontalScroll()

  await expectNoAxeViolations(canvasElement)
})

/**
 * The other half of the same property. A shell that never
 * overflows because it clipped everything would pass the test
 * above; this is the assertion that the frame is actually laid
 * out at the width it was given.
 */
test("the shell fills the viewport at desktop width without overflowing it", async () => {
  await setViewport(DESKTOP)

  await mountStory(WithBothRails)

  await expectNoHorizontalScroll()
})

test("only main scrolls vertically, keeping the rail available", async () => {
  await setViewport(DESKTOP)

  const { canvas, canvasElement } =
    await mountStory(Scrollable)

  const shell =
    canvasElement.firstElementChild as HTMLElement
  const main = canvas.getByRole("main")
  const rail = canvas.getByRole("navigation", {
    name: "Sections",
  })

  await expect(shell.clientHeight).toBe(DESKTOP.height)
  await expect(main.scrollHeight).toBeGreaterThan(
    main.clientHeight,
  )
  await expect(
    globalThis.getComputedStyle(main).overflowY,
  ).toBe("auto")

  main.scrollTo({ top: main.scrollHeight })

  await expect(main.scrollTop).toBeGreaterThan(0)
  await expect(rail.scrollTop).toBe(0)
  await expectNoAxeViolations(canvasElement)
})

test("the shell is one banner, one main, and two uniquely-named rails", async () => {
  const { canvas, canvasElement } =
    await mountStory(WithBothRails)

  await expect(getPageHeader(canvasElement).tagName).toBe(
    "HEADER",
  )

  expectAgentDrivable(canvas, { role: "main" })

  // Named, so they are two things rather than two of the same
  // thing — which is the whole reason `label` is required.
  expectAgentDrivable(canvas, {
    name: "Sections",
    role: "navigation",
  })

  expectAgentDrivable(canvas, {
    name: "Job detail",
    role: "complementary",
  })

  await expectNoAxeViolations(canvasElement)
})

/**
 * The rail is in the document **once**, at every width.
 *
 * This is the assertion that would fail the `hidden`/`lg:hidden`
 * implementation mux-magic and mail-sifter both ship — where every
 * control exists twice in the DOM at every viewport, so a test has
 * to be defensively scoped and an agent finds phantom controls.
 * Four links narrow, four links wide.
 */
test("collapsing the rail does not duplicate its contents", async () => {
  await setViewport(PHONE)

  const phone = await mountStory(WithStartRail)

  await expect(
    phone.canvas.getAllByRole("link", { name: "Queue" }),
  ).toHaveLength(1)

  await setViewport(DESKTOP)

  const desktop = await mountStory(WithStartRail)

  await expect(
    desktop.canvas.getAllByRole("link", { name: "Queue" }),
  ).toHaveLength(1)
})

/**
 * The skip link — missing from all ten of the fleet's hand-rolled
 * shells, which is why it is the shell's job rather than the
 * app's.
 *
 * The assertion is that it **moves focus into `<main>`**, not that
 * an anchor exists. An `href` pointing at a non-focusable target
 * scrolls the page and leaves the next Tab in the header, which
 * looks like a working skip link and is not.
 */
test("the first Tab reaches a skip link that lands focus in main", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  const skipLink = expectAgentDrivable(canvas, {
    name: "Skip to main content",
    role: "link",
  })

  const main = canvas.getByRole("main")

  await expect(skipLink).toHaveAttribute(
    "href",
    `#${main.id}`,
  )

  await userEvent.click(skipLink)

  await expect(main).toHaveFocus()

  await expectNoAxeViolations(canvasElement)
})

test("header and main are capped at the same width", async () => {
  await setViewport(DESKTOP)

  const { canvas, canvasElement } =
    await mountStory(Default)

  // The inner rows, not the landmarks: the `<header>` and
  // `<main>` are both full-bleed on purpose, and it is the row
  // inside each that carries the cap.
  const headerRow = getPageHeader(canvasElement)
    .firstElementChild as HTMLElement

  const mainRow = canvas.getByRole("main")
    .firstElementChild as HTMLElement

  // points-market ships these two disagreeing — its header row is
  // capped at 80rem and its `<main>` is not capped at all — so on
  // a wide monitor the title sits above content that starts to
  // its left. One `contentWidth`, read from one context, is the
  // fix.
  await expect(
    globalThis.getComputedStyle(headerRow).maxInlineSize,
  ).toBe(globalThis.getComputedStyle(mainRow).maxInlineSize)

  await expect(
    headerRow.getBoundingClientRect().width,
  ).toBe(mainRow.getBoundingClientRect().width)
})
