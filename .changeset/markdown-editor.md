---
"@charcuterie/ui": minor
---

`MarkdownEditor` — a live hybrid markdown editor whose stored value is markdown and only markdown

Docket asked for this one, and its requirement is unusually sharp: the tracker it replaces
destroyed data by storing HTML in a field it later read back as text. So the constraint is
not "prefer markdown" — it is that an HTML tag must not be **able** to reach the stored
string.

```tsx
<Field description="Markdown is what gets stored." label="Description">
  <MarkdownEditor
    defaultValue={task.description}
    onChange={setDescription}
    onUploadImage={async (file) => ({
      alt: file.name,
      url: await uploadToBlobStore(file),
    })}
  />
</Field>
```

**It adds no dependency.** The surface is a real `<textarea>` with a painted layer behind it
in the same grid cell; the tokenizer is ~300 lines in this package. Measured, React external,
`gzip -9`: TipTap 238 KB, CodeMirror 6 206 KB, Lexical 148 KB — against **4.4 KB gz of new
code and zero new packages**
([decision](https://github.com/Sawtaytoes/charcuterie/blob/master/docs/decisions/2026-08-19-the-markdown-editor-is-a-textarea-with-a-painted-layer.md)).

Four things worth knowing before you use it:

- **It is uncontrolled** — `defaultValue` in, `onChange` out, the same contract as `Select`.
  A controlled `<textarea>` wipes the browser's undo stack on every programmatic write; every
  edit here goes through `document.execCommand("insertText")` instead, as the smallest range
  replacement. To swap the whole document, remount with a `key`.
- **Markers are dimmed, not hidden.** "Raw syntax on the cursor's line" is a contrast change,
  because concealing `**` would change the line's width and move the text out from under the
  caret. Every span style is metric-neutral, and a test measures it.
- **It owns no storage.** `onUploadImage` hands you a `File` and inserts the URL you return
  as `![alt](url)` at the caret, with a markdown placeholder holding the spot meanwhile. Omit
  it and image paste is simply not offered.
- **`Tab` is never captured** — it moves focus, always. Indent and outdent are `Ctrl+]` and
  `Ctrl+[`; `Ctrl+B`/`I`/`E`/`K` are bold, italic, code and link; `Enter` continues a list and
  clears an empty item.

The toolbar is this package's `Toolbar`, so it collapses into a menu by measurement rather
than at a breakpoint. Pass `icons` to make it compact — the package still ships none.
