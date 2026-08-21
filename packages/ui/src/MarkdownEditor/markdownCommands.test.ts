import { expect, test } from "vitest"

import {
  continueList,
  getMinimalEdit,
  indentLines,
  insertImage,
  insertLink,
  insertText,
  isLinkPaste,
  MARKDOWN_LINE_PREFIXES,
  outdentLines,
  toggleHeading,
  toggleInlineMarker,
  toggleLinePrefix,
  toMarkdownImage,
  wrapSelectionInLink,
} from "./markdownCommands.ts"

const at = (text: string, marker = "|") => {
  const selectionStart = text.indexOf(marker)

  const withoutFirst = text.replace(marker, "")

  const second = withoutFirst.indexOf(marker)

  return {
    selectionEnd: second === -1 ? selectionStart : second,
    selectionStart,
    text: withoutFirst.replace(marker, ""),
  }
}

test("bold wraps a selection", () => {
  expect(
    toggleInlineMarker(at("a |word| b"), "**"),
  ).toEqual({
    selectionEnd: 8,
    selectionStart: 4,
    text: "a **word** b",
  })
})

/**
 * The case a hand-rolled toggle misses. Double-click a word inside
 * `**bold**` and the browser selects `bold`, not `**bold**` — so
 * looking only *inside* the selection produces `****bold****`.
 */
test("bold unwraps when the markers are outside the selection", () => {
  expect(
    toggleInlineMarker(at("a **|word|** b"), "**"),
  ).toEqual({
    selectionEnd: 6,
    selectionStart: 2,
    text: "a word b",
  })
})

test("bold unwraps when the markers are inside the selection", () => {
  expect(
    toggleInlineMarker(at("a |**word**| b"), "**"),
  ).toEqual({
    selectionEnd: 6,
    selectionStart: 2,
    text: "a word b",
  })
})

test("bold with no selection parks the caret between the markers", () => {
  const result = toggleInlineMarker(at("a |b"), "**")

  expect(result.text).toBe("a ****b")

  expect(result.selectionStart).toBe(4)

  expect(result.selectionEnd).toBe(4)
})

test("a bulleted list toggles across every selected line", () => {
  const bulleted = toggleLinePrefix(
    at("|one\ntwo\nthree|"),
    MARKDOWN_LINE_PREFIXES.bulletList,
  )

  expect(bulleted.text).toBe("- one\n- two\n- three")

  expect(
    toggleLinePrefix(
      { ...bulleted, selectionStart: 0 },
      MARKDOWN_LINE_PREFIXES.bulletList,
    ).text,
  ).toBe("one\ntwo\nthree")
})

test("a numbered list renumbers rather than repeating `1.`", () => {
  expect(
    toggleLinePrefix(
      at("|one\ntwo\nthree|"),
      MARKDOWN_LINE_PREFIXES.orderedList,
    ).text,
  ).toBe("1. one\n2. two\n3. three")
})

/**
 * A mixed block gets the prefix added to all of it. Removal wins
 * only when *every* line already has it — otherwise the button's
 * effect depends on invisible state.
 */
test("a mixed block gains the prefix rather than losing it", () => {
  expect(
    toggleLinePrefix(
      at("|- one\ntwo|"),
      MARKDOWN_LINE_PREFIXES.bulletList,
    ).text,
  ).toBe("- one\n- two")
})

test("a task replaces a bullet instead of nesting inside it", () => {
  expect(
    toggleLinePrefix(
      at("|- one|"),
      MARKDOWN_LINE_PREFIXES.taskList,
    ).text,
  ).toBe("- [ ] one")
})

test("indentation survives a prefix toggle", () => {
  expect(
    toggleLinePrefix(
      at("  |one|"),
      MARKDOWN_LINE_PREFIXES.bulletList,
    ).text,
  ).toBe("  - one")
})

test("a heading replaces a heading rather than stacking", () => {
  expect(toggleHeading(at("### |a|"), 2).text).toBe("## a")

  expect(toggleHeading(at("## |a|"), 2).text).toBe("a")
})

test("Enter continues a bullet, a task, an ordered item and a quote", () => {
  expect(continueList(at("- one|"))?.text).toBe("- one\n- ")

  expect(continueList(at("- [x] one|"))?.text).toBe(
    "- [x] one\n- [ ] ",
  )

  expect(continueList(at("3. one|"))?.text).toBe(
    "3. one\n4. ",
  )

  expect(continueList(at("> one|"))?.text).toBe("> one\n> ")

  expect(continueList(at("  - one|"))?.text).toBe(
    "  - one\n  - ",
  )
})

