/**
 * Markdown → the ranges a live-preview surface decorates, as pure
 * tree-in / descriptors-out.
 *
 * This is the half of the CodeMirror editor that decides what a
 * document *looks* like, and it is deliberately the half with no
 * `@codemirror/view` import in it. Descriptors are plain
 * `{ from, to, type }` objects; turning them into `Decoration`s is
 * `livePreview.ts`'s job. The split buys two things:
 *
 *  - **These tests run in Node.** `packages/ui`'s Vitest project is
 *    `.ts`-only and has no DOM, on purpose. A test here parses real
 *    markdown with the real GFM parser and asserts real offsets —
 *    no jsdom, no mount, no story.
 *  - **The runtime stays incremental.** Tests hand in
 *    `markdownLanguage.parser.parse(text)`; the view hands in
 *    `syntaxTree(state)`, which CodeMirror has already reparsed
 *    incrementally. Same function, same offsets, and the expensive
 *    path is never the one under test.
 *
 * ### What separates this from `markdownSpans.ts`
 *
 * The sibling `MarkdownEditor` paints *behind* a `<textarea>`, so
 * every span it emits has to be metric-neutral — same glyph
 * advances, or the caret shears away from the letters. That is the
 * constraint this module does **not** have. CodeMirror owns the
 * caret and reflows around decorations, so a heading can genuinely
 * be larger, `**` can genuinely be hidden, and an image can
 * genuinely replace its own markup.
 *
 * That is the entire reason this subpath exists, and it is also why
 * it is a subpath: the capability costs ~176 KB gz of optional peer
 * and only a consumer that opts in should pay it.
 *
 * ### The one invariant
 *
 * **Concealment never touches the document.** Every descriptor here
 * describes a *view* over an unmodified markdown string. Hiding
 * `**` does not delete it; replacing `![alt](url)` with an image
 * does not rewrite it. The stored value stays byte-for-byte what
 * the user typed, which is the same no-HTML-in-the-data guarantee
 * the textarea version gets structurally — kept here by never
 * having a serialiser at all.
 */

import type {
  SyntaxNode,
  SyntaxNodeRef,
  Tree,
} from "@lezer/common"

import {
  toSafeImageUrl,
  toSafeLinkUrl,
} from "./safeUrls.ts"

/**
 * A block-level treatment applied to a whole line.
 *
 * Headings carry their level because size is the point: this is the
 * "block-level type scaling" the textarea version had to give up.
 */
export type LivePreviewLineKind =
  | "blockquote"
  | "code"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6"
  | "table"

/** An inline treatment applied to a character range. */
export type LivePreviewMarkKind =
  | "autolink"
  | "code"
  | "emphasis"
  | "linkText"
  | "strikethrough"
  | "strong"
  | "url"

/**
 * A column's alignment, as the delimiter row spells it.
 *
 * Logical rather than left/right, because everything else in this
 * fleet is: a table in an RTL locale should flip with the text, and
 * `text-align: start` is the property that does it for free.
 */
export type LivePreviewTableAlignment =
  | "center"
  | "end"
  | "start"

/**
 * A run of cell content that shares one treatment.
 *
 * A rendered table cell is built from these rather than from the
 * raw slice, so a cell keeps everything the rest of the surface
 * gives a line: `**bold**` is bold, a link is a link, `` `code` ``
 * is monospaced, and the markers that said so are gone.
 */
export type LivePreviewTableSegment =
  | {
      alt: string
      type: "image"
      url: string
    }
  | {
      markKinds: readonly LivePreviewMarkKind[]
      text: string
      type: "text"
      /** Present when the run is link text; the click target. */
      url?: string
    }

export type LivePreviewTableCell = {
  alignment: LivePreviewTableAlignment
  /**
   * Where a click in this cell puts the caret.
   *
   * The rendered table is a view, so the only way back into the
   * markdown is to move the caret into it — and landing in the cell
   * the reader aimed at is the difference between "editable" and
   * "editable somewhere in there".
   */
  from: number
  segments: readonly LivePreviewTableSegment[]
  to: number
}

export type LivePreviewTableRow = {
  cells: readonly LivePreviewTableCell[]
  from: number
  isHeader: boolean
  to: number
}

