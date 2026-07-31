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
  after CI succeeds on `v2`, publishes each package **only when its version was bumped** —
  concretely, when no `<pkg>-v<version>` git tag exists yet (`tokens-v0.1.0`,
  `ui-v0.1.0`, …). On a successful publish it pushes that tag, so later runs skip cleanly.

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
2. Merge to `v2`. The **Version Packages** PR appears.
3. Merge the Version Packages PR. CI runs, then **NPM Package Deploy** publishes each bumped
   package with provenance and pushes its `<pkg>-v<version>` tag.

If you change a package but no version was bumped, nothing publishes — the existing tag makes
the deploy skip.

## Verifying

- `yarn info @charcuterie/ui` (etc.) shows the latest version after publish completes.
- New tags appear: `git ls-remote --tags origin '*-v*'`.
- Each package page on npmjs.com shows a **Provenance** panel (from the second release on).
