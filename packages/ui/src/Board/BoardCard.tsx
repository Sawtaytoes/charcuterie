import type { IntentName } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useState } from "react"

import { Button } from "../Button/Button.tsx"
import type { CardAccentEdge } from "../Card/cardAccentEdge.ts"
import {
  getAccentEdgeClassName,
  getAccentEdgeStyle,
} from "../Card/cardAccentEdge.ts"
import {
  FOCUS_RING_CLASS,
  INTENT_SOLID_FILL_CLASS,
} from "../intentStyles.ts"
import type { MenuProps } from "../Menu/Menu.tsx"
import { Menu } from "../Menu/Menu.tsx"
import { TextLink } from "../TextLink/TextLink.tsx"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"

type BoardItemFields = {
  /** What the bar means, in words. "Priority 0", "Movies and Shows". */
  accentLabel?: string
  /**
   * Under the title and metadata, spanning the card: a live run
   * line, a gate explanation, a due date. A `ProgressBar` goes here.
   */
  footer?: ReactNode
  /**
   * Visibly present but not actionable — Docket's *gated*: a task
   * whose phase has not opened yet. Paint only; it does not disable
   * the title, because being able to read a thing you cannot start
   * yet is the entire point of showing it.
   */
  isDimmed?: boolean
  key: string
  /**
   * Small status marks rendered immediately before the title —
   * running, blocked, stale. Each one needs its own accessible name;
   * a bare coloured dot is the same WCAG 1.4.1 failure as the bar.
   */
  marks?: ReactNode
  /**
   * Chips. Under the title when the lane is narrow, right-aligned
   * beside it when there is room. `Badge` is what goes here.
   */
  meta?: ReactNode
  /**
   * The card's name, in **words**.
   *
   * Always a plain string, even when `titleContent` draws something
   * richer, because this is what the move handle and the drag
   * announcements are named after — and a control named after a
   * `ReactNode` is a control with no name at all.
   */
  title: string
  /** The trailing cluster: an assignee avatar, an elapsed-time chip. */
  trailing?: ReactNode
  /**
   * Extra actions in the card's existing menu, after the lane moves.
   * A separator is added when both sets have entries, so a consumer
   * can add a card action without creating a second trigger.
   */
  menuItems?: MenuProps["items"]
}

/**
 * The leading colour bar, in one of two shapes — and the second one
 * exists because the first cannot follow a corner.
 *
 * `accentIntent` is an inset pill: a `w-1` span inside the card,
 * beside the content. It was built for priority — *"Priority is
 * styled as a leading colour bar, and **never** a coloured word
 * before the title."* An intent is a claim the design system makes
 * (`danger` says what happens if you press the thing), so this arm
 * is for a bar that means a STATE.
 *
 * `accentEdge` is the card's own edge — `Card`'s treatment, the same
 * pseudo-element, so it takes `border-radius: inherit` and wraps the
 * corner at `cq-lg` where this card grows one. It carries a
 * CATEGORICAL colour or a computed one, which is what an identity
 * needs: a project, a repo, a source. The owner asked for exactly
 * this on Docket's board — *"The Board has no colors. That could
 * use project colors on the sides at least."* — after reporting the
 * same treatment missing from the task rows.
 *
 * The two are mutually exclusive by type, not by convention. Both
 * paint a leading bar in the same place, and a card wearing two of
 * them is a card whose leading edge means two things.
 *
 * ⚠️ Either arm pairs with `accentLabel`. A bar is colour and
 * nothing else, so on its own it fails WCAG 1.4.1 outright and is
 * invisible to every screen reader; the label rides along in a
 * `VisuallyHidden` so the same fact reaches both channels. Docket's
 * first board painted its bars `--color-danger-9` — a Radix-style
 * scale this token set has never had — so every bar was transparent
 * while every "is it rendered" assertion passed.
 */
type BoardItemAccent =
  | { accentEdge?: never; accentIntent?: IntentName }
  | { accentEdge: CardAccentEdge; accentIntent?: never }

/**
 * Who owns the card title's link — the board, or the caller.
 *
 * A union rather than three loose optionals, because the two halves
 * genuinely cannot coexist. `href` wraps the title in a `TextLink`
 * and `onSelect` wraps it in a `<button>`; a `titleContent` that
 * contains its own anchor would then be an anchor inside an anchor
 * (which the HTML parser silently un-nests, dropping the rest of the
 * card's link) or an anchor inside a button (which is invalid and
 * unreachable by keyboard). Both look completely correct on screen.
 *
 * So the type refuses the combination outright, and a caller who
 * needs a rich title takes the navigation with it:
 *
 * ```tsx
 * {
 *   title: toPlainMarkdownText(task.title),
 *   titleContent: (
 *     <MarkdownLine href={`/tasks/${task.id}`} value={task.title} />
 *   ),
 * }
 * ```
 */
