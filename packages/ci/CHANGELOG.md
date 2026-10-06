# @charcuterie/ci

## 0.1.1

### Patch Changes

- 4320ddd: Install shared visual-regression tools with a frozen pnpm lockfile and retain automatic
  pnpm, Yarn and npm setup for caller repositories during migration.

  Cancel superseded pull-request verification and shared visual-regression runs while
  retaining main/manual publications. Queue the library's main baselines and Docker
  image publications sequentially without replacing pending runs.

## 0.1.0

### Minor Changes

- 80d07dd: Add `@charcuterie/ci` with `charcuterie-docs-lint`, a linter for decision records.

  Every repo keeps a decision paper trail in the shape `AGENTS.md` describes, and it drifted
  because it was followed by hand: measured across agentic's 262 records, 35 header-field
  problems, 19 missing sections, 3 missing titles, and two records never added to the index
  at all — which makes them invisible, because the index is what gets read.

  It lints CHANGED records by default rather than the whole tree. About a fifth of existing
  records predate the header convention, and a gate that failed on them would either be
  switched off or force a rewrite of settled history. `--all` measures the backlog; it does
  not gate.
