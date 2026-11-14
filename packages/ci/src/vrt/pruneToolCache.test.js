import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  browserDirectoriesFor,
  isBrowserDirectoryName,
  isPruneDue,
  main,
  planBrowserRemoval,
  pruneBrowsers,
  STAMP_NAME,
} from "./pruneToolCache.js"

const GIB = 1024 * 1024 * 1024
const HOUR = 3_600_000

const temporaryDirectories = []

const makeTemporaryDirectory = () => {
  const directory = mkdtempSync(
    join(tmpdir(), "vrt-prune-"),
  )
  temporaryDirectories.push(directory)
  return directory
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

/** A package with a `browsers.json`, and its link in the registry. */
const linkPackage = (
  browsersPath,
  packagePath,
  browsers,
) => {
  mkdirSync(packagePath, { recursive: true })
  writeFileSync(
    join(packagePath, "browsers.json"),
    JSON.stringify({ browsers }),
  )
  mkdirSync(join(browsersPath, ".links"), {
    recursive: true,
  })
  writeFileSync(
    join(
      browsersPath,
      ".links",
      packagePath.replace(/\W/g, ""),
    ),
    packagePath,
  )
}

const makeBrowsers = (browsersPath, names) => {
  for (const name of names) {
    mkdirSync(join(browsersPath, name), { recursive: true })
    writeFileSync(
      join(browsersPath, name, "INSTALLATION_COMPLETE"),
      "",
    )
  }
}

describe("browserDirectoriesFor", () => {
  it("names directories the way Playwright does, with overrides", () => {
    expect(
      browserDirectoriesFor({
        browsers: [
          { name: "chromium", revision: "1243" },
          {
            name: "chromium-headless-shell",
            revision: "1243",
          },
          {
            name: "webkit",
            revision: "2200",
            revisionOverrides: { "mac14-arm64": "2190" },
          },
        ],
      }),
    ).toEqual([
      "chromium-1243",
      "chromium_headless_shell-1243",
      "webkit-2200",
      "webkit_mac14_arm64_special-2190",
    ])
  })
})

describe("planBrowserRemoval", () => {
  it("removes only browser directories no live link uses", () => {
    expect(
      planBrowserRemoval(
        [
          "chromium-1243",
          "chromium_headless_shell-1234",
          "chromium_headless_shell-1243",
          "ffmpeg-1011",
          "notes",
        ],
        new Set([
          "chromium-1243",
          "chromium_headless_shell-1243",
        ]),
      ),
    ).toEqual([
      "chromium_headless_shell-1234",
      "ffmpeg-1011",
    ])
  })

  it("does not treat other directories as browsers", () => {
    expect(isBrowserDirectoryName(".links")).toBe(false)
    expect(isBrowserDirectoryName("__dirlock")).toBe(false)
    expect(
      isBrowserDirectoryName("chromium_tip_of_tree-1"),
    ).toBe(true)
  })
})

describe("isPruneDue", () => {
  const base = {
    maxBytes: 5 * GIB,
    now: 100 * HOUR,
    pruneHours: 24,
    totalBytes: GIB,
  }

  it("is due with no earlier prune", () => {
    expect(
      isPruneDue({ ...base, stampTime: null }).isDue,
    ).toBe(true)
  })

  it("waits until the interval has passed", () => {
    expect(
      isPruneDue({ ...base, stampTime: 90 * HOUR }).isDue,
    ).toBe(false)
    expect(
      isPruneDue({ ...base, stampTime: 76 * HOUR }).isDue,
    ).toBe(true)
  })

  it("is due at once when the caches are over the size bound", () => {
    const due = isPruneDue({
      ...base,
      stampTime: 99 * HOUR,
      totalBytes: 6 * GIB,
    })

    expect(due.isDue).toBe(true)
    expect(due.reason).toContain("over 5.00 GiB")
  })
})

describe("pruneBrowsers", () => {
  it("keeps what live links use and drops the rest and broken links", () => {
    const root = makeTemporaryDirectory()
    const browsersPath = join(root, "ms-playwright")
    makeBrowsers(browsersPath, [
      "chromium-1243",
      "chromium_headless_shell-1234",
      "chromium_headless_shell-1243",
      "ffmpeg-1011",
    ])
    // The repo's Playwright wants 1234, the tools' 1243: both stay.
    linkPackage(
      browsersPath,
      join(root, "repo-playwright-core"),
      [
        {
          name: "chromium-headless-shell",
          revision: "1234",
        },
      ],
    )
    linkPackage(
      browsersPath,
      join(root, "tools-playwright-core"),
      [
        { name: "chromium", revision: "1243" },
        {
          name: "chromium-headless-shell",
          revision: "1243",
        },
      ],
    )
    // A package removed since it installed: its link is broken.
    writeFileSync(
      join(browsersPath, ".links", "gone"),
      join(root, "removed-playwright-core"),
    )

    expect(pruneBrowsers(browsersPath)).toEqual([
      "ffmpeg-1011",
    ])
    expect(readdirSync(browsersPath).sort()).toEqual([
      ".links",
      "chromium-1243",
      "chromium_headless_shell-1234",
      "chromium_headless_shell-1243",
    ])
    expect(
      existsSync(join(browsersPath, ".links", "gone")),
    ).toBe(false)
  })

  it("removes every browser when every link is broken", () => {
    const root = makeTemporaryDirectory()
    const browsersPath = join(root, "ms-playwright")
    makeBrowsers(browsersPath, [
      "chromium_headless_shell-1234",
    ])
    mkdirSync(join(browsersPath, ".links"))
    writeFileSync(
      join(browsersPath, ".links", "gone"),
      "/nonexistent",
    )

    expect(pruneBrowsers(browsersPath)).toEqual([
      "chromium_headless_shell-1234",
    ])
  })

  it("keeps everything without a .links directory", () => {
    const root = makeTemporaryDirectory()
    const browsersPath = join(root, "ms-playwright")
    makeBrowsers(browsersPath, [
      "chromium_headless_shell-1234",
    ])

    expect(pruneBrowsers(browsersPath)).toEqual([])
    expect(readdirSync(browsersPath)).toEqual([
      "chromium_headless_shell-1234",
    ])
  })
})

describe("main", () => {
  const setUp = () => {
    const root = makeTemporaryDirectory()
    const browsersPath = join(root, "ms-playwright")
    makeBrowsers(browsersPath, ["ffmpeg-1011"])
    mkdirSync(join(browsersPath, ".links"))
    return {
      browsersPath,
      env: {
        VRT_CACHE_BROWSERS_PATH: browsersPath,
        // Absent, so the test never runs pnpm.
        VRT_PNPM_STORE_DIR: join(root, "pnpm", "store"),
        VRT_TOOL_CACHE_ROOT: root,
        VRT_TOOLS: root,
      },
      root,
    }
  }

  it("prunes and records the time when due", () => {
    const { browsersPath, env, root } = setUp()

    main(env, Date.now())

    expect(
      existsSync(join(browsersPath, "ffmpeg-1011")),
    ).toBe(false)
    expect(existsSync(join(root, STAMP_NAME))).toBe(true)
  })

  it("skips a prune inside the interval", () => {
    const { browsersPath, env, root } = setUp()
    writeFileSync(join(root, STAMP_NAME), "")
    const now = Date.now()
    utimesSync(
      join(root, STAMP_NAME),
      new Date(now - HOUR),
      new Date(now - HOUR),
    )

    main(env, now)

    expect(
      existsSync(join(browsersPath, "ffmpeg-1011")),
    ).toBe(true)
  })

  it("does nothing when the cache paths are not set", () => {
    expect(() => main({}, Date.now())).not.toThrow()
  })
})
