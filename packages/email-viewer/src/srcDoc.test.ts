import { createHash } from "node:crypto"
import { describe, expect, test } from "vitest"

import {
  buildEmailSrcDoc,
  buildPlainTextSrcDoc,
  chooseEmailColorMode,
  EMAIL_FRAME_SANDBOX,
  EMAIL_READER_FRAME_SANDBOX,
  EMAIL_SCROLL_OBSERVER_HASH,
  EMAIL_SCROLL_OBSERVER_SCRIPT,
  hasNativeDarkDesign,
  pinColorScheme,
  withRemoteImages,
} from "./srcDoc.ts"

const PARKED = `<p>Hi</p><img data-ms-src="https://track.example.com/p.gif?u=1" data-ms-blocked-image="" width="1">`

describe("withRemoteImages", () => {
  test("restores a parked src and clears the blocked marker", () => {
    const restored = withRemoteImages(PARKED)
    expect(restored).toContain(
      `src="https://track.example.com/p.gif?u=1"`,
    )
    expect(restored).not.toContain("data-ms-src")
    expect(restored).not.toContain("data-ms-blocked-image")
  })
})

describe("buildEmailSrcDoc", () => {
  test("blocks every remote fetch by default", () => {
    const doc = buildEmailSrcDoc(PARKED)
    expect(doc).toContain("default-src 'none'")
    expect(doc).toContain("script-src 'none'")
    expect(doc).toContain("img-src data:")
    expect(doc).not.toContain("img-src data: https:")
    // Parked, so nothing to load even if the CSP were wrong.
    expect(doc).toContain("data-ms-src=")
    expect(doc).not.toContain(`<img src="https://track`)
  })

  test("loading images widens exactly one directive", () => {
    const doc = buildEmailSrcDoc(PARKED, {
      hasLoadedImages: true,
    })
    expect(doc).toContain("img-src data: https: http:")
    expect(doc).toContain("default-src 'none'")
    expect(doc).toContain("script-src 'none'")
    expect(doc).toContain("form-action 'none'")
    expect(doc).toContain(
      `src="https://track.example.com/p.gif?u=1"`,
    )
  })

  test("the frame sandbox grants neither scripts nor same-origin", () => {
    expect(EMAIL_FRAME_SANDBOX).not.toContain(
      "allow-scripts",
    )
    expect(EMAIL_FRAME_SANDBOX).not.toContain(
      "allow-same-origin",
    )
    expect(EMAIL_FRAME_SANDBOX).not.toContain("allow-forms")
    expect(EMAIL_FRAME_SANDBOX).not.toContain(
      "allow-top-navigation",
    )
    // Popups are the one capability: a link the owner clicks opens a real tab.
    expect(EMAIL_FRAME_SANDBOX).toContain("allow-popups")
  })

  test("the reader grants only its fixed scroll observer", () => {
    const doc = buildEmailSrcDoc("<p>Hi</p>", {
      readerHeaderInset: 128,
    })
    expect(doc).toContain('data-ms-reader-header-spacer=""')
    expect(doc).toContain("height:128px!important")
    expect(doc).toContain(
      `script-src '${EMAIL_SCROLL_OBSERVER_HASH}'`,
    )
    expect(doc).toContain(
      `<script>${EMAIL_SCROLL_OBSERVER_SCRIPT}</script>`,
    )
    expect(doc).toContain("mail-sifter-frame-scroll")
    expect(EMAIL_READER_FRAME_SANDBOX).toContain(
      "allow-scripts",
    )
    expect(EMAIL_READER_FRAME_SANDBOX).not.toContain(
      "allow-same-origin",
    )
    expect(EMAIL_SCROLL_OBSERVER_HASH).toBe(
      `sha256-${createHash("sha256").update(EMAIL_SCROLL_OBSERVER_SCRIPT).digest("base64")}`,
    )
  })

  test("email body CSS cannot remove the reader masthead inset", () => {
    const doc = buildEmailSrcDoc(
      "<style>body { padding: 0 !important; } * { margin: 0 !important; }</style><img>",
      { readerHeaderInset: 128 },
    )
    expect(doc).toContain("body { padding: 0 !important; }")
    expect(doc).toContain(
      'style="display:block!important;height:128px!important;min-height:128px!important;',
    )
    expect(
      doc.indexOf("data-ms-reader-header-spacer"),
    ).toBeLessThan(
      doc.lastIndexOf(
        "<style>body { padding: 0 !important; }",
      ),
    )
  })

  test("email CSS cannot reach the app — it is scoped to the frame document", () => {
    const doc = buildEmailSrcDoc(
      `<style>* { font-family: Comic Sans MS }</style><p>x</p>`,
    )
    expect(doc).toContain("<!doctype html>")
    expect(doc).toContain("Comic Sans MS")
    // A full document, so the app's stylesheet is not in scope at all.
    expect(doc).toContain("</body></html>")
  })
})

