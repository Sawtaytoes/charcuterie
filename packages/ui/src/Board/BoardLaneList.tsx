import { useUniqueId } from "@charcuterie/logic"
import type { ReactNode } from "react"

import { Badge } from "../Badge/Badge.tsx"
import { Button } from "../Button/Button.tsx"
import { EmptyState } from "../EmptyState/EmptyState.tsx"
import { TextLink } from "../TextLink/TextLink.tsx"
import { toClassName } from "../toClassName.ts"
import type { BoardItem } from "./BoardCard.tsx"
import { BoardCard } from "./BoardCard.tsx"

export type BoardLane = {
  /**
   * Lane-level controls, beside the count — Docket's *"Accept all"*
   * on the review lane. `Button`s, usually.
   */
  actions?: ReactNode
  /**
   * Shown instead of the rows when the lane is empty. Defaults to a
   * real `EmptyState`, because *"Real empty states"* was a stated
   * requirement and an empty lane is the one a person sees most.
   */
  emptyState?: ReactNode
  /**
   * Where the lane's own heading navigates — a route showing this
   * lane and nothing else.
   *
   * **A link inside the heading, never a heading replaced by a
   * link.** The `<h3>` keeps its level, its id and its place in the
   * document outline, so the lane stays a named `group` and the
   * screen-reader outline is unchanged; the anchor sits inside it.
   * Routed through `RouterLinkProvider` like every other `href` in
   * this library, so an app with a client-side router navigates
   * without a full page load and one without it still gets a real
   * `<a href>`.
   *
   * Absent means the heading is plain text, which is what every
   * existing consumer gets.
   */
  href?: string
  /**
   * The **true** size of the lane, when `items` is a truncated page
   * of it. This is what the count badge shows, and the difference
   * between it and `items.length` is what the "+ n more" line says.
   *
   * Defaults to `items.length`, so a consumer that does not truncate
   * says nothing about truncation.
   */
  itemCount?: number
  items: readonly BoardItem[]
  key: string
  /**
   * The lane's name, and it stays a **string** rather than widening
   * to a `ReactNode`.
   *
   * It is not only a heading: the same value names the lane in the
   * move menu on every card, in the Narrow View's segmented control,
   * in the "+ n more in Todo" line, and in the sentence the live
   * region reads out after a move. A `ReactNode` is not something
   * any of those four can put in a string, so widening this would
   * trade one linkable heading for four places that can no longer
   * say which lane they mean. `href` buys the link without that.
   */
  label: string
  /**
   * What "+ n more in this lane" does. With no handler the line is
   * still shown — the honest count matters more than the
   * affordance — but it is text rather than a button.
   */
  onShowMore?: () => void
}

export type BoardLaneListProps = {
  /**
   * Pixels from the top of the list box, or `null` for no
   * indicator. Absolute rather than a real element between two
   * cards: an indicator that takes up space moves the cards it is
   * measured against, and the resulting feedback loop is why so many
   * hand-rolled boards flicker.
   */
  dropIndicatorOffset: number | null
  /**
   * The lane heading's level. The caller's, because only the caller
   * knows what the board sits under — an `<h3>` directly below the
   * page's `<h1>` is an axe `heading-order` failure, and a board is
   * as likely to sit under a section heading as under the page
   * title.
   */
  headingLevel: 2 | 3 | 4 | 5
  isVisibleWhenNarrow: boolean
  lane: BoardLane
  laneLayout: "columns" | "rows"
  moveIcon?: ReactNode
  moveTargets: readonly { key: string; label: string }[]
  onMoveToLane?: (
    itemKey: string,
    toLaneKey: string,
  ) => void
  onStartDrag?: (
    pointerEvent: {
      clientX: number
      clientY: number
      currentTarget: EventTarget & Element
      pointerId: number
    },
    origin: { fromIndex: number; itemKey: string },
  ) => void
  registerListElement: (element: HTMLElement | null) => void
}

/**
 * One lane: a named heading, an honest count, its rows, and what it
 * says when there are none.
 *
 * ### The lane is the container, and that is the whole design
 *
 * `@container` sits on a wrapper inside this section, so everything
 * below it — the panel, its rows — is sized by **the lane**. Three
 * lanes in a 1600px window are ~500px each; one lane in the Narrow
 * View is ~360px; the same lane in a docked sidebar is 280px. All
 * three happen on the same monitor, and no media query can tell
 * them apart.
 *
 * The wrapper is a wrapper because a container query matches
 * **descendants only**. Declaring `@container` on the panel itself
 * would compile, generate real CSS, and silently never fire — so
 * the panel could never take its own frame off at `cq-lg`, which is
 * the one thing the widest layout asks for.
 *
 * This `<section>` is outside all of that: it carries the
 * hidden/shown classes, and those resolve against the **board's**
 * container, one level up.
 *
 * ### Long lanes truncate; they do not scroll
 *
 * *"Long lanes truncate with an honest `+ n more` rather than
 * scrolling forever."* So the lane never grows a scrollbar and never
 * virtualises. `itemCount` is the real total and `items` is whatever
 * the consumer chose to render — which keeps paging, sorting and any
 * windowing on the side that owns the data, and keeps this component
 * from pretending to know how many rows are worth painting.
 */
