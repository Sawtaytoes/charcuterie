/**
 * The things that must be true before an automated run looks at a
 * story — shared, because there are **two** automated runs and they
 * had drifted.
 *
 * `vrtCapture.mjs` learned all of this the expensive way: `vrt` was
 * the sole failing job across three master runs, non-deterministic
 * enough that one commit produced "2 changed" and then "1 changed"
 * on a re-run. The `ui-dom` project never learned any of it, and it
 * flakes for the same reasons on a slower machine — three different
 * tests have failed intermittently in CI while passing five times
 * in a row locally, which is the signature of a race that only
 * loses when the machine is busy.
 *
 * **This is deliberately not applied to the Storybook a developer
 * opens.** Motion is part of the design and the owner reviews it;
 * freezing it in the dev server would hide the thing being
 * designed. It applies to the VRT capture and to the `ui-dom`
 * suite, both of which are machines looking at pixels and at
 * computed styles.
 */

/**
 * Motion, the text caret, and smooth scrolling — off.
 *
 * A mid-animation frame and a blinking cursor are both classic
 * sources of a pixel diff that means nothing, and a transition in
 * flight is a computed style that is neither the old value nor the
 * new one. `caret-color` matters more than it looks: a focused
 * input blinks on a timer nobody controls, so it changes between
 * two captures of an identical page.
 *
 * An **override stylesheet rather than emulating
 * `prefers-reduced-motion`**, and the difference is a real
 * tradeoff. This repo *honours* that media query — `styles.css`
 * switches the four looping `charcuterie-*` affordances off under
 * it, because a `0ms` looping animation still holds its first
 * keyframe — so emulating it would exercise a genuine code path
 * rather than bolting an override on top. It would also mean both
 * automated suites test the **reduced-motion rendering**, which is
 * not the rendering the owner reviews, and would re-baseline every
 * VRT shot that contains one of those affordances.
 *
 * So: the override is the surgical choice. It zeroes durations
 * without switching the page to a different documented rendering.
 * The reduced-motion path keeps its own coverage in
 * `tailwindCandidates.test.ts`, which asserts every looping class
 * is switched off inside the media query.
 */
export const FREEZE_MOTION_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
`

/**
 * Inject `FREEZE_MOTION_CSS` into a document that is already open.
 *
 * The VRT capture uses Playwright's `addStyleTag` because it drives
 * the page from outside; `ui-dom` runs *inside* the page, so it
 * needs this. Idempotent — the `ui-dom` setup file runs once per
 * test file, but a shared non-isolated iframe would run it more
 * than once.
 */
export const freezeMotion = (
  documentToFreeze: Document,
): void => {
  const ID = "charcuterie-freeze-motion"

  if (documentToFreeze.getElementById(ID)) {
    return
  }

  const style = documentToFreeze.createElement("style")

  style.id = ID

  style.textContent = FREEZE_MOTION_CSS

  documentToFreeze.head.append(style)
}