/**
 * Without this an empty bullet is a trap: every Enter makes another
 * empty bullet and the only way out is Backspace.
 */
test("Enter on an empty item clears the marker", () => {
  const cleared = continueList(at("- one\n- |"))

  expect(cleared?.text).toBe("- one\n")

  expect(cleared?.selectionStart).toBe(6)
})

/**
 * `null` rather than an unchanged state, so the component does not
 * call `preventDefault` and the Enter lands on the native undo
 * stack as an ordinary typing step.
 */
test("Enter outside a list reports null", () => {
  expect(continueList(at("plain|"))).toBeNull()

  // A selection is a replacement, not a continuation.
  expect(continueList(at("- |one|"))).toBeNull()
})

test("indent and outdent move whole lines", () => {
  const indented = indentLines(at("|one\ntwo|"))

  expect(indented.text).toBe("  one\n  two")

  expect(
    outdentLines({ ...indented, selectionStart: 0 }).text,
  ).toBe("one\ntwo")

  // Outdenting a line with nothing to give leaves it alone rather
  // than eating its first character.
  expect(outdentLines(at("|one|")).text).toBe("one")
})

test("a link parks the caret in the destination", () => {
  const linked = insertLink(at("see |this| page"))

  expect(linked.text).toBe("see [this]() page")

  expect(linked.selectionStart).toBe(11)

  expect(linked.selectionEnd).toBe(11)
})

test("an image escapes its alt text and brackets a dirty URL", () => {
  expect(
    toMarkdownImage({
      alt: "a [bracket] and a \\slash",
      url: "https://example.test/a.png",
    }),
  ).toBe(
    "![a \\[bracket\\] and a \\\\slash](https://example.test/a.png)",
  )

  expect(
    toMarkdownImage({
      alt: "spaced",
      url: "https://example.test/one two.png",
    }),
  ).toBe("![spaced](<https://example.test/one two.png>)")

  // A newline in either half would end the construct early and
  // leave stray text in the document.
  expect(
    toMarkdownImage({
      alt: "two\nlines",
      url: "https://example.test/a\n.png",
    }),
  ).toBe("![two lines](https://example.test/a.png)")
})

test("an image lands at the caret", () => {
  expect(
    insertImage(at("before | after"), {
      alt: "shot",
      url: "https://example.test/s.png",
    }).text,
  ).toBe("before ![shot](https://example.test/s.png) after")
})

/**
 * **The no-HTML round trip.**
 *
 * Docket exists partly because HTML in a description field
 * destroyed a previous tracker's data, so this is the assertion
 * that has to hold no matter what else changes: put in a value full
 * of the characters that tempt escaping, run every command over it,
 * and there must still be no tag and no entity in the string that
 * gets stored.
 *
 * It is a strong test because it is checking a *structural*
 * property rather than a behaviour: none of these functions
 * constructs HTML, so none of them can leak it. If somebody later
 * reaches for a "render to HTML and parse it back" shortcut, this
 * is what fails.
 */
