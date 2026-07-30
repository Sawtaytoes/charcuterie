# A prop typed from another package needs an explicit `argTypes` entry

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Docs / tooling
**Supersedes:** —
**Superseded by:** —

## Decision

1. **Any prop whose type is imported from a bare package specifier declares its control in
   the story's `argTypes`.** Enforced by `storyControls.test.ts`.
2. **Option lists are derived from the `Record<Union, …>` maps the components already
   index**, never retyped — so a new intent or a new size is a compile error in the map and
   a longer radio in the panel.
3. **Every `meta` restates the component's own defaults in `args`.**
4. **`react-docgen` stays**; `react-docgen-typescript` is rejected.

## Context

Two separate faults in the same panel, both found by reading the built site:

`size` on `Button` and `Spinner` rendered as an **object control** — a JSON textarea
containing `{}` — on a prop whose only legal values are `"sm" | "md" | "lg"`. Typing in
that box hands the component an object where a string belongs. The docgen output says why:

```js
appearance: { tsType: { name: "union", elements: [ "ghost", "outline", … ] } }  // ../intentStyles.ts
size:       { tsType: { name: "ControlSize" } }                                 // @charcuterie/tokens
```

`react-docgen` follows **relative** imports and stops at bare specifiers. An unresolved
name has no enumerable values, and Storybook's fallback for an unknown type is the object
control. It affected `intent` (`Badge`, `Button`, `ProgressBar`), `size` (`Button`,
`Spinner`), `Card.elevation`, `LiveStatusIndicator.status`, and `Popover.placement`.

Separately, `sizing` on `Button` — an *inline* union, correctly enumerated — showed
`"control"` in the props table's Default column with **nothing selected** in the radio
beside it. Storybook has not seeded `args` from a docgen `defaultValue` since v7; the table
reads the docgen and the control reads the args, and nothing connects the two.

## Why

**`react-docgen-typescript` would fix the resolution and cost more than it is worth.** It
uses the TypeScript compiler, so it resolves imported unions — and it also expands
`ComponentPropsWithRef<"button">`, turning a nine-row props table into every HTML attribute
React knows. Every component here spreads a DOM props type. A `propFilter` can claw some of
that back, at the price of a rule about what counts as "ours" that has to be maintained.

**Deriving the options is what makes the restatement safe.** `Object.keys` on a map already
annotated `Record<IntentName, …>` cannot omit an intent, because the annotation forces the
map to hold every one. Writing `["neutral", "accent", …]` by hand would be a second list to
forget.

**Restating defaults in `args` is duplication, and it is the smaller evil.** The alternative
is a Controls panel where nothing is selected until the reader touches it — which reads as
"this component has no default" and makes the panel's initial state disagree with the
rendered story.

## Consequences

- `argTypes.storyHelpers.ts` holds the shared controls. It is excluded from the package
  build alongside the other `.storyHelpers` files (the exclude glob gained a `.ts` variant).
- `Card` exports `ELEVATION_CLASS` so its story can derive `elevation`'s options from the
  same map the component indexes, rather than this shared file importing a component.
- `PLACEMENT_OPTIONS` is the one list written by hand — floating-ui's `Placement` is not a
  `Record` anywhere we own — and is therefore the one a dependency bump could outdate.
- A control shows as a radio under five options and a select at five or more; past four the
  radio column is taller than the props row it belongs to.

## Evidence

> Image 3: I think some defaults aren't properly configured as it doesn't show "control"
> pre-selected for Button.

> Image 4: Some string values are showing as objects??? This is breaking the story.

— Kevin, on the `Button` docs page.
