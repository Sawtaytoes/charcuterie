import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { toClassName } from "../toClassName.ts"

export type SwatchAppearance = "outline" | "solid"

export type SwatchSize = keyof typeof SWATCH_SIZE_CLASS

export type SwatchProps = Omit<
  ComponentPropsWithRef<"span">,
  "children" | "color"
> & {
  /**
   * `outline` keeps the hue and drops the fill — for a swatch whose
   * subject is present but inactive. It is the one visual state a
   * status colour cannot borrow from `intent`, because the colour is
   * not an intent.
   */
  appearance?: SwatchAppearance
  /**
   * Any CSS colour, and this is the whole reason the component
   * exists: it is a **value from data** — a physical sticker, an
   * album's extracted accent, a user-chosen tag — not a token. A
   * design system owns `intent.danger`; it does not own the colour
   * of the dot somebody stuck on a game controller, and re-theming
   * that would be re-theming the hardware. So it is a prop and lands
   * in an inline `style`, the one sanctioned escape hatch for a
   * runtime value.
   */
  color: string
  isLabelVisible?: boolean
  /**
   * Required, and it is the point. A colour is not a name: a screen
   * reader gets nothing at all from a `background-color`, and
   * `getByRole("img", { name })` — the query an agent writes — has
   * nothing to match. So the type asks for the name and there is no
   * way to render the component without one.
   */
  label: string
  size?: SwatchSize
}

/**
 * The scale is the component's own, and deliberately larger than
 * `DOT_SIZE_CLASS`.
 *
 * That map tops out at 10px, which is right for a status dot beside
 * a line of text and far too small for a swatch that is the primary
 * way a user tells one row from another across a room. A swatch is
 * content, not punctuation.
 */
const SWATCH_SIZE_CLASS = {
  sm: "size-4",
  md: "size-6",
  lg: "size-9",
} as const

/**
 * A colour presented **as content**, with a name attached.
 *
 * It is not `LiveStatusIndicator`'s dot and not a `Badge`. Both of
 * those take an `intent`, because both show a *state* whose colour
 * the design system owns and can name in English. This shows a
 * colour the system does **not** own and **cannot** name — the red
 * sticker on a controller, red because someone put a red sticker on
 * it; the accent castkit pulls off an album; a user's tag colour.
 * `DOT_SIZE_CLASS` is exported precisely so an app can hand-roll one
 * of these, and three of them across the fleet did, each without a
 * name a screen reader could read.
 *
 * ### `role="img"`, and the name is required
 *
 * A swatch is a graphic that carries meaning, so it is an image with
 * an accessible name — which makes it findable by
 * `getByRole("img", { name })` in **both** the dot-only and
 * labelled forms, one stable handle regardless of whether the text
 * is on screen. The dot and any visible label are inside it and go
 * `aria-hidden` by virtue of the name on the wrapper, exactly as an
 * inline SVG with a caption would.
 *
 * ### The ring is not a token
 *
 * `solid` sits a translucent white ring inside the fill so a white
 * or near-white swatch stays visible against `surface-raised` in
 * both schemes; a hairline border alone disappears on one of the
 * two. `outline` drops the fill to a faint tint of the same hue and
 * draws the ring in the colour itself — via an inline `box-shadow`,
 * because the ring colour has to come from the data and
 * `--tw-ring-color` is not something `CSSProperties` will type.
 */
export const Swatch = ({
  appearance = "solid",
  className,
  color,
  isLabelVisible = false,
  label,
  size = "md",
  ...spanProps
}: SwatchProps): ReactNode => (
  <span
    {...spanProps}
    aria-label={label}
    className={toClassName(
      "inline-flex items-center gap-2 align-middle",
      className,
    )}
    role="img"
  >
    <span
      aria-hidden="true"
      className={toClassName(
        "inline-block shrink-0 rounded-full",
        SWATCH_SIZE_CLASS[size],
        appearance === "solid" &&
          "shadow-low ring-2 ring-white/25 ring-inset",
      )}
      style={
        appearance === "solid"
          ? { backgroundColor: color }
          : {
              backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
              boxShadow: `inset 0 0 0 3px ${color}`,
            }
      }
    />

    {isLabelVisible ? (
      <span
        aria-hidden="true"
        className="text-content-primary text-sm"
      >
        {label}
      </span>
    ) : null}
  </span>
)
