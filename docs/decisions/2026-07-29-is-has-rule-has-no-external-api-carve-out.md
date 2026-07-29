# The `is`/`has` rule has no carve-out for external API names

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Lint
**Supersedes:** —
**Superseded by:** —

## Decision

`IS_HAS_BOOLEAN_RULE` keeps selecting `variable`, `parameter`, `typeProperty`, and
`classProperty`. When code has to *write* a foreign boolean whose name we do not control,
it routes through an index signature instead of naming a type property:

```ts
;(globalThis as unknown as Record<string, boolean>)
  .IS_REACT_ACT_ENVIRONMENT = true
```

The rule is not widened, and no `eslint-disable` is added.

## Context

The plan anticipated this collision from the other direction — passing `open:` *into*
`@floating-ui/react`, whose API we cannot rename — and expected the existing carve-out to
cover it:

> Passing `open:` *into* floating-ui is legal and won't trip the lint rule, because
> `IS_HAS_BOOLEAN_RULE` in `mux-magic/eslint.config.js` deliberately selects
> `typeProperty`/`classProperty` rather than the broader `property`, with the comment that
> this is *"to avoid flagging object literal properties that are external API contracts …
> which we cannot rename."*

That is right for the floating-ui case and it is worth being precise about why. The
carve-out is that **`property` is not selected**, so an *object literal* key is never
flagged. `{ open: isVisible }` passes. A `typeProperty` — a key in a type or interface
declaration — still is flagged, deliberately, because that is us declaring a shape rather
than us conforming to someone else's.

M2 hit the one case that is neither: assigning React's `IS_REACT_ACT_ENVIRONMENT` global,
where the obvious spelling is a `declare global` block or an inline cast type, both of
which declare a type property.

## Why

**A type property is a shape we own.** Loosening the rule there would let any real boolean
hide behind "it's an external contract", which is the failure mode the narrow selector list
exists to prevent — and unlike an object literal key, a type property is something we chose
to write down.

**`Record<string, boolean>` is not a workaround, it is more honest.** We are not describing
React's global object; we are poking one well-known key on it. An index signature says
exactly that, and it needs no ambient declaration, so the package ships no global types a
consumer would inherit.

**`eslint-disable` was the rejected alternative.** `reportUnusedDisableDirectives: true` is
on, so a disable comment is load-bearing configuration that silently rots the day the code
around it changes — and one disable is the precedent for the next twenty.

## Evidence

`packages/eslint-config/src/index.js`, on the selector list:

> The selector list is deliberately `typeProperty` and `classProperty` rather than the
> broader `property`: object literal properties are frequently an external API contract
> (a yargs option config, a DOM `EventInit`) that cannot be renamed to satisfy a house
> rule.

M2 renamed four of its own booleans to satisfy the rule rather than argue with it —
`nextIsVisible` → `isNextVisible`, `initialIsVisible` → `isInitiallyVisible`, `wasActive`
→ `isActiveBefore`. All four read at least as well afterwards, which is the usual outcome
and part of why the rule stays narrow.

`packages/logic/src/conformance/createReactAdapter.ts` is the only place in the repo using
the index-signature form.
