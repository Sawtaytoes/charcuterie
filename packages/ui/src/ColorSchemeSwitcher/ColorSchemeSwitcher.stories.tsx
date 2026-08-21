import type {
  ColorSchemePersistence,
  ColorSchemeResolver,
  ResolvedColorScheme,
} from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import { useRef, useState } from "react"
import type { ColorSchemeIcons } from "../ColorSchemeToggle/ColorSchemeToggle.tsx"
import {
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "../icons.storyHelpers.tsx"
import { ColorSchemeSwitcher } from "./ColorSchemeSwitcher.tsx"

const ICONS: ColorSchemeIcons = {
  dark: <MoonIcon />,
  light: <SunIcon />,
  system: <MonitorIcon />,
}

/**
 * A controllable stand-in for `matchMedia` — the same shape Electron
 * `nativeTheme` and RN `Appearance` satisfy. The stories inject it
 * instead of the real one so the board never reads the CI machine's
 * OS setting and never writes `localStorage`.
 */
const makeFakeResolver = (
  initial: ResolvedColorScheme,
): ColorSchemeResolver => ({
  get: () => initial,
  subscribe: () => () => {},
})

const inMemoryPersistence = (): ColorSchemePersistence => {
  let value:
    | Parameters<ColorSchemePersistence["write"]>[0]
    | null = null

  return {
    read: () => value,
    write: (mode) => {
      value = mode
    },
  }
}

/**
 * Drives a **scoped** demo: the switcher writes `data-scheme` onto
 * this panel rather than `<html>`, so the surrounding Storybook
 * chrome is untouched and the effect is contained and visible. In a
 * real app the default `apply` targets `<html>`.
 */
const ScopedSwitcherDemo = () => {
  const panelRef = useRef<HTMLDivElement>(null)

  const [seams] = useState(() => ({
    persistence: inMemoryPersistence(),
    resolver: makeFakeResolver("dark"),
  }))

  return (
    <div
      className="inline-flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-base p-3 text-content-primary"
      data-scheme="dark"
      ref={panelRef}
    >
      <ColorSchemeSwitcher
        apply={(resolvedScheme) => {
          panelRef.current?.setAttribute(
            "data-scheme",
            resolvedScheme,
          )
        }}
        icons={ICONS}
        persistence={seams.persistence}
        resolver={seams.resolver}
      />

      <span className="text-sm text-content-secondary">
        This panel follows the switcher.
      </span>
    </div>
  )
}

const meta = {
  title: "Utilities/ColorSchemeSwitcher",
  component: ColorSchemeSwitcher,
  parameters: { layout: "padded" },
  // The three injected seams are functions/objects, not values a
  // Controls panel can render — `react-docgen` sees them as opaque
  // names from `@charcuterie/logic`. Disabled explicitly rather than
  // left to fall through to the object control.
  argTypes: {
    apply: { control: false },
    persistence: { control: false },
    resolver: { control: false },
  },
  args: {
    icons: ICONS,
  },
} satisfies Meta<typeof ColorSchemeSwitcher>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Connected: the switcher builds its own state through
 * `useColorScheme` and applies the resolved scheme. Here the OS
 * resolver and persistence are injected fakes and the applier is
 * scoped to the demo panel, which is exactly how a non-browser host
 * (Electron `nativeTheme`) wires it — by replacing those seams.
 */
export const Default: Story = {
  render: () => <ScopedSwitcherDemo />,
}
