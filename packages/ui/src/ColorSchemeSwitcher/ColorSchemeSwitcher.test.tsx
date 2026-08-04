import { composeStories } from "@storybook/react"
import { expect, userEvent, within } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./ColorSchemeSwitcher.stories.tsx"

const { Default } = composeStories(stories)

/**
 * The connected switcher is agent-drivable and cycles like the
 * toggle — the extra thing proven here is that the resolved scheme
 * reaches the applier: the demo panel's `data-scheme` tracks it.
 */
test("it renders a named, drivable button", async () => {
  const { canvas } = await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: /colour scheme/i,
    role: "button",
  })
})

test("system resolves through the injected resolver to the panel", async () => {
  const { canvasElement } = await mountStory(Default)

  const panel = canvasElement.querySelector("[data-scheme]")

  // The injected resolver answers "dark", mode starts on system.
  expect(panel?.getAttribute("data-scheme")).toBe("dark")
})

test("cycling to a concrete mode re-applies the scheme", async () => {
  const { canvasElement } = await mountStory(Default)

  const canvas = within(canvasElement)

  const button = expectAgentDrivable(canvas, {
    name: /colour scheme/i,
    role: "button",
  })

  const panel = canvasElement.querySelector("[data-scheme]")

  // system → light: resolved scheme is now light regardless of OS.
  await userEvent.click(button)

  expect(panel?.getAttribute("data-scheme")).toBe("light")

  await expectNoAxeViolations(canvasElement)
})

test("the connected switcher forwards the neutral intent by default", async () => {
  const { canvasElement } = await mountStory(Default)

  const button = canvasElement.querySelector("button")

  // Chrome, not an accent action — the hover is the neutral surface.
  expect(button?.className).toContain(
    "hover:bg-intent-neutral-surface",
  )
  expect(button?.className).not.toContain("intent-accent")
})
