import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import type { BadgeShapeProps } from "./useBadgeShape.tsx"
import { useBadgeShape } from "./useBadgeShape.tsx"

export type BadgeProps = ComponentPropsWithRef<"span"> &
  BadgeShapeProps & {
    /**
     * The exclusivity, and it is deliberately the *only* thing this
     * arm says. Both props stay declared on `BadgeShapeProps` so
     * `react-docgen` can see them and `storyControls.test.ts` can
     * require a control for each; this arm's whole job is to refuse
     * the case where both arrive with a value.
     */
  } & ({ categorical?: never } | { intent?: never })

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
 * **`intent` or `categorical`, never both.** The two families are
 * both seven roles wide and both paint a pill, and they answer
 * opposite questions: an intent is a *claim* the design system
 * makes (`danger` says what happens if you press the thing), and a
 * categorical index is a claim about nothing at all — it is a
 * colour a user picked for a label. Which is why the exclusivity is
 * in the type rather than in a precedence rule: a badge is one
 * colour, and `<Badge intent="danger" categorical={3}>` is a
 * question with no answer.
 *
 * **It is capped at its container.** `shrink-0` and
 * `whitespace-nowrap` alone let a long label paint straight through
 * the neighbouring column — no clipping, no error, just a pill lying
 * across the next cell. `max-inline-size: 100%` is what stops it, and
 * `overflow` is what happens next.
 */
export const Badge = ({
  appearance,
  categorical,
  children,
  className,
  icon,
  intent,
  overflow,
  size,
  title,
  ...spanProps
}: BadgeProps): ReactNode => {
  const shape = useBadgeShape({
    appearance,
    categorical,
    children,
    className,
    icon,
    intent,
    overflow,
    size,
    title,
  })

  return (
    <span
      {...spanProps}
      className={shape.className}
      title={shape.title}
    >
      {shape.content}
    </span>
  )
}
