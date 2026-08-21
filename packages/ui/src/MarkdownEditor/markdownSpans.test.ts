import { expect, test } from "vitest"

import {
  toInlineSpans,
  toLineIndex,
  toMarkdownLines,
} from "./markdownSpans.ts"

/**
 * The corpus every invariant below runs over. Deliberately nasty:
 * the constructs the editor colours, the ones it does not, and the
 * characters that tempt an HTML-escaping implementation.
 */
const CORPUS = [
  "",
  "\n",
  "plain text",
  "# Heading one",
  "###### Heading six with **bold** and `code`",
  "#no-space-is-not-a-heading",
  "  ## indented heading",
  "> quoted line",
  ">> doubly quoted",
  "> ## a heading inside a quote",
  "- bullet",
  "* star bullet",
  "+ plus bullet",
  "1. ordered",
  "12) ordered with a paren",
  "- [ ] unchecked task",
  "- [x] checked task",
  "  - nested bullet",
  "---",
  "***",
  "| a | b |",
  "| --- | --- |",
  "| `code` | **bold** |",
  "text with **bold** and _em_ and ~~struck~~ and `code`",
  "an ![image](https://example.test/a.png) inline",
  "a [link](https://example.test/page) inline",
  "escaped \\*not emphasis\\* here",
  "`**not bold inside code**`",
  "unterminated **bold",
  "unterminated `code",
  "```ts",
  "const x = '**not bold**'",
  "```",
  "5 * 3 * 2 is arithmetic",
  "snake_case_identifier stays plain",
  "<script>alert('xss')</script>",
  "a < b && c > d",
  "&amp; &lt; &#x27; &quot;",
  "1 < 2 > 3 <b>bold?</b>",
  "trailing spaces   ",
  "\ttab indented",
].join("\n")

/**
 * **The invariant the whole component rests on.**
 *
 * The painted layer sits behind a real `<textarea>` in one grid
 * cell, and the two only stay registered while they contain the
 * same characters in the same order. Drop a trailing space,
 * normalise a tab, swallow an unterminated marker — any of them
 * shears the caret away from the glyphs, by a character per
 * offence, cumulative down the line. Nothing else would catch it:
 * the colours look right, axe is silent, and it only shows up as a
 * cursor that is slightly in the wrong place.
 */
test("every character survives tokenizing", () => {
  const rebuilt = toMarkdownLines(CORPUS)
    .map((line) =>
      line.spans.map((span) => span.text).join(""),
    )
    .join("\n")

  expect(rebuilt).toBe(CORPUS)
})

test("the line count matches the source exactly", () => {
  expect(toMarkdownLines(CORPUS)).toHaveLength(
    CORPUS.split("\n").length,
  )

  // An empty document still has one line, because the caret has to
  // sit somewhere and the painted layer needs a row to agree about.
  expect(toMarkdownLines("")).toHaveLength(1)
})

/**
 * The no-HTML guarantee, at the layer where an implementation is
 * most tempted to break it. Nothing here builds a string for
 * `innerHTML`, so a tag in the source has to come back out as
 * *text* — not as `&lt;script&gt;`, and not as markup.
 */
test("HTML in the source stays literal text", () => {
  const source =
    "<script>alert('x')</script> & <b>bold</b> \"quoted\" 'single'"

  const spans = toMarkdownLines(source).flatMap(
    (line) => line.spans,
  )

  const rebuilt = spans.map((span) => span.text).join("")

  expect(rebuilt).toBe(source)

  expect(rebuilt).not.toContain("&lt;")

  expect(rebuilt).not.toContain("&amp;")
})

test("headings, lists, quotes and tables are told apart", () => {
  const kinds = toMarkdownLines(
    [
      "# Heading",
      "- bullet",
      "> quote",
      "| a |",
      "---",
      "plain",
      "```",
      "fenced",
      "```",
    ].join("\n"),
  ).map((line) => line.kind)

  expect(kinds).toEqual([
    "heading",
    "list",
    "blockquote",
    "table",
    "thematicBreak",
    "paragraph",
    "code",
    "code",
    "code",
  ])
})

