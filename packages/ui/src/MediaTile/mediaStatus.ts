import type { StatusTransitions } from "@charcuterie/logic"

export type MediaStatus = "error" | "loaded" | "loading"

/**
 * A component-owned machine, and the smallest honest example of what
 * `createStatus` is for.
 *
 * `@charcuterie/logic` ships only the two machines that are
 * genuinely fleet-wide — connection and async request — precisely so
 * that a machine like this one lives next to the thing it describes.
 * Three states, two of them terminal-ish, and the edges matter:
 *
 *  - `loaded → loading` and `error → loading` exist for a changed
 *    `src`. Without them a poster grid that repaints with new URLs
 *    keeps showing the old tile's error.
 *  - `loaded → error` does **not** exist. A browser does not fire
 *    `error` on an image it has already decoded, and an app that
 *    thinks it saw that is misreading its own event wiring — so the
 *    machine throws rather than flickering a fallback over a
 *    perfectly good poster.
 */
export const mediaTransitions: StatusTransitions<MediaStatus> =
  {
    error: ["loading"],
    loaded: ["loading"],
    loading: ["error", "loaded"],
  }
