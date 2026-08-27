import { expect, test } from "vitest"

import type { NavItem } from "./navItems.ts"
import {
  getIsCurrentHref,
  resolveActiveKey,
} from "./navItems.ts"

const isCurrent = (currentHref: string, href: string) =>
  getIsCurrentHref({ currentHref, href })

const toItems = (...hrefs: string[]): NavItem[] =>
  hrefs.map((href) => ({ href, label: href }))

test("a destination is current on its own path", () => {
  expect(isCurrent("/backlog", "/backlog")).toBe(true)

  expect(isCurrent("/backlog", "/board")).toBe(false)
})

test("a parent path is current for its children", () => {
  expect(isCurrent("/tasks/41", "/tasks")).toBe(true)

  expect(isCurrent("/tasks/41/edit", "/tasks")).toBe(true)
})

test("a partial segment is not a match", () => {
  // The separator is part of the rule. A bare `startsWith` lights
  // two unrelated destinations here.
  expect(isCurrent("/tasks", "/task")).toBe(false)

  expect(isCurrent("/backlogged", "/backlog")).toBe(false)

  expect(isCurrent("/boardgames", "/board")).toBe(false)
})

test("the root is exact", () => {
  expect(isCurrent("/", "/")).toBe(true)

  // `/` prefixes every path in the app, so a permissive root would
  // mark Home current on every screen.
  expect(isCurrent("/backlog", "/")).toBe(false)
})

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

test("no current path marks nothing", () => {
  expect(
    getIsCurrentHref({ currentHref: undefined, href: "/" }),
  ).toBe(false)
})

test("resolveActiveKey answers the key, and defaults it to the href", () => {
  expect(
    resolveActiveKey(toItems("/", "/board"), "/board"),
  ).toBe("/board")

  expect(
    resolveActiveKey(
      [{ href: "/board", key: "board", label: "Board" }],
      "/board",
    ),
  ).toBe("board")
})

test("no address means nothing is current", () => {
  expect(resolveActiveKey(toItems("/", "/board"))).toBe(
    null,
  )
})

test("an address no destination owns marks nothing", () => {
  expect(
    resolveActiveKey(toItems("/", "/board"), "/nowhere"),
  ).toBe(null)
})

/**
 * The defect this function exists for. `getIsCurrentHref` is asked
 * once per item and says `true` for both of these, which is two
 * `aria-current="page"` in one nav — a nav that has stopped saying
 * anything.
 */
test("the deepest match wins, so exactly one item is current", () => {
  expect(isCurrent("/settings/labels", "/settings")).toBe(
    true,
  )

  expect(
    resolveActiveKey(
      toItems("/settings", "/settings/labels"),
      "/settings/labels",
    ),
  ).toBe("/settings/labels")
})

test("the deepest match wins regardless of array order", () => {
  // Longest by path, not by position: an app lists its destinations
  // in the order the product reads, and that order must not decide
  // which one lights up.
  expect(
    resolveActiveKey(
      toItems("/settings/labels", "/settings"),
      "/settings/labels",
    ),
  ).toBe("/settings/labels")
})

test("a parent is still current for a child it alone owns", () => {
  expect(
    resolveActiveKey(
      toItems("/settings", "/settings/labels"),
      "/settings/schemes",
    ),
  ).toBe("/settings")
})

test("an external destination is never current", () => {
  // Without this, an external item pointing at another product's
  // `/board` matches this app's own `/board`.
  expect(
    resolveActiveKey(
      [
        {
          href: "https://example.com/board",
          isExternal: true,
          label: "Elsewhere",
        },
        { href: "/board", label: "Board" },
      ],
      "/board",
    ),
  ).toBe("/board")

  expect(
    resolveActiveKey(
      [
        {
          href: "/board",
          isExternal: true,
          label: "Elsewhere",
        },
      ],
      "/board",
    ),
  ).toBe(null)
})
