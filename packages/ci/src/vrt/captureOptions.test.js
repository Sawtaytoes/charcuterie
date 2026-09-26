import { describe, expect, it } from "vitest"

import {
  isStoryIdMatch,
  parseCaptureArguments,
  parseConcurrency,
  parseStorybookSource,
  parseStorybookSources,
  parseViewport,
  planShots,
  resolveSchemes,
  selectStoryIds,
  shotFileName,
  splitList,
  storyUrl,
} from "./captureOptions.js"

describe("parseStorybookSource", () => {
  it("splits a prefix from its directory", () => {
    expect(
      parseStorybookSource(
        "web=packages/web/storybook-static",
      ),
    ).toEqual({
      prefix: "web",
      staticDir: "packages/web/storybook-static",
    })
  })

  it("reads a bare path, or an empty prefix, as no prefix", () => {
    expect(
      parseStorybookSource(
        "packages/docs/storybook-static",
      ),
    ).toEqual({
      prefix: "",
      staticDir: "packages/docs/storybook-static",
    })
    expect(
      parseStorybookSource(
        " =packages/docs/storybook-static ",
      ),
    ).toEqual({
      prefix: "",
      staticDir: "packages/docs/storybook-static",
    })
  })

  it("refuses a prefix that is not file-system safe", () => {
    expect(() =>
      parseStorybookSource("my app=storybook-static"),
    ).toThrow(/not file-system safe/)
    expect(() =>
      parseStorybookSource("../up=storybook-static"),
    ).toThrow(/not file-system safe/)
  })

  it("refuses a source with no directory", () => {
    expect(() => parseStorybookSource("web=")).toThrow(
      /no directory/,
    )
  })
})

describe("parseStorybookSources", () => {
  it("refuses two sources that would write over each other", () => {
    expect(() =>
      parseStorybookSources(["web=a", "web=b"]),
    ).toThrow(/share the prefix `web`/)
    expect(() => parseStorybookSources(["a", "b"])).toThrow(
      /Only one Storybook may go without a prefix/,
    )
  })

  it("keeps distinct prefixes in order", () => {
    expect(
      parseStorybookSources(["web=a", "server=b", "c"]).map(
        (source) => source.prefix,
      ),
    ).toEqual(["web", "server", ""])
  })
})

describe("parseViewport", () => {
  it("defaults to 1280x800", () => {
    expect(parseViewport(undefined)).toEqual({
      height: 800,
      width: 1280,
    })
    expect(parseViewport("  ")).toEqual({
      height: 800,
      width: 1280,
    })
  })

  it("reads WIDTHxHEIGHT", () => {
    expect(parseViewport("1280x900")).toEqual({
      height: 900,
      width: 1280,
    })
    expect(parseViewport(" 390 X 844 ")).toEqual({
      height: 844,
      width: 390,
    })
  })

  it("refuses anything else", () => {
    expect(() => parseViewport("1280")).toThrow(/is not/)
    expect(() => parseViewport("0x800")).toThrow(
      /zero side/,
    )
  })
})

describe("parseConcurrency", () => {
  it("defaults to 4 and refuses a non-positive count", () => {
    expect(parseConcurrency(undefined)).toBe(4)
    expect(parseConcurrency("2")).toBe(2)
    expect(() => parseConcurrency("0")).toThrow()
    expect(() => parseConcurrency("1.5")).toThrow()
  })
})

describe("resolveSchemes", () => {
  it("shoots one unsuffixed pass when there is no scheme global", () => {
    expect(resolveSchemes({})).toEqual([null])
    expect(resolveSchemes({ schemeGlobal: "" })).toEqual([
      null,
    ])
  })

  it("shoots each scheme when the global is named", () => {
    expect(
      resolveSchemes({
        schemeGlobal: "scheme",
        schemes: ["dark", "light"],
      }),
    ).toEqual(["dark", "light"])
  })

  it("refuses half a configuration", () => {
    expect(() =>
      resolveSchemes({ schemes: ["dark"] }),
    ).toThrow(/without a scheme global/)
    expect(() =>
      resolveSchemes({ schemeGlobal: "scheme" }),
    ).toThrow(/no schemes/)
  })
})

describe("splitList", () => {
  it("splits on commas, spaces and newlines", () => {
    expect(splitList("dark, light\nsepia  ")).toEqual([
      "dark",
      "light",
      "sepia",
    ])
    expect(splitList(undefined)).toEqual([])
  })
})

describe("isStoryIdMatch", () => {
  it("matches a plain pattern as a substring", () => {
    expect(
      isStoryIdMatch(
        "button",
        "components-button--playground",
      ),
    ).toBe(true)
    expect(
      isStoryIdMatch(
        "tabs",
        "components-button--playground",
      ),
    ).toBe(false)
  })

  it("matches a starred pattern as a whole-id glob", () => {
    expect(
      isStoryIdMatch(
        "components-*--playground",
        "components-button--playground",
      ),
    ).toBe(true)
    expect(
      isStoryIdMatch(
        "components-*",
        "tokens-specimen--default",
      ),
    ).toBe(false)
  })
})

