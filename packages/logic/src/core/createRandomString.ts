/**
 * A non-cryptographic id fragment, carried over from v1.
 *
 * The React and Preact bindings do **not** use this — they use
 * their framework's `useId`, which is SSR-stable and cannot
 * collide. It survives for the framework-free path: a core driven
 * from plain JS still needs to name its trigger and target so
 * `aria-controls` has something to point at.
 *
 * `generateRandomNumber` is injectable so tests can make ids
 * deterministic without stubbing a global.
 */

export const createRandomString = ({
  generateRandomNumber = Math.random,
}: {
  generateRandomNumber?: () => number
} = {}) =>
  generateRandomNumber()
    .toString(36)
    .slice(-8)
    .padStart(8, "0")
