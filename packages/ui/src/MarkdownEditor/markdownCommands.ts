/**
 * Every edit the editor can make, as pure text-in / text-out.
 *
 * Nothing here touches the DOM, so the whole formatting grammar —
 * what Ctrl+B does to a selection that already has asterisks
 * outside it, what Enter does at the end of an empty list item,
 * how an ordered list renumbers when you promote three paragraphs
 * — is a Node test rather than a browser one. That split is not
 * tidiness: the browser suite is where the expensive tests live,
 * and this is the half with all the edge cases.
 *
 * ### Everything is `{ selectionEnd, selectionStart, text }`
 *
 * The same three fields a `<textarea>` exposes, in and out. A
 * command takes the state the control is in and returns the state
 * it should be in, and the component's only job is to get from one
 * to the other without breaking undo.
 *
 * ### And that is what `getMinimalEdit` is for
 *
 * Writing `textarea.value = next` — or handing a controlled React
 * `value` a new string — **erases the browser's undo stack**. Ctrl+Z
 * after a toolbar click then jumps past everything the user typed,
 * or does nothing at all. The fix is to express the change as a
 * *replacement of a range*, select that range, and let the browser
 * apply it through its own editing pipeline
 * (`document.execCommand("insertText", …)`, which is deprecated and
 * is still the only API that appends to the native undo stack).
 *
 * So commands return whole strings, because that is the easy thing
 * to reason about and to test, and `getMinimalEdit` turns the pair
 * back into the range replacement the DOM wants. A bold toggle
 * becomes one undo step covering four characters instead of a
 * document-sized one.
 *
 * ### No HTML, anywhere
 *
 * Every function here returns markdown. There is no serialiser, no
 * intermediate document model, and no HTML string — which is the
 * mechanical reason `<b>` cannot reach the stored value: nothing in
 * this file can produce one, and the surface these run against is a
 * `<textarea>`, which takes `text/plain` off the clipboard and
 * nothing else.
 */

export type MarkdownSelection = {
  selectionEnd: number
  selectionStart: number
  text: string
}

export type MarkdownLinePrefix = {
  /**
   * Matches a line that **already is** this kind, which is what
   * decides whether the toggle adds or removes.
   */
  pattern: RegExp
  /**
   * What to take off before adding — wider than `pattern`, and the
   * two genuinely differ. A task list *detects* `- [ ] `, because a
   * plain bullet is not a task; but it *strips* the bare `- ` too,
   * so toggling a task on an existing bullet replaces the marker
   * instead of producing `- - [ ] `. Collapsing these into one
   * regex is how that bug gets written.
   */
  stripPattern: RegExp
  /**
   * The prefix to add, given the line's zero-based position inside
   * the selection. Ordered lists are the only kind that uses the
   * argument, and it is why this is a function.
   */
  toPrefix: (indexInSelection: number) => string
}

/**
 * The prefixes the toolbar and the shortcuts drive, written out
 * rather than derived.
 *
 * `task` deliberately matches a plain bullet's prefix *plus* the
 * checkbox, so toggling a task on an existing `- item` replaces the
 * bullet rather than nesting one inside the other.
 */
export const MARKDOWN_LINE_PREFIXES = {
  blockquote: {
    pattern: /^>[ \t]?/,
    stripPattern: /^>[ \t]?/,
    toPrefix: () => "> ",
  },
  bulletList: {
    pattern: /^[-*+][ \t]+(?:\[[ xX]\][ \t]*)?/,
    stripPattern: /^[-*+][ \t]+(?:\[[ xX]\][ \t]*)?/,
    toPrefix: () => "- ",
  },
  orderedList: {
    pattern: /^\d{1,9}[.)][ \t]+/,
    stripPattern: /^\d{1,9}[.)][ \t]+/,
    toPrefix: (indexInSelection: number) =>
      `${indexInSelection + 1}. `,
  },
  taskList: {
    pattern: /^[-*+][ \t]+\[[ xX]\][ \t]*/,
    stripPattern: /^[-*+][ \t]+(?:\[[ xX]\][ \t]*)?/,
    toPrefix: () => "- [ ] ",
  },
} as const satisfies Record<string, MarkdownLinePrefix>

