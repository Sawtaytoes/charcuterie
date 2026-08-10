---
"@charcuterie/tokens": minor
"@charcuterie/ui": minor
---

Rebuild the type ramp around a 17px body, and reclassify three `text-xs` groups as content

**Visual change in every consumer.** No API changes — no token was renamed, added or
removed, and no component prop moved — but text gets larger everywhere, so expect to
re-tune any layout that was measured against the old ramp.

The ramp is now `15 · 16 · 17 · 19 · 24 · 30px` (`xs`…`2xl`) for every variant, against
the old default of `12 · 13 · 15 · 17 · 21 · 26px`. `layered` keeps larger display steps
(`xl` 25px, `2xl` 32px); `daylight` and `legible` drop their `fontSize` overrides, which
only restated a smaller ramp. Line height moves to `1.28 / 1.55 / 1.7`. Density is a
multiplier over this, so `compact` and `kiosk` follow automatically.

`sm` is pinned to exactly `1rem`, because `text-sm` — not `text-md` — is the library's
de-facto body step: 34 uses in `packages/ui/src` against 11 for `text-md`.

In `@charcuterie/ui`, three groups move from `text-xs` to `text-sm` because they are
content rather than fine print: the whole **Tooltip** body, **Field** and **FieldGroup**
descriptions *and error messages*, and the **SortableTableHeader** label.

**Control heights are deliberately unchanged.**

Two things to check when you take this: any layout with a hardcoded height that assumed
14–15px text, and `AdaptiveGrid` callers — it spends height first, so a taller card means
*fewer* columns, and a card measured at 147px on the old ramp is 163px on this one.

See `docs/decisions/2026-08-10-the-type-ramp-is-built-around-a-17px-body.md`.
