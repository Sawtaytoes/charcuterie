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
 * component exists to not have. A fifth, below the effects, is not
 * theirs: it is defect 1 coming back through the front door, in this
 * component, found by the first app to consume it.
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

  /**
   * Defect 1 again, and the effect above cannot see it: **a pane can
   * be measured before it has a box.**
   *
   * `AccordionSection` renders its panel with `hidden` rather than
   * unmounting it, deliberately — "a panel that unmounts loses a
   * scroll position, a partially typed form, and any subscription its
   * content opened — and the fleet's log panes are exactly that." A
   * `hidden` subtree has no layout, so the effect above runs on mount
   * with `scrollHeight 0` and writes `scrollTop = 0`, and then never
   * runs again: neither `isFollowing` nor `shownLines` changes when
   * the section is opened. Measured in mux-magic on a 60-line pane:
   *
   * ```
   * while collapsed : scrollTop 0   scrollHeight 0     clientHeight 0
   * after expanding : scrollTop 0   scrollHeight 976   clientHeight 254
   * ```
   *
   * That is this component's own `}, [])` bug, rebuilt out of two
   * components whose individual decisions are both right, and
   * invisible to both of their test suites — `LogViewer`'s mounted
   * visible, `Accordion`'s holding content that never measures
   * itself. mux-magic hit it in its first week as a consumer and
   * worked around it downstream, in a `DisclosedLogViewer` that
   * withheld the pane until the section had been opened once. This is
   * that workaround coming into the library so it can be deleted.
   *
   * ### Why the box and not the viewport
   *
   * An `IntersectionObserver` answers "is it on screen", which is a
   * different question with two wrong answers here: a pane below the
   * fold on a long page is *not* intersecting and has perfectly good
   * layout, and scrolling the page later would re-fire for no reason.
   * `ResizeObserver` answers "does it have a box, and is that box
   * still the same size" — which is the precondition the measurement
   * above actually needs. Per spec it does not fire at `observe()`
   * time for an element that is not being rendered, so gaining a box
   * *is* the first callback, and that is the reveal.
   *
   * It pays for itself twice: a window resize re-wraps the lines and
   * changes what is at the bottom, and a following pane should be at
   * the new bottom rather than a few lines above it.
   *
   * Only while following. A user who scrolled up to read an error is
   * not dragged back by resizing their window.
   */
  useEffect(() => {
    const pane = paneRef.current

    if (!pane || !isFollowing) {
      return
    }

    const observer = new ResizeObserver(() => {
      pane.scrollTop = pane.scrollHeight
    })

    observer.observe(pane)

    return () => {
      observer.disconnect()
    }
  }, [isFollowing])

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
        className={toClassName(
          "max-h-64 overflow-y-auto rounded-md border border-border-subtle bg-surface-sunken p-2 font-mono text-content-secondary text-xs",
          // A sixth defect, and this one is nobody's code: scroll
          // anchoring is the browser quietly *undoing* the follow
          // above, and only sometimes.
          //
          // Chromium picks an anchor node in a scroll container and
          // adjusts `scrollTop` to hold it still across a relayout.
          // That is right for an article and wrong for a log: the
          // whole contract here is "the bottom stays the bottom".
          // `@charcuterie/tokens` ships Victor Mono `font-display:
          // swap`, so a pane that mounts before the face arrives is
          // laid out in the fallback and re-laid-out a moment later —
          // and the anchor drags a followed pane off the end.
          // Measured on the 60-line `Interactive` story, holding the
          // font request back:
          //
          //   anchoring on,  font before mount : scrollTop 722, at the end
          //   anchoring on,  font after mount  : scrollTop 721, a pixel short
          //   anchoring off, either            : scrollTop 722, at the end
          //
          // Whether the swap beats the mount is a race, so the pane
          // followed correctly on some renders and not others. It
          // read as visual-regression flake for a week — one story,
          // `components-logviewer--interactive`, shifted a pixel —
          // because a race is what it is. The DOM test missed it: its
          // four pixels of slack are there for fractional device
          // pixel ratios, and one pixel fits inside them.
          //
          // Only while following. A user who scrolled up to read an
          // error *wants* the anchor — `maxLines` drops old lines off
          // the top, and anchoring is what stops that shoving the
          // line they are reading up the pane.
          isFollowing ? "[overflow-anchor:none]" : null,
        )}
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
