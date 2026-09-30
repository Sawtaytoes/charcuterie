export type ScheduleInterval = {
  key: string
  startMinute: number
  endMinute: number
}

export type PlacedScheduleInterval = ScheduleInterval & {
  column: number
  columnCount: number
}

/** Pack each connected overlap cluster independently; adjacent intervals share first column. */
export const placeScheduleIntervals = (
  items: readonly ScheduleInterval[],
): PlacedScheduleInterval[] => {
  const result: PlacedScheduleInterval[] = []
  let cluster: PlacedScheduleInterval[] = []
  let ends: number[] = []
  let clusterEnd = -1
  const flush = () => {
    result.push(
      ...cluster.map((item) => ({
        ...item,
        columnCount: ends.length,
      })),
    )
    cluster = []
    ends = []
  }
  for (const item of [...items].sort(
    (first, second) =>
      first.startMinute - second.startMinute ||
      second.endMinute - first.endMinute ||
      first.key.localeCompare(second.key),
  )) {
    if (item.startMinute >= clusterEnd) flush()
    const free = ends.findIndex(
      (end) => end <= item.startMinute,
    )
    const column = free < 0 ? ends.length : free
    const endMinute = Math.max(
      item.startMinute + 1,
      item.endMinute,
    )
    ends[column] = endMinute
    clusterEnd = Math.max(...ends)
    cluster.push({
      ...item,
      endMinute,
      column,
      columnCount: 1,
    })
  }
  flush()
  return result
}
