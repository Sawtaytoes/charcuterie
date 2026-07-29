import type { ReactNode } from "react"

/**
 * The furniture every story set uses: a labelled grid for
 * `AllVariants`, a labelled row for `AllStates`, and the three
 * container widths `Responsive` renders into.
 *
 * `.storyHelpers.tsx` rather than `.tsx` because `react/no-multi-comp`
 * is switched off for that suffix — a file whose entire job is
 * several small layout components is the case that rule exists to
 * exempt, and it is excluded from the package build so none of this
 * ships.
 */

export const StoryGrid = ({
  children,
  columns = 4,
}: {
  children: ReactNode
  columns?: number
}): ReactNode => (
  <div
    className="grid items-start gap-4"
    style={{
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    }}
  >
    {children}
  </div>
)

export const StoryCell = ({
  align = "start",
  children,
  label,
}: {
  /**
   * `stretch` for anything that establishes a **container query** —
   * `Card`, `MediaTile`, `EmptyState`.
   *
   * Not a cosmetic choice. `container-type: inline-size` implies
   * `contain: inline-size`, which means the element's inline size may
   * not depend on its own contents — so in a shrink-to-fit context
   * (`items-start`, an inline-flex parent) it collapses to
   * min-content and every line of text wraps after one word. It
   * needs a definite inline size from its parent, which a grid track
   * gives it for free.
   *
   * The default stays `start`, because a `Button` in a stretched cell
   * would silently become full-width and misrepresent itself.
   */
  align?: "start" | "stretch"
  children: ReactNode
  label: string
}): ReactNode => (
  <div
    className={
      align === "stretch"
        ? "flex flex-col items-stretch gap-2"
        : "flex flex-col items-start gap-2"
    }
  >
    <span className="font-mono text-content-muted text-xs">
      {label}
    </span>

    {children}
  </div>
)

export const StoryRow = ({
  children,
}: {
  children: ReactNode
}): ReactNode => (
  <div className="flex flex-wrap items-center gap-4">
    {children}
  </div>
)

export const StorySection = ({
  children,
  title,
}: {
  children: ReactNode
  title: string
}): ReactNode => (
  <section className="flex flex-col gap-3">
    <h3 className="font-semibold text-content-secondary text-sm">
      {title}
    </h3>

    {children}
  </section>
)

/**
 * The three container widths, side by side.
 *
 * The **only honest way to story a container query**: resizing the
 * viewport does not exercise one, because the component's container
 * is what changed, not the window. Each panel is a fixed inline size
 * matching a `--cq-*` step, so a `cq-sm:` utility flips between the
 * first and second panel while the browser window never moves.
 *
 * The labels are the token names on purpose — a reviewer should be
 * able to read "this is what the card does below `cq-sm`" straight
 * off the board.
 */
export const ContainerBoard = ({
  children,
}: {
  /**
   * A function form as well as a node, because three copies of the
   * same subtree can be an a11y violation rather than a convenience:
   * two `<section>`s with the same accessible name is axe's
   * `landmark-unique`, and a board comparing widths must not fail for
   * a reason the component would never hit in an app. Callers whose
   * component becomes a landmark pass a function and vary the name.
   */
  children: ReactNode | ((width: string) => ReactNode)
}): ReactNode => (
  <div className="flex flex-wrap items-start gap-6">
    {[
      {
        inlineSize: "15rem",
        label: "narrower than --cq-xs (15rem)",
      },
      { inlineSize: "24rem", label: "--cq-sm (24rem)" },
      {
        inlineSize: "34rem",
        label: "wider than --cq-md (34rem)",
      },
    ].map((panel) => (
      <div
        className="flex flex-col gap-2"
        key={panel.label}
        style={{ inlineSize: panel.inlineSize }}
      >
        <span className="font-mono text-content-muted text-xs">
          {panel.label}
        </span>

        {typeof children === "function"
          ? children(panel.inlineSize)
          : children}
      </div>
    ))}
  </div>
)
