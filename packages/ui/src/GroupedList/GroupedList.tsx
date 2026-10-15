import { useUniqueId } from "@charcuterie/logic"
import type { ReactNode } from "react"

import { toClassName } from "../toClassName.ts"
import { GroupedListRow } from "./GroupedListRow.tsx"

export type GroupedListHeadingLevel = 2 | 3 | 4 | 5 | 6

export type GroupedListSize = "md" | "sm"

export type GroupedListItem = {
  /**
   * Trailing controls — usually one `Button size="sm"`. They sit at
   * the row's inline end and wrap under the text when the list is
   * too narrow to hold both.
   *
   * **Name a repeated action after its row.** Ten rows of "Open" are
   * ten buttons an agent cannot tell apart; `aria-label="Open Lobby"`
   * on each is one `getByRole` away.
   */
  actions?: ReactNode
  /** `Badge`s, drawn after the label and wrapping onto their own line when they run out of room. */
  badges?: ReactNode
  /**
   * Anything richer than one line of help — a payout, a rule list.
   * Drawn under the description, inside the text column, and never
   * truncated.
   */
  content?: ReactNode
  /** One muted line under the label: a path, a key, a count. Truncated like the label. */
  description?: string
  key: string
  /**
   * Plain text, because it is what the row is called — the thing a
   * search matched and the text a clipped row's tooltip repeats.
   */
  label: string
}

export type GroupedListGroup = {
  /** Plain text. It is the accessible name of the group's list, so `getByRole("list", { name })` finds it. */
  heading: string
  items: readonly GroupedListItem[]
  key: string
  /**
   * A muted note beside the heading — a count, a total. Kept out of
   * the heading element so the list's name stays "Screens" rather
   * than "Screens 3 pages".
   */
  summary?: ReactNode
}

export type GroupedListProps = {
  className?: string
  /**
   * Rendered in place of the groups when **no group has an item** —
   * usually an `EmptyState` whose wording says why (nothing yet, or
   * nothing matches the search). Nothing renders without one.
   */
  emptyState?: ReactNode
  groups: readonly GroupedListGroup[]
  /**
   * The level every group heading sits at. A list under a page's
   * `<h2>` needs `3`, which is the default, and getting it wrong is
   * a document-outline break no gate here can see.
   */
  headingLevel?: GroupedListHeadingLevel
  /**
   * `true` (the default) clips a long label or description to one
   * line, with the full text as a tooltip while it is clipped.
   * `false` wraps it anywhere instead — for a list whose rows are
   * read rather than scanned.
   */
  isTextTruncated?: boolean
  /** `sm` for a settings pane or a sidebar; `md` for a page. */
  size?: GroupedListSize
}

/**
 * Written out rather than interpolated into a tag name, matching
 * `Accordion`: "which heading levels does this component emit"
 * should be answerable by looking.
 */
const HEADING_TAG: Record<
  GroupedListHeadingLevel,
  "h2" | "h3" | "h4" | "h5" | "h6"
> = {
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
}

/**
 * An always-open list whose rows sit under group headings.
 *
 * Three apps had built this by hand — castkit's page picker (pages
 * under the screen that shows them), tally-marks' cards (cards under
 * the child who earns them) and whereabouts' nested holdings (things
 * under the place that holds them). Same shape each time: a heading,
 * then rows of a name, a muted line, some badges and a button. The
 * library owns that shape; the app still owns the grouping, the
 * search and the filters, because those are questions about its
 * data.
 *
 * ### A group is a named list, not a landmark
 *
 * castkit's copy wrapped each group in `<section aria-labelledby>`,
 * and a named `<section>` is a `region` landmark. One screen of
 * pages is a dozen groups, so that is a dozen landmarks — the
 * "landmark region proliferation" the APG warns about, which is why
 * `Accordion`'s panels are a `group` too. Here the heading labels
 * the `<ul>` itself: a screen reader announces "Screens, list, 3
 * items", which is the same fact, and the landmark list keeps
 * meaning "the parts of the page".
 *
 * ### An empty group is not drawn
 *
 * Every copy filtered them out before rendering, because a heading
 * over nothing reads as a bug once a search narrows the list. So the
 * component does it, and when every group is empty it draws
 * `emptyState` instead.
 *
 * ### Not collapsible
 *
 * A group you can close is `Accordion`. This is for a list that is
 * short enough to read whole and long enough to want headings.
 */
export const GroupedList = ({
  className,
  emptyState,
  groups,
  headingLevel = 3,
  isTextTruncated = true,
  size = "md",
}: GroupedListProps): ReactNode => {
  const baseId = useUniqueId()

  const shownGroups = groups.filter(
    (group) => group.items.length > 0,
  )

  const Heading = HEADING_TAG[headingLevel]

  return (
    <div
      className={toClassName(
        "flex flex-col",
        size === "sm" ? "gap-4" : "gap-6",
        className,
      )}
    >
      {shownGroups.length === 0
        ? (emptyState ?? null)
        : shownGroups.map((group, index) => {
            const headingId = `${baseId}-heading-${index}`

            return (
              <div
                className="flex flex-col gap-2"
                key={group.key}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <Heading
                    className={toClassName(
                      "m-0 min-w-0 wrap-anywhere font-semibold text-content-primary",
                      size === "sm" ? "text-sm" : "text-md",
                    )}
                    id={headingId}
                  >
                    {group.heading}
                  </Heading>

                  {group.summary ? (
                    <span className="min-w-0 wrap-anywhere text-content-secondary text-sm">
                      {group.summary}
                    </span>
                  ) : null}
                </div>

                <ul
                  aria-labelledby={headingId}
                  className="m-0 flex list-none flex-col divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle bg-surface-raised p-0"
                >
                  {group.items.map((item) => (
                    <GroupedListRow
                      isTextTruncated={isTextTruncated}
                      item={item}
                      key={item.key}
                      size={size}
                    />
                  ))}
                </ul>
              </div>
            )
          })}
    </div>
  )
}
