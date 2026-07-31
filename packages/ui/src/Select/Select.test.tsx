import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Select.stories.tsx"

const { AllStates, AllVariants, Default } =
  composeStories(stories)

test("a select is named, and therefore findable", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  // Twelve of the fleet's fourteen native selects have neither a
  // `<label for>` nor an `aria-label`, so this query returns nothing
  // for any of them. A `<select>` reports `role="combobox"`.
  expectAgentDrivable(canvas, {
    name: "Rip profile",
    role: "combobox",
  })

  await expectNoAxeViolations(canvasElement)
})

test("choosing reports the value outward", async () => {
  const { canvas } = await mountStory(Default)

  const select = expectAgentDrivable(canvas, {
    name: "Rip profile",
    role: "combobox",
  }) as HTMLSelectElement

  await userEvent.selectOptions(select, "compressed")

  await expect(select.value).toBe("compressed")
})

/**
 * The platform owns the value, and this component owns none. Every
 * other interactive component here holds its state in
 * `@charcuterie/logic`; putting a `useSinglePicker` beside a
 * `<select>` would be two things believing they hold one fact —
 * the Radix argument from `Popover`, pointed at ourselves.
 */
test("the initial value seeds the DOM and nothing more", async () => {
  const { canvas } = await mountStory(AllVariants)

  const select = expectAgentDrivable(canvas, {
    name: "Profile with prompt",
    role: "combobox",
  }) as HTMLSelectElement

  // A placeholder is a *disabled* option, so it shows and cannot be
  // submitted. An empty-valued enabled option would look identical
  // and silently post "".
  await expect(select.value).toBe("")

  const [placeholder] = Array.from(select.options)

  await expect(placeholder).toBeDisabled()
})

test("a disabled option stays announced", async () => {
  const { canvas } = await mountStory(Default)

  const select = expectAgentDrivable(canvas, {
    name: "Rip profile",
    role: "combobox",
  }) as HTMLSelectElement

  const dolby = Array.from(select.options).find(
    (option) => option.value === "dv",
  )

  // In the tree, and unselectable. Removing it instead would tell a
  // screen-reader user the profile does not exist rather than that
  // it is unavailable.
  await expect(dolby).toBeDisabled()

  await expect(dolby).toHaveTextContent("Dolby Vision")
})

test("option groups keep their group names", async () => {
  const { canvas } = await mountStory(AllVariants)

  const select = expectAgentDrivable(canvas, {
    name: "Stream kind",
    role: "combobox",
  }) as HTMLSelectElement

  const groups = Array.from(
    select.querySelectorAll("optgroup"),
  ).map((group) => group.label)

  await expect(groups).toEqual(["Video", "Audio"])
})

test("a disabled select is disabled, not merely dimmed", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  await expect(
    expectAgentDrivable(canvas, {
      name: "Profile disabled",
      role: "combobox",
    }),
  ).toBeDisabled()

  await expectNoAxeViolations(canvasElement)
})

test("inside a Field, the label does the naming", async () => {
  const { canvas } = await mountStory(AllStates)

  // No `label` prop on this one — `Field` clones an `id` in and its
  // `<label for>` picks it up. Two naming mechanisms that must not
  // both fire, or the accessible name is the wrong one.
  const select = expectAgentDrivable(canvas, {
    name: "Profile in a field",
    role: "combobox",
  })

  await expect(select).not.toHaveAttribute("aria-label")

  await expect(select).toHaveAttribute("aria-describedby")
})
