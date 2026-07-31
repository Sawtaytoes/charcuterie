import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Alert.stories.tsx"

const { AllStates, Default, Interactive, Responsive } =
  composeStories(stories)

test("a labelled alert is a landmark an agent can scope to", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  const alert = expectAgentDrivable(canvas, {
    name: "Bay 7 verdict",
    role: "region",
  })

  // The whole reason `label` exists: the action inside is reachable
  // *through* the alert, which is what disambiguates one of nine
  // identical "Retry" buttons on a nine-bay tower.
  await expect(alert).toContainElement(
    expectAgentDrivable(canvas, {
      name: "Retry in another bay",
      role: "button",
    }),
  )

  await expectNoAxeViolations(canvasElement)
})

test("an unlabelled alert is not a landmark", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  // A block, deliberately. Nine bay cards each holding a named
  // region called "Part of the tower-wide problem above." is axe's
  // `landmark-unique`, so the default has to be the quiet one.
  await expect(
    canvas.queryAllByRole("region"),
  ).toHaveLength(0)

  await expect(
    canvas.getByText(
      "Four bays stalled at once — check the USB hub's power",
    ),
  ).toBeVisible()

  await expectNoAxeViolations(canvasElement)
})

test("the evidence is a list, and repeated evidence still renders", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  const list = canvas.getByRole("list")

  await expect(
    canvas.getAllByRole("listitem"),
  ).toHaveLength(2)

  await expect(list).toHaveTextContent(
    "3 read errors in 40 s",
  )

  await expectNoAxeViolations(canvasElement)
})

/**
 * Six landmarks in one board, and every one of them differently
 * named — because two `<section>`s sharing a name is a violation
 * rather than a duplicate, which is exactly why the default is a
 * plain block.
 */
test("the whole variants board is clean under axe", async () => {
  const { canvasElement } = await mountStory(AllStates)

  await expectNoAxeViolations(canvasElement)
})

test("the actions drop below the sentence in a narrow container", async () => {
  const { canvas } = await mountStory(Responsive)

  const narrow = expectAgentDrivable(canvas, {
    name: "Discs still in the tower at 15rem",
    role: "region",
  })

  const wide = expectAgentDrivable(canvas, {
    name: "Discs still in the tower at 34rem",
    role: "region",
  })

  const getRowDirection = (alert: HTMLElement) =>
    globalThis.getComputedStyle(
      alert.firstElementChild as HTMLElement,
    ).flexDirection

  // The **axis**, not the height. The first draft of this test
  // compared the two rows' heights and passed with `cq-sm:flex-row`
  // deleted — because at 15rem the sentence wraps onto more lines
  // whatever the button does, so it was measuring text wrapping and
  // calling it a container query. This is the thing itself: at 15rem
  // the button sits under the text, at 34rem beside it, and the
  // width that decided is the panel's rather than the window's.
  await expect(getRowDirection(narrow)).toBe("column")

  await expect(getRowDirection(wide)).toBe("row")
})
