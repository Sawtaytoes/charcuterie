// biome-ignore-all lint/a11y/noRedundantRoles: the roles are redundant only while the table has `display: table`, and the narrow layout takes that away — `block` on the table, `flex` on a cell. Table semantics have historically travelled with `display`, and the engine that matters most here is the one this sandbox cannot run: the consumer is driven from a tablet, so WebKit is the narrow layout's primary browser. Measured in this sandbox's chromium via CDP `Accessibility.getFullAXTree`, these roles change nothing (see the `ROW_GROUP_ROLE` note); a dropped role, in the one layout where the column headers are no longer on screen, turns the table into a stack of unrelated text. Redundant costs nothing, absent costs everything.

import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

import { Checkbox } from "../Checkbox/Checkbox.tsx"
import type { SortDirection } from "../SortableTableHeader/SortableTableHeader.tsx"
import { SortableTableHeader } from "../SortableTableHeader/SortableTableHeader.tsx"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"

export type DataTableColumn<Row> = {
  /**
   * Lands on this column's `<th>` **and** on every `<td>` under it,
   * which is what makes it the place a width goes: `w-32` on one
   * column is the only sizing this component has, and it is
   * deliberately the consumer's to write.
   */
  className?: string
  /**
   * The column's name. Rendered twice on purpose — once in the
   * header row, and once inside each cell as the label the stacked
   * layout needs — so it has to be a node that can be rendered more
   * than once. The in-cell copy is `aria-hidden`, because the
   * `columnheader` association already says it to assistive
   * technology.
   */
  header: ReactNode
  /**
   * Whether this column offers a sort control. A column without one
   * renders a plain `<th>` with **no** `aria-sort` at all, which is
   * the attribute's way of saying "this column cannot be sorted" —
   * `"none"` would claim the opposite.
   */
  isSortable?: boolean
  /** Stable id. Also the `columnKey` a sort request comes back with. */
  key: string
  renderCell: (row: Row) => ReactNode
}

export type DataTableSort = {
  columnKey: string
  direction: SortDirection
}

export type DataTableSelection<Row> = {
  /**
   * The accessible name of a row's checkbox. A tick box called
   * "Select row" seven times over is seven identical controls in a
   * screen reader's forms list, so this is required rather than
   * defaulted — it is normally the same value the first column
   * renders.
   */
  getRowLabel: (row: Row) => string
  /** The whole next set, never a delta. */
  onSelectionChange: (selectedRowKeys: string[]) => void
  selectAllLabel?: string
  selectedRowKeys: readonly string[]
}

export type DataTableProps<Row> = {
  className?: string
  columns: readonly DataTableColumn<Row>[]
  /**
   * What fills the table when `rows` is empty — an `EmptyState`,
   * normally. Rendered in a `colSpan` cell **inside** the table, so
   * the header row and the sort the reader just performed are still
   * there. Swapping the whole table out for a message is how a
   * filter that matches nothing takes the controls away with it.
   */
  emptyState?: ReactNode
  getRowKey: (row: Row) => string
  /**
   * Shows the `<caption>`. Off by default: most tables sit under a
   * heading the page already renders, and printing the name twice is
   * how a table ends up with two titles.
   */
  isLabelVisible?: boolean
  /**
   * The table's accessible name, as a real `<caption>`. Required,
   * because a screen reader listing "table with 6 columns, 40 rows"
   * and no name is a table nobody can choose to enter.
   */
  label: string
  onSortChange?: (sort: DataTableSort) => void
  rows: readonly Row[]
  selection?: DataTableSelection<Row>
  /**
   * Which column is sorted and which way — **the fact, not the
   * doing.** The rows arrive already ordered; this only says which
   * header lights up and what `aria-sort` announces.
   */
  sort?: DataTableSort
}

/**
 * The cell padding, in one place because four elements have to agree
 * on it: the sortable header's button (which brings its own, inside
 * `SortableTableHeader`), the plain header, the body cell, and the
 * empty-state cell.
 */
const CELL_PADDING_CLASS = "px-3 py-2"

