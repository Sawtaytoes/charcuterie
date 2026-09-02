import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import {
  controlSizeArgType,
  intentArgType,
} from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Slider } from "../Slider/Slider.tsx"
import { RangeSlider } from "./RangeSlider.tsx"
import type { RangeSliderValue } from "./rangeSliderValue.ts"

/** mm:ss, which is the app's job and not the component's. */
const toClock = (seconds: number): string => {
  const whole = Math.max(0, Math.round(seconds))

  const minutes = Math.floor(whole / 60)

  const rest = whole % 60

  return `${minutes}:${String(rest).padStart(2, "0")}`
}

/** An invented chapter list for a 45-minute programme. */
const chapters = [
  { label: "Cold open", value: 0 },
  { label: "Act one", value: 600 },
  { label: "Act two", value: 1_500 },
  { label: "Credits", value: 2_460 },
]

/**
 * The same marks with the words taken off, which is what a narrow
 * container wants: a label is centred on its mark, so two marks closer
 * together than a label box overlap. The component draws what it is
 * given.
 */
const chapterMarks = [
  ...chapters.map(({ value }) => ({ value })),
  { value: 240 },
]

/**
 * A controlled `RangeSlider` that owns its own value, which is what
 * every real call site is. The stories that only paint use the plain
 * component.
 */
const LiveRangeSlider = ({
  initialValue = { end: 1_500, start: 600 },
  ...rangeSliderProps
}: {
  initialValue?: RangeSliderValue
} & Omit<
  Parameters<typeof RangeSlider>[0],
  "onChange" | "value"
>): ReturnType<typeof RangeSlider> => {
  const [value, setValue] = useState(initialValue)

  return (
    <RangeSlider
      {...rangeSliderProps}
      onChange={setValue}
      value={value}
    />
  )
}

const meta = {
  title: "Components/Controls/RangeSlider",
  component: RangeSlider,
  parameters: { layout: "padded" },
  argTypes: {
    intent: intentArgType,
    size: controlSizeArgType,
  },
  // The component's own defaults, restated — Storybook does not seed
  // `args` from docgen, so an unstated default shows in the props
  // table with nothing selected in its control.
  args: {
    intent: "accent",
    isDisabled: false,
    isLabelVisible: false,
    isReadOnly: false,
    isValueShown: false,
    max: 100,
    min: 0,
    size: "md",
    step: 1,
  },
} satisfies Meta<typeof RangeSlider>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: "Clip",
    max: 2_700,
    value: { end: 1_500, start: 600 },
    valueFormat: toClock,
  },
}

