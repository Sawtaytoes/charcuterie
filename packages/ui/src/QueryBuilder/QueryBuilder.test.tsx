import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./QueryBuilder.stories.tsx"

const {
  AllStates,
  CustomCombinator,
  Default,
  Interactive,
} = composeStories(stories)

test("the root group exposes its combinator as a named 'Match' control", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  // One root group, so exactly one combinator picker. It is a
  // `Listbox` trigger, so the control is a button that opens a
  // listbox — named "Match: <current>", which keeps the button's
  // visible text (the combinator) inside its accessible name.
  const combinator = expectAgentDrivable(canvas, {
    name: /^Match: /,
    role: "button",
  })

  await expect(combinator).toHaveAttribute(
    "aria-haspopup",
    "listbox",
  )

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
    canvas.getAllByRole("button", { name: /^Match: / }),
  ).toHaveLength(1)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "+ Add group",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      canvas.getAllByRole("button", { name: /^Match: / }),
    ).toHaveLength(2)
  })

  // Only the nested group carries a remove control, so it is unique.
  expectAgentDrivable(canvas, {
    name: "Remove group",
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

test("choosing a combinator from the listbox updates the group", async () => {
  const { body, canvas } = await mountStory(Interactive)

  // The trigger's label IS the current combinator, so the change is
  // asserted on its accessible name rather than a form value — a
  // `Listbox` trigger is a button and holds none.
  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Match: ALL — every condition",
      role: "button",
    }),
  )

  await userEvent.click(
    expectAgentDrivable(body, {
      name: "ANY — one condition",
      role: "option",
    }),
  )

  await waitFor(() => {
    expectAgentDrivable(canvas, {
      name: "Match: ANY — one condition",
      role: "button",
    })
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
  // three combinator pickers, which is the nesting rendering.
  await expect(
    canvas.getAllByRole("button", { name: /^Match: / })
      .length,
  ).toBeGreaterThanOrEqual(3)

  await expectNoAxeViolations(canvasElement)
})

test("renderCombinator replaces the built-in picker, and its second control filters", async () => {
  const { body, canvas } = await mountStory(
    CustomCombinator,
  )

  // The app's control is rendered instead of the default one — no
  // "Match: <combinator>" trigger anywhere.
  await expect(
    canvas.queryAllByRole("button", { name: /^Match: / }),
  ).toHaveLength(0)

  const target = expectAgentDrivable(canvas, {
    name: /^Target: /,
    role: "button",
  })

  // Both targets are offered while the quantifier is ALL.
  await userEvent.click(target)

  await expect(body.getAllByRole("option")).toHaveLength(2)

  await userEvent.keyboard("{Escape}")

  // Switching to NOT ALL collapses the target list to the one legal
  // pair — the asymmetry this prop exists to express.
  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: /^Quantifier: /,
      role: "button",
    }),
  )

  await userEvent.click(
    expectAgentDrivable(body, {
      name: "NOT ALL",
      role: "option",
    }),
  )

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: /^Target: /,
      role: "button",
    }),
  )

  await waitFor(async () => {
    await expect(body.getAllByRole("option")).toHaveLength(
      1,
    )
  })
})
