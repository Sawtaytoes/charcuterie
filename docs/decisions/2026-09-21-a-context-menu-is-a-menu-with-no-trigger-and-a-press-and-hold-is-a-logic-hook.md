# A context menu is a `Menu` with no trigger, and a press-and-hold is a logic hook

- **Status:** Accepted
- **Date:** 2026-09-21
- **Type:** Design / component
- **Supersedes:** —
- **Superseded by:** —

## Decision

**A touch context menu is `Menu` in anchor mode plus `useLongPress`. Neither is built in an
app.**

Four parts:

1. `useLongPress` joins `@charcuterie/logic`. It returns the six handlers a pressable
   element spreads, fires once per press with the point in viewport coordinates, and
   cancels on a 10px drift so a scroll that starts on the card is a scroll.
2. `Menu` gains **anchor mode**. `anchorRef` replaces `trigger`, and the two are mutually
   exclusive in the type. The anchor may be a real element or a **virtual** one — an object
   that knows only its own rectangle — which is how the panel opens at the finger.
3. **`label` is required in anchor mode and forbidden in trigger mode.** With no trigger
   there is no `aria-labelledby`, so the prop that
   [A menu is named by its trigger](2026-07-31-a-menu-is-named-by-its-trigger.md) measured
   as inert becomes the only name the panel has. That record is **narrowed, not
   superseded**: a menu with a trigger is still named by it.
4. `useLongPress` arms for **touch and pen only** by default. A mouse keeps the browser's
   own menu.

## Context

The owner reported that press-and-hold does nothing useful in Mail Sifter:

> Mail Sifter tap and hold either context menu or checks checkbox.

Asked which of the two he wanted, he chose the menu with **Select** as its first entry
(chat `228b94c0-445c-48ce-9140-74c77decf384`).

The gesture had no implementation anywhere. `rg -uu` across the whole fleet returned **zero**
hits for `useLongPress`, `longPress` or `onContextMenu` — this is a shape no app had, rather
than one three apps had solved differently.

## Why

**The house rule is that a shared shape is built here first.** A context menu is the shape
every card grid in the fleet will want on a phone, and the app half of it is an action list,
which is data rather than shape.

**A menu and a context menu differ by one prop.** Anchor mode already existed in
`useAnchoredOverlay` for the attached-input `Combobox`; `Menu` simply never exposed it. What
had to be added was the virtual anchor — a rect with no element — which floating-ui supports
natively, so `flip` and `shift` keep working and a press near the bottom of the window still
gets a menu that fits. Positioning by hand with `top`/`left` would have thrown all of that
away.

**Two things in the gesture are not obvious, and both were measured.**

The first is that the native `contextmenu` event has to be a **second trigger**, not merely
something to suppress. Chrome on Android recognises its own long press at about the same
500ms and fires `pointercancel` at the sequence, which clears a timer a beat before it would
have run — so a timer-only implementation misses exactly the presses that felt longest.
Whichever arrives first fires the callback, and a flag keeps it to one per press.

The second is that the click has to be swallowed in the **capture** phase. A long press on a
link still ends in a `click`, and the element that would answer it is a *child* — Mail
Sifter's card is an anchor wrapping the whole body — so a bubble-phase guard runs too late
and the page navigates out from under the menu that just opened.

**A mouse keeps its own menu because the browser's is better than ours.** "Open link in new
tab" and "Copy link address" cannot be reproduced by an app, and Mail Sifter's cards are
anchors specifically so those gestures work. Taking the right button would be a loss on a
desktop to pay for a gain on a phone. `pointerTypes: ["mouse"]` is available for a surface
that is not a link and has no native menu worth keeping.

**The CSS half stays with the consumer.** `-webkit-touch-callout: none` on the pressed
element is the only thing that stops iOS showing its link preview sheet over the menu, and
no handler can reach it because Safari fires no `contextmenu`. A hook that wrote `style` onto
the element would fight every consumer's own.

## Evidence

- The owner's report and his choice of the menu, with `Select` first:
  chat `228b94c0-445c-48ce-9140-74c77decf384`.
- **A dependency bug in `useAnchoredOverlay` was found by the first test and is fixed in the
  same change.** The anchor effect's own comment claimed it re-read the ref "on `isVisible`"
  and the dependency array did not list it, so the reference was read **once on mount**. That
  was invisible for the one consumer it had — a `Combobox`'s input is mounted long before the
  panel opens — and fatal for a context menu, which aims its anchor milliseconds before
  showing. floating-ui with no reference positions at the viewport's top-left corner, which
  looks exactly like a CSS bug. Measured: the panel reported `left: 0, top: 0` against an
  expected `220, 184`, and putting the dependency back reproduces it on demand.
- It is a **layout** effect for the same reason: an ordinary effect sets the reference after
  the browser has painted, so the menu flashes in the corner on its way to the finger.
- `useLongPress.browser.test.ts` drives the four sequences apart in chromium — a held press,
  a press that travelled 40px, the Android `contextmenu`, and a mouse press that must neither
  fire nor lose its native menu — plus the click that must reach nothing and the tap after it
  that must.
- `Menu.test.tsx` measures the panel's own corner against the point pressed, which is the
  assertion that fails when anchoring silently does not happen.
