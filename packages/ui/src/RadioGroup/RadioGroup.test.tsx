import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./RadioGroup.stories.tsx"

const { AllStates, Default, Interactive } =
  composeStories(stories)

/**
 * `querySelectorAll` rather than `getAllByRole("radio")`: a board
 * renders several groups, and "exactly one tab stop" is only the
 * roving rule when it is scoped to **one** group.
 */
const getOptions = (group: HTMLElement) =>
  Array.from(
    group.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]',
    ),
  )

test("it is a radio group with exactly one option checked", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const group = expectAgentDrivable(canvas, {
    name: "Naming scheme",
    role: "radiogroup",
  })

  const options = getOptions(group)

  await expect(options).toHaveLength(4)

  await waitFor(() => {
    expect(
      options.filter(
        (one) =>
          one.getAttribute("aria-checked") === "true",
      ),
    ).toHaveLength(1)
  })

  await expectNoAxeViolations(canvasElement)
})

test("Tab enters the group once, and the arrows move within it", async () => {
  const { canvas } = await mountStory(Interactive)

  const options = getOptions(
    expectAgentDrivable(canvas, {
      name: "Naming scheme",
      role: "radiogroup",
    }),
  )

  // Exactly one tab stop is the roving rule, read straight out of
  // `selectTabIndex`. Zero strands the widget; several mean the
  // pattern was never implemented.
  await expect(
    options.filter((one) => one.tabIndex === 0),
  ).toHaveLength(1)

  await userEvent.tab()

  await waitFor(() => {
    expect(options[0]).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(options[1]).toHaveFocus()
  })
})

test("selection follows focus, and wraps", async () => {
  const { canvas } = await mountStory(Interactive)

  const options = getOptions(
    expectAgentDrivable(canvas, {
      name: "Naming scheme",
      role: "radiogroup",
    }),
  )

  options[0]?.focus()

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(options[1]).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })

  await expect(options[0]).toHaveAttribute(
    "aria-checked",
    "false",
  )

  // End then wrap — both from `RovingFocus`, neither written in the
  // component.
  await userEvent.keyboard("{End}")

  await waitFor(() => {
    expect(options[3]).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(options[0]).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })
})

test("a pointer press checks the option it landed on", async () => {
  const { canvas } = await mountStory(Interactive)

  const custom = expectAgentDrivable(canvas, {
    name: "Use a custom pattern",
    role: "radio",
  })

  await userEvent.click(custom)

  await waitFor(() => {
    expect(custom).toHaveAttribute("aria-checked", "true")
  })
})

test("the arrow keys skip a disabled option", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const group = expectAgentDrivable(canvas, {
    name: "Naming scheme with original unavailable",
    role: "radiogroup",
  })

  const options = getOptions(group)

  const [first, , original, custom] = options as [
    HTMLButtonElement,
    HTMLButtonElement,
    HTMLButtonElement,
    HTMLButtonElement,
  ]

  await expect(original).toBeDisabled()

  first.focus()

  await userEvent.keyboard("{ArrowDown}{ArrowDown}")

  // Two presses from the first option lands on `custom`, skipping
  // the disabled `original` — registration is membership, and a
  // disabled option never joined the focus group.
  await waitFor(() => {
    expect(custom).toHaveFocus()
  })

  await expect(original).not.toHaveFocus()

  await expectNoAxeViolations(canvasElement)
})

test("selectedValue decides the first render and nothing after", async () => {
  const { canvas } = await mountStory(AllStates)

  const group = expectAgentDrivable(canvas, {
    name: "Naming scheme starting on custom",
    role: "radiogroup",
  })

  await waitFor(() => {
    expect(
      group.querySelector('[aria-checked="true"]'),
    ).toHaveTextContent("Use a custom pattern")
  })
})

test("a read-only group is announced and its choice cannot move", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const group = expectAgentDrivable(canvas, {
    name: "Naming scheme, read-only",
    role: "radiogroup",
  })

  await expect(group).toHaveAttribute(
    "aria-readonly",
    "true",
  )

  // The checked option shows at full contrast; that is the value the
  // read-only group is displaying.
  await waitFor(() => {
    expect(
      group.querySelector('[aria-checked="true"]'),
    ).toHaveTextContent("Match AniDB titles")
  })

  const other = Array.from(
    group.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]',
    ),
  ).find(
    (one) => one.textContent === "Use a custom pattern",
  )

  await userEvent.click(other ?? group)

  // Selection-follows-focus is severed when read-only — a click on
  // another option does not move the choice.
  await expect(
    group.querySelector('[aria-checked="true"]'),
  ).toHaveTextContent("Match AniDB titles")

  await expectNoAxeViolations(canvasElement)
})
