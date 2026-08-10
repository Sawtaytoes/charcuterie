import type { ReactNode } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"

export type SortDirection = "ascending" | "descending"

export type SortableTableHeaderProps = {
  children: ReactNode
  className?: string
  /**
   * The direction **this column** is sorted in, or `undefined` when
   * it is not the sorted one. Undefined is not "ascending by
   * default": a table has exactly one sorted column and every other
   * header has to say `aria-sort="none"`, which is what tells a
   * screen reader which one is live.
   */
  direction?: SortDirection
  /** Called with the direction the header is asking to move to. */
  onSort: (direction: SortDirection) => void
}

const NEXT_DIRECTION: Record<SortDirection, SortDirection> =
  {
    ascending: "descending",
    descending: "ascending",
  }

/**
 * **The header cell, and nothing else.** No `DataTable`, no rows, no
 * comparator — the plan is explicit about that, and the reason is
 * that sorting *data* is app logic that differs per column type,
 * while announcing *that* a column is sorted is markup every table
 * gets wrong the same way.
 *
 * ### `aria-sort` does not exist anywhere in the fleet
 *
 * Not in mux-magic, not in rip-deck, not in castkit. mux-magic's
 * `FileExplorerModal` — the one sortable table there is — renders
 * the state as a character:
 *
 * ```tsx
 * {sortDirection === "asc" ? "▲" : "▼"}
 * ```
 *
 * A screen reader announces that as "black up-pointing triangle", if
 * the font has it at all, and the sandbox's headless Chromium does
 * not have it — so the same glyph measures blank in a screenshot.
 * Sighted users see a direction, everyone else gets nothing, and no
 * automated check anywhere reports it: axe has no rule for a missing
 * `aria-sort`, because a table with none is a table that is simply
 * not sorted as far as the accessibility tree knows.
 *
 * This is therefore the one component in M6 whose payoff is not
 * duplication — there is a single site — but a class of failure
 * that is invisible to every gate the fleet has.
 *
 * ### The cell announces, the button acts
 *
 * `aria-sort` belongs on the `<th>`; the click target is a `<button>`
 * inside it. Putting the role on the button instead is the common
 * mistake and it breaks the grid semantics — a `<th>` that is a
 * button is no longer a column header to anything reading the table
 * structure.
 *
 * The name stays the column's name. It is tempting to append the
 * state — "Name, sorted ascending" — and that duplicates what
 * `aria-sort` already says, so the column is announced twice and
 * `getByRole("columnheader", { name: "Name" })` stops matching the
 * moment somebody sorts it.
 */
export const SortableTableHeader = ({
  children,
  className,
  direction,
  onSort,
}: SortableTableHeaderProps): ReactNode => (
  <th
    // `none`, not omitted, on the unsorted columns. An absent
    // `aria-sort` means "this column is not sortable"; `none` means
    // "sortable, not currently sorted", and a table of the first
    // kind with one of the second is how a screen-reader user is
    // told the other four columns cannot be sorted at all.
    aria-sort={direction ?? "none"}
    className={toClassName(
      "border-border-subtle border-b p-0 text-start",
      className,
    )}
    scope="col"
  >
    <button
      className={toClassName(
        // `text-sm` since 2026-08-10. This was the single most
        // fragile combination in the package: `text-xs` at 12px,
        // uppercased and letterspaced, which strips the word shapes
        // readers use at small sizes. A column header is the label
        // for everything under it, so it is content.
        "flex w-full cursor-pointer items-center gap-1.5 bg-transparent px-3 py-2 text-start font-medium text-content-secondary text-sm uppercase tracking-wide transition-colors duration-(--duration-fast) ease-standard",
        "hover:text-content-primary",
        FOCUS_RING_CLASS,
      )}
      onClick={() => {
        onSort(
          direction === undefined
            ? "ascending"
            : NEXT_DIRECTION[direction],
        )
      }}
      type="button"
    >
      {children}

      <svg
        // Decoration. `aria-sort` on the cell above is the same fact
        // said in a way assistive technology can read, and the fleet
        // ships only this half.
        aria-hidden="true"
        className={toClassName(
          "size-3.5 shrink-0 transition-[transform,opacity] duration-(--duration-fast) ease-standard",
          direction === undefined && "opacity-0",
          direction === "descending" && "rotate-180",
        )}
        fill="none"
        focusable={false}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="m6 15 6-6 6 6" />
      </svg>
    </button>
  </th>
)
