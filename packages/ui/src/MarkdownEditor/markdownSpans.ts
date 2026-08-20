/**
 * Markdown → coloured spans, with **every character kept**.
 *
 * This is the half of the live-hybrid editor that decides what a
 * line looks like, and its one hard requirement is not a parsing
 * requirement at all — it is a geometry one.
 *
 * ### The concatenation invariant
 *
 * The editing surface is a real `<textarea>` with a painted layer
 * behind it, sharing one grid cell. The textarea owns the caret,
 * the selection, the undo stack and the IME; the layer owns the
 * colour. That only works while the two layers **wrap identically**,
 * and they only wrap identically while they contain the *same
 * characters in the same order*.
 *
 * So `toMarkdownLines(text)` is not a parser in the usual sense. It
 * never drops a marker, never normalises whitespace, never resolves
 * a reference, and never emits a node the source did not contain.
 * Joining every span's text back together, with `\n` between lines,
 * reproduces the input byte for byte — `markdownSpans.test.ts`
 * asserts exactly that over a fixture corpus, and it is the test
 * that stops a well-meaning "let's trim the trailing space"
 * from silently shearing the caret away from the glyphs.
 *
 * ### It emits kinds, not HTML
 *
 * The return value is a list of `{ kind, text }` pairs. There is no
 * HTML string anywhere in this module, no `innerHTML`, and no
 * sanitiser — because there is nothing to sanitise. Docket's whole
 * reason to exist is that HTML-in-the-field destroyed a previous
 * tool's data, and the cheapest possible guarantee against that is
 * a pipeline in which HTML is never *constructed*. React renders
 * these spans as text nodes; a `<script>` in the source is a
 * `<script>` on screen.
 *
 * ### Why it is line-based, and what that costs
 *
 * A CommonMark parser resolves lazy continuation, setext headings,
 * link reference definitions and nested block containers across the
 * whole document. This resolves one line at a time, carrying
 * exactly one bit of cross-line state: whether we are inside a
 * fenced code block.
 *
 * That is a deliberate trade. Painting is per-line and re-runs on
 * every keystroke, so the cost has to be linear in the line, not in
 * the document; and a mis-coloured marker is a cosmetic defect
 * while a mis-*placed* one is a broken editor. The known gaps are
 * written down in `MarkdownEditor.mdx` rather than hidden: setext
 * headings, indented (four-space) code blocks, reference links, and
 * emphasis that spans a line break all colour as plain text. They
 * still **store** correctly, because the stored value is the
 * textarea's, not this module's.
 */

export type MarkdownSpanKind =
  | "code"
  | "emphasis"
  | "heading"
  | "link"
  | "marker"
  | "plain"
  | "strikethrough"
  | "strong"
  | "url"

export type MarkdownSpan = {
  kind: MarkdownSpanKind
  text: string
}

export type MarkdownLineKind =
  | "blockquote"
  | "code"
  | "heading"
  | "list"
  | "paragraph"
  | "table"
  | "thematicBreak"

export type MarkdownLine = {
  kind: MarkdownLineKind
  spans: MarkdownSpan[]
}

/**
 * A fence opens or closes on any line whose first non-space run is
 * three or more backticks or tildes. Up to three leading spaces,
 * per CommonMark; a fourth would be an indented code block, which
 * this module deliberately does not track.
 */
