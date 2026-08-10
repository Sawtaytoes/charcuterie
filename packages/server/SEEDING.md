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

## 1. Get the version to 0.1.0

The seed publishes `0.1.0`, not the `0.0.0` in the working tree. Merge this
branch, let **Version Packages** open its PR, and merge that — it consumes the
changeset, writes `CHANGELOG.md`, and bumps `package.json` to `0.1.0`. The
deploy job that follows will try `server` and fail at the last step; that is
expected and harmless, and step 2 is the fix.

(Seeding a hand-set `0.1.0` before merging also works, but then the Version PR
bumps to `0.2.0` and the `0.1.0` changelog entry never exists.)

## 2. Seed it (needs an npm automation token)

From a checkout of master at `0.1.0`:

```bash
yarn install
yarn workspace @charcuterie/server pack -o /tmp/server.tgz
mkdir -p /tmp/server-seed && tar -xzf /tmp/server.tgz -C /tmp/server-seed

export NPM_TOKEN=<npm automation token with publish rights on @charcuterie>
cd /tmp/server-seed/package
npm publish --provenance=false --access public \
  //registry.npmjs.org/:_authToken=$NPM_TOKEN
```

- `yarn pack`, not `npm pack`: only yarn rewrites `workspace:*` deps into real
  ranges. This package has none today (its deps are all peers), but the deploy
  workflow packs this way and the seed should match it rather than diverge.
- `--provenance=false` for the manual seed — provenance needs the OIDC exchange,
  which only the Actions runner has.
- **Rotate the token afterwards.** A token with publish rights on the whole
  `@charcuterie` scope is worth more than the one release it was minted for.

Then tag it so the deploy loop skips `0.1.0` cleanly:

```bash
git tag server-v0.1.0
git push origin server-v0.1.0
```

## 3. Configure OIDC trusted publishing

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
