---
"@charcuterie/eslint-config": minor
"@charcuterie/biome-config": minor
---

An app repo's lint setup is now one import and one `extends`.

`createAppConfig({ tsconfigRootDir })` composes the whole house ESLint config —
ignores, type-aware rules, React, logical properties, the picker rules, story and
test overrides — scoped off `@charcuterie/ui` by an `appDirectories` list rather than
by hand-written globs. The per-`files` factories are unchanged and still exported;
the preset is built out of them.

`createPickerRules()` names the settled component-choice subset (`no-raw-select`,
`prefer-listbox-over-select`, `require-suppression-reason`), which four repos were
each hand-registering. It is the preset's default; the other five rules stay behind
`componentChoice: "all"` and the flex family stays behind `flexOverflow`.

`@charcuterie/biome-config/app` is the Biome half: the base config plus the same
picker ban expressed as `noRestrictedElements` and `noRestrictedImports`, so a repo
that lints with Biome alone can enforce it without adopting a second linter. The base
export is unchanged and stays style-only — `@charcuterie/ui` extends it and renders a
raw `<select>` on purpose.

`typescript-eslint` moves from a peer dependency to a real one, so adopting the
config is `yarn add --dev @charcuterie/eslint-config eslint`.
