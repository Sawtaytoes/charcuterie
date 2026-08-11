import { expect, test } from "vitest"

import { chooseVisibleCount } from "./chooseVisibleCount.ts"

/**
 * The collapse rule, written down as arithmetic.
 *
 * Node, not the browser: there is nothing to render. The measuring
 * half — a `ResizeObserver`, cached widths, one instance moving
 * between the bar and the panel — is `Toolbar.test.tsx`.
 *
 * Four items of 40px with an 8px gap and a 40px trigger, which is
 * near enough a row of icon buttons at `md` density:
 *
 * | Room | Fits | Why |
 * | --- | --- | --- |
 * | 184 | 4 | 4·40 + 3·8, exactly |
 * | 183 | 3 | one short, so the trigger joins: 3·40 + 3·8 + 40 = 184 → no; 2 fits |
 */
const ITEMS = [40, 40, 40, 40]

const fitsIn = (availableInlineSize: number) =>
  chooseVisibleCount({
    availableInlineSize,
    gapInlineSize: 8,
    itemInlineSizes: ITEMS,
    triggerInlineSize: 40,
  })

test("everything fits, and no trigger is costed", () => {
  // 4·40 + 3·8 = 184, to the pixel.
  expect(fitsIn(184)).toBe(4)
})

test("one pixel short collapses past the trigger's own width", () => {
  // Not 3: three items plus the trigger is 3·40 + 3·8 + 40 = 184,
  // which does not fit in 183 either. Two items plus the trigger is
  // 2·40 + 2·8 + 40 = 136.
  expect(fitsIn(183)).toBe(2)
})

test("the count falls one at a time as the room does", () => {
  expect(fitsIn(136)).toBe(2)
  expect(fitsIn(135)).toBe(1)
  expect(fitsIn(88)).toBe(1)
  expect(fitsIn(87)).toBe(0)
})

test("an unmeasured container keeps everything visible", () => {
  // The safe direction for one frame, and the only way the first
  // measurement can happen at all: an item that never mounted has
  // no width to read.
  expect(fitsIn(0)).toBe(4)
  expect(fitsIn(-1)).toBe(4)
})

test("no items is no items", () => {
  expect(
    chooseVisibleCount({
      availableInlineSize: 500,
      gapInlineSize: 8,
      itemInlineSizes: [],
      triggerInlineSize: 40,
    }),
  ).toBe(0)
})

test("a trigger that has never been measured costs nothing", () => {
  // The first collapse is decided before any trigger exists, so its
  // width is zero and the answer is at worst one item too many —
  // corrected on the next pass, once the trigger is in the row.
  expect(
    chooseVisibleCount({
      availableInlineSize: 140,
      gapInlineSize: 8,
      itemInlineSizes: ITEMS,
      triggerInlineSize: 0,
    }),
  ).toBe(3)
})

test("priority is the array order — the end collapses first", () => {
  // A wide first item survives; the narrow ones after it go.
  expect(
    chooseVisibleCount({
      availableInlineSize: 160,
      gapInlineSize: 8,
      itemInlineSizes: [100, 40, 40, 40],
      triggerInlineSize: 40,
    }),
  ).toBe(1)
})
