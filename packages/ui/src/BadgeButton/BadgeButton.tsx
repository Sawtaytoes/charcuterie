import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import type { BadgeShapeProps } from "../Badge/useBadgeShape.tsx"
import { useBadgeShape } from "../Badge/useBadgeShape.tsx"
import { CATEGORICAL_HOVER_CLASS } from "../categoricalStyles.ts"
import {
  DISABLED_CLASS,
  FOCUS_RING_CLASS,
  INTENT_HOVER_CLASS,
} from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"

export type BadgeButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "disabled"
> &
  BadgeShapeProps & {
    /**
     * Required, and that is the component's argument in one line: a
     * pill nobody can press is a `Badge`, and a pill that looks
     * pressable and is not is the defect this exists to stop.
     */
    onClick: NonNullable<
      ComponentPropsWithRef<"button">["onClick"]
    >
    /**
     * `isDisabled`, not `disabled` — the same prop `Button` keeps
     * instead of the native one, so a control's disabled state is
     * spelled one way across the library.
     */
    isDisabled?: boolean
    /**
     * See `BadgeShapeProps`. Restated only to refuse the case where
     * both colours arrive.
     */
  } & ({ categorical?: never } | { intent?: never })

/**
 * A badge you can press.
 *
 * A sibling component rather than a prop, exactly as `ButtonLink` is
 * to `Button`: the paint is shared (both call `useBadgeShape`, so
 * there is one class list and `BadgeButton.test.tsx` compares the
 * two elements' *computed* styles rather than trusting that), and
 * what differs is the element and everything the platform hangs off
 * it.
 *
 * **Why not `asChild`, and why not `Badge` growing an `onClick`.**
 * This library has no polymorphism pattern and has not needed one;
 * adding it here would mean every future component answering "can it
 * be something else?" instead of "what is it?". And an element type
 * that changes as a *side effect* of passing a handler is a footgun
 * with no error: forget the handler and a control silently ships as
 * a `<span>` — not focusable, not in the tab order, invisible to
 * `getByRole("button")` and to every agent driving the app.
 *
 * **What the element buys, and none of it is paint.** Focus, the tab
 * order, Enter and Space, `:disabled`, form participation, and a
 * `button` role a screen reader announces as pressable. QueuePilot
 * had six pills doing all of this with a hand-rolled
 * `<button className="badge …">`, which is where this came from —
 * six chips that open an editor, change a start point, or drop a
 * title from a pool.
 *
 * **`type="button"` by default.** These chips sit inside forms —
 * QueuePilot's entry sheet is one — and the platform's default of
 * `submit` would make a "change the start point" chip save the whole
 * dialog. Overridable, because a badge-shaped submit is a real thing
 * and the default is a safe floor rather than a ban.
 *
 * **`ghost` is still excluded**, inherited from `Badge`: a pill that
 * paints nothing until hovered has no pill left, and a control that
 * only advertises itself on hover cannot be found by touch.
 */
export const BadgeButton = ({
  appearance = "soft",
  categorical,
  children,
  className,
  icon,
  intent = "neutral",
  isDisabled = false,
  overflow,
  size,
  title,
  type = "button",
  ...buttonProps
}: BadgeButtonProps): ReactNode => {
  const shape = useBadgeShape({
    appearance,
    categorical,
    children,
    icon,
    intent,
    overflow,
    size,
    title,
  })

  return (
    <button
      {...buttonProps}
      className={toClassName(
        shape.className,
        "cursor-pointer",
        // The three states the `<span>` has no business carrying,
        // keyed the same way the appearance above was.
        categorical === undefined
          ? INTENT_HOVER_CLASS[intent][appearance]
          : CATEGORICAL_HOVER_CLASS[categorical][
              appearance
            ],
        FOCUS_RING_CLASS,
        DISABLED_CLASS,
        // Last, so a caller's layout beats the defaults above — the
        // same order `getControlClassName` uses.
        className,
      )}
      disabled={isDisabled}
      title={shape.title}
      type={type}
    >
      {shape.content}
    </button>
  )
}
