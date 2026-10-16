/**
 * Word-prefix matching: the ranking a command palette or a launcher
 * filters by.
 *
 * Every typed word must be the START of a word in the text. That is
 * the whole rule, plus one extension — initials, so `ha` finds
 * `Home Assistant` — and a fixed order of tiers that decides which
 * hit ranks above which.
 *
 * ### Why not subsequence ("fuzzy") matching
 *
 * A subsequence matcher accepts any string whose letters appear in
 * order, so a two-letter query matches most of a 60-entry list:
 * `ha` hits `Chat`, `Shared`, and `Phone Charger` as well as
 * `Home Assistant`, and the ranking then has to undo the noise it
 * let in. Word starts are what people type into a launcher. The one
 * case a subsequence matcher is usually defended with — an
 * abbreviation — is what the initials tier covers, without letters
 * scattered anywhere in a word. See
 * `docs/decisions/2026-10-16-a-command-palette-matches-word-prefixes.md`.
 *
 * ### What counts as a word
 *
 * A run of letters and digits. A run also starts a new word at a
 * lowercase-to-uppercase step, so `qBittorrent` answers to `bit` and
 * `BigBird` to `bird` — and the run's own start still matches across
 * the step, so `qbit` and `bigb` work too.
 *
 * ### Case and accents are folded
 *
 * `pokemon` finds `Pokémon`. The fold works per code point and keeps
 * a map back to the original string, so a highlight range always
 * points at the characters the caller rendered.
 */

/** A half-open `[start, end)` range of UTF-16 indices into the title. */
export type TextMatchRange = {
  end: number
  start: number
}

export type WordPrefixMatchFields = {
  /**
   * Text that is matched but never highlighted: a description, a
   * folder name, keywords. A hit only here ranks below every title
   * hit.
   */
  extra?: readonly string[]
  title: string
}

/**
 * The tiers, best first. A higher number is a better match.
 *
 * - `titleStart` — every word matches the title, and the first typed
 *   word starts the title (`med` → `Media Server`).
 * - `titleWords` — every word starts a title word (`serv` →
 *   `Media Server`).
 * - `titleInitials` — one typed word, two letters or more, that the
 *   title's initials start with (`ms` → `Media Server`).
 * - `anyWords` — every typed word starts a word somewhere in the
 *   title or the extra text (`plex` → an item whose keyword is
 *   `plex`).
 */
export const WORD_PREFIX_TIERS = {
  anyWords: 1,
  titleInitials: 2,
  titleStart: 4,
  titleWords: 3,
} as const

export type WordPrefixTier =
  (typeof WORD_PREFIX_TIERS)[keyof typeof WORD_PREFIX_TIERS]

export type WordPrefixMatch = {
  tier: WordPrefixTier
  /** Sorted and non-overlapping; empty for an `anyWords` hit. */
  titleRanges: readonly TextMatchRange[]
}

type FoldedText = {
  /** The folded text, lowercase with marks removed. */
  folded: string
  /** `toOriginal[i]` is the original index of folded index `i`; one extra entry for the end. */
  toOriginal: readonly number[]
  /** Folded indices where a word starts, in order. */
  wordStarts: readonly number[]
  /** For each word start, the folded index where its run of letters and digits ends. */
  wordRunEnds: readonly number[]
}

const WORD_CHARACTER = /[\p{L}\p{N}]/u

const UPPERCASE = /\p{Lu}/u

const LOWERCASE_OR_DIGIT = /[\p{Ll}\p{N}]/u

const COMBINING_MARKS = /\p{M}/gu

const COMBINING_MARK = /^\p{M}$/u

const foldCharacter = (character: string): string =>
  character
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()

const foldText = (text: string): FoldedText => {
  let folded = ""
  const toOriginal: number[] = []
  const wordStarts: number[] = []
  const wordRunEnds: number[] = []

  let previous = ""
  let isInRun = false
  let runStartPositions: number[] = []

  const closeRun = () => {
    for (const _ of runStartPositions) {
      wordRunEnds.push(folded.length)
    }

    runStartPositions = []
  }

  let originalIndex = 0

  for (const character of text) {
    const isWordCharacter = WORD_CHARACTER.test(character)
    const foldedCharacter = foldCharacter(character)

    if (COMBINING_MARK.test(character)) {
      // An accent typed as its own code point (`e` + U+0301) belongs
      // to the letter before it: it neither starts a word nor ends one.
    } else if (isWordCharacter) {
      const isCamelStep =
        isInRun &&
        UPPERCASE.test(character) &&
        LOWERCASE_OR_DIGIT.test(previous)

      if (!isInRun || isCamelStep) {
        wordStarts.push(folded.length)
        runStartPositions.push(folded.length)
      }

      isInRun = true
    } else if (isInRun) {
      closeRun()
      isInRun = false
    }

    for (const foldedUnit of foldedCharacter) {
      toOriginal.push(originalIndex)
      folded += foldedUnit
    }

    if (!COMBINING_MARK.test(character)) {
      previous = character
    }

    originalIndex += character.length
  }

  if (isInRun) {
    closeRun()
  }

  toOriginal.push(originalIndex)

  return { folded, toOriginal, wordRunEnds, wordStarts }
}

/**
 * The typed words, folded the same way the text is. Anything that is
 * not a letter or a digit separates words, so `home-assistant` and
 * `home assistant` are the same query.
 */
export const toQueryWords = (query: string): string[] =>
  foldText(query)
    .folded.split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0)

/**
 * Where each typed word starts a word of the text, as folded
 * `[start, end)` ranges — or `null` when any typed word starts none.
 *
 * A typed word may run past the end of a camel-case part (`bigb` in
 * `BigBird`) but never past the end of its run of letters and digits.
 */
