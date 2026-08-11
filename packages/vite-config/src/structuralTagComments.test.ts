/**
 * Fixture-driven, and the fixtures are the two real files.
 *
 * `muxMagicBefore.html` / `muxMagicAfter.html` are
 * `packages/web/index.html` either side of mux-magic `1da8b296`
 * ([#200](https://github.com/Sawtaytoes/mux-magic/issues/200));
 * `imageViewerBefore.html` / `imageViewerAfter.html` are
 * image-viewer's, either side of the 2026-08-05 fix its **Locked**
 * decision record describes. Both pairs are verbatim from the
 * repositories.
 *
 * The *after* files are the load-bearing half. Both of them still
 * contain a literal `<head>` inside a comment — mux-magic moved
 * the comment into `<head>` rather than rewording it, and
 * image-viewer's leading comment still names `` `<html>` `` — so a
 * blanket "no tag literals in comments" check would fail two
 * correct files. This one must not.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import type { UserConfig } from "vite"
import { describe, expect, test } from "vitest"

import {
  assertNoShadowedInjectionAnchors,
  createStructuralTagCommentGuard,
  createViteConfig,
  findShadowedInjectionAnchors,
  getHtmlEntryPaths,
} from "./index.js"

/**
 * `UserConfig["plugins"]` is a deeply nested union of falsy
 * values, promises and arrays, so a `.map(plugin => plugin.name)`
 * does not type. The base only ever holds plain plugin objects,
 * which is all this needs to read.
 */
const getPluginNames = (
  plugins: UserConfig["plugins"],
): unknown[] =>
  (plugins ?? []).flatMap((plugin) =>
    plugin && typeof plugin === "object" && "name" in plugin
      ? [plugin.name]
      : [],
  )

const fixture = (name: string) =>
  readFileSync(
    resolve(
      fileURLToPath(import.meta.url),
      "../__fixtures__",
      name,
    ),
    "utf8",
  )

describe("findShadowedInjectionAnchors", () => {
  test("mux-magic's blank-page index.html is caught, on the right line", () => {
    const issues = findShadowedInjectionAnchors(
      fixture("muxMagicBefore.html"),
    )

    expect(issues).toEqual([
      {
        anchor: "<head>",
        line: 10,
        snippet:
          "the `@charcuterie/tokens` `buildFirstPaintScript` snippet in <head> below,",
      },
    ])
  })

  test("image-viewer's blank-window index.html is caught", () => {
    const issues = findShadowedInjectionAnchors(
      fixture("imageViewerBefore.html"),
    )

    expect(issues).toEqual([
      {
        anchor: "<head>",
        line: 5,
        snippet:
          "the inline first-paint script in `<head>` below, from the saved choice",
      },
    ])
  })

  test("mux-magic's shipped fix is clean, comment and all", () => {
    // The comment still says `<head>`. It is now *inside* `<head>`,
    // so the first literal in the file is the real element and
    // Vite injects in the right place. A blanket ban would fail
    // this file; the bug does not.
    expect(fixture("muxMagicAfter.html")).toContain(
      "`<head>`",
    )

    expect(
      findShadowedInjectionAnchors(
        fixture("muxMagicAfter.html"),
      ),
    ).toEqual([])
  })

  test("image-viewer's shipped fix is clean, and its leading comment still names <html>", () => {
    // Vite has no open-`html` injection anchor, so a literal
    // `<html>` in a leading comment shadows nothing. Flagging it
    // would be a false positive on a file that works.
    expect(fixture("imageViewerAfter.html")).toContain(
      "`<html>`",
    )

    expect(
      findShadowedInjectionAnchors(
        fixture("imageViewerAfter.html"),
      ),
    ).toEqual([])
  })

  test("a document with no comments at all is not scanned", () => {
    expect(
      findShadowedInjectionAnchors(
        "<!doctype html><html><head></head><body></body></html>",
      ),
    ).toEqual([])
  })

  test("every anchor Vite injects at is covered", () => {
    const issues = findShadowedInjectionAnchors(
      [
        "<!doctype html>",
        "<!-- </head> </body> </html> <body> -->",
        "<html><head></head><body></body></html>",
      ].join("\n"),
    )

    expect(
      issues.map((issue) => issue.anchor).sort(),
    ).toEqual(["</body>", "</head>", "</html>", "<body>"])
  })

  test("an unterminated comment swallows the rest of the document", () => {
    // `<!--` with no `-->` comments out everything after it, real
    // tags included, so *every* anchor is shadowed. Reporting all
    // three is the honest answer, and a scan that stopped at the
    // first `-->` it could not find would report none of them.
    expect(
      findShadowedInjectionAnchors(
        "<!doctype html>\n<!-- <head> is mentioned here\n<html><head></head></html>",
      )
        .map((issue) => issue.anchor)
        .sort(),
    ).toEqual(["</head>", "</html>", "<head>"])
  })
})

