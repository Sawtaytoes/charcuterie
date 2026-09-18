---
"@charcuterie/tokens": minor
"@charcuterie/ui": minor
---

The toast is the top of the layer scale, and stacked modals cascade.

`layer.toast` and `layer.tooltip` swap: the toast is `600` and the
tooltip is `500`. A toast is the only surface here that can carry an
action with a deadline on it — an Undo — and covering one loses work.
A tooltip is transient decoration on a control the pointer is already
resting on, and its own requirement was only ever "above a modal".

`ToastRegion` stops painting at a hand-picked `z-50`, which was below
every overlay in the scale: an Undo raised from inside a `Modal` was
drawn behind the modal and could not be pressed at all. It reads
`--layer-toast` plus the open-modal depth instead.

`OverlayPanel` cascades. Each open panel paints at
`calc(var(--layer-modal) + <its index in the stack>)` rather than all
of them sharing one layer, so which of two open modals is on top is
the stack's answer instead of a side effect of portal append order.
`useOverlayStack()` gains `orderedIds` for it.

A press on a toast is no longer an outside press, so pressing Undo
over a modal runs the action instead of dismissing the modal.

A tall stack of toasts scrolls instead of climbing off the top of the
page: the list is capped at `min(60dvh, 32rem)`, pinned to its bottom
edge with an auto margin, and taken to the newest toast on arrival.

⚠️ An app that read `layer.toast` or `layer.tooltip` as a number, or
that ordered its own surfaces between the two, has to look again.
