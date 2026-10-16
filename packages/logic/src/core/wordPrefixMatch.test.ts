/**
 * The word-prefix rules, one per test. The fixtures are a generic
 * household launcher; the cases are the ones a launcher's owner
 * actually types — the start of a name, a later word, initials, a
 * keyword, and an accent he does not type.
 */

import { expect, test } from "vitest"

import {
  matchWordPrefixes,
  parsePrefixCommand,
  rankWordPrefixMatches,
  toQueryWords,
  WORD_PREFIX_TIERS,
} from "./wordPrefixMatch.ts"

const highlighted = (
  title: string,
  ranges: readonly { end: number; start: number }[],
) => ranges.map(({ end, start }) => title.slice(start, end))

test("the start of the title is the best match", () => {
  const match = matchWordPrefixes("med", {
    title: "Media Server",
  })

  expect(match?.tier).toBe(WORD_PREFIX_TIERS.titleStart)
  expect(
    highlighted("Media Server", match?.titleRanges ?? []),
  ).toStrictEqual(["Med"])
})

test("a later word of the title matches, one tier lower", () => {
  const match = matchWordPrefixes("serv", {
    title: "Media Server",
  })

  expect(match?.tier).toBe(WORD_PREFIX_TIERS.titleWords)
  expect(
    highlighted("Media Server", match?.titleRanges ?? []),
  ).toStrictEqual(["Serv"])
})

test("every typed word must start a word, in any order", () => {
  expect(
    matchWordPrefixes("serv med", { title: "Media Server" })
      ?.tier,
  ).toBe(WORD_PREFIX_TIERS.titleWords)

  expect(
    matchWordPrefixes("med x", { title: "Media Server" }),
  ).toBeNull()
})

test("letters inside a word do not match — this is not subsequence matching", () => {
  expect(
    matchWordPrefixes("edia", { title: "Media Server" }),
  ).toBeNull()

  // The subsequence trap: `ha` is in order inside all three.
  for (const title of [
    "Chat",
    "Shared Files",
    "Phone Charger",
  ]) {
    expect(matchWordPrefixes("ha", { title })).toBeNull()
  }
})

test("initials match an abbreviation of the title", () => {
  const match = matchWordPrefixes("ha", {
    title: "Home Automation",
  })

  expect(match?.tier).toBe(WORD_PREFIX_TIERS.titleInitials)
  expect(
    highlighted(
      "Home Automation",
      match?.titleRanges ?? [],
    ),
  ).toStrictEqual(["H", "A"])

  expect(
    matchWordPrefixes("rpm", {
      title: "Reverse Proxy Manager",
    })?.tier,
  ).toBe(WORD_PREFIX_TIERS.titleInitials)
})

test("one letter is never read as initials", () => {
  // `h` is a word prefix of `Home`, so it matches by that rule; the
  // initials rule needs two letters, or `a` would match every
  // `A… B…` title as well as every word starting with `a`.
  expect(
    matchWordPrefixes("a", { title: "Bulk Archive" })?.tier,
  ).toBe(WORD_PREFIX_TIERS.titleWords)

  expect(
    matchWordPrefixes("b", { title: "Home Automation" }),
  ).toBeNull()
})

test("a camel-case step starts a word, and the whole run still matches", () => {
  expect(
    matchWordPrefixes("bit", { title: "qBitTracker" })
      ?.tier,
  ).toBe(WORD_PREFIX_TIERS.titleWords)

  expect(
    matchWordPrefixes("qbit", { title: "qBitTracker" })
      ?.tier,
  ).toBe(WORD_PREFIX_TIERS.titleStart)

  expect(
    matchWordPrefixes("bird", { title: "BigBird" })?.tier,
  ).toBe(WORD_PREFIX_TIERS.titleWords)

  // An all-caps run is one word, not three.
  expect(
    matchWordPrefixes("pm", { title: "NPM" }),
  ).toBeNull()
})

test("a typed word never runs past the end of its word", () => {
  expect(
    matchWordPrefixes("mediaserver", {
      title: "Media Server",
    }),
  ).toBeNull()
})

