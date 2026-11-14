/**
 * Resolve once every `<img>` under `root` has **finished**: loaded, or
 * failed.
 *
 * This is the readiness signal for a test about an image, and it has
 * no clock of its own. A `waitFor` around "the broken photo is gone"
 * puts Testing Library's 1 s default on the **network**: the browser
 * has to ask the dev server for the file and hear back 404 before
 * `onError` can run. On a quiet machine that is a few milliseconds.
 * On a shared CI runner, with four browser windows and the whole
 * suite going through one Vite server, it is whenever that server
 * gets to it — `Avatar > a photo that fails falls back to the
 * initials` failed in the ultrawide window on the first run of #427
 * with the `<img>` still in place after 1.37 s, and passed on the
 * re-run. `PortraitTiles` had already hit the same wall, and had
 * been given five seconds instead of a signal.
 *
 * So the wait is on the browser's own answer instead: the `load` or
 * `error` event, or `complete` when that answer arrived before the
 * test looked. `complete` is `true` for a **broken** image as well as
 * a loaded one, which is the property this relies on.
 *
 * The listeners are added after the component's own, so a component
 * that handles `onError` has already run its handler by the time this
 * resolves. What is left is the component's own re-render, which a
 * plain `waitFor` covers — that is page work, not network.
 *
 * The only budget left is the test's own timeout. An image that never
 * finishes, such as a `loading="lazy"` one off-screen, holds the test
 * until then; no story in this library has one.
 */
export const waitForImagesToFinish = async (
  root: ParentNode,
): Promise<void> => {
  await Promise.all(
    Array.from(root.querySelectorAll("img"), (image) =>
      waitForImageToFinish(image),
    ),
  )
}

const waitForImageToFinish = (
  image: HTMLImageElement,
): Promise<void> =>
  new Promise((resolve) => {
    if (image.complete) {
      resolve()

      return
    }

    const finish = () => {
      image.removeEventListener("error", finish)
      image.removeEventListener("load", finish)

      resolve()
    }

    image.addEventListener("error", finish)
    image.addEventListener("load", finish)
  })
