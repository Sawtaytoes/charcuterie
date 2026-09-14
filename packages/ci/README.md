# `@charcuterie/ci`

CI checks shared across the fleet, and the home for **lint configuration that no repo can
install**.

Two things live here:

1. `charcuterie-docs-lint` — a linter for decision records, so `docs/decisions/` follows the
   same template in every repo.
2. `configs/ruff.toml` and `configs/clang-format.yml` — the fleet's shared Python and C++
   configuration, read by `shared-native-lint.yml`.

## Why the Python and C++ configs are HERE and not in their own packages

Every JavaScript config in this repo is a package a consumer installs:
`@charcuterie/eslint-config`, `@charcuterie/biome-config`, `@charcuterie/tsconfig`. That
works because the consumer is a Node project with a `package.json`.

**Python and C++ have no such path.** `castkit`'s `device-client/` is plain Python on a
Raspberry Pi with no `package.json` anywhere near it, and its ESPHome components are C++
compiled by `esphome`. Neither can `yarn add` anything. A config for them has to arrive by
**checkout**, which is exactly how `docsLint.js` already arrives — so `ci` is the package
that already solves this problem, and a second unpublished package would only add a name.

Two consequences worth stating, because they are the traps:

- **A repo does not copy these files.** A copy drifts, which is the whole reason the ESLint
  and Biome configs are adopted rather than composed. A genuine repo-local need is a
  `[tool.ruff]` table in that repo's own `pyproject.toml` holding only the delta.
- **`clang-format.yml` is deliberately not named `.clang-format`.** `clang-format` walks up
  from each input file looking for a `.clang-format`, so a real one here would silently
  capture any C++ that ever appeared beside it. The workflow passes it with
  `--style=file:<path>`, which takes any name.

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

In CI it is not installed at all. `shared-docs-lint.yml` checks this repo out and runs the
file, because the package is not published (see above):

```yaml
- run: node .charcuterie-lint/packages/ci/src/cli/docsLint.js --base "${{ github.event.pull_request.base.sha }}"
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

## Python and C++ — `shared-native-lint.yml`

Until 2026-09-14 no linter in the fleet read a `.py` or a `.cpp`. ESLint and Biome cover
every `.ts`/`.tsx`, `charcuterie-docs-lint` covers `docs/decisions/`, and those two
languages had nothing.

A repo imports the workflow:

```yaml
# GitHub
nativeLint:
  uses: Sawtaytoes/charcuterie/.github/workflows/shared-native-lint.yml@workflows-v1

# Forgejo — the mirror, twice, for the same reason as the docs lint
nativeLint:
  uses: sawtaytoes/charcuterie/.github/workflows/shared-native-lint.yml@workflows-v1
  with:
    charcuterieRepository: sawtaytoes/charcuterie
    pythonExclude: >-
      device-client/esphome/components/it8951e
      device-client/esphome/components/m5paper
    cppExclude: >-
      device-client/esphome/components/it8951e
      device-client/esphome/components/m5paper
```

| Job | Runs |
| --- | --- |
| `pythonLint` | `ruff check` and `ruff format --check` over the changed `.py`/`.pyi`. |
| `cppLint` | `clang-format --dry-run -Werror` over the changed `.c`/`.cpp`/`.h`/`.hpp`. |

Either job is a no-op when the diff touches none of its files, so a TypeScript-only pull
request costs a checkout and nothing else.

### ⚠️ It reads the diff, not the tree

Same rule as the docs lint, with more force. `agentic` holds 765 `.py` files and
`external/` holds 7780, none of them ever linted. A gate that failed on all of them at once
would be switched off inside a week. A pull request is answerable for the files it touched.

It fails safe by linting **nothing** when it cannot work out a base commit.

### ⚠️ Vendored code must be excluded — and it is not only C++

`castkit`'s `it8951e/` and `m5paper/` components are copied from `ilia-ae/m5paper_esphome`
and patched, and its `PATCHES.md` states every patch as a diff against that upstream.
Running a formatter over them would rewrite every line, destroy that diff, and turn the next
upstream pull into a conflict in every file.

**An ESPHome component is C++ AND Python.** Those two directories hold `display.py` and
`__init__.py` beside the `.cpp` and `.h`, so a consumer usually passes the same prefixes to
`pythonExclude` and `cppExclude` both. This was found by running the gate for real: the
first ruff pass over castkit reformatted both vendored Python files and the diff had to be
reverted.

Only `castkit_display/` is ours — 260 lines. The C++ gate has very little to do today. It
exists so that the next component lands formatted instead of being reformatted later.

### Known gap

Neither tool enforces the `is`/`has` boolean prefix. ESLint does it on the JavaScript side
through `@typescript-eslint/naming-convention`; ruff has no equivalent rule and clang-format
only formats. The rule still binds — it is just not machine-checked in these two languages.