describe("the message's own typography", () => {
  test("a message that names no font is set in the app's face", () => {
    const doc = buildEmailSrcDoc("<p>Greetings,</p>")
    expect(doc).toContain("font: 16px/1.6 Outfit,")
    // The face is only a DEFAULT — a message that names a font keeps it.
    expect(
      buildEmailSrcDoc(
        '<p style="font-family:Georgia">x</p>',
      ),
    ).toContain("font-family:Georgia")
  })

  test("the face is inlined, so the frame needs no origin and no CORS", () => {
    const doc = buildEmailSrcDoc("<p>x</p>", {
      fontDataUrl:
        "data:font/woff2;base64,d09GMgABAAAAAA==",
    })
    expect(doc).toContain("@font-face{font-family:Outfit")
    expect(doc).toContain(
      "url(data:font/woff2;base64,d09GMgABAAAAAA==)",
    )
    // Widens nothing: `font-src data:` was already the policy.
    expect(doc).toContain("font-src data:")
  })

  test("a font source that is not a woff2 data URL is refused, not interpolated", () => {
    const doc = buildEmailSrcDoc("<p>x</p>", {
      fontDataUrl:
        'https://evil.example.com/f.woff2) format("woff2");}body{display:none',
    })
    expect(doc).not.toContain("@font-face")
    expect(doc).not.toContain("evil.example.com")
  })

  test("prose gets a reading measure; a message that states a width does not", () => {
    expect(buildEmailSrcDoc("<p>a reply</p>")).toContain(
      "max-width: 56ch",
    )
    expect(
      buildEmailSrcDoc(
        '<table width="600"><tr><td>x</td></tr></table>',
        {
          fixedLayoutWidth: 600,
        },
      ),
    ).not.toContain("max-width: 56ch")
  })
})

describe("buildPlainTextSrcDoc", () => {
  test("renders markup-looking text as literal characters", () => {
    const doc = buildPlainTextSrcDoc(
      "<b>this is not bold</b> & 5 < 6",
    )
    expect(doc).toContain(
      "&lt;b&gt;this is not bold&lt;/b&gt; &amp; 5 &lt; 6",
    )
    expect(doc).not.toContain("<b>this is not bold</b>")
  })

  test("keeps remote fetches blocked", () => {
    const doc = buildPlainTextSrcDoc("hello")
    expect(doc).toContain("img-src data:")
    expect(doc).toContain("default-src 'none'")
  })

  test("is prose, not code — the sender's line breaks survive either way", () => {
    const doc = buildPlainTextSrcDoc("line one\nline two")
    expect(doc).toContain('<pre class="ms-plain-text">')
    // The old inline style set the body in Consolas at 15px.
    expect(doc).not.toContain("ui-monospace")
    expect(doc).toContain("font: inherit")
    expect(doc).toContain("white-space: pre-wrap")
  })
})