const INDENT_PATTERN = /^[ \t]*/

const HEADING_PATTERN = /^#{1,6}[ \t]+/

/**
 * A continuable line: an ordered item, a bullet, a task, or a
 * blockquote — with its indent, its marker, its optional checkbox
 * and whatever came after them, captured separately so Enter can
 * rebuild the marker without the content.
 */
const CONTINUABLE_PATTERN =
  /^([ \t]*)(?:(\d{1,9})([.)])[ \t]+|([-*+])[ \t]+|(>[ \t]?))(\[[ xX]\][ \t]*)?(.*)$/

/** The character range of the whole lines a selection touches. */
export const getLineRange = ({
  selectionEnd,
  selectionStart,
  text,
}: MarkdownSelection): { end: number; start: number } => {
  const start =
    text.lastIndexOf("\n", selectionStart - 1) + 1

  const nextNewline = text.indexOf("\n", selectionEnd)

  return {
    end: nextNewline === -1 ? text.length : nextNewline,
    start,
  }
}

const replaceRange = ({
  end,
  insertion,
  selectionEnd,
  selectionStart,
  start,
  text,
}: {
  end: number
  insertion: string
  selectionEnd: number
  selectionStart: number
  start: number
  text: string
}): MarkdownSelection => ({
  selectionEnd,
  selectionStart,
  text: text.slice(0, start) + insertion + text.slice(end),
})

/** Type text over the selection, as if it had been typed. */
export const insertText = (
  { selectionEnd, selectionStart, text }: MarkdownSelection,
  insertion: string,
): MarkdownSelection =>
  replaceRange({
    end: selectionEnd,
    insertion,
    selectionEnd: selectionStart + insertion.length,
    selectionStart: selectionStart + insertion.length,
    start: selectionStart,
    text,
  })

/**
 * Wrap or unwrap a selection in `**`, `_`, `` ` `` or `~~`.
 *
 * Three cases, and the middle one is the one hand-rolled editors
 * miss: the markers may be **outside** the selection. Double-click
 * a word inside `**bold**` and the browser selects `bold`, not
 * `**bold**`, so a naive implementation adds a second pair and
 * produces `****bold****`. Looking just past both ends first is
 * what makes Ctrl+B genuinely a toggle.
 */
export const toggleInlineMarker = (
  { selectionEnd, selectionStart, text }: MarkdownSelection,
  marker: string,
): MarkdownSelection => {
  const selected = text.slice(selectionStart, selectionEnd)

  if (
    selected.length >= marker.length * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)
  ) {
    const stripped = selected.slice(
      marker.length,
      selected.length - marker.length,
    )

    return replaceRange({
      end: selectionEnd,
      insertion: stripped,
      selectionEnd: selectionStart + stripped.length,
      selectionStart,
      start: selectionStart,
      text,
    })
  }

  const isWrappedOutside =
    text.slice(
      selectionStart - marker.length,
      selectionStart,
    ) === marker &&
    text.slice(
      selectionEnd,
      selectionEnd + marker.length,
    ) === marker

  if (isWrappedOutside) {
    return replaceRange({
      end: selectionEnd + marker.length,
      insertion: selected,
      selectionEnd:
        selectionStart - marker.length + selected.length,
      selectionStart: selectionStart - marker.length,
      start: selectionStart - marker.length,
      text,
    })
  }

  return replaceRange({
    end: selectionEnd,
    insertion: `${marker}${selected}${marker}`,
    // The caret lands *inside* the new pair when nothing was
    // selected, so Ctrl+B then typing works the way it does in
    // every other editor.
    selectionEnd:
      selectionStart + marker.length + selected.length,
    selectionStart: selectionStart + marker.length,
    start: selectionStart,
    text,
  })
}

/**
 * Add or remove a line prefix across every line the selection
 * touches.
 *
 * Removal wins when **every** line already has the prefix, which is
 * the behaviour that makes the toolbar button a toggle rather than
 * a one-way trip. A mixed block — two bullets and a paragraph —
 * gets the prefix added to all three, because the alternative is a
 * button whose effect depends on invisible state.
 */
