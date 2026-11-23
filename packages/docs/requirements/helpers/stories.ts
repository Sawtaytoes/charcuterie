import { storyNameFromExport } from "storybook/internal/csf"

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
  const { body, canvasElement } = await mountStory(story)

  world.page = body
  world.storyRoot = canvasElement
}

/**
 * One story from `composeStories(...)`, by the name Storybook shows in
 * its sidebar: the story's own `name` if it sets one, or else the
 * export name spaced out, such as "All States" for `AllStates`.
 */
export const storyNamed = <ComposedStory extends Story>(
  component: string,
  stories: Record<
    string,
    ComposedStory & { storyName?: string }
  >,
  name: string,
): ComposedStory => {
  const entries = Object.entries(stories).map(
    ([exportName, story]) =>
      [
        story.storyName && story.storyName !== exportName
          ? story.storyName
          : storyNameFromExport(exportName),
        story,
      ] as const,
  )
  const found = entries.find(
    ([sidebarName]) => sidebarName === name,
  )

  if (!found) {
    throw new Error(
      `${component} has no story named "${name}". Its stories are: ${entries
        .map(([sidebarName]) => `"${sidebarName}"`)
        .join(", ")}.`,
    )
  }

  return found[1]
}
