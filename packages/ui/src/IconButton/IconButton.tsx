import type { ReactNode } from "react"

import type { ButtonProps } from "../Button/Button.tsx"
import { Button } from "../Button/Button.tsx"

export type IconButtonProps = Omit<
  ButtonProps,
  | "aria-label"
  | "children"
  | "iconEnd"
  | "iconStart"
  | "sizing"
> & {
  /**
   * Required, and this single line is most of the component's
   * reason to exist. `label` cannot be defaulted, cannot be
   * omitted, and is not a `ReactNode` — it becomes `aria-label`,
   * which is a string by specification.
   */
  label: string
  /** The glyph. Anything — lucide, an inline SVG, a character. */
  children: ReactNode
}

/**
 * Three repos, three strategies, and **none of them names the
 * button**: mux-magic hand-writes five SVG components, castkit
 * keeps an `ICON_PATHS` map, and plex-channels renders raw glyphs
 * (`↶`, `↷`, `▶`, `⚙`, `≡`) straight into a `<button>`. A screen
 * reader reads the last of those as "↶", and
 * `getByRole("button", { name: "Undo" })` finds nothing at all —
 * which is the concrete reason the fleet is not agent-drivable
 * today.
 *
 * So the type system asks for the name. There is no way to render
 * this component without one, and `expectAgentDrivable` in the
 * story proves the name is the one Playwright will match on.
 *
 * **No icons ship here.** The library does not own an icon set —
 * lucide (ISC) is the fleet recommendation — so `children` is
 * whatever the app already has, and the icon is `aria-hidden` by
 * virtue of the `aria-label` overriding the subtree name.
 */
export const IconButton = ({
  children,
  label,
  ...buttonProps
}: IconButtonProps): ReactNode => (
  <Button {...buttonProps} aria-label={label} sizing="icon">
    <span aria-hidden="true" className="contents">
      {children}
    </span>
  </Button>
)
