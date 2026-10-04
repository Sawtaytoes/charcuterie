import { execFileSync } from "node:child_process"
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const workflow = readFileSync(
  new URL(
    "../../../.github/workflows/shared-docs-only-changes.yml",
    import.meta.url,
  ),
  "utf8",
)
const script = workflow
  .split("        run: |\n")[1]
  .split("\n")
  .map((line) => line.slice(10))
  .join("\n")

describe("shared docs-only workflow", () => {
  it.each([
    ["large code import", ".py", false, "false"],
    ["large documentation diff", ".md", false, "true"],
    [
      "changeset before a large docs diff",
      ".md",
      true,
      "false",
    ],
  ])(
    "classifies %s under pipefail",
    (_, extension, hasChangeset, expected) => {
      const cwd = mkdtempSync(
        join(tmpdir(), "docs-detector-"),
      )
      const git = (...args) =>
        execFileSync("git", args, { cwd, encoding: "utf8" })
      try {
        git("init", "-q")
        git("config", "user.name", "Fixture")
        git(
          "config",
          "user.email",
          "fixture@example.invalid",
        )
        writeFileSync(join(cwd, "README.md"), "base")
        git("add", ".")
        git("commit", "-qm", "base")
        const base = git("rev-parse", "HEAD").trim()
        for (let i = 0; i < 1000; i++) {
          writeFileSync(
            join(
              cwd,
              `${String(i).padStart(4, "0")}-${"long-name".repeat(12)}${extension}`,
            ),
            "fixture",
          )
        }
        if (hasChangeset) {
          execFileSync("mkdir", [".changeset"], { cwd })
          writeFileSync(
            join(cwd, ".changeset", "fixture.md"),
            "release",
          )
        }
        git("add", ".")
        git("commit", "-qm", "diff")
        const output = join(cwd, "output")
        execFileSync("bash", ["-c", script], {
          cwd,
          env: {
            ...process.env,
            BASE_SHA: base,
            GITHUB_OUTPUT: output,
          },
          maxBuffer: 1024 * 1024,
        })
        expect(readFileSync(output, "utf8")).toBe(
          `isDocsOnly=${expected}\n`,
        )
      } finally {
        rmSync(cwd, { recursive: true, force: true })
      }
    },
  )
})
