export type LayoutSection = {
  priority: number
  /** Optional content survives in this order, separately from focus priority. */
  visibilityPriority?: number
  /** Only sections with a visibilityPriority may be hidden by a candidate. */
  isHidden?: boolean
  width: number
  height: number
  minimumWidth?: number
  minimumHeight?: number
  /** Contain the media inside its allocated rectangle when scoring. */
  aspectRatio?: number
  /** Stop buying space once this useful area is reached. */
  idealArea?: number
}

export type LayoutCandidate = {
  id: string
  sections: readonly LayoutSection[]
}

const sectionArea = (section: LayoutSection) => {
  if (
    section.isHidden &&
    section.visibilityPriority !== undefined
  )
    return 0
  const width = Math.max(0, section.width)
  const height = Math.max(0, section.height)
  const containedWidth = section.aspectRatio
    ? Math.min(width, height * section.aspectRatio)
    : width
  const containedHeight = section.aspectRatio
    ? containedWidth / section.aspectRatio
    : height
  return Math.min(
    containedWidth * containedHeight,
    section.idealArea ?? Number.POSITIVE_INFINITY,
  )
}

const overflow = (candidate: LayoutCandidate) =>
  candidate.sections.reduce(
    (total, section) =>
      total +
      (section.isHidden &&
      section.visibilityPriority !== undefined
        ? 0
        : Math.max(
            0,
            (section.minimumWidth ?? 0) - section.width,
          ) +
          Math.max(
            0,
            (section.minimumHeight ?? 0) - section.height,
          )),
    0,
  )

/**
 * Choose a measured layout without assuming a viewport breakpoint. First keep
 * every visible section above its minimum; then retain optional content in
 * descending visibility priority, then maximize useful area in
 * descending priority order. Equal scores retain the caller's candidate order.
 * Media is scored by its contained image, never its letterboxed rectangle.
 * Apps supply geometry and priorities; this policy has no DOM or framework.
 */
export const selectPriorityLayout = <
  Candidate extends LayoutCandidate,
>(
  candidates: readonly Candidate[],
): Candidate | undefined => {
  const priorities = [
    ...new Set(
      candidates.flatMap((candidate) =>
        candidate.sections.map(
          (section) => section.priority,
        ),
      ),
    ),
  ].sort((first, second) => second - first)
  const visibilityPriorities = [
    ...new Set(
      candidates.flatMap((candidate) =>
        candidate.sections.flatMap((section) =>
          section.visibilityPriority === undefined
            ? []
            : [section.visibilityPriority],
        ),
      ),
    ),
  ].sort((first, second) => second - first)
  const visibleCount = (
    candidate: Candidate,
    priority: number,
  ) =>
    candidate.sections.filter(
      (section) =>
        section.visibilityPriority === priority &&
        !section.isHidden,
    ).length
  const score = (candidate: Candidate, priority: number) =>
    candidate.sections.reduce(
      (total, section) =>
        total +
        (section.priority === priority
          ? sectionArea(section)
          : 0),
      0,
    )
  return candidates.reduce<Candidate | undefined>(
    (best, candidate) => {
      if (!best) return candidate
      const overflowDifference =
        overflow(candidate) - overflow(best)
      if (Math.abs(overflowDifference) > 0.5) {
        return overflowDifference < 0 ? candidate : best
      }
      const decidingVisibility = visibilityPriorities.find(
        (priority) =>
          visibleCount(candidate, priority) !==
          visibleCount(best, priority),
      )
      if (decidingVisibility !== undefined) {
        return visibleCount(candidate, decidingVisibility) >
          visibleCount(best, decidingVisibility)
          ? candidate
          : best
      }
      const decidingPriority = priorities.find(
        (priority) =>
          Math.abs(
            score(candidate, priority) -
              score(best, priority),
          ) > 0.5,
      )
      return decidingPriority !== undefined &&
        score(candidate, decidingPriority) >
          score(best, decidingPriority)
        ? candidate
        : best
    },
    undefined,
  )
}
