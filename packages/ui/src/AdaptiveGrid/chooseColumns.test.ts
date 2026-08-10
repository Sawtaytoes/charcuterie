import { expect, test } from "vitest"

import { containerQuery } from "../tokens.ts"
import {
  chooseColumns,
  DEFAULT_MIN_COLUMN_INLINE_SIZE_PX,
  getColumnChoices,
  getContentMaxInlineSize,
} from "./chooseColumns.ts"

/**
 * The heuristic, written down at eleven sizes.
 *
 * **This table is the spec**, ported from the app the rule came out
 * of. The one instruction attached to this feature is "do not
 * hand-tune breakpoints against one screenshot", and a table of
 * sizes with the answers beside them is the only form in which that
 * instruction can be checked — a browser sweep proves what happens
 * at the four sizes somebody thought to open, and this proves the
 * shape of the rule between them.
 *
 * Node, not the browser: there is nothing to render. The DOM half —
 * measuring a container, resizing it, remembering a choice — is
 * `AdaptiveGrid.test.tsx`.
 */

/** The rack the rule was tuned against. */
const NINE_ITEMS = 9

/** rip-deck's header, host row, drive rail, and bucket labels. */
const CHROME_BLOCK_SIZE = 260

/** A bay card, measured off a running page. */
const ITEM_BLOCK_SIZE = 150

const columnsAt = ({
  blockSize,
  inlineSize,
  itemCount = NINE_ITEMS,
  minColumnInlineSize,
}: {
  blockSize: number
  inlineSize: number
  itemCount?: number
  minColumnInlineSize?: number
}): number =>
  chooseColumns({
    availableBlockSize: blockSize,
    availableInlineSize: inlineSize,
    chromeBlockSize: CHROME_BLOCK_SIZE,
    itemBlockSize: ITEM_BLOCK_SIZE,
    itemCount,
    minColumnInlineSize,
  })

test("the column floor is Charcuterie's own cq-sm step", () => {
  // The threshold reconciliation, asserted rather than described.
  // A bare `380` in this file would drift the moment somebody
  // touched the scale; deriving it from `containerQuery.sm` means
  // the grid's floor and the library's container-query steps move
  // together or not at all.
  expect(DEFAULT_MIN_COLUMN_INLINE_SIZE_PX).toBe(
    Number.parseFloat(containerQuery.sm) * 16,
  )

  // And it stays a step BELOW the size at which this library's
  // container-query components change shape. The denser card that
  // appears under `cq-md` is a real density, not a failure, so a
  // column narrower than it is still a column worth having.
  expect(DEFAULT_MIN_COLUMN_INLINE_SIZE_PX).toBeLessThan(
    Number.parseFloat(containerQuery.md) * 16,
  )
})

test("moving the floor from the measured 380 to cq-sm changes no answer", () => {
  // The empirical half of that decision. The source app's floor was
  // hand-measured at 380px; `cq-sm` is 384. Every row of the table
  // below gives the same answer at either number, which is what
  // makes swapping a magic number for a token a rename rather than
  // a behaviour change.
  for (const size of [
    { blockSize: 1440, inlineSize: 3440 },
    { blockSize: 700, inlineSize: 3440 },
    { blockSize: 400, inlineSize: 5120 },
    { blockSize: 844, inlineSize: 390 },
    { blockSize: 390, inlineSize: 844 },
    { blockSize: 1180, inlineSize: 820 },
    { blockSize: 800, inlineSize: 1280 },
    { blockSize: 900, inlineSize: 1440 },
    { blockSize: 1080, inlineSize: 1920 },
    { blockSize: 600, inlineSize: 1920 },
    { blockSize: 1440, inlineSize: 2560 },
  ]) {
    expect(
      columnsAt({ ...size, minColumnInlineSize: 380 }),
    ).toBe(columnsAt(size))
  }
})

test("it stays narrow on an ultrawide that is also tall", () => {
  // The sentence the whole feature exists for:
  //
  // > "That way, you don't get 9-wide just because you're on an
  // > ultrawide even if you have more height available."
  expect(
    columnsAt({ blockSize: 1440, inlineSize: 3440 }),
  ).toBe(2)
})

