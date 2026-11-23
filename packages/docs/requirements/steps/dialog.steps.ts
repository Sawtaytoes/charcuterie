import { composeStories } from "@storybook/react"

import * as dialogStories from "../../../ui/src/Dialog/Dialog.stories.tsx"
import {
  openStory,
  storyNamed,
} from "../helpers/stories.ts"
import { Given } from "../support/steps.ts"

/**
 * Dialog fixtures: its stories, by the names Storybook shows. The stories
 * are composed inside the step, so only the requirements that open a
 * Dialog story reach them in the lock.
 */

/** A Dialog story, by its Storybook name, such as "All States". */
Given(
  "the Dialog story {string} is open",
  async (world, name: string) => {
    await openStory(
      world,
      storyNamed(
        "Dialog",
        composeStories(dialogStories),
        name,
      ),
    )
  },
)
