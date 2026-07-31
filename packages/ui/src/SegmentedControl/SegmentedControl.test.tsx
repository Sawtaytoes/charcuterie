import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./SegmentedControl.stories.tsx"

const { AllStates, Default, Interactive } =
  composeStories(stories)

/**
 * `querySelectorAll` rather than `getAllByRole("radio")`, and not
 * for typing convenience: a board renders several groups, and an
 * assertion about "exactly one tab stop" is only the roving rule
 * when it is scoped to **one** group.
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
    name: "Columns",
    role: "radiogroup",
  })

  const options = getOptions(group)

  await expect(options).toHaveLength(5)

  await waitFor(() => {
    expect(
      options.filter(
        (one) =>
          one.getAttribute("aria-checked") === "true",
      ),
    ).toHaveLength(1)
  })

  // The state kind's invariant, visible in the DOM: `SinglePicker`
  // holds one intent field, so "at most one checked" is true by
  // representation rather than by bookkeeping.
  await expect(group).toContainElement(options[0] ?? null)

  await expectNoAxeViolations(canvasElement)
})

test("Tab enters the group once, and the arrows move within it", async () => {
  const { canvas } = await mountStory(Interactive)

  const options = getOptions(
    expectAgentDrivable(canvas, {
      name: "Columns",
      role: "radiogroup",
    }),
  )

  // Zero tab stops strands the widget; several mean the roving
  // pattern was never implemented. Exactly one is the rule, read
  // straight out of `selectTabIndex`.
  await expect(
    options.filter((one) => one.tabIndex === 0),
  ).toHaveLength(1)

  await userEvent.tab()

  await waitFor(() => {
    expect(options[0]).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowRight}")

  await waitFor(() => {
    expect(options[1]).toHaveFocus()
  })
})

/**
 * The radio-group rule, and the thing that makes this component a
 * different composition from `Tabs` rather than a restyle of it:
 * moving focus **checks**. `Tabs` has two activation modes because a
 * panel can cost a network request; there is nothing behind an
 * option here to be expensive.
 */
test("selection follows focus, and wraps", async () => {
  const { canvas } = await mountStory(Interactive)

  const options = getOptions(
    expectAgentDrivable(canvas, {
      name: "Columns",
      role: "radiogroup",
    }),
  )

  options[0]?.focus()

  await userEvent.keyboard("{ArrowRight}")

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

  // Home and End, then wrapping — all three from `RovingFocus`,
  // none of them written here.
  await userEvent.keyboard("{End}")

  await waitFor(() => {
    expect(options[4]).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })

  await userEvent.keyboard("{ArrowRight}")

  await waitFor(() => {
    expect(options[0]).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })
})

test("a pointer press checks the option it landed on", async () => {
  const { canvas } = await mountStory(Interactive)

  const four = expectAgentDrivable(canvas, {
    name: "4",
    role: "radio",
  })

  await userEvent.click(four)

  await waitFor(() => {
    expect(four).toHaveAttribute("aria-checked", "true")
  })
})

test("the arrow keys skip a disabled option", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const group = expectAgentDrivable(canvas, {
    name: "Columns with 2 unavailable",
    role: "radiogroup",
  })

  const options = getOptions(group)

  const [first, , two, three] = options as [
    HTMLButtonElement,
    HTMLButtonElement,
    HTMLButtonElement,
    HTMLButtonElement,
  ]

  await expect(two).toBeDisabled()

  first.focus()

  await userEvent.keyboard("{ArrowRight}{ArrowRight}")

  // Two presses from `auto` lands on `3`, not on the disabled `2` —
  // registration is membership, and a disabled option never joined
  // the focus group.
  await waitFor(() => {
    expect(three).toHaveFocus()
  })

  await expect(two).not.toHaveFocus()

  await expectNoAxeViolations(canvasElement)
})

test("selectedValue decides the first render and nothing after", async () => {
  const { canvas } = await mountStory(AllStates)

  const group = expectAgentDrivable(canvas, {
    name: "Columns starting on 3",
    role: "radiogroup",
  })

  // A controlled prop is the thing this library refuses to have —
  // and reading it on the first paint is why the component falls
  // back to `pendingValue`: members register from an effect, so
  // `selectedValue` is still null when the group first paints.
  await waitFor(() => {
    expect(
      group.querySelector('[aria-checked="true"]'),
    ).toHaveTextContent("3")
  })
})
