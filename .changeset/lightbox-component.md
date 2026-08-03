---
"@charcuterie/ui": minor
---

Add `Lightbox` — a thumbnail that opens its own full-size view, skinned over `Modal`. The thumbnail is the trigger (and carries the accessible name; the image inside it goes `alt=""`), the enlarged view is `object-contain` clamped to the viewport, and Escape / backdrop / focus-restore / scroll-lock are all inherited from `Modal`. Supports an uncontrolled default (pass `thumbnail`) and a controlled mode (`isOpen` / `onOpenChange`) for a trigger elsewhere on the page.