/**
 * `role` on every part, and it is not belt-and-braces.
 *
 * The narrow layout takes `display` away from the table elements —
 * `block` on the table, `grid` on the row, `flex` on the cell — and
 * a table's semantics have historically travelled with its
 * `display`. Measured in this sandbox's chromium via CDP
 * (`Accessibility.getFullAXTree`), that engine now keeps
 * `table` / `row` / `columnheader` / `cell` intact through
 * `display: block`; the roles below are therefore a **no-op here**
 * and insurance for the engines this sandbox cannot run. The one
 * measured difference is `<tbody>`: chromium ignores it entirely
 * until it is given `role="rowgroup"`, at which point it joins the
 * tree as a rowgroup beside `<thead>`'s — which is what a table
 * with two rowgroups is supposed to look like.
 *
 * The cost of being wrong in each direction is what settles it. A
 * redundant role changes nothing anywhere. A dropped one turns the
 * whole table into a stack of unrelated text in exactly the layout
 * where the column headers are no longer on screen to read.
 */
const ROW_GROUP_ROLE = "rowgroup"

/**
 * **A table that reflows instead of scrolling, sized by its
 * container.**
 *
 * ### It composes `SortableTableHeader`; it does not replace it
 *
 * The header cell shipped first, on its own, and stays on its own:
 * it is already in a published 1.0.0 with a consumer of its own
 * (mux-magic's `FileExplorerModal`), and subsuming it would be a
 * breaking change bought for nothing. Every sortable column here
 * renders that component, so there is exactly one place in the fleet
 * that knows `aria-sort` belongs on the `<th>` while the click
 * target is a `<button>` inside it, and one place to fix if that is
 * ever wrong.
 *
 * That composition is also why this is a **real `<table>`**. A grid
 * of `<div role="row">`s is the other reasonable choice, and it
 * cannot host a `<th>` at all — so it would have meant either
 * duplicating the header or breaking it.
 *
 * ### The narrow layout reflows; it never scrolls sideways
 *
 * Below `--cq-md` (32rem) each row stops being a row and becomes a
 * labelled block — the column name beside its value, one pair per
 * line — while the header row wraps into a strip of sort controls
 * that stays reachable. Above it, a normal table.
 *
 * The two rejected alternatives are worth naming because both are
 * common:
 *
 *  - **Horizontal scroll.** WCAG 2.2 SC 1.4.10 (Reflow) exists
 *    because of it, and the consumer this was built for bans it
 *    outright ("No horizontal scroll, ever"). A pan surface also
 *    hides the *existence* of the columns off-screen.
 *  - **Dropping low-priority columns.** Cheapest to build and the
 *    only one that loses data: the assignee column does not come
 *    back, and there is no gesture that asks for it.
 *
 * ### Container queries, never a media query
 *
 * The width that matters is the element's, not the window's. A table
 * in a three-up board lane is narrow on a 4K monitor, and the owner
 * of this fleet browses zoomed in — a 1500px window at 175% zoom is
 * ~860 effective pixels, so a `@media (max-width: …)` is measuring
 * something that is not the question. The `@container` is declared
 * on the wrapper and queried by its descendants, because a container
 * query never matches the element that declares it.
 *
 * ### What it does not own
 *
 * **Sorting the data.** `sort` says which column is sorted;
 * `onSortChange` asks for a different one. Comparing two values is
 * per-column app logic — a date, a title, a priority enum with an
 * order that is not alphabetical — and a table that sorted its own
 * rows would have to be handed a comparator per column to do it,
 * which is the same code in a worse place. The rows arrive ordered.
 *
 * **The selected set.** `selection.selectedRowKeys` is authoritative
 * and lives with the consumer, because every use of a selection —
 * the count in a toolbar, the bulk action, the undo — is outside
 * this component. That is the opposite of `Checkbox`, and for a
 * stated reason: the platform owns one checkbox's checkedness, and
 * nothing at all owns "these five rows".
 *
 * **Column widths.** No drag handle, no measured layout. The browser's
 * own auto table layout sizes columns to their content, which is a
 * better algorithm than anything worth reimplementing, and
 * `column.className` overrides it. Drag-to-resize is a *persistence*
 * question (whose widths, stored where, keyed on what) that a
 * component cannot answer for its consumer.
 *
 * **Virtualisation.** Deliberately absent; see the decision record.
 * Every row is in the DOM, which is what keeps the accessibility
 * tree honest and the auto column layout possible.
 */