const FENCE_PATTERN = /^ {0,3}(?:```|~~~)/

const INDENT_PATTERN = /^[ \t]*/

const BLOCKQUOTE_PATTERN = /^(?:>[ \t]?)+/

const THEMATIC_BREAK_PATTERN =
  /^(?:\*[ \t]*){3,}$|^(?:-[ \t]*){3,}$|^(?:_[ \t]*){3,}$/

const HEADING_PATTERN = /^#{1,6}[ \t]+/

const LIST_MARKER_PATTERN = /^(?:[-*+]|\d{1,9}[.)])[ \t]+/

const TASK_MARKER_PATTERN = /^\[[ xX]\][ \t]*/

/**
 * Sticky, because every one of these is tried at a known index
 * rather than searched for. A non-sticky `exec` would happily match
 * an emphasis pair fifty characters further down the line and the
 * scanner would swallow everything in between.
 *
 * Order is the whole grammar here, and two orderings are
 * load-bearing:
 *
 *  - **Escape first.** `\*not emphasis\*` has to lose to the
 *    backslash, or the editor colours text the renderer will not.
 *  - **Code before everything.** A code span suppresses every other
 *    construct inside it, which is what makes `` `**` `` render as
 *    two asterisks rather than an unterminated bold run.
 *  - **Image before link**, because `![alt](url)` starts with a
 *    valid link at index 1.
 *  - **Strong before emphasis**, because `**` starts with `*`.
 */
const INLINE_PATTERNS = {
  code: /(`+)([^\n]*?)\1/y,
  emphasis: /([*_])(?=[^\s*_])([^\n*_]*?[^\s*_])\1/y,
  escape: /\\([\\`*_{}[\]()#+\-.!>~|])/y,
  image: /(!\[)([^\]\n]*)(\]\()([^)\s\n]*)(\))/y,
  link: /(\[)([^\]\n]*)(\]\()([^)\s\n]*)(\))/y,
  strikethrough: /(~~)(?=\S)([^\n]*?\S)\1/y,
  strong: /(\*\*|__)(?=\S)([^\n]*?\S)\1/y,
} as const

const pushSpan = (
  spans: MarkdownSpan[],
  kind: MarkdownSpanKind,
  text: string,
) => {
  if (text === "") {
    return
  }

  const previous = spans.at(-1)

  // Merged as they are pushed rather than in a second pass. The
  // scanner emits one span per plain *character*, so without this a
  // 200-character paragraph is 200 React elements and every
  // keystroke reconciles all of them.
  if (previous?.kind === kind) {
    previous.text += text

    return
  }

  spans.push({ kind, text })
}

/**
 * The inline scanner.
 *
 * `baseKind` is what unmarked text becomes — `"plain"` in a
 * paragraph, `"heading"` inside a heading — so a heading's words
 * carry the heading colour while the `##` in front of them stays a
 * marker.
 */
export const toInlineSpans = (
  text: string,
  baseKind: MarkdownSpanKind = "plain",
): MarkdownSpan[] => {
  const spans: MarkdownSpan[] = []

  let index = 0

  while (index < text.length) {
    INLINE_PATTERNS.escape.lastIndex = index

    const escaped = INLINE_PATTERNS.escape.exec(text)

    if (escaped) {
      pushSpan(spans, "marker", "\\")

      pushSpan(spans, baseKind, escaped[1] ?? "")

      index += escaped[0].length

      continue
    }

    INLINE_PATTERNS.code.lastIndex = index

    const code = INLINE_PATTERNS.code.exec(text)

    if (code) {
      pushSpan(spans, "marker", code[1] ?? "")

      pushSpan(spans, "code", code[2] ?? "")

      pushSpan(spans, "marker", code[1] ?? "")

      index += code[0].length

      continue
    }

    INLINE_PATTERNS.image.lastIndex = index

    const image = INLINE_PATTERNS.image.exec(text)

    if (image) {
      pushSpan(spans, "marker", image[1] ?? "")

      pushSpan(spans, "link", image[2] ?? "")

      pushSpan(spans, "marker", image[3] ?? "")

      pushSpan(spans, "url", image[4] ?? "")

      pushSpan(spans, "marker", image[5] ?? "")

      index += image[0].length

      continue
    }

    INLINE_PATTERNS.link.lastIndex = index

    const link = INLINE_PATTERNS.link.exec(text)

    if (link) {
      pushSpan(spans, "marker", link[1] ?? "")

      pushSpan(spans, "link", link[2] ?? "")

      pushSpan(spans, "marker", link[3] ?? "")

      pushSpan(spans, "url", link[4] ?? "")

      pushSpan(spans, "marker", link[5] ?? "")

      index += link[0].length

      continue
    }

    INLINE_PATTERNS.strong.lastIndex = index

    const strong = INLINE_PATTERNS.strong.exec(text)

    if (strong) {
      pushSpan(spans, "marker", strong[1] ?? "")

      pushSpan(spans, "strong", strong[2] ?? "")

      pushSpan(spans, "marker", strong[1] ?? "")

      index += strong[0].length

      continue
    }

    INLINE_PATTERNS.strikethrough.lastIndex = index

    const struck = INLINE_PATTERNS.strikethrough.exec(text)

    if (struck) {
      pushSpan(spans, "marker", struck[1] ?? "")

      pushSpan(spans, "strikethrough", struck[2] ?? "")

      pushSpan(spans, "marker", struck[1] ?? "")

      index += struck[0].length

      continue
    }

    INLINE_PATTERNS.emphasis.lastIndex = index

    const emphasised = INLINE_PATTERNS.emphasis.exec(text)

    if (emphasised) {
      pushSpan(spans, "marker", emphasised[1] ?? "")

      pushSpan(spans, "emphasis", emphasised[2] ?? "")

      pushSpan(spans, "marker", emphasised[1] ?? "")

      index += emphasised[0].length

      continue
    }

    pushSpan(spans, baseKind, text[index] ?? "")

    index += 1
  }

  return spans
}

const toTableSpans = (text: string): MarkdownSpan[] => {
  const spans: MarkdownSpan[] = []

  for (const part of text.split(/(\|)/)) {
    if (part === "|") {
      pushSpan(spans, "marker", part)

      continue
    }

    for (const span of toInlineSpans(part)) {
      pushSpan(spans, span.kind, span.text)
    }
  }

  return spans
}

const toBlockLine = (line: string): MarkdownLine => {
  const spans: MarkdownSpan[] = []

  const indent = INDENT_PATTERN.exec(line)?.[0] ?? ""

  pushSpan(spans, "plain", indent)

  let rest = line.slice(indent.length)

  const quote = BLOCKQUOTE_PATTERN.exec(rest)?.[0]

  if (quote !== undefined) {
    pushSpan(spans, "marker", quote)

    rest = rest.slice(quote.length)
  }

  if (THEMATIC_BREAK_PATTERN.test(rest)) {
    pushSpan(spans, "marker", rest)

    return { kind: "thematicBreak", spans }
  }

  const heading = HEADING_PATTERN.exec(rest)?.[0]

  if (heading !== undefined) {
    pushSpan(spans, "marker", heading)

    for (const span of toInlineSpans(
      rest.slice(heading.length),
      "heading",
    )) {
      pushSpan(spans, span.kind, span.text)
    }

    return { kind: "heading", spans }
  }

  const listMarker = LIST_MARKER_PATTERN.exec(rest)?.[0]

  if (listMarker !== undefined) {
    pushSpan(spans, "marker", listMarker)

    rest = rest.slice(listMarker.length)

    const taskMarker = TASK_MARKER_PATTERN.exec(rest)?.[0]

    if (taskMarker !== undefined) {
      pushSpan(spans, "marker", taskMarker)

      rest = rest.slice(taskMarker.length)
    }

    for (const span of toInlineSpans(rest)) {
      pushSpan(spans, span.kind, span.text)
    }

    return { kind: "list", spans }
  }

  if (rest.startsWith("|")) {
    for (const span of toTableSpans(rest)) {
      pushSpan(spans, span.kind, span.text)
    }

    return { kind: "table", spans }
  }

  for (const span of toInlineSpans(rest)) {
    pushSpan(spans, span.kind, span.text)
  }

  return {
    kind: quote === undefined ? "paragraph" : "blockquote",
    spans,
  }
}

/**
 * The whole document, one entry per line.
 *
 * `text.split("\n")` on an empty string yields `[""]` — one empty
 * line — which is right: an empty editor still has a line for the
 * caret to sit on, and the painted layer still needs a row so the
 * two layers agree about where line 0 is.
 */
export const toMarkdownLines = (
  text: string,
): MarkdownLine[] => {
  let isInsideFence = false

  return text.split("\n").map((line) => {
    if (FENCE_PATTERN.test(line)) {
      isInsideFence = !isInsideFence

      return {
        kind: "code" as const,
        spans: [{ kind: "marker" as const, text: line }],
      }
    }

    if (isInsideFence) {
      return {
        kind: "code" as const,
        spans:
          line === ""
            ? []
            : [{ kind: "code" as const, text: line }],
      }
    }

    return toBlockLine(line)
  })
}

/**
 * Which line the caret is on, from a character offset.
 *
 * The active line is the one construct in this editor that is
 * *state* rather than syntax: its markers paint at full strength
 * and every other line's fade back, which is the whole "raw syntax
 * on the cursor's line" behaviour.
 */
export const toLineIndex = (
  text: string,
  offset: number,
): number => {
  const clamped = Math.max(0, Math.min(offset, text.length))

  let lineIndex = 0

  for (let index = 0; index < clamped; index += 1) {
    if (text[index] === "\n") {
      lineIndex += 1
    }
  }

  return lineIndex
}
