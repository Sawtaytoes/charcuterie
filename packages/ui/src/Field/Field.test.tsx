import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Field.stories.tsx"

const { AllStates, AllVariants, Default } =
  composeStories(stories)

test("the label names the control it points at", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  // The whole point of the component in one query: the control is
  // findable by the *label's* text, which is only true if `htmlFor`
  // and the control's `id` agree. mux-magic's `FieldLabel` renders
  // a `<label>` with no `htmlFor` at all — it looks right, reads
  // right to a sighted user, and gives this query nothing.
  const control = expectAgentDrivable(canvas, {
    name: "Output directory",
    role: "textbox",
  })

  await expect(control).toHaveAttribute("id")

  await expectNoAxeViolations(canvasElement)
})

test("a description is announced with the control", async () => {
  const { canvas } = await mountStory(Default)

  const control = expectAgentDrivable(canvas, {
    name: "Output directory",
    role: "textbox",
  })

  const describedBy = control.getAttribute(
    "aria-describedby",
  )

  await expect(describedBy).not.toBeNull()

  await expect(
    document.getElementById(describedBy ?? ""),
  ).toHaveTextContent("Where finished rips are moved.")
})

test("the slot takes a Select as readily as an input", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  // A native `<select>` reports `role="combobox"`, and it is named
  // by the same cloned `id`. The slot does not know what it is
  // holding, which is the contract.
  expectAgentDrivable(canvas, {
    name: "Rip profile",
    role: "combobox",
  })

  await expectNoAxeViolations(canvasElement)
})

test("`required` is spelled twice, on purpose", async () => {
  const { canvas } = await mountStory(AllVariants)

  const control = expectAgentDrivable(canvas, {
    name: "Disc label",
    role: "textbox",
  })

  // `required` is the constraint the browser validates;
  // `aria-required` is the one it announces on a control the browser
  // does not validate. They are not redundant, and a component that
  // sets only the first is silent on a composite widget.
  await expect(control).toBeRequired()

  await expect(control).toHaveAttribute(
    "aria-required",
    "true",
  )
})

test("an error is the only source of invalidity", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  // Valid: nothing claims otherwise.
  await expect(
    expectAgentDrivable(canvas, {
      name: "Bay name",
      role: "textbox",
    }),
  ).not.toHaveAttribute("aria-invalid")

  const invalid = expectAgentDrivable(canvas, {
    name: "Scratch path",
    role: "textbox",
  })

  await expect(invalid).toHaveAttribute(
    "aria-invalid",
    "true",
  )

  await expect(
    document.getElementById(
      invalid.getAttribute("aria-describedby") ?? "",
    ),
  ).toHaveTextContent("That path is not writable.")

  await expectNoAxeViolations(canvasElement)
})

/**
 * Order inside `aria-describedby` is behaviour, not formatting. A
 * screen reader reads the list in sequence, and "absolute paths only
 * — that path is not writable" is a different sentence from its
 * reverse. Nothing but the order of one array enforces it.
 */
test("description is described before error", async () => {
  const { canvas } = await mountStory(AllStates)

  const control = expectAgentDrivable(canvas, {
    name: "Archive path",
    role: "textbox",
  })

  const [descriptionId, errorId] = (
    control.getAttribute("aria-describedby") ?? ""
  ).split(" ")

  await expect(
    document.getElementById(descriptionId ?? ""),
  ).toHaveTextContent("Absolute paths only.")

  await expect(
    document.getElementById(errorId ?? ""),
  ).toHaveTextContent("That path is not writable.")
})
