# Shared Python and C++ lint config lives in `@charcuterie/ci`

- **Status:** Accepted
- **Date:** 2026-09-14
- **Type:** Architecture / tooling
- **Supersedes:** —
- **Superseded by:** —

## Decision

**The fleet's Python and C++ lint configuration lives in `packages/ci/configs/`, and it
reaches a consumer by checkout through a reusable workflow — never as an installed
package, and never as a copy in the consumer repo.**

Three files:

| File | Is |
| --- | --- |
| `packages/ci/configs/ruff.toml` | The shared Python lint and format config. |
| `packages/ci/configs/clang-format.yml` | The shared C++ format config. |
| `.github/workflows/shared-native-lint.yml` | The gate. Jobs `pythonLint` and `cppLint`. |

A consumer imports the workflow by the moving tag `workflows-v1`, the same way it imports
`shared-docs-lint.yml` and `shared-docs-only-changes.yml`.

## Context

The owner asked where this should live, after being told that no linter in the fleet reads
a `.py` or a `.cpp`:

> We need linting on C++ and Python code as well. Not sure where that shared linting code
> needs to live though.

That was true. ESLint and Biome cover every `.ts` and `.tsx` in eight apps. The decision
records have `charcuterie-docs-lint`. Python and C++ had nothing at all, in any repo.

The surface, measured on 2026-09-14 across `/mnt/TrueNAS-Apps/Repos`:

| Language | Where | Size |
| --- | --- | --- |
| Python, ours | `castkit/device-client/`, `queuepilot`, `automatic-projector-lens-memory`, `wyoming-tts-normalizer`, `t3code-container`, `local-ai-automations`, `hardcopy`, `ai-worker`, `app-triage`, and a handful of one-file repos | about 100 files |
| Python, not ours | `external/` | 7780 files |
| Python, workspace | `agentic` | 765 files |
| C++, ours | `castkit/device-client/esphome/components/castkit_display` | 260 lines, 1 file |
| C++, vendored | `castkit`'s `it8951e/` and `m5paper/`, from `ilia-ae/m5paper_esphome` | 877 lines, 5 files |

Two repos, `hardcopy` and `automatic-projector-lens-memory`, already set
`[tool.ruff] line-length = 100` by hand. No repo anywhere has a `.clang-format` except the
vendored `external/ucd3-firmware`.

## Why

**Charcuterie, because it is already the fleet's shared-config home.** `eslint-config`,
`biome-config`, `tsconfig`, `vite-config`, `vitest-config`, `playwright-config`,
`storybook-config` and `ci` are all here. A second home for two more languages would split
the answer to "where is the house style" in half.

**`packages/ci`, not two new packages, because Python and C++ cannot install anything.**
Every other config here is a package a consumer adds to its `package.json`. That works
because the consumer is a Node project. `castkit/device-client/` is plain Python on a
Raspberry Pi with no `package.json` near it, and its ESPHome components are C++ compiled by
`esphome`. Neither can `yarn add`. A config for them has to arrive by checkout — which is
exactly the problem `ci` already solves for `docsLint.js`, and exactly why `ci` is
deliberately unpublished. Adding two package names that nobody could install would buy
nothing.

**It reads the diff, not the tree.** This is not a preference; it is the only version that
survives. `agentic` alone holds 765 unlinted `.py` files. A tree-scoped gate would fail on
every repo it was added to, on its first run, and be switched off within a week — the same
failure the docs lint was designed around.

**Vendored C++ is excluded, and the workflow takes `cppExclude` for it.** `it8951e/` and
`m5paper/` are copied from `ilia-ae/m5paper_esphome`, and `PATCHES.md` states each patch as
a diff against that upstream. Reformatting them would rewrite every line, destroy that
diff, and turn the next upstream pull into a conflict in every file. This is the reason the
C++ gate is format-only rather than `clang-tidy` as well: a tidy run over a vendored tree is
a rewrite, and over 260 lines of our own code it is not worth the build setup.

**`ruff`, because two repos already chose it.** Codifying the convention the fleet arrived
at beats inventing a different one and reformatting both repos. `ruff` is one binary that
replaces flake8, isort, pyupgrade and black, and it is Astral (US), so it clears the
Chinese-origin constraint. `clang-format` is LLVM, installed from the Ubuntu archive.

**`clang-format.yml`, not `.clang-format`.** `clang-format` walks up from each input file
looking for a `.clang-format`, so a real one in this repo would silently capture any C++
that ever appeared beside it. The workflow passes it with `--style=file:<path>`.

**The jobs are `pythonLint` and `cppLint`, never `lint`.** Forgejo posts a status context
for the inner job name as well as the caller's, and five repos here already have a job
called `lint`. Two contexts with one name is a branch protection that cannot be satisfied.

## Evidence

The owner, this chat, after being shown that the M5Paper C++ and the Pi Python had no gate:

> Something to consider going forward. We need linting on C++ and Python code as well.
>
> Not sure where that shared linting code needs to live though.

The config was measured before it was proposed, with `ruff 0.14.5` over the real fleet, so
the number a consumer sees on its first run is known rather than guessed:

| Repo | `ruff check` findings | Auto-fixable |
| --- | --- | --- |
| `castkit/device-client` | 22 | 17 |
| `queuepilot` | 11 | 8 |
| `local-ai-automations` | 8 | 6 |
| `automatic-projector-lens-memory` | 6 | 5 |
| `hardcopy` | 4 | 3 |
| `app-triage` | 4 | 3 |

Two rule groups were removed after that measurement rather than shipped and worked around:

- **`RUF001`/`RUF002`/`RUF003` are off.** They read every en dash and em dash as a typo for
  a hyphen. The house writes both on purpose, including inside error messages —
  `'Touch frame age must be 500–7000ms'` in `castkit`'s `manifest.py` is correct as
  written. The rules target a homoglyph attack, which is not a threat model for a message
  string in a display client.
- **`isort`'s `force-single-line` is off.** It was proposed for parity with the JavaScript
  side, measured at one extra finding out of thirteen, and dropped: it is not idiomatic
  Python, and a house rule that buys nothing is churn.

`E501` is off because `ruff format` owns line length, and a long URL in a comment — which
the formatter cannot break — would otherwise fail the gate forever.

Both workflow files parse, and the job names are distinct from every existing context:
`shared-native-lint.yml` gives `pythonLint` and `cppLint`, against `decisionRecords` from
`shared-docs-lint.yml`.
