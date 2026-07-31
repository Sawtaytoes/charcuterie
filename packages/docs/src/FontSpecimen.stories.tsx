import type { Meta, StoryObj } from "@storybook/react"

import { FontSpecimen } from "./FontSpecimen.tsx"

/**
 * The M5 font bake-off. Charcuterie ships no typeface today —
 * `defaultTypography.fontFamily.sans` is a pure system stack and no
 * variant overrides it — so the design system currently renders in
 * Segoe on the Windows boxes and Roboto on the Pis, which is to say
 * it has no typographic opinion at all.
 *
 * These five blocks are that decision, made visible. Nothing here is
 * wired into `@charcuterie/tokens`: the faces are self-hosted under
 * `packages/docs/public/fonts`, the pairings are a preview-scope
 * stylesheet, and `--font-display` is invented in that stylesheet
 * rather than added to `TypographyTokens`. Picking a winner is what
 * promotes it.
 */
const meta = {
  title: "Tokens/Fonts",
  component: FontSpecimen,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof FontSpecimen>

export default meta

type Story = StoryObj<typeof meta>

/** All five pairings, dark, at desk density. */
export const Default: Story = {}

/**
 * The same page light. Type behaves differently across the two
 * schemes — a face that looks crisp as light-on-dark can read
 * noticeably heavier as dark-on-light, and the display faces are
 * where that shows first.
 */
export const Light: Story = {
  globals: { theme: "light" },
}

/**
 * Kiosk density: the HyperPixel and xander, read across a room.
 * This is the condition that punishes a low-contrast or
 * fine-stroked display face, and the one where Bricolage's wonk
 * either reads as character or as a rendering fault.
 */
export const Kiosk: Story = {
  globals: { density: "kiosk" },
}

/**
 * Compact: ripdeck's 16-bay list and mux-magic's sequence log, at
 * desk distance. The body face has to hold up at the small step
 * here — this is where Source Sans 3's narrower set width and
 * Inter's tall x-height actually differ.
 */
export const Compact: Story = {
  globals: { density: "compact" },
}
