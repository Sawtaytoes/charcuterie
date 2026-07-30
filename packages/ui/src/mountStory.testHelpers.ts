import { within } from "storybook/test"

type Canvas = ReturnType<typeof within>

/**
 * Structural on purpose — the one thing this helper needs off a
 * composed story. `ComposedStoryFn` is invariant in its `Args`, so
 * naming it here would force every caller to restate the props of
 * the component it is testing.
 */
type MountableStory = {
  run: (context: {
    canvasElement: HTMLElement
  }) => Promise<void>
}

/**
 * Mount a composed story into a fresh canvas and hand back the same
 * two things a `play` function used to receive.
 *
 * `run()` — rather than rendering the component directly — is what
 * keeps these tests honest after the story/test split: the subject
 * is the story a reader sees, with its args, its decorators, and its
 * loaders, not a second assembly of the same component that can
 * drift from it. It is also what triggers the a11y addon's
 * `afterEach`, so every mount here is an axe run.
 */
export const mountStory = async (
  story: MountableStory,
): Promise<{
  canvas: Canvas
  canvasElement: HTMLElement
}> => {
  const canvasElement = document.createElement("div")

  document.body.append(canvasElement)

  await story.run({ canvasElement })

  return { canvas: within(canvasElement), canvasElement }
}