export const BoardLaneList = ({
  dropIndicatorOffset,
  headingLevel,
  isVisibleWhenNarrow,
  lane,
  laneLayout,
  moveIcon,
  moveTargets,
  onMoveToLane,
  onStartDrag,
  registerListElement,
}: BoardLaneListProps): ReactNode => {
  const headingId = useUniqueId()

  const itemCount = lane.itemCount ?? lane.items.length

  const hiddenCount = itemCount - lane.items.length

  const Heading = `h${headingLevel}` as const

  return (
    /**
     * `role="group"`, **not** a landmark — the same call the
     * accordion made, for the same reason
     * ([decision](../../../docs/decisions/2026-07-31-an-accordion-panel-is-a-group-not-a-landmark.md)).
     * A named `<section>` is a `region`, and a board would then put
     * three or four landmarks on a page that has one job. Worse,
     * two boards on one page — or three copies of one in a
     * container-width story — put two landmarks called "Todo" in
     * the document, which is axe's `landmark-unique` and a genuine
     * navigation problem rather than a lint nit. The board itself
     * stays a region; its lanes are groups inside it.
     *
     * A `<div>` rather than a `<section role="group">`, and the
     * difference is not cosmetic: axe's `landmark-unique` matches
     * `section[aria-labelledby]` on the **element**, so a named
     * `<section>` is still audited as a landmark after its role has
     * been overridden. It failed exactly that way here before this
     * line changed.
     */
    // biome-ignore lint/a11y/useSemanticElements: the semantic element for `group` is `<fieldset>`, which is a form-control grouping — it drags `<legend>` semantics, a border and form-reset behaviour onto a lane that holds a list of cards. Same call `Menu`'s group and `AccordionSection` already made.
    <div
      aria-labelledby={headingId}
      role="group"
      className={toClassName(
        "min-w-0 flex-1 flex-col gap-2",
        // Below the board's own `cq-lg`, one lane is on screen and
        // the rest are chosen with the segmented control above. This
        // queries the **board**, not the list below — an element
        // carrying `container-type` still resolves its own container
        // queries against its nearest ancestor container.
        laneLayout === "rows"
          ? "flex"
          : isVisibleWhenNarrow
            ? "flex"
            : "hidden cq-lg:flex",
      )}
    >
      {/*
       * The container is this wrapper rather than the panel inside
       * it, and that is what buys the `cq-lg` treatment: an element
       * cannot query the container it declares, so a panel that
       * declared its own container could never take its own frame
       * off again. One `<div>` and the whole width-dependent
       * treatment becomes expressible.
       */}
      <div className="@container">
        <div
          className={toClassName(
            "gap-2 rounded-lg border border-border-subtle px-3 py-2",
            laneLayout === "rows"
              ? "grid bg-surface-raised cq-lg:grid-cols-[12rem_minmax(0,1fr)] cq-lg:items-start cq-lg:gap-x-3"
              : "flex flex-col bg-surface-raised cq-lg:border-0 cq-lg:bg-transparent cq-lg:p-0",
          )}
        >
          <header
            className={toClassName(
              "flex items-center gap-2",
              laneLayout === "rows" && "flex-wrap",
            )}
          >
            <Heading
              className="font-semibold text-content-primary text-sm"
              id={headingId}
            >
              {lane.href ? (
                /*
                 * `text-inherit` and `font-semibold` on purpose: a
                 * linkable column title should read as the same
                 * heading it was, not as a blue word. The link
                 * announces itself by being a link — the cursor,
                 * the focus ring and the hover underline all come
                 * from `TextLink` — and a board whose every lane
                 * title is accent-coloured competes with the card
                 * titles underneath it, which are the things a
                 * reader is actually scanning.
                 */
                <TextLink
                  appearance="standalone"
                  className="font-semibold text-inherit"
                  href={lane.href}
                >
                  {lane.label}
                </TextLink>
              ) : (
                lane.label
              )}
            </Heading>

            <Badge
              appearance="soft"
              intent="neutral"
              size="sm"
            >
              {String(itemCount)}
            </Badge>

            <span className="flex-1" />

            {lane.actions}
          </header>

          <ul
            className={toClassName(
              "relative",
              laneLayout === "rows"
                ? "grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2"
                : "flex flex-col",
            )}
            ref={registerListElement}
          >
            {lane.items.length === 0 ? (
              <li>
                {lane.emptyState ?? (
                  <EmptyState
                    description="Nothing is waiting here."
                    heading="Nothing here"
                    headingLevel={
                      // One below the lane's own, so the outline
                      // stays whole wherever the board is mounted.
                      (headingLevel + 1) as 3 | 4 | 5 | 6
                    }
                    size="sm"
                  />
                )}
              </li>
            ) : (
              lane.items.map((item, index) => (
                <BoardCard
                  isInGrid={laneLayout === "rows"}
                  item={item}
                  key={item.key}
                  laneLabel={lane.label}
                  moveIcon={moveIcon}
                  moveTargets={moveTargets}
                  onMoveToLane={
                    onMoveToLane
                      ? (toLaneKey) => {
                          onMoveToLane(item.key, toLaneKey)
                        }
                      : undefined
                  }
                  onStartDrag={
                    onStartDrag
                      ? (pointerEvent) => {
                          onStartDrag(pointerEvent, {
                            fromIndex: index,
                            itemKey: item.key,
                          })
                        }
                      : undefined
                  }
                />
              ))
            )}

            {dropIndicatorOffset === null ? null : (
              <li
                aria-hidden="true"
                className="pointer-events-none absolute end-0 start-0 h-0.5 rounded-full bg-intent-accent-solid"
                style={{
                  insetBlockStart: `${dropIndicatorOffset}px`,
                }}
              />
            )}
          </ul>

          {hiddenCount > 0 ? (
            <p
              className={toClassName(
                "text-content-muted text-xs",
                laneLayout === "rows" &&
                  "cq-lg:col-start-2",
              )}
            >
              {lane.onShowMore ? (
                <Button
                  appearance="ghost"
                  intent="neutral"
                  onClick={lane.onShowMore}
                  size="sm"
                >
                  {`+ ${hiddenCount} more in ${lane.label}`}
                </Button>
              ) : (
                `+ ${hiddenCount} more in ${lane.label}`
              )}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
