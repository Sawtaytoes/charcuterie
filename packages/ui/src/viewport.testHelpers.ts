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
 * Polling `innerWidth` is the honest wait: it is the same number
 * the media queries and the layout resolved against, so when it
 * matches, the thing under test really is at the width the test
 * claims.
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

  while (globalThis.innerWidth !== width) {
    if (Date.now() > deadline) {
      throw new Error(
        `The viewport never reached ${width}px — it is ${globalThis.innerWidth}px. Every width assertion after this point would be measuring the wrong page.`,
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