export const toggleLinePrefix = (
  state: MarkdownSelection,
  { pattern, stripPattern, toPrefix }: MarkdownLinePrefix,
): MarkdownSelection => {
  const { end, start } = getLineRange(state)

  const lines = state.text.slice(start, end).split("\n")

  const hasPrefixEverywhere = lines.every((line) =>
    pattern.test(line.replace(INDENT_PATTERN, "")),
  )

  const nextLines = lines.map((line, indexInSelection) => {
    const indent = INDENT_PATTERN.exec(line)?.[0] ?? ""

    const body = line.slice(indent.length)

    const stripped = body.replace(stripPattern, "")

    return hasPrefixEverywhere
      ? `${indent}${stripped}`
      : `${indent}${toPrefix(indexInSelection)}${stripped}`
  })

  const insertion = nextLines.join("\n")

  return replaceRange({
    end,
    insertion,
    selectionEnd: start + insertion.length,
    selectionStart: start,
    start,
    text: state.text,
  })
}

/**
 * `#` … `######`, and pressing the same level twice removes it.
 *
 * A heading replaces any heading already on the line rather than
 * stacking, so H2-then-H3 is H3 and not `## ### `.
 */
export const toggleHeading = (
  state: MarkdownSelection,
  level: number,
): MarkdownSelection => {
  const { end, start } = getLineRange(state)

  const wanted = `${"#".repeat(level)} `

  const insertion = state.text
    .slice(start, end)
    .split("\n")
    .map((line) => {
      const indent = INDENT_PATTERN.exec(line)?.[0] ?? ""

      const body = line.slice(indent.length)

      const existing = HEADING_PATTERN.exec(body)?.[0]

      const stripped = body.replace(HEADING_PATTERN, "")

      return existing?.trimEnd() === wanted.trimEnd()
        ? `${indent}${stripped}`
        : `${indent}${wanted}${stripped}`
    })
    .join("\n")

  return replaceRange({
    end,
    insertion,
    selectionEnd: start + insertion.length,
    selectionStart: start,
    start,
    text: state.text,
  })
}

/**
 * Markdown-safe `![alt](url)`.
 *
 * The alt text is escaped rather than stripped — a filename with a
 * bracket in it is legal, and silently deleting characters out of
 * somebody's caption is worse than the escape being visible. The
 * destination goes inside angle brackets when it contains anything
 * that would end the destination early, which is the CommonMark
 * spelling for "this whole thing is the URL".
 */
export const toMarkdownImage = ({
  alt = "",
  url,
}: {
  alt?: string
  url: string
}): string => {
  const safeAlt = alt
    .replace(/[\r\n]+/g, " ")
    .replace(/([\\[\]])/g, "\\$1")

  const flatUrl = url.replace(/[\r\n]+/g, "")

  const safeUrl = /[\s()<>]/.test(flatUrl)
    ? `<${flatUrl.replace(/([<>])/g, "\\$1")}>`
    : flatUrl

  return `![${safeAlt}](${safeUrl})`
}

/** Insert an image at the caret, replacing any selection. */
export const insertImage = (
  state: MarkdownSelection,
  image: { alt?: string; url: string },
): MarkdownSelection =>
  insertText(state, toMarkdownImage(image))

/**
 * `[selected](url)`, with the caret parked in the destination when
 * there is nothing to put there yet — which is the only reason this
 * is not `toggleInlineMarker` with a funny marker.
 */
export const insertLink = (
  state: MarkdownSelection,
  url = "",
): MarkdownSelection => {
  const selected = state.text.slice(
    state.selectionStart,
    state.selectionEnd,
  )

  const insertion = `[${selected}](${url})`

  const destinationStart =
    state.selectionStart + selected.length + 3

  return replaceRange({
    end: state.selectionEnd,
    insertion,
    selectionEnd: destinationStart + url.length,
    selectionStart: destinationStart,
    start: state.selectionStart,
    text: state.text,
  })
}

