import type { ConnectionStatus } from "@charcuterie/logic"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { DOT_SIZE_CLASS } from "../controlStyles.ts"
import {
  INTENT_CONTENT_CLASS,
  INTENT_SOLID_FILL_CLASS,
} from "../intentStyles.ts"
import {
  getConnectionIntent,
  getConnectionLabel,
  getIsConnectionBusy,
} from "../statusIntent.ts"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"

export type LiveStatusIndicatorSize =
  keyof typeof DOT_SIZE_CLASS

export type LiveStatusIndicatorProps = Omit<
  ComponentPropsWithRef<"span">,
  "children"
> & {
  /** Extra context, announced after the label. "3 of 4 bays." */
  detail?: string
  isLabelVisible?: boolean
  /** Overrides the machine's own wording. Rarely wanted. */
  label?: string
  size?: LiveStatusIndicatorSize
  status: ConnectionStatus
}

/**
 * Four repos, four different implementations, and **it is the thing
 * users read most** — a wall-mounted panel showing stale data with a
 * green dot is worse than one showing nothing.
 *
 * The second reason it is P0: all four collapse `connecting` and
 * `reconnecting` into one state, which reads wrong on exactly the
 * link that needs it. A user who has seen data wants "lost it,
 * getting it back" (amber, moving), not the cold-start spinner they
 * already sat through (blue) and not a dead link (red). That
 * distinction is why `connectionTransitions` is one of the two
 * machines `@charcuterie/logic` ships rather than something each app
 * defines, and `getConnectionIntent` / `getConnectionLabel` are
 * exhaustive switches over it — add a fifth state and this component
 * stops compiling instead of rendering a grey dot.
 *
 * `role="status"` + `aria-live="polite"` on the wrapper, so a
 * transition is announced without interrupting whatever the user is
 * doing. `aria-live="assertive"` would be wrong here even for
 * `disconnected`: it cuts off the sentence in progress, and the dot
 * is not going anywhere.
 */
export const LiveStatusIndicator = ({
  className,
  detail,
  isLabelVisible = true,
  label,
  size = "md",
  status,
  ...spanProps
}: LiveStatusIndicatorProps): ReactNode => {
  const intent = getConnectionIntent(status)

  const statusLabel = label ?? getConnectionLabel(status)

  return (
    <span
      {...spanProps}
      // Named as well as live, for the same reason as `Spinner`: a
      // `status` region gets no name from its content, so this is
      // what makes `getByRole("status", { name: "Connected" })` — the
      // query an agent will actually write — resolve.
      aria-label={statusLabel}
      aria-live="polite"
      className={toClassName(
        "inline-flex items-center gap-2 text-sm",
        INTENT_CONTENT_CLASS[intent],
        className,
      )}
      role="status"
      // Not an ARIA attribute — a hook for a consumer's own CSS and
      // for a Playwright assertion that wants the state rather than
      // the wording, which survives translation.
      data-status={status}
    >
      <span
        aria-hidden="true"
        className={toClassName(
          "inline-block shrink-0 rounded-full",
          DOT_SIZE_CLASS[size],
          INTENT_SOLID_FILL_CLASS[intent],
          // Only the two in-flight states move. A pulsing dot that
          // never stops is the fleet's current "is it alive?"
          // problem in a new costume.
          getIsConnectionBusy(status) &&
            "charcuterie-pulse",
        )}
      />

      {isLabelVisible ? (
        <span>{statusLabel}</span>
      ) : (
        <VisuallyHidden>{statusLabel}</VisuallyHidden>
      )}

      {detail ? (
        <span className="text-content-muted">{detail}</span>
      ) : null}
    </span>
  )
}
