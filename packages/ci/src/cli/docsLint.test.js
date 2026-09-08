import { execFile } from "node:child_process"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { describe, expect, it } from "vitest"

const run = promisify(execFile)

const cliPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "docsLint.js",
)

const goodRecord = [
  "# A thing was decided",
  "",
  "- **Status:** Accepted",
  "- **Date:** 2026-09-08",
  "- **Type:** CI",
  "- **Supersedes:** —",
  "- **Superseded by:** —",
  "",
  "## Decision",
  "## Context",
  "## Why",
  "## Evidence",
].join("\n")

/**
 * A throwaway git repo with one commit on `base` and a decision record added
 * on top, so `--base base` has something real to diff against.
 *
 * @param {string} record
 */
const makeRepo = async (record) => {
  const cwd = await mkdtemp(join(tmpdir(), "docs-lint-"))

  const git = (/** @type {string[]} */ ...args) =>
    run("git", args, { cwd })

  await git("init", "-q", "-b", "base")
  await git("config", "user.email", "t@t")
  await git("config", "user.name", "t")
  await writeFile(join(cwd, "README.md"), "start\n")
  await git("add", "-A")
  await git("commit", "-qm", "start")

  // The record has to land on a DIFFERENT branch, or `base...HEAD` is empty
  // and the CLI correctly reports nothing to check.
  await git("checkout", "-q", "-b", "change")
  await mkdir(join(cwd, "docs/decisions"), {
    recursive: true,
  })
  await writeFile(
    join(cwd, "docs/decisions/2026-09-08-a-thing.md"),
    record,
  )
  await git("add", "-A")
  await git("commit", "-qm", "add a record")

  return cwd
}

describe("charcuterie-docs-lint", () => {
  // `args.filter(a => !a.startsWith("-"))` read the ref after `--base` as a
  // file to lint, so the CLI opened `<sha>` and exited ENOENT. That is how CI
  // invokes it, so the gate died on every run.
  it("does not read the --base value as a file to lint", async () => {
    const cwd = await makeRepo(goodRecord)

    const { stdout } = await run(
      process.execPath,
      [cliPath, "--base", "base"],
      { cwd },
    )

    expect(stdout).toContain("1 record(s) checked")
  })

  it("exits 1 on a record that breaks the shape", async () => {
    const cwd = await makeRepo(
      goodRecord
        .replace("- **Type:** CI\n", "")
        .replace("## Evidence", ""),
    )

    await expect(
      run(process.execPath, [cliPath, "--base", "base"], {
        cwd,
      }),
    ).rejects.toMatchObject({ code: 1 })
  })

  it("rejects an unknown option instead of linting it", async () => {
    const cwd = await makeRepo(goodRecord)

    await expect(
      run(process.execPath, [cliPath, "--nope"], { cwd }),
    ).rejects.toMatchObject({ code: 1 })
  })
})
