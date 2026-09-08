# `@charcuterie/ci`

CI checks shared across the fleet. Today that is one thing: a linter for decision
records, so `docs/decisions/` follows the same template in every repo.

## Why

Every repo keeps a decision paper trail, and the shape is written down in `AGENTS.md`:
one decision per file named `YYYY-MM-DD-<kebab-slug>.md`, an ADR-lite header, then
`## Decision` / `## Context` / `## Why` / `## Evidence`.

It was followed by hand, so it drifted. Measured across agentic's 262 records on
2026-09-08: **35 header-field problems, 19 missing sections, 3 missing titles**, and two
records that had never been added to the index at all — which makes them invisible, since
the index is what gets read. Both were hard constraints.

## It is NOT published to npm, on purpose

Every other `@charcuterie/*` package is published by `npm-package-deploy.yml` over OIDC
trusted publishing. That works only for a package npm already knows about: you cannot
configure a trusted publisher for a name that does not exist yet, so a **first** publish
means a hand-published automation token plus a web-UI step
(`packages/server/SEEDING.md`). Forget the web-UI step and the release job fails for the
whole fleet at the next version bump.

`shared-docs-lint.yml` sidesteps all of it by checking this repo out and running
`src/cli/docsLint.js` directly. The linter needs nothing but Node's standard library, so
there is no install, no lockfile and no build. It also removes a version-skew axis: the
ref in the caller's `uses:` and the linter it runs are the same commit.

So `ci` is deliberately absent from the deploy loop's package list. If a consumer outside
CI ever wants it on npm, follow `packages/server/SEEDING.md` and add `ci` to that list —
last, because it will be unseeded.

## Usage

```sh
charcuterie-docs-lint                    # only records changed vs origin/HEAD (CI default)
charcuterie-docs-lint --base main        # changed vs an explicit ref
charcuterie-docs-lint --all              # every record — a migration aid, not a gate
charcuterie-docs-lint path/to/record.md  # exactly these files
```

Needs no install in CI:

```yaml
- run: npx --yes @charcuterie/ci charcuterie-docs-lint --base "${{ github.event.pull_request.base.sha }}"
```

## ⚠️ Lint changed files, not the whole tree

That is why the no-argument mode is the changed-files mode. Roughly a fifth of existing
records predate the header convention. A gate that failed on them would either be switched
off or force a rewrite of settled history — and a decision record is explicitly **not**
supposed to be edited after the fact; it is superseded instead.

`--all` exists to measure the backlog, not to gate on it.

## Rules

| Rule | What it catches |
| --- | --- |
| `file-name` | Not `YYYY-MM-DD-<kebab-slug>.md`. The date is how the index sorts; the slug is what gets grepped. |
| `title` | No `# ` title on the first line. It is what the index links to. |
| `header-field` | A missing `Status` / `Date` / `Type` / `Supersedes` / `Superseded by`. |
| `date-mismatch` | The header date disagrees with the file name. |
| `section` | A missing `## Decision` / `## Context` / `## Why` / `## Evidence`. |
| `not-indexed` | The record is absent from `docs/decisions/README.md`. |

Both header styles are accepted — `- **Status:** Accepted` and the early bare
`Status: Accepted` — because the point is that the field is findable, not that it is bold.
