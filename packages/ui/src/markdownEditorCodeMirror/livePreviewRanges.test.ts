import { markdownLanguage } from "@codemirror/lang-markdown"
import { describe, expect, test } from "vitest"

import type {
  LivePreviewRange,
  LivePreviewSelection,
} from "./livePreviewRanges.ts"
import { toLivePreviewRanges } from "./livePreviewRanges.ts"

/**
 * The real GFM parser, not a stub.
 *
 * These offsets are the ones the editor decorates at runtime, so a
 * fixture parser would test the fixture. `markdownLanguage` is the
 * GFM dialect — which is also what makes the bare-URL cases below
 * meaningful, since strict CommonMark does not autolink.
 */
const toRanges = (
  text: string,
  selections: readonly LivePreviewSelection[] = [],
  isRawMode = false,
) =>
  toLivePreviewRanges({
    isRawMode,
    selections,
    text,
    tree: markdownLanguage.parser.parse(text),
  })

const toTextOf = (text: string, range: LivePreviewRange) =>
  text.slice(range.from, range.to)

/**
 * Narrows away the `undefined` a `find` returns, failing the test
 * with a useful message rather than a non-null assertion that would
 * throw `Cannot read properties of undefined` three lines later.
 */
const toFound = <FoundRange>(
  range: FoundRange | undefined,
): FoundRange => {
  expect(range).toBeDefined()

  return range as FoundRange
}

/** Selection collapsed at an offset, as a caret is. */
const atCaret = (offset: number) => [
  { from: offset, to: offset },
]

