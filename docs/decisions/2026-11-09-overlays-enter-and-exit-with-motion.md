# Overlays enter and exit with motion, and leave the page only when the exit ends

- **Status:** Accepted
- **Date:** 2026-11-09
- **Type:** Design / component
- **Supersedes:** —
- **Superseded by:** —
- **Related:** [ePaper removes animation, not just shortens it](2026-07-29-epaper-removes-animation-not-just-shortens-it.md) ·
  [The automated suites freeze motion](2026-08-10-automated-suites-freeze-motion-fonts-and-post-mount-effects.md) ·
  [The toast is the top of the layer scale, and modals cascade](2026-09-18-the-toast-is-the-top-of-the-layer-scale-and-modals-cascade.md)

## Decision

Every library overlay animates as it opens and as it closes.

- **Modal panels** (`Modal`, `Dialog`, `Lightbox`, `CommandPalette`) fade and scale from 96%.
  The shared scrim fades.
- **Anchored panels** (`Popover`, `Menu`, `Listbox`, `Picker`, `Combobox`, `DatePicker`) fade
  and scale out of the edge that faces their trigger. `transform-origin` follows the
  resolved placement, so a flipped panel grows the other way.
- **`Tooltip`** fades only.
- **An `Accordion` section** animates its height. A section that starts open does not
  animate on page load.
- **A `ReorderList` row** slides to its new place when a button, a key, or a drop moves it.
- **An app's own lists and values** get the same motion from two exported hooks.
  `useListMotion` makes an added item enter, keeps a removed item in place until its exit
  ends, and slides the items that moved. `useValueChangeClass` pops a value that an action
  changed. Neither animates what was there on the first render or data arriving from
  `null`: a page that loads should not perform.

The rules for how:

1. **`usePresence` keeps a closing element in the page until its exit animation ends.** It
   reads the exit's length from the element's computed style in a layout effect. It never
   takes a number.
2. **A leaving element is closed to everything but the eye.** It leaves the overlay stack
   at once, so the panel under it becomes live. Its focus manager is disabled, which
   returns focus immediately. It is `inert` and `aria-hidden`, and the exit class sets
   `pointer-events: none`. A role query does not find it.
3. **Keyframes on `opacity` and the individual `scale` property, never `transform`.**
   floating-ui positions anchored panels with an inline `transform`. An animated
   `transform` would replace it.
4. **The exit is shorter than the enter** (`--duration-fast` against `--duration-normal`).
   A list's slide is a CSS transition on `translate`, written inline on a wrapper the hook
   owns, and positions are offsets in the list's own box, so a page scroll is never taken
   for a move. Only a change in the order of keys slides anything.
5. **Reduced motion sets `animation: none` on all of it.** A zero-length exit removes the
   element in the same commit, so reduced motion, the frozen suites, and a DOM with no CSS
   engine all behave as they did before this change.

## Context

The owner asked, on 2026-11-09:

> Is Charcuterie missing animations when opening modals? Tally Marks doesn't have any. We
> should be putting animations everywhere when actions occur to help users follow the
> trail of things changing on the screen

It was. `OverlayPanel` returned `null` when closed, so every modal, its scrim, and every
anchored panel appeared and vanished in one frame. `Toast` was the only overlay with enter
and exit motion. The workspace-wide rule is `agentic`'s
`docs/decisions/2026-11-09-every-on-screen-change-from-an-action-animates.md`; this record
is the library's half of it.

## Why

**The length is read, not passed, because three renderings disagree about it.** The
designed motion, `prefers-reduced-motion`, and `FREEZE_MOTION_CSS` give the same element
three different lengths. A number in JavaScript would hold a closed panel in the page under
all three. Every existing test that asserts "it closed" would then have to learn to wait,
and so would every app's tests. Reading the computed style lets the motionless renderings
finish before paint.

**Closed means closed at once.** The motion is for the eye. Focus, the stack, the keyboard,
and the pointer must not wait for it, or the user's next action lands on a panel that is
already leaving.

**`Accordion` uses keyframes and presence, not a transition on `[hidden]`.** Tailwind's
preflight sets `[hidden]` to `display: none !important`. No transition can delay that, so a
CSS-only collapse would still jump shut. `interpolate-size` is what lets `height` animate to
`auto`. A browser without it gets no animation, which is better than a half-length pause and
then a jump.

## Evidence

The owner's question above is from T3 Code chat `f982e401-79d6-4982-b414-69087bb86a96`.
`usePresence.test.tsx` lifts the motion freeze and asserts the following: the exit keeps the
element, the element is `inert` and absent from role queries, focus returns before the
motion ends, a re-open during the exit keeps the element, and a collapsing accordion section
hides only after its animation.
