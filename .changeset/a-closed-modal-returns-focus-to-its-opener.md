---
"@charcuterie/ui": patch
---

A modal (`Modal`, `Dialog`, `Lightbox`, `CommandPalette`) that another overlay covered now returns focus to the button that opened it when it closes. Since 4.28.0 a closing panel stays in the page for its exit motion, and the focus manager, re-enabled when the covering overlay closed, sent focus to a button inside the leaving panel, which is inert, so focus landed nowhere. Each panel now remembers what had focus when it opened and returns focus there.
