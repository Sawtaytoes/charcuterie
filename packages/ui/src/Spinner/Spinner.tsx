import type { ControlSize } from "@charcuterie/tokens"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { SPINNER_SIZE_CLASS } from "../controlStyles.ts"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"

export type SpinnerProps = Omit<
  ComponentPropsWithRef<"span">,
  "children"
> & {
  /**
   * Required by omission of a default that could be wrong.
   * "Loading…" is right for a fetch and wrong for "Ripping disc 3",
   * and the label is the *only* thing a screen-reader user gets —
   * the animation says nothing.
   */
  label?: string
  isLabelVisible?: boolean
  size?: ControlSize
}

/**
 * **Zero of these exist anywhere in the fleet.** Not one repo has a
 * spinner; every app renders bare `"loading…"` text, which is why
 * this is the best effort-to-payoff component in the M3 list.
 *
 * Three things it does that a hand-rolled `animate-spin` does not:
 *
 *  - **It is a live region.** `role="status"` with the label inside
 *    means a screen reader announces the load starting. A bare
 *    rotating `<div>` announces nothing, which is the state of the
 *    art in every repo that renders `"loading…"` into a `<span>`.
 *  - **It stops.** The animation is `--duration-loop-fast`, which
 *    `prefers-reduced-motion` zeroes and
 *    `@charcuterie/ui/styles.css` then switches off outright —
 *    vestibular-triggering motion is the single most common a11y
 *    complaint about spinners, and Tailwind's `animate-spin`
 *    hardcodes 1s past the media query.
 *  - **It leaves a static fallback that still reads.** With motion
 *    off, the ring stays a ring and the label stays a label, so the
 *    component degrades to "there is a thing here, and it says
 *    loading" rather than to nothing.
 */
export const Spinner = ({
  className,
  isLabelVisible = false,
  label = "Loading…",
  size = "md",
  ...spanProps
}: SpinnerProps): ReactNode => (
  <span
    {...spanProps}
    // Both, and neither is redundant. `role="status"` takes **no
    // accessible name from its content** — it is a live region, not
    // a widget — so without `aria-label` the spinner is announced on
    // change but cannot be *found*:
    // `getByRole("status", { name: "Loading…" })` matches nothing,
    // which is a gap an agent hits and axe never reports. The text
    // child is what a screen reader reads when the region appears;
    // the label is what names it for navigation and for Playwright.
    aria-label={label}
    className={toClassName(
      "inline-flex items-center gap-2 align-middle text-current",
      className,
    )}
    role="status"
  >
    <span
      aria-hidden="true"
      className={toClassName(
        // `border-current` on three sides and a transparent fourth
        // is the whole trick: it inherits the parent's text colour,
        // so a spinner inside a solid button is legible without the
        // button telling it anything.
        "charcuterie-spin inline-block shrink-0 rounded-full border-current border-t-transparent",
        SPINNER_SIZE_CLASS[size],
      )}
    />

    {isLabelVisible ? (
      <span className="text-content-secondary">
        {label}
      </span>
    ) : (
      <VisuallyHidden>{label}</VisuallyHidden>
    )}
  </span>
)
