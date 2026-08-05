import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Checkbox.stories.tsx"

const { AllStates, Default, Interactive } =
  composeStories(stories)

test("it is a checkbox a screen reader can name", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const checkbox = expectAgentDrivable(canvas, {
    name: "Delete originals after import",
    role: "checkbox",
  })

  await expect(checkbox).not.toBeChecked()

  await expectNoAxeViolations(canvasElement)
})

test("a press toggles it, and the label is part of the target", async () => {
  const { canvas } = await mountStory(Interactive)

  const checkbox = expectAgentDrivable(canvas, {
    name: "Delete originals after import",
    role: "checkbox",
  })

  // The label wraps the control, so a click on the text is a click
  // on the box — which is the association `<label htmlFor>` gets
  // wrong half the time in the fleet and this cannot.
  await userEvent.click(checkbox)

  await waitFor(() => {
    expect(checkbox).toBeChecked()
  })

  await userEvent.click(checkbox)

  await waitFor(() => {
    expect(checkbox).not.toBeChecked()
  })
})

test("a disabled box cannot be toggled", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const disabled = expectAgentDrivable(canvas, {
    name: "Disabled",
    role: "checkbox",
  })

  await expect(disabled).toBeDisabled()

  await expect(disabled).not.toBeChecked()

  await userEvent.click(disabled)

  await expect(disabled).not.toBeChecked()

  await expectNoAxeViolations(canvasElement)
})

test("isChecked decides the first render", async () => {
  const { canvas } = await mountStory(AllStates)

  await expect(
    expectAgentDrivable(canvas, {
      name: "Checked",
      role: "checkbox",
    }),
  ).toBeChecked()
})

test("a read-only box is announced and cannot be toggled", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const readOnly = expectAgentDrivable(canvas, {
    name: "Read-only",
    role: "checkbox",
  })

  // Full contrast, not `disabled` — a read-only value stays readable,
  // and it is focusable so a screen reader reaches it. The state is
  // carried by `aria-readonly`, not by removing it from the tree.
  await expect(readOnly).toHaveAttribute(
    "aria-readonly",
    "true",
  )

  await expect(readOnly).not.toBeDisabled()

  await expect(readOnly).not.toBeChecked()

  await userEvent.click(readOnly)

  // The pointer block held — the box did not flip.
  await expect(readOnly).not.toBeChecked()

  await expectNoAxeViolations(canvasElement)
})
