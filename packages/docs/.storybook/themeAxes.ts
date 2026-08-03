/**
 * The three theming axes, in one place, because they are read from
 * both halves of Storybook and those halves cannot see each other.
 *
 * `main.ts` runs in **Node** and needs the defaults to write the
 * `previewHead` seed; `preview.tsx` runs in the **browser** and
 * needs them for `initialGlobals` and for the writer that keeps
 * `<html>` in step with the toolbar. Those are separate module
 * graphs with separate bundlers, so the only thing that can stop
 * them drifting is a file they both import — and drift here is
 * silent: a seed of `dark` under an `initialGlobals` of `light`
 * paints the wrong scheme for exactly as long as it takes the
 * preview to boot, which reads as a flash rather than as a bug.
 *
 * Zero dependencies on purpose, for the same reason.
 */

/**
 * `attribute` is what lands on `<html>` — the production mechanism,
 * the same one `variables.css` keys every `--color-*` off.
 * `global` is the Storybook toolbar key that drives it. `initial`
 * is the value both the seed and `initialGlobals` start at.
 */
export const THEME_AXES = [
  {
    attribute: "data-density",
    global: "density",
    initial: "comfortable",
  },
  {
    attribute: "data-variant",
    global: "variant",
    initial: "daylight",
  },
  {
    // Dark, deliberately. Picking a light-first visual direction at
    // M0 is not the same as flipping the fleet to light, and the
    // kiosk Pis stay pinned to dark — a light kiosk in a dark room
    // is a lamp.
    attribute: "data-scheme",
    global: "scheme",
    initial: "dark",
  },
] as const

/**
 * The seed that runs in the preview's `<head>`, before the first
 * paint and before any story exists.
 *
 * Generated from `THEME_AXES` rather than hand-written, so the one
 * copy of these values that lives in a *string* cannot be the copy
 * that goes stale.
 *
 * `document.documentElement` rather than a `DOMContentLoaded`
 * listener: `<html>` is already open by the time a `<head>` script
 * runs, and waiting for the event would put this after the
 * stylesheet — which is the whole thing it exists to get in front
 * of.
 */
export const firstPaintAxesScript = THEME_AXES.map(
  ({ attribute, initial }) =>
    `document.documentElement.setAttribute(${JSON.stringify(attribute)},${JSON.stringify(initial)})`,
).join(";")
