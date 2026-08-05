import type { IntentName } from "@charcuterie/tokens"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import type { BadgeSize } from "../controlStyles.ts"
import { BADGE_SIZE_CLASS } from "../controlStyles.ts"
import type { IntentAppearance } from "../intentStyles.ts"
import { INTENT_APPEARANCE_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import { useIsTextClipped } from "./useIsTextClipped.ts"

export type BadgeProps = ComponentPropsWithRef<"span"> & {
  appearance?: Exclude<IntentAppearance, "ghost">
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

/**
 * Four repos, and rip-deck declares the **identical** `TONE_CLASS`
 * map twice — `VerdictBadge.tsx` and `TowerAlerts.tsx`, same five
 * hardcoded hexes, no relationship to each other beyond
 * copy-paste. mux-magic's `statusClassMap` is the same idea spelled
 * a third way, keyed by a bare `string` so an unrecognised status
 * renders with no colour at all and no error.
 *
 * `intent` replaces all of it. The **status** half of the problem —
 * which state maps to which intent, and what it is called in
 * English — lives in `statusIntent.ts` as exhaustive switches over
 * `@charcuterie/logic`'s shared machines, so
 * `<Badge intent={getAsyncIntent(status)}>{getAsyncLabel(status)}</Badge>`
 * is the whole of mux-magic's `StatusBadge`, and adding a state to
 * the machine is a compile error rather than a blank pill.
 *
 * **No implicit role.** A badge is a word about something else; it
 * is not a live region, and giving it `role="status"` would make
 * every re-render announce itself. Where a status genuinely needs
 * announcing that is `LiveStatusIndicator`'s job, and where a badge
 * needs a name beyond its text, `aria-label` still works. The story
 * asserts the text is queryable, which is what an agent actually
 * matches on.
 *
 * **It is capped at its container.** `shrink-0` and
 * `whitespace-nowrap` alone let a long label paint straight through
 * the neighbouring column — no clipping, no error, just a pill lying
 * across the next cell. `max-inline-size: 100%` is what stops it, and
 * `overflow` is what happens next.
 */
export const Badge = ({
  appearance = "soft",
  children,
  className,
  icon,
  intent = "neutral",
  overflow = "truncate",
  size = "md",
  title,
  ...spanProps
}: BadgeProps): ReactNode => {
  const [labelRef, clippedText] = useIsTextClipped()

  return (
    <span
      {...spanProps}
      className={toClassName(
        "inline-flex shrink-0 items-center rounded-none border font-medium",
        // The cap. Without it every other rule here is decoration.
        "max-w-full",
        overflow === "wrap"
          ? // A stadium end-cap on a three-line box reads as a
            // rendering fault rather than a badge, so the wrapping
            // pill relaxes to a rounded rectangle.
            "rounded-2xl"
          : "rounded-full",
        BADGE_SIZE_CLASS[size],
        INTENT_APPEARANCE_CLASS[intent][appearance],
        className,
      )}
      // Only when something is actually hidden. A tooltip on every
      // short pill in a bay list is noise, and a `title` that
      // duplicates fully-visible text is a screen-reader duplicate
      // for no gain.
      title={title ?? clippedText}
    >
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
    </span>
  )
}
