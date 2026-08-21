import type { ReactNode } from "react"

import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"

/**
 * Where a step sits in the sequence.
 *
 * `blocked` is not a worse `upcoming`. Upcoming means "its turn has
 * not come"; blocked means "its turn has come and something is in
 * the way", which is a thing to go and fix rather than a thing to
 * wait for. Docket's phases need exactly this split — a phase gated
 * behind an unfinished one, versus a phase gated behind an EMPTY
 * one, where the second is a mistake somebody has to correct.
 */
export type StepStatus =
  | "blocked"
  | "current"
  | "done"
  | "upcoming"

export type Step = {
  /** What the marker shows instead of its ordinal position. */
  readonly marker?: ReactNode
  readonly key: string
  readonly label: ReactNode
  /** One line under the label — why it is blocked, what it is
   * waiting on, when it finished. */
  readonly description?: ReactNode
  /**
   * What BELONGS to this step: the tasks in a phase, the fields in
   * a form stage, the checks in a pipeline.
   *
   * The reason this component is not a `ProgressBar` with a legend.
   * A bar says a sequence is half done; only the contents say which
   * things go together and which one is next.
   */
  readonly content?: ReactNode
  readonly status?: StepStatus
}

export type StepperOrientation = "horizontal" | "vertical"

export type StepperProps = {
  readonly className?: string
  /**
   * What level the step labels are. The caller's, because only the
   * caller knows what the stepper sits under — one below a page
   * `<h1>` wants `2`, one inside an already-deep section wants `4`.
   * Getting it wrong is an axe `heading-order` failure and a broken
   * screen-reader outline.
   */
  readonly headingLevel?: 2 | 3 | 4 | 5
  /** The list's accessible name. Required — an unnamed sequence of
   * numbers is a sequence of numbers. */
  readonly label: string
  /**
   * `horizontal` is a REQUEST, not a promise: it collapses to
   * vertical below `cq-md`, because four steps side by side in a
   * narrow container squash into unreadable slivers (`2. / De- /
   * dupe`, measured). A step carrying `content` should stay
   * vertical — a column cannot hold a list.
   */
  readonly orientation?: StepperOrientation
  readonly steps: readonly Step[]
}

/**
 * An ordered sequence of steps, with what belongs to each one.
 *
 * ### Why the status is never colour alone
 *
 * Four states painted only as four marker colours is a WCAG 1.4.1
 * failure however clear it looks, so each status reaches a screen
 * reader as a word — `VisuallyHidden`, next to the label — and gets
 * a second visual channel besides hue: a **filled** marker for done
 * and current, an **outlined** one for upcoming and blocked, and a
 * connector that is solid behind finished work and dashed ahead of
 * it.
 *
 * ### Why the marker is a number and never a tick
 *
 * This library
 * [ships no icons and no symbol glyphs](../../../../docs/decisions/2026-07-29-ship-no-icons-and-no-symbol-glyphs.md).
 * A `✓` renders as an empty box wherever the font lacks it — which
 * includes the sandbox chromium, the kiosk image and the ePaper
 * build — and an empty box in the "done" position reads as an error.
 * The ordinal always renders. An app that owns a glyph set can pass
 * one as `marker`.
 *
 * ### Why the connector is an element
 *
 * Not a `::before`. `styles.css` is reserved for the handful of
 * visuals a Tailwind utility genuinely cannot express — the looping
 * animations and the scrollbar — and a line between two markers is
 * not one of them. A real `<span aria-hidden>` also stops the last
 * step drawing a connector into empty space, which is a
 * `:not(:last-child)` selector nobody remembers to write.
 */
