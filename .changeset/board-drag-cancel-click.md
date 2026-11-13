---
"@charcuterie/ui": patch
---

A cancelled board or reorder drag no longer eats the next click on the page. The one-time click blocker is installed only after a finished drag, and it disarms on the next press, key, or after a short timer. A board that unmounts during a drag now removes its pointer listeners, so a later `pointerup` commits nothing.
