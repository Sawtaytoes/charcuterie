# npm Publishing

Charcuterie publishes **five** packages to npm under the `@charcuterie` scope:

| Package | Notes |
| --- | --- |
| `@charcuterie/tokens` | Zero-dependency design tokens. |
| `@charcuterie/logic` | The five state kinds. |
| `@charcuterie/ui` | Components. Depends on `logic` + `tokens` (`workspace:*`). |
| `@charcuterie/eslint-config` | Shared ESLint rules. |
| `@charcuterie/biome-config` | Shared Biome settings. |

`@charcuterie/docs` (the Storybook host) is `private` and never publishes.

## How releases work

Two workflows, mirroring the mux-magic pattern:

- **[.github/workflows/version-packages.yml](../.github/workflows/version-packages.yml)** —
  on every push to `v2`, [changesets/action](https://github.com/changesets/action) rolls
  all pending changesets into a **"Version Packages" PR** that bumps versions and writes
  each package's `CHANGELOG.md`. It **never publishes**.
- **[.github/workflows/npm-package-deploy.yml](../.github/workflows/npm-package-deploy.yml)** —
  on push to `v2`, publishes each package **only when its version was bumped** —
  concretely, when no `<pkg>-v<version>` git tag exists yet (`tokens-v0.1.0`,
  `ui-v0.1.0`, …). On a successful publish it pushes that tag, so later runs skip cleanly.
  (It triggers on push rather than `workflow_run` after CI because `workflow_run` only
  fires for workflows on the repo's default branch, which is still `master`/v1. When `v2`
  merges down to `master`, retarget this and the other workflows to `master`.)

There is **no auto-bump of the source**. Bumping happens by **merging the Version Packages
PR**; CI never edits `package.json`. It only pushes the lightweight `<pkg>-v<version>` tags.

### The `workspace:*` rewrite — why `yarn pack`, not `npm publish` from the dir

`@charcuterie/ui` depends on `logic` + `tokens` as `workspace:*`. **`npm pack`/`npm publish`
from the package directory leaves `workspace:*` verbatim** — a broken, uninstallable
manifest. **`yarn pack` rewrites it** to the sibling's concrete version. So the deploy job
builds each tarball with `yarn workspace <name> pack` and then hands that tarball to
`npm publish --provenance` — yarn for the correct manifest, npm for OIDC + provenance.
(mux-magic never hit this because it ships a single package.)

### Authentication — OIDC trusted publishing

Steady-state publishing authenticates via npm **OIDC trusted publishing** (`--provenance` +
`id-token: write`). **There is no npm token secret to manage.** This requires a one-time
per-package setup in the npm UI (below).

## First-time setup (the chicken-and-egg, done once)

npm's **Trusted Publisher** panel lives on a *package's* Settings tab, which only exists
**after the package has been published at least once**. So the very first publish cannot use
OIDC. The bootstrap:

1. **Bootstrap publish `0.1.0`** of all five packages using a temporary npm **automation
   token** (granular, scoped to publish). This first version does **not** carry provenance.
2. For **each** of the five packages, open its **Settings → Trusted Publisher** on npmjs.com
   and add:
   - **Repository:** `Sawtaytoes/charcuterie`
   - **Workflow filename:** `npm-package-deploy.yml`
   - **Environment:** *(blank)*
3. Revoke the bootstrap token. From here on, every release publishes automatically with
   provenance via OIDC — no token.

## Releasing a new version

1. Make your change and add a changeset: `yarn changeset` (pick the packages + bump level).
   Commit the generated `.changeset/*.md` with your change.
2. Merge to `master`. The **Version Packages** PR appears.
3. Merge the Version Packages PR. CI runs, then **NPM Package Deploy** publishes each bumped
   package with provenance and pushes its `<pkg>-v<version>` tag.

If you change a package but no version was bumped, nothing publishes — the existing tag makes
the deploy skip.

## Troubleshooting

### `404 Not Found - PUT` on a package that plainly exists

**This is an authentication failure, not a missing package.** npm returns 404 rather than
403 so it does not leak which packages exist. Seeing it means the OIDC trusted-publishing
exchange failed and npm fell back to the credential in `.npmrc` — which, in Actions, is
`setup-node`'s placeholder `_authToken` (`XXXXX-XXXXX-XXXXX-XXXXX`, visible in the step env
of *every* run, including successful ones). That placeholder is normal and is **not** the
bug; mux-magic publishes over OIDC with it present.