describe("selectStoryIds", () => {
  const index = {
    entries: {
      a: { id: "tokens-specimen--default", type: "story" },
      b: { id: "components-button--docs", type: "docs" },
      c: {
        id: "components-button--playground",
        type: "story",
      },
      d: {
        id: "components-alert--all-states",
        type: "story",
      },
    },
  }

  it("drops docs entries and sorts by id", () => {
    expect(selectStoryIds(index)).toEqual([
      "components-alert--all-states",
      "components-button--playground",
      "tokens-specimen--default",
    ])
  })

  it("applies include, then exclude", () => {
    expect(
      selectStoryIds(index, {
        exclude: ["alert"],
        include: ["components-*"],
      }),
    ).toEqual(["components-button--playground"])
  })

  it("reads a Storybook 6 `stories` index with no types", () => {
    expect(
      selectStoryIds({ stories: { a: { id: "b--c" } } }),
    ).toEqual(["b--c"])
  })
})

describe("shotFileName", () => {
  it("keeps the old capture's naming when there is no prefix", () => {
    expect(
      shotFileName({
        prefix: "",
        scheme: "dark",
        storyId: "components-button--playground",
      }),
    ).toBe("components-button--playground__dark.png")
  })

  it("files a prefixed Storybook under its own folder", () => {
    expect(
      shotFileName({
        prefix: "web",
        scheme: null,
        storyId: "pages-home--default",
      }),
    ).toBe("web/pages-home--default.png")
  })
})

describe("storyUrl", () => {
  it("applies the scheme through the globals query", () => {
    expect(
      storyUrl({
        origin: "http://127.0.0.1:1",
        scheme: "light",
        schemeGlobal: "scheme",
        storyId: "a--b",
      }),
    ).toBe(
      "http://127.0.0.1:1/iframe.html?id=a--b&viewMode=story&globals=scheme%3Alight",
    )
  })

  it("leaves globals out when there is no scheme", () => {
    expect(
      storyUrl({
        origin: "http://127.0.0.1:1",
        scheme: null,
        storyId: "a--b",
      }),
    ).toBe(
      "http://127.0.0.1:1/iframe.html?id=a--b&viewMode=story",
    )
  })
})

describe("planShots", () => {
  it("crosses every story of every Storybook with every scheme", () => {
    const shots = planShots(
      [
        {
          source: { prefix: "web", staticDir: "w" },
          storyIds: ["a--b"],
        },
        {
          source: { prefix: "", staticDir: "d" },
          storyIds: ["c--d", "e--f"],
        },
      ],
      ["dark", "light"],
    )

    expect(shots.map((shot) => shot.fileName)).toEqual([
      "web/a--b__dark.png",
      "web/a--b__light.png",
      "c--d__dark.png",
      "c--d__light.png",
      "e--f__dark.png",
      "e--f__light.png",
    ])
  })
})

describe("parseCaptureArguments", () => {
  it("reads flags in both spellings", () => {
    const options = parseCaptureArguments(
      [
        "web=packages/web/storybook-static",
        "--scheme-global",
        "scheme",
        "--schemes=dark,light",
        "--viewport",
        "1280x900",
        "--out",
        "shots",
      ],
      {},
    )

    expect(options).toMatchObject({
      actualDir: "shots",
      schemeGlobal: "scheme",
      schemes: ["dark", "light"],
      sources: [
        {
          prefix: "web",
          staticDir: "packages/web/storybook-static",
        },
      ],
      viewport: { height: 900, width: 1280 },
    })
  })

  it("falls back to the environment the workflow sets", () => {
    const options = parseCaptureArguments([], {
      VRT_ACTUAL_DIR: ".shots",
      VRT_CONCURRENCY: "2",
      VRT_EXCLUDE: "flaky",
      VRT_SCHEME_ATTRIBUTE: "data-scheme",
      VRT_SCHEME_GLOBAL: "scheme",
      VRT_SCHEMES: "dark light",
      VRT_STORYBOOK_STATIC_DIRS:
        "\n  web=packages/web/storybook-static\n  server=packages/server/storybook-static\n",
    })

    expect(options).toMatchObject({
      actualDir: ".shots",
      concurrency: 2,
      exclude: ["flaky"],
      schemeAttribute: "data-scheme",
      schemes: ["dark", "light"],
    })
    expect(
      options.sources.map((source) => source.prefix),
    ).toEqual(["web", "server"])
  })

  it("defaults the actual directory and the scheme pass", () => {
    const options = parseCaptureArguments(
      ["storybook-static"],
      {},
    )

    expect(options.actualDir).toBe(".vrt-actual")
    expect(options.schemes).toEqual([null])
    expect(options.schemeGlobal).toBeNull()
    expect(options.viewport).toEqual({
      height: 800,
      width: 1280,
    })
  })

  it("refuses an empty source list and an unknown flag", () => {
    expect(() => parseCaptureArguments([], {})).toThrow(
      /No Storybook to capture/,
    )
    expect(() =>
      parseCaptureArguments(["a", "--nope"], {}),
    ).toThrow(/Unknown option/)
    expect(() =>
      parseCaptureArguments(["a", "--out"], {}),
    ).toThrow(/needs a value/)
  })
})
