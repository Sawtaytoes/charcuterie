# An accordion panel is a `group`, not a landmark

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Component behaviour
**Supersedes:** —
**Superseded by:** —

## Decision

`AccordionSection`'s panel is `role="group"` with `aria-labelledby` pointing at its trigger.

It is **not** `role="region"` (a landmark), and it is **not** roleless.

## Context

The ARIA Authoring Practices accordion pattern says a panel *may* take `role="region"`, and
adds the caveat in the same breath:

> Avoid using the `region` role in circumstances that create landmark region proliferation,
> e.g. in an accordion that contains more than approximately 6 panels.

The first implementation followed the suggestion and ignored the caveat. The caveat arrived
on the first board: `Accordion.AllVariants` renders four accordions over the same three
sections, producing four landmarks named "Disc", and axe's `landmark-unique` failed the
story. That is not a story artefact — a real page listing jobs, each with a Disc/Log/Flags
accordion, is exactly the same shape.

Dropping the role entirely was the second attempt, and it was **wrong in a way that looked
right**: `aria-labelledby` on a roleless `<div>` is inert, so the panel would have lost its
name rather than just its landmark. Biome's `useAriaPropsSupportedByRole` caught it — the
one linter rule in that file that was correct about this component.

## Why

`group` is the role the APG's caveat is reaching for and does not name. Its definition is
precisely the distinction being drawn:

> A set of user interface objects which are **not** intended to be included in a page
> summary or table of contents by assistive technologies.

So the panel keeps a meaningful `aria-labelledby`, keeps the trigger↔panel relationship in
both directions, and stays out of the landmark list no matter how many accordions a page
renders.

The rejected alternatives:

- **`role="region"` with unique names.** The name comes from the trigger, and two job cards
  legitimately both have a "Disc" section. Making them unique would mean threading a
  disambiguating prefix through every consumer — solving axe's complaint by making the
  markup worse.
- **`<fieldset>`**, which is what Biome's `useSemanticElements` suggests for `group`. It is
  a *form control* grouping: it drags `<legend>` semantics and form-reset behaviour onto a
  panel that mostly contains prose. Suppressed with that reason in place.

## Evidence

`landmark-unique`, axe 4.12, failing `Accordion.AllVariants` during M6; then
`lint/a11y/useAriaPropsSupportedByRole` failing the roleless fix. Both are recorded in the
component's own comments so the next reader does not retry either.
