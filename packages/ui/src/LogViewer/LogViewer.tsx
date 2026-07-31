import type { IntentName } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import { Button } from "../Button/Button.tsx"
import { INTENT_CONTENT_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"

export type LogLine = {
  intent?: IntentName
  key: string
  text: string
}

export type LogViewerProps = {
  className?: string
  /**
   * Announce new lines to a screen reader. **Off by default**, and
   * that is a considered choice rather than an oversight — see
   * below.
   */
  isAnnounced?: boolean
  /** The pane's accessible name. Required. */
  label: string
  lines: LogLine[]
  /**
   * Oldest lines past this are dropped from the DOM. A rip in
   * progress emits a line every few hundred milliseconds for an
   * hour, and the browser keeps every node.
   */
  maxLines?: number
}

/**
 * Three repos render a scrolling log pane —
 * mux-magic's `JobLogsDisclosure` and `StepLogs`, rip-deck's
 * `LogModal` — and between them they have four defects that this
 * component exists to not have.
 *
 * ### 1. The one that follows nothing
 *
 * ```tsx
 * useEffect(() => {
 *   const pane = paneRef.current
 *   if (pane) pane.scrollTop = pane.scrollHeight
 * }, [])          // ← empty deps
 * ```
 *
 * That is mux-magic's auto-scroll, and it runs **once**, on mount,
 * when the pane is empty and `scrollHeight` is `clientHeight`. Every
 * line after it arrives below the fold. It reads as correct, it is
 * the shape everyone writes, and the log simply never follows.
 *
 * ### 2. Following that cannot be escaped
 *
 * The naive fix — scroll to the bottom on every render — is worse:
 * a user scrolling back to read the line that mentioned an error is
 * yanked to the end twice a second. Following has to be *pinned to
 * the user's own position*, which is what `isFollowing` below is: it
 * turns off the moment the user scrolls away and back on when they
 * return to the bottom, and there is a button for when they do not
 * want to scroll all that way.
 *
 * ### 3. `data-log-id`
 *
 * mux-magic's pane carries one. It is a `data-testid` under a
 * different name — a handle only the test suite can see — and this
 * package's `sourceRules.test.ts` bans the practice rather than the
 * spelling. The pane here is found by its `label`, the same query
 * Playwright makes.
 *
 * ### 4. Announcing an hour of build output
 *
 * `role="log"` is the correct role and `aria-live` is off unless
 * asked for. A live log pane emitting a line every 300 ms is a
 * screen reader that cannot be interrupted and a user who cannot
 * read anything else on the page — the accessible answer for a
 * long-running job is a `LiveStatusIndicator` announcing *state*
 * and a log that is there to be read when wanted. `isAnnounced`
 * exists for the short case: a five-line result panel where the
 * lines *are* the outcome.
 *
 * ### Not every boolean is a state kind
 *
 * `isFollowing` is `useState`, not `useVisibility`, and this is the
 * first component in the library to say so out loud. The kinds in
 * `@charcuterie/logic` earn their keep when state is **registered**
 * (members join a group), **composed** (focus and selection
 * disagreeing), or **shared** (a trigger and a panel at opposite
 * ends of a tree). None of that is true here: one component reads
 * one boolean it wrote itself. Reaching for `useVisibility` because
 * it is also a boolean would make `isVisible` mean "is following",
 * which is how a state layer stops meaning anything.
 */
export const LogViewer = ({
  className,
  isAnnounced = false,
  label,
  lines,
  maxLines = 500,
}: LogViewerProps): ReactNode => {
  const paneRef = useRef<HTMLDivElement>(null)

  const [isFollowing, setIsFollowing] = useState(true)

  const shownLines =
    lines.length > maxLines
      ? lines.slice(lines.length - maxLines)
      : lines

  // biome-ignore lint/correctness/useExhaustiveDependencies: `shownLines` is read through the DOM, not through the closure — `pane.scrollHeight` is a *consequence* of the lines having rendered, so the linter sees a dependency it cannot trace and calls it unnecessary. Removing it is not a style change: the effect then runs only when `isFollowing` flips, which is mux-magic's `}, [])` bug rebuilt exactly. `yarn lint` runs `--write --unsafe`, so this was applied silently once already and the log stopped following.
  useEffect(() => {
    const pane = paneRef.current

    if (!pane || !isFollowing) {
      return
    }

    pane.scrollTop = pane.scrollHeight
    // `shownLines` rather than an empty array — this is the whole fix
    // for defect 1, and the dependency *is* the fix.
  }, [isFollowing, shownLines])

  return (
    <div
      className={toClassName(
        "relative flex flex-col",
        className,
      )}
    >
      <div
        aria-label={label}
        // `off` unless asked. See the note above; this is the
        // difference between an accessible log and an unusable page.
        aria-live={isAnnounced ? "polite" : "off"}
        className="max-h-64 overflow-y-auto rounded-md border border-border-subtle bg-surface-sunken p-2 font-mono text-content-secondary text-xs"
        onScroll={(scrollEvent) => {
          const pane = scrollEvent.currentTarget

          // A few pixels of slack, because a fractional device pixel
          // ratio means `scrollTop + clientHeight` never lands
          // exactly on `scrollHeight` — an equality test here
          // un-pins the pane on a 125% display and on nothing else,
          // which is the kind of bug that gets reported as "it works
          // on my machine".
          const isPinnedToBottom =
            pane.scrollHeight -
              pane.scrollTop -
              pane.clientHeight <
            4

          setIsFollowing(isPinnedToBottom)
        }}
        ref={paneRef}
        role="log"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container must be focusable or a keyboard user can see the pane and cannot scroll it — axe's `scrollable-region-focusable`, which fails this component without the line. Chrome started doing it automatically in 2024; Firefox and Safari have not. The rule is right about `<div>`s in general and wrong about scrollers.
        tabIndex={0}
      >
        {shownLines.length === 0 ? (
          <p className="text-content-muted">
            Waiting for output…
          </p>
        ) : (
          shownLines.map((line) => (
            <p
              className={toClassName(
                "whitespace-pre-wrap break-all",
                line.intent === undefined
                  ? null
                  : INTENT_CONTENT_CLASS[line.intent],
              )}
              key={line.key}
            >
              {line.text}
            </p>
          ))
        )}
      </div>

      {isFollowing ? null : (
        <Button
          appearance="soft"
          className="absolute inset-x-0 bottom-2 mx-auto w-fit"
          intent="neutral"
          onClick={() => {
            setIsFollowing(true)
          }}
          size="sm"
        >
          Jump to latest
        </Button>
      )}
    </div>
  )
}
