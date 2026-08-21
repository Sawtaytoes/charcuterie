---
"@charcuterie/eslint-config": minor
---

`createAppConfig` exempts `*.test.tsx` and icon modules from `react/no-multi-comp`.

`createStoryOverrides` already exempted stories and `__fixtures__` — a mandated
`AllVariants` story is a grid of components, which is the whole reason it exists. Two
more shapes turned up the moment real apps ran the preset, and both are the same
argument rather than a new one:

- **`*.test.tsx`** — a component test that needs a wrapper declares the harness beside
  the assertion. `board-game-picker`'s `SelectMenu.test.tsx` mounts an `OutsideHarness`
  to prove a picker remounts when its value changes from outside; the harness *is* the
  test.
- **`icons.tsx` / `*Icons.tsx`** — Charcuterie ships no icons on purpose, so every app
  brings one file of glyphs: 19 in `mail-sifter/components/icons.tsx`, three in
  `board-game-picker/components/schemeIcons.tsx`. Nineteen one-line files would be
  strictly worse, and nobody would write them; the rule would just get switched off.

The list is `MULTI_COMPONENT_FILE_GLOBS`, overridable with `createAppConfig`'s new
`storyFiles`. `createStoryOverrides`' own defaults are unchanged — a hand-composed
config still owns them.
