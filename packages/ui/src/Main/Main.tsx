import { useUniqueId } from "@charcuterie/logic"
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

export type MainProps = ComponentPropsWithRef<"main"> & {
  contentWidth?: ContentWidth
}

/**
 * The `<main>` landmark and the content column.
 *
 * ## The width is the whole component
 *
 * The owner's complaint, verbatim:
 *
 * > "All these apps seem to be really narrow with a very large
 * > max-width. By that I mean 1 column, but waaaaaaay too wide. In
 * > almost all cases, what I really want is something like Rip-Deck
 * > where the app has a narrower main column but the wrapping grids
 * > are all full-width in most of these apps only when you have too
 * > many items."
 *
 * That is two requirements, and they pull opposite ways: a
 * **narrow** column by default, which **widens** when the content
 * is a grid with enough items to justify it. A fixed `max-w-7xl`
 * answers neither — it is too wide for the one-column case, which
 * is the complaint, and it is a hard ceiling on the many-items
 * case.
 *
 * So the cap is a *value*, not a constant, and it arrives from
 * three places in priority order: this component's own
 * `contentWidth`, then `Shell`'s (the usual answer, so the header
 * matches), then `screen.lg`.
 *
 * ### How it composes with the adaptive-columns hook
 *
 * rip-deck's `useLayoutColumns` — being lifted into this library
 * separately — decides a column count from the viewport and folds
 * it into a page cap with `contentMaxWidthRem(columns)`: 1 column →
 * 56rem, 2 → 72rem, 3 → 106rem. It returns a **number of rem**, and
 * `ContentWidth` accepts `` `${number}rem` `` for exactly this:
 *
 * ```tsx
 * const { columns } = useLayoutColumns({ cardCount: bays.length })
 *
 * <Shell contentWidth={`${contentMaxWidthRem(columns)}rem`}>
 *   <Header heading="Rip Deck" />
 *   <Main>
 *     <BayGrid columns={columns} />
 *   </Main>
 * </Shell>
 * ```
 *
 * The seam is deliberately one prop and no hook import: this
 * package must not depend on a layout hook to lay out a page, and
 * the hook must not know that a `Shell` exists. Putting the value
 * on `Shell` rather than on `Main` is what keeps the header's cap
 * in step with the column's as the count changes.
 *
 * ## `@container`, and what `contain: inline-size` costs
 *
 * The content column establishes a container query, so an app's
 * grids inside it respond to **the column's** width rather than
 * the window's — a poster grid beside an open rail and the same
 * grid full-bleed are the pair a media query cannot tell apart,
 * and getting it wrong at intermediate widths is what the fleet's
 * grids do today.
 *
 * `container-type: inline-size` implies `contain: layout style
 * inline-size`, and both halves have consequences worth stating:
 *
 *  - **The element may not be sized by its own contents.** Here
 *    that is free and in fact wanted: the column has a definite
 *    inline size from its parent — itself a grid item with
 *    `minmax(0, 1fr)` — so wide content can no longer widen it,
 *    which is half of why the page does not scroll sideways.
 *  - **`contain: layout` makes it a containing block for
 *    `position: fixed` descendants.** An app rendering a fixed
 *    element *inside* `Main` gets it positioned against the
 *    column, not the viewport. Every overlay in this library
 *    portals to `document.body` and is therefore unaffected
 *    ([decision](../../../../docs/decisions/2026-08-03-overlays-portal-to-the-body-not-the-top-layer.md));
 *    an app's own fixed chrome belongs in `Shell`, beside `Main`
 *    rather than in it.
 *
 * ## Two more things it does, both one line
 *
 * `tabIndex={-1}` so `Shell`'s skip link moves **focus** and not
 * merely the reading cursor — without it, Safari and Firefox scroll
 * to `<main>` and leave the next Tab back in the header.
 *
 * `wrap-anywhere` so an unbroken string — a filesystem path, a
 * hash, a URL — wraps instead of widening the page.
 *
 * **`anywhere`, not `break-word`, and the difference is the whole
 * point.** Both break a long word onto the next line, so they look
 * identical in a screenshot. Only `anywhere` also shrinks the
 * element's **min-content size** — which is what a flex or grid
 * item's automatic minimum resolves against, and therefore what
 * decides whether the string can push its own column wider. With
 * `break-word` the ink wraps while the intrinsic contribution
 * stays the full length of the token, so the layout above it can
 * still be forced open. This is the second of the two overflow
 * sources found in plex-channels, and the nastier one: it produces
 * **no overflowing element box at all**, so every
 * `getBoundingClientRect()` in a test reads clean while the page
 * scrolls sideways.
 *
 * It is the cheap half of the horizontal-scroll fix; the other
 * halves are `minmax(0, 1fr)` and `overflow-x: clip` in `Shell`. A
 * `<table>` is the one thing none of them can save: tables do not
 * wrap, so a wide one goes in an `overflow-x-auto` wrapper, which
 * `Main.mdx` shows.
 */
export const Main = ({
  children,
  className,
  contentWidth,
  id,
  ...mainProps
}: MainProps): ReactNode => {
  const shell = useContext(ShellContext)

  // Always called, never conditionally: a `Main` outside a `Shell`
  // still needs an id an app can point its own skip link at.
  const fallbackId = useUniqueId()

  const maxInlineSize = toMaxInlineSize(
    contentWidth ??
      shell?.contentWidth ??
      DEFAULT_CONTENT_WIDTH,
  )

  return (
    <main
      {...mainProps}
      className={toClassName(
        "col-start-1 row-start-3 min-w-0 md:col-start-2 md:row-start-2",
        className,
      )}
      id={id ?? shell?.mainId ?? fallbackId}
      tabIndex={-1}
    >
      {/*
        `@container` is on the **capped column**, not on `<main>`,
        and the difference is not cosmetic. `<main>` is as wide as
        its grid track — 1184px beside an open rail on a 1440px
        window — while the column inside it is capped at
        `contentWidth`. Declaring the container on `<main>` makes
        every `cq-*` inside answer to a width the content never
        has: a grid would go three-up at `--cq-xl` while sitting in
        976px of space. The container has to be the box the content
        is actually laid out in.
      */}
      <div
        className="@container mx-auto flex w-full min-w-0 flex-col gap-6 wrap-anywhere px-4 py-6 sm:px-6"
        style={{ maxInlineSize }}
      >
        {children}
      </div>
    </main>
  )
}
