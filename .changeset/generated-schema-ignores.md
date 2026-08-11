---
"@charcuterie/eslint-config": minor
"@charcuterie/biome-config": minor
---

Ignore generated API schemas in both shared configs, so an app that commits
`openapi-typescript` output (for `@charcuterie/logic/query`) inherits the
"committed but never linted/formatted" convention without wiring it per repo.

- `@charcuterie/biome-config` adds an `overrides` entry that disables the
  linter, formatter, and assist for `**/*.gen.ts`, `**/*.gen.tsx`, and
  `**/__generated__/**`.
- `@charcuterie/eslint-config` exports `GENERATED_SCHEMA_GLOBS` and
  `createGeneratedIgnores()`, a flat-config `{ ignores }` block to spread in so
  the type-aware pass skips the same paths.
