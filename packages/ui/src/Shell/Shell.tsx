import { useUniqueId } from "@charcuterie/logic"
import {
  type ComponentPropsWithRef,
  type ReactNode,
  useMemo,
} from "react"

import { toClassName } from "../toClassName.ts"
import {
  type ContentWidth,
  DEFAULT_CONTENT_WIDTH,
} from "./contentWidth.ts"
import { ShellContext } from "./shellContext.ts"

export type ShellProps = ComponentPropsWithRef<"div"> & {
  contentWidth?: ContentWidth
  skipLinkLabel?: string
}

/**
 * The page frame: one `Header`, up to two `Rail`s, one `Main`.
 *
 * **The largest duplicated surface in the fleet.** Ten of twelve UI
 * repos hand-roll this, and three of them have a file literally
 * called `AppShell.tsx` — mail-sifter's and points-market's headers
 * are a **byte-identical** string
 * (`sticky top-0 z-40 border-b border-border-subtle bg-surface-base/90 backdrop-blur-md`),
 * arrived at independently, and board-games' is the same structure
 * with `sticky` dropped. The remaining seven spell it as
 * `PageChrome`, `Header`, `DashboardHeader`, `Layout` (twice),
 * `TitleBar`, and inline in `App.tsx`.
 *
 * Three things fall out of owning it once, and each is a bug
 * somewhere in that list today:
 *
 *  - **A skip link.** All ten are missing one. A keyboard user
 *    tabs through the whole header on every page.
 *  - **One width, not two.** `Header` and `Main` read the same
 *    `contentWidth` through context — see `shellContext.ts` for
 *    the app where they disagree.
 *  - **Sticky that is actually sticky.** mux-magic's `PageHeader`
 *    is *described* as sticky and sets only `z-index`; it never
 *    sets `position: sticky`, so the z-index does nothing and the
 *    header scrolls away. `Header`'s `isSticky` sets both or
 *    neither.
 *
 * ## The layout is one grid, and the rails do not duplicate
 *
 * Three columns at `md` and up — `auto minmax(0, 1fr) auto`, so an
 * absent rail is a **zero-width track** rather than a conditional
 * subtree — collapsing to a single column below it, where the
 * children simply stack in DOM order. The same `Rail` element is
 * in the document at every width; nothing is rendered twice behind
 * `hidden`/`lg:hidden`.
 *
 * That matters beyond tidiness. mux-magic's `PageHeader` renders
 * its entire control set twice (lines 290–345 and 356–410) and
 * mail-sifter's `TriageQueue` does the same, so every action
 * exists twice in the DOM at every viewport: tests have to be
 * defensively scoped with `within(toolbar)`, and any agent driving
 * the page sees phantom controls it cannot click.
 *
 * `minmax(0, 1fr)` on the middle track is the horizontal-scroll
 * fix, not a formality. A grid track's automatic minimum is
 * `min-content`, so **one long unbroken string in `Main` widens
 * the whole page** — which is the bug plex-channels' narrow view
 * has today. rip-deck's `BayGrid` documents the same fix from the
 * other end.
 *
 * There is no `gap`: an empty `auto` track is 0 wide, but a `gap`
 * beside it is not, so a shell with no rails would carry two
 * mystery gutters. `Rail` and `Main` bring their own padding.
 */
export const Shell = ({
  children,
  className,
  contentWidth = DEFAULT_CONTENT_WIDTH,
  skipLinkLabel = "Skip to main content",
  ...divProps
}: ShellProps): ReactNode => {
  const mainId = useUniqueId()

  const shellContext = useMemo(
    () => ({ contentWidth, mainId }),
    [contentWidth, mainId],
  )

  return (
    <ShellContext.Provider value={shellContext}>
      <div
        {...divProps}
        className={toClassName(
          "grid min-h-dvh grid-cols-1 grid-rows-[auto_auto_1fr_auto] bg-surface-base text-content-primary md:grid-cols-[auto_minmax(0,1fr)_auto] md:grid-rows-[auto_1fr]",
          className,
        )}
      >
        {/*
          Hidden by transform rather than by `sr-only`, because
          `focus-visible:not-sr-only` and `focus-visible:fixed`
          both write `position` and which one wins is decided by
          Tailwind's internal property order, not by the order they
          are written in. A translate is one property, and a
          keyboard user's first Tab landing on a visible control is
          the entire feature.

          `--layer-toast` rather than `--layer-sticky`: it has to
          out-rank the header it is offering to skip past.
        */}
        <a
          className="fixed top-0 start-0 z-[var(--layer-toast)] m-3 -translate-y-24 rounded-md border border-border-subtle bg-surface-raised px-3 py-2 font-medium text-content-primary text-sm shadow-medium focus-visible:translate-y-0"
          href={`#${mainId}`}
        >
          {skipLinkLabel}
        </a>

        {children}
      </div>
    </ShellContext.Provider>
  )
}
