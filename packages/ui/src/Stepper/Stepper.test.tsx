import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import * as stories from "./Stepper.stories.tsx"

const {
  AllStates,
  CompactCard,
  Default,
  Interactive,
  Responsive,
} = composeStories(stories)

test("the sequence is an ordered list with a name", async () => {
  const { canvas } = await mountStory(Default)

  // A `<ol>`, not a stack of divs: the ORDER is the meaning, and a
  // screen reader announcing "list, 3 items" is what carries it.
  await expect(
    canvas.getByRole("list", { name: "Ingest sequence" }),
  ).toBeVisible()
  await expect(
    canvas.getAllByRole("listitem"),
  ).toHaveLength(3)
})

test("each step is a heading at the level the caller asked for", async () => {
  const { canvas } = await mountStory(Default)

  await expect(
    canvas.getByRole("heading", { level: 3, name: /Rip/ }),
  ).toBeVisible()
})

/**
 * The rule this component turns on. Four statuses painted as four
 * marker colours is a WCAG 1.4.1 failure however clear it looks,
 * so every status reaches a screen reader as a word — and that is
 * also the only channel that survives greyscale and the ePaper
 * build.
 */
test("every status is a word, not only a colour", async () => {
  const { canvas } = await mountStory(AllStates)

  for (const status of [
    "Done",
    "In progress",
    "Blocked",
    "Not started",
  ]) {
    // Twice each: once as the step's visible label in this story,
    // once as the visually-hidden status.
    await expect(
      canvas.getAllByText(status).length,
    ).toBeGreaterThanOrEqual(2)
  }
})

test("the marker is the ordinal, so it renders in a font with no tick glyph", async () => {
  const { canvas } = await mountStory(Default)

  // Not `✓`. `docs/decisions/2026-07-29-ship-no-icons-and-no-symbol-
  // glyphs.md` — a glyph the font lacks paints as an empty box, and
  // an empty box in the "done" position reads as an error.
  await expect(canvas.getByText("1")).toBeVisible()
  await expect(canvas.getByText("3")).toBeVisible()
})

/**
 * The last step must not draw a connector into empty space. A real
 * element rather than a `::before` is what makes this assertable at
 * all — a pseudo-element has nothing to count.
 */
test("the last step draws no connector", async () => {
  const { canvas } = await mountStory(Default)

  const connectors = canvas
    .getAllByRole("listitem")
    .map((item: HTMLElement) =>
      item.querySelector("span[aria-hidden='true']"),
    )

  await expect(connectors.filter(Boolean)).toHaveLength(2)
  await expect(connectors[2]).toBeNull()
})

test("each step carries its key into the DOM, so a re-order can animate", async () => {
  const { canvas } = await mountStory(Default)

  // React's `key` never reaches the markup. Without this attribute
  // a caller who re-orders `steps` has no way to say which `<li>`
  // is which, and `useFlipList` — which matches on exactly this
  // attribute — would fall back to pairing items by POSITION,
  // measure a delta of zero for every one, and animate nothing.
  await expect(
    canvas
      .getAllByRole("listitem")
      .map((item: HTMLElement) =>
        item.getAttribute("data-flip-key"),
      ),
  ).toEqual(["rip", "tag", "file"])
})

test("advancing moves which step is current", async () => {
  const { canvas } = await mountStory(Interactive)

  const heading = () =>
    canvas.getByRole("heading", { level: 3, name: /Tag/ })

  await expect(heading()).toBeVisible()

  await userEvent.click(
    canvas.getByRole("button", { name: "Advance" }),
  )

  // Tag was current and is now done — the status word is the
  // assertion, because it is the only channel that is not a colour.
  await expect(
    heading().textContent?.includes("Done"),
  ).toBe(true)
})

test("no axe violations, in either orientation", async () => {
  const vertical = await mountStory(Default)

  await expectNoAxeViolations(vertical.canvasElement)

  const horizontal = await mountStory(Responsive)

  await expectNoAxeViolations(horizontal.canvasElement)
})

test("a compact card can keep the horizontal ladder below cq-md", async () => {
  const { canvas } = await mountStory(CompactCard)

  await expect(
    getComputedStyle(
      canvas.getByRole("list", { name: "Ingest sequence" }),
    ).flexDirection,
  ).toBe("row")
})
