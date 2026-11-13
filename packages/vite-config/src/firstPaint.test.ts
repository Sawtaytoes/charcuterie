import {
  buildFirstPaintScript,
  DEFAULT_COLOR_SCHEME_STORAGE_KEY,
  daylight,
  hairline,
} from "@charcuterie/tokens"
import { describe, expect, test } from "vitest"

import {
  buildFirstPaintScriptBody,
  createFirstPaintPlugin,
} from "./firstPaint.js"

describe("buildFirstPaintScriptBody", () => {
  test("strips the script wrapper and nothing else", () => {
    const body = buildFirstPaintScriptBody()

    expect(body).not.toContain("<script")
    expect(body).not.toContain("</script>")
    expect(`<script>\n${body}\n</script>`).toBe(
      buildFirstPaintScript(daylight, {
        storageKey: DEFAULT_COLOR_SCHEME_STORAGE_KEY,
      }),
    )
  })

  test("paints daylight's surfaces by default", () => {
    const body = buildFirstPaintScriptBody()

    expect(body).toContain(
      JSON.stringify(daylight.schemes.light.surface.base),
    )
    expect(body).toContain(
      JSON.stringify(daylight.schemes.dark.surface.base),
    )
    expect(body).toContain(
      JSON.stringify(DEFAULT_COLOR_SCHEME_STORAGE_KEY),
    )
  })

  test("paints the variant it is given", () => {
    const body = buildFirstPaintScriptBody({
      variant: hairline,
    })

    expect(body).toContain(
      JSON.stringify(hairline.schemes.light.surface.base),
    )
    expect(body).toContain(
      JSON.stringify(hairline.schemes.dark.surface.base),
    )
  })

  test("reads the storage key it is given", () => {
    const body = buildFirstPaintScriptBody({
      storageKey: "my-app-scheme",
    })

    expect(body).toContain('"my-app-scheme"')
    expect(body).not.toContain(
      JSON.stringify(DEFAULT_COLOR_SCHEME_STORAGE_KEY),
    )
  })

  // The body runs as an inline script, so prove it parses and sets
  // the attribute rather than only that it contains the right text.
  test("sets data-scheme from the stored choice when it runs", () => {
    const attributes = new Map<string, string>()
    const appended: { textContent: string }[] = []
    const fakeWindow = {
      localStorage: {
        getItem: (key: string) =>
          key === DEFAULT_COLOR_SCHEME_STORAGE_KEY
            ? "dark"
            : null,
      },
      matchMedia: () => ({ matches: false }),
    }
    const fakeDocument = {
      createElement: () => ({ textContent: "" }),
      documentElement: {
        setAttribute: (name: string, value: string) => {
          attributes.set(name, value)
        },
      },
      head: {
        appendChild: (element: { textContent: string }) => {
          appended.push(element)
        },
      },
    }

    new Function(
      "window",
      "document",
      buildFirstPaintScriptBody(),
    )(fakeWindow, fakeDocument)

    expect(attributes.get("data-scheme")).toBe("dark")
    expect(appended[0]?.textContent).toContain(
      daylight.schemes.dark.surface.base,
    )
  })
})

describe("createFirstPaintPlugin", () => {
  test("prepends one script tag to head, before Vite's own tags", () => {
    const plugin = createFirstPaintPlugin()

    expect(plugin.name).toBe("charcuterie:first-paint")
    expect(plugin.transformIndexHtml.order).toBe("pre")
    expect(plugin.transformIndexHtml.handler()).toEqual([
      {
        children: buildFirstPaintScriptBody(),
        injectTo: "head-prepend",
        tag: "script",
      },
    ])
  })

  test("passes its options through to the script", () => {
    const plugin = createFirstPaintPlugin({
      storageKey: "my-app-scheme",
      variant: hairline,
    })

    expect(
      plugin.transformIndexHtml.handler()[0]?.children,
    ).toBe(
      buildFirstPaintScriptBody({
        storageKey: "my-app-scheme",
        variant: hairline,
      }),
    )
  })
})
