---
"@charcuterie/ui": minor
---

`Dialog`, `Modal` and `OverlayPanel` take `initialFocus` — the element that gets the caret when the overlay opens.

Without it the focus manager takes the first tabbable element, which on anything with chrome is the **Close button**: a dialog wrapping a form opens with the caret on "Close" and the first thing typed goes nowhere. A consumer could not fix that from outside, because focusing in its own effect races the manager and loses. Docket's capture dialog is the case that found it.
