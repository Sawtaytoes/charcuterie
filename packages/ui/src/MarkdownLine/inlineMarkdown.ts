/**
 * Markdown's **inline** half, parsed into flat runs of marked text.
 *
 * ### Why this is not the CodeMirror parser
 *
 * `@charcuterie/ui/markdown-editor-codemirror` already renders
 * markdown, through `@lezer/markdown`. It is the right answer for a
 * document and the wrong one for a **name**: an editor instance per
 * card is a CodeMirror state, a view, a syntax tree and a decoration
 * set for a string that is usually under sixty characters, and a
 * backlog grid draws dozens of them at once. The whole CodeMirror
 * stack is also an *optional peer* of this package on purpose — the
 * main entry may not reach it, so a title renderer that lives in the
 * main entry cannot borrow it even if the cost were acceptable.
 *
 * So this is a second parser, which is a thing to be nervous about:
 * two parsers are two answers to "what does this markdown mean", and
 * that divergence is exactly the bug the consumer's
 * renderer-agreement test exists to catch. Three things keep it
 * honest:
 *
 *  1. **It is inline-only, and says so.** A `#`, a `>`, a `|` table
 *     row and a `- ` list marker are literal characters here. There
 *     is no block level to disagree about, because there is no block
 *     level.
 *  2. **The URL guard is shared, not copied.** Both surfaces call
 *     `toSafeLinkUrl` from `../safeUrls.ts` — one module, one
 *     allowlist. It moved up out of the CodeMirror subpath when this
 *     landed, for that reason.
 *  3. **The flanking rules are CommonMark's**, not a convenient
 *     approximation. That is what makes `ingest_the_files.sh` a file
 *     name rather than a title with an italic word in the middle of
 *     it, and file names in titles are the case this was built for.
 *
 * ### The shape it produces
 *
 * A **flat** list of runs, not a tree. Marks compose by set union, so
 * `**bold [link](/x) tail**` is three runs that all carry `isStrong`
 * and of which one carries an `href` — which is precisely the shape
 * `MarkdownLine` needs to render a link *beside* the surrounding
 * anchor rather than inside it. A tree would have to be flattened
 * back into this before it could be drawn.
 */

import { toSafeLinkUrl } from "../safeUrls.ts"

/**
 * One run of text, with every mark that covers it.
 *
 * `href` is present only on a run that came from `[text](url)` or
 * from a bare URL — never inherited from the caller's own link. Who
 * the *plain* text points at is `MarkdownLine`'s question, not the
 * parser's.
 */
export type InlineMarkdownRun = {
  href?: string
  isCode: boolean
  isEmphasis: boolean
  isStrikethrough: boolean
  isStrong: boolean
  text: string
}

type MarkState = {
  isCode: boolean
  isEmphasis: boolean
  isStrikethrough: boolean
  isStrong: boolean
}

const NO_MARKS: MarkState = {
  isCode: false,
  isEmphasis: false,
  isStrikethrough: false,
  isStrong: false,
}

/**
 * ASCII punctuation, per CommonMark — the set a backslash may
 * escape, and the set the flanking rules ask about. Spelled as
 * explicit ranges rather than `\p{P}`: CommonMark's list is ASCII
 * and Unicode's is very much larger, and the difference decides
 * whether a typographic quote can close an emphasis run.
 */
