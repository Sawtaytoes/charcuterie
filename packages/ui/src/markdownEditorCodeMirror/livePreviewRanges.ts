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

import type { SyntaxNode, Tree } from "@lezer/common"

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

/**
 * Every decoration the document wants, in tree order.
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

  tree.iterate({
    from,
    to,
    enter: (nodeRef) => {
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

        const closeMark = openMark?.nextSibling

        // An image whose caret is inside it is markup again: you
        // cannot edit a URL you cannot see.
        if (
          !isRawMode &&
          urlNode &&
          openMark &&
          closeMark &&
          !isInside(selections, node.from, node.to)
        ) {
          ranges.push({
            alt: text.slice(openMark.to, closeMark.from),
            from: node.from,
            to: node.to,
            type: "image",
            url: text.slice(urlNode.from, urlNode.to),
          })

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

        const closeMark = openMark?.nextSibling

        if (urlNode && openMark && closeMark) {
          ranges.push({
            from: openMark.to,
            markKind: "linkText",
            to: closeMark.from,
            type: "mark",
            url: text.slice(urlNode.from, urlNode.to),
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

        if (
          parentName !== "Link" &&
          parentName !== "Image"
        ) {
          ranges.push({
            from: nodeRef.from,
            markKind: "autolink",
            to: nodeRef.to,
            type: "mark",
            url: text.slice(nodeRef.from, nodeRef.to),
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
    },
  })

  return ranges
}
