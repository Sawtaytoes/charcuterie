import type { CategoricalIndex } from "@charcuterie/tokens"
import type { ReactNode } from "react"

import {
  CATEGORICAL_APPEARANCE_CLASS,
  CATEGORICAL_HOVER_CLASS,
} from "../categoricalStyles.ts"
import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { UnstyledLink } from "../RouterLink/UnstyledLink.tsx"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"
import type { TimelineSpan } from "./laneTimelineGeometry.ts"

/**
 * Who owns the item's activation — nobody, a router, or a handler.
 *
 * A union rather than two loose optionals, the same call
 * `BoardItemTitleLink` makes and for the same reason: `href` renders
 * an `<a>` and `onSelect` renders a `<button>`, so a bar carrying
 * both is one of them with the other silently dropped. On screen the
 * two are identical.
 */
type TimelineItemAction =
  | {
      /**
       * Where the bar navigates. Routed through
       * `RouterLinkProvider` like every other `href` in this
       * library.
       */
      href?: string
      onSelect?: never
    }
  | {
      href?: never
      /** For a timeline that opens a panel rather than a route. */
      onSelect?: () => void
    }

export type TimelineItem = TimelineSpan & {
  /**
   * The bar's colour, when somebody has chosen one. Omitted, it is
   * the **lane's**, because on this component colour means *which
   * lane* — an item that picked its own hue out of the ten would
   * read as belonging somewhere else. Pass this only when the item
   * genuinely carries its own identity, and then put that identity
   * in words too.
   */
  categorical?: CategoricalIndex
  key: string
  /**
   * The words. A **string**, not a `ReactNode`, for the reason
   * `BoardLane.label` is one: the same value goes into the bar's
   * accessible name, the `title` a hovering reader gets, and the
   * Narrow View's row — none of which can hold a node.
   */
  title: string
} & TimelineItemAction

export type LaneTimelineBarProps = {
  className?: string
  item: TimelineItem
  /** The lane's hue, used when the item picked none. */
  laneCategorical: CategoricalIndex
  /** What the bar says out loud: title, then the span in words. */
  description: string
  /** Square the leading edge — the item began before this range. */
  hasEarlierStart: boolean
  /** Square the trailing edge — it runs past this range. */
  hasLaterEnd: boolean
  /**
   * `bar` is the block on the axis. `row` is the Narrow View's
   * full-width line, where the same item has room for two lines of
   * text and no position to carry meaning.
   */
  shape: "bar" | "row"
}

/**
 * One item, in either of the two shapes this component draws it in.
 *
 * ### The name is the whole of the accessibility argument
 *
 * A bar means something by **where it sits and how long it is**, and
 * neither of those reaches a screen reader. Nor does the hue: ten
 * categorical colours carry *which lane*, and colour alone failing
 * WCAG 1.4.1 is the least of it — the lane is already a named group,
 * so the colour is reinforcement rather than information.
 *
 * What is genuinely only in the geometry is the **span**, so every
 * bar carries it as text: `description` is appended to the title in
 * a `VisuallyHidden` and repeated in the `title` attribute. That
 * second one is not an accessibility feature, it is for the sighted
 * reader: a one-day bar is about twenty pixels wide and cannot show
 * its own name at all.
 *
 * A native `title` rather than `Tooltip`, deliberately. A household
 * week is two hundred bars, and two hundred floating-ui instances to
 * describe boxes that are already described is a cost with nothing
 * on the other side of it.
 *
 * ### The clipped edge is square, and it is also in words
 *
 * An item running out of the visible range loses the radius on that
 * edge, which is the convention every Gantt chart uses. It is **not**
 * the only signal:
 * `description` already says "starts before this range", because a
 * missing corner is not something anybody perceives without the
 * unclipped bar beside it to compare against.
 */
export const LaneTimelineBar = ({
  className,
  description,
  hasEarlierStart,
  hasLaterEnd,
  item,
  laneCategorical,
  shape,
}: LaneTimelineBarProps): ReactNode => {
  const categorical = item.categorical ?? laneCategorical

  const isInteractive = Boolean(item.href ?? item.onSelect)

  const content = (
    <>
      {/*
       * `truncate` and a `min-w-0`, per the flex-overflow rule: the
       * title is the flex row's text child and a single unbreakable
       * word would otherwise become the bar's floor and push the
       * bar past its own grid column. The whole string is in the
       * `title` attribute and in the hidden sentence, so nothing is
       * lost to the ellipsis.
       */}
      <span
        className={toClassName(
          "min-w-0 flex-1",
          shape === "bar"
            ? "truncate"
            : "wrap-anywhere text-sm",
        )}
      >
        {item.title}
      </span>

      {/*
       * Three cases, and which one applies is the reason this is not
       * one line.
       *
       * The Narrow View has room to print the span, so it prints it
       * — a reader who can see the row should not need a hover to
       * learn when a thing is on.
       *
       * A bar that is a control takes its span through `aria-label`
       * instead, because a name assembled from two elements is
       * assembled by the **browser**: chromium joins the two text
       * runs with a space and firefox with nothing, so
       * `getByRole("button", { name })` matches on one engine and
       * not the other. One attribute makes the name exact, and the
       * visible title still opens it, which is what WCAG 2.5.3 asks.
       *
       * A bar that is not a control has no name to write, so the
       * sentence goes in the content where a screen reader will
       * still read it.
       */}
      {shape === "row" ? (
        <span className="text-content-muted text-xs">
          {description}
        </span>
      ) : isInteractive ? null : (
        <VisuallyHidden>{description}</VisuallyHidden>
      )}
    </>
  )

  /**
   * Only the bar shape gets one, and it carries the **title** as
   * well as the span. The Narrow View prints both already, and a
   * tooltip repeating text that is on screen is noise a pointer
   * user cannot dismiss.
   */
  const sentence = `${item.title}, ${description}`

  const hoverText = shape === "bar" ? sentence : undefined

  const shellClassName = toClassName(
    "w-full min-w-0 border px-1.5 text-xs leading-tight",
    shape === "bar"
      ? "flex min-h-5 items-center rounded-sm"
      : "flex flex-col gap-0.5 rounded-md py-1",
    CATEGORICAL_APPEARANCE_CLASS[categorical].soft,
    // A square edge where the item leaves the range. `rounded-*-none`
    // rather than a different component, so a clipped bar and a whole
    // one are the same box with one corner rule changed.
    hasEarlierStart && shape === "bar" && "rounded-s-none",
    hasLaterEnd && shape === "bar" && "rounded-e-none",
    isInteractive && "cursor-pointer",
    isInteractive &&
      CATEGORICAL_HOVER_CLASS[categorical].soft,
    isInteractive && FOCUS_RING_CLASS,
    className,
  )

  if (item.href) {
    return (
      <UnstyledLink
        aria-label={sentence}
        className={shellClassName}
        href={item.href}
        title={hoverText}
      >
        {content}
      </UnstyledLink>
    )
  }

  if (item.onSelect) {
    return (
      <button
        aria-label={sentence}
        className={toClassName(
          shellClassName,
          "text-start",
        )}
        onClick={item.onSelect}
        title={hoverText}
        type="button"
      >
        {content}
      </button>
    )
  }

  return (
    <span className={shellClassName} title={hoverText}>
      {content}
    </span>
  )
}
