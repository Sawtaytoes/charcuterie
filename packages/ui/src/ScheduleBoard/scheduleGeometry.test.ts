import { expect, test } from "vitest"
import { placeScheduleIntervals } from "./scheduleGeometry.ts"

test("a chained overlap cluster shares its maximum width, then resets", () => {
  const placed = placeScheduleIntervals([
    { key: "a", startMinute: 540, endMinute: 660 },
    { key: "b", startMinute: 600, endMinute: 720 },
    { key: "c", startMinute: 660, endMinute: 780 },
    { key: "d", startMinute: 780, endMinute: 840 },
  ])
  expect(
    placed.map(({ key, column, columnCount }) => [
      key,
      column,
      columnCount,
    ]),
  ).toEqual([
    ["a", 0, 2],
    ["b", 1, 2],
    ["c", 0, 2],
    ["d", 0, 1],
  ])
})
