# `content.muted` is strengthened so the highlighted option row clears AA

- **Status:** Accepted
- **Date:** 2026-08-10
- **Type:** Token value + process
- **Supersedes:** —
- **Superseded by:** —

## Decision

**`content.muted` moves in six of the eight (variant × scheme) combinations** — darker in
light schemes, lighter in dark — so that it clears **4.5:1 with margin on every background
it is drawn on**, including the intent tints that paint an option row. `legible` is
untouched in both schemes, and ePaper is untouched because it is
[exempt from this gate entirely](2026-07-31-epaper-is-exempt-from-the-contrast-gate.md).

**The bar is 4.8:1, and it is not invented.** `legible` — the variant that exists to be
legible — already clears 4.8 on every one of these pairs with no change at all (worst 4.93
light, 5.50 dark). So 4.8 is a description of what the design language already does at its
most careful, and every moved value lands on it or above rather than on 4.50, which is
where `hairline`'s dark `danger.solid` sits today and is exactly how a pair silently
re-breaks on a later rounding change.

**The highlight mechanism does not change.** Option rows still carry no base
`bg-transparent` and still highlight with `intent-neutral-surface-hover`, exactly as
[the 2026-08-05 record settled](2026-08-05-option-rows-carry-no-base-bg-transparent-and-highlight-with-surface-hover.md).
Nothing here overturns it, and no `surfaceHover` or `surface` tint moves.

**Every list of roles in `contrastAudit.ts` is now derived from its role union, never
typed out.** Three new maps — `CONTENT_ROLE_AUDIT` (keyed by `ContentRole`),
`SURFACE_ROLE_CARRIES_CONTENT` (keyed by `SurfaceRole`) and
`INTENT_TINT_CARRIES_PLAIN_CONTENT` + `INTENT_ROLE_IS_TINT_BACKGROUND` (keyed by
`IntentName` / `IntentRole`) — mean a new content role, surface role or intent cannot be
added without classifying it, and `contrast.test.ts` fails until `auditScheme` measures it.
**48 gated pairs per scheme becomes 63.**

## Context

