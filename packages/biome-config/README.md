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

## `@charcuterie/biome-config/app` — the house rules an app also gets

The base config above is deliberately house *style* only: it is what
`@charcuterie/ui` itself extends, and the library renders a raw `<select>` because
rendering one correctly **is** the library.

An app is not the library, so an app extends `/app` instead:

```jsonc
// biome.json, in any app repo
{
  "extends": ["@charcuterie/biome-config/app"],
  "files": { "includes": ["./**", "!**/dist"] }
}
```

That adds everything in the base plus the fleet's picker rule, expressed natively:

| Rule | Fires on | Reach for instead |
| --- | --- | --- |
| `correctness/noRestrictedElements` | `<select>` | `Picker`, `Listbox`, or `Combobox` |
| `correctness/noRestrictedElements` | `<Select>` | `Picker` — the drop-in, same props |
| `style/noRestrictedImports` | `import { Select } from "@charcuterie/ui"` | `Picker` |

**Why this is here and not only in ESLint.** `charcuterie/no-raw-select` and
`charcuterie/prefer-listbox-over-select` are ESLint rules, and a repo that lints with
Biome alone had no way to get them — queuepilot's option was "adopt a second linter
for two rules", which is not an option anybody takes. `noRestrictedElements` matches
JSX components as well as HTML elements, so the same two mistakes are catchable
without one. A repo running both linters gets the rule twice and the same message
twice, which is noise rather than a problem; a repo running either gets it once.

**Where the two differ**, and it is worth knowing which you have: the ESLint rules
carry `charcuterie/require-suppression-reason`, so an `eslint-disable` that names
them owes a `-- why` on the same line. Biome's `// biome-ignore` syntax already
requires an explanation, so the Biome path gets that for free from the tool.

Biome covers formatting and most linting. The rules it *cannot* express — the ones
needing TypeScript type information or a custom AST query — live in
[`@charcuterie/eslint-config`](../eslint-config/README.md), whose
`createAppConfig()` is the ESLint half of the same one-line adoption.
