import type {
  ControlSize,
  IntentName,
} from "@charcuterie/tokens"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { getControlClassName } from "../controlStyles.ts"
import type { IntentAppearance } from "../intentStyles.ts"
import { DISABLED_CLASS } from "../intentStyles.ts"
import { Spinner } from "../Spinner/Spinner.tsx"

export type ButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "disabled"
> & {
  appearance?: IntentAppearance
  iconEnd?: ReactNode
  iconStart?: ReactNode
  intent?: IntentName
  isDisabled?: boolean
  isFullWidth?: boolean
  isLoading?: boolean
  /** What the spinner announces. Not shown. */
  loadingLabel?: string
  size?: ControlSize
  /**
   * Two sizing modes rather than a second component's worth of
   * markup. `icon` is square on the control height with no inline
   * padding, which is what lines an `IconButton` up with the text
   * button beside it in a toolbar.
   *
   * It lives here rather than in `IconButton` because appending a
   * competing `size-*`/`px-0` to this component's `className` would
   * be a specificity coin-flip: two utilities setting the same
   * property, and the winner decided by Tailwind's internal
   * ordering rather than by the caller.
   */
  sizing?: "control" | "icon"
}

/**
 * Hand-rolled in **seven repos**, each with its own
 * primary/secondary/danger/ghost, and this is the component that
 * erases the most duplication in the fleet.
 *
 * Four decisions worth knowing, all of them fixing something an
 * inventoried repo gets wrong:
 *
 *  - **`type="button"` by default.** A `<button>` inside a form
 *    submits it unless told otherwise, and "clicking the copy icon
 *    reloaded the page" is a bug every app in the fleet has shipped
 *    at least once.
 *  - **`isLoading` disables and announces.** The button goes
 *    `aria-busy`, the spinner replaces `iconStart` rather than
 *    being appended (so the label does not jump), and the label
 *    itself stays — a spinner that swallows the text leaves the
 *    user unsure what they pressed.
 *  - **`focus-visible`, never `focus`.** See `FOCUS_RING_CLASS`.
 *  - **Sizing comes from the density axis**, not from a prop table:
 *    `size="md"` is 2.25rem on a desktop and 3.25rem on the kiosk,
 *    with no prop change. `MIN_TOUCH_TARGET_CLASS` is available for
 *    a control that must clear 44px regardless.
 *
 * The accessible name is the children. `IconButton` exists because
 * a glyph is not a name, and enforcing that in *this* component's
 * types would mean rejecting `<Button>{icon} Copy</Button>`, which
 * is fine.
 */
export const Button = ({
  appearance = "solid",
  children,
  className,
  iconEnd,
  iconStart,
  intent = "accent",
  isDisabled = false,
  isFullWidth = false,
  isLoading = false,
  loadingLabel = "Loading…",
  size = "md",
  sizing = "control",
  type = "button",
  ...buttonProps
}: ButtonProps): ReactNode => (
  <button
    {...buttonProps}
    aria-busy={isLoading || undefined}
    className={getControlClassName({
      appearance,
      className,
      disabledClass: DISABLED_CLASS,
      intent,
      isFullWidth,
      size,
      sizing,
    })}
    disabled={isDisabled || isLoading}
    type={type}
  >
    {isLoading ? (
      <Spinner label={loadingLabel} size={size} />
    ) : (
      iconStart
    )}

    {children}

    {iconEnd}
  </button>
)
