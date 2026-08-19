import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Select.stories.tsx"

const { AllStates, AllVariants, Default, Sized } =
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

/**
 * The #112 regression test, and it has to be a *measurement*. Every
 * class-name assertion this could have been passed while the control
 * was 869.6px away from its own chevron: `w-44` was present, on the
 * element nobody was looking at.
 */
test("a width on className sizes the control, chevron included", async () => {
  const { canvas } = await mountStory(Sized)

  const select = expectAgentDrivable(canvas, {
    name: "Profile sized",
    role: "combobox",
  }) as HTMLSelectElement

  const wrapper = select.parentElement as HTMLElement
  const chevron = wrapper.querySelector("svg") as SVGElement

  const selectBox = select.getBoundingClientRect()
  const wrapperBox = wrapper.getBoundingClientRect()
  const chevronBox = chevron.getBoundingClientRect()

  // 11rem. The caller asked for one box, not two of different sizes.
  await expect(wrapperBox.width).toBe(176)

  await expect(selectBox.width).toBe(wrapperBox.width)

  // The chevron is `end-3` against the wrapper, so this is the whole
  // bug in one number: it used to read 869.6.
  await expect(
    selectBox.right - chevronBox.right,
  ).toBeCloseTo(12, 1)

  // …and it is inside the control on the other side too, rather than
  // merely near it.
  await expect(chevronBox.left).toBeGreaterThan(
    selectBox.left,
  )
})

/**
 * The other half of the split: an inner-element class still reaches
 * the inner element, and does not become the wrapper's problem.
 */
test("controlClassName reaches the select, not the wrapper", async () => {
  const { canvas } = await mountStory(Sized)

  const select = expectAgentDrivable(canvas, {
    name: "Profile monospaced",
    role: "combobox",
  }) as HTMLSelectElement

  const wrapper = select.parentElement as HTMLElement

  await expect(select.className).toContain("font-mono")

  await expect(wrapper.className).not.toContain("font-mono")

  // …and the wrapper is still the one carrying the width.
  await expect(wrapper.getBoundingClientRect().width).toBe(
    256,
  )
})

/**
 * The default is unchanged, which is the other half of the fix being
 * safe: every existing caller passes no width and expects the
 * control to fill its parent.
 */
test("with no className, the control still fills its parent", async () => {
  const { canvas } = await mountStory(Sized)

  const select = expectAgentDrivable(canvas, {
    name: "Profile full width",
    role: "combobox",
  }) as HTMLSelectElement

  const wrapper = select.parentElement as HTMLElement
  const parent = wrapper.parentElement as HTMLElement

  await expect(
    wrapper.getBoundingClientRect().width,
  ).toBeCloseTo(parent.getBoundingClientRect().width, 1)

  await expect(
    select.getBoundingClientRect().width,
  ).toBeCloseTo(wrapper.getBoundingClientRect().width, 1)
})
