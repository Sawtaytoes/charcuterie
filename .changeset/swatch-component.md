---
"@charcuterie/ui": minor
---

Add `Swatch` — a colour presented as content, with a required accessible name.

`Badge` and `LiveStatusIndicator` both take an `intent`, so neither can show a colour the
design system does not own and cannot name: a controller's sticker, castkit's album accent,
a user's tag colour. `DOT_SIZE_CLASS` is exported precisely so an app can hand-roll one of
these, and three across the fleet did — each without a name a screen reader or `getByRole`
could read.

`Swatch` is that dot, named. The colour is a `color` prop that lands in an inline `style`
(the sanctioned escape hatch for a runtime value); the meaning travels in a required
`label`; and it renders as a `role="img"` so `getByRole("img", { name })` resolves in both
the dot-only and labelled forms. `appearance="outline"` keeps the hue and drops the fill —
the one state a status colour cannot borrow from `intent`, for a subject that is present but
inactive — and its own size scale is larger than `DOT_SIZE_CLASS` because a swatch is
content, not punctuation.

Surfaced by `portly-controllers`, the fleet's newest consumer.
