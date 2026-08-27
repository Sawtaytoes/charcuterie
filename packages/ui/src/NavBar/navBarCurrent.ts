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
