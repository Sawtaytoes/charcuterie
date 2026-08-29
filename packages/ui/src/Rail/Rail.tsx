import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { toClassName } from "../toClassName.ts"

export type RailLandmark = "complementary" | "navigation"

export type RailSide = "end" | "start"

export type RailProps = ComponentPropsWithRef<"aside"> & {
  label: string
  landmark?: RailLandmark
  side?: RailSide
}

const LANDMARK_ELEMENT: Record<
  RailLandmark,
  "aside" | "nav"
> = {
  complementary: "aside",
  navigation: "nav",
}

/**
 * A side rail — the nav column, the filter panel, the drive list.
 *
 * `side` places it, `landmark` decides what it *is*, and `label`
 * is required for a reason: two unnamed rails in one page are two
 * landmarks of the same type with no way to tell them apart, which
 * is axe's `landmark-unique` and, more to the point, is a screen
 * reader announcing "complementary" twice. It is also what makes
 * the rail scopeable — `getByRole("navigation", { name: "Sections" })`
 * disambiguates a "Settings" link that also exists in the header.
 *
 * ## It collapses without duplicating itself
 *
 * Below `md` the shell is one column and the rail becomes a
 * horizontally-scrolling strip above (`side="start"`) or below
 * (`side="end"`) the content. Above it, the rail is a fixed-width
 * column in the grid.
 *
 * **The same element, restyled — not a second copy.** The fleet's
 * habit is to render the whole thing twice behind `hidden` and
 * `lg:hidden`: mux-magic's `PageHeader` does it across two ~55-line
 * blocks and mail-sifter's `TriageQueue` does it again. The cost is
 * not bytes, it is that every control exists **twice in the DOM at
 * every viewport** — so tests must be defensively scoped, an agent
 * driving the page finds two of each button and cannot tell which
 * is the visible one, and the two copies drift.
 *
 * A media query gets the whole job done here because only the
 * rail's *position* changes, never its contents. plex-channels'
 * `App.tsx` shows the pattern for when that is not true — a
 * `useMediaQuery` over `matchMedia` through `useSyncExternalStore`,
 * mounting exactly one instance and relocating it — and it is
 * strictly more machinery for the same guarantee, so it is not what
 * this component uses.
 *
 * The `md` breakpoint is 48rem, which is `screen.md`: Tailwind v4's
 * default `--breakpoint-*` scale and this repo's `screen.*` scale
 * carry the same five values, so `md:` and the token agree by
 * construction rather than by coincidence maintained by hand.
 *
 * ## The narrow strip scrolls itself
 *
 * `overflow-x-auto` on the rail is what keeps a twelve-item nav
 * from widening the *page* at 390px: the overflow is contained in
 * an element that scrolls, which is the sanctioned answer for
 * content that genuinely cannot wrap. `min-w-0` is on it for the
 * same reason `Shell`'s middle track is `minmax(0, 1fr)` — a flex
 * or grid child's automatic minimum is its content, and one long
 * unbroken string otherwise pushes the whole layout out of the
 * viewport.
 */
export const Rail = ({
  children,
  className,
  label,
  landmark = "complementary",
  side = "start",
  ...railProps
}: RailProps): ReactNode => {
  const Element = LANDMARK_ELEMENT[landmark]

  return (
    <Element
      {...railProps}
      aria-label={label}
      className={toClassName(
        "flex min-w-0 gap-2 overflow-x-auto border-border-subtle p-4 md:row-start-2 md:min-h-0 md:w-64 md:flex-col md:overflow-x-visible",
        side === "start"
          ? "row-start-2 border-b md:col-start-1 md:border-b-0 md:border-e"
          : "row-start-4 border-t md:col-start-3 md:border-t-0 md:border-s",
        className,
      )}
    >
      {children}
    </Element>
  )
}
