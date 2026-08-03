import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Listbox.stories.tsx"

const { AllStates, Default, Interactive } =
  composeStories(stories)

test("a button opens a listbox whose rows are options", async () => {
  const { body, canvas } = await mountStory(Default)

  const trigger = expectAgentDrivable(canvas, {
    name: "Choose a language",
    role: "button",
  })

  // The trigger stays a native button that *opens* a listbox — it is
  // not a `combobox`. It gains `aria-haspopup="listbox"`.
  await expect(trigger).toHaveAttribute(
    "aria-haspopup",
    "listbox",
  )

  await userEvent.click(trigger)

  const listbox = expectAgentDrivable(body, {
    role: "listbox",
  })

  // `option`, not `menuitem` — a value being chosen, so it carries
  // `aria-selected`.
  const english = expectAgentDrivable(body, {
    name: "English",
    role: "option",
  })

  await expect(english).toHaveAttribute(
    "aria-selected",
    "false",
  )

  await expectNoAxeViolations(listbox)
})

test("opening focuses the seeded selection, which reads selected", async () => {
  const { body, canvas } = await mountStory(AllStates)

  // The trigger reflects the seeded value.
  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Spanish",
      role: "button",
    }),
  )

  const spanish = expectAgentDrivable(body, {
    name: "Spanish",
    role: "option",
  })

  await expect(spanish).toHaveAttribute(
    "aria-selected",
    "true",
  )

  // The APG rule: a listbox opens on its current value.
  await waitFor(() => {
    expect(spanish).toHaveFocus()
  })
})

test("the arrow keys move focus and skip the disabled option", async () => {
  const { body, canvas } = await mountStory(Default)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Choose a language",
      role: "button",
    }),
  )

  const english = expectAgentDrivable(body, {
    name: "English",
    role: "option",
  })

  const japanese = expectAgentDrivable(body, {
    name: "Japanese",
    role: "option",
  })

  await expect(
    expectAgentDrivable(body, {
      name: "German",
      role: "option",
    }),
  ).toBeDisabled()

  await waitFor(() => {
    expect(english).toHaveFocus()
  })

  // English → Spanish → French → Japanese, skipping the disabled
  // German, which never joined the focus group.
  await userEvent.keyboard(
    "{ArrowDown}{ArrowDown}{ArrowDown}",
  )

  await waitFor(() => {
    expect(japanese).toHaveFocus()
  })
})

test("type-ahead jumps to the first match", async () => {
  const { body, canvas } = await mountStory(Default)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Choose a language",
      role: "button",
    }),
  )

  const japanese = expectAgentDrivable(body, {
    name: "Japanese",
    role: "option",
  })

  await userEvent.keyboard("j")

  await waitFor(() => {
    expect(japanese).toHaveFocus()
  })
})

test("Enter selects the focused option and closes", async () => {
  const { body, canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Choose a language",
      role: "button",
    }),
  )

  // English is first and focused; arrow to Spanish and choose it.
  await userEvent.keyboard("{ArrowDown}{Enter}")

  await waitFor(() => {
    expect(body.queryByRole("listbox")).toBeNull()
  })

  // Choosing flows back through `onSelect`, so the trigger now reads
  // the chosen value.
  expectAgentDrivable(canvas, {
    name: "Spanish",
    role: "button",
  })
})

test("Escape dismisses without choosing, and there is one tab stop", async () => {
  const { body, canvas } = await mountStory(Default)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Choose a language",
      role: "button",
    }),
  )

  const listbox = expectAgentDrivable(body, {
    role: "listbox",
  })

  const tabbable = Array.from(
    listbox.querySelectorAll<HTMLButtonElement>(
      '[role="option"]',
    ),
  ).filter((one) => one.tabIndex === 0)

  await expect(tabbable).toHaveLength(1)

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(body.queryByRole("listbox")).toBeNull()
  })

  // Unchanged trigger — nothing was chosen.
  expectAgentDrivable(canvas, {
    name: "Choose a language",
    role: "button",
  })
})