export const DataTable = <Row,>({
  className,
  columns,
  emptyState,
  getRowKey,
  isLabelVisible = false,
  label,
  onSortChange,
  rows,
  selection,
  sort,
}: DataTableProps<Row>): ReactNode => {
  const tableRef = useRef<HTMLTableElement>(null)

  const selectedRowKeys = selection?.selectedRowKeys

  /**
   * The checkboxes are **written to**, not re-mounted.
   *
   * `Checkbox` is uncontrolled by design — `isChecked` seeds the
   * first paint and the `<input>` is the store from then on — so a
   * consumer changing `selectedRowKeys` out from under it (a "clear
   * selection" button, a filter that drops a selected row) would
   * otherwise leave the tick behind. Re-mounting with a
   * state-bearing `key` fixes the tick and throws the focus away
   * mid-keyboard, one row into a `Space`-through-the-list.
   *
   * So the store gets written instead, which is also the only way to
   * express the header box's third state: `indeterminate` is a DOM
   * property with no HTML attribute at all, so there is no markup
   * that could have set it.
   *
   * No dependency array: this has to run after every render that
   * could have changed a row, and it is a `querySelectorAll` over
   * the rows already on screen.
   */
  useEffect(() => {
    const table = tableRef.current

    if (!table || !selectedRowKeys) {
      return
    }

    const selectedKeys = new Set(selectedRowKeys)

    for (const input of table.querySelectorAll<HTMLInputElement>(
      'tbody input[type="checkbox"]',
    )) {
      input.checked = selectedKeys.has(input.value)
    }

    const selectAllInput =
      table.querySelector<HTMLInputElement>(
        'thead input[type="checkbox"]',
      )

    if (selectAllInput) {
      const selectedRowCount = rows.filter((row) =>
        selectedKeys.has(getRowKey(row)),
      ).length

      selectAllInput.checked =
        rows.length > 0 && selectedRowCount === rows.length

      selectAllInput.indeterminate =
        selectedRowCount > 0 &&
        selectedRowCount < rows.length
    }
  })

  const selectedKeys = new Set(selectedRowKeys ?? [])

  const columnCount = columns.length + (selection ? 1 : 0)

  return (
    // The container is declared here and queried by everything
    // below it. `className` stays on this element — the outermost
    // box the component renders — which is what lets a caller give
    // the table a width, a margin, or a grid placement.
    <div className={toClassName("@container", className)}>
      <table
        className="block w-full border-collapse text-start text-content-primary text-md cq-md:table"
        ref={tableRef}
        role="table"
      >
        <caption
          className={toClassName(
            "text-start",
            isLabelVisible
              ? "pb-2 font-medium text-content-secondary text-sm"
              : "sr-only",
          )}
        >
          {label}
        </caption>

        <thead
          className="block cq-md:table-header-group"
          role={ROW_GROUP_ROLE}
        >
          {/* Narrow: a wrapping strip of sort controls, so sorting
              survives the layout that has no header row. Wide: the
              header row. */}
          <tr
            className="flex flex-wrap items-center gap-x-1 border-border-subtle border-b cq-md:table-row cq-md:border-b-0"
            role="row"
          >
            {selection ? (
              <th
                className={toClassName(
                  "border-border-subtle p-2 text-start cq-md:table-cell cq-md:border-b",
                )}
                role="columnheader"
                scope="col"
              >
                <Checkbox
                  label={
                    <VisuallyHidden>
                      {selection.selectAllLabel ??
                        "Select all rows"}
                    </VisuallyHidden>
                  }
                  onChange={(isChecked) => {
                    selection.onSelectionChange(
                      isChecked ? rows.map(getRowKey) : [],
                    )
                  }}
                />
              </th>
            ) : null}

            {columns.map((column) =>
              column.isSortable ? (
                <SortableTableHeader
                  // The header keeps its own `border-b` for the
                  // wide layout and loses it in the strip, where
                  // one underline per chip reads as five separate
                  // rules rather than one header edge.
                  className={toClassName(
                    "border-b-0 cq-md:border-b",
                    column.className,
                  )}
                  direction={
                    sort?.columnKey === column.key
                      ? sort.direction
                      : undefined
                  }
                  key={column.key}
                  onSort={(direction) => {
                    onSortChange?.({
                      columnKey: column.key,
                      direction,
                    })
                  }}
                >
                  {column.header}
                </SortableTableHeader>
              ) : (
                <th
                  className={toClassName(
                    "border-border-subtle text-start font-medium text-content-secondary text-sm uppercase tracking-wide cq-md:table-cell cq-md:border-b",
                    CELL_PADDING_CLASS,
                    column.className,
                  )}
                  key={column.key}
                  role="columnheader"
                  scope="col"
                >
                  {column.header}
                </th>
              ),
            )}
          </tr>
        </thead>

        <tbody
          className="flex flex-col gap-2 pt-2 cq-md:table-row-group cq-md:gap-0 cq-md:pt-0"
          role={ROW_GROUP_ROLE}
        >
          {rows.length === 0 ? (
            <tr
              className="block cq-md:table-row"
              role="row"
            >
              <td
                className="block p-0 cq-md:table-cell"
                colSpan={columnCount}
                role="cell"
              >
                {emptyState}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const rowKey = getRowKey(row)

              const isSelected = selectedKeys.has(rowKey)

              return (
                <tr
                  className={toClassName(
                    // Narrow: a card. Wide: a row with a hairline
                    // under it. Both states are written here rather
                    // than in a stylesheet so a reader can see the
                    // whole of a row's shape in one place.
                    "flex flex-col gap-1 rounded-lg border border-border-subtle p-3 transition-colors duration-(--duration-fast) ease-standard",
                    "cq-md:table-row cq-md:gap-0 cq-md:rounded-none cq-md:border-0 cq-md:border-border-subtle cq-md:border-b cq-md:p-0",
                    isSelected
                      ? "bg-intent-accent-surface"
                      : "bg-surface-raised hover:bg-intent-neutral-surface cq-md:bg-transparent",
                  )}
                  // Not `aria-selected`: that property belongs to
                  // `grid`/`treegrid` rows, and this is a `table`.
                  // The row's own checkbox is what states the fact
                  // to assistive technology, and it is a control
                  // that can also change it.
                  data-is-selected={isSelected}
                  key={rowKey}
                  role="row"
                >
                  {selection ? (
                    <td
                      className="block p-2 cq-md:table-cell cq-md:align-middle"
                      role="cell"
                    >
                      <Checkbox
                        isChecked={isSelected}
                        label={
                          <VisuallyHidden>
                            {selection.getRowLabel(row)}
                          </VisuallyHidden>
                        }
                        onChange={(isChecked) => {
                          selection.onSelectionChange(
                            isChecked
                              ? [
                                  ...selection.selectedRowKeys,
                                  rowKey,
                                ]
                              : selection.selectedRowKeys.filter(
                                  (one) => one !== rowKey,
                                ),
                          )
                        }}
                        value={rowKey}
                      />
                    </td>
                  ) : null}

                  {columns.map((column) => (
                    <td
                      className={toClassName(
                        "flex items-baseline gap-3 py-0.5 cq-md:table-cell cq-md:align-middle",
                        CELL_PADDING_CLASS,
                        "cq-md:py-2",
                        column.className,
                      )}
                      key={column.key}
                      role="cell"
                    >
                      {/* The column name, in the cell, for the
                          layout where the header row is no longer
                          above it. `aria-hidden` because the
                          `columnheader` association already says
                          this — announcing both is the column read
                          out twice per cell. */}
                      <span
                        aria-hidden="true"
                        className="w-20 shrink-0 truncate text-content-secondary text-xs uppercase tracking-wide cq-sm:w-24 cq-md:hidden"
                      >
                        {column.header}
                      </span>

                      {/* `wrap-anywhere` only while stacked. It sets
                          the min-content width to one character, which
                          is what a narrow cell needs and what would
                          wreck the wide layout: the browser's auto
                          table algorithm sizes a column from its
                          min-content width, so a column of
                          break-anywhere text asks for almost nothing
                          and gets it — a title column one word wide
                          with "extract or fan filter" underneath. */}
                      <span className="min-w-0 flex-1 wrap-anywhere cq-md:wrap-normal">
                        {column.renderCell(row)}
                      </span>
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