describe("faux dark mode", () => {
  test("is off unless asked for", () => {
    const doc = buildEmailSrcDoc("<p>x</p>")
    expect(doc).toContain('<html lang="en"><head>')
    expect(doc).not.toContain("ms-dark")
    expect(doc).not.toContain("invert(1)")
  })

  test("inverts the document and inverts the pixels back", () => {
    const doc = buildEmailSrcDoc("<p>x</p>", {
      isDarkened: true,
    })
    expect(doc).toContain(
      '<html lang="en" class="ms-dark">',
    )
    expect(doc).toContain("html.ms-dark {")
    // Images, video and CSS background-images get a second inversion so a
    // photograph still looks like the photograph.
    expect(doc).toContain("html.ms-dark img,")
    expect(doc).toContain("html.ms-dark video,")
    // Selects on the sanitizer's mark, not on the style attribute: a filter
    // applies to an element's contents too, so selecting on the style inverted
    // the *text* of anything using an icon as its background.
    expect(doc).toContain("html.ms-dark [data-ms-bg-image]")
    expect(doc).not.toContain(
      `html.ms-dark [style*="background-image"]`,
    )
  })

  test("an emoji keeps its own colours rather than inverting into a negative", () => {
    const dark = buildEmailSrcDoc(
      "<p>not anymore \u{1F605}</p>",
      {
        isDarkened: true,
      },
    )
    // Marked as it goes into the frame, and re-inverted by the sheet — the same
    // treatment a photograph gets, because an emoji is a picture too.
    expect(dark).toContain(
      `<span data-ms-emoji="">\u{1F605}</span>`,
    )
    expect(dark).toContain("html.ms-dark [data-ms-emoji]")
  })

  test("the mark is added in the inverted mode and in no other", () => {
    const light = buildEmailSrcDoc("<p>hi \u{1F605}</p>")
    expect(light).not.toContain("data-ms-emoji")
    // A message with a dark design of its own is never inverted, so its emoji
    // were never wrong and its DOM stays exactly as the sanitizer wrote it.
    const native = buildEmailSrcDoc(
      "<style>@media (prefers-color-scheme: dark) { p { color: #fff } }</style><p>hi \u{1F605}</p>",
      { isDarkened: true },
    )
    expect(native).not.toContain("data-ms-emoji")
  })

  test("a link-safety marker keeps its colours in dark mode", () => {
    const doc = buildEmailSrcDoc("<p>x</p>", {
      isDarkened: true,
    })
    // Re-inverted, so the phishing outline is the same red it is in light
    // mode. A warning must not change colour because a display preference did.
    expect(doc).toContain("html.ms-dark a.ms-link-flagged,")
    expect(doc).toContain("html.ms-dark .ms-link-note")
    // A parked image's placeholder is app chrome, not content: never re-inverted.
    expect(doc).toContain(
      "html.ms-dark img[data-ms-blocked-image] { filter: none; }",
    )
  })

  test("changes nothing about the sandbox, the CSP, or image blocking", () => {
    const dark = buildEmailSrcDoc(PARKED, {
      isDarkened: true,
    })
    expect(dark).toContain("default-src 'none'")
    expect(dark).toContain("script-src 'none'")
    expect(dark).toContain("form-action 'none'")
    expect(dark).toContain("img-src data:")
    expect(dark).not.toContain("img-src data: https:")
    expect(dark).toContain("data-ms-src=")
    // And the two opt-ins stay independent of each other.
    const both = buildEmailSrcDoc(PARKED, {
      isDarkened: true,
      hasLoadedImages: true,
    })
    expect(both).toContain("img-src data: https: http:")
    expect(both).toContain('class="ms-dark"')
  })

  test("survives the switch to Plain text", () => {
    expect(
      buildPlainTextSrcDoc("hello", { isDarkened: true }),
    ).toContain('class="ms-dark"')
    expect(buildPlainTextSrcDoc("hello")).not.toContain(
      "ms-dark",
    )
  })
})

/**
 * A Google Calendar invitation in miniature: a light design plus a dark half
 * that restates the colours with `!important`, and a paragraph the dark half
 * never mentions.
 *
 * This shape is the whole bug. On a dark-OS machine the dark half ran
 * unconditionally — `prefers-color-scheme` reports the operating system, not
 * anything the embedding page can set — and landed `#e8eaed` labels on the white
 * page this sheet paints. Their uncoloured siblings stayed legible, which is why
 * the failure read as "some words are missing" rather than "the colours are
 * wrong", and why the faux dark toggle could not fix it: inverting a broken
 * render just breaks it in the other direction.
 */
const NATIVE_DARK_EMAIL = `<style>
  .label { color: #202124; }
  @media screen and (prefers-color-scheme: dark) {
    .label { color: #e8eaed !important; }
    body { background: #202124 !important; }
  }
</style><div class="label">When</div><p>plain</p>`

describe("hasNativeDarkDesign", () => {
  test("finds a dark half in a style block", () => {
    expect(hasNativeDarkDesign(NATIVE_DARK_EMAIL)).toBe(
      true,
    )
  })

  test("is false for mail that only has a light design", () => {
    expect(
      hasNativeDarkDesign(
        "<style>p { color: #222; }</style><p>x</p>",
      ),
    ).toBe(false)
    expect(
      hasNativeDarkDesign("<p>a plain reply</p>"),
    ).toBe(false)
  })

  test("does not count the words appearing in the message's own prose", () => {
    // The feature only ever means anything inside a stylesheet, so a newsletter
    // about CSS must not be mistaken for one that ships a dark design.
    expect(
      hasNativeDarkDesign(
        "<p>Use prefers-color-scheme: dark in your emails</p>",
      ),
    ).toBe(false)
  })
})

describe("pinColorScheme", () => {
  test("neutralises the dark half when the message is to render light", () => {
    const pinned = pinColorScheme(NATIVE_DARK_EMAIL, false)
    expect(pinned).not.toContain("prefers-color-scheme")
    expect(pinned).toContain(
      "screen and (min-width: 999999px)",
    )
    // The rules themselves survive — only the question they hang off changes.
    expect(pinned).toContain("#e8eaed !important")
  })

  test("forces the dark half on when the message is to render dark", () => {
    const pinned = pinColorScheme(NATIVE_DARK_EMAIL, true)
    expect(pinned).toContain("screen and (min-width: 0px)")
    expect(pinned).not.toContain("prefers-color-scheme")
  })

  test("flips a light half the other way, so exactly one half wins", () => {
    const css = `<style>@media (prefers-color-scheme: light) { p { color: #000 } }</style>`
    expect(pinColorScheme(css, true)).toContain(
      "@media (min-width: 999999px)",
    )
    expect(pinColorScheme(css, false)).toContain(
      "@media (min-width: 0px)",
    )
  })

  test("leaves the rest of a compound query intact", () => {
    const css = `<style>@media only screen and (max-width: 600px) and (prefers-color-scheme: dark) { p { color: red } }</style>`
    expect(pinColorScheme(css, true)).toContain(
      "@media only screen and (max-width: 600px) and (min-width: 0px)",
    )
  })

  test("touches nothing outside a style block", () => {
    const body = `<p>prefers-color-scheme: dark</p>`
    expect(pinColorScheme(body, false)).toBe(body)
  })
})

