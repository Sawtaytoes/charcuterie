import { describe, expect, it } from "vitest"

import { lintDecisionRecord } from "./docsLint.js"

const goodRecord = `# A thing was decided

- **Status:** Accepted
- **Date:** 2026-09-08
- **Type:** CI / fleet infrastructure
- **Supersedes:** —
- **Superseded by:** —

## Decision

We did the thing.

## Context

It came up.

## Why

Because.

## Evidence

Verified on a real run.
`

const rulesOf = (
  /** @type {ReturnType<typeof lintDecisionRecord>} */ problems,
) => (
  problems.map((problem) => problem.rule)
)

describe("lintDecisionRecord", () => {
  it("passes a record that follows the template", () => {
    expect(
      lintDecisionRecord(
        "docs/decisions/2026-09-08-a-thing.md",
        goodRecord,
        "- [A thing](2026-09-08-a-thing.md)",
      ),
    )
      .toEqual([])
  })

  it("ignores the index itself", () => {
    expect(
      lintDecisionRecord("docs/decisions/README.md", "# Decisions", null),
    )
      .toEqual([])
  })

  it("accepts the early un-bolded header style", () => {
    expect(
      rulesOf(
        lintDecisionRecord(
          "docs/decisions/2026-09-08-a-thing.md",
          goodRecord.replace(/- \*\*(.+?):\*\*/g, "$1:"),
          "2026-09-08-a-thing.md",
        ),
      ),
    )
      .toEqual([])
  })

  it("flags a file name that is not YYYY-MM-DD-kebab", () => {
    expect(
      rulesOf(
        lintDecisionRecord("docs/decisions/A_Thing.md", goodRecord, "A_Thing.md"),
      ),
    )
      .toContain("file-name")
  })

  it("flags a record missing from the index — the failure that hides a record", () => {
    expect(
      rulesOf(
        lintDecisionRecord(
          "docs/decisions/2026-09-08-a-thing.md",
          goodRecord,
          "- [Something else](2026-01-01-other.md)",
        ),
      ),
    )
      .toEqual(["not-indexed"])
  })

  it("flags a header date that disagrees with the file name", () => {
    expect(
      rulesOf(
        lintDecisionRecord(
          "docs/decisions/2026-09-08-a-thing.md",
          goodRecord.replace("2026-09-08", "2026-09-01"),
          "2026-09-08-a-thing.md",
        ),
      ),
    )
      .toContain("date-mismatch")
  })

  it("names every missing section rather than only the first", () => {
    expect(
      rulesOf(
        lintDecisionRecord(
          "docs/decisions/2026-09-08-a-thing.md",
          goodRecord
            .replace("## Why\n\nBecause.\n\n", "")
            .replace("## Evidence\n\nVerified on a real run.\n", ""),
          "2026-09-08-a-thing.md",
        ),
      ),
    )
      .toEqual(["section", "section"])
  })

  it("flags a missing header field", () => {
    expect(
      rulesOf(
        lintDecisionRecord(
          "docs/decisions/2026-09-08-a-thing.md",
          goodRecord.replace("- **Superseded by:** —\n", ""),
          "2026-09-08-a-thing.md",
        ),
      ),
    )
      .toEqual(["header-field"])
  })

  it("flags a missing title", () => {
    expect(
      rulesOf(
        lintDecisionRecord(
          "docs/decisions/2026-09-08-a-thing.md",
          goodRecord.replace("# A thing was decided\n", ""),
          "2026-09-08-a-thing.md",
        ),
      ),
    )
      .toContain("title")
  })
})
