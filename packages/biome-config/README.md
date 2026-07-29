# `@charcuterie/biome-config`

The shared Biome settings, extracted verbatim from `mux-magic/biome.json` — the
reference app for every convention in this repo.

```jsonc
// biome.json, in any consumer
{
  "extends": ["@charcuterie/biome-config"],
  "files": { "includes": ["./**", "!**/dist"] }
}
```

The consumer owns `files.includes`, because which paths exist is a property of the
app, not of the house style. Everything else — 60-column lines, two-space indent, LF,
double quotes, semicolons as-needed, trailing commas everywhere, always-parenthesized
arrow params — comes from here.

**Why 60 columns.** It is narrow enough that a function call with three arguments
breaks one-per-line, which is the shape every diff in the fleet already has. Widening
it later reflows every file in every repo at once, so it is set here and left alone.

Biome covers formatting and most linting. The rules it *cannot* express — the ones
needing TypeScript type information or a custom AST query — live in
[`@charcuterie/eslint-config`](../eslint-config/README.md).
