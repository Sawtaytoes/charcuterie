import type { ColorSchemeMode } from "@charcuterie/logic"
import {
  DEFAULT_COLOR_SCHEME_ORDER,
  nextColorSchemeMode,
} from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"

import { IconButton } from "../IconButton/IconButton.tsx"
import type { IntentAppearance } from "../intentStyles.ts"

/**
 * One `ReactNode` per mode. The library ships **no icons** — lucide
 * (ISC) is the fleet recommendation — so an app passes its own
 * `Sun` / `Moon` / `Monitor`, exactly as `IconButton` takes its
 * glyph as `children`
 * ([decision](../../../../docs/decisions/2026-07-29-ship-no-icons-and-no-symbol-glyphs.md)).
 */
export type ColorSchemeIcons = Record<
  ColorSchemeMode,
  ReactNode
>

export type ColorSchemeToggleProps = {
  appearance?: IntentAppearance
  className?: string
  icons: ColorSchemeIcons
  isDisabled?: boolean
  /**
   * Builds the accessible name from the current and next mode.
   * Default announces the current mode and where a press goes —
   * "Colour scheme: dark. Activate to switch to system." — so the
   * name updates as the control cycles and
   * `getByRole("button", { name: /colour scheme/i })` resolves.
   */
  label?: (
    mode: ColorSchemeMode,
    nextMode: ColorSchemeMode,
  ) => string
  mode: ColorSchemeMode
  /**
   * Called with the next mode on activation. **Controlled**: this
   * component stores nothing — it renders `mode` and reports intent,
   * which is what keeps it free of `matchMedia`/`document` and
   * usable in any runtime. `<ColorSchemeSwitcher>` wires this to the
   * `useColorScheme` hook; a plain consumer wires it to its own
   * state.
   */
  onCycle: (nextMode: ColorSchemeMode) => void
  order?: readonly ColorSchemeMode[]
  size?: ControlSize
}

const MODE_LABEL: Record<ColorSchemeMode, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
}

const defaultLabel = (
  mode: ColorSchemeMode,
  nextMode: ColorSchemeMode,
) =>
  `Colour scheme: ${MODE_LABEL[mode]}. Activate to switch to ${MODE_LABEL[nextMode]}.`

/**
 * The cycling colour-scheme button — light → dark → system → light.
 *
 * Layer 2 of the three: presentational and controlled, with no
 * browser coupling. It is an `IconButton`, so it inherits the one
 * rule that makes the fleet agent-drivable — a glyph is not a name,
 * and this control's name states the current mode rather than
 * leaving a screen reader to read a sun path as nothing.
 *
 * A *segmented* all-three-visible form was considered and deferred
 * (owner chose cycling-only, 2026-08-03); `icons` and `order` are
 * shaped so a `ColorSchemePicker` could join later without changing
 * this API.
 */
export const ColorSchemeToggle = ({
  appearance = "ghost",
  className,
  icons,
  isDisabled = false,
  label = defaultLabel,
  mode,
  onCycle,
  order = DEFAULT_COLOR_SCHEME_ORDER,
  size = "md",
}: ColorSchemeToggleProps): ReactNode => {
  const nextMode = nextColorSchemeMode(mode, order)

  return (
    <IconButton
      appearance={appearance}
      className={className}
      isDisabled={isDisabled}
      label={label(mode, nextMode)}
      onClick={() => {
        onCycle(nextMode)
      }}
      size={size}
    >
      {icons[mode]}
    </IconButton>
  )
}