type BoardItemTitleLink =
  | {
      /** Where the title navigates. Routed through `RouterLinkProvider`. */
      href?: string
      /** Fires when there is no `href` — for a board that opens a modal. */
      onSelect?: () => void
      titleContent?: never
    }
  | {
      href?: never
      onSelect?: never
      /**
       * Drawn instead of `title`, inside the card's own clamping box
       * — so it still truncates the way every other card does.
       *
       * It **owns its navigation**: the board adds no link around it,
       * which is why `href` and `onSelect` are refused beside it.
       * `title` is still required, and is still the name every
       * control on the card is announced by.
       */
      titleContent: ReactNode
    }

export type BoardItem = BoardItemAccent &
  BoardItemFields &
  BoardItemTitleLink

export type BoardCardProps = {
  item: BoardItem
  laneLabel: string
  /**
   * Shown on the move handle **while the lanes are side by side**,
   * instead of the word "Move". Below the board's `cq-lg` the word
   * comes back whatever this is — see the handle section below.
   *
   * The library ships no icons, so the default is words — a `⋮`
   * renders as nothing where the font lacks it, which includes the
   * kiosk image and the ePaper build. An app that already owns a
   * glyph set passes one and buys back the ~35px per row that a
   * word costs, which in a 500px lane is several characters of
   * title.
   */
  moveIcon?: ReactNode
  /** The lanes this card can be sent to — never its own. */
  moveTargets: readonly { key: string; label: string }[]
  /** Absent on a read-only board, and then so is the handle. */
  onMoveToLane?: (toLaneKey: string) => void
  onStartDrag?: (pointerEvent: {
    clientX: number
    clientY: number
    currentTarget: EventTarget & Element
    pointerId: number
  }) => void
}

/**
 * One row on the board — and *row* is only what it is at some
 * widths.
 *
 * ### The three shapes are one component, chosen by the lane
 *
 * The requirement this was built against is unusually specific, and
 * it is specific because the owner answered "which row style?" with
 * *"all three, depending"*:
 *
 * | The lane is | The card is |
 * | --- | --- |
 * | narrower than `cq-sm` (24rem) | **two lines** — title clamped to two, metadata underneath, only the trailing slot beside it |
 * | `cq-sm` to `cq-lg` | **one line** — title ellipsised, metadata right-aligned |
 * | `cq-lg` (48rem) and wider | **a card** — its own border, surface and elevation, instead of a divider in a list |
 *
 * Every one of those is a **container** query against the lane's
 * list, never a media query, and the difference is not pedantry: a
 * lane in a three-up board is narrow on a 4K display, and the owner
 * browses zoomed in, so a 1500px window at 175% zoom is ~860
 * effective CSS pixels. Window width is not a proxy for the space
 * this card has. A `@media (max-width: …)` anywhere in this file
 * would be a defect.
 *
 * It also dissolved a bug rather than only satisfying a preference:
 * a *fixed* two-line row collapsed its title to `a…` inside a narrow
 * lane, because the metadata beside it could not shrink. A card
 * sized by its container has no such state to be in.
 *
 * ### The move handle is a button first and a drag handle second
 *
 * One control, two drivers. Pressing it opens a `Menu` of the other
 * lanes — the keyboard and screen-reader path, which also works on
 * touch, and works in the Narrow View where the other lanes are not
 * on screen at all. Dragging from it moves the card directly. Both
 * commit through the same callback, so there is no second code path
 * to keep honest and neither is a fallback for the other.
 *
 * ### What it WEARS depends on whether a drag can succeed
 *
 * The two drivers are not equally available at every width, so the
 * handle does not claim they are:
 *
 * | The board is | The handle shows | Because |
 * | --- | --- | --- |
 * | `cq-lg` and wider — lanes side by side | the app's `moveIcon` | the other lanes are on screen, so a drag has somewhere to land, and a grip glyph teaches that gesture |
 * | narrower — one lane and a segmented control | the word **Move** | there is nothing on screen to drop onto, so the only gesture the glyph teaches is the one that cannot work |
 *
 * That table is a bug report. QueuePilot shipped a `≡` handle in a
 * one-lane board and the owner could not move anybody: *"I can't
 * seem to drag 'n drop the names from Everyone Else anywhere else.
 * There's no right-click or anything. How do I move these?"* The
 * first fix took the glyph away everywhere, which was the wrong
 * half — *"I think the drag handles were fine, but now you have it
 * in a 3-column mode, so dragging would work, but it has this
 * 'move' button instead."*
 *
 * Both are in the DOM and CSS picks; neither is rendered from a
 * measurement. A `ResizeObserver` would get the first paint wrong,
 * and a kiosk Pi shows that. Both are `aria-hidden`, and the
 * handle's whole accessible name comes from the `VisuallyHidden`
 * beside them — so the name is the same sentence at every width,
 * which is what keeps one `getByRole` query working in both
 * layouts.
 *
 * The query is against the **board's** container, named `board`,
 * not the lane's. A lane in a three-up board is narrow and the
 * Narrow View's single lane is wide, so the nearer container
 * answers this question exactly backwards.
 */
