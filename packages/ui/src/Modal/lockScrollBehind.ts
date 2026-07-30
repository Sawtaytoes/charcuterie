/**
 * The one thing `showModal()` does not do.
 *
 * A native modal makes everything behind it `inert` — unclickable,
 * untabbable, invisible to a screen reader — and then lets you
 * scroll it anyway. On a phone that reads as the dialog sliding
 * around; on a long page it loses the user's place entirely.
 *
 * Counted rather than boolean, because nested dialogs are legal
 * (`showModal()` stacks in the top layer) and a naive
 * lock/unlock pair has the inner one's cleanup unlock the page
 * while the outer is still open. The original value is captured
 * on the *first* lock, so restoring is a restore rather than a
 * guess at what an app's own stylesheet wanted.
 *
 * Not a React hook: this is process-wide state, and two components
 * sharing it through module scope is the honest expression of
 * that. `Modal` calls it from an effect and returns the release as
 * the cleanup.
 */

let lockCount = 0

let previousOverflow = ""

export const lockScrollBehind = (): (() => void) => {
  if (typeof document === "undefined") {
    return () => {}
  }

  const { documentElement } = document

  if (lockCount === 0) {
    previousOverflow = documentElement.style.overflow

    documentElement.style.overflow = "hidden"
  }

  lockCount += 1

  let isReleased = false

  return () => {
    // Idempotent, because React 19's StrictMode runs an effect's
    // cleanup twice and a double decrement would unlock the page
    // under a dialog that is still open.
    if (isReleased) {
      return
    }

    isReleased = true

    lockCount -= 1

    if (lockCount === 0) {
      documentElement.style.overflow = previousOverflow
    }
  }
}
