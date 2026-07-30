# The modal scrim is its own token role, and it is translucent

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Design
**Supersedes:** —
**Superseded by:** —

## Decision

`SchemeColours` gains `scrim` — a top-level role beside `focus` and `elevation`, **not** a
sixth member of `surface`. It is emitted as `--color-scrim`, bridged into Tailwind's
`@theme`, and used in exactly one place: `Modal`'s `backdrop:bg-scrim`.

Every variant sets its own, per scheme, and they differ on purpose:

| Variant | dark | light |
| --- | --- | --- |
| `daylight` | `rgb(6 9 16 / 0.66)` | `rgb(19 24 34 / 0.44)` |
| `hairline` | `rgb(8 9 10 / 0.74)` | `rgb(21 23 26 / 0.48)` |
| `layered` | `rgb(19 17 24 / 0.72)` | `rgb(28 26 36 / 0.52)` |
| `legible` | `rgb(0 0 0 / 0.84)` | `rgb(11 11 9 / 0.66)` |
| ePaper | `transparent` | `transparent` |

## Why not a `surface`

Two reasons, both structural rather than aesthetic:

- **It is deliberately translucent**, so it would break the "opaque 6-digit hex
  throughout" rule the swatches are held to — a rule that exists because translucency
  hides contrast failures, the gate measuring a colour nobody ever sees composited.
- **Nothing is ever drawn on it.** Adding it to `surface` would enrol it in the
  `content.* on surface.*` contrast matrix, which would be gating a pair that cannot
  exist.

Elevation is the precedent: also a colour-bearing token, also not a hex, also outside the
matrix, for the same kind of reason.

## Why it is a variant's call

How hard a direction separates a dialog from the page is exactly the sort of thing a
visual direction decides. `hairline` dims harder than `daylight` because it has no shadow
to separate the dialog with — the same reason its borders do the work everywhere else —
and `legible` is heaviest on its own premise: a wash you can see past is a wash that
failed in sunlight.

**ePaper's is `transparent`, and that is a statement rather than an omission.** A panel
with no opacity cannot dim, so it says so instead of faking one. `Modal` still separates
there, by border and by the paper itself; a scrim was never its only means
([decision](2026-07-29-epaper-is-a-profile-not-a-scheme.md)).

## Two gates, because both halves fail silently

- `variants.test.ts` asserts every scrim **has an alpha channel**. An opaque one is a
  black rectangle where the page used to be, which reads as a rendering failure rather
  than as a dialog. It checks for alpha rather than a value, so a direction stays free to
  dim as hard as its premise wants.
- `Modal`'s `Responsive` story compares the computed `::backdrop` colour against the
  token's **resolved** value, via a probe element. The loose version of that assertion —
  "not transparent" — was green for the wrong reason: Chromium's own `::backdrop` is
  `rgba(0, 0, 0, 0.1)`, which satisfied it against a token build where `bg-scrim`
  generated no CSS at all. See
  [the stale-`dist` record](2026-07-30-storybook-reads-the-built-dist.md).