describe("toLivePreviewRanges", () => {
  describe("the concealment invariant", () => {
    test("never reports a range outside the document", () => {
      const text =
        "# Heading\n\n**bold** [link](https://example.com)\n\n- [ ] task\n"

      for (const range of toRanges(text)) {
        expect(range.from).toBeGreaterThanOrEqual(0)

        expect(range.to).toBeLessThanOrEqual(text.length)

        expect(range.from).toBeLessThanOrEqual(range.to)
      }
    })

    test("conceals markers rather than describing an edit", () => {
      const text = "**bold**"

      const concealed = toRanges(text).filter(
        (range) =>
          range.type === "marker" && range.isConcealed,
      )

      // Both runs of asterisks, and nothing else. The document is
      // untouched — these are view ranges over the original string.
      expect(
        concealed.map((range) => toTextOf(text, range)),
      ).toEqual(["**", "**"])
    })
  })

  describe("headings", () => {
    test("scales the line and conceals the hashes with their space", () => {
      const text = "### Heading three"

      const ranges = toRanges(text)

      expect(
        ranges.find((range) => range.type === "line"),
      ).toMatchObject({
        from: 0,
        lineKind: "heading3",
        to: 0,
      })

      const marker = ranges.find(
        (range) => range.type === "marker",
      )

      // "### " — the trailing space goes with the hashes, or the
      // heading text sits one column in from the margin.
      expect(toTextOf(text, toFound(marker))).toBe("### ")
    })

    test.each([
      ["# one", "heading1"],
      ["## two", "heading2"],
      ["#### four", "heading4"],
      ["##### five", "heading5"],
      ["###### six", "heading6"],
    ])("maps %s to %s", (text, lineKind) => {
      expect(
        toRanges(text).find(
          (range) => range.type === "line",
        ),
      ).toMatchObject({ lineKind })
    })
  })

  describe("the caret reveals what it is inside", () => {
    test("keeps markers concealed while the caret is elsewhere", () => {
      const text = "a **bold** word"

      const marker = toRanges(text, atCaret(0)).find(
        (range) => range.type === "marker",
      )

      expect(marker).toMatchObject({ isConcealed: true })
    })

    test("reveals markers once the caret is inside the construct", () => {
      const text = "a **bold** word"

      // Offset 5 is between the asterisks, inside "bold".
      const markers = toRanges(text, atCaret(5)).filter(
        (range) => range.type === "marker",
      )

      expect(markers).not.toHaveLength(0)

      for (const marker of markers) {
        expect(marker).toMatchObject({ isConcealed: false })
      }
    })

    test("reveals a construct a selection merely touches", () => {
      const text = "a **bold** word"

      const markers = toRanges(text, [
        { from: 0, to: 4 },
      ]).filter((range) => range.type === "marker")

      for (const marker of markers) {
        expect(marker).toMatchObject({ isConcealed: false })
      }
    })
  })

  describe("links", () => {
    test("marks the link text and carries its URL", () => {
      const text = "see [the docs](https://example.com) now"

      const linkText = toRanges(text).find(
        (range) =>
          range.type === "mark" &&
          range.markKind === "linkText",
      )

      expect(toTextOf(text, toFound(linkText))).toBe(
        "the docs",
      )

      expect(linkText).toMatchObject({
        url: "https://example.com",
      })
    })

    test("conceals the brackets and the URL together", () => {
      const text = "see [the docs](https://example.com) now"

      const concealed = toRanges(text)
        .filter(
          (range) =>
            range.type === "marker" && range.isConcealed,
        )
        .map((range) => toTextOf(text, range))

      expect(concealed).toEqual([
        "[",
        "](https://example.com)",
      ])
    })

    /**
     * Gap 2 of Docket's handoff, and the reason this work started:
     * a URL pasted as plain text was not a link and could not
     * become one without typing `[](…)` around it.
     */
    test("autolinks a bare URL that was never marked up", () => {
      const text =
        "ordered from https://www.monoprice.com/product?id=1234 last week"

      const autolink = toRanges(text).find(
        (range) =>
          range.type === "mark" &&
          range.markKind === "autolink",
      )

      expect(autolink).toMatchObject({
        url: "https://www.monoprice.com/product?id=1234",
      })

      expect(toTextOf(text, toFound(autolink))).toBe(
        "https://www.monoprice.com/product?id=1234",
      )
    })

    test("does not autolink the URL inside an explicit link", () => {
      const text = "[docs](https://example.com)"

      expect(
        toRanges(text).filter(
          (range) =>
            range.type === "mark" &&
            range.markKind === "autolink",
        ),
      ).toHaveLength(0)
    })
  })

  describe("images", () => {
    test("replaces the markup with the image it describes", () => {
      const text =
        "![a screenshot](https://example.com/a.png)"

      const image = toRanges(text).find(
        (range) => range.type === "image",
      )

      expect(image).toMatchObject({
        alt: "a screenshot",
        from: 0,
        to: text.length,
        url: "https://example.com/a.png",
      })
    })

    test("gives the markup back when the caret enters it", () => {
      const text =
        "![a screenshot](https://example.com/a.png)"

      expect(
        toRanges(text, atCaret(4)).filter(
          (range) => range.type === "image",
        ),
      ).toHaveLength(0)
    })
  })

  describe("task lists", () => {
    test.each([
      ["- [ ] open", false],
      ["- [x] done", true],
      ["- [X] done", true],
    ])("reads %s as isChecked=%s", (text, isChecked) => {
      expect(
        toRanges(text).find(
          (range) => range.type === "task",
        ),
      ).toMatchObject({ isChecked })
    })

    /**
     * A checkbox inside a `contenteditable` has no `<label>` to
     * inherit a name from, so it announces as an unlabelled
     * checkbox — useless in exactly the place a task list is read.
     */
    test("carries the item's text as the checkbox's name", () => {
      expect(
        toRanges(
          "- [ ] Photograph the current cabling",
        ).find((range) => range.type === "task"),
      ).toMatchObject({
        label: "Photograph the current cabling",
      })
    })

    test("keeps the bullet visible and never conceals it", () => {
      const text = "- [ ] open"

      const markers = toRanges(text).filter(
        (range) => range.type === "marker",
      )

      // The `-` is content to a reader, not syntax noise.
      expect(markers).toContainEqual(
        expect.objectContaining({
          isConcealed: false,
          from: 0,
          to: 1,
        }),
      )
    })
  })

  describe("raw mode", () => {
    const text =
      "# Heading\n\n**bold** and ![img](https://e.com/a.png) and [x](https://e.com)\n"

    test("conceals nothing", () => {
      expect(
        toRanges(text, [], true).filter(
          (range) =>
            range.type === "marker" && range.isConcealed,
        ),
      ).toHaveLength(0)
    })

    test("replaces nothing with a widget", () => {
      const ranges = toRanges(text, [], true)

      expect(
        ranges.filter(
          (range) =>
            range.type === "image" || range.type === "task",
        ),
      ).toHaveLength(0)
    })

    test("rescales no line", () => {
      expect(
        toRanges(text, [], true).filter(
          (range) => range.type === "line",
        ),
      ).toHaveLength(0)
    })

    test("still colours the syntax", () => {
      // The toggle shows the markup; it does not turn the editor
      // into a plain textarea.
      expect(
        toRanges(text, [], true).filter(
          (range) => range.type === "mark",
        ),
      ).not.toHaveLength(0)
    })
  })

  describe("blocks", () => {
    test("decorates every line of a fenced code block", () => {
      const text = "```js\nconst a = 1\nconst b = 2\n```"

      const lines = toRanges(text).filter(
        (range) => range.type === "line",
      )

      expect(lines).toHaveLength(4)

      for (const line of lines) {
        expect(line).toMatchObject({ lineKind: "code" })

        // Zero-length, anchored at a line start.
        expect(line.from).toBe(line.to)
      }
    })

    /**
     * Concealing a fence leaves a blank line where it used to be, at
     * the top and bottom of the block — which reads as a rendering
     * bug rather than as tidiness.
     */
    test("keeps the fence and its language visible", () => {
      const text = "```sh\nip -br addr show\n```"

      const markers = toRanges(text).filter(
        (range) => range.type === "marker",
      )

      expect(
        markers.map((range) => toTextOf(text, range)),
      ).toEqual(["```", "sh", "```"])

      for (const marker of markers) {
        expect(marker).toMatchObject({ isConcealed: false })
      }
    })

    test("still conceals inline backticks", () => {
      const text = "run `ls` now"

      expect(
        toRanges(text)
          .filter(
            (range) =>
              range.type === "marker" && range.isConcealed,
          )
          .map((range) => toTextOf(text, range)),
      ).toEqual(["`", "`"])
    })

    test("decorates every line of a table", () => {
      const text = "| a | b |\n| --- | --- |\n| 1 | 2 |"

      expect(
        toRanges(text).filter(
          (range) =>
            range.type === "line" &&
            range.lineKind === "table",
        ),
      ).toHaveLength(3)
    })

    /**
     * The bar says "quote", so the `>` does not have to. Contrast
     * with the bullet test above, where nothing else would.
     */
    test("decorates a blockquote and conceals its marker", () => {
      const text = "> quoted"

      const ranges = toRanges(text)

      expect(
        ranges.find((range) => range.type === "line"),
      ).toMatchObject({ lineKind: "blockquote" })

      expect(
        ranges.find((range) => range.type === "marker"),
      ).toMatchObject({ isConcealed: true })
    })
  })
})
