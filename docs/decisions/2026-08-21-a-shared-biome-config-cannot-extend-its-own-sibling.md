# A shared Biome config cannot extend its own sibling

**Status:** Accepted
**Date:** 2026-08-21
**Type:** Tooling · Bug
**Supersedes:** —
**Superseded by:** —

## Decision

**`@charcuterie/biome-config/app` is a delta, carries no `extends` of its own, and an app
extends both entries in order:**

```jsonc
{
  "extends": [
    "@charcuterie/biome-config",
    "@charcuterie/biome-config/app"
  ]
}
```

The package grows tests — its first — on `@charcuterie/eslint-config`'s pattern: run the
real CLI over real fixtures in a throwaway consumer repo that resolves the package through
`node_modules`, and assert the **composition**, not the rules.

## Context

`app.json` shipped in 1.2.0 carrying `"extends": ["./config.json"]`, on the reasonable
assumption that a config file inside a package can extend its sibling.

**Biome does not resolve a nested `extends` inside an extended config.** A consumer
extending `@charcuterie/biome-config/app` got the picker rules and nothing else — no 60
columns, no `semicolons: "asNeeded"`, no `css.parser.tailwindDirectives`, no
`vcs.useIgnoreFile`. Every one of those silently reverted to Biome's stock default. No
error, no warning, exit code 0 on a clean repo. The first `biome check --write` in an
adopting repo would have reformatted every file in it.

It was found by *running* it. Wiring docket onto the new config, `biome check` failed on
`packages/web/src/styles/tailwind.css` with **"Tailwind-specific syntax is disabled"** — a
`@source` directive the base config's CSS parser handles and Biome's default does not. The
config had looked correct in review, and the picker rules it exists for worked perfectly.

## Why

**The smoke test that "confirmed" inheritance proved nothing.** Before shipping 1.2.0 the
nested extends *was* checked, in a scratch directory: a file containing `const x = 'a';`
came back as `const x = "a";`, which was read as the base config's `quoteStyle: "double"`
arriving. Double quotes are **Biome's own default**. So is `recommended: true`, the other
thing that test observed. The expected value and the default were the same value, and a
test like that cannot fail.

That is the generalisable lesson, and it is not about Biome: **an assertion whose expected
value equals the tool's default is not an assertion.** The fixtures added here are built
the other way round — `houseStyle.js` is formatted correctly under the base and *incorrectly*
under Biome's defaults, so it only comes back clean if the base actually applied; and
`tailwind.css` is a *parse* error without the base, which no formatting comparison could
have been confused about.

**Both entries, rather than a self-contained `app.json`.** Copying the base into `app.json`
would work and would need no second entry, but it puts the house style in two files in one
package, and the next edit updates one of them. The delta cannot drift from what it does
not contain.

**One test pins the file shape, and it is the only one that catches this.** The composition
tests pass whether or not `app.json` also tries to extend the base — `[base, app]` composes
either way — so they would have gone green against the broken 1.2.0 file. What actually
broke was the *instruction*: because `app.json` said it extended the base, the README told
consumers one entry was enough. `expect(appConfig).not.toHaveProperty("extends")` is the
assertion that fails on the shipped shape, and it is there with the reason written next to
it.

## Evidence

The failure, from `docket`'s first run on the new config:

```
packages/web/src/styles/tailwind.css:27:2 parse ━━━━━━━━━━━━━━━━━━━━━

  × Tailwind-specific syntax is disabled.

  > 27 │ @source "../../../../node_modules/@charcuterie/ui/dist";

  i Enable `tailwindDirectives` in the css parser options
```

`css.parser.tailwindDirectives` is set in `config.json` and had been since the package
existed. Reproduced directly afterwards: a fixture formatted under
`extends: ["@charcuterie/biome-config/app"]` came back with a semicolon **added**, which
only Biome's default `semicolons: "always"` does — the base sets `"asNeeded"`.

Related: [the preset this shipped alongside](2026-08-21-the-house-lint-config-is-a-preset-an-app-adopts-not-blocks-it-composes.md).
