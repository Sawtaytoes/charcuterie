import type {
  ColorSchemeApplier,
  ColorSchemePersistence,
  ColorSchemeResolver,
} from "@charcuterie/logic"
import { useColorScheme } from "@charcuterie/logic"
import {
  dataSchemeApplier,
  localStoragePersistence,
  matchMediaResolver,
} from "@charcuterie/logic/browser"
import type { ReactNode } from "react"
import { useState } from "react"

import type {
  ColorSchemeIcons,
  ColorSchemeToggleProps,
} from "../ColorSchemeToggle/ColorSchemeToggle.tsx"
import { ColorSchemeToggle } from "../ColorSchemeToggle/ColorSchemeToggle.tsx"

export type ColorSchemeSwitcherProps = Pick<
  ColorSchemeToggleProps,
  | "appearance"
  | "className"
  | "isDisabled"
  | "label"
  | "order"
  | "size"
> & {
  /** Override where the resolved scheme is written. Default `<html>`. */
  apply?: ColorSchemeApplier
  icons: ColorSchemeIcons
  /** Override persistence. Default `localStorage` under `storageKey`. */
  persistence?: ColorSchemePersistence
  /**
   * Override the OS resolver. Default `matchMedia`. This is the seam
   * the image-viewer passes Electron `nativeTheme` into, and a
   * future React-Native app passes `Appearance` — the whole reason
   * the browser dependency is isolated to this one layer.
   */
  resolver?: ColorSchemeResolver
  storageKey?: string
}

/**
 * The connected colour-scheme switcher — Layer 3, and the only
 * layer that touches the browser.
 *
 * It is a thin wrapper: it wires `useColorScheme` to the three
 * browser defaults from `@charcuterie/logic/browser`
 * (`matchMedia` + `localStorage` + `data-scheme` on `<html>`), and
 * renders the presentational `ColorSchemeToggle`. Every seam is
 * overridable, so a non-browser host swaps `resolver`/`persistence`/
 * `apply` and the same component drives Electron or React-Native.
 *
 * The seams are built once (lazy `useState`) so the `matchMedia`
 * query and the core survive re-renders and StrictMode's double
 * mount.
 */
export const ColorSchemeSwitcher = ({
  apply,
  icons,
  order,
  persistence,
  resolver,
  storageKey,
  ...toggleProps
}: ColorSchemeSwitcherProps): ReactNode => {
  const [seams] = useState(() => ({
    apply: apply ?? dataSchemeApplier(),
    persistence:
      persistence ?? localStoragePersistence(storageKey),
    resolver: resolver ?? matchMediaResolver(),
  }))

  const { cycle, mode } = useColorScheme({
    ...seams,
    order,
  })

  return (
    <ColorSchemeToggle
      {...toggleProps}
      icons={icons}
      mode={mode}
      onCycle={cycle}
      order={order}
    />
  )
}
