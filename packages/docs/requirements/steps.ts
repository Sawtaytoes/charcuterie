import { composeStory } from "@storybook/react"
import {
  Given,
  setWorldConstructor,
  Then,
  When,
} from "quickpickle"

import buttonMeta, {
  Loading,
} from "../../ui/src/Button/Button.stories.tsx"
import { RequirementsWorld } from "./world.ts"

setWorldConstructor(RequirementsWorld)

const asWorld = (world: unknown) =>
  world as RequirementsWorld

Given("the Button playground is open", async (state) => {
  const world = asWorld(state)

  await world.open(
    composeStory(
      {
        args: {
          children: "Start rip",
          onClick: () => {
            world.actionCount += 1
          },
        },
      },
      buttonMeta,
    ),
  )
})

Given("a disabled Button is open", async (state) => {
  const world = asWorld(state)

  await world.open(
    composeStory(
      {
        args: {
          children: "Start rip",
          isDisabled: true,
          onClick: () => {
            world.actionCount += 1
          },
        },
      },
      buttonMeta,
    ),
  )
})

Given("the loading Button is open", async (state) => {
  await asWorld(state).open(
    composeStory(Loading, buttonMeta),
  )
})

When(
  "I press Tab to focus the button named {string}",
  async (state, name: string) => {
    await asWorld(state).tabTo("button", name)
  },
)

When(
  "I click the button named {string}",
  async (state, name: string) => {
    await asWorld(state).click("button", name)
  },
)

When("I press Enter", async (state) => {
  await asWorld(state).press("Enter")
})

When("I press Space", async (state) => {
  await asWorld(state).press("Space")
})

Then(
  "the button named {string} has been activated {int} time(s)",
  (state, name: string, count: number) => {
    const world = asWorld(state)

    world.byRole("button", name)
    world.expectActionCount(count)
  },
)

Then(
  "the button named {string} is disabled",
  async (state, name: string) => {
    await asWorld(state).expectDisabled("button", name)
  },
)

Then(
  "the button named {string} is busy",
  async (state, name: string) => {
    await asWorld(state).expectBusy("button", name)
  },
)

Then("no action has been started", (state) => {
  asWorld(state).expectActionCount(0)
})

Then("a status message is visible", async (state) => {
  await asWorld(state).expectStatus()
})
