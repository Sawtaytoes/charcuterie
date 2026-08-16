import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Picker.stories.tsx"

const { AllStates, Default, Interactive, NextToText } =
  composeStories(stories)

test("the trigger's accessible name carries the current value", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

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
