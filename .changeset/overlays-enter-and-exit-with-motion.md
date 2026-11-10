---
"@charcuterie/ui": minor
---

Overlays now open and close with motion. `Modal`, `Dialog`, `Lightbox`, and `CommandPalette` panels scale and fade in, and the shared scrim fades. `Popover`, `Menu`, `Listbox`, `Picker`, `Combobox`, and `DatePicker` panels grow out of their trigger. `Tooltip` fades. Each one stays in the page until its exit animation ends. While it leaves, it is `inert`, `aria-hidden`, and click-through, and it has already returned focus. An `Accordion` section animates its height open and shut.

Durations and easing are the `--duration-*` and `--easing-*` tokens. Under `prefers-reduced-motion`, and in suites that freeze motion, the exit has no length, so the element is removed in the same commit as before. A DOM with no CSS engine (jsdom, happy-dom) behaves the same way.

New exports, so an app's own content moves the same way when an action changes it:

- `useListMotion({ items, getKey })`: an added item enters, a removed item stays (`inert` and `aria-hidden`) until its exit ends, and the items around them slide to their new places. Items on the first render do not animate.
- `useValueChangeClass(value)`: a class that pops an element each time the value it shows changes, but not when data first arrives.
- `usePresence`, `toOverlayMotionClass`, and `toFadeMotionClass`, for a single element that appears and disappears.
- `useLastPresentValue(value)`: holds the last non-empty value, so a dialog built from a selection keeps its content while it fades out.

`Modal` and `Dialog` take `hasMotion` (default `true`). Only a caller that animates the panel itself sets it to `false`; `TableViewport` does, for its own expansion animation.
