---
"@charcuterie/ui": patch
---

Re-measure the toolbar once the webfont has loaded. Every width `useToolbarOverflow` reads is a text width, so the first measurement is only as correct as the face that was loaded when the layout effect ran. On a cold cache that is the fallback face, and the bar never revisits the answer: swapping a font changes no box the `ResizeObserver` watches and triggers no render, so neither of the other two measuring points fires. If the two faces disagree across a collapse boundary, `chooseVisibleCount` keeps or drops one action it should not have and the bar stays that way. `document.fonts.ready` is now a third measuring point, which costs one microtask on a warm load because the promise is already resolved and `setVisibleCount` bails on an unchanged answer. No story in the library crosses such a boundary today — this closes a latent gap rather than fixing an observed regression.
