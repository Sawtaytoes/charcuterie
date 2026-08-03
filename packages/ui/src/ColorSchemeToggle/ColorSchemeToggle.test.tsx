import { composeStories } from "@storybook/react"
import { userEvent } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./ColorSchemeToggle.stories.tsx"

const { AllModes, Default } = composeStories(stories)

/**
 * The name states the current mode — a screen reader that lands on
 * the control hears "Colour scheme: system", not a nameless button,
 * and an agent can find it.
 */
test("the toggle is named for its current mode", async () => {
  const { canvas } = await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: /colour scheme: system/i,
    role: "button",
  })
})

test("a press cycles the mode and updates the name", async () => {
  const { canvas } = await mountStory(Default)

  const button = expectAgentDrivable(canvas, {
    name: /colour scheme: system/i,
    role: "button",
  })

  // system → light
  await userEvent.click(button)

  expectAgentDrivable(canvas, {
    name: /colour scheme: light/i,
    role: "button",
  })

  // light → dark
  await userEvent.click(button)

  expectAgentDrivable(canvas, {
    name: /colour scheme: dark/i,
    role: "button",
  })
})

test("the icon is hidden from assistive tech; the name carries it", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: /colour scheme/i,
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

test("each mode renders its own control", async () => {
  const { canvas } = await mountStory(AllModes)

  expectAgentDrivable(canvas, {
    name: /colour scheme: light/i,
    role: "button",
  })

  expectAgentDrivable(canvas, {
    name: /colour scheme: dark/i,
    role: "button",
  })

  expectAgentDrivable(canvas, {
    name: /colour scheme: system/i,
    role: "button",
  })
})
