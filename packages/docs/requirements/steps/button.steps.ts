import { composeStory } from "@storybook/react"

import buttonMeta, {
  AllStates,
  Loading,
  Playground,
} from "../../../ui/src/Button/Button.stories.tsx"
import { trackActivations } from "../helpers/activations.ts"
import { openStory } from "../helpers/stories.ts"
import { Given } from "../support/steps.ts"

/**
 * Button fixtures. Each Given mounts a real story, and the ones a
 * scenario clicks install a handler that counts activations for that
 * button's name only.
 */

const playgroundName = String(Playground.args?.children)

/** The Playground story, with its handler counting activations of "Start rip". */
Given("the Button playground is open", async (world) => {
  await openStory(
    world,
    composeStory(
      {
        ...Playground,
        args: {
          ...Playground.args,
          onClick: trackActivations(world, playgroundName),
        },
      },
      buttonMeta,
    ),
  )
})

/** The Playground story with isDisabled, still counting activations. */
Given("a disabled Button is open", async (world) => {
  await openStory(
    world,
    composeStory(
      {
        ...Playground,
        args: {
          ...Playground.args,
          isDisabled: true,
          onClick: trackActivations(world, playgroundName),
        },
      },
      buttonMeta,
    ),
  )
})

/** The Loading story: "Ripping disc 3" with isLoading. */
Given("the loading Button is open", async (world) => {
  await openStory(world, composeStory(Loading, buttonMeta))
})

/** The AllStates board, which includes one loading button. */
Given("the Button states board is open", async (world) => {
  await openStory(
    world,
    composeStory(AllStates, buttonMeta),
  )
})
