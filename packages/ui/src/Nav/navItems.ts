import type { ReactNode } from "react"

export type NavItem = {
  /**
   * Where it goes. Routed through the injected `RouterLink` when it
   * is this app's own path, and left to the platform when it is not.
   */
  href: string
  /** Decoration beside the label. Never the accessible name. */
  icon?: ReactNode
  /**
   * A destination outside this app. It renders a plain anchor with
   * `target="_blank"` and `rel="noopener noreferrer"`, and it is
   * never current — pushing `https://…` onto a router's history
   * navigates the app to a route it does not have.
   */
  isExternal?: boolean
  /** Defaults to `href`, which is already unique in a nav. */
  key?: string
  /** The visible text, and the accessible name. */
  label: string
}

/**
 * What the rail layouts take. `icon` stops being optional, because
 * `railIcons` takes the **label** away: an item with no glyph is a
 * blank square that still navigates, and there is no visual defect
 * to notice because the row reads as padding.
 *
 * Optional would move that failure out of the type checker and into
 * the first time somebody drags a window narrow. The library still
 * ships no icons — a glyph in a default renders as nothing where the
 * font lacks it, so the app brings its own.
 */
export type NavRailItem = NavItem & {
  icon: ReactNode
}

export const getNavItemKey = (item: NavItem): string =>
  item.key ?? item.href

/**
 * Which destination the reader is on — the rule behind
 * `aria-current="page"`, kept pure so it can be checked in Node.
 *
 * The library is router-agnostic (see `RouterLinkProvider`), so it
 * cannot ask a router which link is active. The app hands it one
 * string — `useLocation().pathname`, `window.location.pathname`,
 * whatever it has — and this decides the rest.
 *
 * ## A parent path is current for its children
 *
 * `/tasks` is current while the reader is on `/tasks/41`, because a
 * nav item names a **section** and a section does not stop being the
 * one you are in when you open something inside it. The match is on
 * whole segments: `/task` is *not* current for `/tasks`, which a bare
 * `startsWith` would get wrong.
 *
 * ## `/` is exact, and that is deliberately not react-router
 *
 * react-router's `<NavLink to="/">` is active on **every** route
 * unless the caller remembers `end`, which is the footgun behind
 * every "why is Home always highlighted" bug in the fleet. The root
 * matches only itself here, and there is no prop to change it: a nav
 * with two current items is a nav that has stopped saying anything.
 *
 * ## The query string and the fragment are not part of the answer
 *
 * `/backlog?focus=search` is still the Backlog. Sorting a list does
 * not move the reader to a different destination.
 *
 * ⚠️ **This answers for ONE item, so it cannot keep the promise in
 * the paragraph above by itself.** Given `/settings` and
 * `/settings/labels`, it says `true` for both on the deeper path.
 * `resolveActiveKey` is the whole-list answer, and it is what `Nav`
 * uses; reach for this one only when there is a single link to test.
 */
const toComparablePath = (href: string): string => {
  const path = href.split(/[#?]/u)[0] ?? ""

  // A trailing slash is the same place, so it must not change the
  // answer — but `/` itself has to survive being trimmed.
  return path.length > 1 ? path.replace(/\/+$/u, "") : path
}

export const getIsCurrentHref = ({
  currentHref,
  href,
}: {
  /** Where the reader is. `undefined` means "nothing is current". */
  currentHref: string | undefined
  /** Where this destination goes. */
  href: string
}): boolean => {
  if (currentHref === undefined) {
    return false
  }

  const current = toComparablePath(currentHref)

  const target = toComparablePath(href)

  if (target === "" || target === "/") {
    return current === target
  }

  return (
    current === target || current.startsWith(`${target}/`)
  )
}

/**
 * The current destination's key, or `null` — the whole-list answer,
 * and the one `Nav` marks with `aria-current="page"`.
 *
 * ## Exactly one, because the deepest match wins
 *
 * `getIsCurrentHref` is asked per item, so a nav holding both
 * `/settings` and `/settings/labels` gets `true` twice while the
 * reader is on the deeper one. Two current items is a nav that has
 * stopped saying anything — the same thing react-router's `<NavLink
 * to="/">` footgun produces — so the longest matching path wins and
 * the shallower section stands down.
 *
 * Longest by **path**, not by array position: an app must be able to
 * list its destinations in the order the product reads (Docket's is
 * the pipeline) without that order deciding which one lights up.
 *
 * ## An external item is never current
 *
 * It is not a place inside this app, so no address the app is at can
 * be it. Without this, an item pointing at `https://example.com/board`
 * matches the app's own `/board` on a plain string compare.
 */
export const resolveActiveKey = (
  items: readonly NavItem[],
  activeHref?: string,
): string | null => {
  if (activeHref === undefined) {
    return null
  }

  let matchedItem: NavItem | null = null

  let matchedLength = -1

  for (const item of items) {
    if (item.isExternal === true) {
      continue
    }

    if (
      !getIsCurrentHref({
        currentHref: activeHref,
        href: item.href,
      })
    ) {
      continue
    }

    const candidateLength = toComparablePath(
      item.href,
    ).length

    if (candidateLength > matchedLength) {
      matchedItem = item

      matchedLength = candidateLength
    }
  }

  return matchedItem === null
    ? null
    : getNavItemKey(matchedItem)
}
