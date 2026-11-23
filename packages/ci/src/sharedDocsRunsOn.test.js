import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const readWorkflow = (name) =>
  readFileSync(
    new URL(
      `../../../.github/workflows/${name}`,
      import.meta.url,
    ),
    "utf8",
  )

describe.each([
  ["shared-docs-only-changes.yml", "detect"],
  ["shared-docs-lint.yml", "decisionRecords"],
])("%s runner choice", (name, job) => {
  const workflow = readWorkflow(name)

  it("declares an optional runsOn input that defaults to ubuntu-latest", () => {
    const inputs = workflow
      .split("  workflow_call:\n")[1]
      .split("\njobs:\n")[0]
    expect(inputs).toMatch(
      /\n {6}runsOn:\n(?: {8}.*\n|\s*\n)*? {8}required: false\n {8}default: '\["ubuntu-latest"\]'\n/,
    )
  })

  it(`runs ${job} on the runsOn labels, falling back to ubuntu-latest`, () => {
    const jobBlock = workflow.split(`\n  ${job}:\n`)[1]
    expect(jobBlock.split("\n")[0]).toBe(
      `    runs-on: \${{ fromJSON(inputs.runsOn || '["ubuntu-latest"]') }}`,
    )
  })
})