[PR #72](2026-08-10-interactive-states-are-audited-not-just-resting-states.md) closed the
interactive-state hole and deliberately left one open, recording it rather than papering
over it: `content.muted` on `intent.neutral.surfaceHover` — the highlighted row in
`Listbox`, `Combobox` and `Menu` — failing in four of eight combinations. That record is
the reason this change exists, and it named the failure precisely.

It understated it. Extending the gate structurally rather than adding the one named pair
turned up **12 failures on the unfixed tokens, not 4**:

- `content.muted` on `intent.accent.surface` — the **selected** row — fails too
  (daylight/light 4.48, hairline/light 4.38). So it was never only a hover problem, and
  never only the neutral tint.
- `content.muted` on `intent.accent.surfaceHover` fails in three combinations.
- `content.muted` on **`surface.sunken`** fails at rest in hairline/light at **4.34** — a
  plain, resting, non-interactive surface, failing since M0, that nobody had ever seen
  because the audit's surfaces block hand-listed `["base", "raised", "overlay"]` and
  `surface.sunken` was simply never in it.

That last one is the point. The interactive-state hole and this one are the same mistake
seen from two sides: `contrastAudit.ts` enumerated pairs by typing names, so whatever
nobody typed was reported as passing.

This lands while the fleet is being actively migrated onto exactly these components — the
owner has [demoted native `Select` in favour of `Listbox` and
`Combobox`](2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md), with
lint rules steering every agent toward them. The specific text that fails is the two-line
detail in `Listbox`'s `AllVariants` story, whose docstring is *"the thing a native
`<select>` cannot do"* — the flagship capability the migration is being sold on.

## Why

- **The failures name the culprit, and it is the foreground.** Across all six intents, both
  tint states, all eight combinations, **every single failing pair is `content.muted`**.
  `content.primary` and `content.secondary` clear everywhere, on every tint, with no change
  — `secondary`'s worst is 5.68. If `surfaceHover` were too close to its surface,
  `secondary` would be marginal on it too. It is not. If a component had misclassified its
  row text, the failures would cluster in the pickers. They do not; they span tints no
  picker draws. A single foreground failing against many backgrounds while its two siblings
  pass against all of them is a weak token, and nothing else.
- **The component reclassification was checked first, and it is not the bug.**
  `ListboxOption` and `ComboboxOption` already paint the label `text-content-primary`
  (`text-content-disabled` when disabled), each with a comment explaining why the base sets
  no text colour. There is nothing to promote. The only `content.muted` inside a row is a
  genuine *secondary* line beside the label — the "5.1 · forced" under "English" — which is
  correctly muted and correctly fine print. Changing it to `content.secondary` would have
  turned the gate green while leaving the token failing on `surface.sunken` at rest and on
  the selected row, and would have deleted the demo instead of fixing the defect.
- **The hover token cannot fix it, and #72 already proved why.** In a dark scheme the row
  highlight is *lighter* than the resting tint, so gaining contrast against light-grey text
  means darkening the highlight past the tint it is supposed to be a hover of. And it
  cannot reach the failures that are not hovers at all: `surface.sunken` and
  `intent.accent.surface` are resting values.
- **Blast radius is real, and it is the right direction.** `content.muted` is used widely,
  so this repaints fine print across the fleet — but it repaints it *more legible*, by
  0.6–1.5 ratio points, which is the same correction the type-scale work made when it moved
  tooltip bodies and form errors off `text-xs`. The three-tier ramp survives: primary >
  secondary > muted still holds in every variant and scheme.
- **The gate had to grow structurally or this recurs.** Adding the one pair #72 named would
  have fixed four numbers and left `surface.sunken` failing, undiscovered, for exactly the
  same reason as before. Keying the maps by the role unions is what converts the next one
  from a discovery into a typecheck error.
- **Scope is declared, not remembered.** `INTENT_TINT_CARRIES_PLAIN_CONTENT` marks
  `neutral` and `accent` `true` (the row highlight and the selected row) and the four status
  tints `false`, because those carry their own `intent.<name>.content` — the one
  `bg-intent-danger-surface` in the package is paired with `text-intent-danger-content`,
  already gated. That is a design fact written down where a new intent must answer it,
  rather than a list somebody has to remember to extend.

## Evidence

Every pair that moved, computed from the token source. Bold `FAIL` is below 4.5:1.

| Variant / scheme | Pair | Before | After |
| --- | --- | --- | --- |
| hairline / light | `content.muted` on `surface.base` | `#686D74` on `#F6F4F1` = 4.75 | `#5D6168` = 5.67 |
| hairline / light | `content.muted` on `surface.raised` | 5.21 | 6.22 |
| hairline / light | `content.muted` on `surface.sunken` | `#EDEAE4` = **4.34 FAIL** | 5.17 |
| hairline / light | `content.muted` on `surface.overlay` | 5.21 | 6.22 |
| hairline / light | `content.muted` on `intent.neutral.surface` | `#ECE8E1` = **4.27 FAIL** | 5.09 |
| hairline / light | `content.muted` on `intent.neutral.surfaceHover` | `#E7E3DB` = **4.07 FAIL** | 4.86 |
| hairline / light | `content.muted` on `intent.accent.surface` | `#E9EAFB` = **4.38 FAIL** | 5.22 |
| hairline / light | `content.muted` on `intent.accent.surfaceHover` | `#DFE1F8` = **4.04 FAIL** | 4.82 |
| hairline / dark | `content.muted` on `surface.base` | `#838991` on `#0D0E10` = 5.47 | `#8E949B` = 6.31 |
| hairline / dark | `content.muted` on `surface.raised` | 5.09 | 5.87 |
| hairline / dark | `content.muted` on `surface.overlay` | 4.79 | 5.52 |
| hairline / dark | `content.muted` on `intent.neutral.surface` | 4.85 | 5.58 |
| hairline / dark | `content.muted` on `intent.neutral.surfaceHover` | `#21252A` = **4.37 FAIL** | 5.03 |
| hairline / dark | `content.muted` on `intent.accent.surface` | 4.64 | 5.35 |
| hairline / dark | `content.muted` on `intent.accent.surfaceHover` | `#202547` = **4.20 FAIL** | 4.84 |
| layered / light | `content.muted` on `surface.base` | `#676274` on `#F4F1F5` = 5.24 | `#605B6C` = 5.84 |
| layered / light | `content.muted` on `intent.neutral.surface` | 4.68 | 5.21 |
| layered / light | `content.muted` on `intent.neutral.surfaceHover` | `#DFDBE7` = **4.31 FAIL** | 4.80 |
| layered / light | `content.muted` on `intent.accent.surface` | 5.01 | 5.58 |
| layered / light | `content.muted` on `intent.accent.surfaceHover` | 4.53 | 5.05 |
| layered / dark | `content.muted` on `intent.neutral.surfaceHover` | `#9A95AB` on `#2E2B3C` = 4.76 | `#9B96AB` = 4.81 |
| layered / dark | `content.muted` on `intent.accent.surfaceHover` | 4.91 | 4.97 |
| daylight / light | `content.muted` on `surface.base` | `#616A7C` on `#F5F7FA` = 5.07 | `#565E6D` = 6.08 |
| daylight / light | `content.muted` on `intent.neutral.surface` | 4.54 | 5.45 |
| daylight / light | `content.muted` on `intent.neutral.surfaceHover` | `#DEE4EF` = **4.26 FAIL** | 5.11 |
| daylight / light | `content.muted` on `intent.accent.surface` | `#E8E7FD` = **4.48 FAIL** | 5.37 |
| daylight / light | `content.muted` on `intent.accent.surfaceHover` | `#DCDAFA` = **4.00 FAIL** | 4.80 |
| daylight / dark | `content.muted` on `surface.overlay` | `#8B94A5` on `#252D3B` = 4.53 | `#99A1B0` = 5.33 |
| daylight / dark | `content.muted` on `intent.neutral.surface` | 4.73 | 5.56 |
| daylight / dark | `content.muted` on `intent.neutral.surfaceHover` | `#2B3442` = **4.11 FAIL** | 4.83 |
| daylight / dark | `content.muted` on `intent.accent.surface` | 5.12 | 6.02 |
| daylight / dark | `content.muted` on `intent.accent.surfaceHover` | 4.58 | 5.38 |

The six token values:

| Variant / scheme | `content.muted` before | after |
| --- | --- | --- |
| daylight / light | `#616A7C` | `#565E6D` |
| daylight / dark | `#8B94A5` | `#99A1B0` |
| hairline / light | `#686D74` | `#5D6168` |
| hairline / dark | `#838991` | `#8E949B` |
| layered / light | `#676274` | `#605B6C` |
| layered / dark | `#9A95AB` | `#9B96AB` |
| legible / light | `#5C5850` | **unchanged** (worst 4.93) |
| legible / dark | `#A8A398` | **unchanged** (worst 5.50) |

The ramp still separates, measured on `surface.base` after the change — primary >
secondary > muted in all eight:

| | primary | secondary | muted |
| --- | --- | --- | --- |
| hairline / light | 15.55 | 6.62 | 5.67 |
| hairline / dark | 16.32 | 8.46 | 6.31 |
| layered / light | 15.33 | 7.31 | 5.84 |
| layered / dark | 16.70 | 8.68 | 6.55 |
| daylight / light | 15.74 | 6.77 | 6.08 |
| daylight / dark | 15.56 | 8.32 | 6.84 |
| legible / light | 17.00 | 9.34 | 6.11 |
| legible / dark | 18.72 | 12.17 | 7.84 |

Reverting only the six token values, with the extended gate in place, reports **12
failures** across five of the eight combinations — 5 in hairline/light, 3 in daylight/light,
2 in hairline/dark, 1 each in layered/light and daylight/dark. With the values in place:
**63 pairs, 0 failing** in all eight.

### The axe gap, which was worse than #72's

#72 found that `ButtonLink`'s `ui-dom` axe assertion ran against `AllVariants`, which forces
no `:hover`, so the failing hex passed locally. The picker components were a level worse:
`Listbox.test.tsx` composed `AllStates`, `Default` and `Interactive` and **never mounted
`AllVariants` at all** — the only story containing `text-content-muted` inside a row. So the
failing pair had *no* axe coverage in any state, resting or highlighted.
`Combobox.stories.tsx` puts its muted text outside the popup, and `Menu` uses
`content.secondary`/`content.disabled`, so `Listbox`'s rich story was the whole exposure.

Closed with `a highlighted rich option row has no contrast violation`, which mounts
`AllVariants`, opens it, waits for the first option to take focus, **asserts the row is
actually filled** (`backgroundColor` is neither transparent nor equal to the panel's) and
asserts the muted detail line is present — without those the test would pass on a silently
resting row, which is the exact trap #72 documented — then runs axe on the listbox.

Verified in both directions in real chromium, not from token math: with the old token values
it fails with `color-contrast (serious) — Elements must meet minimum color contrast ratio
thresholds`; with the new values it passes. 830 tests green.