export const BoardCard = ({
  item,
  laneLabel,
  moveIcon,
  moveTargets,
  onMoveToLane,
  onStartDrag,
}: BoardCardProps): ReactNode => {
  const [isMenuVisible, setIsMenuVisible] = useState(false)

  const isMovable =
    onMoveToLane != null && moveTargets.length > 0
  const hasMenuItems = (item.menuItems?.length ?? 0) > 0
  const hasMenu =
    onMoveToLane != null && (isMovable || hasMenuItems)
  const menuItems: MenuProps["items"] = [
    ...(isMovable
      ? moveTargets.map((target) => ({
          key: target.key,
          label: target.label,
          onSelect: () => {
            onMoveToLane?.(target.key)
          },
        }))
      : []),
    ...(hasMenuItems && isMovable
      ? [
          {
            key: "board-extra-actions",
            type: "separator" as const,
          },
        ]
      : []),
    ...(item.menuItems ?? []),
  ]

  const menuLabel = isMovable ? "Move" : "More"

  const titleBlock = (
    // `line-clamp-none` before `truncate`, because `line-clamp-2`
    // sets `display: -webkit-box` and `text-overflow` has nothing to
    // ellipsise inside one.
    //
    // A `titleContent` is clamped by the same box as a plain one —
    // it replaces the card's *words*, not the card's shape.
    <span className="line-clamp-2 cq-sm:line-clamp-none cq-sm:block cq-sm:truncate">
      {item.titleContent ?? item.title}
    </span>
  )

  return (
    <li
      className={toClassName(
        "group relative flex gap-2 border-border-subtle border-b py-2 pe-1 last:border-b-0",
        // At `cq-lg` the list stops being a list of rows: the
        // divider goes and each card grows its own box. The *list*
        // cannot do this to itself — it is the container, and a
        // container query never matches its own container.
        "cq-lg:mb-2 cq-lg:rounded-lg cq-lg:border cq-lg:bg-surface-raised cq-lg:p-3 cq-lg:shadow-low",
        // The edge is drawn on THIS box, which is why it needs no
        // shape of its own: the box is a row below `cq-lg` and a
        // rounded card above it, and `border-radius: inherit` gives
        // the right answer at both — a straight stripe down a row
        // that has no corner, and a bar that wraps the card's
        // corner once it grows one.
        //
        // `ps-2` is what keeps the content off it. The bar is 3px
        // and overlays rather than displaces, so without this the
        // first mark sits on top of it; at `cq-lg` the card's own
        // `p-3` is already wider than the bar.
        item.accentEdge != null &&
          toClassName(
            "ps-2",
            getAccentEdgeClassName(item.accentEdge),
          ),
        item.isDimmed && "opacity-60",
      )}
      data-board-card={item.key}
      {...(item.accentEdge == null
        ? {}
        : { style: getAccentEdgeStyle(item.accentEdge) })}
    >
      {/* The label the bar cannot say. An edge has no content of
          its own — it is a pseudo-element — so unlike the pill
          arm below there is nowhere inside it to put the words. */}
      {item.accentEdge != null && item.accentLabel ? (
        <VisuallyHidden>{item.accentLabel}</VisuallyHidden>
      ) : null}

      {item.accentIntent ? (
        <span
          className={toClassName(
            "w-1 shrink-0 self-stretch rounded-full",
            INTENT_SOLID_FILL_CLASS[item.accentIntent],
          )}
        >
          {item.accentLabel ? (
            <VisuallyHidden>
              {item.accentLabel}
            </VisuallyHidden>
          ) : null}
        </span>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1 cq-sm:flex-row cq-sm:items-center cq-sm:gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-1.5 text-sm leading-snug">
              {item.marks ? (
                <span className="flex shrink-0 items-center gap-1 pt-1">
                  {item.marks}
                </span>
              ) : null}

              {item.href ? (
                <TextLink
                  appearance="standalone"
                  className="min-w-0 max-w-full font-normal"
                  href={item.href}
                  intent="neutral"
                >
                  {titleBlock}
                </TextLink>
              ) : item.onSelect ? (
                <button
                  className={toClassName(
                    "min-w-0 max-w-full cursor-pointer rounded-xs text-start text-intent-neutral-content hover:underline",
                    FOCUS_RING_CLASS,
                  )}
                  onClick={item.onSelect}
                  type="button"
                >
                  {titleBlock}
                </button>
              ) : (
                titleBlock
              )}
            </div>

            {item.meta ? (
              <div className="flex min-w-0 flex-wrap items-center gap-1 cq-sm:shrink-0 cq-sm:flex-nowrap cq-sm:justify-end">
                {item.meta}
              </div>
            ) : null}
          </div>

          {item.trailing || hasMenu ? (
            <div className="flex shrink-0 items-center gap-1">
              {item.trailing}

              {hasMenu ? (
                <Menu
                  isVisible={isMenuVisible}
                  items={menuItems}
                  onDismiss={() => {
                    setIsMenuVisible(false)
                  }}
                  placement="bottom-end"
                  trigger={
                    <Button
                      appearance="ghost"
                      intent="neutral"
                      className={toClassName(
                        // `touch-none` so a touch drag is a drag
                        // rather than a page scroll. Only the handle
                        // needs it; the rest of the gesture is
                        // covered by `preventDefault` on the
                        // captured `pointermove`.
                        "touch-none opacity-70 group-hover:opacity-100",
                        // `sizing` is a prop and cannot be two
                        // things at once, so the button stays
                        // `control`-sized — which is what the word
                        // needs — and takes `icon` sizing back at
                        // the width where the glyph is what is
                        // showing. These are the two utilities
                        // `ICON_CONTROL_SIZE_CLASS.sm` is, minus the
                        // height `CONTROL_SIZE_CLASS.sm` already
                        // set. Deterministic rather than a
                        // specificity coin-flip: Tailwind orders a
                        // variant after the utility it varies, which
                        // is the same thing the lane's own
                        // `cq-lg:p-0` relies on.
                        moveIcon != null &&
                          "@min-[48rem]/board:w-(--control-height-sm) @min-[48rem]/board:px-0",
                      )}
                      onClick={() => {
                        setIsMenuVisible(
                          (isVisible) => !isVisible,
                        )
                      }}
                      onPointerDown={
                        isMovable
                          ? (pointerEvent) => {
                              onStartDrag?.(pointerEvent)
                            }
                          : undefined
                      }
                      size="sm"
                      sizing="control"
                    >
                      {moveIcon == null ? null : (
                        // `hidden` first, so a browser with no
                        // container-query support — and every test
                        // renderer that does not lay out — keeps the
                        // word, which is the affordance that works
                        // everywhere.
                        //
                        // `contents` rather than `inline`: the glyph
                        // stays a direct flex child of the button,
                        // so it centres the way it did when it was
                        // the button's only content.
                        <span
                          aria-hidden="true"
                          className="hidden @min-[48rem]/board:contents"
                        >
                          {moveIcon}
                        </span>
                      )}

                      <span
                        aria-hidden="true"
                        className={toClassName(
                          moveIcon != null &&
                            "@min-[48rem]/board:hidden",
                        )}
                      >
                        {menuLabel}
                      </span>

                      {/*
                       * Thirty controls all named "Move" is thirty
                       * indistinguishable buttons to a screen reader
                       * and to `getByRole("button", { name })`, so
                       * the accessible name says *which* card and
                       * where it currently is.
                       *
                       * The whole name lives here, and both visible
                       * affordances are `aria-hidden`, because which
                       * of them is painted is a CSS answer that the
                       * accessible name must not depend on — a
                       * handle called "Move X" wide and "Move Move
                       * X" narrow is one control with two names.
                       */}
                      <VisuallyHidden>
                        {isMovable
                          ? `Move ${item.title}, currently in ${laneLabel}`
                          : `More actions for ${item.title}, currently in ${laneLabel}`}
                      </VisuallyHidden>
                    </Button>
                  }
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {item.footer ? (
          <div className="min-w-0 text-content-secondary text-xs">
            {item.footer}
          </div>
        ) : null}
      </div>
    </li>
  )
}
