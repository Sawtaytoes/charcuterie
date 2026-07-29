import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { toClassName } from "../toClassName.ts"

export type SkeletonShape = "block" | "circle" | "text"

export type SkeletonProps = Omit<
  ComponentPropsWithRef<"div">,
  "children"
> & {
  blockSize?: string
  inlineSize?: string
  /**
   * Text skeletons render this many bars, the last one short —
   * because a paragraph placeholder whose every line is full width
   * reads as a table, not as prose.
   */
  lineCount?: number
  shape?: SkeletonShape
}

const SHAPE_CLASS: Record<SkeletonShape, string> = {
  block: "rounded-md",
  circle: "rounded-full",
  text: "rounded-sm",
}

/**
 * The bars of a multi-line text skeleton, described rather than
 * indexed.
 *
 * The last line is **60%**, fixed. Not random: a placeholder that
 * differs between two renders of the same list makes every
 * screenshot diff useless, and visual regression over P0 x scheme x
 * density is a planned addition once tokens stop moving.
 */
const buildLines = (lineCount: number) =>
  Array.from({ length: lineCount }, (_, index) => ({
    id: `charcuterie-skeleton-line-${index + 1}`,
    inlineSize: index === lineCount - 1 ? "60%" : undefined,
  }))

/**
 * **Also zero of these fleet-wide.** The counterpart to `Spinner`
 * and the better answer wherever the shape of the incoming content
 * is already known: a poster grid that skeletons does not reflow
 * when the images land, and layout shift is the thing users
 * actually notice.
 *
 * `aria-hidden` is not an optimisation, it is the contract. A
 * skeleton is decoration standing in for content that does not
 * exist yet; announcing it means a screen reader reading three
 * empty bars. **The load has to be announced by the region that
 * owns it** — a `Spinner`, or an `aria-busy` on the container — and
 * a skeleton that AT can see is a bug, which is why the story
 * asserts it cannot be found by role.
 */
export const Skeleton = ({
  blockSize,
  className,
  inlineSize,
  lineCount = 1,
  shape = "block",
  style,
  ...divProps
}: SkeletonProps): ReactNode => {
  const barClassName = toClassName(
    "charcuterie-shimmer block bg-surface-sunken",
    SHAPE_CLASS[shape],
    shape === "text" && "h-[1em]",
  )

  if (shape === "text" && lineCount > 1) {
    return (
      <div
        {...divProps}
        aria-hidden="true"
        className={toClassName(
          "flex flex-col gap-2",
          className,
        )}
        style={{ inlineSize, ...style }}
      >
        {buildLines(lineCount).map((line) => (
          <span
            className={barClassName}
            key={line.id}
            style={{ inlineSize: line.inlineSize }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      {...divProps}
      aria-hidden="true"
      className={toClassName(barClassName, className)}
      style={{ blockSize, inlineSize, ...style }}
    />
  )
}
