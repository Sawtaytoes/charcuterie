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

export type BadgeProps = ComponentPropsWithRef<"span"> & {
  appearance?: Exclude<IntentAppearance, "ghost">
  children: ReactNode
  icon?: ReactNode
  intent?: IntentName
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
 */
export const Badge = ({
  appearance = "soft",
  children,
  className,
  icon,
  intent = "neutral",
  size = "md",
  ...spanProps
}: BadgeProps): ReactNode => (
  <span
    {...spanProps}
    className={toClassName(
      "inline-flex shrink-0 items-center rounded-full border font-medium whitespace-nowrap",
      BADGE_SIZE_CLASS[size],
      INTENT_APPEARANCE_CLASS[intent][appearance],
      className,
    )}
  >
    {icon ? (
      <span aria-hidden="true" className="contents">
        {icon}
      </span>
    ) : null}

    {children}
  </span>
)
