import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import type { SortDirection } from "./SortableTableHeader.tsx"
import { SortableTableHeader } from "./SortableTableHeader.tsx"

const noop = () => undefined

const ROWS = [
  { size: "24.1 GB", title: "Blade Runner", year: 1982 },
  { size: "31.7 GB", title: "Alien", year: 1979 },
  { size: "18.2 GB", title: "Solaris", year: 1972 },
]

const TABLE_CLASS =
  "w-full border-collapse text-content-primary text-sm"

const CELL_CLASS =
  "border-border-subtle border-b px-3 py-2 text-start"

/**
 * The component owns **only** the header cell, so every story has to
 * bring its own table. That is the point rather than an
 * inconvenience: sorting the data is app logic that differs per
 * column type, and announcing *that* a column is sorted is markup
 * every table gets wrong the same way.
 */
const meta = {
  title: "Components/Data/SortableTableHeader",
  component: SortableTableHeader,
  parameters: { layout: "padded" },
  args: { onSort: noop },
} satisfies Meta<typeof SortableTableHeader>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: "Title", direction: "ascending" },
  render: (args) => (
    <table className={TABLE_CLASS}>
      <thead>
        <tr>
          <SortableTableHeader {...args} />

          <SortableTableHeader onSort={noop}>
            Year
          </SortableTableHeader>
        </tr>
      </thead>

      <tbody>
        {ROWS.map((row) => (
          <tr key={row.title}>
            <td className={CELL_CLASS}>{row.title}</td>

            <td className={CELL_CLASS}>{row.year}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}

/**
 * `aria-sort="none"` on the unsorted columns, not an omitted
 * attribute. Absent means "this column is not sortable"; `none`
 * means "sortable, not currently sorted" — and a table mixing the
 * two tells a screen-reader user the other columns cannot be sorted
 * at all.
 */
export const AllVariants: Story = {
  args: { children: "Title" },
  render: () => (
    <StoryGrid columns={1}>
      <StoryCell label="ascending · descending · none">
        <table className={TABLE_CLASS}>
          <thead>
            <tr>
              <SortableTableHeader
                direction="ascending"
                onSort={noop}
              >
                Title
              </SortableTableHeader>

              <SortableTableHeader
                direction="descending"
                onSort={noop}
              >
                Year
              </SortableTableHeader>

              <SortableTableHeader onSort={noop}>
                Size
              </SortableTableHeader>
            </tr>
          </thead>

          <tbody>
            {ROWS.map((row) => (
              <tr key={row.title}>
                <td className={CELL_CLASS}>{row.title}</td>

                <td className={CELL_CLASS}>{row.year}</td>

                <td className={CELL_CLASS}>{row.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </StoryCell>
    </StoryGrid>
  ),
}

export const AllStates: Story = {
  args: { children: "Title", direction: "ascending" },
  render: (args) => (
    <table className={TABLE_CLASS}>
      <thead>
        <tr>
          <SortableTableHeader {...args} />
        </tr>
      </thead>

      <tbody>
        <tr>
          <td className={CELL_CLASS}>Blade Runner</td>
        </tr>
      </tbody>
    </table>
  ),
}

/**
 * Click a header and watch `aria-sort` move — exactly one column
 * ever holds a direction, which is the invariant a hand-rolled
 * `▲`/`▼` cannot express at all.
 */
export const Interactive: Story = {
  args: { children: "Title" },
  render: function SortableTable() {
    const [sort, setSort] = useState<{
      column: "title" | "year"
      direction: SortDirection
    }>({ column: "title", direction: "ascending" })

    const sorted = [...ROWS].sort((first, second) => {
      const order =
        sort.column === "title"
          ? first.title.localeCompare(second.title)
          : first.year - second.year

      return sort.direction === "ascending" ? order : -order
    })

    return (
      <table className={TABLE_CLASS}>
        <thead>
          <tr>
            <SortableTableHeader
              direction={
                sort.column === "title"
                  ? sort.direction
                  : undefined
              }
              onSort={(direction) => {
                setSort({ column: "title", direction })
              }}
            >
              Title
            </SortableTableHeader>

            <SortableTableHeader
              direction={
                sort.column === "year"
                  ? sort.direction
                  : undefined
              }
              onSort={(direction) => {
                setSort({ column: "year", direction })
              }}
            >
              Year
            </SortableTableHeader>
          </tr>
        </thead>

        <tbody>
          {sorted.map((row) => (
            <tr key={row.title}>
              <td className={CELL_CLASS}>{row.title}</td>

              <td className={CELL_CLASS}>{row.year}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  },
}
