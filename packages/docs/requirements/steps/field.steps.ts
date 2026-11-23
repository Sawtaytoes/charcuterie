import { composeStories } from "@storybook/react"

import * as fieldStories from "../../../ui/src/Field/Field.stories.tsx"
import {
  openStory,
  storyNamed,
} from "../helpers/stories.ts"
import { Given } from "../support/steps.ts"

/**
 * Field fixtures: its stories, by the names Storybook shows. The stories
 * are composed inside the step, so only the requirements that open a
 * Field story reach them in the lock.
 */

/** A Field story, by its Storybook name, such as "All States". */
Given(
  "the Field story {string} is open",
  async (world, name: string) => {
    await openStory(
      world,
      storyNamed(
        "Field",
        composeStories(fieldStories),
        name,
      ),
    )
  },
)
