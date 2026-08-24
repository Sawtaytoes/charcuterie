---
"@charcuterie/ui": minor
---

Add `MarkdownView` — rendered markdown with no toolbar in the DOM — and stop both markdown
surfaces from turning a `javascript:` URL into a working link.

```tsx
import { MarkdownView } from "@charcuterie/ui/markdown-editor-codemirror"

<MarkdownView label="README.md at 9f3c1ab" value={markdown} />
```

`isReadOnly` on either editor means *an editor you cannot type in*: the nine formatting
buttons stay in the DOM, in the accessibility tree, drawn disabled above a document nobody
is editing. That is right for a locked form field and wrong for reading a file, and the
consuming app's workaround was a CSS rule keyed on `role="toolbar"`. `MarkdownView` has no
code path that can render one — `queryAllByRole("toolbar")` and `queryAllByRole("button")`
both come back empty, and so does `"menu"`, which is what the toolbar collapses into at
narrow widths and what `display: none` left behind.

It lives in the **same subpath** as `MarkdownEditorCodeMirror` and shares
`livePreviewRanges.ts` and the theme with it, so the two render one document identically
because they are the same code rather than two implementations that agree today.

What differs from the editor, and each difference follows from there being no caret:

- **`value`, controlled.** Fetch a file at a different commit hash, pass the new string.
  No `key`, no remount — the editors need one only to protect an undo history a view does
  not have.
- **`role="article"`, not `role="textbox"`.** A screen reader entering a textbox switches
  to forms mode and reads the contents as one flat string. Headings carry `role="heading"`
  and an `aria-level` so the H key steps between sections.
- **Links are real `<a href>`** — in the tab order, activated by Enter, `rel="noopener
  noreferrer"`. An anchor inside a `contenteditable` competes with the caret for its line,
  which is why the editor paints a span instead. The document itself is not a tab stop.
- **Task checkboxes are inert unless you pass `onToggleTask`**, which hands back the whole
  next markdown document exactly like the editors' `onChange`. Same shape as
  `onUploadImage`: omit the handler and the capability is not offered. A wide table's
  scroll box gains `tabindex="0"`, which the editor got free from being editable.

**A security fix, and it lands on both editors as well as the view.** A URL taken from the
document was used as a URL with no check, so `[click](javascript:…)` concealed its markup,
painted as a link, and ran in the page's origin on click; `![](…)` wrote an `src` verbatim.
Every URL now crosses an allowlist that normalises the way a browser does — links take
`http`, `https`, `mailto` and `tel`, images take `http`, `https` and `data:image/*`. A
rejected link is left as source rather than repainted as a word that silently refuses to
work. Remote images gain `referrerpolicy="no-referrer"`. Raw HTML in the source needed no
fix and got none: there is no `innerHTML` in this subpath, so a `<script>` was already
drawn as characters.

`livePreview()` now takes an options object (`hasDocumentSemantics`,
`isTaskListInteractive`), and `livePreviewOptions`, `toSafeLinkUrl` and `toSafeImageUrl`
are exported. `livePreview()` with no arguments behaves exactly as before.
