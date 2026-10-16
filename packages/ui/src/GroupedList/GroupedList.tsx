import { useUniqueId } from "@charcuterie/logic"
import type { IntentName } from "@charcuterie/tokens"
import type { ReactNode } from "react"

import { toClassName } from "../toClassName.ts"
import { GroupedListRow } from "./GroupedListRow.tsx"
import { STICKY_HEADING_CLASS } from "./groupedListStickyHeading.ts"

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
   *
   * In a row with `onSelect` these stay their own targets: they sit
   * above the whole-row button, so pressing one never selects the
   * row.
   */
  actions?: ReactNode
  /**
   * A figure that belongs beside the text rather than under it — a
   * payout, a total, a schedule. It sits between the text and the
   * actions in a wide list and drops under the text in a narrow one,
   * the same content-decided wrap the actions use: it asks for at
   * least 11rem beside the text column's 12rem. Never interactive:
   * in a row with `onSelect` the whole-row button sits over it.
   */
  aside?: ReactNode
  /** `Badge`s, drawn after the label and wrapping onto their own line when they run out of room. */
  badges?: ReactNode
  /**
   * Anything richer than one line of help — a payout, a rule list.
   * Drawn under the description, inside the text column, and never
   * truncated. Never interactive in a row with `onSelect`; a control
   * belongs in `actions`.
   */
  content?: ReactNode
  /** One muted line under the label: a path, a key, a count. Truncated like the label. */
  description?: string
  /**
   * The intent `isHighlighted` rings the row in. `accent` by default;
   * an app whose highlight means "this just paid out" passes
   * `success`.
   */
  highlightIntent?: IntentName
  /**
   * `true` rings the row and pulses the ring twice — "this one just
   * changed", for a row a scan, a save or an arrival has touched.
   * The ring stays while the flag does, so the app decides how long
   * it lasts, usually by clearing it on a timer.
   *
   * **To pulse a row that is already highlighted again, change its
   * `key`.** A new key is a new row, and a new row starts the pulse
   * from the beginning; `` `${id}-${sequence}` `` is the usual shape.
   *
   * Under `prefers-reduced-motion` and on ePaper the ring does not
   * pulse; it is simply there.
   */
  isHighlighted?: boolean
  /**
   * `true` draws the row receded — a sunken surface and a quieter
   * label — for an entry that exists but is switched off. It stays
   * fully operable and every colour on it still clears AA, which is
   * why it is a surface and a text role rather than an opacity: a
   * faded row is not a disabled one, and only a disabled control may
   * drop below the contrast floor. Say WHY in a badge too ("off").
   */
  isMuted?: boolean
  key: string
  /**
   * Plain text, because it is what the row is called — the thing a
   * search matched and the text a clipped row's tooltip repeats.
   */
  label: string
  /**
   * Makes the whole row one native `<button>` — "open this one" for a
   * row whose primary action is the row itself. Hover tints the row
   * and rings its edge, a press sinks it (with motion only when the
   * user has not asked for less), and keyboard focus draws the focus
   * ring inside the row's edge. `actions` stay separate targets
   * above it.
   *
   * The button is drawn UNDER the row's text and the text lets the
   * pointer through, so nothing interactive is ever nested inside a
   * button: keep `badges`, `content` and `aside` free of controls.
   */
  onSelect?: () => void
  /**
   * The whole-row button's accessible name. Defaults to `label`.
   * Name the verb when there is one — `"Edit Water the ferns"` —
   * the same rule as a repeated action.
   */
  selectLabel?: string
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
   * `true` pins each group's heading to the top of the nearest
   * scrolling ancestor while that group's rows scroll under it, and
   * the next group's heading pushes it away. For a list inside a
   * scrolling pane, where the heading is the only thing that says
   * which screen or team a row belongs to once it scrolls out of
   * sight. `false` (the default) scrolls the heading with its rows.
   *
   * A stuck heading needs an opaque background or the rows show
   * through it, and no one surface fits every host — a page is
   * `surface-base`, a settings pane is `surface-raised`. So the
   * background is read from `--charcuterie-grouped-list-heading-surface`,
   * which falls back to `--color-surface-base`. Set it on any
   * ancestor to match the surface the list sits on. Under a sticky
   * page `Header`, set `--charcuterie-grouped-list-heading-offset`
   * to the header's height so the headings stop below it.
   */
  isHeadingSticky?: boolean
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
 * ### A sticky heading is opt-in
 *
 * castkit's copy pinned its headings, and a pinned heading needs a
 * background that matches whatever it sits on. The component cannot
 * know that surface, so `isHeadingSticky` reads it from a custom
 * property the host can set, falling back to `surface-base`.
 *
 * ### A row can be the target
 *
 * tally-marks' card list opens a card's editor from anywhere on the
 * card, and the owner asked for that to feel like an app: hover,
 * press, focus, touch. `onSelect` is that, as one real `<button>`
 * stretched under the row's text — not a click handler on an
 * `<li>`, which no keyboard reaches and no screen reader announces.
 * The text lets the pointer through to it; the actions sit above it
 * and keep their own targets, so "Delete" never opens the editor.
 *
 * A row can also be muted (switched off but still there) and
 * highlighted (just touched by a scan or a save) — the two other
 * per-row states the same list drew by hand.
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
  isHeadingSticky = false,
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
                className={toClassName(
                  "flex flex-col",
                  isHeadingSticky ? "gap-0" : "gap-2",
                )}
                key={group.key}
              >
                <div
                  className={toClassName(
                    "flex flex-wrap items-baseline gap-x-3 gap-y-0.5",
                    isHeadingSticky && STICKY_HEADING_CLASS,
                  )}
                >
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
