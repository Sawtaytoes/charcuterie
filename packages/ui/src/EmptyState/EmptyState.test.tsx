import { composeStories } from "@storybook/react"
import { expect, userEvent } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./EmptyState.stories.tsx"

const { Default, DeeplyNested, Interactive } =
  composeStories(stories)

test("the heading is the handle", async () => {
  const { canvas } = await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: "No discs queued",
    role: "heading",
  })
})

test("the heading level is the caller's, and Tab reaches the way out", async () => {
  const { canvas } = await mountStory(Interactive)

  // `headingLevel` is a prop rather than a guess, because an empty
  // state nested in a card is not an `<h2>` — and a document whose
  // heading levels skip is one a screen-reader user cannot skim.
  await expect(
    canvas.getByRole("heading", {
      level: 3,
      name: "No discs queued",
    }),
  ).toBeVisible()

  const action = expectAgentDrivable(canvas, {
    name: "Scan drives",
    role: "button",
  })

  await userEvent.tab()

  await expect(action).toHaveFocus()
})

test("the heading level reaches h6 for a deeply nested section", async () => {
  const { canvas } = await mountStory(DeeplyNested)

  // An empty state nested past four sections needs 5 or 6; the old
  // `2 | 3 | 4` cap was a guess about depth the caller knows, and
  // `` `h${headingLevel}` `` never had an upper bound to begin with.
  await expect(
    canvas.getByRole("heading", {
      level: 6,
      name: "No discs queued",
    }),
  ).toBeVisible()
})
