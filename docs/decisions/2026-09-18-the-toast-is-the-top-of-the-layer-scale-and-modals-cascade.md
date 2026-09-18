# The toast is the top of the layer scale, and modals cascade

- **Status:** Accepted
- **Date:** 2026-09-18
- **Type:** Design / component
- **Supersedes:** —
- **Superseded by:** —

## Decision

**A toast paints above everything, including a tooltip and any depth of stacked modal, and
no component in this library picks its own z-index.**

Four parts:

1. `layer.toast` and `layer.tooltip` swap. The toast is `600`, the top of the scale; the
   tooltip is `500`.
2. `OverlayPanel` paints at `calc(var(--layer-modal) + <its index in the stack>)` instead
   of every panel sharing one layer. `useOverlayStack()` gains `orderedIds` to supply the
   index.
3. `ToastRegion` paints at `calc(var(--layer-toast) + <stack depth>)` instead of a
   hand-picked `z-50`, and carries `data-charcuterie-toast-region` so that
   `OverlayPanel`'s `outsidePress` predicate can refuse to treat a press on a toast as a
   press outside the panel.
4. The toast list is bounded. It is capped at `min(60dvh, 32rem)`, pinned to its bottom
   edge, scrolls with `overscroll-contain`, and is taken to the newest toast whenever the
   count changes.

## Context

The owner read `ToastRegion`'s container class and commented on the `z-50` in it:

> Yea, we shouldn't be using fixed values for this kinda stuff. First, I think toast
> should always exist on top of everything. But if you have multiple toasts, it should
> accomodate them somehow.
>
> Next, modals etc should be progressively going on top of each other wiht a cascade if we
> have multiple. Toast should be on top of those for sure.

(chat `d4a6f221-758c-4bc4-ba02-6e0eb1bb0b62`)

He had arrived there from a Mail Sifter bug: an Undo toast raised from the read-email
screen did not appear. Three defects sat behind the comment, and all three were real in
this library.

**`z-50` is below every overlay in the scale.** `--layer-modal` is `400`. A toast raised
while a `Modal` is open was painted behind the modal and behind the shared scrim, which is
the first screenshot on the pull request: the words "Moved to Done" and "Undo" are legible
only as a dim green shape.

**Every panel painted at the same layer.** Which of two open modals was on top fell out of
the order floating-ui happened to append their portals in. The stack already knew the
answer and nothing asked it.

**A press on a toast dismissed the modal.** `useDismiss({ outsidePress: true })` reads any
press outside the floating element as a dismissal, and a toast is outside it. So pressing
Undo over a modal closed the modal instead of running the action — the exact opposite of
what the button says.

## Why

**The toast goes above the tooltip, not below it, because of what each one costs when it
is covered.** A toast is the only surface in this library that can carry an action with a
deadline on it. Covering one loses work the person cannot get back. A tooltip is transient
decoration on a control the pointer is already resting on; covering one costs a second and
a second attempt. The tooltip's own requirement was never "above a toast" — it is "above a
modal", and `500` still is.

**The scale's gaps are 100 because the layers cascade.** A modal over a modal is `400 + n`
and the toast is `600 + depth`, so the ordering holds however deep the stack goes. Closing
the gaps would turn the cascade into a collision.

**The region stays in the page rather than moving inside the panel's portal.** Moving it
was built first, and it is wrong twice. `FloatingFocusManager`'s `modal` already leaves a
live region alone — `markOthers` concatenates
`body.querySelectorAll('[aria-live],[role="status"],output')` onto its keep-list, so the
region is never marked `aria-hidden` where it stands, and `role="status"` is load-bearing
for that reason. And the panel's container sets a z-index, so a region nested inside it
would be trapped in that stacking context and lose to the *next* modal however high
`--layer-toast` climbs.

**The list is bottom-pinned with an auto margin rather than `justify-content: flex-end`.**
Measured in chromium: with `justify-end` an overflowing list reports
`scrollHeight === clientHeight` and the toasts above the fold cannot be scrolled to at all,
because content overflowing a flex container's *start* edge is not reachable overflow. An
auto margin resolves to `0` the moment the free space runs out, so one rule pins a short
list and scrolls a long one.

## Evidence

**The tests fail without the change.** `packages/ui/src/Toast/ToastRegion.test.tsx` runs in
the same chromium the stories render in. Restoring `z-50` and a flat `--layer-modal` fails
"the toast paints above a cascade of modals" with `expected 400 to be greater than 400`;
removing the `outsidePress` predicate fails "pressing Undo does not dismiss the modal under
it" with `Unable to find an element with the text: Undone`, because the press closed the
modal that held it.

⚠️ **A story with nothing but a region in it proves nothing about the `outsidePress`
predicate.** floating-ui's `closeOnPressOutside` has a second, accidental guard: it returns
early when the press target's body-level ancestor contains none of the
`[data-floating-ui-inert]` markers `markOthers` left behind, on the theory that such an
element was injected after the panel opened. A page that is only a toast region takes that
branch and never reaches the predicate. A page with content beside the region — every real
app — does reach it. `OverStackedModals` carries a heading and a paragraph for exactly that
reason, and removing them makes the test pass with the predicate deleted.

**Two stories carry the cases.** `Components/Overlays/Toast` gains `OverStackedModals` (two
stacked modals and a pinned Undo) and `ManyAtOnce` (twelve toasts at once). Before the
change, the twelfth story's first three toasts were clipped off the top of the viewport
with no way to reach them, because a `position: fixed` element is not something the page
can scroll to.

**Full suite:** 1916 tests pass, 215 files.

**Fleet survey** (`rg -uu` from the repos root, 2026-09-18): `portly-controllers` is the
only owned app rendering `ToastRegion` today. Mail Sifter has its own hand-rolled
`ActionToast`, also at a hand-picked `z-50` — which is the shape this library is supposed
to own, and is filed as follow-up work rather than fixed here.
