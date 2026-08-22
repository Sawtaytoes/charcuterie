import {
  composeStories,
  composeStory,
} from "@storybook/react"
import { expect, fn, userEvent } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import meta, * as stories from "./BadgeButton.stories.tsx"

const { BesideABadge, Default, InATileFooter } =
  composeStories(stories)

/**
 * The properties a `<span onClick>` cannot have, and the reason this
 * is a component rather than a `className` on `Badge`.
 */
test("is a button, not a span", async () => {
  const { canvas } = await mountStory(Default)

  const chip = expectAgentDrivable(canvas, {
    name: "1 episode",
    role: "button",
  })

  await expect(chip.tagName).toBe("BUTTON")
  // Never `submit`: these chips sit inside forms, and the platform's
  // default would make "change the start point" save the dialog.
  await expect(chip).toHaveAttribute("type", "button")
})

test("Tab reaches it and Enter fires it", async () => {
  const onClick = fn()

  const { canvas } = await mountStory(
    composeStory(
      { args: { children: "1 episode", onClick } },
      meta,
    ),
  )

  const chip = canvas.getByRole("button", {
    name: "1 episode",
  })

  await userEvent.tab()
  await expect(chip).toHaveFocus()

  await userEvent.keyboard("{Enter}")
  await expect(onClick).toHaveBeenCalledTimes(1)

  // Space too — the second half of what the platform gives a
  // `<button>` and gives a pressable `<span>` never.
  await userEvent.keyboard(" ")
  await expect(onClick).toHaveBeenCalledTimes(2)
})

/**
 * The claim the component is named for, measured.
 *
 * `Badge` and `BadgeButton` both assemble their pill through
 * `useBadgeShape`, so there is one source — but a shared hook still
 * leaves room for a stray utility, a different base string, or a
 * wrapper element that changes the box. Comparing **computed**
 * styles is the version of "paints identically" that a refactor
 * cannot quietly break.
 *
 * `cursor` is deliberately NOT in this list: the pressable one is a
 * pointer and the static one is not, which is the difference being
 * asserted elsewhere rather than a drift to catch here.
 */
const PAINTED_PROPERTIES = [
  "background-color",
  "border-color",
  "border-radius",
  "border-width",
  "color",
  "display",
  "font-size",
  "font-weight",
  "padding-block-end",
  "padding-block-start",
  "padding-inline-end",
  "padding-inline-start",
]

const getPaint = (element: Element) => {
  const computed = getComputedStyle(element)

  return Object.fromEntries(
    PAINTED_PROPERTIES.map((property) => [
      property,
      computed.getPropertyValue(property),
    ]),
  )
}

test("paints identically to a Badge with the same props", async () => {
  const { canvas } = await mountStory(BesideABadge)

  const chip = canvas.getByRole("button", {
    name: "1 episode",
  })

  // The `Badge` has no role by design, so it is found by its text —
  // which is the handle its own story asserts on.
  const badge = canvas.getByText("1 episode", {
    selector: "span span",
  })

  await expect(getPaint(chip)).toEqual(
    getPaint(badge.parentElement as Element),
  )
})

test("disabled is the native attribute, and it stops the click", async () => {
  const onClick = fn()

  const { canvas } = await mountStory(
    composeStory(
      {
        args: {
          children: "1 episode",
          isDisabled: true,
          onClick,
        },
      },
      meta,
    ),
  )

  const chip = canvas.getByRole("button", {
    name: "1 episode",
  })

  // The NATIVE attribute, not `aria-disabled`: an inert `<button>`
  // is out of the tab order and ignores a click by the platform's
  // own rules, which is what a pill wearing `aria-disabled` and a
  // live handler never gets.
  await expect(chip).toBeDisabled()

  await userEvent.click(chip, { pointerEventsCheck: 0 })

  await expect(onClick).not.toHaveBeenCalled()
})

test("a row of chips is drivable and clean", async () => {
  const { canvas, canvasElement } =
    await mountStory(InATileFooter)

  for (const name of ["3 episodes", "2x weight", "Edit"]) {
    expectAgentDrivable(canvas, { name, role: "button" })
  }

  await expectNoAxeViolations(canvasElement)
})

test("the story meta names the component", async () => {
  await expect(meta.title).toBe(
    "Components/Actions/BadgeButton",
  )
})
