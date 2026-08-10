import {
  type ComponentPropsWithRef,
  type ReactNode,
  useContext,
} from "react"

import {
  type ContentWidth,
  DEFAULT_CONTENT_WIDTH,
  toMaxInlineSize,
} from "../Shell/contentWidth.ts"
import { ShellContext } from "../Shell/shellContext.ts"
import { toClassName } from "../toClassName.ts"

export type HeaderProps =
  ComponentPropsWithRef<"header"> & {
    actions?: ReactNode
    contentWidth?: ContentWidth
    heading?: string
    headingLevel?: 1 | 2
    isSticky?: boolean
  }

/**
 * The page header — the `<header>` landmark, the app's name, and
 * the controls that belong to the frame rather than to the page.
 *
 * **`isSticky` defaults to true, and it sets `position` as well as
 * `z-index`.** That pairing is the whole point. mux-magic's
 * `PageHeader` is documented as a sticky header and sets only
 * `z-index` (`PageHeader.tsx:173`) — it is a flex-column shell that
 * scrolls away like any other block, and the z-index it carries
 * has nothing to stack against. The bug is invisible: the CSS is
 * valid, the intent is stated in a comment, and nobody scrolls a
 * component in a review. Here the two cannot come apart, because
 * one boolean writes both.
 *
 * The z-index is `--layer-sticky` from the token scale, never a
 * hand-picked number. The fleet's headers currently sit at `z-40`
 * (mail-sifter, points-market), `z-50` (rip-deck), `z-10`
 * (spoolbuddy) and `z-[100]` (mux-magic), with no ordering
 * guarantee between a header and anything else — which is exactly
 * what the scale exists to settle: `sticky` (100) is below
 * `dropdown` (200), `modal` (400) and `toast` (500), so a menu
 * opened *from* the header paints over it.
 *
 * ## The width comes from `Shell`
 *
 * The `<header>` itself is full-bleed — the border and the
 * translucent fill run edge to edge — and only its **inner row** is
 * capped, which is what makes a constrained header look right on an
 * ultrawide. That cap is `Shell`'s `contentWidth`, not a second
 * opinion: see `shellContext.ts` for the shipped app whose header
 * and `<main>` disagree by 80rem.
 *
 * ## No invented colours
 *
 * `bg-surface-raised/85` + `backdrop-blur-md` + `border-border-subtle`.
 * The fleet's copy of this line is `bg-surface-base/90`, which puts
 * the header at the *same* colour as the page behind it and leans
 * entirely on the blur to separate them — so it vanishes against a
 * page that is not scrolled. `raised` means *more separated from
 * base*, which is the role this element actually wants.
 */
export const Header = ({
  actions,
  children,
  className,
  contentWidth,
  heading,
  headingLevel = 1,
  isSticky = true,
  ...headerProps
}: HeaderProps): ReactNode => {
  const shell = useContext(ShellContext)

  const Heading = `h${headingLevel}` as const

  const maxInlineSize = toMaxInlineSize(
    contentWidth ??
      shell?.contentWidth ??
      DEFAULT_CONTENT_WIDTH,
  )

  return (
    <header
      {...headerProps}
      className={toClassName(
        "col-span-full row-start-1 border-border-subtle border-b bg-surface-raised/85 backdrop-blur-md",
        isSticky && "sticky top-0 z-[var(--layer-sticky)]",
        className,
      )}
    >
      <div
        className="mx-auto flex w-full min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:px-6"
        style={{ maxInlineSize }}
      >
        {heading ? (
          <Heading className="min-w-0 truncate font-semibold text-lg leading-tight">
            {heading}
          </Heading>
        ) : null}

        {children ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {children}
          </div>
        ) : null}

        {actions ? (
          <div className="ms-auto flex shrink-0 items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}