export type LivePreviewRange = {
  from: number
  to: number
} & (
  | {
      /** A rendered image, standing in for its own `![alt](url)`. */
      alt: string
      type: "image"
      url: string
    }
  | {
      /** A rendered task checkbox, standing in for `[ ]` / `[x]`. */
      isChecked: boolean
      /**
       * The item's own text, which becomes the checkbox's
       * accessible name — a checkbox inside a `contenteditable` has
       * no `<label>` to inherit one from.
       */
      label: string
      type: "task"
    }
  | {
      /**
       * Syntax the reader does not need: `**`, `#`, `[`, `](…)`.
       *
       * `isConcealed` is the caret's answer, not the parser's. When
       * the selection is inside the construct — or the whole
       * surface is in raw mode — the marker stays in the flow and
       * is merely dimmed, which is what makes the syntax editable
       * at all.
       */
      isConcealed: boolean
      type: "marker"
    }
  | {
      lineKind: LivePreviewLineKind
      type: "line"
    }
  | {
      markKind: LivePreviewMarkKind
      type: "mark"
      /** Present on `linkText` and `autolink`; the click target. */
      url?: string
    }
)

/**
 * A whole table, rendered — header row first, every row padded to
 * the same width so the widget has no geometry decisions left.
 *
 * Its own type, and its own pass, because of a hard CodeMirror
 * rule: **a block decoration may not come from a `ViewPlugin`.**
 * Replacing four lines with one element changes the document's
 * block structure, which the view has to know before it can decide
 * what the viewport even contains — so it has to come from a
 * `StateField`, which sees the whole document and no viewport.
 * Everything else here is viewport-limited and stays in the plugin.
 * The split is CodeMirror's, not ours.
 */
export type LivePreviewTableRange = {
  from: number
  rows: readonly LivePreviewTableRow[]
  to: number
  type: "table"
}

/** A selection range, in the two fields this module needs. */
export type LivePreviewSelection = {
  from: number
  to: number
}

export type ToLivePreviewRangesOptions = {
  /**
   * Limit the walk to a slice of the document — the view passes its
   * visible ranges, so a long description costs what is on screen
   * rather than what is stored. Omit both and the whole tree is
   * walked, which is what the tests do.
   */
  from?: number
  /**
   * Raw mode — the "edit Markdown" toggle.
   *
   * Nothing is concealed, nothing is replaced by a widget, and no
   * line is rescaled. Syntax colouring stays, because the point of
   * the toggle is to see the markup, not to lose the highlighting.
   */
  isRawMode?: boolean
  selections: readonly LivePreviewSelection[]
  text: string
  to?: number
  tree: Tree
}

const HEADING_LINE_KINDS: Record<
  string,
  LivePreviewLineKind
> = {
  ATXHeading1: "heading1",
  ATXHeading2: "heading2",
  ATXHeading3: "heading3",
  ATXHeading4: "heading4",
  ATXHeading5: "heading5",
  ATXHeading6: "heading6",
}

const INLINE_MARK_KINDS: Record<
  string,
  LivePreviewMarkKind
> = {
  Emphasis: "emphasis",
  InlineCode: "code",
  Strikethrough: "strikethrough",
  StrongEmphasis: "strong",
}

/** Marks that vanish with their construct once the caret leaves. */
const CONCEALABLE_MARK_NAMES = new Set([
  "CodeMark",
  "EmphasisMark",
  "HeaderMark",
  "LinkMark",
  "QuoteMark",
  "StrikethroughMark",
])

/**
 * A fence is structure, not noise.
 *
 * `CodeMark` covers both `` ` `` and ```` ``` ````, and concealing
 * the fenced kind leaves a blank line at the top and bottom of the
 * block where the fence used to be — which reads as a rendering bug
 * rather than as tidiness. The language tag goes with it, for the
 * same reason Obsidian keeps it: it is the one part of a code block
 * that says what the code *is*.
 */
const FENCED_CODE_PARENTS = new Set(["FencedCode"])

/**
 * Marks that are always visible, only dimmed.
 *
 * Just the list bullet, and the distinction from `QuoteMark` is the
 * interesting part. A blockquote gets a line decoration — an accent
 * bar down its inline start — so the `>` is *redundant* once that
 * bar is drawn, and Obsidian hides it for exactly that reason. A
 * bullet has no such affordance: hide the `-` and an unordered list
 * becomes indented prose. Obsidian substitutes a `•` glyph there,
 * which means choosing a width, and this module has no business
 * choosing one.
 *
 * So the rule is not "block marks persist" — it is **a mark
 * persists unless something else already says what it said.**
 */
