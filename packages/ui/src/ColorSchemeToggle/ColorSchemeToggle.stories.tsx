import type { ColorSchemeMode } from "@charcuterie/logic"
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
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import {
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "../icons.storyHelpers.tsx"
import type { ColorSchemeIcons } from "./ColorSchemeToggle.tsx"
import { ColorSchemeToggle } from "./ColorSchemeToggle.tsx"

/**
 * The library ships **no icons** — these are the story-only
 * hand-drawn SVGs an app would replace with lucide `Sun` / `Moon` /
 * `Monitor`.
 */
const ICONS: ColorSchemeIcons = {
  dark: <MoonIcon />,
  light: <SunIcon />,
  system: <MonitorIcon />,
}

const meta = {
  title: "Components/ColorSchemeToggle",
  component: ColorSchemeToggle,
  parameters: { layout: "padded" },
  argTypes: {
    intent: intentArgType,
    // `mode` is `ColorSchemeMode` from @charcuterie/logic — a bare
    // specifier docgen cannot enumerate, so it gets an explicit
    // radio rather than falling through to the object control.
    mode: {
      control: "radio",
      options: ["light", "dark", "system"],
    },
    size: controlSizeArgType,
  },
  args: {
    appearance: "ghost",
    icons: ICONS,
    intent: "neutral",
    isDisabled: false,
    mode: "system",
    onCycle: () => {},
    size: "md",
  },
} satisfies Meta<typeof ColorSchemeToggle>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Controlled and self-contained: this story owns the mode in local
 * state and advances it on each press, which is what a plain
 * consumer wires up. `<ColorSchemeSwitcher>` wires the same
 * `onCycle` to the `useColorScheme` hook instead.
 *
 * The accessible name states the current mode and the next one, so
 * it changes as the button cycles — that is what the test asserts.
 */
export const Default: Story = {
  render: (toggleProps) => {
    const [mode, setMode] =
      useState<ColorSchemeMode>("system")

    return (
      <ColorSchemeToggle
        {...toggleProps}
        mode={mode}
        onCycle={setMode}
      />
    )
  },
}

/**
 * Each mode's icon, held fixed so the three glyphs are visible at
 * once — light is the sun, dark the moon, system the monitor.
 */
export const AllModes: Story = {
  render: (toggleProps) => (
    <StorySection title="light → dark → system, the order a press cycles through.">
      <StoryGrid columns={3}>
        <StoryCell label="light">
          <ColorSchemeToggle
            {...toggleProps}
            mode="light"
            onCycle={() => {}}
          />
        </StoryCell>

        <StoryCell label="dark">
          <ColorSchemeToggle
            {...toggleProps}
            mode="dark"
            onCycle={() => {}}
          />
        </StoryCell>

        <StoryCell label="system">
          <ColorSchemeToggle
            {...toggleProps}
            mode="system"
            onCycle={() => {}}
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The tone is **neutral by default** — a scheme switcher is toolbar
 * chrome, so its ghost hover is `hover:bg-intent-neutral-surface` and
 * its icon `text-intent-neutral-content`, which read as chrome on a
 * normal surface rather than as an accent action. A consumer that
 * wants it to draw attention passes `intent="accent"` (or any tone).
 */
export const Intents: Story = {
  render: (toggleProps) => (
    <StorySection title="neutral (default) vs an explicit accent override.">
      <StoryGrid columns={2}>
        <StoryCell label="intent=neutral (default)">
          <ColorSchemeToggle
            {...toggleProps}
            intent="neutral"
            mode="system"
            onCycle={() => {}}
          />
        </StoryCell>

        <StoryCell label="intent=accent">
          <ColorSchemeToggle
            {...toggleProps}
            intent="accent"
            mode="system"
            onCycle={() => {}}
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

export const Sizes: Story = {
  render: (toggleProps) => (
    <StorySection title="Square on the control height, so it lines up with the buttons beside it in a toolbar.">
      <StoryRow>
        <ColorSchemeToggle
          {...toggleProps}
          mode="light"
          onCycle={() => {}}
          size="sm"
        />

        <ColorSchemeToggle
          {...toggleProps}
          mode="dark"
          onCycle={() => {}}
          size="md"
        />

        <ColorSchemeToggle
          {...toggleProps}
          mode="system"
          onCycle={() => {}}
          size="lg"
        />
      </StoryRow>
    </StorySection>
  ),
}

export const Responsive: Story = {
  render: (toggleProps) => (
    <ContainerBoard>
      <StoryRow>
        <ColorSchemeToggle
          {...toggleProps}
          mode="system"
          onCycle={() => {}}
        />
      </StoryRow>
    </ContainerBoard>
  ),
}
