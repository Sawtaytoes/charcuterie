import type {
  CategoricalIndex,
  IntentName,
} from "@charcuterie/tokens"
import type { ReactNode } from "react"

import { CATEGORICAL_APPEARANCE_CLASS } from "../categoricalStyles.ts"
import type { BadgeSize } from "../controlStyles.ts"
import { BADGE_SIZE_CLASS } from "../controlStyles.ts"
import type { IntentAppearance } from "../intentStyles.ts"
import { INTENT_APPEARANCE_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import { useIsTextClipped } from "./useIsTextClipped.ts"

/**
 * The visual half of a badge, shared by the two elements that wear
 * it.
 *
 * `Badge` is a `<span>` and `BadgeButton` is a `<button>`, and the
 * pill is supposed to be indistinguishable between them — so the
 * class list, the icon slot, the truncation and the
 * only-when-clipped `title` are computed **here**, once, exactly as
 * `Button` and `ButtonLink` both call `getControlClassName`. A
 * second copy of this arithmetic is how the two drift: the wrapping
 * pill's `rounded-2xl` and the label's `min-w-0` are each one line,
 * and each is load-bearing.
 */
export type BadgeShapeProps = {
  appearance?: Exclude<IntentAppearance, "ghost">
  /**
   * A numbered, **non-semantic** colour: 1–10, no meaning attached.
   *
   * For a badge whose colour the user picked — a Docket label, a
   * project, a chart series — where `intent` would be a lie.
   * `getCategoricalIndex(key)` from `@charcuterie/tokens` is the
   * stable fallback for a row nobody has chosen a colour for yet.
   *
   * Mutually exclusive with `intent` **in the type**: a badge is one
   * colour, and passing both is a question with no answer rather
   * than a precedence rule to remember.
   */
  categorical?: CategoricalIndex
  children: ReactNode
  icon?: ReactNode
  intent?: IntentName
  /**
   * What happens when the label is wider than the space it is given.
   *
   *  - `truncate` — one line, capped at the container, ellipsis. The
   *    default, because a status pill that changes its row's height
   *    when a message gets longer breaks the table it sits in.
   *  - `wrap` — the pill grows taller and shows everything. For the
   *    kiosk and any touch context, where the hover readout that
   *    `truncate` relies on does not exist.
   */
  overflow?: "truncate" | "wrap"
  size?: BadgeSize
}

export const useBadgeShape = ({
  appearance = "soft",
  categorical,
  children,
  className,
  icon,
  intent = "neutral",
  overflow = "truncate",
  size = "md",
  title,
}: BadgeShapeProps & {
  className?: string
  title?: string
}): {
  className: string
  content: ReactNode
  title?: string
} => {
  const [labelRef, clippedText] = useIsTextClipped()

  return {
    className: toClassName(
      "inline-flex shrink-0 items-center border font-medium",
      // The cap. Without it every other rule here is decoration.
      "max-w-full",
      overflow === "wrap"
        ? // A stadium end-cap on a three-line box reads as a
          // rendering fault rather than a badge, so the wrapping
          // pill relaxes to a rounded rectangle.
          "rounded-2xl"
        : "rounded-full",
      BADGE_SIZE_CLASS[size],
      // A ternary rather than a merged map: the two are indexed
      // by different keys, and `undefined` is the only honest
      // discriminant once the type has already refused the case
      // where both arrive.
      categorical === undefined
        ? INTENT_APPEARANCE_CLASS[intent][appearance]
        : CATEGORICAL_APPEARANCE_CLASS[categorical][
            appearance
          ],
      className,
    ),
    content: (
      <>
        {icon ? (
          <span
            aria-hidden="true"
            className="contents shrink-0"
          >
            {icon}
          </span>
        ) : null}

        {/*
         * The truncation happens here rather than on the pill so the
         * border and the rounded end-cap stay outside the clip — an
         * `overflow: hidden` on the pill itself squares off the end
         * the ellipsis is nearest to.
         *
         * `min-w-0` because a flex item's automatic minimum size is
         * its content, which would win against `max-w-full` on the
         * parent and put the overflow back.
         */}
        <span
          className={
            overflow === "wrap"
              ? "min-w-0"
              : "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
          }
          ref={labelRef}
        >
          {children}
        </span>
      </>
    ),
    // Only when something is actually hidden. A tooltip on every
    // short pill in a bay list is noise, and a `title` that
    // duplicates fully-visible text is a screen-reader duplicate
    // for no gain.
    title: title ?? clippedText,
  }
}
