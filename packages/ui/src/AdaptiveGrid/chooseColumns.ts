import {
  containerQuery,
  contentInlineSize,
} from "../tokens.ts"

/**
 * How many columns a wrapping grid should draw, and how wide the
 * page around it may get.
 *
 * The arithmetic, lifted out of rip-deck's `useLayoutColumns` and
 * made generic. It stays a pure fold — no `window`, no ref, no
 * React — because a heuristic nobody can unit-test at nine sizes is
 * a heuristic hand-tuned against one screenshot, and the table in
 * `chooseColumns.test.ts` is the only form in which the rule can be
 * checked at all.
 *
 * ## Height is spent first
 *
 * The owner's ask, which is the whole design:
 *
 * > "All these apps seem to be really narrow with a very large
 * > max-width — 1 column, but waaaaaaay too wide. What I really
 * > want is something like Rip-Deck where the app has a narrower
 * > main column but the wrapping grids are all full-width only when
 * > you have too many items. […] The idea is that, if you're going
 * > to vertically scroll, it's best to widen the displayed items.
 * > If not, then keep them in a smaller grid, so they all still fit
 * > on screen. Ideally, we wouldn't require users to scroll."
 *
 * And the sentence it replaced, from the app this came out of:
 *
 * > "Like if you have enough height, try to fill it. If you don't,
 * > then abuse as much width side-by-side as possible. That way,
 * > you don't get 9-wide just because you're on an ultrawide even
 * > if you have more height available."
 *
 * Stated plainly: **a column is something the layout is FORCED
 * into** when the items will not stack inside the space available —
 * never something it takes merely because a monitor is wide. That
 * inversion is why `availableInlineSize` only ever *caps* the
 * answer here rather than producing it, and it is the opposite of
 * every `auto-fill, minmax()` grid in the fleet, which takes every
 * column the width allows and lands on seven items across an
 * ultrawide.
 *
 * The visible consequence is deliberately non-monotonic: 1440x900
 * takes three columns while the *larger* 1920x1080 takes two. That
 * reads backwards and is the rule working — the taller window
 * stacks the same items in fewer stacks, so it needs fewer.
 */

/**
 * The most columns the automatic answer will ever choose.
 *
 * > "It would look weird to do 9 side-by-side."
 *
 * Three is the number the owner said he could "easily fit". A
 * caller with squarer content raises it; a caller with wide content
 * lowers it. It is taste about one app's content, which is exactly
 * why it is a default rather than a constant.
 */
export const DEFAULT_MAX_AUTO_COLUMNS = 3

/**
 * The widest a manual picker offers, one above the automatic cap —
 * because a cap is a default and not a ceiling on what a person is
 * allowed to ask for.
 */
export const DEFAULT_MAX_MANUAL_COLUMNS = 4

/**
 * The narrowest a column may be, in CSS px, before the grid stops
 * adding them. `24rem` at a 16px root — `containerQuery.sm`.
 *
 * ## Which threshold system this is, and which it is not
 *
 * Two live in the fleet today and they answer different questions,
 * so this reconciles them by *keeping them apart*:
 *
 *  - A `cq-*` step is read **by the item, inside the track**: "how
 *    should this card lay itself out at the width it was handed."
 *    Charcuterie's are `--cq-xs` … `--cq-xl`, deliberately not
 *    Tailwind's `--container-*` (see
 *    `docs/decisions/2026-07-29-container-query-scale-is-cq-not-container.md`).
 *  - This number is read **by the grid, outside the item**: "is
 *    another track worth having at all."
 *
 * Nothing forces them to agree, and the source app's did not: its
 * cards restyle at Tailwind's own `28rem` container variant while
 * its grid floor sat at a hand-measured `380px`. It set the floor
 * *below* the restyle threshold on purpose, because the denser card
 * that appears under it is a real density rather than a failure.
 *
 * That relationship is what survives here, expressed in
 * Charcuterie's own scale instead of a magic number: the floor
 * defaults to `cq-sm` (24rem = 384px), which is within 4px of the
 * measured 380 — every row of the ported spec table gives the same
 * answer at either value — and stays a step below `cq-md` (32rem),
 * where the library's own container-query components change shape.
 *
 * The link is asserted in `chooseColumns.test.ts` so it cannot
 * drift back into a bare number.
 */
export const DEFAULT_MIN_COLUMN_INLINE_SIZE_PX =
  Number.parseFloat(containerQuery.sm) * 16

/**
 * `"auto"`, or the number of columns a person explicitly asked for.
 */
export type ColumnChoice = "auto" | number

/**
 * The column count the automatic rule wants, for one measured space
 * and one set of items.
 */
