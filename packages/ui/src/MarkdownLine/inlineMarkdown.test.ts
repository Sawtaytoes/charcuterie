/**
 * The inline grammar, asserted as data.
 *
 * Kept away from React on purpose: what `MarkdownLine` renders is a
 * question about elements, and what the markdown *means* is a
 * question about runs. Mixing them is how a parser bug gets
 * diagnosed as a styling bug.
 *
 * Fixture strings are INVENTED. This repo is published.
 */

import { describe, expect, test } from "vitest"

import {
  toInlineMarkdownRuns,
  toPlainMarkdownText,
} from "./inlineMarkdown.ts"

/** The runs, with the marks that are off left out — signal only. */
const toShape = (value: string) =>
  toInlineMarkdownRuns(value).map((run) => ({
    ...(run.href === undefined ? {} : { href: run.href }),
    ...(run.isCode ? { isCode: true } : {}),
    ...(run.isEmphasis ? { isEmphasis: true } : {}),
    ...(run.isStrikethrough
      ? { isStrikethrough: true }
      : {}),
    ...(run.isStrong ? { isStrong: true } : {}),
    text: run.text,
  }))

describe("marks", () => {
  test("bold, italic, code and strikethrough each mark their run", () => {
    expect(toShape("**bold**")).toEqual([
      { isStrong: true, text: "bold" },
    ])

    expect(toShape("*italic*")).toEqual([
      { isEmphasis: true, text: "italic" },
    ])

    expect(toShape("`code`")).toEqual([
      { isCode: true, text: "code" },
    ])

    expect(toShape("~~gone~~")).toEqual([
      { isStrikethrough: true, text: "gone" },
    ])
  })

  test("`__` is bold and `_` is italic, the same as their asterisks", () => {
    expect(toShape("__bold__")).toEqual([
      { isStrong: true, text: "bold" },
    ])

    expect(toShape("_italic_")).toEqual([
      { isEmphasis: true, text: "italic" },
    ])
  })

  test("marks nest, and the inner run carries both", () => {
    expect(toShape("**bold and *both* here**")).toEqual([
      { isStrong: true, text: "bold and " },
      { isEmphasis: true, isStrong: true, text: "both" },
      { isStrong: true, text: " here" },
    ])
  })

  test("an unclosed marker is literal text", () => {
    expect(toShape("2 * 3 is 6")).toEqual([
      { text: "2 * 3 is 6" },
    ])

    expect(toShape("**not closed")).toEqual([
      { text: "**not closed" },
    ])
  })

  test("a backslash escapes a marker", () => {
    expect(toShape(String.raw`\*not italic\*`)).toEqual([
      { text: "*not italic*" },
    ])
  })
})

describe("the file-name cases this was built for", () => {
  /**
   * The owner's own example, and the reason the feature exists:
   *
   *   *"Ingest 53 movies from `Downloads/MOVIES` into `G:\Movies`"*
   */
  test("a Windows path in a code span keeps its backslash", () => {
    expect(
      toShape(
        String.raw`Ingest 53 movies from \`Downloads/MOVIES\` into \`G:\Movies\``.replaceAll(
          String.raw`\``,
          "`",
        ),
      ),
    ).toEqual([
      { text: "Ingest 53 movies from " },
      { isCode: true, text: "Downloads/MOVIES" },
      { text: " into " },
      { isCode: true, text: String.raw`G:\Movies` },
    ])
  })

  test("snake_case survives — an underscore inside a word marks nothing", () => {
    expect(
      toShape("Run ingest_the_files.sh nightly"),
    ).toEqual([{ text: "Run ingest_the_files.sh nightly" }])
  })

  test("a bare backslash before a letter stays a backslash", () => {
    expect(toShape(String.raw`G:\Movies`)).toEqual([
      { text: String.raw`G:\Movies` },
    ])
  })

  test("a fence of two holds a literal backtick", () => {
    expect(toShape("`` ` ``")).toEqual([
      { isCode: true, text: "`" },
    ])
  })
})

describe("links", () => {
  test("link text becomes runs that carry the destination", () => {
    expect(
      toShape("see [the PR](/pulls/53) first"),
    ).toEqual([
      { text: "see " },
      { href: "/pulls/53", text: "the PR" },
      { text: " first" },
    ])
  })

  test("marks inside link text survive, and stay linked", () => {
    expect(toShape("[**PR** 53](/pulls/53)")).toEqual([
      { href: "/pulls/53", isStrong: true, text: "PR" },
      { href: "/pulls/53", text: " 53" },
    ])
  })

  test("a destination's title is not part of the URL", () => {
    expect(
      toShape('[x](/pulls/53 "The pull request")'),
    ).toEqual([{ href: "/pulls/53", text: "x" }])
  })

  test("a bare URL is a link, and a trailing full stop is not part of it", () => {
    expect(
      toShape("Read https://example.invalid/notes."),
    ).toEqual([
      { text: "Read " },
      {
        href: "https://example.invalid/notes",
        text: "https://example.invalid/notes",
      },
      { text: "." },
    ])
  })

  test("a parenthesis the URL opened is kept", () => {
    expect(
      toShape("https://example.invalid/Rack_(shelf)"),
    ).toEqual([
      {
        href: "https://example.invalid/Rack_(shelf)",
        text: "https://example.invalid/Rack_(shelf)",
      },
    ])
  })

  test("`www.` autolinks, because the CodeMirror surface does", () => {
    expect(toShape("www.example.invalid/x")).toEqual([
      {
        href: "https://www.example.invalid/x",
        text: "www.example.invalid/x",
      },
    ])
  })

  test("an angle autolink is its own text", () => {
    expect(toShape("<https://example.invalid/x>")).toEqual([
      {
        href: "https://example.invalid/x",
        text: "https://example.invalid/x",
      },
    ])
  })

  /**
   * The guard is `../safeUrls.ts`, shared with the CodeMirror
   * surface. What is asserted here is the *response* to a refusal:
   * every character of the source stays on screen, so a reader can
   * see the trap rather than being shown a link-coloured word that
   * quietly does nothing.
   */
  test("a refused scheme keeps its whole source and links nothing", () => {
    expect(
      toShape("[click me](javascript:alert(1))"),
    ).toEqual([{ text: "[click me](javascript:alert(1))" }])
  })

  test("a link inside link text does not nest", () => {
    expect(toShape("[a [b](/b) c](/a)")).toEqual([
      { href: "/a", text: "a [b](/b) c" },
    ])
  })
})

describe("it is a line, and it is inline-only", () => {
  test("block markup is literal", () => {
    expect(toShape("# Not a heading")).toEqual([
      { text: "# Not a heading" },
    ])

    expect(toShape("- Not a list item")).toEqual([
      { text: "- Not a list item" },
    ])

    expect(toShape("> Not a quote")).toEqual([
      { text: "> Not a quote" },
    ])
  })

  test("a newline collapses to a space", () => {
    expect(toShape("first\n  second")).toEqual([
      { text: "first second" },
    ])
  })

  test("an empty string is no runs at all", () => {
    expect(toShape("")).toEqual([])
  })
})

describe("toPlainMarkdownText", () => {
  test("gives the words with every marker gone", () => {
    expect(
      toPlainMarkdownText(
        "Ingest **53** movies into `G:/Movies` — [see the plan](/plan)",
      ),
    ).toBe("Ingest 53 movies into G:/Movies — see the plan")
  })

  test("leaves a string with no markup exactly as it was", () => {
    expect(toPlainMarkdownText("Buy more filament")).toBe(
      "Buy more filament",
    )
  })
})
