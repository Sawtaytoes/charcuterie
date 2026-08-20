---
"@charcuterie/tokens": minor
"@charcuterie/ui": minor
---

A numbered, non-semantic colour family: `--color-categorical-1…10-<role>`, and `Badge` takes it

Every member of `intent` **means** something — `danger` is not a colour, it is a claim
about what happens if you press the thing — which is exactly right for a status pill and a
lie when the colour was chosen by a user. Docket's labels and projects are user-coloured, and
a "Homelab" label is not a `danger`.

So there is a second family, numbered because there is nothing to name:

```tsx
<Badge categorical={4}>Homelab</Badge>
```

Ten indexes, each with the same seven roles an intent has (`surface`, `surfaceHover`,
`border`, `content`, `solid`, `solidHover`, `onSolid`), in **all four variants and both
schemes**, published as Tailwind utilities (`bg-categorical-4-surface`,
`text-categorical-4-content`, …) exactly as the intents are.

`intent` and `categorical` are **mutually exclusive in the type**. A badge is one colour,
and `<Badge intent="danger" categorical={3}>` is a question with no answer rather than a
precedence rule to remember. Everything else about `Badge` — `appearance`, `size`,
`overflow`, the clipped-text `title` readout — is unchanged.

**Gated twice.** Every categorical pair joins `contrastAudit.ts` alongside the intents
(`content` on `surface` and `onSolid` on `solid` at 4.5:1; `border` at 3:1, and unlike an
intent border it is **not** exempt, because a categorical pill's colour is the only thing
identifying it). 63 gated pairs per scheme becomes 113, all passing.

The second gate is the one a contrast audit structurally cannot be: two indexes can both
clear 4.5:1 against the same surface and be *the same colour as each other*, with every
number on the board green. `getCategoricalDistinctnessFailures` measures every pair against
every other in OKLab. The tightest `solid` pair in the whole fleet is **ΔEok 0.0893**, which
clears the **0.0835** that Tableau 10 achieves for itself.

**New in `@charcuterie/tokens`:**

- `CATEGORICAL_INDEXES`, `CategoricalIndex`, `CategoricalRole`, `CATEGORICAL_HUES` (each
  index has a `label` — a picker showing ten dots owes each of them a name).
- `buildCategoricalScheme` and `CategoricalTuning`, so a variant states its *character* and
  never a hex.
- `getCategoricalDistinctnessFailures`, `CATEGORICAL_PAIRS`,
  `CATEGORICAL_ADJACENT_PAIRS`, `CATEGORICAL_DISTINCTNESS_FLOOR`.
- `getCategoricalIndex(key)` — a pure, stable string → index hash, so rows that predate the
  feature get colours with no migration and no `Math.random()` handing the same label a
  different colour on every reload. A **fallback**, never an override:

  ```tsx
  <Badge categorical={label.categorical ?? getCategoricalIndex(label.id)}>
    {label.name}
  </Badge>
  ```

- `toHex`, `toGamut`, `getColourDistance`, `OkLch`, `OkLab` — OKLab/OKLCh, zero-dependency,
  which is what the family is generated in.

**New in `@charcuterie/ui`:** `CATEGORICAL_APPEARANCE_CLASS`, `CATEGORICAL_HOVER_CLASS`,
`CATEGORICAL_SOLID_FILL_CLASS`, `CATEGORICAL_CONTENT_CLASS` — the twins of the `INTENT_*`
maps, every class name written out in full for the reason `intentStyles.ts` gives.

Additive throughout: no existing token, prop or class changes value. On ePaper all ten
indexes collapse to black on purpose — four chromatic inks cannot carry ten of anything, and
round-robin would make index 1 and index 6 identical.