const PERSISTENT_MARK_NAMES = new Set(["ListMark"])

const isInside = (
  selections: readonly LivePreviewSelection[],
  from: number,
  to: number,
) =>
  selections.some(
    (selection) =>
      selection.from <= to && selection.to >= from,
  )

/** The start offset of the line containing `offset`. */
const toLineStart = (text: string, offset: number) => {
  const previousBreak = text.lastIndexOf("\n", offset - 1)

  return previousBreak + 1
}

/** The end offset (exclusive of `\n`) of that line. */
const toLineEnd = (text: string, offset: number) => {
  const nextBreak = text.indexOf("\n", offset)

  return nextBreak === -1 ? text.length : nextBreak
}

const toChildNamed = (
  node: SyntaxNode,
  name: string,
): SyntaxNode | null => {
  for (
    let child = node.firstChild;
    child;
    child = child.nextSibling
  ) {
    if (child.name === name) {
      return child
    }
  }

  return null
}

/**
 * The closing `]` of a `Link` or an `Image`.
 *
 * **Not** `openMark.nextSibling`. That sibling is the closing
 * bracket only while the text between the brackets is plain prose,
 * because plain prose gets no node of its own. Put any inline
 * construct in there — ``[`file.md`](path)``, `[**bold**](path)`,
 * `[~~struck~~](path)` — and the second child is that construct,
 * so the old walk measured the link text as `[` → the construct's
 * own start and got a **zero-length** range. CodeMirror rejects an
 * empty mark decoration (`Mark decorations may not be empty`), the
 * throw destroys the view plugin, and every decoration in the
 * document goes with it: the whole file drops to raw source.
 *
 * Text *before* the construct failed more quietly and just as
 * wrongly. `[a *b*](path)` marked `a ` as the link and then
 * concealed `*b*](path)`, because the concealment marker starts
 * where this bracket is thought to be.
 *
 * The bracket is the first `LinkMark` **child** after the opener. A
 * nested image's brackets belong to the `Image` node, not to this
 * one, so a direct-sibling walk steps over `[![alt](a.png)](url)`
 * without mistaking `![` for the end of the link text.
 */
const toCloseMark = (
  openMark: SyntaxNode | null,
  text: string,
): SyntaxNode | null => {
  for (
    let sibling = openMark?.nextSibling;
    sibling;
    sibling = sibling.nextSibling
  ) {
    if (
      sibling.name === "LinkMark" &&
      // Redundant against today's parser — the first `LinkMark`
      // after the opener is always `]`, for a link and an image
      // alike. It is here to state the contract: this function
      // returns a **closing bracket**, and it returns nothing
      // rather than the wrong node if that ever stops holding.
      text.slice(sibling.from, sibling.to) === "]"
    ) {
      return sibling
    }
  }

  return null
}

/**
 * The syntax spans `toPlainText` drops, gathered depth-first.
 *
 * `Escape` contributes only its backslash — `\]` reads as `]`.
 */
const toSyntaxSpans = (
  node: SyntaxNode,
  spans: { from: number; to: number }[],
) => {
  for (
    let child = node.firstChild;
    child;
    child = child.nextSibling
  ) {
    if (CONCEALABLE_MARK_NAMES.has(child.name)) {
      spans.push({ from: child.from, to: child.to })
    } else if (child.name === "Escape") {
      spans.push({ from: child.from, to: child.from + 1 })
    } else {
      toSyntaxSpans(child, spans)
    }
  }

  return spans
}

/**
 * What `[from, to)` reads as once its inline syntax is removed.
 *
 * An image's `alt` is an attribute rather than a span a reader can
 * look at, so ``![`code` shot](a.png)`` has to arrive as
 * `code shot` — never as its own source, and never as the empty
 * string the old sibling walk produced. CommonMark says the same:
 * alt is the plain-text rendering of the inline content.
 *
 * Tree order is ascending, so the spans need no sort.
 */
const toPlainText = (
  node: SyntaxNode,
  text: string,
  from: number,
  to: number,
) => {
  let offset = from

  let plainText = ""

  for (const span of toSyntaxSpans(node, [])) {
    if (span.from < offset || span.to > to) {
      continue
    }

    plainText += text.slice(offset, span.from)

    offset = span.to
  }

  return plainText + text.slice(offset, to)
}

