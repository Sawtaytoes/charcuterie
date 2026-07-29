import type { Meta, StoryObj } from "@storybook/react"

import { TokenSpecimen } from "./TokenSpecimen.tsx"

const meta = {
  title: "Tokens/Specimen",
  component: TokenSpecimen,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TokenSpecimen>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

/**
 * The M0 bake-off, still switchable.
 *
 * `daylight` won and became the default, but the other three are
 * live `data-variant` values rather than deleted files — which is
 * the payoff for generating the board from token files instead of
 * drawing it. Switching the Variant toolbar here re-themes the
 * canvas with no re-render and no rebuild.
 */
export const Hairline: Story = {
  globals: { variant: "hairline" },
}

export const Layered: Story = {
  globals: { variant: "layered" },
}

export const Legible: Story = {
  globals: { variant: "legible" },
}

/**
 * Daylight is a light-first *direction*; the default *scheme*
 * stays dark. This story is the light half, and it exists so a
 * regression in the light palette fails a run rather than waiting
 * for somebody to flip the toolbar.
 */
export const Light: Story = {
  globals: { theme: "light" },
}

/**
 * The fix for a roomy variant on a dense list — ripdeck's bay
 * list is the case that will want it — is this attribute, not a
 * retheme.
 */
export const Compact: Story = {
  globals: { density: "compact" },
}

/** The HyperPixel and xander: finger and remote, across a room. */
export const Kiosk: Story = {
  globals: { density: "kiosk" },
}
