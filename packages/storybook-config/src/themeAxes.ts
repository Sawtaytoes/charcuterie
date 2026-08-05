/**
 * The three theming axes, in one dependency-free table, because
 * they are read from **both halves of Storybook** and those halves
 * cannot see each other.
 *
 * A `main.ts` runs in **Node** and needs the axes to write the
 * `previewHead` seed; a `preview.tsx` runs in the **browser** and
 * needs them for `globalTypes`, `initialGlobals`, and the writer
 * that keeps `<html>` in step with the toolbar. Those are separate
 * module graphs with separate bundlers, so the only thing that can
 * stop them drifting is a table they both import — and drift here
 * is silent: a seed of `dark` under an `initialGlobals` of `light`
 * paints the wrong scheme for exactly as long as it takes the
 * preview to boot, which reads as a flash rather than a bug.
 *
 * This module is deliberately pure: no React, no Storybook, no DOM.
 * It is the one file safe to import from a Node `main.ts` and a
 * browser `preview.tsx` alike.
 *
 * This factoring was proven three times over before it lived here —
 * `charcuterie/packages/docs`, `gallery-downloader` and `rip-deck`
 * each shipped a hand-copied `themeAxes.ts`, two of them trimmed to
 * a different axis subset. The subset is now a call argument
 * (`pickAxes`) rather than a fork.
 */

/** The Storybook global key that drives each axis. */
export type AxisKey = "density" | "variant" | "scheme"

/**
 * One axis. `attribute` is what lands on `<html>` — the production
 * mechanism, the same one `@charcuterie/tokens`' `variables.css`
 * keys every `--color-*` off. `global` is the Storybook toolbar key
 * that drives it. `initial` is the value both the first-paint seed
 * and `initialGlobals` start at. `toolbar` is the dropdown.
 */
export type ThemeAxis = {
  attribute: string
  global: AxisKey
  initial: string
  description: string
  toolbar: {
    title: string
    icon: string
    items: readonly { value: string; title: string }[]
  }
}

/**
 * All three axes, in the order their toolbars should appear —
 * `scheme` last, so an app that adds it later does not shove
 * `density` and `variant` sideways.
 *
 * `data-scheme` defaults to `dark` deliberately: picking a
 * light-first *visual direction* (`daylight`) is not the same as
 * flipping the fleet to light, and the kiosk Pis stay pinned to
 * dark — a light kiosk in a dark room is a lamp.
 */
export const THEME_AXES: readonly ThemeAxis[] = [
  {
    attribute: "data-density",
    global: "density",
    initial: "comfortable",
    description:
      "Sizing and type scale. Composes with scheme and variant.",
    toolbar: {
      title: "Density",
      icon: "component",
      items: [
        { value: "comfortable", title: "Comfortable" },
        { value: "compact", title: "Compact" },
        { value: "kiosk", title: "Kiosk" },
      ],
    },
  },
  {
    attribute: "data-variant",
    global: "variant",
    initial: "daylight",
    description:
      "Visual direction. `daylight` is the fleet default; the other three are alternates.",
    toolbar: {
      title: "Variant",
      icon: "paintbrush",
      items: [
        { value: "daylight", title: "Daylight" },
        { value: "hairline", title: "Hairline" },
        { value: "layered", title: "Layered" },
        { value: "legible", title: "Legible" },
      ],
    },
  },
  {
    attribute: "data-scheme",
    global: "scheme",
    initial: "dark",
    description:
      "Light or dark. The fleet pins dark in its entry HTML; this is where the light half gets looked at.",
    toolbar: {
      title: "Scheme",
      icon: "circlehollow",
      items: [
        { value: "dark", title: "Dark" },
        { value: "light", title: "Light" },
      ],
    },
  },
]

/**
 * The axes an app actually wants, in canonical toolbar order.
 *
 * mux-magic wants `density` only (it delegates scheme to a decorator
 * and pins variant); rip-deck wants `density` + `scheme`;
 * gallery-downloader and the design-system docs want all three.
 * Requested order is ignored on purpose — the toolbar order is a
 * fleet constant, not a per-app choice.
 */
export const pickAxes = (
  keys: readonly AxisKey[],
): readonly ThemeAxis[] =>
  THEME_AXES.filter((axis) => keys.includes(axis.global))

/**
 * The inline `<head>` script that stamps the chosen axes onto
 * `<html>` **before the first paint** and before any story exists.
 *
 * Generated from the table rather than hand-written, so the one
 * copy of these values that lives in a *string* cannot be the copy
 * that goes stale.
 *
 * `document.documentElement` rather than a `DOMContentLoaded`
 * listener: `<html>` is already open by the time a `<head>` script
 * runs, and waiting for the event would put this *after* the
 * stylesheet — which is the whole thing it exists to get in front
 * of.
 */
export const firstPaintAxesScript = (
  axes: readonly ThemeAxis[] = THEME_AXES,
): string =>
  axes
    .map(
      ({ attribute, initial }) =>
        `document.documentElement.setAttribute(${JSON.stringify(attribute)},${JSON.stringify(initial)})`,
    )
    .join(";")