const findWordPrefixRanges = (
  text: FoldedText,
  queryWords: readonly string[],
): TextMatchRange[] | null => {
  const ranges: TextMatchRange[] = []

  for (const queryWord of queryWords) {
    const wordIndex = text.wordStarts.findIndex(
      (start, index) =>
        start + queryWord.length <=
          (text.wordRunEnds[index] ?? 0) &&
        text.folded.startsWith(queryWord, start),
    )

    if (wordIndex < 0) {
      return null
    }

    const start = text.wordStarts[wordIndex] ?? 0

    ranges.push({ end: start + queryWord.length, start })
  }

  return ranges
}

const toOriginalRanges = (
  text: FoldedText,
  ranges: readonly TextMatchRange[],
): TextMatchRange[] => {
  const mapped = ranges
    .map(({ end, start }) => ({
      end: text.toOriginal[end] ?? 0,
      start: text.toOriginal[start] ?? 0,
    }))
    .filter(({ end, start }) => end > start)
    .sort((left, right) => left.start - right.start)

  // Two typed words can land on the same title word (`med media`);
  // merge so a renderer never wraps one character twice.
  return mapped.reduce<TextMatchRange[]>(
    (merged, range) => {
      const last = merged.at(-1)

      if (last !== undefined && range.start <= last.end) {
        last.end = Math.max(last.end, range.end)

        return merged
      }

      merged.push({ ...range })

      return merged
    },
    [],
  )
}

/**
 * How well `query` matches one entry, or `null` for no match.
 *
 * An empty query (nothing but separators) matches nothing: a palette
 * shows its own suggestions before anything is typed, and "every
 * entry, in tier 1" is not a suggestion.
 */
export const matchWordPrefixes = (
  query: string,
  fields: WordPrefixMatchFields,
): WordPrefixMatch | null => {
  const queryWords = toQueryWords(query)

  if (queryWords.length === 0) {
    return null
  }

  const title = foldText(fields.title)

  const titleRanges = findWordPrefixRanges(
    title,
    queryWords,
  )

  if (titleRanges !== null) {
    const isTitleStart =
      titleRanges[0]?.start === title.wordStarts[0]

    return {
      tier: isTitleStart
        ? WORD_PREFIX_TIERS.titleStart
        : WORD_PREFIX_TIERS.titleWords,
      titleRanges: toOriginalRanges(title, titleRanges),
    }
  }

  const [onlyWord] = queryWords

  if (
    queryWords.length === 1 &&
    onlyWord !== undefined &&
    onlyWord.length >= 2
  ) {
    const initials = title.wordStarts
      .map((start) => title.folded[start] ?? "")
      .join("")

    if (initials.startsWith(onlyWord)) {
      return {
        tier: WORD_PREFIX_TIERS.titleInitials,
        titleRanges: toOriginalRanges(
          title,
          title.wordStarts
            .slice(0, onlyWord.length)
            .map((start) => ({ end: start + 1, start })),
        ),
      }
    }
  }

  const extraTexts = (fields.extra ?? []).map(foldText)

  const isEveryWordFound = queryWords.every(
    (queryWord) =>
      findWordPrefixRanges(title, [queryWord]) !== null ||
      extraTexts.some(
        (extraText) =>
          findWordPrefixRanges(extraText, [queryWord]) !==
          null,
      ),
  )

  return isEveryWordFound
    ? { tier: WORD_PREFIX_TIERS.anyWords, titleRanges: [] }
    : null
}

export type RankedWordPrefixMatch<Item> = {
  item: Item
  match: WordPrefixMatch
}

/**
 * Every item that matches, best first.
 *
 * Within a tier, a higher `weight` wins — an open count, say — and
 * then the caller's own order, so a list nobody weighs comes back in
 * the order it went in.
 */
export const rankWordPrefixMatches = <Item>(
  items: readonly Item[],
  query: string,
  getFields: (
    item: Item,
  ) => WordPrefixMatchFields & { weight?: number },
): RankedWordPrefixMatch<Item>[] =>
  items
    .flatMap((item, index) => {
      const fields = getFields(item)
      const match = matchWordPrefixes(query, fields)

      return match === null
        ? []
        : [
            {
              index,
              item,
              match,
              weight: fields.weight ?? 0,
            },
          ]
    })
    .sort(
      (left, right) =>
        right.match.tier - left.match.tier ||
        right.weight - left.weight ||
        left.index - right.index,
    )
    .map(({ item, match }) => ({ item, match }))

export type PrefixCommandMatch<Target> = {
  /** What follows the prefix, with the space after it removed. */
  query: string
  target: Target
}

/**
 * A short prefix, a space, and something after it: `eb lego` routes
 * `lego` to whichever target owns `eb`.
 *
 * The prefix is matched without case. A prefix with nothing after it
 * (`eb` or `eb `) is not a command yet, so the caller searches it as
 * ordinary text until there is something to send.
 */
export const parsePrefixCommand = <
  Target extends { prefix: string },
>(
  query: string,
  targets: readonly Target[],
): PrefixCommandMatch<Target> | null => {
  const commandMatch = /^\s*(\S+)\s+(\S.*?)\s*$/u.exec(
    query,
  )

  if (commandMatch === null) {
    return null
  }

  const [, typedPrefix = "", rest = ""] = commandMatch

  const target = targets.find(
    (candidate) =>
      candidate.prefix.toLowerCase() ===
      typedPrefix.toLowerCase(),
  )

  return target === undefined
    ? null
    : { query: rest, target }
}
