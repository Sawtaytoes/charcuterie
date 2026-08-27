import { expect, test } from "vitest"

import { getIsCurrentHref } from "./navBarCurrent.ts"

const isCurrent = (currentHref: string, href: string) =>
  getIsCurrentHref({ currentHref, href })

test("a destination is current on its own path", () => {
  expect(isCurrent("/backlog", "/backlog")).toBe(true)

  expect(isCurrent("/backlog", "/board")).toBe(false)
})

/**
 * A nav item names a **section**, and a section does not stop being
 * the one you are in when you open something inside it.
 */
test("a parent path is current for its children", () => {
  expect(isCurrent("/tasks/41", "/tasks")).toBe(true)

  expect(isCurrent("/tasks/41/edit", "/tasks")).toBe(true)
})

/**
 * The match is on whole segments. A bare `startsWith` marks `/task`
 * as current for `/tasks`, which is a highlight on the wrong item
 * and nothing to see in a review.
 */
test("a partial segment is not a match", () => {
  expect(isCurrent("/tasks", "/task")).toBe(false)

  expect(isCurrent("/backlogged", "/backlog")).toBe(false)
})

/**
 * react-router's `<NavLink to="/">` is active on every route unless
 * the caller remembers `end` — the footgun behind every "why is Home
 * always highlighted" bug. The root matches only itself here, and
 * there is no prop to change it.
 */
test("the root is exact", () => {
  expect(isCurrent("/", "/")).toBe(true)

  expect(isCurrent("/backlog", "/")).toBe(false)
})

/**
 * Sorting a list does not move the reader to a different
 * destination.
 */
test("the query string and the fragment are not part of the answer", () => {
  expect(
    isCurrent("/backlog?focus=search", "/backlog"),
  ).toBe(true)

  expect(isCurrent("/backlog#top", "/backlog")).toBe(true)

  expect(
    isCurrent("/backlog", "/backlog?focus=search"),
  ).toBe(true)
})

test("a trailing slash is the same place", () => {
  expect(isCurrent("/backlog/", "/backlog")).toBe(true)

  expect(isCurrent("/backlog", "/backlog/")).toBe(true)
})

/**
 * `undefined` is what a caller passes when it does not know, and the
 * honest reading of that is that nothing is current — not that
 * everything is.
 */
test("no current path marks nothing", () => {
  expect(
    getIsCurrentHref({
      currentHref: undefined,
      href: "/backlog",
    }),
  ).toBe(false)
})