The console output alone cannot distinguish this from any other 404. The deploy therefore
dumps npm's **debug log** on failure — it records at verbose level regardless of console
loglevel, and is the only place the exchange result appears. Grep the failed run for
`verbose oidc`:

```
npm http fetch GET  …/idtoken?…&audience=npm%3Aregistry.npmjs.org   200   ← GitHub side OK
npm http fetch POST 404 …/-/npm/v1/oidc/token/exchange/package/@charcuterie%2ftokens
npm verbose oidc Failed token exchange request with body message:
    OIDC token exchange error - package not found
```

A **200 on the `idtoken` GET and a 404 on the `exchange` POST** localises the fault
precisely: the workflow, its `id-token: write` permission, the audience, and the package
name are all correct, and npm's registry is refusing to mint a publish token. That is a
**server-side trusted-publisher mismatch**, fixable only in npm's UI — nothing in this repo
will change it. Re-check the package's **Settings → Trusted Publisher** against the exact
values in *First-time setup* above, including the owner's capitalisation
(`Sawtaytoes`, as GitHub's OIDC `repository` claim spells it), and that **Environment is
blank** — the job declares no `environment:`, so a value there can never match. Deleting
and re-adding the entry is the reliable fix. Then re-run **NPM Package Deploy** via
`workflow_dispatch`; publishing is idempotent, so a re-run is always safe.

### What is *not* the cause

Each of these was ruled out by experiment on 2026-07-31, most of them costing a run. The
control throughout is **`@mux-magic/tools`**, which publishes over OIDC successfully — a
scoped package, already published, publishing a *second* version, from the same account.
Everything below is byte-identical between it and charcuterie:

| Ruled out | How |
| --- | --- |
| The placeholder `_authToken` | mux-magic's real `tools@1.3.0` publish has the same `NODE_AUTH_TOKEN: XXXXX-XXXXX-XXXXX-XXXXX` in its step env, no repo secret, and no `.npmrc`. ([actions/setup-node#1551](https://github.com/actions/setup-node/issues/1551) describes a *different* failure — there npm never reaches the exchange; our log shows the POST being made.) |
| The publish CWD | npm takes package identity from the publish spec, not the directory. Publishing from the repo root and from `packages/<pkg>` fail identically. |
| Tarball vs directory spec | Both fail. The unpack-then-publish-directory form is kept only because it matches the working control. |
| npm / Node version | **11.16.0 / v24.18.0 in both** the working mux-magic publish and the failing one. Pinning npm cannot help. |
| `repository.url` | npm warned it had normalized `https://…` → `git+https://…`, and the docs require an exact match, so all six manifests were canonicalised. The warning went away; **the exchange 404 did not.** |
| GitHub-side config | No repository secret is needed or wanted — an empty *Settings → Secrets and variables → Actions* page is the correct state for trusted publishing. `id-token: write` is granted, the workflow is at `.github/workflows/npm-package-deploy.yml`, and the runner is GitHub-hosted. |

### What is left

The fault is in **npm's per-package Trusted Publisher record**, and there are two candidates:

1. **Case sensitivity.** npm's docs state *"All fields are case-sensitive."* GitHub's OIDC
   `repository` claim spells the owner **`Sawtaytoes`**; the npm panel has been seen showing
   **`sawtaytoes`**. Delete the entry and re-add it with the exact casing.
2. **An upstream npm bug.** [npm/cli#8678](https://github.com/npm/cli/issues/8678) reports
   this exact signature — a **scoped** package that already exists, publishing a second
   version, `POST …/oidc/token/exchange/package/@scope%2fname` → 404
   *"OIDC token exchange error - package not found"*, while a plain `GET` of the same
   package succeeds. No workaround is documented there.

If neither resolves it, the unblock is a **granular automation token** as an `NPM_TOKEN`
repository secret mapped to `NODE_AUTH_TOKEN` — the same mechanism used for the `0.1.0`
bootstrap. **Provenance survives** (it comes from `id-token: write`, not from how the
registry authenticates); what is lost is the "no token to manage" property, so revert to
OIDC once npm resolves it.

## Verifying

- `yarn info @charcuterie/ui` (etc.) shows the latest version after publish completes.
- New tags appear: `git ls-remote --tags origin '*-v*'`.
- Each package page on npmjs.com shows a **Provenance** panel (from the second release on).