test("it goes as wide as it may when the height runs out", () => {
  // The same monitor, a short window. Nine items cannot stack in
  // 700px, so inline size is all that is left.
  expect(
    columnsAt({ blockSize: 700, inlineSize: 3440 }),
  ).toBe(3)
})

test("it never reaches the 9-wide the owner called weird", () => {
  // Every item, no height at all, and a monitor wide enough to hold
  // nine of them side by side.
  expect(
    columnsAt({ blockSize: 400, inlineSize: 5120 }),
  ).toBeLessThanOrEqual(3)
})

test("one item gets one column however big the window", () => {
  expect(
    columnsAt({
      blockSize: 400,
      inlineSize: 3440,
      itemCount: 1,
    }),
  ).toBe(1)
})

test("a phone stays at one column", () => {
  // One column is the owner's own answer, and it falls out of the
  // inline-size cap rather than out of a device check.
  expect(columnsAt({ blockSize: 844, inlineSize: 390 })).toBe(
    1,
  )
})

test("a phone held sideways takes two", () => {
  // Short AND narrow: the height rule wants more columns and cannot
  // have them.
  expect(columnsAt({ blockSize: 390, inlineSize: 844 })).toBe(
    2,
  )
})

test("a tablet takes two", () => {
  expect(
    columnsAt({ blockSize: 1180, inlineSize: 820 }),
  ).toBe(2)
})

/**
 * Note 1440x900 taking THREE columns while the larger 1920x1080
 * takes two. That reads backwards and it is the rule working: the
 * taller window stacks nine items in fewer stacks, so it needs
 * fewer. Inline size is only ever the cap.
 */
test.each([
  { blockSize: 800, expected: 3, inlineSize: 1280 },
  { blockSize: 900, expected: 3, inlineSize: 1440 },
  { blockSize: 1080, expected: 2, inlineSize: 1920 },
  { blockSize: 600, expected: 3, inlineSize: 1920 },
  { blockSize: 1440, expected: 2, inlineSize: 2560 },
])(
  "$inlineSize x $blockSize renders $expected columns",
  ({ blockSize, expected, inlineSize }) => {
    expect(columnsAt({ blockSize, inlineSize })).toBe(
      expected,
    )
  },
)

test("the cap is a default, not a constant", () => {
  // The taste half. An app of squarer items raises it and gets the
  // fourth column the source app deliberately refused.
  expect(
    chooseColumns({
      availableBlockSize: 400,
      availableInlineSize: 5120,
      chromeBlockSize: CHROME_BLOCK_SIZE,
      itemBlockSize: ITEM_BLOCK_SIZE,
      itemCount: NINE_ITEMS,
      maxColumns: 6,
    }),
  ).toBe(6)
})

test("chrome is a parameter, and it costs columns", () => {
  // rip-deck's 260px of header and rails was a module-private
  // constant. An app with no chrome stacks more items in the same
  // window, so it needs fewer stacks.
  const withChrome = chooseColumns({
    availableBlockSize: 900,
    availableInlineSize: 1440,
    chromeBlockSize: 260,
    itemBlockSize: ITEM_BLOCK_SIZE,
    itemCount: NINE_ITEMS,
  })

  const withoutChrome = chooseColumns({
    availableBlockSize: 900,
    availableInlineSize: 1440,
    itemBlockSize: ITEM_BLOCK_SIZE,
    itemCount: NINE_ITEMS,
  })

  expect(withChrome).toBe(3)

  expect(withoutChrome).toBe(2)
})

test("the content cap does not stretch one column across a monitor", () => {
  expect(getContentMaxInlineSize({ columns: 1 })).toBe(
    "56rem",
  )
})

test("the content cap widens as columns are added", () => {
  // "…the wrapping grids are all full-width only when you have too
  // many items."
  expect(
    [1, 2, 3, 4].map((columns) =>
      Number.parseFloat(
        getContentMaxInlineSize({ columns }),
      ),
    ),
  ).toEqual([56, 72, 106, 140])
})

test("the content cap's parts are overridable", () => {
  expect(
    getContentMaxInlineSize({
      columnInlineSize: "20rem",
      columns: 2,
      gutterInlineSize: "2rem",
    }),
  ).toBe("42rem")
})

test("a picker never offers a count the cap will refuse", () => {
  expect(getColumnChoices({ maxColumns: 3 })).toEqual([
    "auto",
    1,
    2,
    3,
  ])
})
