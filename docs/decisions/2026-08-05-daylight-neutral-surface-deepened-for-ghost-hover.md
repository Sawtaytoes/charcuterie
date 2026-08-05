# daylight/light `intent.neutral.surface` is deepened so a neutral ghost hover reads

- **Status:** Accepted
- **Date:** 2026-08-05
- **Type:** Tokens (visual)
- **Supersedes:** —
- **Superseded by:** —

## Decision

In the **daylight** variant's **light** scheme, `intent.neutral.surface` moves
`#EDF0F5`→`#E6EBF2` and `intent.neutral.surfaceHover` moves `#E3E8EF`→`#DEE4EF`.
Nothing else changes — not dark, not the other variants, not `intentStyles.ts`.
A `ghost`/`outline` neutral control keeps hovering to `surface`; `soft` keeps
resting on `surface` and hovering to `surfaceHover`.

## Context

A `ghost` neutral button (toolbars, icon rows — "nothing until hovered") is
transparent at rest and hovers to `intent-neutral-surface`. On light chrome the
old surface `#EDF0F5` was only **ΔE≈12** from the page base `#F5F7FA`, so the
hover was nearly invisible — the exact affordance the owner flagged when the
scheme switchers shipped. Dark mode already read (the neutral surface separates
hard from the dark base there), and the focus-visible ring, accessible name, and
axe all passed regardless: this was purely the **mouse-hover affordance in light
mode**, which axe and a green contrast number cannot see.

The residual is specific to **neutral**, not to `ghost`. The chromatic intents
(accent, success, …) read at the `surface` step because their surface is a tint
— accent's is ΔE≈21 from base. Neutral's surface is grey-on-near-white, so it is
the one intent whose first tint step is too quiet to become a hover.

## Why

Three ways were on the table:

1. **Fix in Charcuterie by repointing neutral ghost/outline hover at
   `surfaceHover`** — contained to `intentStyles.ts`, but makes neutral the one
   intent whose ghost hover uses a different role than the other five.
2. **Deepen the neutral `surface` token itself** — one variant value, keeps the
   role map uniform (`ghost`→`surface` for every intent), and also lifts the
   `soft` appearance's resting tint, which was quiet for the same reason.
3. **Per-control opt-in / leave it** — rejected. Per-app touches cut against the
   library's whole point, and "leave it" is the thing that was flagged.

The owner chose (2), **reviewing a served before/after** of ghost-on-base,
ghost-on-raised, ghost text, and a `soft` sanity panel — *"I love it! Looks
fantastic!"* The new pair keeps the ramp monotonic and the same two-step gap:
base 0 → surface ΔE 20.8 → surfaceHover ΔE 31.8 → border ΔE 35.7 from base, and
`surfaceHover` stays lighter than the `#DDE2EA` border so a `soft` button's
outline does not disappear under the cursor.

## Evidence

- Neutral content `#3B4353` on the new surface: **8.29:1** (was 8.70:1); the
  contrast gate reports every variant/scheme pair 0 failing, "All variants clear
  WCAG 2.2 AA".
- ΔE (sRGB): ghost hover on base 11.7→**20.8**; on raised(white) 25.5→34.6;
  neutral `surfaceHover` 25.9→**31.8**, still ΔE 5.5 from the border.
- Before/after served at review time over `devshare`
  (`charcuterie-ghost-hover-before-after`); 137/137 tokens tests pass after a
  fresh `dist` rebuild (`distFreshness`).

## Update (2026-08-05)

The "daylight only" scope above was revisited the same day: `layered` and
`hairline` had the same weak neutral surface and got the same deepening, while
`legible` (already ΔE≈23) was left alone. See
[neutral-ghost-hover-swept-to-layered-and-hairline](2026-08-05-neutral-ghost-hover-swept-to-layered-and-hairline.md).
