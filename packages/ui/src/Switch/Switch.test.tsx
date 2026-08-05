import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Switch.stories.tsx"

const { AllStates, Default, Interactive } =
  composeStories(stories)

test("it is a switch a screen reader can name and read", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const control = expectAgentDrivable(canvas, {
    name: "Automatic imports",
    role: "switch",
  })

  // `aria-checked`, not `aria-pressed`: a switch announces "off",
  // where a toggle button would announce "not pressed". The role is
  // the whole reason to reach for this over a `Checkbox`.
  await expect(control).toHaveAttribute(
    "aria-checked",
    "false",
  )

  await expectNoAxeViolations(canvasElement)
})

test("Space flips it, and flips it back", async () => {
  const { canvas } = await mountStory(Interactive)

  const control = expectAgentDrivable(canvas, {
    name: "Automatic imports",
    role: "switch",
  })

  control.focus()

  await userEvent.keyboard(" ")

  await waitFor(() => {
    expect(control).toHaveAttribute("aria-checked", "true")
  })

  await userEvent.keyboard(" ")

  await waitFor(() => {
    expect(control).toHaveAttribute("aria-checked", "false")
  })
})

test("a disabled switch cannot be flipped", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const control = expectAgentDrivable(canvas, {
    name: "Disabled",
    role: "switch",
  })

  await expect(control).toBeDisabled()

  await userEvent.click(control)

  await expect(control).toHaveAttribute(
    "aria-checked",
    "false",
  )

  await expectNoAxeViolations(canvasElement)
})

test("isChecked decides the first render", async () => {
  const { canvas } = await mountStory(AllStates)

  await expect(
    expectAgentDrivable(canvas, {
      name: "On",
      role: "switch",
    }),
  ).toHaveAttribute("aria-checked", "true")
})
