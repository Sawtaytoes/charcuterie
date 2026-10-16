import { expect, test } from "vitest"

import {
  buildCommandPaletteSections,
  type CommandPaletteItem,
  type CommandPaletteSectionsOptions,
} from "./commandPaletteSections.ts"

const ITEMS: readonly CommandPaletteItem[] = [
  { group: "Apps", key: "photos", title: "Photo Server" },
  {
    group: "Apps",
    key: "media",
    title: "Media Server",
    weight: 5,
  },
  {
    group: "Bookmarks",
    key: "servers",
    title: "Server Room Camera",
  },
  { group: "Apps", key: "spare", title: "Spare Server" },
  { key: "loose", title: "Serving Sizes" },
]

const build = (
  overrides: Partial<CommandPaletteSectionsOptions>,
) =>
  buildCommandPaletteSections({
    formatPrefixTitle: (label, query) =>
      `${label}: ${query}`,
    items: ITEMS,
    prefixGroupLabel: "Search a site",
    prefixes: [
      {
        getHref: (query) =>
          `https://auction.example.com/?q=${query}`,
        label: "Auction Site",
        prefix: "au",
      },
    ],
    query: "",
    suggestions: [],
    ungroupedLabel: "Results",
    ...overrides,
  })

const summarize = (
  sections: ReturnType<typeof buildCommandPaletteSections>,
) =>
  sections.map(({ label, rows }) => [
    label,
    rows.map(({ item }) => item.title),
  ])

test("nothing typed lists the suggestions, skipping an empty group", () => {
  const sections = build({
    query: "   ",
    suggestions: [
      {
        items: [ITEMS[0] as CommandPaletteItem],
        key: "pinned",
        label: "Pinned",
      },
      {
        items: [],
        key: "recent",
        label: "Recently opened",
      },
    ],
  })

  expect(summarize(sections)).toStrictEqual([
    ["Pinned", ["Photo Server"]],
  ])
})

test("groups are ordered by their best member, so the first row is the best match", () => {
  // `Server Room Camera` starts with the query, so its group leads even
  // though `Apps` comes first in the list.
  expect(summarize(build({ query: "ser" }))).toStrictEqual([
    ["Bookmarks", ["Server Room Camera"]],
    ["Results", ["Serving Sizes"]],
    [
      "Apps",
      ["Media Server", "Photo Server", "Spare Server"],
    ],
  ])
})

test("maxResultsPerGroup caps each heading separately", () => {
  expect(
    summarize(
      build({ maxResultsPerGroup: 1, query: "server" }),
    ),
  ).toStrictEqual([
    ["Bookmarks", ["Server Room Camera"]],
    ["Apps", ["Media Server"]],
  ])
})

test("the fallback row comes last, under its own group, with the trimmed query", () => {
  const sections = build({
    getFallbackItem: (query) => ({
      group: "The web",
      key: "web",
      title: `Search the web for ${query}`,
    }),
    query: "  zebra  ",
  })

  expect(summarize(sections)).toStrictEqual([
    ["The web", ["Search the web for zebra"]],
  ])
})

test("a prefix command is the only row, and its link and onSelect get the rest of the query", () => {
  const chosen: string[] = []

  const sections = build({
    getFallbackItem: () => ({
      key: "web",
      title: "never shown",
    }),
    prefixes: [
      {
        getHref: (query) =>
          `https://auction.example.com/?q=${query}`,
        label: "Auction Site",
        onSelect: (query) => chosen.push(query),
        prefix: "au",
      },
    ],
    query: "AU lego set",
  })

  expect(summarize(sections)).toStrictEqual([
    ["Search a site", ["Auction Site: lego set"]],
  ])

  const item = sections[0]?.rows[0]?.item

  expect(item?.href).toBe(
    "https://auction.example.com/?q=lego set",
  )

  item?.onSelect?.()

  expect(chosen).toStrictEqual(["lego set"])
})

test("a prefix with nothing after it is searched as text", () => {
  expect(summarize(build({ query: "au " }))).toStrictEqual(
    [],
  )
})
