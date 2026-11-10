---
"@charcuterie/ui": minor
---

Overlays now open and close with motion. `Modal`, `Dialog`, `Lightbox`, and `CommandPalette` panels scale and fade in, and the shared scrim fades. `Popover`, `Menu`, `Listbox`, `Picker`, `Combobox`, and `DatePicker` panels grow out of their trigger. `Tooltip` fades. Each one stays in the page until its exit animation ends. While it leaves, it is `inert`, `aria-hidden`, and click-through, and it has already returned focus. An `Accordion` section animates its height open and shut, a `ReorderList` row slides to its new place when it is moved by a button, a key, or a drop, and a `GroupedList` row enters, leaves, and slides as its group changes.

Durations and easing are the `--duration-*` and `--easing-*` tokens. Under `prefers-reduced-motion`, and in suites that freeze motion, the exit has no length, so the element is removed in the same commit as before. A DOM with no CSS engine (jsdom, happy-dom) behaves the same way.

**Check browser tests that do not freeze motion.** In a real browser with motion on (vitest browser mode, or Playwright end-to-end tests that freeze motion only for screenshots), a closed overlay, a collapsed section, or a removed list item now stays in the page for its exit, about 90 to 140 ms. Role queries already skip it, because it is `aria-hidden`. A synchronous text query, or a count of a CSS locator, made right after a close can still find it: wait for it to go (`waitFor`, or Playwright's auto-waiting `expect(...).toBeHidden()`), or freeze motion in that suite with `FREEZE_MOTION_CSS` from `@charcuterie/storybook-config/testing`.

New exports, so an app's own content moves the same way when an action changes it:

- `useListMotion({ items, getKey })`: an added item enters, a removed item stays (`inert` and `aria-hidden`) until its exit ends, and the items around them slide to their new places. Items on the first render do not animate.
- `useValueChangeMotion(value)`: props (`className` and `onAnimationEnd`) that pop an element each time the value it shows changes, but not when data first arrives. The class comes off when the pop ends.
- `usePresence`, `toOverlayMotionClass`, and `toFadeMotionClass`, for a single element that appears and disappears.
- `useLastPresentValue(value)`: holds the last non-empty value, so a dialog built from a selection keeps its content while it fades out.

**`GroupedList` items take `highlightKey`.** To pulse a highlighted row again, change its `highlightKey`, not its `key`. Rows now enter and leave by key, so a changed `key` makes the old row fade out while a copy fades in. If you build keys like `` `${id}-${sequence}` `` to restart the pulse, pass `key: id` and `highlightKey: sequence` instead.

`Modal` and `Dialog` take `hasMotion` (default `true`). Only a caller that animates the panel itself sets it to `false`; `TableViewport` does, for its own expansion animation.
