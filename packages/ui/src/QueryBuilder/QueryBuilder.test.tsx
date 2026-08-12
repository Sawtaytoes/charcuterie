import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./QueryBuilder.stories.tsx"

const { AllStates, Default, Interactive } =
  composeStories(stories)

test("the root group exposes its combinator as a named 'Match' control", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  // One root group, so exactly one combinator select — findable by
  // the label `Field` wires, not a testid.
  expectAgentDrivable(canvas, {
    name: "Match",
    role: "combobox",
  })

  await expectNoAxeViolations(canvasElement)
})

test("'+ Add condition' appends a new leaf row", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  // Interactive starts from a single condition, so every control is
  // unique and nameable.
  await expect(
    canvas.getAllByRole("textbox", { name: "Value" }),
  ).toHaveLength(1)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "+ Add condition",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      canvas.getAllByRole("textbox", { name: "Value" }),
    ).toHaveLength(2)
  })

  await expectNoAxeViolations(canvasElement)
})

test("'+ Add group' nests a second group with its own combinator", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  await expect(
    canvas.getAllByRole("combobox", { name: "Match" }),
  ).toHaveLength(1)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "+ Add group",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      canvas.getAllByRole("combobox", { name: "Match" }),
    ).toHaveLength(2)
  })

  // Only the nested group carries a remove control, so it is unique.
  expectAgentDrivable(canvas, {
    name: "Remove group",
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

test("changing the combinator select updates its value", async () => {
  const { canvas } = await mountStory(Interactive)

  const combinator = expectAgentDrivable(canvas, {
    name: "Match",
    role: "combobox",
  })

  await expect(combinator).toHaveValue("and")

  await userEvent.selectOptions(
    combinator,
    "ANY — one condition",
  )

  await waitFor(() => {
    expect(combinator).toHaveValue("or")
  })
})

test("removing a condition takes its row away", async () => {
  const { canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Remove condition",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      canvas.queryAllByRole("textbox", { name: "Value" }),
    ).toHaveLength(0)
  })
})

test("a nested tree renders every group's combinator and passes axe", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  // Flat harness (1 group) + nested harness (root + one sub-group) =
  // three combinator selects, which is the nesting rendering.
  await expect(
    canvas.getAllByRole("combobox", { name: "Match" })
      .length,
  ).toBeGreaterThanOrEqual(3)

  await expectNoAxeViolations(canvasElement)
})
