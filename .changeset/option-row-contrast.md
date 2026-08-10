---
"@charcuterie/tokens": minor
"@charcuterie/ui": patch
---

Strengthen `content.muted` so the highlighted option row clears AA — and derive the audit's
role lists from their unions instead of typing them out.

[#72](https://github.com/Sawtaytoes/charcuterie/pull/72) closed the interactive-state hole
and recorded one it could not fix from a hover token: `content.muted` on
`intent.neutral.surfaceHover` — the highlighted row in `Listbox`, `Combobox` and `Menu` —
failing AA in four of eight variant/scheme combinations.

Extending the gate structurally rather than adding that one pair found **12 failures, not
4**. The **selected** row (`intent.accent.surface`) fails too, and `content.muted` on
**`surface.sunken`** fails at rest in `hairline`/light at **4.34:1** — a plain,
non-interactive surface that had been failing since M0 and that nobody had seen, because the
audit's surfaces block hand-listed `["base", "raised", "overlay"]`.

Across all six intents, both tint states and all eight combinations, **every failing pair is
`content.muted`**; `content.primary` and `content.secondary` clear everywhere with no
change. That is a weak foreground — not a wrong background, and not a misclassified label
(`ListboxOption` and `ComboboxOption` already paint their labels `text-content-primary`). So
`content.muted` moves in six of eight combinations:

| Variant / scheme | Before | After | Worst pair, before → after |
| --- | --- | --- | --- |
| daylight / light | `#616A7C` | `#565E6D` | 4.00 → 4.80 |
| daylight / dark | `#8B94A5` | `#99A1B0` | 4.11 → 4.83 |
| hairline / light | `#686D74` | `#5D6168` | 4.04 → 4.82 |
| hairline / dark | `#838991` | `#8E949B` | 4.20 → 4.84 |
| layered / light | `#676274` | `#605B6C` | 4.31 → 4.80 |
| layered / dark | `#9A95AB` | `#9B96AB` | 4.76 → 4.81 |
| legible / both | — | **unchanged** | already 4.93 / 5.50 |

The bar is **4.8:1, and it is derived rather than invented**: `legible` — the variant that
exists to be legible — already clears 4.8 on every one of these pairs untouched. Nothing
lands on 4.50, which is where `hairline`'s dark `danger.solid` sits and is exactly how a
pair silently re-breaks on a later rounding change.

**No tint moves.** Option rows still highlight with `intent-neutral-surface-hover` exactly
as settled on 2026-08-05.

New exports `CONTENT_ROLE_AUDIT`, `SURFACE_ROLE_CARRIES_CONTENT`,
`INTENT_TINT_CARRIES_PLAIN_CONTENT` and `INTENT_ROLE_IS_TINT_BACKGROUND`, each keyed by its
whole role union: a new content role, surface role or intent is a typecheck error until
classified, and a test failure until `auditScheme` measures it. **48 gated pairs per scheme
becomes 63.**

`@charcuterie/ui` gains an axe assertion on a *highlighted* rich option row.
`Listbox.test.tsx` never mounted `AllVariants` — the only story with `text-content-muted`
inside a row — so the failing pair had no axe coverage in any state. The new test asserts
the row is actually filled before trusting axe, and fails with `color-contrast (serious)` in
real chromium on the old token values.

**Consumers will see fine print get more legible** wherever `content.muted` is used, in
`daylight`, `hairline` and `layered`. The primary > secondary > muted ramp still separates in
every variant and scheme. `legible` and ePaper are untouched. See
`docs/decisions/2026-08-10-content-muted-is-strengthened-so-the-highlighted-option-row-clears-aa.md`.
