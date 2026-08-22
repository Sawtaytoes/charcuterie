# A pressable badge is a sibling component, not a prop on `Badge`

**Status:** Accepted
**Date:** 2026-08-22
**Type:** Component / API shape
**Supersedes:** —
**Superseded by:** —
**Extends:** [2026-07-30-a-consumer-milestone-adds-components.md](2026-07-30-a-consumer-milestone-adds-components.md)

## Decision

`BadgeButton` is a component of its own, beside `Badge`, exactly as `ButtonLink` is beside
`Button`. It takes `Badge`'s visual props, paints identically, and renders a `<button>`.

Three shape decisions come with it:

1. **`onClick` is required.** A pill nobody can press is a `Badge`.
2. **`type="button"` is the default**, overridable.
3. **The paint is shared, not copied.** Both components build their pill through
   `useBadgeShape`, and the test compares the two elements' **computed** styles.

Two alternatives were considered and refused: an `asChild` prop on `Badge`, and a `Badge`
that renders a `<button>` when it is handed an `onClick`.

## Context

QueuePilot's migration onto this library ran out of road at six controls, and all six are
the same shape: the per-entry setting tags on a poster tile, the Edit chip beside them, two
start-point chips, the group-editor chip, and a pool's Exclude chip. Each one opens an
editor or changes a value.

Every one was a hand-rolled `<button className="badge tagbtn …">` with the pill painted in
the app's own unlayered CSS — which is the exact defect that
repo's own record names — `queuepilot:docs/decisions/2026-08-21-a-component-configured-by-props-not-a-borrowed-class.md`,
named rather than linked because this repo is public and that path is not a URL from here.
A control that needs a look is a component, not a class name plus a hope. The app could not
follow its own rule, because the library had no pressable pill.

The owner was asked which of three shapes to build, and chose the sibling component.

## Why

**`asChild` would introduce a pattern this library has deliberately never had.** There is no
polymorphism anywhere in `@charcuterie/ui` today — `ButtonLink` exists precisely so that
`Button` does not need an `as` prop. Adding one here would make every future component
answer "can it be something else?" instead of "what is it?", and the first question is
unbounded.

**A `Badge` that becomes a `<button>` when handed an `onClick` fails silently.** The element
type would be a side effect of a handler: forget the handler and the control ships as a
`<span>` — not focusable, out of the tab order, invisible to `getByRole("button")` and to
every agent driving the app — with no error at build time, no error at runtime, and a
screenshot that looks correct. Requiring `onClick` on a separate component turns the same
mistake into a type error.

**What the element buys is not paint.** Focus, the tab order, Enter *and* Space, native
`:disabled`, form participation, and a role announced as pressable. That list is the reason
this is not solvable with a `className`.

**`type="button"`** because these chips sit inside forms — QueuePilot's entry sheet is a
`<form>` — and the platform's default of `submit` would make a "change the start point" chip
save the whole dialog. A safe floor rather than a ban: a badge-shaped submit is a real thing
and stays possible.

**`ghost` stays excluded**, inherited from `Badge`: a pill that paints nothing until hovered
has no pill left, and a control that only advertises itself on hover cannot be found by
touch.

## Evidence

The owner, asked to choose between a sibling component, `asChild`, and an `onClick` that
changes the element:

> "Add it to Charcuterie (probably as a button), then adopt it here."
> — and, on the name, `BadgeButton`, a sibling component.

Gates on the change: 1,404 tests pass, including a computed-style comparison of the two
elements, a keyboard test that presses the chip with Enter **and** Space, and an axe run over
a row of them. `sourceRules.test.ts`'s component count moves 52 → 53.
