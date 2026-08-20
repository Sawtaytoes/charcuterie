import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Field } from "../Field/Field.tsx"
import { DatePicker } from "./DatePicker.tsx"
import type { DateRange } from "./plainDate.ts"

/**
 * Wednesday, 19 August 2026 — fixed, and passed to every story.
 *
 * A date component demoed against the real clock is a set of
 * screenshots that stop matching the day after they are taken, and a
 * "Today" preset that lands somewhere different every morning.
 */
const TODAY = "2026-08-19"

const meta = {
  title: "Components/DatePicker",
  component: DatePicker,
  args: {
    label: "Due date",
    // Pinned, so a demo (and every screenshot of it) reads the same
    // regardless of what locale the machine rendering it is set to.
    // `AllVariants` carries the one that deliberately differs.
    locale: "en-US",
    size: "md",
    today: TODAY,
  },
  argTypes: {
    size: controlSizeArgType,
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof DatePicker>

export default meta

type Story = StoryObj<typeof meta>

const describeValue = (
  value: DateRange | null | string,
) => {
  if (value === null) {
    return "—"
  }

  if (typeof value === "string") {
    return value
  }

  return `${value.start ?? "—"} to ${value.end ?? "—"}`
}

const DatePickerHarness = ({
  isRange,
  locale = "en-US",
  ...pickerProps
}: {
  isDisabled?: boolean
  isRange?: boolean
  label: string
  locale?: string
  maxValue?: string
  minValue?: string
  presets?: readonly { days: number; label: string }[]
  value?: DateRange | string
}): ReactNode => {
  const [chosen, setChosen] = useState<
    DateRange | null | string
  >(pickerProps.value ?? null)

  return (
    <div className="flex flex-col gap-1">
      <DatePicker
        {...pickerProps}
        isRange={isRange}
        locale={locale}
        onChange={setChosen}
        today={TODAY}
      />

      <p className="text-content-muted text-xs">
        Chosen: {describeValue(chosen)}
      </p>
    </div>
  )
}

/**
 * The field, closed. Click it or press ArrowDown to open the
 * calendar; or just type — `tomorrow`, `next fri`, `+14d`, `8/19`,
 * `19 aug`, `2026-08-19` and a bare `19` all resolve, and the line
 * underneath shows what they resolved to before anything commits.
 */
export const Default: Story = {
  args: { label: "Due date" },
  render: () => <DatePickerHarness label="Due date" />,
}

/**
 * Single and range, a bounded field, a locale that writes the day
 * first, and the shortcut row switched off.
 *
 * `isRange` is a **mode**, not a sibling component — the same call
 * `Combobox` made about `isMultiple`, and for the same reason: a
 * range picker has no ARIA role of its own to be named after.
 */
export const AllVariants: Story = {
  args: { label: "Due date" },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="single (default)">
        <DatePickerHarness label="Due date" />
      </StoryCell>

      <StoryCell align="stretch" label="isRange">
        <DatePickerHarness isRange label="Phase" />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="minValue / maxValue"
      >
        <DatePickerHarness
          label="Sprint day"
          maxValue="2026-08-28"
          minValue="2026-08-17"
        />
      </StoryCell>

      <StoryCell align="stretch" label='locale="en-GB"'>
        <DatePickerHarness
          label="Scheduled"
          locale="en-GB"
        />
      </StoryCell>

      <StoryCell align="stretch" label="presets={[]}">
        <DatePickerHarness label="Review on" presets={[]} />
      </StoryCell>

      <StoryCell align="stretch" label="inside a Field">
        <Field
          description="Anything typeable: tomorrow, next fri, +14d."
          label="Follow up"
        >
          <DatePicker
            label="Follow up"
            locale="en-US"
            today={TODAY}
          />
        </Field>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Empty, filled, disabled, bounded, and — the state that matters
 * most — **refused**. A value the parser cannot read leaves the text
 * exactly as typed, marks the field invalid, and says why. It does
 * not clear the field and it does not quietly pick a nearby date.
 */
export const AllStates: Story = {
  args: { label: "Due date" },
  render: () => (
    <StorySection title="States">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="empty">
          <DatePickerHarness label="Empty" />
        </StoryCell>

        <StoryCell align="stretch" label="filled">
          <DatePickerHarness
            label="Filled"
            value="2026-08-19"
          />
        </StoryCell>

        <StoryCell align="stretch" label="range filled">
          <DatePickerHarness
            isRange
            label="Phase"
            value={{
              end: "2026-09-04",
              start: "2026-08-24",
            }}
          />
        </StoryCell>

        <StoryCell align="stretch" label="isDisabled">
          <DatePickerHarness
            isDisabled
            label="Locked"
            value="2026-08-19"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="error (type “ju 19”)"
        >
          <Field
            error="Pick a date the parser can read."
            label="Refused"
          >
            <DatePicker
              label="Refused"
              locale="en-US"
              today={TODAY}
            />
          </Field>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The **field** at three container widths. The panel is the other
 * half of the story and it is a container of its own: portalled and
 * clamped to the space floating-ui found, so at a narrow viewport —
 * or on a desktop zoomed in, which is the same measurement — the
 * weekday headers drop to one letter, the cells shrink, and a range
 * picker's two months stack instead of sitting side by side.
 */
export const Responsive: Story = {
  args: { label: "Due date" },
  render: () => (
    <ContainerBoard>
      {(width) => (
        <DatePicker
          label={`Due ${width}`}
          locale="en-US"
          presets={[]}
          today={TODAY}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * The complete keyboard path, with the value echoed underneath.
 *
 * Tab to the field. Type `next fri` and watch the line resolve it —
 * nothing has committed yet. ArrowDown moves into the grid; arrows
 * move by day, up/down by week, PageUp/PageDown by month,
 * Shift+PageUp/PageDown by year, Home/End to the ends of the week.
 * Enter selects and closes; Escape closes and puts the caret back.
 */
export const Interactive: Story = {
  args: { label: "Due date" },
  render: () => (
    <div className="flex flex-col gap-4">
      <DatePickerHarness label="Due date" />

      <DatePickerHarness isRange label="Phase" />
    </div>
  ),
}
