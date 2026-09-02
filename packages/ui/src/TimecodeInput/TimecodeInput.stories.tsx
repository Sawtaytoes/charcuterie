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
import { TimecodeInput } from "./TimecodeInput.tsx"
import type { TimecodeRange } from "./timecode.ts"
import { formatTimecode } from "./timecode.ts"

/**
 * A made-up 45 minute 12 second file, so every demo reads the same
 * numbers and a screenshot of one is the same picture next week.
 */
const DURATION_MS = 2_712_000

const describeValue = (
  value: null | number | TimecodeRange,
) => {
  if (value === null) {
    return "—"
  }

  if (typeof value === "number") {
    return formatTimecode(value)
  }

  // A section with neither end set is the same absence `onChange`
  // reports as `null`, so the demo reads it the same way.
  if (value.end === null && value.start === null) {
    return "—"
  }

  return `${value.start === null ? "the beginning" : formatTimecode(value.start)} to ${value.end === null ? "the end" : formatTimecode(value.end)}`
}

const meta = {
  title: "Components/Controls/TimecodeInput",
  component: TimecodeInput,
  args: {
    durationMs: DURATION_MS,
    isDisabled: false,
    isRange: false,
    label: "Start at",
    size: "md",
    stepMs: 1_000,
  },
  argTypes: {
    size: controlSizeArgType,
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof TimecodeInput>

export default meta

type Story = StoryObj<typeof meta>

const TimecodeHarness = ({
  ...inputProps
}: {
  durationMs?: number
  isDisabled?: boolean
  isRange?: boolean
  label: string
  maxValueMs?: number
  minValueMs?: number
  stepMs?: number
  valueMs?: number | TimecodeRange
}): ReactNode => {
  const [chosen, setChosen] = useState<
    null | number | TimecodeRange
  >(inputProps.valueMs ?? null)

  return (
    <div className="flex flex-col gap-1">
      <TimecodeInput
        {...inputProps}
        durationMs={inputProps.durationMs ?? DURATION_MS}
        onChange={setChosen}
      />

      <p className="text-content-muted text-xs">
        Chosen: {describeValue(chosen)}
      </p>
    </div>
  )
}

/**
 * The field, empty. Type a position and the line underneath resolves
 * it before anything commits — `90` is ninety seconds, `1:30` is the
 * same position spelled the other way, `1:02:03.500` is the full
 * form. Enter or blur commits; Escape puts the last value back.
 */
export const Default: Story = {
  args: { label: "Start at" },
  render: () => <TimecodeHarness label="Start at" />,
}

/**
 * Single and section, a bounded window, a coarse step, and the field
 * inside a `Field`.
 *
 * `isRange` is a **mode**, not a sibling component — the same call
 * `DatePicker` made, and for the same reason: a section has no ARIA
 * role of its own to be named after.
 */
export const AllVariants: Story = {
  args: { label: "Start at" },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="single (default)">
        <TimecodeHarness label="Start at" />
      </StoryCell>

      <StoryCell align="stretch" label="isRange">
        <TimecodeHarness isRange label="Play section" />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="minValueMs / maxValueMs"
      >
        <TimecodeHarness
          label="Skip the recap until"
          maxValueMs={180_000}
          minValueMs={30_000}
        />
      </StoryCell>

      <StoryCell align="stretch" label="stepMs={60000}">
        <TimecodeHarness
          label="Chapter mark"
          stepMs={60_000}
          valueMs={600_000}
        />
      </StoryCell>

      <StoryCell align="stretch" label="inside a Field">
        <Field
          description="Anything typeable: 90, 1:30, 1:02:03.500."
          label="Resume from"
        >
          <TimecodeInput
            durationMs={DURATION_MS}
            label="Resume from"
          />
        </Field>
      </StoryCell>

      <StoryCell align="stretch" label='size="lg"'>
        <TimecodeInput
          durationMs={DURATION_MS}
          label="Large"
          size="lg"
          valueMs={62_500}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Empty, filled, disabled — and the four states a section really
 * has. Both ends are independently optional, so "from here to the
 * end" and "from the beginning, stopping here" are values rather
 * than half-finished input.
 */
export const AllStates: Story = {
  args: { label: "Start at" },
  render: () => (
    <StorySection title="States">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="empty">
          <TimecodeHarness label="Empty" />
        </StoryCell>

        <StoryCell align="stretch" label="filled">
          <TimecodeHarness
            label="Filled"
            valueMs={62_500}
          />
        </StoryCell>

        <StoryCell align="stretch" label="isDisabled">
          <TimecodeHarness
            isDisabled
            label="Locked"
            valueMs={62_500}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="section: no window"
        >
          <TimecodeHarness
            isRange
            label="No window"
            valueMs={{ end: null, start: null }}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="section: open end"
        >
          <TimecodeHarness
            isRange
            label="From here on"
            valueMs={{ end: null, start: 300_000 }}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="section: open start"
        >
          <TimecodeHarness
            isRange
            label="Up to here"
            valueMs={{ end: 300_000, start: null }}
          />
        </StoryCell>

        <StoryCell align="stretch" label="section: both">
          <TimecodeHarness
            isRange
            label="Between"
            valueMs={{ end: 900_000, start: 300_000 }}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="error (type “1:90”)"
        >
          <Field
            error="Pick a position the field can read."
            label="Refused"
          >
            <TimecodeInput
              durationMs={DURATION_MS}
              label="Refused"
            />
          </Field>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The field at three container widths. Two inputs and a word between
 * them is the layout that runs out of room first, so the section
 * mode is the one worth looking at narrow.
 */
export const Responsive: Story = {
  args: { label: "Start at" },
  render: () => (
    <ContainerBoard>
      {(width) => (
        <TimecodeInput
          durationMs={DURATION_MS}
          isRange
          label={`Section ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * The complete keyboard path.
 *
 * Tab to the field and type — the line underneath resolves what you
 * typed, and nothing has committed. Enter or Tab commits. Escape
 * puts the last committed value back. ArrowUp and ArrowDown step by
 * `stepMs`, and Shift multiplies that by ten.
 *
 * In the section below, type an end that sits before the start and
 * the pair **swaps**; type an end equal to the start and it is
 * **refused**, because a section with no length plays nothing.
 */
export const Interactive: Story = {
  args: { label: "Start at" },
  render: () => (
    <div className="flex flex-col gap-4">
      <TimecodeHarness label="Start at" />

      <TimecodeHarness
        isRange
        label="Play section"
        valueMs={{ end: null, start: 300_000 }}
      />
    </div>
  ),
}
