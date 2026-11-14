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
  isStoreRenewalDue,
  main,
  planBrowserRemoval,
  pruneBrowsers,
  STORE_STAMP_NAME,
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

describe("isStoreRenewalDue", () => {
  const DAY = 24 * HOUR
  const base = {
    maxBytes: 4 * GIB,
    maxDays: 7,
    now: 100 * DAY,
    storeBytes: GIB,
  }

  it("keeps a store younger than the limit", () => {
    expect(
      isStoreRenewalDue({ ...base, sinceTime: 95 * DAY })
        .isDue,
    ).toBe(false)
    expect(
      isStoreRenewalDue({ ...base, sinceTime: null }).isDue,
    ).toBe(false)
  })

  it("renews a store at the age limit", () => {
    const due = isStoreRenewalDue({
      ...base,
      sinceTime: 93 * DAY,
    })

    expect(due.isDue).toBe(true)
    expect(due.reason).toBe("it is 7 days old")
  })

  it("renews a store over the size bound at once", () => {
    const due = isStoreRenewalDue({
      ...base,
      sinceTime: 99 * DAY,
      storeBytes: 5 * GIB,
    })

    expect(due.isDue).toBe(true)
    expect(due.reason).toContain("over 4.00 GiB")
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
    const storePath = join(root, "pnpm", "store")
    makeBrowsers(browsersPath, ["ffmpeg-1011"])
    mkdirSync(join(browsersPath, ".links"))
    mkdirSync(join(storePath, "v11", "files"), {
      recursive: true,
    })
    writeFileSync(join(storePath, "v11", "files", "a"), "x")
    return {
      browsersPath,
      env: {
        VRT_CACHE_BROWSERS_PATH: browsersPath,
        VRT_PNPM_STORE_DIR: storePath,
        VRT_TOOL_CACHE_ROOT: root,
      },
      root,
      storePath,
    }
  }

  it("removes unused browsers and starts the store's age", () => {
    const { browsersPath, env, root, storePath } = setUp()

    main(env, Date.now())

    expect(
      existsSync(join(browsersPath, "ffmpeg-1011")),
    ).toBe(false)
    expect(existsSync(storePath)).toBe(true)
    expect(existsSync(join(root, STORE_STAMP_NAME))).toBe(
      true,
    )
  })

  it("removes a store that has reached its age", () => {
    const { env, root, storePath } = setUp()
    const now = Date.now()
    const stamp = join(root, STORE_STAMP_NAME)
    writeFileSync(stamp, "")
    utimesSync(
      stamp,
      new Date(now - 8 * 24 * HOUR),
      new Date(now - 8 * 24 * HOUR),
    )

    main(env, now)

    expect(existsSync(storePath)).toBe(false)
    expect(existsSync(stamp)).toBe(false)
  })

  it("keeps a younger store", () => {
    const { env, root, storePath } = setUp()
    const now = Date.now()
    const stamp = join(root, STORE_STAMP_NAME)
    writeFileSync(stamp, "")
    utimesSync(
      stamp,
      new Date(now - HOUR),
      new Date(now - HOUR),
    )

    main(env, now)

    expect(existsSync(storePath)).toBe(true)
  })

  it("does nothing when the cache paths are not set", () => {
    expect(() => main({}, Date.now())).not.toThrow()
  })
})