/**
 * What Enter should do inside a list, a task list or a blockquote —
 * or `null` when it should do the ordinary thing and the component
 * must not call `preventDefault`.
 *
 * Two behaviours, and the second is the one people notice when it
 * is missing: continuing the marker onto the next line, and
 * **clearing** it when the item is empty. Without the second, an
 * empty bullet is a trap — every Enter makes another empty bullet
 * and the only way out is Backspace.
 *
 * Returning `null` rather than the unchanged state is deliberate.
 * A plain Enter has to fall through to the browser so it lands on
 * the native undo stack as a normal typing step.
 */
export const continueList = ({
  selectionEnd,
  selectionStart,
  text,
}: MarkdownSelection): MarkdownSelection | null => {
  if (selectionStart !== selectionEnd) {
    return null
  }

  const lineStart =
    text.lastIndexOf("\n", selectionStart - 1) + 1

  const line = text.slice(lineStart, selectionStart)

  const match = CONTINUABLE_PATTERN.exec(line)

  if (!match) {
    return null
  }

  const [
    ,
    indent = "",
    orderedNumber,
    orderedDelimiter,
    bullet,
    quote,
    checkbox,
    content = "",
  ] = match

  if (content === "") {
    // An empty item: clear the marker instead of making another
    // one. The line becomes its own indent, and the caret sits at
    // the end of it.
    return replaceRange({
      end: selectionStart,
      insertion: indent,
      selectionEnd: lineStart + indent.length,
      selectionStart: lineStart + indent.length,
      start: lineStart,
      text,
    })
  }

  const nextMarker =
    orderedNumber === undefined
      ? `${bullet ?? quote ?? ""}${quote === undefined ? " " : ""}`
      : `${Number(orderedNumber) + 1}${orderedDelimiter ?? "."} `

  const insertion = `\n${indent}${nextMarker}${
    checkbox === undefined ? "" : "[ ] "
  }`

  return replaceRange({
    end: selectionEnd,
    insertion,
    selectionEnd: selectionStart + insertion.length,
    selectionStart: selectionStart + insertion.length,
    start: selectionStart,
    text,
  })
}

const INDENT_UNIT = "  "

/** Two spaces onto every line the selection touches. */
export const indentLines = (
  state: MarkdownSelection,
): MarkdownSelection => {
  const { end, start } = getLineRange(state)

  const insertion = state.text
    .slice(start, end)
    .split("\n")
    .map((line) => `${INDENT_UNIT}${line}`)
    .join("\n")

  return replaceRange({
    end,
    insertion,
    selectionEnd: start + insertion.length,
    selectionStart: start,
    start,
    text: state.text,
  })
}

/** Up to two spaces, or one tab, off every line. */
export const outdentLines = (
  state: MarkdownSelection,
): MarkdownSelection => {
  const { end, start } = getLineRange(state)

  const insertion = state.text
    .slice(start, end)
    .split("\n")
    .map((line) => line.replace(/^(?: {1,2}|\t)/, ""))
    .join("\n")

  return replaceRange({
    end,
    insertion,
    selectionEnd: start + insertion.length,
    selectionStart: start,
    start,
    text: state.text,
  })
}

/**
 * The smallest range replacement that turns `before` into `after`.
 *
 * Whole-string commands are easy to write and easy to test; whole
 * string *assignments* destroy undo. This closes the gap between
 * the two by finding the common prefix and the common suffix and
 * reporting only what is left, so a bold toggle on one word is one
 * four-character edit and one undo step — not a document-sized one
 * that swallows the paragraph the user typed before it.
 *
 * The prefix scan runs first and the suffix scan is bounded by what
 * it left, so the two can never overlap on a repetitive string
 * (`aaaa` → `aaaaa` reports an insert, not a negative range).
 */
export const getMinimalEdit = (
  before: string,
  after: string,
): { end: number; start: number; text: string } => {
  const shortest = Math.min(before.length, after.length)

  let start = 0

  while (
    start < shortest &&
    before[start] === after[start]
  ) {
    start += 1
  }

  let suffix = 0

  while (
    suffix < shortest - start &&
    before[before.length - 1 - suffix] ===
      after[after.length - 1 - suffix]
  ) {
    suffix += 1
  }

  return {
    end: before.length - suffix,
    start,
    text: after.slice(start, after.length - suffix),
  }
}
