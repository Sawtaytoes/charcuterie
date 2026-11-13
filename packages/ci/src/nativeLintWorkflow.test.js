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
    "../../../.github/workflows/shared-native-lint.yml",
    import.meta.url,
  ),
  "utf8",
)

// The `changed` step of each job: the shell body between its `run: |` and
// the next step.
const changedSteps = workflow
  .split("      - id: changed\n")
  .slice(1)
  .map((step) =>
    step
      .split("        run: |\n")[1]
      .split("\n      - if:")[0]
      .split("\n")
      .map((line) => line.slice(10))
      .join("\n"),
  )
const [pythonChanged, cppChanged] = changedSteps

const listFile = {
  cpp: "/tmp/cppChanged.txt",
  python: "/tmp/pythonChanged.txt",
}

describe("shared native lint changed files", () => {
  it("has a changed-files step for Python and for C++", () => {
    expect(changedSteps).toHaveLength(2)
  })

  it.each([
    [
      "a Forgejo PR whose context lost the event name",
      "pr",
      ["changed.py"],
      ["changed.cpp"],
    ],
    ["a push", "push", ["changed.py"], ["changed.cpp"]],
    ["a manual dispatch", "dispatch", [], []],
    ["a new branch", "new-branch", [], []],
    ["an unreadable payload", "invalid", [], []],
  ])(
    "selects the change's own files for %s",
    (_, scenario, expectedPython, expectedCpp) => {
      const cwd = mkdtempSync(
        join(tmpdir(), "native-lint-"),
      )
      const git = (...args) =>
        execFileSync("git", args, { cwd, encoding: "utf8" })
      try {
        git("init", "-q", "-b", "main")
        git("config", "user.name", "Fixture")
        git(
          "config",
          "user.email",
          "fixture@example.invalid",
        )
        writeFileSync(join(cwd, "README.md"), "base")
        git("add", ".")
        git("commit", "-qm", "base")
        const forkPoint = git("rev-parse", "HEAD").trim()

        // The base branch moves on after the change branched off. Its files
        // are not this change's to lint.
        writeFileSync(join(cwd, "onBase.py"), "x = 1\n")
        writeFileSync(join(cwd, "onBase.cpp"), "int x;\n")
        git("add", ".")
        git("commit", "-qm", "base moves on")
        const baseTip = git("rev-parse", "HEAD").trim()

        git("checkout", "-q", "-b", "change", forkPoint)
        writeFileSync(join(cwd, "changed.py"), "y = 2\n")
        writeFileSync(join(cwd, "changed.cpp"), "int y;\n")
        writeFileSync(join(cwd, "deleted.py"), "z = 3\n")
        mkdirSync(join(cwd, "vendor"))
        writeFileSync(
          join(cwd, "vendor/skip.py"),
          "v = 4\n",
        )
        writeFileSync(
          join(cwd, "vendor/skip.cpp"),
          "int v;\n",
        )
        git("add", ".")
        git("commit", "-qm", "change")
        git("rm", "-q", "deleted.py")
        git("commit", "-qm", "delete a file")

        const payload =
          scenario === "pr"
            ? { pull_request: { base: { sha: baseTip } } }
            : scenario === "push"
              ? { before: forkPoint }
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

        const run = (body, language) => {
          const output = join(cwd, `${language}-output`)
          rmSync(listFile[language], { force: true })
          execFileSync("bash", ["-c", body], {
            cwd,
            env: {
              ...process.env,
              // What Forgejo's reusable-workflow context hands the step.
              BASE_SHA: "",
              EXCLUDE: "vendor/",
              GITHUB_EVENT_NAME: "workflow_call",
              GITHUB_EVENT_PATH: eventPath,
              GITHUB_OUTPUT: output,
            },
            stdio: "pipe",
          })
          const hasFiles =
            readFileSync(output, "utf8") === "files=yes\n"
          return hasFiles
            ? readFileSync(listFile[language], "utf8")
                .trim()
                .split("\n")
            : []
        }

        expect(run(pythonChanged, "python")).toEqual(
          expectedPython,
        )
        expect(run(cppChanged, "cpp")).toEqual(expectedCpp)
      } finally {
        rmSync(cwd, { recursive: true, force: true })
      }
    },
  )
})
