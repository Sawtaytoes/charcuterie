import { markdownLanguage } from "@codemirror/lang-markdown"
import { describe, expect, test } from "vitest"

import type { LivePreviewSelection } from "./livePreviewRanges.ts"
import {
  toLivePreviewRanges,
  toLivePreviewTableRanges,
} from "./livePreviewRanges.ts"

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

/** Anything with document offsets — a range, or a table cell. */
/**
 * The block pass. Separate from `toRanges` because CodeMirror
 * requires the split — see `toLivePreviewTableRanges`.
 */
const toTableRanges = (
  text: string,
  selections: readonly LivePreviewSelection[] = [],
  isRawMode = false,
) =>
  toLivePreviewTableRanges({
    isRawMode,
    selections,
    text,
    tree: markdownLanguage.parser.parse(text),
  })

const toTextOf = (
  text: string,
  range: { from: number; to: number },
) => text.slice(range.from, range.to)

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

  /**
   * The one construct whose meaning is geometry.
   *
   * Everything else here is a decoration hung on text CodeMirror is
   * already drawing. A column is not: column two's text is on four
   * different lines, so the markdown stops being drawn and a widget
   * draws instead — which is why these tests assert *content*
   * (rows, cells, segments) where the rest of the file asserts
   * offsets.
   */
  describe("tables", () => {
    const TABLE = [
      "| Port | **Goes to** | Notes |",
      "| :--- | ---: | :---: |",
      "| 1 | uplink | see [docs](https://e.com) |",
      "| 2 |  | `shelf` |",
    ].join("\n")

    const toTable = (
      text: string,
      selections: readonly LivePreviewSelection[] = [],
    ) => toFound(toTableRanges(text, selections)[0])

    test("replaces the whole block, exactly", () => {
      const text = `Before\n\n${TABLE}\n\nAfter\n`

      const table = toTable(text)

      // Byte-for-byte the table and nothing either side of it: a
      // block replacement has to land on whole lines, and one
      // character out is a thrown decoration rather than a
      // misdrawn one.
      expect(toTextOf(text, table)).toBe(TABLE)
    })

    test("renders no line decoration for a table it replaces", () => {
      expect(
        toRanges(TABLE).filter(
          (range) =>
            range.type === "line" &&
            range.lineKind === "table",
        ),
      ).toHaveLength(0)
    })

    test("reads the header row as a header and the rest as rows", () => {
      expect(
        toTable(TABLE).rows.map((row) => row.isHeader),
      ).toEqual([true, false, false])
    })

    /**
     * The delimiter row is the column spec, not content — it is the
     * one row a rendered table does not show, and it is where the
     * alignment comes from instead.
     */
    test("takes alignment from the delimiter row", () => {
      expect(
        toTable(TABLE).rows[0]?.cells.map(
          (cell) => cell.alignment,
        ),
      ).toEqual(["start", "end", "center"])
    })

    test("renders cell markup rather than the markers", () => {
      expect(
        toTable(TABLE).rows[0]?.cells[1]?.segments,
      ).toEqual([
        {
          markKinds: ["strong"],
          text: "Goes to",
          type: "text",
        },
      ])
    })

    test("keeps a link in a cell clickable and drops its syntax", () => {
      expect(
        toTable(TABLE).rows[1]?.cells[2]?.segments,
      ).toEqual([
        { markKinds: [], text: "see ", type: "text" },
        {
          markKinds: ["linkText"],
          text: "docs",
          type: "text",
          url: "https://e.com",
        },
      ])
    })

    /**
     * The parser emits no `TableCell` for `| |`, so a cell-node
     * walk would render the row one column short and shift every
     * cell after it left. The `|` positions are the truth.
     */
    test("keeps an empty cell's column", () => {
      const cells = toFound(toTable(TABLE).rows[2]).cells

      expect(cells).toHaveLength(3)

      expect(cells[1]?.segments).toEqual([])

      expect(cells[2]?.segments).toEqual([
        {
          markKinds: ["code"],
          text: "shelf",
          type: "text",
        },
      ])
    })

    test("puts a cell's offsets on the cell's own text", () => {
      const text = `Before\n\n${TABLE}\n`

      const cell = toFound(
        toFound(toTable(text).rows[1]).cells[1],
      )

      // The click target for that cell, and the reason it can be
      // one: these are real document offsets, not indexes into a
      // rendered string.
      expect(toTextOf(text, cell)).toBe("uplink")
    })

    /**
     * GFM drops cells past the header's width. An editor that did
     * the same would put text the author typed on screen nowhere,
     * so the widest row wins and the short rows gain empty cells.
     */
    test("pads every row to the widest row", () => {
      const text = [
        "| a | b |",
        "| --- | --- |",
        "| 1 | 2 | 3 |",
        "| only |",
      ].join("\n")

      const table = toTable(text)

      expect(
        table.rows.map((row) => row.cells.length),
      ).toEqual([3, 3, 3])

      // A padded cell collapses to the end of its own row, so
      // clicking one puts the caret where the missing `| |` would
      // be typed.
      const row = toFound(table.rows[2])

      expect(toFound(row.cells[2])).toMatchObject({
        from: row.to,
        segments: [],
        to: row.to,
      })
    })

    test("renders an image in a cell as an image", () => {
      const text = [
        "| icon |",
        "| --- |",
        "| ![up](https://e.com/a.png) |",
      ].join("\n")

      expect(
        toTable(text).rows[1]?.cells[0]?.segments,
      ).toEqual([
        {
          alt: "up",
          type: "image",
          url: "https://e.com/a.png",
        },
      ])
    })

    test("renders a table with no leading or trailing pipes", () => {
      const text = "a | b\n--- | ---\n1 | 2"

      expect(
        toTable(text).rows.map((row) =>
          row.cells.map((cell) => toTextOf(text, cell)),
        ),
      ).toEqual([
        ["a", "b"],
        ["1", "2"],
      ])
    })

    /**
     * Same rule as a link or an image: the caret is what turns the
     * rendering back into markup, because you cannot edit a column
     * you cannot see.
     */
    test("stands down for a caret inside it", () => {
      expect(toTableRanges(TABLE, atCaret(3))).toHaveLength(
        0,
      )

      // …and the pipes come back, monospaced, in its place.
      expect(
        toRanges(TABLE, atCaret(3)).filter(
          (range) =>
            range.type === "line" &&
            range.lineKind === "table",
        ),
      ).toHaveLength(4)
    })

    test("stands down in raw mode", () => {
      expect(toTableRanges(TABLE, [], true)).toHaveLength(0)
    })

    /**
     * The two passes have to agree: the plugin steps out of the way
     * of exactly the tables the field draws, or the pipes paint
     * underneath a rendered table.
     */
    test("is the only pass that decorates a rendered table", () => {
      expect(
        toRanges(TABLE).filter(
          (range) => range.from < TABLE.length,
        ),
      ).toHaveLength(0)
    })

    test("describes a view, never an edit", () => {
      const text = `${TABLE}\n`

      for (const row of toTable(text).rows) {
        for (const cell of row.cells) {
          expect(cell.from).toBeGreaterThanOrEqual(0)

          expect(cell.to).toBeLessThanOrEqual(text.length)

          expect(cell.from).toBeLessThanOrEqual(cell.to)
        }
      }
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

    /**
     * The *editing* view of a table. A caret in it means the
     * rendered widget stood down, and every line goes monospaced so
     * the columns line up as typed.
     */
    test("decorates every line of a table the caret is in", () => {
      const text = "| a | b |\n| --- | --- |\n| 1 | 2 |"

      expect(
        toRanges(text, atCaret(2)).filter(
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
