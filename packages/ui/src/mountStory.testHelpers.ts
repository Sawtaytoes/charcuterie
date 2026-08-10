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

/**
 * One frame past the mount, so post-mount effects have applied
 * before anything reads the DOM.
 *
 * `storybook-addon-pseudo-states` applies its forced
 * `:hover`/`:focus`/`:active` classes **a tick after render**, not
 * during it — `vrtCapture.mjs` documents the same window and closes
 * it with a settle, after "a real flake seen on `*--all-states`
 * stories".
 *
 * This suite has the identical window and never closed it, and the
 * consequence is worse here than a pixel diff: the a11y addon's
 * `afterEach` runs axe the moment `run()` resolves, so a story
 * whose forced state lands late is audited **un-forced**, and one
 * whose state lands early is audited **hovered**. That is a
 * contrast check reading `intent-accent-solid` on one run and
 * `intent-accent-solid-hover` on the next — which is precisely the
 * shape of `ButtonLink`'s intermittent `color-contrast` failure in
 * CI, reported against `#6A64F0`, the daylight `solidHover`.
 *
 * Two frames rather than a fixed delay: React flushes effects and
 * the addon applies classes within a frame, so this is a barrier
 * tied to the browser's own scheduling instead of a millisecond
 * count guessed against one machine. `vrtCapture` can afford its
 * 400ms because it takes ~700 shots; this runs before every one of
 * 222 tests.
 */
/**
 * Captured at module load, **before any test can replace it**.
 *
 * `Toast.test.tsx` stubs `requestAnimationFrame` and *holds* the
 * callbacks, deliberately, to prove that a dismiss arriving during
 * the enter frame is not undone by it. A settle that called the
 * live `globalThis.requestAnimationFrame` would hand its own
 * continuation to that stub and never be released — which is
 * exactly what happened: three Toast tests went from passing to a
 * flat 15s timeout.
 *
 * Binding the native one keeps a true frame barrier while staying
 * immune to a stub, and it does not disturb the test doing the
 * stubbing: the component's frames still go to its stub, only this
 * helper's do not.
 */
const requestNativeFrame =
  globalThis.requestAnimationFrame?.bind(globalThis)

const settlePostMountEffects = () =>
  new Promise<void>((resolve) => {
    if (!requestNativeFrame) {
      globalThis.setTimeout(resolve, 0)

      return
    }

    requestNativeFrame(() => {
      requestNativeFrame(() => {
        resolve()
      })
    })
  })

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

  await settlePostMountEffects()

  return {
    body: within(document.body),
    canvas: within(canvasElement),
    canvasElement,
  }
}
