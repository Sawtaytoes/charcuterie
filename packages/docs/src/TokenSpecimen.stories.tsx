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
 * The M0 bake-off, still switchable — `daylight` won, and the other
 * three are live `data-variant` values rather than deleted files.
 * Each was built for a **viewing condition**, so each one's story
 * says which; the full comparison is on `Tokens/Overview`.
 *
 * **`hairline` — a lot of rows, at desk distance.** Separation is a
 * 1px border and a small surface step, never a shadow, and motion is
 * 120ms and flat. For a surface that is mostly a list — ripdeck's
 * 16-bay tower, mux-magic's sequence log — where `daylight` at
 * `data-density="compact"` still feels loose. Not for anything read
 * from further away: hairlines stop existing at kiosk distance, and
 * they are the only separation this direction has.
 */
export const Hairline: Story = {
  globals: { variant: "hairline" },
}

/**
 * **`layered` — across a room.** A real surface step plus a shadow,
 * 12–20px radii, 200–320ms springy motion, warm accent. The kiosk Pi
 * and xander, at two or three metres, with a finger or a remote;
 * pair it with `data-density="kiosk"`. Not for a dense list (it eats
 * vertical space) and never for ePaper, where shadow separation
 * collapses to nothing.
 */
export const Layered: Story = {
  globals: { variant: "layered" },
}

/**
 * **`legible` — bad conditions, or a person who needs the
 * headroom.** AAA-targeted (7:1) rather than AA, saturated intents,
 * drawn borders, a 3px focus ring. The garage tablet at 2am with a
 * rip failing, a display in direct sun, or whatever sits behind a
 * user-facing "high contrast" switch. Tiring over a long session —
 * when every state shouts, none of them does.
 *
 * It also has a job nobody chooses: it is the upper bound
 * `contrast.test.ts` measures `daylight` against, which is most of
 * why the three losing directions were kept.
 */
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