/**
 * A heading's `#` run, plus the whitespace after it.
 *
 * Concealing `#` alone would leave the heading text indented by the
 * space that used to separate them — a ragged left edge that reads
 * as a bug. The parser hands back only the hashes, so the trailing
 * run is walked here.
 */
const toHeaderMarkEnd = (text: string, to: number) => {
  let end = to

  while (end < text.length) {
    const character = text[end]

    if (character !== " " && character !== "\t") {
      break
    }

    end += 1
  }

  return end
}

/** A cell region with its surrounding padding removed. */
const toTrimmedBounds = (
  text: string,
  from: number,
  to: number,
) => {
  let start = from

  let end = to

  while (
    start < end &&
    (text[start] === " " || text[start] === "\t")
  ) {
    start += 1
  }

  while (
    end > start &&
    (text[end - 1] === " " || text[end - 1] === "\t")
  ) {
    end -= 1
  }

  return { from: start, to: end }
}

const toAlignment = (
  spec: string,
): LivePreviewTableAlignment => {
  if (spec.startsWith(":") && spec.endsWith(":")) {
    return "center"
  }

  if (spec.endsWith(":")) {
    return "end"
  }

  return "start"
}

/**
 * The delimiter row, read as alignment.
 *
 * It is the one row a rendered table does not show — `| :--- | ---: |`
 * is not content, it is the column spec — so this is where it goes
 * instead of on screen. The parser hands the whole row back as a
 * single `TableDelimiter` child of `Table`, which is what separates
 * it from the `|` between two cells: those are children of the row.
 */
const toColumnAlignments = (
  text: string,
  node: SyntaxNode,
): LivePreviewTableAlignment[] => {
  for (
    let child = node.firstChild;
    child;
    child = child.nextSibling
  ) {
    if (child.name !== "TableDelimiter") {
      continue
    }

    return text
      .slice(child.from, child.to)
      .split("|")
      .map((spec) => spec.trim())
      .filter(
        (spec, index, specs) =>
          spec !== "" ||
          (index !== 0 && index !== specs.length - 1),
      )
      .map(toAlignment)
  }

  return []
}

/**
 * A row's columns, as offset ranges — including the empty ones.
 *
 * Splitting on the `TableCell` children alone would lose them: the
 * parser emits no cell node for `| |`, so a table with a blank cell
 * would render with its remaining cells shifted one column left,
 * which is a data-corrupting kind of wrong even though nothing was
 * written. The `|` positions are the truth, so the gaps between
 * them are the columns, cell node or not.
 */
const toRowRegions = (row: SyntaxNode, text: string) => {
  const regions: { from: number; to: number }[] = []

  let start = row.from

  for (
    let child = row.firstChild;
    child;
    child = child.nextSibling
  ) {
    if (child.name !== "TableDelimiter") {
      continue
    }

    // The leading `|`, which opens no column of its own.
    if (child.from === start) {
      start = child.to

      continue
    }

    regions.push({ from: start, to: child.from })

    start = child.to
  }

  // What is left after the last `|`. Only a column if it holds
  // something: a row that ends with a pipe and then trailing spaces
  // has no final column, and counting one gives every table an
  // empty extra column that nothing in the markdown asked for.
  if (
    start < row.to &&
    text.slice(start, row.to).trim() !== ""
  ) {
    regions.push({ from: start, to: row.to })
  }

  return regions
}

const toCellNodeIn = (
  row: SyntaxNode,
  from: number,
  to: number,
): SyntaxNode | null => {
  for (
    let child = row.firstChild;
    child;
    child = child.nextSibling
  ) {
    if (
      child.name === "TableCell" &&
      child.from >= from &&
      child.to <= to
    ) {
      return child
    }
  }

  return null
}

/**
 * Inline ranges over a slice → the runs a renderer can build DOM
 * from, flattened.
 *
 * Everywhere else in this module a decoration is *applied* to text
 * CodeMirror is already drawing, so overlapping ranges are free —
 * the browser composes them. A widget draws its own text, so they
 * are not: `**a [b](c) d**` is one strong run overlapping one link
 * run, and something has to decide where the spans break. That is
 * this function, and the answer is per character, which is the only
 * version that cannot be defeated by a nesting nobody predicted.
 *
 * Concealed markers are dropped rather than split around, so a run
 * of bold text stays a single segment with its `**` gone from both
 * ends.
 */