export const Stepper = ({
  className,
  headingLevel = 3,
  label,
  orientation = "vertical",
  steps,
}: StepperProps) => {
  const Heading = `h${headingLevel}` as "h3"
  const isHorizontal = orientation === "horizontal"

  return (
    // The container is a WRAPPER, never the `<ol>` itself.
    //
    // An element cannot answer its own container query: declaring
    // `container-type` on the list makes it the query container for
    // its DESCENDANTS, and `cq-md:` on the list resolves against
    // whatever container is further up — usually none. The first
    // version of this component put both on the `<ol>`, and the
    // result was a horizontal stepper whose CONNECTORS went
    // horizontal (they are children, so they matched) while the
    // list stayed a column. Valid CSS, no error, nothing for axe or
    // a DOM test to say, and obvious the moment it was rendered.
    // `Board` carries the same note for the same reason.
    <div className={toClassName("@container", className)}>
      <ol
        aria-label={label}
        className={toClassName(
          "flex list-none flex-col gap-5 p-0",
          // Horizontal is the WIDE answer only. Below `cq-md` this
          // falls back to the column, which is the same rule
          // `Board` follows and for the same reason: the owner
          // browses zoomed in, so a window's width is not the
          // number of pixels anything actually has.
          isHorizontal && "cq-md:flex-row cq-md:gap-0",
        )}
      >
        {steps.map((step, index) => {
          const status = step.status ?? "upcoming"
          const isLast = index === steps.length - 1

          return (
            <li
              className={toClassName(
                "relative grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-x-3",
                isHorizontal &&
                  "cq-md:flex cq-md:min-w-0 cq-md:flex-1 cq-md:flex-col cq-md:gap-y-2",
                // Blocked and upcoming recede; the step you can act
                // on is the one that keeps full contrast. Opacity
                // rather than a muted token so the step's own
                // contents dim with it — a task list at full strength
                // under a dimmed heading reads as startable.
                (status === "blocked" ||
                  status === "upcoming") &&
                  "opacity-70",
              )}
              key={step.key}
            >
              <span
                className={toClassName(
                  "col-start-1 row-start-1 grid size-7 place-items-center rounded-full border text-sm tabular-nums",
                  STATUS_MARKER_CLASS[status],
                  isHorizontal && "cq-md:col-start-1",
                )}
              >
                {step.marker ?? index + 1}
              </span>

              {/* Absent on the last step, so nothing draws a line
                into empty space. */}
              {isLast ? null : (
                <span
                  aria-hidden
                  className={toClassName(
                    "col-start-1 row-start-2 my-1 w-0.5 justify-self-center rounded-full",
                    // Solid behind finished work, dashed ahead of it
                    // — the second visual channel that keeps this
                    // from being colour alone.
                    status === "done"
                      ? "bg-intent-success-solid"
                      : "bg-border-subtle",
                    isHorizontal &&
                      "cq-md:absolute cq-md:top-3.5 cq-md:start-7 cq-md:my-0 cq-md:h-0.5 cq-md:w-[calc(100%-1.75rem)]",
                  )}
                />
              )}

              <div
                className={toClassName(
                  "col-start-2 row-span-2 row-start-1 min-w-0",
                  isHorizontal && "cq-md:col-start-1",
                )}
              >
                <Heading className="m-0 flex flex-wrap items-center gap-2 text-md font-medium text-content-primary">
                  {step.label}

                  {/* The status as a WORD. Four marker colours is
                    four colours as far as assistive technology is
                    concerned, and this is the only channel that
                    survives a screen reader, a greyscale print and
                    the ePaper build at once. */}
                  <VisuallyHidden>
                    {STATUS_LABEL[status]}
                  </VisuallyHidden>
                </Heading>

                {step.description == null ? null : (
                  <p className="mt-0.5 mb-0 text-sm text-content-secondary">
                    {step.description}
                  </p>
                )}

                {step.content == null ? null : (
                  <div className="mt-2">{step.content}</div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/**
 * Written out in full, never interpolated. Tailwind v4 scans source
 * text for COMPLETE class strings, so `` `bg-intent-${x}-solid` ``
 * generates nothing at all and the element paints transparent with
 * no error and no failing test —
 * `tailwindCandidates.test.ts` is what makes this near-duplication
 * safe to keep.
 */
const STATUS_MARKER_CLASS: Record<StepStatus, string> = {
  blocked:
    "border-intent-warning-border bg-intent-warning-surface text-intent-warning-content",
  current:
    "border-intent-accent-border bg-intent-accent-surface text-intent-accent-content",
  done: "border-intent-success-border bg-intent-success-solid text-intent-success-on-solid",
  upcoming:
    "border-border-subtle bg-surface-raised text-content-secondary",
}

const STATUS_LABEL: Record<StepStatus, string> = {
  blocked: "Blocked",
  current: "In progress",
  done: "Done",
  upcoming: "Not started",
}
