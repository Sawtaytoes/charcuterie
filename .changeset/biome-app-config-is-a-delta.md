---
"@charcuterie/biome-config": minor
---

`@charcuterie/biome-config/app` is a delta, and an app extends both entries.

```jsonc
{
  "extends": [
    "@charcuterie/biome-config",
    "@charcuterie/biome-config/app"
  ]
}
```

**Fixes 1.2.0, which was silently broken.** `app.json` shipped carrying
`"extends": ["./config.json"]`, on the assumption that a package's config can extend
its sibling. Biome does not resolve a nested `extends` inside an extended config, so a
consumer on `/app` alone got the picker rules and **lost the entire house style** — 60
columns, no semicolons, the Tailwind CSS parser, the VCS ignore file — with no error at
all. The first `biome check --write` would have reformatted the repo to Biome's stock
defaults.

The rules are unchanged. `app.json` now carries no `extends`, and the package grows a
test suite that runs the real CLI over real fixtures and asserts every base setting
survives the second entry — plus one that pins `app.json` as a delta, which is the
assertion that fails on the 1.2.0 shape.