export const toInlineSegments = ({
  from,
  ranges,
  text,
  to,
}: {
  from: number
  ranges: readonly LivePreviewRange[]
  text: string
  to: number
}): LivePreviewTableSegment[] => {
  const isHidden = new Array<boolean>(
    Math.max(to - from, 0),
  ).fill(false)

  const marks: {
    from: number
    markKind: LivePreviewMarkKind
    to: number
    url?: string
  }[] = []

  const images = new Map<
    number,
    { alt: string; to: number; url: string }
  >()

  const hide = (hiddenFrom: number, hiddenTo: number) => {
    for (
      let offset = Math.max(hiddenFrom, from);
      offset < Math.min(hiddenTo, to);
      offset += 1
    ) {
      isHidden[offset - from] = true
    }
  }

  for (const range of ranges) {
    if (range.type === "marker" && range.isConcealed) {
      hide(range.from, range.to)
    }

    if (range.type === "mark") {
      marks.push({
        from: range.from,
        markKind: range.markKind,
        to: range.to,
        url: range.url,
      })
    }

    if (range.type === "image") {
      images.set(range.from, {
        alt: range.alt,
        to: range.to,
        url: range.url,
      })

      hide(range.from, range.to)
    }
  }

  const segments: LivePreviewTableSegment[] = []

  let openKey: string | null = null

  let openSegment: {
    markKinds: LivePreviewMarkKind[]
    text: string
    url?: string
  } | null = null

  const flush = () => {
    if (openSegment && openSegment.text !== "") {
      segments.push({ ...openSegment, type: "text" })
    }

    openKey = null

    openSegment = null
  }

  for (let offset = from; offset < to; offset += 1) {
    const image = images.get(offset)

    if (image) {
      flush()

      segments.push({
        alt: image.alt,
        type: "image",
        url: image.url,
      })

      offset = image.to - 1

      continue
    }

    if (isHidden[offset - from]) {
      continue
    }

    const covering = marks.filter(
      (mark) => mark.from <= offset && mark.to > offset,
    )

    const markKinds = [
      ...new Set(covering.map((mark) => mark.markKind)),
    ].sort()

    const url = covering.find((mark) => mark.url)?.url

    const key = `${markKinds.join(" ")}\u0000${url ?? ""}`

    if (key !== openKey) {
      flush()

      openKey = key

      openSegment = {
        markKinds,
        text: "",
        ...(url ? { url } : {}),
      }
    }

    if (openSegment) {
      openSegment.text += text[offset]
    }
  }

  flush()

  return segments
}

/**
 * A table, as rows of rendered cells — or `null` when the parser
 * found no rows at all to render.
 *
 * Rows are padded to a rectangle here rather than in the widget:
 * the width is `max(columns in the delimiter row, columns in the
 * widest row)`, which is deliberately **not** what GitHub renders.
 * GFM drops cells past the header's width, and dropping them in an
 * *editor* means text the author typed is on screen nowhere — a
 * worse failure than a table one column wider than it should be,
 * with the raw markdown one toggle away.
 */
const toTableRows = ({
  node,
  text,
  toEnter,
}: {
  node: SyntaxNode
  text: string
  toEnter: (
    ranges: LivePreviewRange[],
  ) => (nodeRef: SyntaxNodeRef) => boolean
}): LivePreviewTableRow[] | null => {
  const alignments = toColumnAlignments(text, node)

  const rows: LivePreviewTableRow[] = []

  for (
    let child = node.firstChild;
    child;
    child = child.nextSibling
  ) {
    if (
      child.name !== "TableHeader" &&
      child.name !== "TableRow"
    ) {
      continue
    }

    const row = child

    rows.push({
      cells: toRowRegions(row, text).map(
        (region, columnIndex) => {
          const bounds = toTrimmedBounds(
            text,
            region.from,
            region.to,
          )

          const cellNode = toCellNodeIn(
            row,
            bounds.from,
            bounds.to,
          )

          const cellRanges: LivePreviewRange[] = []

          if (cellNode) {
            cellNode.cursor().iterate(toEnter(cellRanges))
          }

          return {
            alignment: alignments[columnIndex] ?? "start",
            from: bounds.from,
            segments: toInlineSegments({
              from: bounds.from,
              ranges: cellRanges,
              text,
              to: bounds.to,
            }),
            to: bounds.to,
          }
        },
      ),
      from: row.from,
      isHeader: row.name === "TableHeader",
      to: row.to,
    })
  }

  if (rows.length === 0) {
    return null
  }

  const columnCount = Math.max(
    alignments.length,
    ...rows.map((row) => row.cells.length),
  )

  return rows.map((row) => ({
    ...row,
    cells: [
      ...row.cells,
      // A short row keeps its shape by gaining empty cells, and
      // they collapse to the end of the row: clicking one puts the
      // caret where the missing `| |` would be typed.
      ...Array.from(
        { length: columnCount - row.cells.length },
        (_unused, index) => ({
          alignment:
            alignments[row.cells.length + index] ?? "start",
          from: row.to,
          segments: [],
          to: row.to,
        }),
      ),
    ],
  }))
}