test("description, folder and keywords match below every title hit, with no highlight", () => {
  const match = matchWordPrefixes("movies", {
    extra: ["Streams the movie and show library", "movies"],
    title: "Media Server",
  })

  expect(match).toStrictEqual({
    tier: WORD_PREFIX_TIERS.anyWords,
    titleRanges: [],
  })

  // Words may come from the title and the extra text together.
  expect(
    matchWordPrefixes("living rem", {
      extra: ["Remotes"],
      title: "Living Room",
    })?.tier,
  ).toBe(WORD_PREFIX_TIERS.anyWords)
})

test("case and accents are folded, and the highlight lands on the original characters", () => {
  const title = "Pokémon Évolutions"

  const match = matchWordPrefixes("pokemon evo", { title })

  expect(match?.tier).toBe(WORD_PREFIX_TIERS.titleStart)
  expect(
    highlighted(title, match?.titleRanges ?? []),
  ).toStrictEqual(["Pokémon", "Évo"])

  // The same title typed with separate combining accents.
  const decomposed = "Pokémon"

  const decomposedMatch = matchWordPrefixes("pokem", {
    title: decomposed,
  })

  expect(decomposedMatch?.tier).toBe(
    WORD_PREFIX_TIERS.titleStart,
  )
  expect(
    highlighted(
      decomposed,
      decomposedMatch?.titleRanges ?? [],
    ),
  ).toStrictEqual(["Pokém"])
})

test("two typed words on one title word merge into one range", () => {
  const match = matchWordPrefixes("med media", {
    title: "Media Server",
  })

  expect(match?.titleRanges).toStrictEqual([
    { end: 5, start: 0 },
  ])
})

test("punctuation separates words in the query and the title", () => {
  expect(toQueryWords("  home-automation  ")).toStrictEqual(
    ["home", "automation"],
  )

  expect(
    matchWordPrefixes("old", {
      title: "(Old) Media Server",
    })?.tier,
  ).toBe(WORD_PREFIX_TIERS.titleStart)
})

test("an empty query matches nothing", () => {
  expect(
    matchWordPrefixes("", { title: "Media Server" }),
  ).toBeNull()
  expect(
    matchWordPrefixes("  - ", { title: "Media Server" }),
  ).toBeNull()
})

test("ranking: tier first, then weight, then the caller's order", () => {
  const items = [
    { title: "Photo Server", weight: 0 },
    { title: "Server Room Camera", weight: 0 },
    { title: "Spare Server", weight: 9 },
    { title: "Sound System", weight: 0 },
    { extra: ["server"], title: "Backups", weight: 50 },
    { title: "Printer", weight: 0 },
  ]

  const ranked = rankWordPrefixMatches(
    items,
    "ser",
    (item) => item,
  )

  expect(
    ranked.map(({ item }) => item.title),
  ).toStrictEqual([
    "Server Room Camera",
    "Spare Server",
    "Photo Server",
    "Backups",
  ])

  expect(
    rankWordPrefixMatches(items, "ss", (item) => item).map(
      ({ item }) => item.title,
    ),
  ).toStrictEqual(["Spare Server", "Sound System"])
})

const TARGETS = [
  { label: "Auction Site", prefix: "au" },
  { label: "Video Site", prefix: "vi" },
]

test("a prefix command is the prefix, a space, and the rest", () => {
  expect(
    parsePrefixCommand("au  lego bricks ", TARGETS),
  ).toStrictEqual({
    query: "lego bricks",
    target: TARGETS[0],
  })

  expect(
    parsePrefixCommand("VI cats", TARGETS)?.target,
  ).toBe(TARGETS[1])
})

test("a prefix with nothing after it, or an unknown prefix, is not a command", () => {
  expect(parsePrefixCommand("au", TARGETS)).toBeNull()
  expect(parsePrefixCommand("au ", TARGETS)).toBeNull()
  expect(
    parsePrefixCommand("audio mixer", TARGETS),
  ).toBeNull()
  expect(parsePrefixCommand("zz lego", TARGETS)).toBeNull()
})
