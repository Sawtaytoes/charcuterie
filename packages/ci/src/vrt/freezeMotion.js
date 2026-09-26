/**
 * The stylesheet that stops motion before a shot: every animation and
 * transition snapped to its end state, the text caret hidden, smooth
 * scrolling off. A mid-animation frame or a blinking cursor must never be
 * the pixel that differs.
 *
 * This is a COPY of `FREEZE_MOTION_CSS` in
 * `packages/storybook-config/src/testDeterminism.ts`, and
 * `freezeMotion.test.js` fails the moment the two differ. It is copied
 * rather than imported because the shared workflow runs this capture from a
 * bare checkout of Charcuterie with no workspace install and no build, and
 * that source is TypeScript. Change the original first, then this.
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