test("no command can put an HTML tag or an entity in the value", () => {
  const dangerous = [
    "<script>alert('xss')</script>",
    "<b>already bold</b>",
    "a < b && c > d",
    "&amp; &lt; &gt; &quot; &#x27;",
    "\"double\" and 'single' quotes",
    "5 < 6 & 7 > 6",
    "- <li>a list item that is not one</li>",
    "| <td> | </td> |",
  ].join("\n")

  const wholeDocument = {
    selectionEnd: dangerous.length,
    selectionStart: 0,
    text: dangerous,
  }

  // Everything that transforms the document while leaving its
  // characters in place. An escaping pass anywhere in the pipeline
  // would shred all three of the fragments below.
  const transformed = [
    toggleInlineMarker(wholeDocument, "**"),
    toggleInlineMarker(wholeDocument, "`"),
    toggleHeading(wholeDocument, 3),
    toggleLinePrefix(
      wholeDocument,
      MARKDOWN_LINE_PREFIXES.bulletList,
    ),
    toggleLinePrefix(
      wholeDocument,
      MARKDOWN_LINE_PREFIXES.orderedList,
    ),
    toggleLinePrefix(
      wholeDocument,
      MARKDOWN_LINE_PREFIXES.taskList,
    ),
    toggleLinePrefix(
      wholeDocument,
      MARKDOWN_LINE_PREFIXES.blockquote,
    ),
    indentLines(wholeDocument),
    outdentLines(wholeDocument),
    insertLink(wholeDocument, "https://example.test/x"),
  ]

  for (const result of transformed) {
    // Verbatim, not merely "contains no `&lt;`" — the source
    // deliberately *has* `&lt;` in it as literal text, so a naive
    // absence check would pass on an escaped value and fail on a
    // correct one.
    expect(result.text).toContain(
      "<script>alert('xss')</script>",
    )

    expect(result.text).toContain("<b>already bold</b>")

    expect(result.text).toContain(
      "&amp; &lt; &gt; &quot; &#x27;",
    )

    expect(result.text).not.toContain("&lt;script&gt;")
  }

  // The two commands that *replace* the selection rather than
  // transforming it, checked on what they emit.
  expect(
    insertImage(wholeDocument, {
      alt: "<img onerror=alert(1)>",
      url: "https://example.test/x.png",
    }).text,
  ).toBe(
    "![<img onerror=alert(1)>](https://example.test/x.png)",
  )

  expect(insertText(wholeDocument, dangerous).text).toBe(
    dangerous,
  )

  // And the round trip: typing the value straight back in returns
  // it character for character.
  expect(
    insertText(
      { selectionEnd: 0, selectionStart: 0, text: "" },
      dangerous,
    ).text,
  ).toBe(dangerous)
})

/**
 * Whole-string assignment wipes the browser's undo stack, so every
 * command's result is turned back into the smallest range
 * replacement and applied through the platform's own editing
 * pipeline. One bold toggle should be one undo step over four
 * characters, not a document-sized one.
 */
test("the minimal edit is the smallest range that explains the change", () => {
  expect(
    getMinimalEdit("a word b", "a **word** b"),
  ).toEqual({ end: 6, start: 2, text: "**word**" })

  expect(getMinimalEdit("same", "same")).toEqual({
    end: 4,
    start: 4,
    text: "",
  })

  expect(getMinimalEdit("abc", "ac")).toEqual({
    end: 2,
    start: 1,
    text: "",
  })

  // Repetitive strings are where a naive prefix/suffix scan
  // produces an overlapping — i.e. negative-length — range.
  expect(getMinimalEdit("aaaa", "aaaaa")).toEqual({
    end: 4,
    start: 4,
    text: "a",
  })

  expect(getMinimalEdit("aaaaa", "aaaa")).toEqual({
    end: 5,
    start: 4,
    text: "",
  })
})

/**
 * Pasting a URL over selected text is what every editor the owner
 * uses already does, and its absence is why a link pasted into a
 * Docket description stayed flat text.
 */
test("a URL pasted over a selection wraps it", () => {
  expect(
    wrapSelectionInLink(
      at("see |the docs| now"),
      "https://example.com",
    ),
  ).toEqual({
    // After the whole insertion, not inside the destination: the
    // URL is already known, so parking the caret in it would ask
    // the user to replace what they just pasted.
    selectionEnd: 35,
    selectionStart: 35,
    text: "see [the docs](https://example.com) now",
  })
})

test("a URL pasted with no selection is inserted plainly", () => {
  // Autolink renders a bare URL as a link anyway, so wrapping it
  // with no text would produce `[](url)` — an empty link.
  expect(
    wrapSelectionInLink(
      at("see | now"),
      "https://example.com",
    ),
  ).toEqual({
    selectionEnd: 23,
    selectionStart: 23,
    text: "see https://example.com now",
  })
})

test.each([
  ["https://example.com", true],
  ["http://example.com/a?b=c#d", true],
  ["  https://example.com  ", true],
  ["not a url", false],
  ["", false],
  // Deliberately strict: a paste that is only *mostly* a URL is
  // left alone, because mangling a literal paste is worse than
  // not linkifying one.
  ["see https://example.com", false],
  ["https://a.com https://b.com", false],
  ["mailto:someone@example.com", false],
  ["www.example.com", false],
])("isLinkPaste(%j) is %s", (pasted, isExpected) => {
  expect(isLinkPaste(pasted)).toBe(isExpected)
})