export const AllVariants: Story = {
  args: { label: "Clip" },
  render: (controlProps) => (
    <StorySection title="Three heights off the density axis, and the six intents on the span.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell
            align="stretch"
            key={size}
            label={size}
          >
            <RangeSlider
              {...controlProps}
              label={`Clip at ${size}`}
              size={size}
              value={{ end: 75, start: 25 }}
            />
          </StoryCell>
        ))}
      </StoryGrid>

      <StoryGrid columns={3}>
        {(
          [
            "accent",
            "success",
            "warning",
            "danger",
            "info",
            "neutral",
          ] as const
        ).map((intent) => (
          <StoryCell
            align="stretch"
            key={intent}
            label={intent}
          >
            <RangeSlider
              {...controlProps}
              intent={intent}
              label={`Clip, ${intent}`}
              value={{ end: 75, start: 25 }}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The two states worth looking at twice are the collapsed range and
 * the read-only one.
 *
 * A collapsed range is what the crossing rule produces: a thumb
 * dragged past its partner stops **on** it rather than swapping with
 * it, so both handles sit on one value and the span has zero width. It
 * is reachable, it is legal, and it opens again from whichever side
 * the next press lands on.
 *
 * `isReadOnly` is not `isDisabled`. A read-only range keeps full
 * contrast and stays focusable, so both ends are still readable by a
 * screen reader.
 */
export const AllStates: Story = {
  args: { label: "Clip" },
  render: (controlProps) => (
    <StorySection title="What varies is the span, and whether it can be changed.">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="the whole range">
          <RangeSlider
            {...controlProps}
            label="Everything"
            value={{ end: 100, start: 0 }}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="collapsed — both thumbs on one value"
        >
          <RangeSlider
            {...controlProps}
            label="Collapsed"
            value={{ end: 50, start: 50 }}
          />
        </StoryCell>

        <StoryCell align="stretch" label="disabled">
          <RangeSlider
            {...controlProps}
            isDisabled
            label="Disabled"
            value={{ end: 70, start: 30 }}
          />
        </StoryCell>

        <StoryCell align="stretch" label="read-only">
          <RangeSlider
            {...controlProps}
            isReadOnly
            label="Read-only"
            value={{ end: 70, start: 30 }}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="label and span shown"
        >
          <RangeSlider
            {...controlProps}
            isLabelVisible
            isValueShown
            label="Section"
            max={2_700}
            value={{ end: 1_500, start: 600 }}
            valueFormat={toClock}
          />
        </StoryCell>

        <StoryCell align="stretch" label="with tick marks">
          <RangeSlider
            {...controlProps}
            isLabelVisible
            isValueShown
            label="Chapters"
            max={2_700}
            ticks={chapters}
            value={{ end: 1_500, start: 600 }}
            valueFormat={toClock}
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The bar fills whatever box it is given and both thumbs stay on their
 * values at every width. Nothing here is a media query — a range
 * slider in a 240px rail and one in a 544px panel are the same
 * component.
 */
export const Responsive: Story = {
  args: { label: "Clip" },
  render: (controlProps) => (
    <ContainerBoard>
      {(width) => (
        <RangeSlider
          {...controlProps}
          isLabelVisible
          isValueShown
          label={`Section at ${width}`}
          max={2_700}
          ticks={chapterMarks}
          value={{ end: 1_500, start: 600 }}
          valueFormat={toClock}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * The complete keyboard path. Tab reaches **each** thumb — the start
 * first, then the end — and on either of them:
 *
 * - **Arrow Left / Down** and **Arrow Right / Up** move one `step`
 * - **Page Down / Page Up** move one `largeStep`, ten steps by default
 * - **Home** and **End** go as far as this thumb may go, which is the
 *   range's own end or the other thumb, whichever comes first
 *
 * A press anywhere on the bar picks up the **nearer** thumb, moves it
 * there and starts a drag. The drag keeps reporting after the pointer
 * leaves the bar vertically, and the thumb it picked up is the thumb
 * it keeps moving — even once the pointer has travelled past the other
 * one.
 */
export const Interactive: Story = {
  args: { label: "Clip" },
  render: (controlProps) => (
    <StorySection title="Drive either thumb with the keyboard, or press anywhere on the bar.">
      <LiveRangeSlider
        {...controlProps}
        initialValue={{ end: 1_500, start: 600 }}
        isLabelVisible
        isValueShown
        label="Clip"
        max={2_700}
        step={30}
        ticks={chapters}
        valueFormat={toClock}
      />
    </StorySection>
  ),
}

/**
 * The two side by side, which is the claim `../sliderStyles.ts` makes
 * in prose: one bar, painted once.
 *
 * What differs is the focus model, and it is the reason these are two
 * components rather than one with a boolean. `Slider` puts
 * `role="slider"`, the tab stop and the pointer target on the
 * **track**, because one track reports one value. Two values cannot
 * live on one accessible object, so here the role moves to the thumbs
 * and the track becomes a `group` that carries the name.
 */
export const BesideTheSlider: Story = {
  args: { label: "Clip" },
  render: (controlProps) => (
    <StorySection title="The same bar. One value on the track, or two on their own handles.">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="Slider">
          <Slider
            intent={controlProps.intent}
            isLabelVisible
            label="Position"
            size={controlProps.size}
            value={55}
          />
        </StoryCell>

        <StoryCell align="stretch" label="RangeSlider">
          <RangeSlider
            intent={controlProps.intent}
            isLabelVisible
            label="Section"
            size={controlProps.size}
            value={{ end: 75, start: 25 }}
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}
