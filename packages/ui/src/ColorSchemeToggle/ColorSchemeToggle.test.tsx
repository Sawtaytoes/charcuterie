import {
  composeStories,
  composeStory,
} from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import meta, * as stories from "./ColorSchemeToggle.stories.tsx"

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

/**
 * The fix: the switcher is chrome, so it forwards `neutral` to the
 * button by default — a neutral ghost hover
 * (`hover:bg-intent-neutral-surface`) and a neutral icon colour,
 * rather than `IconButton`'s accent default that read as a violet
 * action on real app chrome.
 */
test("defaults to the neutral intent, not accent", async () => {
  const { canvasElement } = await mountStory(Default)

  const button = canvasElement.querySelector("button")

  expect(button?.className).toContain(
    "hover:bg-intent-neutral-surface",
  )
  expect(button?.className).not.toContain("intent-accent")
})

test("an explicit intent overrides the default", async () => {
  const AccentToggle = composeStory(
    { args: { intent: "accent" } },
    meta,
  )

  const { canvasElement } = await mountStory(AccentToggle)

  const button = canvasElement.querySelector("button")

  expect(button?.className).toContain(
    "hover:bg-intent-accent-surface",
  )
})
