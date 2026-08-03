---
"@charcuterie/ui": patch
---

`Dialog`'s `children` is optional again. M8 typed it as required, but the old
chrome `Modal` extended `<dialog>`'s DOM props and so allowed a body-less
dialog — a confirm whose question is its `heading` and whose answers are its
`footer`, with nothing in between. That is a real shape (image-viewer's
delete-confirm renders exactly it), so requiring `children` was an unintended
break beyond the documented `Modal` → `Dialog` rename. Restored to optional.
