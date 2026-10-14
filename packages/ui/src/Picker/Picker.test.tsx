import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Picker.stories.tsx"

const {
  AllStates,
  Playground,
  Interactive,
  NextToText,
  Responsive,
} = composeStories(stories)

test("the trigger's accessible name carries the current value", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)

  // Not a bare "Language": the button's VISIBLE text is the value, and
  // WCAG 2.5.3 wants the visible text inside the accessible name.
  const trigger = expectAgentDrivable(canvas, {
    name: "Language: English",
    role: "button",
  })

  await expect(trigger).toHaveAttribute(
    "aria-haspopup",
    "listbox",
  )

  await expectNoAxeViolations(canvasElement)
})

test("choosing an option updates the trigger", async () => {
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Language: English",
      role: "button",
    }),
  )

  await userEvent.click(
    expectAgentDrivable(body, {
      name: "French",
      role: "option",
    }),
  )

  await waitFor(() => {
    expectAgentDrivable(canvas, {
      name: "Language: French",
      role: "button",
    })
  })
})

test("a picker with no value reads its placeholder", async () => {
  const { canvas } = await mountStory(AllStates)

  expectAgentDrivable(canvas, {
    name: "Language: Choose a language…",
    role: "button",
  })
})

test("a disabled picker does not open", async () => {
  const { body, canvas } = await mountStory(AllStates)

  const disabledTrigger = canvas
    .getAllByRole("button", { name: "Language: English" })
    .find((button: HTMLElement) =>
      button.hasAttribute("disabled"),
    )

  await expect(disabledTrigger).toBeDefined()

  await userEvent.click(disabledTrigger as HTMLElement, {
    pointerEventsCheck: 0,
  })

  await expect(body.queryAllByRole("listbox")).toHaveLength(
    0,
  )
})

test("an inline picker next to a label is still named and has no axe issues", async () => {
  const { canvas, canvasElement } =
    await mountStory(NextToText)

  expectAgentDrivable(canvas, {
    name: "Inline count: 2 Default",
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

test("a rich option label keeps a plain-string trigger via textValue", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  // The label is JSX (a flag, a badge); `textValue` is what the name
  // and the type-ahead use, so the trigger does not read "🇬🇧 English 5.1".
  expectAgentDrivable(canvas, {
    name: "Audio track: English",
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

test("a stretched trigger puts the value at the start and the chevron at the end", async () => {
  const { canvas, canvasElement } =
    await mountStory(Responsive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Language at 34rem: English",
    role: "button",
  })

  const valueElement = canvas
    .getAllByText("English")
    .find((element: HTMLElement) =>
      trigger.contains(element),
    ) as HTMLElement

  // The text's own box, not the span's: the span grows to fill the
  // trigger, so its box would sit at the start even with centered text.
  const valueRange = document.createRange()

  valueRange.selectNodeContents(valueElement)

  const valueBox = valueRange.getBoundingClientRect()
  const triggerBox = trigger.getBoundingClientRect()
  const chevronBox = (
    trigger.querySelector("svg") as SVGElement
  ).getBoundingClientRect()

  const triggerStyle = getComputedStyle(trigger)
  const contentStart =
    triggerBox.left +
    Number.parseFloat(triggerStyle.borderInlineStartWidth) +
    Number.parseFloat(triggerStyle.paddingInlineStart)
  const contentEnd =
    triggerBox.right -
    Number.parseFloat(triggerStyle.borderInlineEndWidth) -
    Number.parseFloat(triggerStyle.paddingInlineEnd)

  // The `Field` stretched the trigger well past its content, so a
  // centered value would start far from the inline start.
  await expect(
    triggerBox.width - valueBox.width - chevronBox.width,
  ).toBeGreaterThan(200)
  await expect(
    Math.abs(valueBox.left - contentStart),
  ).toBeLessThan(1)
  await expect(
    Math.abs(chevronBox.right - contentEnd),
  ).toBeLessThan(1)

  await expectNoAxeViolations(canvasElement)
})

test("a value wider than the trigger truncates and keeps the chevron inside", async () => {
  const { canvas } = await mountStory(Responsive)

  const trigger = expectAgentDrivable(canvas, {
    name: "Subtitles at 15rem: English (SDH, signs and songs, full dialogue)",
    role: "button",
  })

  const valueElement = canvas
    .getAllByText(
      "English (SDH, signs and songs, full dialogue)",
    )
    .find((element: HTMLElement) =>
      trigger.contains(element),
    ) as HTMLElement

  const triggerBox = trigger.getBoundingClientRect()
  const chevronBox = (
    trigger.querySelector("svg") as SVGElement
  ).getBoundingClientRect()

  await expect(valueElement.scrollWidth).toBeGreaterThan(
    valueElement.clientWidth,
  )
  await expect(trigger.scrollWidth).toBe(
    trigger.clientWidth,
  )
  await expect(chevronBox.right).toBeLessThanOrEqual(
    triggerBox.right,
  )
})
