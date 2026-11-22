import { mountStory } from "../../../ui/src/mountStory.testHelpers.ts"
import type { RequirementsWorld } from "../support/RequirementsWorld.ts"

type Story = Parameters<typeof mountStory>[0]

/**
 * Mount a composed story: the same story, args, decorators, and axe
 * audit a reader sees in Storybook.
 */
export const openStory = async (
  world: RequirementsWorld,
  story: Story,
) => {
  const { canvas, body } = await mountStory(story)

  world.canvas = canvas
  world.page = body
}
