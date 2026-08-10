# Seeding @charcuterie/server to npm

This package's **first** publish is manual, for the same reason
[`@charcuterie/storybook-config`](../storybook-config/SEEDING.md)'s was: every
other `@charcuterie/*` package is published by
`.github/workflows/npm-package-deploy.yml` over **OIDC trusted publishing** (no
npm token secret), and npm will not let you configure a trusted publisher for a
package that does not exist yet. Claim the name and push `0.1.0` by hand once;
after that the normal changeset → Version PR → CI → deploy flow takes over.

## Order matters

`server` is last in the deploy loop's package list precisely because it is
unseeded. The loop runs under `set -euo pipefail`, so a failure there aborts the
rest — last position means an unseeded package costs only itself instead of
blocking `tokens`/`logic`/`ui`.

Do these in order. Skipping step 3 before the next version bump breaks the
publish job for the whole fleet.

## 1. Get the version to 0.1.0 — done

The seed publishes `0.1.0`, not the `0.0.0` that was in the working tree. #67
merged, **Version Packages** rolled the changeset into its PR (#66), and that
branch carries `packages/server/package.json` at `0.1.0` plus the generated
`CHANGELOG.md`.

The seed was taken from the **release branch** (`changeset-release/master`,
`24d09ef`) rather than from master, so that `server-v0.1.0` could be tagged
*before* #66 merges. That ordering is the point: the deploy loop skips any
package whose `<pkg>-v<version>` tag already exists, so seeding first turns what
would have been a guaranteed red release run — OIDC 404 on an unseeded package —
into a clean skip.

## 2. Seed it (needs an npm automation token)

> **Done for `@charcuterie/server@0.1.0` on 2026-08-10.** What follows is the
> transcript of what actually worked, kept for the next package's first publish.

From a checkout at the version you are seeding:

```bash
yarn install

# `publishConfig.provenance` WINS over the CLI flag — remove it first.
# Do this in a throwaway/detached checkout and never commit it.
#   packages/<pkg>/package.json → delete `"provenance": true`

YARN_NPM_AUTH_TOKEN=<npm automation token> \
  yarn workspace @charcuterie/<pkg> npm publish --access public
```

- **`yarn npm publish`, not `npm publish`.** yarn packs and publishes in one
  step, and only yarn rewrites `workspace:*` deps into real ranges.
- **The provenance field is the trap.** `publishConfig.provenance: true` is what
  the automated OIDC releases need, and it takes precedence over both
  `--no-provenance` and `YARN_NPM_CONFIG_PROVENANCE` (the latter is not even a
  recognised setting in Yarn 4.14 — it errors). yarn fails with
  `YN0091: Provenance generation is only supported in GitHub Actions and
  GitLab CI` until the field is gone. Temporarily deleting it from the manifest
  is the only thing that works, and it must go straight back afterwards or every
  later automated release loses provenance.
- **Rotate the token afterwards.** A token with publish rights on the whole
  `@charcuterie` scope is worth more than the one release it was minted for.

Then tag it so the deploy loop skips that version cleanly — **before** merging
the Version PR, or the loop reaches an unseeded package and fails:

```bash
git tag server-v0.1.0 24d09ef   # done: pushed 2026-08-10
git push origin server-v0.1.0
```

## 3. Configure OIDC trusted publishing — outstanding

In npm's web UI: **Package → Settings → Publishing access → Trusted publisher**,
pointing at `Sawtaytoes/charcuterie`, workflow `npm-package-deploy.yml`.

This is the step no CLI or token can do, and it must be in place **before** the
next version bump. Otherwise the deploy workflow's OIDC publish 404s — npm's
mask for an unconfigured trusted publisher — and, because `server` is last in
the loop, that failure is the job's exit code even though everything else
published.

## Why 0.1.0 and not 1.0.0

Brand-new shared API with six consumers still to migrate onto it. Pre-1.0
signals it may move; `eslint-config` and `biome-config` earned their `1.0.0` the
same way.