/**
 * Is this table drawn, or edited?
 *
 * One predicate, used by both passes, because they have to agree:
 * the block pass draws the table exactly when the inline pass steps
 * out of its way, and a disagreement paints the pipes underneath a
 * rendered table or leaves a gap where neither drew anything.
 */
const isTableRendered = ({
  isRawMode,
  node,
  selections,
}: {
  isRawMode: boolean
  node: SyntaxNode
  selections: readonly LivePreviewSelection[]
}) =>
  !isRawMode && !isInside(selections, node.from, node.to)

/**
 * The walk, parameterised by where it writes.
 *
 * Everything the document contains is decorated into the array this
 * is handed; a table cell's contents are decorated into a throwaway
 * one instead, because they are not decorations over the document
 * at all — they describe text a widget will draw itself. Same rules
 * for `**` in a cell as for `**` in a paragraph, one
 * implementation, and the recursion is bounded by the cell subtree
 * rather than by a flag.
 */
const toWalker = ({
  isRawMode,
  selections,
  text,
}: {
  isRawMode: boolean
  selections: readonly LivePreviewSelection[]
  text: string
}) => {
  const toEnter = (ranges: LivePreviewRange[]) => {
    const pushMarker = (
      from: number,
      to: number,
      isRevealed: boolean,
    ) => {
      if (from >= to) {
        return
      }

      ranges.push({
        from,
        isConcealed: !isRawMode && !isRevealed,
        to,
        type: "marker",
      })
    }

    return (nodeRef: SyntaxNodeRef): boolean => {
      const { name } = nodeRef

      const headingKind = HEADING_LINE_KINDS[name]

      if (headingKind) {
        if (!isRawMode) {
          const lineStart = toLineStart(text, nodeRef.from)

          // Zero-length, at the line start. A line decoration is
          // anchored to a position, not a span — give it a real
          // range and CodeMirror throws rather than paints.
          ranges.push({
            from: lineStart,
            lineKind: headingKind,
            to: lineStart,
            type: "line",
          })
        }

        return true
      }

      if (name === "Blockquote" || name === "FencedCode") {
        if (!isRawMode) {
          // One line decoration per line: CodeMirror anchors a line
          // decoration at a line start, so a multi-line block needs
          // one per line rather than one spanning range.
          for (
            let offset = toLineStart(text, nodeRef.from);
            offset < nodeRef.to;
            offset = toLineEnd(text, offset) + 1
          ) {
            ranges.push({
              from: offset,
              lineKind:
                name === "Blockquote"
                  ? "blockquote"
                  : "code",
              to: offset,
              type: "line",
            })
          }
        }

        return true
      }

      if (name === "Table") {
        // A rendered table belongs to the block pass, and this one
        // has nothing to say about lines that will not be drawn.
        if (
          isTableRendered({
            isRawMode,
            node: nodeRef.node,
            selections,
          })
        ) {
          return false
        }

        // Otherwise the caret is in it — or raw mode is on — and
        // this is the *editing* view: the pipes, monospaced, on the
        // same rule as an image or a link. You cannot edit a column
        // you cannot see.
        if (!isRawMode) {
          for (
            let offset = toLineStart(text, nodeRef.from);
            offset < nodeRef.to;
            offset = toLineEnd(text, offset) + 1
          ) {
            ranges.push({
              from: offset,
              lineKind: "table",
              to: offset,
              type: "line",
            })
          }
        }

        return true
      }

      const inlineKind = INLINE_MARK_KINDS[name]

      if (inlineKind) {
        ranges.push({
          from: nodeRef.from,
          markKind: inlineKind,
          to: nodeRef.to,
          type: "mark",
        })

        return true
      }

      if (name === "Image") {
        const node = nodeRef.node

        const urlNode = toChildNamed(node, "URL")

        const openMark = node.firstChild

        const closeMark = toCloseMark(openMark, text)

        const safeUrl = urlNode
          ? toSafeImageUrl(
              text.slice(urlNode.from, urlNode.to),
            )
          : undefined

        // An image whose caret is inside it is markup again: you
        // cannot edit a URL you cannot see. An image whose URL did
        // not survive `toSafeImageUrl` stays markup **always**,
        // which is the honest answer for a document this surface
        // did not write: the reader is shown the source rather than
        // a broken frame or a silently dropped line.
        if (
          !isRawMode &&
          safeUrl !== undefined &&
          openMark &&
          closeMark &&
          !isInside(selections, node.from, node.to)
        ) {
          ranges.push({
            alt: toPlainText(
              node,
              text,
              openMark.to,
              closeMark.from,
            ),
            from: node.from,
            to: node.to,
            type: "image",
            url: safeUrl,
          })

          return false
        }

        /**
         * An image whose URL was refused shows its **whole**
         * construct, markers and all.
         *
         * Not descending is what does it: the `![`, `](` and `)`
         * would otherwise reach the generic concealment rule below
         * and vanish, leaving the alt text welded to a URL with no
         * punctuation between them. This is the same result the
         * refused-link path gets, by the same reasoning — a reader
         * shown the source can see what the file tried to do.
         */
        if (safeUrl === undefined && !isRawMode) {
          return false
        }

        return true
      }

      if (name === "Link") {
        const node = nodeRef.node

        const urlNode = toChildNamed(node, "URL")

        const isRevealed = isInside(
          selections,
          node.from,
          node.to,
        )

        const openMark = node.firstChild

        const closeMark = toCloseMark(openMark, text)

        const safeUrl = urlNode
          ? toSafeLinkUrl(
              text.slice(urlNode.from, urlNode.to),
            )
          : undefined

        /**
         * A link whose URL did not survive the guard is **not a
         * link at all**, and not a link-coloured span that quietly
         * does nothing either.
         *
         * Returning here skips the `linkText` mark *and* the two
         * `pushMarker` calls below, so `[click me](javascript:…)`
         * keeps its brackets, keeps its parentheses and reads as
         * exactly the characters the file contains. A reader who
         * can see the trap is better served than one shown a
         * confident blue word that silently refuses to work.
         */
        if (safeUrl === undefined) {
          return true
        }

        /**
         * `openMark.to < closeMark.from` is the genuinely-empty
         * case and only that: `[](url)`, which has no text to mark.
         * Nested inline markup used to land here too — see
         * `toCloseMark` — and the guard would have hidden that bug
         * rather than fixed it, so it stays narrow on purpose.
         */
        if (
          openMark &&
          closeMark &&
          openMark.to < closeMark.from
        ) {
          ranges.push({
            from: openMark.to,
            markKind: "linkText",
            to: closeMark.from,
            type: "mark",
            url: safeUrl,
          })
        }

        // Children are walked so nested emphasis inside link text
        // still paints, but the marks are emitted here where the
        // whole construct's reveal state is known.
        pushMarker(
          node.from,
          openMark?.to ?? node.from,
          isRevealed,
        )

        if (closeMark) {
          pushMarker(closeMark.from, node.to, isRevealed)
        }

        return true
      }

      if (name === "URL") {
        // A bare URL. GFM's autolink emits a `URL` with no `Link`
        // parent, which is the whole of gap 2 in Docket's handoff:
        // paste a link, get a link, with no `[](…)` typed at all.
        const parentName = nodeRef.node.parent?.name

        const safeUrl = toSafeLinkUrl(
          text.slice(nodeRef.from, nodeRef.to),
        )

        if (
          parentName !== "Link" &&
          parentName !== "Image" &&
          safeUrl !== undefined
        ) {
          ranges.push({
            from: nodeRef.from,
            markKind: "autolink",
            to: nodeRef.to,
            type: "mark",
            url: safeUrl,
          })
        } else {
          ranges.push({
            from: nodeRef.from,
            markKind: "url",
            to: nodeRef.to,
            type: "mark",
          })
        }

        return true
      }

      if (name === "TaskMarker") {
        const isRevealed = isInside(
          selections,
          nodeRef.from,
          nodeRef.to,
        )

        if (!isRawMode && !isRevealed) {
          ranges.push({
            from: nodeRef.from,
            isChecked: text[nodeRef.from + 1] !== " ",
            label: text
              .slice(
                nodeRef.to,
                toLineEnd(text, nodeRef.to),
              )
              .trim(),
            to: nodeRef.to,
            type: "task",
          })

          return false
        }

        pushMarker(nodeRef.from, nodeRef.to, isRevealed)

        return false
      }

      if (PERSISTENT_MARK_NAMES.has(name)) {
        pushMarker(nodeRef.from, nodeRef.to, true)

        return false
      }

      if (name === "TableDelimiter") {
        pushMarker(nodeRef.from, nodeRef.to, true)

        return false
      }

      if (name === "Escape") {
        // `\|` is the only way to put a pipe in a table cell, and
        // the reader wants the pipe, not the backslash. Same rule
        // as any other marker: the caret brings it back.
        pushMarker(
          nodeRef.from,
          nodeRef.from + 1,
          isInside(selections, nodeRef.from, nodeRef.to),
        )

        return false
      }

      if (name === "CodeInfo") {
        pushMarker(nodeRef.from, nodeRef.to, true)

        return false
      }

      if (CONCEALABLE_MARK_NAMES.has(name)) {
        const parent = nodeRef.node.parent

        if (
          parent &&
          FENCED_CODE_PARENTS.has(parent.name)
        ) {
          pushMarker(nodeRef.from, nodeRef.to, true)

          return false
        }

        // A link's marks were already emitted above, with the
        // link's own reveal state spanning both sides of the text.
        // An image's were not — it either replaced itself outright
        // or fell through to here, where the generic parent-range
        // rule is already the correct one.
        if (parent?.name === "Link") {
          return false
        }

        const isRevealed = parent
          ? isInside(selections, parent.from, parent.to)
          : isInside(selections, nodeRef.from, nodeRef.to)

        const to =
          name === "HeaderMark"
            ? toHeaderMarkEnd(text, nodeRef.to)
            : nodeRef.to

        pushMarker(nodeRef.from, to, isRevealed)

        return false
      }

      return true
    }
  }

  return toEnter
}

