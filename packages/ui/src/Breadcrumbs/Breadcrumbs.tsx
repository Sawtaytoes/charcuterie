import type { Key, ReactNode } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { TextLink } from "../TextLink/TextLink.tsx"
import { toClassName } from "../toClassName.ts"

/**
 * One rung of the trail.
 *
 * Which of the three it becomes is read off the fields it carries, so
 * a caller mapping a path to items never has to say what the rung
 * *is* — only where it goes:
 *
 *  - `href` — a real `<a href>`, through `TextLink`, so an in-app path
 *    goes through the injected router exactly as every other link in
 *    the library does.
 *  - `onSelect` and no `href` — a `<button>` painted as the same link.
 *    For a trail over state that has no URL: image-viewer's folder
 *    path and mux-magic's file-explorer modal both move a browser
 *    around a disk without touching the address bar.
 *  - neither — plain text. On the **last** item that is the current
 *    page, and it carries `aria-current="page"`.
 */
export type BreadcrumbItem = {
  href?: string
  /**
   * React's list key. Optional, because `label` is a node and cannot
   * be one; the fallback is `href`, then the position. Pass it when
   * two rungs can share an `href` or the trail reorders.
   */
  key?: Key
  label: ReactNode
  /**
   * Runs on activation. With an `href` it runs alongside the
   * navigation (closing a drawer, say); without one it IS the
   * navigation.
   */
  onSelect?: () => void
}

export type BreadcrumbsProps = {
  className?: string
  items: readonly BreadcrumbItem[]
  /**
   * The `<nav>` landmark's name. Two trails on one page need two
   * different names, or axe's `landmark-unique` fails.
   */
  label?: string
  /**
   * Drawn between rungs, always `aria-hidden`. The default is a
   * chevron drawn in CSS borders rather than a `›` character: the
   * library ships no symbol glyphs in a default, because a font that
   * lacks one paints nothing
   * (`docs/decisions/2026-07-29-ship-no-icons-and-no-symbol-glyphs.md`).
   * Folio's `/` is a fine override — it is the app's choice to make.
   */
  separator?: ReactNode
}

/**
 * The link paint without the `<a>`: `TextLink`'s standalone look,
 * restated for the `onSelect` rung so a button crumb and a link crumb
 * are indistinguishable at rest, on hover, and under focus.
 */
const BUTTON_CRUMB_CLASS =
  "inline cursor-pointer rounded-xs border-0 bg-transparent p-0 text-start font-medium text-intent-accent-content underline-offset-2 hover:underline"

/**
 * `wrap-anywhere` on every label, and no `truncate`: a trail that cuts
 * a folder name to `Office Sh…` hides the one word the reader came to
 * find. A long unbroken segment — a hash, a file name — breaks inside
 * itself instead of pushing the row wider than its container.
 */
const LABEL_CLASS = "min-w-0 wrap-anywhere"

/**
 * Right-pointing in a left-to-right page, left-pointing in a
 * right-to-left one: the two borders are logical (`border-e`), and the
 * rotation flips with the direction so the corner always points the
 * way the trail reads.
 */
const DEFAULT_SEPARATOR = (
  <span className="inline-block size-1.5 shrink-0 rotate-45 border-e-[1.5px] border-t-[1.5px] border-current rtl:-rotate-45" />
)

const getItemKey = (
  item: BreadcrumbItem,
  index: number,
): Key => item.key ?? item.href ?? index

/**
 * A path back up a hierarchy: `Places › Office › Office Shelves`.
 *
 * Folio, image-viewer and mux-magic each hand-rolled one, and they
 * disagreed on everything a shared shape should settle — one was a
 * `<nav>` of bare links with no list, two were `<div>`s of buttons
 * with no landmark, one truncated the current segment, one gave the
 * current folder no `aria-current`. This is the WAI-ARIA APG
 * breadcrumb pattern: a `<nav>` landmark around an `<ol>`, because
 * the order is the meaning.
 *
 * The current page is the **last item with nowhere to go**. A trail
 * that sits above a heading already naming the page — Whereabouts'
 * `Places › Office` over an `Office Shelves` heading — gives every
 * item an `href`, and then no rung is current, which is correct: the
 * page is named once, by the heading.
 */
export const Breadcrumbs = ({
  className,
  items,
  label = "Breadcrumb",
  separator,
}: BreadcrumbsProps): ReactNode => (
  <nav aria-label={label} className={className}>
    <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-content-secondary text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        const isCurrent =
          isLast &&
          item.href === undefined &&
          item.onSelect === undefined

        return (
          <li
            className="inline-flex min-w-0 items-center gap-x-2"
            key={getItemKey(item, index)}
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="inline-flex shrink-0 items-center text-content-muted"
              >
                {separator ?? DEFAULT_SEPARATOR}
              </span>
            ) : null}

            {item.href !== undefined ? (
              <TextLink
                appearance="standalone"
                className={LABEL_CLASS}
                href={item.href}
                onClick={item.onSelect}
              >
                {item.label}
              </TextLink>
            ) : item.onSelect !== undefined ? (
              <button
                className={toClassName(
                  BUTTON_CRUMB_CLASS,
                  FOCUS_RING_CLASS,
                  LABEL_CLASS,
                )}
                onClick={item.onSelect}
                type="button"
              >
                {item.label}
              </button>
            ) : (
              <span
                aria-current={
                  isCurrent ? "page" : undefined
                }
                className={toClassName(
                  LABEL_CLASS,
                  isCurrent
                    ? "font-medium text-content-primary"
                    : undefined,
                )}
              >
                {item.label}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  </nav>
)
