import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import type { Plugin } from "vite"
import { describe, expect, test } from "vitest"

import { precompressAssets } from "./precompressAssets.ts"

const packageDirectory = join(
  import.meta.dirname,
  "..",
  "..",
)
const sourceDirectory = join(packageDirectory, "src")

const listSourceFiles = async (): Promise<string[]> => {
  const entries = await readdir(sourceDirectory, {
    recursive: true,
    withFileTypes: true,
  })

  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts"),
    )
    .map((entry) => join(entry.parentPath, entry.name))
}

describe("precompressAssets", () => {
  // The plugin writes out its own shape so this package can name no
  // Vite dependency. This is the check that the shape still fits.
  // `pnpm typecheck` is the assertion: the assignment fails to
  // compile when the written-out shape stops fitting Vite's `Plugin`.
  test("is a Vite plugin", () => {
    const plugin: Plugin = precompressAssets()

    expect(plugin.name).toBe(
      "charcuterie:precompress-assets",
    )
  })

  test("runs after the bundle is written, at build time only", () => {
    const plugin = precompressAssets()

    expect(plugin.apply).toBe("build")
    expect(plugin.enforce).toBe("post")
    expect(plugin.writeBundle.order).toBe("post")
  })
})

// An optional peer is not enough. pnpm links it to the workspace's
// Vite and records it in the lockfile, so a production install of
// an app's server installs Vite, Rolldown, and their native binaries.
describe("Vite stays out of a production install", () => {
  test("package.json names no vite dependency, peer, or optional peer", async () => {
    const manifest = JSON.parse(
      await readFile(
        join(packageDirectory, "package.json"),
        "utf8",
      ),
    ) as Record<string, Record<string, unknown> | undefined>

    for (const field of [
      "dependencies",
      "optionalDependencies",
      "peerDependencies",
      "peerDependenciesMeta",
    ]) {
      expect(
        Object.keys(manifest[field] ?? {}),
      ).not.toContain("vite")
    }
  })

  test("no shipped source file imports vite", async () => {
    const importers: string[] = []

    for (const path of await listSourceFiles()) {
      const source = await readFile(path, "utf8")

      if (/from\s+["']vite(?:\/[^"']*)?["']/.test(source)) {
        importers.push(path)
      }
    }

    expect(importers).toEqual([])
  })
})