test("a fence suppresses every construct inside it", () => {
  const [, inside] = toMarkdownLines(
    "```\n**not bold** and [not a link](x)\n```",
  )

  expect(inside?.spans).toEqual([
    {
      kind: "code",
      text: "**not bold** and [not a link](x)",
    },
  ])
})

test("a code span suppresses emphasis inside it", () => {
  expect(toInlineSpans("`**a**`")).toEqual([
    { kind: "marker", text: "`" },
    { kind: "code", text: "**a**" },
    { kind: "marker", text: "`" },
  ])
})

test("an escape wins over the character it escapes", () => {
  expect(toInlineSpans("\\*a\\*")).toEqual([
    { kind: "marker", text: "\\" },
    { kind: "plain", text: "*a" },
    { kind: "marker", text: "\\" },
    { kind: "plain", text: "*" },
  ])
})

test("strong beats emphasis, because `**` starts with `*`", () => {
  expect(toInlineSpans("**a**")).toEqual([
    { kind: "marker", text: "**" },
    { kind: "strong", text: "a" },
    { kind: "marker", text: "**" },
  ])
})

test("an image is told apart from the link inside it", () => {
  expect(toInlineSpans("![alt](u)")).toEqual([
    { kind: "marker", text: "![" },
    { kind: "link", text: "alt" },
    { kind: "marker", text: "](" },
    { kind: "url", text: "u" },
    { kind: "marker", text: ")" },
  ])
})

/**
 * Adjacent spans of one kind are merged as they are pushed. Without
 * it a 200-character paragraph is 200 React elements and every
 * keystroke reconciles all of them.
 */
test("plain runs are one span, not one per character", () => {
  expect(toInlineSpans("hello world")).toEqual([
    { kind: "plain", text: "hello world" },
  ])
})

test("the caret's line is found from its offset", () => {
  const text = "one\ntwo\nthree"

  expect(toLineIndex(text, 0)).toBe(0)

  expect(toLineIndex(text, 3)).toBe(0)

  expect(toLineIndex(text, 4)).toBe(1)

  expect(toLineIndex(text, text.length)).toBe(2)

  // Out of range on both ends rather than throwing: the caret is
  // read from a live control and a stale offset must not crash a
  // render.
  expect(toLineIndex(text, -10)).toBe(0)

  expect(toLineIndex(text, 9999)).toBe(2)
})

/**
 * Gap 2 of Docket's markdown handoff. A URL pasted into a
 * description used to tokenize as prose — no `url` span, nothing to
 * paint, and indistinguishable from the words around it.
 */
test("a bare URL paints as a URL without being marked up", () => {
  expect(
    toInlineSpans("see https://example.com now"),
  ).toEqual([
    { kind: "plain", text: "see " },
    { kind: "url", text: "https://example.com" },
    { kind: "plain", text: " now" },
  ])
})

test("a sentence's full stop is not part of the URL", () => {
  expect(
    toInlineSpans("read https://example.com/a."),
  ).toEqual([
    { kind: "plain", text: "read " },
    { kind: "url", text: "https://example.com/a" },
    { kind: "plain", text: "." },
  ])
})

test("a parenthesised URL does not swallow the paren", () => {
  expect(
    toInlineSpans("(see https://example.com)"),
  ).toEqual([
    { kind: "plain", text: "(see " },
    { kind: "url", text: "https://example.com" },
    { kind: "plain", text: ")" },
  ])
})

/**
 * The destination inside an explicit link is already a `url` span
 * emitted by the link rule, and the link rule runs first. If
 * autolink won here, the `](` and `)` would stop being markers.
 */
test("an explicit link still tokenizes as a link", () => {
  expect(
    toInlineSpans("[docs](https://example.com)"),
  ).toEqual([
    { kind: "marker", text: "[" },
    { kind: "link", text: "docs" },
    { kind: "marker", text: "](" },
    { kind: "url", text: "https://example.com" },
    { kind: "marker", text: ")" },
  ])
})

/**
 * Autolink runs before emphasis, which fixes a bug that predates
 * it: the stretch between two underscores in a URL used to paint
 * as italic text.
 */
test("underscores inside a URL are not emphasis", () => {
  expect(
    toInlineSpans("https://example.com/a_b_c"),
  ).toEqual([
    { kind: "url", text: "https://example.com/a_b_c" },
  ])
})
