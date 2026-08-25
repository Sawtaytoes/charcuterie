import { page } from "@vitest/browser/context"

/**
 * Resize the browser and **wait until the page agrees**.
 *
 * `page.viewport()` resolves when the driver has asked for the
 * resize, not when the tester frame has been laid out at the new
 * size. On the first resize in a file that gap is real: the
 * assertion runs against the *previous* width, so a
 * horizontal-scroll test at 390px silently measures a 1440px page
 * and reports a number nobody can explain. It is a race, so it
 * fails intermittently — which is the worst possible property for
 * the one gate that says the shell does not scroll sideways.
 *
 * Polling `innerWidth`/`innerHeight` is the honest wait: they are the
 * same numbers the media queries and the layout resolved against, so
 * when they match, the thing under test really is at the size the
 * test claims.
 *
 * **Height counts too**, and it did not used to. A panel row's size
 * steps down under `(height <= 40rem)` (`usePanelItemSize`), so a test
 * that shrinks only the height would have raced the resize with
 * nothing to wait on and measured the tall rows about half the time.
 */
export const setViewport = async ({
  height,
  width,
}: {
  height: number
  width: number
}): Promise<void> => {
  await page.viewport(width, height)

  const deadline = Date.now() + 2000

  while (
    globalThis.innerWidth !== width ||
    globalThis.innerHeight !== height
  ) {
    if (Date.now() > deadline) {
      throw new Error(
        `The viewport never reached ${width}x${height}px — it is ${globalThis.innerWidth}x${globalThis.innerHeight}px. Every size assertion after this point would be measuring the wrong page.`,
      )
    }

    await new Promise((resolve) => {
      globalThis.requestAnimationFrame(resolve)
    })
  }
}

/** A phone in portrait — the width plex-channels scrolls at. */
export const PHONE = { height: 844, width: 390 }

export const DESKTOP = { height: 900, width: 1440 }

/**
 * A window short enough to trip `usePanelItemSize`'s first step-down
 * (`height <= 40rem`, so 640px) and wide enough that nothing else
 * about the layout changes with it.
 */
export const SHORT_WINDOW = { height: 600, width: 1440 }
