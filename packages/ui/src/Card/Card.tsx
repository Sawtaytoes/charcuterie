import { useUniqueId } from "@charcuterie/logic"
import type {
  ElevationStep,
  SurfaceRole,
} from "@charcuterie/tokens"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { toClassName } from "../toClassName.ts"

export type CardSurface = Extract<
  SurfaceRole,
  "base" | "raised" | "sunken"
>

export type CardPadding = "lg" | "md" | "none" | "sm"

export type CardProps = ComponentPropsWithRef<"section"> & {
  /** Buttons or a badge, laid out beside the heading. */
  actions?: ReactNode
  elevation?: ElevationStep
  footer?: ReactNode
  heading?: string
  headingLevel?: 2 | 3 | 4
  padding?: CardPadding
  surface?: CardSurface
}

const SURFACE_CLASS: Record<CardSurface, string> = {
  base: "bg-surface-base",
  raised: "bg-surface-raised",
  sunken: "bg-surface-sunken",
}

/**
 * Exported only so the story can derive its `elevation` control from
 * the same map the component indexes — `ElevationStep` comes from
 * `@charcuterie/tokens`, which react-docgen will not follow, so the
 * options have to be stated and this is the one statement of them
 * that cannot drift.
 */
export const ELEVATION_CLASS: Record<
  ElevationStep,
  string
> = {
  none: "shadow-none",
  low: "shadow-low",
  medium: "shadow-medium",
  high: "shadow-high",
}

const PADDING_CLASS: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
}

/**
 * Five repos, and the reason this is a P0 rather than a nicety is
 * the `<section>`: give a card a heading and it becomes a landmark,
 * so `getByRole("region", { name: "Bay 3" })` scopes every
 * subsequent query to that card. Without it, an agent driving a
 * 16-bay tower has sixteen identical "Start" buttons and no way to
 * say which one it means.
 *
 * `aria-labelledby` rather than `aria-label`, because the heading is
 * on screen already and stating the name twice is how the two drift
 * apart.
 *
 * **Density is not a prop here.** mux-magic's inventory turned up a
 * `CardDensityProvider` in the withdrawn bambuddy evidence, and it
 * is the wrong shape for this fleet: density is a global axis on
 * `<html>`, so a compact bay list is `data-density="compact"` on the
 * page, not a context around the cards. `padding` remains a prop
 * because a card wrapping a poster grid genuinely has none, which is
 * a layout fact rather than a density one.
 */
export const Card = ({
  actions,
  children,
  className,
  elevation = "low",
  footer,
  heading,
  headingLevel = 2,
  padding = "md",
  surface = "raised",
  ...sectionProps
}: CardProps): ReactNode => {
  const headingId = useUniqueId()

  const Heading = `h${headingLevel}` as const

  return (
    <section
      {...sectionProps}
      aria-labelledby={heading ? headingId : undefined}
      className={toClassName(
        // `@container` here, not on a wrapper, is what lets the
        // header stack at narrow widths *inside a wide viewport* —
        // a card in a sidebar and the same card full-bleed are the
        // case a media query cannot tell apart, and the fleet's
        // poster grids get it wrong at intermediate widths today.
        "@container flex flex-col gap-3 rounded-lg border border-border-subtle text-content-primary",
        SURFACE_CLASS[surface],
        ELEVATION_CLASS[elevation],
        PADDING_CLASS[padding],
        className,
      )}
    >
      {heading || actions ? (
        <header className="flex flex-col gap-2 cq-sm:flex-row cq-sm:items-start cq-sm:justify-between">
          {heading ? (
            <Heading
              className="font-semibold text-md leading-tight"
              id={headingId}
            >
              {heading}
            </Heading>
          ) : null}

          {actions ? (
            <div className="flex shrink-0 items-center gap-1">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}

      {children}

      {footer ? (
        <footer className="border-t border-border-subtle pt-3 text-content-secondary text-sm">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}
