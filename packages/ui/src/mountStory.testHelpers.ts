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
/**
 * Every canvas this helper has created, so the next mount can take
 * the previous ones out of the document.
 *
 * They used to accumulate — one detached-but-attached `<div>` per
 * test, for the whole file — and nothing noticed for three
 * milestones, because every component up to M6 lays out **in
 * flow**: a stale copy sits harmlessly below the live one and every
 * query is scoped to its own canvas anyway.
 *
 * `ToastRegion` is the first `position: fixed` component in the
 * library, and it broke that immediately. A previous test's toast
 * stack is pinned to the same corner of the viewport as the live
 * one, so `userEvent.click` — which clicks by **coordinates** —
 * drove the wrong element while every query still returned the
 * right one. The test failed with "the toast did not go away", one
 * test after the toast it was actually clicking.
 *
 * The stale tree is removed rather than unmounted because portable
 * stories expose no unmount. Detaching is enough: it takes the node
 * out of the layout, which is the entire problem.
 *
 * ### Portalled panels leave the canvas
 *
 * Once the overlays portal to `document.body`, their panels are no
 * longer inside `canvasElement`, and floating-ui's portal roots
 * (`[data-floating-ui-portal]`) are body children a portable story
 * never unmounts. A previous test's panel therefore lingers next to
 * the live one, and `expectAgentDrivable(body, …)` fails with "2
 * elements match" — the portal analogue of the fixed-position
 * `ToastRegion` bug above. So the same cleanup that detaches stale
 * canvases also removes stale portal roots, and `mountStory` now hands
 * back `body` (scoped to `document.body`) for querying the panels the
 * triggers still open from inside `canvas`.
 */
const mountedCanvases: HTMLElement[] = []

export const mountStory = async (
  story: MountableStory,
): Promise<{
  body: Canvas
  canvas: Canvas
  canvasElement: HTMLElement
}> => {
  for (const previous of mountedCanvases.splice(0)) {
    previous.remove()
  }

  for (const portalRoot of document.querySelectorAll(
    "[data-floating-ui-portal]",
  )) {
    portalRoot.remove()
  }

  const canvasElement = document.createElement("div")

  document.body.append(canvasElement)

  mountedCanvases.push(canvasElement)

  await story.run({ canvasElement })

  return {
    body: within(document.body),
    canvas: within(canvasElement),
    canvasElement,
  }
}