/**
 * Every decoration the document wants that a plugin may provide, in
 * tree order.
 *
 * Order is not sorted here on purpose — `Decoration.set(ranges,
 * true)` sorts, and doing it twice is the sort of thing that looks
 * free until a document is long.
 */
export const toLivePreviewRanges = ({
  from,
  isRawMode = false,
  selections,
  text,
  to,
  tree,
}: ToLivePreviewRangesOptions): LivePreviewRange[] => {
  const ranges: LivePreviewRange[] = []

  tree.iterate({
    from,
    to,
    enter: toWalker({ isRawMode, selections, text })(
      ranges,
    ),
  })

  return ranges
}

/**
 * Block nodes a table can be nested inside.
 *
 * The block pass is not viewport-limited — it cannot be, since a
 * block decoration is part of what *decides* the viewport — so it
 * pays for the whole document on every keystroke. Descending only
 * into containers keeps that a scan of the block structure rather
 * than a walk of every inline node in the file.
 */
const TABLE_CONTAINER_NAMES = new Set([
  "Blockquote",
  "BulletList",
  "Document",
  "ListItem",
  "OrderedList",
])

/**
 * The tables the document renders, whole-document.
 *
 * Separate from `toLivePreviewRanges` because CodeMirror requires
 * it: block decorations come from a `StateField`, inline ones from
 * a viewport-limited `ViewPlugin`, and the two passes agree via
 * `isTableRendered`.
 */
export const toLivePreviewTableRanges = ({
  isRawMode = false,
  selections,
  text,
  tree,
}: Omit<
  ToLivePreviewRangesOptions,
  "from" | "to"
>): LivePreviewTableRange[] => {
  const ranges: LivePreviewTableRange[] = []

  const toEnter = toWalker({ isRawMode, selections, text })

  tree.iterate({
    enter: (nodeRef) => {
      if (nodeRef.name !== "Table") {
        return TABLE_CONTAINER_NAMES.has(nodeRef.name)
      }

      const node = nodeRef.node

      const rows = isTableRendered({
        isRawMode,
        node,
        selections,
      })
        ? toTableRows({ node, text, toEnter })
        : null

      if (rows) {
        ranges.push({
          from: node.from,
          rows,
          to: node.to,
          type: "table",
        })
      }

      return false
    },
  })

  return ranges
}
