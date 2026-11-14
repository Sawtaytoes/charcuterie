import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

import { getIsServerPath, getIsShellPath } from "./index.ts"

describe("getIsServerPath", () => {
  test.each([
    ["/api", true],
    ["/api/", true],
    ["/api/items", true],
    ["/apiary", false],
    ["/", false],
    ["/docs/api", false],
  ])(
    "%s is a server path: %s",
    (pathname, isServerPath) => {
      expect(
        getIsServerPath({
          pathname,
          serverPathPrefixes: ["/api"],
        }),
      ).toBe(isServerPath)
    },
  )
})

describe("getIsShellPath without serverPathPrefixes", () => {
  test.each([
    ["/", true],
    ["/errors", true],
    ["/bay/3", true],
    ["/assets/gone.js", false],
    ["/assets/gone", false],
    ["/assets/", false],
    ["/gone.js", false],
    ["/docs/readme.md", false],
  ])("%s gets the shell: %s", (pathname, isShellPath) => {
    expect(getIsShellPath({ pathname })).toBe(isShellPath)
  })

  test("an extensionless path under a custom immutable prefix is not the shell", () => {
    expect(
      getIsShellPath({
        immutablePathPrefixes: ["/manage/assets/"],
        pathname: "/manage/assets/gone",
      }),
    ).toBe(false)
    expect(
      getIsShellPath({
        immutablePathPrefixes: ["/manage/assets/"],
        pathname: "/manage/views",
      }),
    ).toBe(true)
  })
})

describe("getIsShellPath with serverPathPrefixes", () => {
  const serverPathPrefixes = ["/api", "/health", "/json"]

  test.each([
    ["/", true],
    ["/errors", true],
    ["/docs/readme.md", true],
    ["/kiosk/bays/usb-1.2.3", true],
    ["/apiary", true],
    ["/jsonn", true],
    ["/api", false],
    ["/api/unknown", false],
    ["/health", false],
    ["/json", false],
    ["/json/extra", false],
    ["/assets/definitely-missing-abc123.js", false],
  ])("%s gets the shell: %s", (pathname, isShellPath) => {
    expect(
      getIsShellPath({ pathname, serverPathPrefixes }),
    ).toBe(isShellPath)
  })

  test("immutablePathPrefixes replaces the default", () => {
    expect(
      getIsShellPath({
        immutablePathPrefixes: ["/static/"],
        pathname: "/static/gone.js",
        serverPathPrefixes,
      }),
    ).toBe(false)
    expect(
      getIsShellPath({
        immutablePathPrefixes: ["/static/"],
        pathname: "/assets/gone.js",
        serverPathPrefixes,
      }),
    ).toBe(true)
  })

  test("an empty list gives every non-asset miss the shell", () => {
    expect(
      getIsShellPath({
        pathname: "/anything.txt",
        serverPathPrefixes: [],
      }),
    ).toBe(true)
  })
})

// A `node:http` server imports this entry precisely because it has
// no Hono. One stray import of the static handler would make it
// load `@hono/node-server` at start-up, or fail to bundle at all.
describe("the paths entry loads no framework", () => {
  const entryDirectory = dirname(
    fileURLToPath(import.meta.url),
  )
  // `import x from "y"`, `export { x } from "y"`, and a bare
  // `import "y"`, each across lines.
  const importRegex =
    /(?:^|\n)\s*(?:import|export)\b(?:[^"';]*?\bfrom)?\s*["']([^"']+)["']/g
  // `import("y")` and `require("y")` with a literal specifier.
  const dynamicImportRegex =
    /\b(?:import|require)\s*\(\s*["'`]([^"'`]+)["'`]/g
  // Any dynamic import or require at all, literal or computed.
  const anyDynamicImportRegex = /\b(?:import|require)\s*\(/g

  const collectSpecifiers = async (
    file: string,
    seen: Set<string>,
  ): Promise<string[]> => {
    if (seen.has(file)) return []
    seen.add(file)

    const source = await readFile(file, "utf8")
    const dynamicSpecifiers = [
      ...source.matchAll(dynamicImportRegex),
    ].map((match) => match[1] ?? "")

    // A computed specifier cannot be followed, so it is refused.
    expect(
      [...source.matchAll(anyDynamicImportRegex)].length,
      `${file} has a dynamic import with a computed specifier`,
    ).toBe(dynamicSpecifiers.length)

    const specifiers = [
      ...[...source.matchAll(importRegex)].map(
        (match) => match[1] ?? "",
      ),
      ...dynamicSpecifiers,
    ]
    const nested = await Promise.all(
      specifiers
        .filter((specifier) => specifier.startsWith("."))
        .map((specifier) =>
          collectSpecifiers(
            resolve(dirname(file), specifier),
            seen,
          ),
        ),
    )

    return [...specifiers, ...nested.flat()]
  }

  test("every module it reaches imports only relative paths", async () => {
    const specifiers = await collectSpecifiers(
      join(entryDirectory, "index.ts"),
      new Set(),
    )

    expect(specifiers.length).toBeGreaterThan(0)
    expect(
      specifiers.filter(
        (specifier) => !specifier.startsWith("."),
      ),
    ).toEqual([])
  })
})
