# Hover styles ask whether any pointer can hover

Status: Accepted
Date: 2026-09-28
Type: Tokens / Tailwind integration
Supersedes: None
Superseded by: None

## Decision

`@charcuterie/tokens/theme.css` redefines Tailwind's `hover:` variant:

```css
@custom-variant hover { @media (any-hover: hover) { &:hover { @slot; } } }
```

Tailwind v4's own `hover:` is gated on `@media (hover: hover)`. Ours is gated on
`any-hover`. `group-hover:` and `peer-hover:` compose on `hover`, so they follow — checked
against Tailwind 4.3.3's compiler output. Every app that imports `theme.css` gets it with
no change of its own, and so does every `@charcuterie/ui` component, because their classes
are compiled by the app's Tailwind.

## Context

The owner could not see Mail Sifter's card-selection checkbox on a Surface, with the Type
Cover and a mouse attached and with the pen. The checkbox is `opacity-0
group-hover:opacity-100` — hover is the only way it appears before selection mode.

`(hover: hover)` asks about the **primary** pointer. A Surface's touchscreen is its primary
pointer, so Chromium answers `hover: none` however many hover-capable pointers are
attached. Every hover style in every app was off on that machine, not only the checkbox;
the checkbox is merely the one whose absence makes a feature disappear.

## Why

- `any-hover` asks whether **any** attached pointer can hover, which is what a hover style
  means. A phone still answers `none`, so the sticky-after-tap problem Tailwind's gate
  exists to prevent is still prevented.
- A plain `&:hover` with no media query was the other option and brings sticky hover back
  to phones.
- One line in the token package fixes the fleet; a per-app override would be the shared
  shape fixed per app, which the house rules forbid.
- A touch-only tablet with a pen digitizer may answer `any-hover: hover` and paint a hover
  after a tap. That is the accepted cost.

## Evidence

- Owner, 2026-09-28, T3 Code thread `061d7b09-bd0f-4ea4-a6c0-5843878c8c8a`: *"The checkbox
  that displays over emails in Mail Sifter when using the mouse hover aren't showing up for
  me on my Surface tablet with the mouse and keyboard plugged in or with the pen"*.
- Chromium launched with `primaryPointerType=coarse`, `primaryHoverType=none`,
  `availableHoverTypes=none|hover` (the Surface's report): `(hover: hover)` false,
  `(any-hover: hover)` true. After a mouse hover, the `group-hover:opacity-100` element
  computed `opacity: 0` under Tailwind's default and `1` under this variant.
