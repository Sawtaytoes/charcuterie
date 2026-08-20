/**
 * Everything about a board move that is arithmetic rather than
 * React — so it can be tested in Node, exhaustively, without a
 * browser and without a pointer.
 *
 * That split is not tidiness. The pointer path is the one part of
 * this component a test cannot drive convincingly: `userEvent` can
 * dispatch `pointermove`, but it cannot lay anything out, so every
 * rectangle it would reason about is `0x0` in a test environment
 * that has not painted. Pulling the geometry out means the *rule* —
 * which lane, which index, what happens on a tie — is red/green in
 * Node, and the browser test is left proving only the wiring.
 */

/**
 * A lane as the drop calculation sees it: a box, a key, and the
 * boxes of the cards inside it.
 *
 * Deliberately plain data rather than elements. `chooseDropTarget`
 * never touches the DOM, which is why it can be called with
 * fixtures.
 */
export type BoardDropLane = {
  cardRects: readonly BoardRect[]
  key: string
  rect: BoardRect
}

export type BoardPoint = {
  x: number
  y: number
}

/**
 * The subset of `DOMRect` this needs. Named rather than reusing
 * `DOMRect`, because `DOMRect` is a browser global and this module
 * is imported by the Node test project.
 */
export type BoardRect = {
  height: number
  left: number
  top: number
  width: number
}

export type BoardDropTarget = {
  index: number
  laneKey: string
}

/**
 * `left`/`top` rather than `insetInlineStart`, and that is not a
 * violation of the logical-properties rule.
 *
 * The rule is scoped to `className` literals, because a Tailwind
 * utility is a *style* and a style has a writing direction.
 * `getBoundingClientRect()` returns physical pixels in the
 * viewport's own coordinate space; there is no logical version of it
 * to prefer, and inventing one here would mean re-deriving a number
 * the browser already gave us. The lint rule carves this out
 * explicitly.
 */
const getIsPointInside = (
  rect: BoardRect,
  point: BoardPoint,
): boolean =>
  point.x >= rect.left &&
  point.x <= rect.left + rect.width &&
  point.y >= rect.top &&
  point.y <= rect.top + rect.height

/**
 * How far a point is from a rectangle, zero when it is inside.
 *
 * Used only as a fallback, and the fallback is the reason a drag
 * feels finished rather than cancelled: a pointer released two
 * pixels past a lane's edge is a drop *on that lane* as far as the
 * person doing it is concerned, and returning `null` there is how a
 * board earns "it just puts the card back sometimes".
 */
const getDistanceToRect = (
  rect: BoardRect,
  point: BoardPoint,
): number => {
  const dx = Math.max(
    rect.left - point.x,
    0,
    point.x - (rect.left + rect.width),
  )

  const dy = Math.max(
    rect.top - point.y,
    0,
    point.y - (rect.top + rect.height),
  )

  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Where in a lane a point lands: the number of cards whose midpoint
 * is above it.
 *
 * Midpoints rather than edges, so the insertion flips when the
 * pointer passes the *centre* of a card. Against edges, the top
 * half of every card is a dead zone that means "same place you
 * already were", and the indicator stutters.
 */
export const chooseDropIndex = (
  cardRects: readonly BoardRect[],
  point: BoardPoint,
): number =>
  cardRects.filter(
    (rect) => point.y > rect.top + rect.height / 2,
  ).length

/**
 * The lane and index a pointer is currently over.
 *
 * Hit test first, nearest-lane second, and `null` only when there
 * are no lanes at all — a drag that started has to end somewhere.
 */
export const chooseDropTarget = (
  lanes: readonly BoardDropLane[],
  point: BoardPoint,
): BoardDropTarget | null => {
  if (lanes.length === 0) {
    return null
  }

  const hitLane = lanes.find((lane) =>
    getIsPointInside(lane.rect, point),
  )

  const lane =
    hitLane ??
    lanes.reduce((nearest, candidate) =>
      getDistanceToRect(candidate.rect, point) <
      getDistanceToRect(nearest.rect, point)
        ? candidate
        : nearest,
    )

  return {
    index: chooseDropIndex(lane.cardRects, point),
    laneKey: lane.key,
  }
}

/**
 * Whether a move would actually change anything.
 *
 * The subtle half is `toIndex`. Taking a card out of its own lane
 * shifts every card below it up by one, so "drop it back where it
 * was" arrives as both `fromIndex` and `fromIndex + 1` depending on
 * which side of its own midpoint the pointer ended on. Both are
 * no-ops, and a board that fires `onMove` for them makes a consumer
 * re-render — and, if the consumer is optimistic, flash — for a
 * drag that went nowhere.
 */
export const getIsMoveMeaningful = ({
  fromIndex,
  fromLaneKey,
  toIndex,
  toLaneKey,
}: {
  fromIndex: number
  fromLaneKey: string
  toIndex: number
  toLaneKey: string
}): boolean =>
  fromLaneKey !== toLaneKey ||
  (toIndex !== fromIndex && toIndex !== fromIndex + 1)

/**
 * Where a card ends up once it has been removed from its old
 * position.
 *
 * A within-lane move is quoted against the list *including* the
 * card being moved — that is what the pointer was over — but a
 * consumer splicing an array removes it first, so every index below
 * the origin is one too high. Folding that here means the consumer's
 * handler is `splice(from, 1)` then `splice(to, 0, item)` with no
 * arithmetic of its own, which is the version nobody gets wrong.
 */
export const toSettledIndex = ({
  fromIndex,
  fromLaneKey,
  toIndex,
  toLaneKey,
}: {
  fromIndex: number
  fromLaneKey: string
  toIndex: number
  toLaneKey: string
}): number =>
  fromLaneKey === toLaneKey && toIndex > fromIndex
    ? toIndex - 1
    : toIndex

/**
 * What the live region says after a move.
 *
 * A sentence rather than a status word, and it names the
 * **destination position** as well as the lane, because "moved to In
 * Progress" leaves a screen-reader user with no idea whether the
 * card went to the top of the lane or the bottom of thirty. That is
 * the single piece of feedback a sighted user gets for free from
 * watching the card land, and it is the one every drag-and-drop
 * implementation forgets to say out loud.
 *
 * One-based, because it is read to a person.
 */
export const describeMove = ({
  index,
  laneLabel,
  laneSize,
  title,
}: {
  index: number
  laneLabel: string
  laneSize: number
  title: string
}): string =>
  `Moved ${title} to ${laneLabel}, position ${index + 1} of ${laneSize}.`