describe("assertNoShadowedInjectionAnchors", () => {
  test("the thrown message names the file, the line, and the fix", () => {
    // The failure being replaced is a blank page with no
    // explanation, so a bare "invalid html" would be barely an
    // improvement.
    expect(() =>
      assertNoShadowedInjectionAnchors(
        fixture("muxMagicBefore.html"),
        "packages/web/index.html",
      ),
    ).toThrowError(/packages\/web\/index\.html/)

    expect(() =>
      assertNoShadowedInjectionAnchors(
        fixture("muxMagicBefore.html"),
        "packages/web/index.html",
      ),
    ).toThrowError(/line 10/)

    expect(() =>
      assertNoShadowedInjectionAnchors(
        fixture("muxMagicBefore.html"),
        "packages/web/index.html",
      ),
    ).toThrowError(/drop the angle brackets/)
  })

  test("a clean document throws nothing", () => {
    expect(() =>
      assertNoShadowedInjectionAnchors(
        fixture("muxMagicAfter.html"),
        "packages/web/index.html",
      ),
    ).not.toThrow()
  })
})

describe("the guard plugin", () => {
  test("is in the shared base, so no app opts in", () => {
    const config = createViteConfig()

    expect(getPluginNames(config.plugins)).toContain(
      "charcuterie:no-shadowed-injection-anchors",
    )
  })

  test("an app's own plugins are added to it, not swapped for it", () => {
    const config = createViteConfig({
      plugins: [{ name: "app:react" }],
    })

    expect(getPluginNames(config.plugins)).toEqual([
      "charcuterie:no-shadowed-injection-anchors",
      "app:react",
    ])
  })

  test("transformIndexHtml throws on the served document", () => {
    const guard = createStructuralTagCommentGuard()

    expect(() =>
      guard.transformIndexHtml.handler(
        fixture("muxMagicBefore.html"),
        { filename: "/app/packages/web/index.html" },
      ),
    ).toThrowError(/would break the dev server/)
  })

  test("transformIndexHtml passes a clean document straight through", () => {
    const guard = createStructuralTagCommentGuard()
    const html = fixture("muxMagicAfter.html")

    expect(
      guard.transformIndexHtml.handler(html, {
        filename: "/app/packages/web/index.html",
      }),
    ).toBe(html)
  })

  test("configResolved reads the entry off disk, so the failure lands at startup", () => {
    // A check that only ran on the first request would let the dev
    // server come up looking healthy, which is the exact
    // experience being fixed.
    const guard = createStructuralTagCommentGuard()

    expect(() =>
      guard.configResolved({
        root: resolve(
          fileURLToPath(import.meta.url),
          "../__fixtures__/muxMagicRoot",
        ),
        build: {},
      }),
    ).toThrowError(/index\.html would break the dev server/)
  })

  test("configResolved is silent when there is no index.html to read", () => {
    const guard = createStructuralTagCommentGuard()

    expect(() =>
      guard.configResolved({
        root: resolve(
          fileURLToPath(import.meta.url),
          "../__fixtures__",
        ),
        build: {},
      }),
    ).not.toThrow()
  })
})

describe("getHtmlEntryPaths", () => {
  test("a multi-page app's declared inputs are checked too", () => {
    // The second page of an MPA fails in exactly the same way, and
    // it is never `root/index.html`.
    expect(
      getHtmlEntryPaths({
        root: "/app",
        build: {
          rollupOptions: {
            input: {
              main: "/app/index.html",
              settings: "pages/settings.html",
            },
          },
        },
      }),
    ).toEqual([
      "/app/index.html",
      "/app/pages/settings.html",
    ])
  })

  test("non-HTML rollup inputs are left alone", () => {
    expect(
      getHtmlEntryPaths({
        root: "/app",
        build: {
          rollupOptions: { input: "src/main.tsx" },
        },
      }),
    ).toEqual(["/app/index.html"])
  })
})
