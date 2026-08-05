# Seeding @charcuterie/storybook-config to npm

This package's **first** publish is manual. Every other `@charcuterie/*`
package is published by `.github/workflows/npm-package-deploy.yml` over **OIDC
trusted publishing** (no npm token secret) — but npm will not let you configure
a trusted publisher for a package that does not exist yet. So the name has to be
claimed and version `0.1.0` pushed by hand, once; after that the normal
changeset → Version PR → CI → deploy flow takes over like the other five
packages.

## One-time seed (needs an npm automation token)

From a checkout with the built `dist` present:

```bash
cd packages/storybook-config
yarn build                     # dist/ must exist in the tarball

# Ephemeral, gitignored auth — never commit this.
export NPM_TOKEN=<npm automation token with publish rights on @charcuterie>
npm publish --provenance=false --access public \
  //registry.npmjs.org/:_authToken=$NPM_TOKEN
```

Notes:

- `--provenance=false` for the **manual** seed: provenance requires the OIDC
  exchange, which only the GitHub Actions runner has. The automated releases
  that follow publish `--provenance` like the rest of the fleet.
- Use `yarn pack` semantics if `@charcuterie/tokens` is still `workspace:*` in
  this package's `dependencies` at publish time — `npm publish` leaves
  `workspace:*` verbatim, `yarn pack` rewrites it to a real range. The deploy
  workflow already does this (unpacks a `yarn pack` tarball and publishes the
  directory); for the manual seed, run `yarn pack -o /tmp/sbc.tgz`, `tar -xzf`
  it, and `npm publish` the extracted `package/` directory.

## After the seed

1. **Tag it** so the deploy loop treats 0.1.0 as already released and skips it:

   ```bash
   git tag storybook-config-v0.1.0
   git push origin storybook-config-v0.1.0
   ```

2. **Configure OIDC trusted publishing** for `@charcuterie/storybook-config` in
   npm's web UI (Package → Settings → Publishing access → Trusted publisher),
   pointing at `Sawtaytoes/charcuterie`, workflow `npm-package-deploy.yml`. This
   is the step no CLI/token can do, and it must be in place **before** the next
   version bump — otherwise the deploy workflow's OIDC publish of the new
   version 404s (npm's mask for an unconfigured trusted publisher) and fails the
   whole publish loop.

3. From then on: a changeset bumps the version via the Version PR, CI goes
   green, and `npm-package-deploy.yml` publishes the new version automatically.

## Why 0.1.0 and not 1.0.0

Brand-new shared API that four consumers will shake out. Pre-1.0 signals it may
move; `@charcuterie/eslint-config` and `biome-config` earned their `1.0.0` the
same way.
