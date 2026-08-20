# `categorical` is a curated palette; `Swatch` is ungoverned colour

**Status:** Accepted
**Date:** 2026-08-19
**Type:** Design
**Supersedes:** —
**Superseded by:** —

## Decision

Charcuterie gains a second multi-value colour family, `--color-categorical-<n>-<role>`,
numbered 1–10 and **non-semantic**. Same seven roles an intent has (`surface`,
`surfaceHover`, `border`, `content`, `solid`, `solidHover`, `onSolid`), in all four
variants and both schemes, contrast-gated alongside the intents. `Badge` takes it as a
`categorical` prop, mutually exclusive with `intent` in the type.

This does **not** supersede the argument in `Swatch.tsx` that a user-chosen colour is data
rather than a token. That argument stands, unedited, and the boundary between the two is
now stated:

| | `Swatch` | `categorical` |
| --- | --- | --- |
| Where the colour comes from | the world | a set this library owns |
| Values | any CSS colour | ten, numbered |
| Re-themed by `data-variant` | no — re-theming it would be re-theming the hardware | yes, generated per variant |
| Contrast | unknowable | gated, both schemes, both directions |
| The user can pick something unreadable | yes, and that is not `Swatch`'s problem | **no** |

**Ungoverned colour is `Swatch`. A choice from a palette is `categorical`.**

## Context

The owner:

> "We might need to update Charcuterie to add more badge colors that aren't semantic. Just
> numerical ones to allow for more color choices in apps like Docket where the badges are
> user-chosen."

Docket is the fleet's task tracker, and its user picks colours for **labels and projects**.
Until now the only multi-value colour family here was `intent`
(`neutral|accent|success|warning|danger|info`), and every member of it is a *claim*:
`danger` is not a colour, it is a statement about what happens if you press the thing.
Colouring a "Homelab" label `danger` is the design system lying on the user's behalf — and
worse, it puts a value with no meaning inside the union that every `getAsyncIntent`-style
exhaustive switch in the fleet is written over.

The obvious objection is already written down, at length, in `packages/ui/src/Swatch/Swatch.tsx`:

> "A design system owns `intent.danger`; it does not own the colour of the dot somebody
> stuck on a game controller, and re-theming that would be re-theming the hardware."

That is not an ADR and it does not block this work, but it is right, and it would be wrong
to contradict it silently.

## Why

**They are different problems, and the difference is who chose the colour.**

`Swatch` exists for a colour that **arrived**: a red sticker on a controller, red because
someone put a red sticker on it; the accent castkit extracts off an album cover; a tag
colour imported from a system that predates us. Nothing can be promised about it. It cannot
be re-themed (the sticker does not change when the scheme flips), it cannot be
contrast-checked at build time (nobody knows what it will be), and it must not be
*replaced* by something legible, because then it is no longer the sticker. `Swatch`'s job
is to render it honestly and attach a name a screen reader can read, and that is all it can
do.

`categorical` exists for a colour that was **chosen from what we offered**. That single
difference buys back everything `Swatch` had to give up:

- **Finite**, so every value can be enumerated and measured.
- **Re-themed**, because it is a token like any other — `data-variant` moves all ten.
- **Gated**, in both schemes: `content` on `surface` and `onSolid` on `solid` at 4.5:1
  (WCAG 1.4.3), `border` at 3:1 (1.4.11, and
  [not exempt](2026-08-19-categorical-borders-are-gated-where-intent-borders-are-exempt.md)).
- **Gated against each other**, which is the property neither a contrast audit nor `Swatch`
  has ever asked about. See
  [the ten-hue record](2026-08-19-the-categorical-family-has-ten-hues.md).

So the user cannot pick an unreadable label colour, because unreadable ones are not on
offer. That is a promise `Swatch` structurally cannot make and is not trying to.

The two also fail differently when misused, which is the practical test:

- Reaching for `categorical` where the colour came from the world **discards data** — the
  sticker is red, and index 1 is merely reddish.
- Reaching for `Swatch` where the user picked from a palette **discards the guarantee** —
  the app is now free to store `#EEE`, and nothing will tell it that is invisible.

## Evidence

- Owner, 2026-08-19: *"We might need to update Charcuterie to add more badge colors that
  aren't semantic. Just numerical ones to allow for more color choices in apps like Docket
  where the badges are user-chosen."*
- `packages/ui/src/Swatch/Swatch.tsx` — the `color` prop's doc comment and the component
  header, both unchanged by this work.
- `packages/tokens/src/categorical.ts` — the generator, and the "Why this is not `Swatch`"
  section at the top of it.
- `packages/tokens/src/contrastAudit.ts` — the categorical block, derived from
  `CATEGORICAL_INDEXES` rather than typed out, for the same reason every other list in that
  file is derived.
- Docket shipped `--color-danger-9` — a Radix-style step Charcuterie has never had — which
  resolved to nothing, painted transparent, and passed every "is it rendered" assertion.
  That is the failure an app reaches for when the design system offers it no numbered
  colour, and `Badge.test.tsx` now asserts the painted `background-color` rather than the
  class name, precisely because a class-name assertion cannot see it.
