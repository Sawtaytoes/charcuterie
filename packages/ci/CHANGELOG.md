# @charcuterie/ci

## 0.3.0

### Minor Changes

- 5184a63: `charcuterie-requirements` now hashes whole files, found through esbuild's import graph,
  instead of resolving imports by hand and hashing single declarations. The lock moves to
  version 2: files every scenario loads are listed once under `shared`, and each
  requirement lists only the files its step files add. Adding a component no longer marks
  existing requirements as changed. The `packages` config field is gone, because workspace
  packages are followed through `node_modules`. The `quickpickle` hook ban and the glob,
  JSX pragma, and `import()` rules now apply to every loaded file. `which` prints the
  helpers a definition calls and the files its step file loads. A version 1 lock on the base
  branch is still read by `diff`. Run `charcuterie-requirements lock` once to upgrade.

### Patch Changes

- c3f3266: `charcuterie-requirements` skips files git ignores, such as a workspace package's `dist`
  build, so a checkout that ran `pnpm build` no longer reports a stale lock. It rejects
  `new Worker()` without an inline `new URL(…, import.meta.url)` script, unless `Worker` is
  a `?worker` import, and treats a CSS `url()` as an asset whatever its query.
- 2d36814: The requirements checker reports a `package.json` that is valid JSON but not an object, such as `null`, as `malformed-json` instead of crashing. It reports malformed JSON that any `export *` names, even when the name is found first. A local `export { type name }`, or an `export { name }` of an interface or a type alias, no longer hides the runtime value that an `export *` in the same file supplies. The lock missed that value's code before.
- 862735f: `shared-docs-only-changes.yml` and `shared-docs-lint.yml` take an optional `runsOn` input, a JSON list of runner labels. The default stays `["ubuntu-latest"]`, so current callers are unchanged. A repo with its own runner lane can now keep these jobs off the shared runner.
- 32cdc4f: The VRT baseline preflight no longer fails when another branch is stacked on a pull request's branch. The Git plugin then picks the commit where the stacked branch forks off. That commit is on the pull request but not on the base branch. The selector now ignores it and uses the pull request's base, as it does when the plugin finds no branch point.

## 0.2.0

### Minor Changes

- 1711ab0: Add `charcuterie-requirements`, a static checker for Gherkin requirements. It replaces `gherkin-lint`. It parses features with the same parser QuickPickle uses and reads step definitions from TypeScript source without running them. It fails on undefined, ambiguous, unused, and mis-keyworded steps, unused helpers, runner tags such as `@skip` and `@fails`, missing or reused requirement IDs, and a second `Examples` table. Its `requirements.lock.json` records the code behind every requirement, so a weakened assertion is reported as a requirement change. `which` traces a feature line to its definition and every file it reaches.

### Patch Changes

- 3e8238d: The requirements checker now follows a named re-export ahead of an `export *`, ignores
  `export declare`, reports a re-export chain deeper than eight files, rejects a directory
  import whose directory has a `package.json`, and requires each step definition's code to be
  an inline function.
- 41d5384: The requirements checker now hashes a JSON file whose top-level key an `export *` supplies, and falls back to any other non-code file an `export *` names when nothing else supplies the name.
- 1bee054: The requirements checker reports malformed JSON, a workspace `package.json` included, as `malformed-json` instead of crashing. It reads JSON files that start with a byte-order mark, as Vite does. A re-export chain past eight hops that ends in a CSS `export *` now fails as `reexport-too-deep`.

## 0.1.12

### Patch Changes

- 66f9993: Treat the decision topic index as an index, so editing it does not fail decision-record lint.

## 0.1.11

### Patch Changes

- 3c520c6: Bound the shared VRT workflow's tool cache. The job's last step removes Playwright browsers that no installed package needs, and renews the pnpm store once it is 7 days old or over 4 GiB. Playwright's own browser cleanup is turned off for the job, because it ran after `git clean` and deleted the repo's browser, so a capture that installs its own browser downloaded it again on every run.

## 0.1.10

### Patch Changes

- 7df6ba9: Resolve the shared Python and C++ lint's changed files from the original pull-request or push event, so a Forgejo pull request lints its own files instead of nothing, and diff from the merge base so files the base branch added later are not linted.

## 0.1.9

### Patch Changes

- 61a9428: The standalone VRT tools now install glob 14.0.4 and minimatch 11.0.5, which fix GHSA-3g3m-2fjr-6pw4 and GHSA-g3hv-75wg-m249. reg-suit's rimraf previously pulled in glob 10.5.0 and minimatch 9.0.9.

## 0.1.8

### Patch Changes

- 33891c2: Check the pinned pnpm version from the shared VRT tools' directory instead of the caller's checkout. pnpm 12 refuses to run in a project whose `packageManager` names another manager, so every Yarn caller's `vrt` job failed with `ERR_PNPM_OTHER_PM_EXPECTED` before it installed anything.

## 0.1.7

### Patch Changes

- 2d07d8e: Leave a first run's null baseline key out of the reg-suit config. reg-suit's placeholder expansion throws on a `null`, so every new repository's first `vrt` job failed with "Cannot convert undefined or null to object" before comparing anything.

## 0.1.6

### Patch Changes

- 31fb0ef: Keep VRT baselines on the branch a change lands on — a pull request's base branch, else the pushed branch, else the default — so pull requests into a long-lived non-default branch reach the comparison again, and read a first-parent history over 25,600 commits without `spawnSync git ENOBUFS`.

## 0.1.5

### Patch Changes

- 9a916ba: Select a reviewed default-branch predecessor when the Git plugin chooses a merged feature parent, while preserving older default-branch bases and rejecting feature snapshots as baselines.

## 0.1.4

### Patch Changes

- 4630c1e: Compare visual snapshots against the nearest complete published ancestor of the reviewed Git baseline, including across documentation-only merges. Stop before capture on storage or metadata errors instead of silently losing comparison coverage.

## 0.1.3

### Patch Changes

- 1028c86: Resolve reusable-workflow diffs from the original pull-request or push event so documentation changes avoid duplicate full-suite work and lint the complete changed decision range.

## 0.1.2

### Patch Changes

- 060ab4e: Allow only pnpm's global bootstrap scripts and prefer its native executable over legacy Corepack shims in CI and fleet Docker base images.

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
