import { execFileSync } from "node:child_process"
import {
  mkdirSync,
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
            GITHUB_EVENT_PATH: "",
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

const lintWorkflow = readFileSync(
  new URL(
    "../../../.github/workflows/shared-docs-lint.yml",
    import.meta.url,
  ),
  "utf8",
)
const lintBaseScript = lintWorkflow
  .split("        run: |\n")[1]
  .split("\n      - if:")[0]
  .split("\n")
  .map((line) => line.slice(10))
  .join("\n")

describe("caller event ranges in reusable workflows", () => {
  it.each([
    [
      "PR documentation with missing context",
      "pr-docs",
      "true",
      true,
    ],
    [
      "PR code before its last docs commit",
      "pr-code",
      "false",
      true,
    ],
    ["push with missing context", "push", "false", true],
    ["manual dispatch", "dispatch", "false", false],
    ["new branch", "new-branch", "false", false],
    [
      "unreadable caller payload",
      "invalid",
      "false",
      false,
    ],
  ])(
    "uses the complete range for %s",
    (_, scenario, expected, hasBase) => {
      const cwd = mkdtempSync(
        join(tmpdir(), "caller-range-"),
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
        if (scenario !== "pr-docs") {
          writeFileSync(
            join(cwd, "implementation.js"),
            "export const value = 1",
          )
          if (scenario === "pr-code") {
            mkdirSync(join(cwd, "docs/decisions"), {
              recursive: true,
            })
            writeFileSync(
              join(
                cwd,
                "docs/decisions/2026-10-06-incomplete.md",
              ),
              "# Incomplete decision\n",
            )
          }
          git("add", ".")
          git("commit", "-qm", "code")
        }
        const precedingCommit = git(
          "rev-parse",
          "HEAD",
        ).trim()
        writeFileSync(
          join(cwd, "README.md"),
          "last documentation commit",
        )
        git("add", ".")
        git("commit", "-qm", "documentation")
        const payload = scenario.startsWith("pr-")
          ? { pull_request: { base: { sha: base } } }
          : scenario === "push"
            ? { before: base }
            : scenario === "new-branch"
              ? { before: "0".repeat(40) }
              : {}
        const eventPath = join(cwd, "event.json")
        writeFileSync(
          eventPath,
          scenario === "invalid"
            ? "invalid json"
            : JSON.stringify(payload),
        )
        const runWorkflow = (body, filename) => {
          const output = join(cwd, filename)
          execFileSync("bash", ["-c", body], {
            cwd,
            env: {
              ...process.env,
              // A reusable PR must not use the preceding feature commit as its base.
              BASE_SHA:
                scenario === "pr-code"
                  ? precedingCommit
                  : "",
              GITHUB_EVENT_NAME: "workflow_call",
              GITHUB_EVENT_PATH: eventPath,
              GITHUB_OUTPUT: output,
            },
            stdio: "pipe",
          })
          return readFileSync(output, "utf8")
        }
        expect(runWorkflow(script, "detector-output")).toBe(
          `isDocsOnly=${expected}\n`,
        )
        const lintOutput = runWorkflow(
          lintBaseScript,
          "lint-output",
        )
        expect(lintOutput).toBe(
          `baseSha=${hasBase ? base : ""}\n`,
        )
        if (scenario === "pr-code") {
          const selectedBase = lintOutput
            .trim()
            .split("=")[1]
          const cli = new URL(
            "./cli/docsLint.js",
            import.meta.url,
          )
          expect(() =>
            execFileSync(
              process.execPath,
              [cli.pathname, "--base", selectedBase],
              { cwd, stdio: "pipe" },
            ),
          ).toThrow()
        }
      } finally {
        rmSync(cwd, { recursive: true, force: true })
      }
    },
  )
})