const PUNCTUATION_PATTERN = /[!-/:-@[-`{-~]/

const WHITESPACE_PATTERN = /\s/

const getIsPunctuation = (char: string | undefined) =>
  char !== undefined && PUNCTUATION_PATTERN.test(char)

const getIsWhitespace = (char: string | undefined) =>
  char !== undefined && WHITESPACE_PATTERN.test(char)

/**
 * A delimiter run that could **open** emphasis: it is not followed
 * by whitespace, and if it is followed by punctuation then it is
 * preceded by whitespace or punctuation.
 *
 * This is CommonMark's "left-flanking delimiter run", and the reason
 * `2 * 3 * 4` is arithmetic rather than an italic `3`.
 */
const getIsLeftFlanking = (
  source: string,
  start: number,
  end: number,
): boolean => {
  const before = source[start - 1]
  const after = source[end]

  if (after === undefined || getIsWhitespace(after)) {
    return false
  }

  return (
    !getIsPunctuation(after) ||
    before === undefined ||
    getIsWhitespace(before) ||
    getIsPunctuation(before)
  )
}

/** The mirror of the rule above, for a run that could **close**. */
const getIsRightFlanking = (
  source: string,
  start: number,
  end: number,
): boolean => {
  const before = source[start - 1]
  const after = source[end]

  if (before === undefined || getIsWhitespace(before)) {
    return false
  }

  return (
    !getIsPunctuation(before) ||
    after === undefined ||
    getIsWhitespace(after) ||
    getIsPunctuation(after)
  )
}

/**
 * `_` is stricter than `*` at both ends, and this is the whole
 * reason a snake_case file name survives.
 *
 * CommonMark forbids an underscore run that is flanked on *both*
 * sides from opening or closing, unless the outer side is
 * punctuation. Inside `ingest_the_files`, the first `_` has a letter
 * on each side — left-flanking and right-flanking at once — so it
 * opens nothing, and the title reads as the file name it is. An `*`
 * in the same position would open, which is exactly why the two
 * characters are not interchangeable and why a parser that treats
 * them as one has this bug.
 */
const getCanOpen = (
  source: string,
  start: number,
  end: number,
  marker: string,
): boolean => {
  const isLeftFlanking = getIsLeftFlanking(
    source,
    start,
    end,
  )

  if (marker !== "_") {
    return isLeftFlanking
  }

  return (
    isLeftFlanking &&
    (!getIsRightFlanking(source, start, end) ||
      getIsPunctuation(source[start - 1]))
  )
}

const getCanClose = (
  source: string,
  start: number,
  end: number,
  marker: string,
): boolean => {
  const isRightFlanking = getIsRightFlanking(
    source,
    start,
    end,
  )

  if (marker !== "_") {
    return isRightFlanking
  }

  return (
    isRightFlanking &&
    (!getIsLeftFlanking(source, start, end) ||
      getIsPunctuation(source[end]))
  )
}

/**
 * A code span's content, trimmed CommonMark's way: line endings
 * become spaces, and **one** space comes off each end when there is
 * one at both ends and the content is not all spaces.
 *
 * That last rule is what lets `` ` `` be written as `` `` ` `` ``.
 */
const toCodeText = (raw: string): string => {
  const flattened = raw.replace(/\r\n|\r|\n/g, " ")

  if (
    flattened.length > 2 &&
    flattened.startsWith(" ") &&
    flattened.endsWith(" ") &&
    flattened.trim() !== ""
  ) {
    return flattened.slice(1, -1)
  }

  return flattened
}

/**
 * How far a backtick fence's twin is, or `-1`.
 *
 * The closing fence must be the **same length**: a run of three
 * backticks does not close a run of two, which is what makes
 * `` `` a`b `` `` hold a literal backtick.
 */
const findCodeSpanEnd = (
  source: string,
  from: number,
  fenceLength: number,
): number => {
  let index = from

  while (index < source.length) {
    if (source[index] !== "`") {
      index += 1
      continue
    }

    let end = index

    while (source[end] === "`") {
      end += 1
    }

    if (end - index === fenceLength) {
      return index
    }

    index = end
  }

  return -1
}

/**
 * `[text](url)` starting at `index`, or `undefined`.
 *
 * Bracket depth is counted so `[see [1]](/x)` reads whole, and a
 * code span inside the text is stepped over so a `]` in backticks
 * does not end it early. The destination allows one level of nesting
 * — `(/a(b)c)` — and CommonMark's `<…>` form, which `toSafeLinkUrl`
 * unwraps.
 */
const readLink = (
  source: string,
  index: number,
):
  | { end: number; text: string; url: string }
  | undefined => {
  let depth = 1
  let cursor = index + 1

  while (cursor < source.length && depth > 0) {
    const char = source[cursor]

    if (char === "\\") {
      cursor += 2
      continue
    }

    if (char === "`") {
      let fenceEnd = cursor

      while (source[fenceEnd] === "`") {
        fenceEnd += 1
      }

      const close = findCodeSpanEnd(
        source,
        fenceEnd,
        fenceEnd - cursor,
      )

      cursor =
        close === -1
          ? fenceEnd
          : close + (fenceEnd - cursor)

      continue
    }

    if (char === "[") {
      depth += 1
    }

    if (char === "]") {
      depth -= 1

      if (depth === 0) {
        break
      }
    }

    cursor += 1
  }

  if (depth !== 0 || source[cursor + 1] !== "(") {
    return undefined
  }

  const text = source.slice(index + 1, cursor)

  let destinationDepth = 1
  let destinationCursor = cursor + 2

  while (
    destinationCursor < source.length &&
    destinationDepth > 0
  ) {
    const char = source[destinationCursor]

    if (char === "\\") {
      destinationCursor += 2
      continue
    }

    if (char === "(") {
      destinationDepth += 1
    }

    if (char === ")") {
      destinationDepth -= 1

      if (destinationDepth === 0) {
        break
      }
    }

    destinationCursor += 1
  }

  if (destinationDepth !== 0) {
    return undefined
  }

  return {
    end: destinationCursor + 1,
    text,
    /**
     * A destination may carry a title — `[x](/a "Tooltip")` — which
     * is not part of the URL. Split on the first unescaped space
     * unless the whole thing is the `<…>` form, where spaces are
     * allowed and the brackets are the boundary.
     */
    url: source
      .slice(cursor + 2, destinationCursor)
      .trim()
      .replace(/^(<[^>]*>|\S+)\s[\s\S]*$/, "$1"),
  }
}

/**
 * A bare URL, GFM-style, or `undefined`.
 *
 * The trailing-punctuation walk-back is GFM's and it is not
 * decoration: a URL at the end of a sentence is written
 * `see https://example.invalid/x.` and the full stop is the
 * sentence's, not the URL's. A closing parenthesis is kept only when
 * the URL opened one, so
 * `https://example.invalid/Rack_(shelf)` survives whole while
 * `(see https://example.invalid/x)` does not eat the bracket.
 *
 * `www.` is here because GFM autolinks it and the CodeMirror surface
 * therefore does too — a title that renders one link in the editor
 * and none on the card is the divergence this file promised not to
 * have. A bare **email** address is deliberately not autolinked: GFM
 * does it, and this fleet's rule is that no personal address goes
 * anywhere near a publishable repo, so the narrowing is a decision
 * rather than an oversight.
 */
const readBareUrl = (
  source: string,
  index: number,
):
  | { end: number; text: string; url: string }
  | undefined => {
  const before = source[index - 1]

  // GFM requires the run to start at a boundary — otherwise
  // `xhttps://…` and a path segment that merely contains `www.`
  // would both light up.
  if (
    before !== undefined &&
    !getIsWhitespace(before) &&
    !getIsPunctuation(before)
  ) {
    return undefined
  }

  const match = /^(?:https?:\/\/|www\.)[^\s<]+/.exec(
    source.slice(index),
  )

  if (!match) {
    return undefined
  }

  let raw = match[0]

  while (raw.length > 0) {
    const last = raw.at(-1) ?? ""

    if (/[!"'.,:;?*_~]/.test(last)) {
      raw = raw.slice(0, -1)
      continue
    }

    if (
      last === ")" &&
      raw.split(")").length > raw.split("(").length
    ) {
      raw = raw.slice(0, -1)
      continue
    }

    break
  }

  // `https://` on its own is a scheme, not a destination.
  if (/^(?:https?:\/\/|www\.)$/.test(raw)) {
    return undefined
  }

  return {
    end: index + raw.length,
    text: raw,
    url: raw.startsWith("www.") ? `https://${raw}` : raw,
  }
}

/**
 * The index just past the closing `marker`, or `-1`.
 *
 * Scanning skips escapes and code spans so a delimiter that is
 * inside backticks cannot close one that is outside them.
 */
const findEmphasisEnd = (
  source: string,
  from: number,
  marker: string,
): number => {
  let index = from

  while (index < source.length) {
    const char = source[index]

    if (char === "\\") {
      index += 2
      continue
    }

    if (char === "`") {
      let fenceEnd = index

      while (source[fenceEnd] === "`") {
        fenceEnd += 1
      }

      const close = findCodeSpanEnd(
        source,
        fenceEnd,
        fenceEnd - index,
      )

      index =
        close === -1 ? fenceEnd : close + (fenceEnd - index)

      continue
    }

    if (
      source.startsWith(marker, index) &&
      getCanClose(
        source,
        index,
        index + marker.length,
        marker[0] ?? "",
      )
    ) {
      return index
    }

    index += 1
  }

  return -1
}

/**
 * Longest marker first, or `**bold**` is read as an empty italic
 * followed by the word.
 */
const EMPHASIS_MARKERS = [
  { marker: "~~", markName: "isStrikethrough" },
  { marker: "**", markName: "isStrong" },
  { marker: "__", markName: "isStrong" },
  { marker: "*", markName: "isEmphasis" },
  { marker: "_", markName: "isEmphasis" },
] as const

const toRuns = (
  source: string,
  marks: MarkState,
  href: string | undefined,
): InlineMarkdownRun[] => {
  const runs: InlineMarkdownRun[] = []

  let plain = ""
  let index = 0

  const pushPlain = () => {
    if (plain === "") {
      return
    }

    runs.push({
      ...marks,
      ...(href === undefined ? {} : { href }),
      text: plain,
    })

    plain = ""
  }

  while (index < source.length) {
    const char = source[index] ?? ""

    if (
      char === "\\" &&
      getIsPunctuation(source[index + 1])
    ) {
      plain += source[index + 1]
      index += 2
      continue
    }

    if (char === "`") {
      let fenceEnd = index

      while (source[fenceEnd] === "`") {
        fenceEnd += 1
      }

      const fenceLength = fenceEnd - index

      const close = findCodeSpanEnd(
        source,
        fenceEnd,
        fenceLength,
      )

      if (close !== -1) {
        pushPlain()

        runs.push({
          ...marks,
          ...(href === undefined ? {} : { href }),
          isCode: true,
          text: toCodeText(source.slice(fenceEnd, close)),
        })

        index = close + fenceLength
        continue
      }

      plain += source.slice(index, fenceEnd)
      index = fenceEnd
      continue
    }

    // A link inside a link is not a link. CommonMark forbids the
    // nesting outright, and here it would also produce a run whose
    // `href` had two answers.
    if (char === "[" && href === undefined) {
      const link = readLink(source, index)

      if (link) {
        const safeUrl = toSafeLinkUrl(link.url)

        if (safeUrl === undefined) {
          /**
           * The refused URL keeps **every character of its source**,
           * brackets and parentheses included — the same choice
           * `livePreviewRanges.ts` makes, and for the same reason: a
           * reader who can see `[click me](javascript:…)` is better
           * served than one shown a confident blue word that
           * silently does nothing.
           */
          plain += source.slice(index, link.end)
          index = link.end
          continue
        }

        pushPlain()
        runs.push(...toRuns(link.text, marks, safeUrl))
        index = link.end
        continue
      }
    }

    // `<https://…>`, the angle-bracket autolink. Its text is the URL
    // and nothing inside it is parsed.
    if (char === "<" && href === undefined) {
      const autolink =
        /^<([a-z][a-z\d+.-]*:[^\s<>]*)>/i.exec(
          source.slice(index),
        )

      const safeUrl =
        autolink?.[1] === undefined
          ? undefined
          : toSafeLinkUrl(autolink[1])

      if (autolink && safeUrl !== undefined) {
        pushPlain()

        runs.push({
          ...marks,
          href: safeUrl,
          text: autolink[1] ?? "",
        })

        index += autolink[0].length
        continue
      }
    }

    if (
      href === undefined &&
      (char === "h" || char === "w")
    ) {
      const bare = readBareUrl(source, index)

      const safeUrl =
        bare === undefined
          ? undefined
          : toSafeLinkUrl(bare.url)

      if (bare && safeUrl !== undefined) {
        pushPlain()

        runs.push({
          ...marks,
          href: safeUrl,
          text: bare.text,
        })

        index = bare.end
        continue
      }
    }

    const emphasis = EMPHASIS_MARKERS.find(
      ({ marker, markName }) =>
        !marks[markName] &&
        source.startsWith(marker, index) &&
        getCanOpen(
          source,
          index,
          index + marker.length,
          marker[0] ?? "",
        ),
    )

    if (emphasis) {
      const contentStart = index + emphasis.marker.length

      const close = findEmphasisEnd(
        source,
        contentStart,
        emphasis.marker,
      )

      if (close !== -1 && close > contentStart) {
        pushPlain()

        runs.push(
          ...toRuns(
            source.slice(contentStart, close),
            { ...marks, [emphasis.markName]: true },
            href,
          ),
        )

        index = close + emphasis.marker.length
        continue
      }
    }

    plain += char
    index += 1
  }

  pushPlain()

  return runs
}

/**
 * Everything that makes a title a **line** rather than a document,
 * applied before a character is parsed.
 *
 * A newline is collapsed to a space rather than honoured, because
 * every surface that draws one of these clamps to one or two lines
 * anyway — a title that arrived with a hard break would otherwise
 * push its own second half out of a box that was measured for one
 * line. Leading and trailing whitespace goes with it.
 */
const toSingleLine = (value: string) =>
  value.replace(/\s*(?:\r\n|\r|\n)\s*/g, " ").trim()

/**
 * The inline runs of `value`, in order.
 *
 * Exported because a consumer occasionally needs the runs without
 * React — Docket's search highlighter walks them to find which run a
 * match landed in — and because it is the seam every test in this
 * directory drives.
 */
export const toInlineMarkdownRuns = (
  value: string,
): InlineMarkdownRun[] =>
  toRuns(toSingleLine(value), NO_MARKS, undefined)

/**
 * The same string with its markers **gone** — what the title says,
 * with nothing about how it is painted.
 *
 * This is not a convenience. Every `aria-label`, `title` attribute,
 * `document.title` and confirmation sentence that names a task needs
 * the words without the punctuation, and deriving it from the same
 * parse is the only way it cannot drift from what is on screen. A
 * second regex that "strips markdown" is how the card comes to read
 * `Ingest 53 movies` while the tooltip reads
 * `Ingest 53 movies from ⁠`Downloads/MOVIES⁠``.
 */
export const toPlainMarkdownText = (
  value: string,
): string =>
  toInlineMarkdownRuns(value)
    .map((run) => run.text)
    .join("")
