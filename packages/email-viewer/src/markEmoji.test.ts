import { describe, expect, test } from "vitest"

import { markEmoji } from "./markEmoji.ts"

describe("markEmoji", () => {
  test("wraps a colour emoji and leaves the copy around it alone", () => {
    expect(markEmoji("<p>not anymore \u{1F605}.</p>")).toBe(
      `<p>not anymore <span data-ms-emoji="">\u{1F605}</span>.</p>`,
    )
  })

  test("a run of adjacent emoji is one span", () => {
    expect(markEmoji("\u{1F389}\u{1F389}\u{1F389}")).toBe(
      `<span data-ms-emoji="">\u{1F389}\u{1F389}\u{1F389}</span>`,
    )
  })

  test("keeps a sequence whole — family, skin tone, flag, keycap", () => {
    for (const emoji of [
      "\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}",
      "\u{1F44B}\u{1F3FD}",
      "\u{1F1FA}\u{1F1F8}",
      "1️⃣",
      "\u{1F3F3}️‍\u{1F308}",
      "❤️‍\u{1F525}",
    ]) {
      expect(markEmoji(emoji)).toBe(
        `<span data-ms-emoji="">${emoji}</span>`,
      )
    }
  })

  /*
   * The mark means "re-invert me", so marking a glyph the browser paints as
   * dark text would hide it: near-black on the near-black the inversion
   * produced. A text-default pictograph is therefore left to invert with the
   * copy it sits in, and only picked up when the sender asked for the emoji
   * form with U+FE0F.
   */
  test("leaves a text-default pictograph alone until U+FE0F asks for the emoji form", () => {
    expect(markEmoji("© ™ ® ▶ ☀ ✔")).toBe("© ™ ® ▶ ☀ ✔")
    expect(markEmoji("☀️")).toBe(
      `<span data-ms-emoji="">☀️</span>`,
    )
  })

  test("ordinary text keeps every character it had", () => {
    const text = "<p>naïve café — 9 to 5, 100% ‘done’</p>"
    expect(markEmoji(text)).toBe(text)
  })

  test("never marks inside a tag, a style block or a script block", () => {
    expect(
      markEmoji(`<img alt="party \u{1F389}" src="x.png">`),
    ).toBe(`<img alt="party \u{1F389}" src="x.png">`)
    // A span in a stylesheet is a syntax error, and content: is not copy.
    expect(
      markEmoji(
        `<style>p::after { content: "\u{1F389}" }</style>`,
      ),
    ).toBe(
      `<style>p::after { content: "\u{1F389}" }</style>`,
    )
    expect(
      markEmoji(`<script>var x = "\u{1F389}"</script>`),
    ).toBe(`<script>var x = "\u{1F389}"</script>`)
  })

  test("marks the text between tags, in every element it finds one", () => {
    expect(
      markEmoji(
        `<p>a \u{1F600}</p><style>p{color:red}</style><p>b \u{1F600}</p>`,
      ),
    ).toBe(
      `<p>a <span data-ms-emoji="">\u{1F600}</span></p>` +
        `<style>p{color:red}</style>` +
        `<p>b <span data-ms-emoji="">\u{1F600}</span></p>`,
    )
  })
})
