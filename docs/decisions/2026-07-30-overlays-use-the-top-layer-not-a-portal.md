# Overlays reach the top layer through the platform, never through a portal

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Architecture
**Supersedes:** —
**Superseded by:** —

## Decision

Every overlay in `@charcuterie/ui` stays **where it is in the DOM** and rises above the
page using the platform's top layer:

| Component | Mechanism |
| --- | --- |
| `Modal` | `<dialog>` + `showModal()` |
| `Popover` | `popover="manual"` + `showPopover()` |

**No `createPortal`, and no `FloatingPortal`.** A future overlay — `Drawer`, `Menu`,
`Tooltip`, `ConfirmDialog` — uses the same two mechanisms.

## Why

The usual reasons to portal are `z-index` contests and `overflow: hidden` ancestors
clipping the panel. The top layer solves both, and it is a **paint** concept rather than a
tree one: the element renders above everything while staying exactly where it was.

The reason that decides it is ours, though:

> A portal moves the node to `document.body` — **out of whatever element a test or an
> agent scoped its queries to.**

`canvas.getByRole("dialog")` finds both of these. It would find neither if they were
portalled, and every story would have to reach for `screen` and give up its scoping.
That is not a testing inconvenience; it is the library's stated goal. A component whose
panel can only be found by a document-wide query is a component an agent cannot
reliably drive on a page with two of them, which is the exact failure
`expectAgentDrivable` refuses everywhere else.

`showModal()` also brings a focus trap, Escape, `::backdrop`, and `inert` on everything
behind it — from the platform, correctly, in every browser the fleet runs.

## `popover="manual"`, not `popover="auto"`

`auto` brings the UA's own light-dismiss, which closes the element **by itself** and
leaves `isVisible` true. That is the same state-ownership conflict that rules out Radix
([decision](2026-07-30-state-layer-is-charcuterie-on-floating-ui.md)), one layer down.
`manual` keeps the platform out of the decision, and floating-ui's `useDismiss` does the
same job through our callback.

## Two UA defaults that must be undone, and both look deliberate when wrong

- **`[popover]` ships `position: fixed; inset: 0; margin: auto`.** Left in place, the
  panel sits dead centre of the viewport and fights every coordinate floating-ui
  computes. `inset-auto m-0` puts it back, and `strategy: "fixed"` keeps the numbers
  viewport-relative like the top layer itself. `Popover`'s `AllVariants` story asserts
  the panel is positioned *at all* for this reason.
- **A closed `<dialog>` is hidden by a UA rule that any `display: flex` of ours beats.**
  A modal laid out with a plain `flex` renders permanently, in the page flow, with no
  error anywhere. The layout is therefore behind Tailwind's `open:` variant.

`showPopover()` is called from a **ref callback**, not an effect: a `[popover]` is
`display: none` until shown, and `FloatingFocusManager` is a child whose effect runs
first — it would be focusing into a hidden element.

## What this does not claim

It is not "portals are bad". It is that these two components have a platform mechanism
that is strictly better for them, and the day one does not — a floating element that must
escape a transformed ancestor's containing block, say — that component states its case
and supersedes this record rather than quietly reaching for `createPortal`.