export const chooseColumns = ({
  availableBlockSize,
  availableInlineSize,
  chromeBlockSize = 0,
  itemBlockSize,
  itemCount,
  maxColumns = DEFAULT_MAX_AUTO_COLUMNS,
  minColumnInlineSize = DEFAULT_MIN_COLUMN_INLINE_SIZE_PX,
}: {
  /**
   * The block size the layout has to spend, in CSS px — the
   * viewport's, not the grid's.
   *
   * It has to come from the viewport, because the question being
   * asked is "will this scroll", and an element's own block size
   * cannot answer it: a grid in normal flow is exactly as tall as
   * its contents, so measuring it always says "it fits."
   */
  availableBlockSize: number
  /**
   * The inline size the grid has to spend, in CSS px — the
   * container's, not the viewport's.
   *
   * The container is the honest source here: a grid sitting beside
   * a rail has less room than the window suggests, and this library
   * is built around the case where "the component's container is
   * what changed, not the window."
   *
   * It must be measured on an element that is **not itself capped
   * by the answer**, or the fold feeds on its own output and can
   * never widen. `AdaptiveGrid` guarantees that structurally.
   */
  availableInlineSize: number
  /**
   * Everything down the page that is not this grid, in CSS px —
   * headers, rails, filter rows, labels. Subtracted from
   * `availableBlockSize` before asking how many items stack.
   */
  chromeBlockSize?: number
  /**
   * One item's block size, in CSS px. **The one genuinely
   * app-specific number**, and the only required one.
   *
   * Measure it off a running page rather than deriving it, and err
   * high: over-estimating means the grid reaches for a column
   * slightly early, and a page that scrolls when it did not have to
   * is the complaint this exists to answer. It only has to be right
   * to within about an item — being one out shifts a borderline
   * size by one column, which is taste.
   */
  itemBlockSize: number
  /**
   * How many items the grid is being asked to fit.
   *
   * The stable count rather than the rendered one where those
   * differ: a column count that reflowed every time one item
   * finished loading would be worse than one that is an item out.
   */
  itemCount: number
  /** @see DEFAULT_MAX_AUTO_COLUMNS */
  maxColumns?: number
  /** @see DEFAULT_MIN_COLUMN_INLINE_SIZE_PX */
  minColumnInlineSize?: number
}): number => {
  // Inline size is a CAP, never a reason. This is the "don't go
  // 9-wide just because you're on an ultrawide" half of the rule.
  const inlineSizeCap = Math.max(
    1,
    Math.min(
      maxColumns,
      Math.floor(availableInlineSize / minColumnInlineSize),
    ),
  )

  if (itemCount <= 1) {
    return 1
  }

  // Block size is the reason. How many items stack in the space,
  // then how many stacks that many items need.
  const rowsThatFit = Math.max(
    1,
    Math.floor(
      (availableBlockSize - chromeBlockSize) /
        itemBlockSize,
    ),
  )

  const columnsNeeded = Math.ceil(itemCount / rowsThatFit)

  return Math.max(1, Math.min(inlineSizeCap, columnsNeeded))
}

/**
 * How wide the content around the grid may grow, as a CSS length.
 *
 * The other half of the ask — "the app has a narrower main column
 * but the wrapping grids are all full-width only when you have too
 * many items." One column stays at a reading measure, because a
 * 2000px-wide card is not a better card, it is one line of text the
 * eye has to track across a monitor. Past that the cap **grows with
 * the columns**, so three columns get room to be three readable
 * things rather than three slivers.
 *
 * ### Why the numbers live in `@charcuterie/tokens`
 *
 * They are `contentInlineSize`, not constants in this file. A
 * readable measure is a structural fact about the fleet in exactly
 * the sense `screen` and `containerQuery` are — a variant may
 * change how a card *looks*, not how far the eye tracks — so it
 * belongs in the one package a Satori renderer or a plain-CSS
 * consumer can read without a React tree. The *arithmetic* is not a
 * token, and stays here.
 *
 * The three parts are still overridable per call, because an app of
 * dense tables and an app of prose disagree about a measure and
 * neither is wrong.
 */
export const getContentMaxInlineSize = ({
  columnInlineSize = contentInlineSize.column,
  columns,
  gutterInlineSize = contentInlineSize.gutter,
  singleInlineSize = contentInlineSize.single,
}: {
  /** What one column is worth, once there are several. */
  columnInlineSize?: string
  columns: number
  /** Slack added on top of a multi-column cap, for the gaps. */
  gutterInlineSize?: string
  /** The cap when there is only one column. */
  singleInlineSize?: string
}): string =>
  columns <= 1
    ? singleInlineSize
    : `${Number.parseFloat(columnInlineSize) * columns + Number.parseFloat(gutterInlineSize)}rem`

/**
 * The choices a manual picker offers: `"auto"`, then every count up
 * to `maxColumns`.
 *
 * A function rather than a constant so the picker and the cap
 * cannot disagree — an app that lowers its cap gets a shorter list
 * for free, instead of offering a count it will then refuse.
 */
export const getColumnChoices = ({
  maxColumns = DEFAULT_MAX_MANUAL_COLUMNS,
}: {
  maxColumns?: number
}): ColumnChoice[] => [
  "auto",
  ...Array.from(
    { length: Math.max(1, maxColumns) },
    (_, index) => index + 1,
  ),
]
