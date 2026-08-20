import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import { Badge } from "../Badge/Badge.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { EmptyState } from "../EmptyState/EmptyState.tsx"
import { TextLink } from "../TextLink/TextLink.tsx"
import type {
  DataTableColumn,
  DataTableSort,
} from "./DataTable.tsx"
import { DataTable } from "./DataTable.tsx"

/**
 * Invented rows, and deliberately so: a screenshot is opaque to
 * every grep, so real data in a fixture is real data nobody can
 * find again later.
 */
type Task = {
  assignee: string
  id: string
  priority: "high" | "low" | "medium"
  status: "blocked" | "done" | "todo"
  title: string
  updatedAt: string
}

const TASKS: readonly Task[] = [
  {
    assignee: "Wren",
    id: "task-1",
    priority: "high",
    status: "todo",
    title: "Re-point the garden wall",
    updatedAt: "2026-08-18",
  },
  {
    assignee: "Kestrel",
    id: "task-2",
    priority: "medium",
    status: "blocked",
    title: "Order the replacement extractor fan filter",
    updatedAt: "2026-08-14",
  },
  {
    assignee: "Wren",
    id: "task-3",
    priority: "low",
    status: "done",
    title: "Label the spare keys",
    updatedAt: "2026-08-11",
  },
  {
    assignee: "Marlowe",
    id: "task-4",
    priority: "high",
    status: "todo",
    title:
      "Rebuild the seed-tray shelving now the propagator has moved",
    updatedAt: "2026-08-19",
  },
  {
    assignee: "Kestrel",
    id: "task-5",
    priority: "medium",
    status: "todo",
    title: "Book the chimney sweep",
    updatedAt: "2026-08-09",
  },
]

const STATUS_INTENT = {
  blocked: "danger",
  done: "success",
  todo: "neutral",
} as const

const PRIORITY_ORDER = {
  high: 0,
  low: 2,
  medium: 1,
} as const

/**
 * The columns, as a consumer writes them. `renderCell` returns a
 * node, so the title cell is a real `TextLink` and the status cell
 * is a `Badge` — the table composes what the package already has
 * rather than growing a `type: "badge"` column kind that could only
 * ever render one of them.
 */
/**
 * The widths are themselves container queries — `cq-lg:w-32`, not
 * `w-32`. A fixed width is a promise about space the container may
 * not have: four columns pinned at `w-32` inside a 34rem table leave
 * the title 48px, and the title is the column anyone reads.
 */
const COLUMNS: readonly DataTableColumn<Task>[] = [
  {
    header: "Task",
    isSortable: true,
    key: "title",
    renderCell: (task) => (
      <TextLink href={`#${task.id}`}>{task.title}</TextLink>
    ),
  },
  {
    className: "cq-lg:w-32",
    header: "Status",
    isSortable: true,
    key: "status",
    renderCell: (task) => (
      <Badge
        appearance="soft"
        intent={STATUS_INTENT[task.status]}
      >
        {task.status}
      </Badge>
    ),
  },
  {
    className: "cq-lg:w-28",
    header: "Priority",
    isSortable: true,
    key: "priority",
    renderCell: (task) => task.priority,
  },
  {
    className: "cq-lg:w-32",
    header: "Assignee",
    key: "assignee",
    renderCell: (task) => task.assignee,
  },
  {
    className: "cq-lg:w-32",
    header: "Updated",
    isSortable: true,
    key: "updatedAt",
    renderCell: (task) => task.updatedAt,
  },
]

/**
 * Comparing two values is the consumer's, and this is what that
 * looks like: three of these five columns do not sort
 * alphabetically. `priority` is an enum whose order is
 * high → medium → low and whose alphabetical order is
 * high → low → medium, which is the case a table that sorted itself
 * would get quietly wrong.
 */
const getSortedTasks = (
  tasks: readonly Task[],
  sort: DataTableSort,
): Task[] => {
  const direction = sort.direction === "ascending" ? 1 : -1

  return [...tasks].sort((one, two) => {
    if (sort.columnKey === "priority") {
      return (
        (PRIORITY_ORDER[one.priority] -
          PRIORITY_ORDER[two.priority]) *
        direction
      )
    }

    const key =
      sort.columnKey === "title"
        ? "title"
        : sort.columnKey === "status"
          ? "status"
          : sort.columnKey === "assignee"
            ? "assignee"
            : "updatedAt"

    return one[key].localeCompare(two[key]) * direction
  })
}

/**
 * The state a consumer owns, in the smallest form that is honest:
 * a sort, a selected set, and the rows re-ordered from both. Every
 * story that needs a working table renders this.
 */
