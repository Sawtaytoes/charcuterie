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
import { Slider } from "./Slider.tsx"

/** mm:ss, the format a scrubber actually wants. */
const toClock = (seconds: number): string => {
  const whole = Math.max(0, Math.round(seconds))

  const mins = Math.floor(whole / 60)

  const secs = whole % 60

  return `${mins}:${String(secs).padStart(2, "0")}`
}

/**
 * A controlled Slider that owns its own value, which is what every real
 * call site is. The stories that only paint use the plain component.
 */
const LiveSlider = ({
  initialValue = 40,
  ...sliderProps
}: {
  initialValue?: number
} & Omit<
  Parameters<typeof Slider>[0],
  "onChange" | "value"
>): ReturnType<typeof Slider> => {
  const [value, setValue] = useState(initialValue)

  return (
    <Slider
      {...sliderProps}
      onChange={setValue}
      value={value}
    />
  )
}

const meta = {
  title: "Components/Controls/Slider",
  component: Slider,
  parameters: { layout: "padded" },
  argTypes: {
    intent: intentArgType,
    size: controlSizeArgType,
  },
  // The component's own defaults, restated — Storybook does not seed
  // `args` from docgen, so an unstated default shows in the props table
  // with nothing selected in its control.
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
} satisfies Meta<typeof Slider>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: "Volume", value: 40 },
}

export const AllVariants: Story = {
  args: { label: "Volume" },
  render: (controlProps) => (
    <StorySection title="Three heights off the density axis, and the six intents on the fill.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell
            align="stretch"
            key={size}
            label={size}
          >
            <Slider
              {...controlProps}
              label={`Volume at ${size}`}
              size={size}
              value={55}
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
            <Slider
              {...controlProps}
              intent={intent}
              label={`Volume, ${intent}`}
              value={55}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * `isReadOnly` is not `isDisabled`. A read-only slider keeps full
 * contrast and stays focusable, so its value is still readable and
 * still reachable by a screen reader — a live stream's position, where
 * the number matters and seeking is not offered.
 */
export const AllStates: Story = {
  args: { label: "Volume" },
  render: (controlProps) => (
    <StorySection title="What varies is the value, and whether it can be changed.">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="at the minimum">
          <Slider
            {...controlProps}
            label="Empty"
            value={0}
          />
        </StoryCell>

        <StoryCell align="stretch" label="at the maximum">
          <Slider
            {...controlProps}
            label="Full"
            value={100}
          />
        </StoryCell>

        <StoryCell align="stretch" label="disabled">
          <Slider
            {...controlProps}
            isDisabled
            label="Disabled"
            value={35}
          />
        </StoryCell>

        <StoryCell align="stretch" label="read-only">
          <Slider
            {...controlProps}
            isReadOnly
            label="Read-only"
            value={35}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="label and value shown"
        >
          <Slider
            {...controlProps}
            isLabelVisible
            isValueShown
            label="Position"
            max={2_700}
            value={1_274}
            valueFormat={toClock}
          />
        </StoryCell>

        <StoryCell align="stretch" label="a coarse step">
          <Slider
            {...controlProps}
            isValueShown
            label="Rating"
            max={5}
            step={1}
            value={3}
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The track is the widget, so it fills whatever box it is given and the
 * thumb stays on the value at every width. Nothing here is a media
 * query — a slider in a 320px rail and one in a 960px panel are the
 * same component.
 */
export const Responsive: Story = {
  args: { label: "Volume" },
  render: (controlProps) => (
    <ContainerBoard>
      <Slider
        {...controlProps}
        isLabelVisible
        isValueShown
        label="Position"
        max={2_700}
        value={1_274}
        valueFormat={toClock}
      />
    </ContainerBoard>
  ),
}

/**
 * The complete keyboard path. Tab reaches the track, then:
 *
 * - **Arrow Left / Down** and **Arrow Right / Up** move one `step`
 * - **Page Down / Page Up** move one `largeStep`, ten steps by default
 * - **Home** and **End** go to `min` and `max`
 *
 * A pointer press anywhere on the row jumps the thumb there and starts
 * a drag, and the drag keeps reporting after the pointer leaves the bar
 * vertically — the track takes pointer capture, so a thumb dragged off
 * the bar does not stop dead at the boundary.
 */
export const Interactive: Story = {
  args: { label: "Volume" },
  render: (controlProps) => (
    <StorySection title="Drive it with the keyboard, or press anywhere on the row.">
      <LiveSlider
        {...controlProps}
        initialValue={40}
        isLabelVisible
        isValueShown
        label="Volume"
      />
    </StorySection>
  ),
}
