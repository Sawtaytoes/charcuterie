import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { repoInstallCommand } from "./installRepo.js"

const directories = []
function fixture(manager, lockfile) {
  const directory = mkdtempSync(
    join(tmpdir(), "charcuterie-installer-"),
  )
  directories.push(directory)
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify(
      manager ? { packageManager: manager } : {},
    ),
  )
  if (lockfile) writeFileSync(join(directory, lockfile), "")
  return directory
}
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true })
})

describe("shared workflow package-manager setup", () => {
  it("selects the pinned manager ahead of a stale lockfile during migration", () => {
    expect(
      repoInstallCommand(
        fixture("pnpm@12.9.1", "yarn.lock"),
      ),
    ).toEqual([
      "pnpm",
      "install",
      "--frozen-lockfile",
      "--store-dir",
      join(homedir(), ".cache", "pnpm", "store"),
    ])
    expect(
      repoInstallCommand(
        fixture("yarn@4.14.1", "pnpm-lock.yaml"),
      ),
    ).toEqual(["yarn", "install", "--immutable"])
  })
  it("keeps npm callers frozen", () => {
    expect(
      repoInstallCommand(
        fixture("npm@11", "package-lock.json"),
      ),
    ).toEqual(["npm", "ci", "--no-audit", "--no-fund"])
  })
  it.each([
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
  ])(
    "recognizes %s without a packageManager field",
    (lockfile, manager) => {
      expect(
        repoInstallCommand(fixture(undefined, lockfile))[0],
      ).toBe(manager)
    },
  )
  it("refuses an unknown setup instead of silently installing mutable dependencies", () => {
    expect(() =>
      repoInstallCommand(fixture(undefined, undefined)),
    ).toThrow("Set setupCommand explicitly")
  })
})