const TaskTable = ({
  isSelectable = false,
  initialSort,
  label = "Tasks",
  tasks = TASKS,
}: {
  initialSort?: DataTableSort
  isSelectable?: boolean
  label?: string
  tasks?: readonly Task[]
}): ReactNode => {
  const [sort, setSort] = useState<
    DataTableSort | undefined
  >(initialSort)

  const [selectedRowKeys, setSelectedRowKeys] = useState<
    readonly string[]
  >([])

  const sortedTasks = sort
    ? getSortedTasks(tasks, sort)
    : tasks

  return (
    <DataTable
      columns={COLUMNS}
      emptyState={
        <EmptyState
          description="Nothing matches this filter. The columns and the sort are still here."
          heading="No tasks"
        />
      }
      getRowKey={(task) => task.id}
      label={label}
      onSortChange={setSort}
      rows={sortedTasks}
      selection={
        isSelectable
          ? {
              getRowLabel: (task) => task.title,
              onSelectionChange: setSelectedRowKeys,
              // Not "Select all tasks": an agent's
              // `getByRole("columnheader", { name: "Task" })` is a
              // **substring, case-insensitive** match in Playwright,
              // so a header box called "Select all tasks" makes the
              // "Task" column ambiguous to the query the component
              // exists to be drivable by.
              selectAllLabel: "Select every row",
              selectedRowKeys,
            }
          : undefined
      }
      sort={sort}
    />
  )
}

const meta = {
  title: "Components/DataTable",
  component: DataTable,
  parameters: { layout: "padded" },
  args: {
    columns: COLUMNS,
    getRowKey: (task: Task) => task.id,
    isLabelVisible: false,
    label: "Tasks",
    rows: TASKS,
  },
} satisfies Meta<typeof DataTable<Task>>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Five rows, five columns, four of them sortable. Click a header and
 * the rows re-order — the story sorts them, which is the whole point
 * of the split: the component says *which* column is sorted, the
 * consumer says what that means for a priority enum.
 */
export const Default: Story = {
  render: () => (
    <TaskTable
      initialSort={{
        columnKey: "updatedAt",
        direction: "descending",
      }}
    />
  ),
}

/**
 * The three shapes a caller assembles out of the same props: plain,
 * selectable, and empty. There is no `variant` prop — a table with
 * tick boxes differs from one without by having a `selection`, which
 * is a capability rather than a look.
 */
export const AllVariants: Story = {
  render: () => (
    <StorySection title="Same columns, three assemblies.">
      <StoryGrid columns={1}>
        <StoryCell align="stretch" label="plain">
          <TaskTable />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="selectable — a leading checkbox column"
        >
          <TaskTable isSelectable />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="empty — the header and the sort survive"
        >
          <TaskTable tasks={[]} />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * Sort has three states per column and exactly one column ever holds
 * a direction. The unsorted columns are not blank in the
 * accessibility tree — they say `aria-sort="none"`, which is
 * "sortable, not currently sorted"; an absent `aria-sort` would mean
 * "cannot be sorted at all".
 */
export const AllStates: Story = {
  render: () => (
    <StorySection title="Sorted ascending, sorted descending, and a selected row.">
      <StoryGrid columns={1}>
        <StoryCell
          align="stretch"
          label='Task, aria-sort="ascending"'
        >
          <TaskTable
            initialSort={{
              columnKey: "title",
              direction: "ascending",
            }}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label='Updated, aria-sort="descending"'
        >
          <TaskTable
            initialSort={{
              columnKey: "updatedAt",
              direction: "descending",
            }}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="selection — tick a row, or the header box for all of them"
        >
          <TaskTable isSelectable />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The **only honest way to story this component.** Three container
 * widths inside one window: the first two are below `--cq-md`
 * (32rem) and each row is a labelled block with the header row
 * wrapped into a strip of sort controls; the third is above it and
 * is a table.
 *
 * Resizing the browser proves nothing here — what changed is the
 * element's width, and a window can be 4K while a board lane is
 * 300px.
 */
export const Responsive: Story = {
  render: () => (
    <ContainerBoard>
      {(width) => (
        <TaskTable
          initialSort={{
            columnKey: "title",
            direction: "ascending",
          }}
          // Three tables in one story would otherwise be three
          // things called "Tasks", and `getByRole("table", { name:
          // "Tasks" })` — the query an agent writes — would match
          // all three. `ContainerBoard`'s function form exists for
          // exactly this.
          label={`Tasks at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * The complete keyboard path, and there is no custom key handling in
 * it: `Tab` reaches each sortable header's `<button>` and each row's
 * checkbox in document order, `Enter`/`Space` sorts, `Space` ticks.
 *
 * That is the deliberate half. A table is not a `grid` — it has no
 * roving focus, no arrow-key cell navigation, and no focus trap —
 * so a screen reader's own table-reading mode is what moves through
 * the data, and everything interactive is a real control the browser
 * already knows how to reach.
 */
export const Interactive: Story = {
  render: () => (
    <TaskTable
      initialSort={{
        columnKey: "title",
        direction: "ascending",
      }}
      isSelectable
    />
  ),
}
