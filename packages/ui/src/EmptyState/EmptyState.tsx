import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { toClassName } from "../toClassName.ts"

export type EmptyStateSize = "md" | "sm"

export type EmptyStateProps = Omit<
  ComponentPropsWithRef<"div">,
  "children"
> & {
  /** Buttons, usually. Rendered under the description. */
  action?: ReactNode
  description?: ReactNode
  /**
   * A real heading element, and the level is the caller's because
   * only the caller knows what it sits under. Getting this wrong
   * breaks a screen reader's document outline, which is how the
   * fleet's `<h2>`-with-a-`<button>`-inside pattern happened.
   */
  headingLevel?: 2 | 3 | 4
  heading: string
  icon?: ReactNode
  size?: EmptyStateSize
}

const SIZE_CLASS: Record<EmptyStateSize, string> = {
  sm: "gap-2 px-4 py-6 text-sm",
  // An empty state in a 300px panel and the same one filling a
  // dashboard want different air. Container-relative, so it is the
  // *panel* that decides rather than the window.
  md: "gap-3 px-6 py-10 text-md cq-md:gap-4 cq-md:px-8 cq-md:py-14",
}

/**
 * **Six repos, eleven-plus copies** — plex-channels alone has five
 * `li.empty`s and castkit six `.idle`s — and not one of them is a
 * component. Every copy is a bare string in a `<div>`, so "no
 * results" and "not started yet" and "the socket died" all look
 * identical, and none of them is findable by role.
 *
 * Designed fresh rather than ported: the two repos that had a real
 * `EmptyState` with typed variants were bambuddy and spoolbuddy,
 * which are upstream projects rather than Kevin's code, so that
 * evidence was withdrawn from the plan.
 *
 * The shape is deliberately flat — icon, heading, description,
 * action — with **no variant enum**. An "empty" and an "error" empty
 * state differ in wording and in whether there is a retry button,
 * both of which are props already; a `variant="error"` that only
 * changes a colour invites callers to encode meaning in the colour
 * alone, which is the one thing a colour cannot carry.
 *
 * The heading is what makes it agent-drivable:
 * `getByRole("heading", { name: "No discs queued" })` works, where
 * `getByText` against eleven copies of "Nothing here" does not.
 */
export const EmptyState = ({
  action,
  className,
  description,
  heading,
  headingLevel = 2,
  icon,
  size = "md",
  ...divProps
}: EmptyStateProps): ReactNode => {
  const Heading = `h${headingLevel}` as const

  return (
    <div
      {...divProps}
      className={toClassName("@container", className)}
    >
      {/* The container and the thing querying it **cannot be the same
          element** — a container query only matches descendants, so
          `@container cq-md:px-8` on one `<div>` silently never fires.
          Nothing errors, the padding just stays small forever. Hence
          the wrapper: `className` stays on the outer element where a
          consumer expects it, and the size classes move inside. */}
      <div
        className={toClassName(
          "flex flex-col items-center justify-center text-center",
          SIZE_CLASS[size],
        )}
      >
        {icon ? (
          <span
            aria-hidden="true"
            className="text-content-muted"
          >
            {icon}
          </span>
        ) : null}

        <Heading className="font-semibold text-content-primary">
          {heading}
        </Heading>

        {description ? (
          <p className="max-w-prose text-content-secondary">
            {description}
          </p>
        ) : null}

        {action ? (
          <div className="mt-1">{action}</div>
        ) : null}
      </div>
    </div>
  )
}
