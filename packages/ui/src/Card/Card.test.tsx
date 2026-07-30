import { composeStories } from "@storybook/react"
import { expect } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Card.stories.tsx"

const { AllStates, Default, Interactive } =
  composeStories(stories)

test("a heading turns the card into a named landmark", async () => {
  const { canvas } = await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: "Bay 3",
    role: "region",
  })
})

test("a card with no heading is not a landmark", async () => {
  const { canvas } = await mountStory(AllStates)

  // Four cards on the board, three of them named. A `<section>` with
  // no accessible name is not a region at all — which is the point:
  // the component does not pretend to be one it cannot name.
  await expect(canvas.getAllByRole("region")).toHaveLength(
    3,
  )
})

/**
 * Two identical "Start rip" buttons on one page, disambiguated only
 * by the region each sits in.
 */
test("region scoping disambiguates two identical buttons", async () => {
  const { canvas } = await mountStory(Interactive)

  const bayFour = expectAgentDrivable(canvas, {
    name: "Bay 4",
    role: "region",
  })

  const scoped = bayFour.querySelectorAll("button")

  await expect(scoped).toHaveLength(1)

  // And the progress bar inside that region is the one named for it,
  // so an agent reading a value off a 16-bay tower reads the right
  // bay's.
  await expect(
    canvas.getByRole("progressbar", {
      name: "Bay 4 progress",
    }),
  ).toHaveAttribute("aria-valuenow", "40")
})
