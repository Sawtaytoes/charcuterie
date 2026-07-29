import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect } from "storybook/test"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import { expectAgentDrivable } from "../testing/index.ts"
import { ProgressBar } from "./ProgressBar.tsx"
import type { ProgressThreshold } from "./progressValue.ts"

/** Green when finished, amber past 90% — the rip-deck case. */
const DISC_THRESHOLDS: ProgressThreshold[] = [
  { from: 90, intent: "warning" },
  { from: 100, intent: "success" },
]

const meta = {
  title: "Components/ProgressBar",
  component: ProgressBar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProgressBar>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: "Ripping title 4 of 9", value: 38 },
  play: async ({ canvas }) => {
    const bar = expectAgentDrivable(canvas, {
      name: "Ripping title 4 of 9",
      role: "progressbar",
    })

    // The name comes from a real `aria-labelledby` even though the
    // label is not printed, and the value is on the *track* — so an
    // agent's bounding box is the widget, not the filled 38%.
    await expect(bar).toHaveAttribute("aria-valuenow", "38")
    await expect(bar).toHaveAttribute(
      "aria-valuemax",
      "100",
    )
  },
}

export const AllVariants: Story = {
  args: { label: "Ripping", value: 62 },
  render: (progressProps) => (
    <StorySection title="Three track sizes, six intents, and the threshold colours nobody in the fleet has yet.">
      <StoryGrid columns={3}>
        <StoryCell align="stretch" label="sm">
          <ProgressBar {...progressProps} size="sm" />
        </StoryCell>

        <StoryCell align="stretch" label="md">
          <ProgressBar {...progressProps} size="md" />
        </StoryCell>

        <StoryCell align="stretch" label="lg">
          <ProgressBar {...progressProps} size="lg" />
        </StoryCell>

        <StoryCell align="stretch" label="intent=success">
          <ProgressBar
            {...progressProps}
            intent="success"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="thresholds · 94% → warning"
        >
          <ProgressBar
            {...progressProps}
            thresholds={DISC_THRESHOLDS}
            value={94}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="thresholds · 100% → success"
        >
          <ProgressBar
            {...progressProps}
            thresholds={DISC_THRESHOLDS}
            value={100}
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

export const AllStates: Story = {
  args: { label: "Ripping title 4 of 9" },
  render: (progressProps) => (
    <StoryGrid columns={2}>
      <StoryCell
        align="stretch"
        label="0% — empty, not unknown"
      >
        <ProgressBar {...progressProps} value={0} />
      </StoryCell>

      <StoryCell align="stretch" label="mid">
        <ProgressBar {...progressProps} value={47} />
      </StoryCell>

      <StoryCell align="stretch" label="complete">
        <ProgressBar
          {...progressProps}
          thresholds={DISC_THRESHOLDS}
          value={100}
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="indeterminate — no valuenow at all"
      >
        <ProgressBar {...progressProps} isIndeterminate />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="label + value visible"
      >
        <ProgressBar
          {...progressProps}
          isLabelVisible
          isValueShown
          value={47}
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="out of range (value=-5, max=0)"
      >
        <ProgressBar
          {...progressProps}
          max={0}
          value={-5}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

export const Indeterminate: Story = {
  args: {
    isIndeterminate: true,
    isLabelVisible: true,
    label: "Working — no measurable progress yet",
  },
  play: async ({ canvas }) => {
    const bar = expectAgentDrivable(canvas, {
      name: "Working — no measurable progress yet",
      role: "progressbar",
    })

    // "Unknown", not "zero". rip-deck's AACS/BD+ preamble is ~25 s
    // of a real Blu-ray emitting nothing: a full bar reads as a
    // finished rip, an empty one as a wedged drive.
    await expect(bar).not.toHaveAttribute("aria-valuenow")
    await expect(bar).toHaveAttribute("aria-busy", "true")
  },
}

export const Responsive: Story = {
  args: {
    isLabelVisible: true,
    isValueShown: true,
    label: "Ripping title 4 of 9 — Blade Runner (1982)",
    value: 47,
  },
  render: (progressProps) => (
    <ContainerBoard>
      <ProgressBar {...progressProps} />
    </ContainerBoard>
  ),
}

const SteppedProgressBar = () => {
  const [percent, setPercent] = useState(0)

  return (
    <div className="flex flex-col gap-3">
      <ProgressBar
        isLabelVisible
        isValueShown
        label="Ripping title 4 of 9"
        thresholds={DISC_THRESHOLDS}
        value={percent}
      />

      <StoryRow>
        <Button
          onClick={() => {
            setPercent((current) =>
              Math.min(100, current + 25),
            )
          }}
          size="sm"
        >
          Advance 25%
        </Button>

        <Button
          appearance="ghost"
          onClick={() => {
            setPercent(0)
          }}
          size="sm"
        >
          Reset
        </Button>
      </StoryRow>
    </div>
  )
}

/**
 * A progressbar is not focusable and has no keyboard path — the
 * contract it owes an agent is that `aria-valuenow` tracks what is
 * drawn. So the play function drives it to completion and asserts
 * exactly that, including the threshold flip at 100%.
 */
export const Interactive: Story = {
  args: { label: "Ripping title 4 of 9" },
  render: () => <SteppedProgressBar />,
  play: async ({ canvas, userEvent }) => {
    const bar = canvas.getByRole("progressbar")

    await expect(bar).toHaveAttribute("aria-valuenow", "0")

    const advance = canvas.getByRole("button", {
      name: "Advance 25%",
    })

    await userEvent.click(advance)
    await userEvent.click(advance)

    await expect(bar).toHaveAttribute("aria-valuenow", "50")
    await expect(canvas.getByText("50%")).toBeVisible()

    await userEvent.click(advance)
    await userEvent.click(advance)

    await expect(bar).toHaveAttribute(
      "aria-valuenow",
      "100",
    )

    // The 100% threshold turns the fill green, which is the
    // generalisation of rip-deck's `FILL_CLASS` keyed by rip state.
    await expect(
      bar.querySelector(".bg-intent-success-solid"),
    ).toBeInTheDocument()
  },
}