describe("chooseEmailColorMode", () => {
  test("light unless the reader asked for dark", () => {
    expect(chooseEmailColorMode(false, true)).toBe("light")
    expect(chooseEmailColorMode(false, false)).toBe("light")
  })

  test("prefers the sender's own dark design over inverting theirs", () => {
    expect(chooseEmailColorMode(true, true)).toBe(
      "native-dark",
    )
  })

  test("falls back to inversion for mail nobody styled for dark", () => {
    expect(chooseEmailColorMode(true, false)).toBe(
      "inverted-dark",
    )
  })
})

describe("the message's colour scheme is pinned, never left to the OS", () => {
  test("light mode renders the light design even on a dark-OS machine", () => {
    const doc = buildEmailSrcDoc(NATIVE_DARK_EMAIL)
    expect(doc).not.toContain("prefers-color-scheme")
    expect(doc).toContain("(min-width: 999999px)")
    expect(doc).toContain("color-scheme: light")
  })

  test("a native dark design is rendered as itself, with no inversion", () => {
    const doc = buildEmailSrcDoc(NATIVE_DARK_EMAIL, {
      isDarkened: true,
    })
    // The sender drew this dark mode. Inverting it would undo their work.
    expect(doc).not.toContain("ms-dark")
    expect(doc).not.toContain("invert(1)")
    expect(doc).toContain("(min-width: 0px)")
    expect(doc).toContain("color-scheme: dark")
    // A dark page under the message, so a dark half that colours text but
    // leaves the page to the client cannot land light text on white.
    expect(doc).toContain("color: #e8eaed")
    expect(doc).toContain("background: transparent")
  })

  test("mail with no dark design still gets the inversion", () => {
    const doc = buildEmailSrcDoc("<p>a plain reply</p>", {
      isDarkened: true,
    })
    expect(doc).toContain('class="ms-dark"')
    expect(doc).toContain("invert(1)")
  })
})

describe("the page behind the message", () => {
  test("a message that declares a width gets a plate, not the whole frame", () => {
    // A 600px newsletter shrinks to a centred card on the app's page colour,
    // rather than a white slab across a 34-inch monitor.
    const doc = buildEmailSrcDoc("<p>x</p>", {
      fixedLayoutWidth: 600,
      pageBackground: "#08090A",
    })
    expect(doc).toContain("background: #08090A")
    expect(doc).toContain("width: fit-content")
    // Centred by the root, never by a body margin: the sender's own
    // `body { margin: 0 }` is serialized after this sheet and erased the
    // margin version, so the plate sat against the left edge of the frame.
    expect(doc).toContain(
      "html { display: grid; justify-items: safe center; }",
    )
    expect(doc).not.toMatch(
      /body \{[^}]*margin-inline: auto/,
    )
    // The plate itself stays light: the preheader and unsubscribe lines sit
    // *outside* the message's own table, and a transparent body would drop this
    // sheet's near-black default onto a near-black page.
    expect(doc).toContain("background: #ffffff")
  })

  test("prose gets no plate — there is no width to shrink to", () => {
    const doc = buildEmailSrcDoc("<p>x</p>", {
      pageBackground: "#08090A",
    })
    expect(doc).not.toContain("width: fit-content")
    expect(doc).not.toContain("justify-items: safe center")
  })

  test("a message with nothing but text keeps a surface of its own", () => {
    const doc = buildEmailSrcDoc("<p>x</p>", {
      pageBackground: "#08090A",
    })
    expect(doc).toContain("background: #ffffff")
    expect(doc).toContain("color: #16181d")
  })

  test("a page colour that is not a colour is refused", () => {
    // These arrive from getComputedStyle over our own tokens, so this guards a
    // missing token rather than an attacker — but a token that resolves to the
    // empty string would otherwise close the declaration.
    const doc = buildEmailSrcDoc("<p>x</p>", {
      pageBackground: "red; } body { display: none } p {",
    })
    expect(doc).not.toContain("display: none")
    expect(doc).toContain("background: #ffffff")
  })

  test("plain text carries the page colour across the view switch", () => {
    const doc = buildPlainTextSrcDoc("hello", {
      pageBackground: "#08090A",
    })
    expect(doc).toContain("background: #08090A")
  })
})
