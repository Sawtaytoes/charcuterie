---
"@charcuterie/ui": minor
---

Both markdown editors offer an **Image** toolbar action when `onUploadImage` is wired

`MarkdownEditor` and `MarkdownEditorCodeMirror` already took an image by paste and by drop.
Both are mouse-and-keyboard gestures, so on a tablet there was no way in at all — and the
workaround every consumer reached for, a `FileDropZone` under the box, appends to the **end**
of the document, because pressing anything outside the editor moves focus out of it. An
image in prose belongs at the point it is explained.

The action opens the platform file picker, which on a phone is where the camera is offered,
and inserts at the caret: the `<textarea>` keeps its `selectionStart` while blurred, and
CodeMirror keeps its selection. It takes several files at once, like a drop already did, and
runs the same placeholder-then-replace path — a markdown `![Uploading …](#uploading-1)`
holding the spot, so a failed upload leaves a document the user can read and fix.

`icons.image` joins `MarkdownEditorIcons`. No icon ships, like every other action here: with
none, it is the word **Image**.

Nothing here is breaking. Omit `onUploadImage` — as `NoUpload` and `Default` do — and the
action is not rendered at all, because a button that opens a picker with nowhere to send the
file is worse than no button.

It is the **fourth** action, before the lists, and that position is deliberate. `Toolbar`
overflows from the end, so the order in that list is the priority order. Placed last, beside
Link where it reads most naturally, Image was already hidden behind "More actions" at 900px —
which does not fix "adding an image is buried" so much as move it. Fourth is visible wherever
four actions fit, and reads as a group: emphasis, structure, insert.

Measured, so the limit is stated rather than implied: at **900px** the bar shows eight
actions and Image is on it; at **460px** it shows three, and Image collapses into "More
actions" like everything after Heading. A narrow editor still wants a `FileDropZone` beside
it — appending to the end of the document is the right trade when the alternative is a
control nobody can reach.

Existing toolbars gain one item in the middle of the row rather than at the end. Nothing
moves for a consumer that does not pass `onUploadImage`.
